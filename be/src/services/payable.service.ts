import { Payable, IPayable } from '../models/Payable';
import { PurchaseTransaction } from '../models/PurchaseTransaction';
import { Customer } from '../models/Customer';
import { PayablePaymentBody, PaginationQuery, PaginatedResult } from '../types';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { createError } from '../middlewares/error.middleware';
import { recordCashMovement } from './cash-daily.service';
import { runWithTransaction } from '../utils/transaction';

type PayableListItem = {
  _id: unknown;
  kode_customer: string;
  nama_customer?: string;
  no_faktur_beli: string;
  total: number;
  dibayar: number;
  sisa: number;
  created_date: string;
  customer_name: string;
};

const attachCustomerName = async <T extends { kode_customer: string; nama_customer?: string }>(
  items: T[]
): Promise<Array<T & { customer_name: string }>> => {
  const uniqueCodes = [...new Set(items.map((item) => item.kode_customer).filter(Boolean))];
  if (!uniqueCodes.length) {
    return items.map((item) => ({ ...item, customer_name: item.nama_customer ?? '-' }));
  }

  const customers = await Customer.find({ kode_customer: { $in: uniqueCodes } })
    .select('kode_customer nama_customer')
    .lean();

  const nameByCode = new Map(customers.map((customer) => [customer.kode_customer, customer.nama_customer]));
  return items.map((item) => ({
    ...item,
    customer_name: nameByCode.get(item.kode_customer) ?? item.nama_customer ?? '-',
  }));
};

export const getAllPayables = async (
  query: PaginationQuery
): Promise<PaginatedResult<PayableListItem>> => {
  const { page, limit, skip } = getPaginationParams(query);
  const where: Record<string, unknown> = {};

  if (query.no_faktur?.trim()) {
    const escaped = query.no_faktur.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    where.no_faktur_beli = { $regex: `^${escaped}`, $options: 'i' };
  }

  const [rawItems, total] = await Promise.all([
    Payable.find(where)
      .skip(skip)
      .limit(limit)
      .sort({ created_date_ts: -1, created_date: -1 })
      .lean(),
    Payable.countDocuments(where),
  ]);

  const items = await attachCustomerName(rawItems) as PayableListItem[];
  return buildPaginatedResult(items, total, page, limit);
};

export const processPayablePayment = async (body: PayablePaymentBody): Promise<IPayable> => {
  return runWithTransaction<IPayable>(async (session) => {
    const payable = await Payable.findById(body.payable_id).session(session);
    if (!payable) throw createError('Payable record not found', 404);

    if (payable.sisa <= 0) {
      throw createError('This payable has already been fully paid', 400);
    }

    if (body.amount <= 0) {
      throw createError('Payment amount must be greater than zero', 400);
    }

    if (body.amount > payable.sisa) {
      throw createError(`Payment amount exceeds remaining payable of ${payable.sisa}`, 400);
    }

    payable.dibayar += body.amount;
    payable.sisa -= body.amount;

    const savedPayable = await payable.save({ session });

    const updatedPurchase = await PurchaseTransaction.findOneAndUpdate(
      { no_faktur_beli: savedPayable.no_faktur_beli },
      {
        dibayar: savedPayable.dibayar,
        status: savedPayable.sisa > 0 ? 'HUTANG' : 'LUNAS',
      },
      { new: true, session }
    );

    if (!updatedPurchase) {
      throw createError(`Purchase transaction ${savedPayable.no_faktur_beli} not found`, 404);
    }

    await recordCashMovement(
      { type: 'beli', amount: body.amount },
      { session, now: new Date() }
    );
    return savedPayable;
  });
};
