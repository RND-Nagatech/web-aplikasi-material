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
  kembalian?: number;
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
  let resultItems = items;
  const invoiceNos = items.map((it) => it.no_faktur_beli).filter(Boolean);
  if (invoiceNos.length) {
    const purchases = await PurchaseTransaction.find({ no_faktur_beli: { $in: invoiceNos } })
      .select('no_faktur_beli kembalian')
      .lean();
    const kembalianByInvoice = new Map(purchases.map((p) => [p.no_faktur_beli, p.kembalian ?? 0]));
    resultItems = items.map((it) => ({ ...it, kembalian: kembalianByInvoice.get(it.no_faktur_beli) ?? 0 }));
  }

  return buildPaginatedResult(resultItems, total, page, limit);
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

    // Allow overpayment: apply only up to remaining payable and treat the rest as kembalian
    const applied = Math.max(0, Math.min(body.amount, payable.sisa));
    const kembalian = Math.max(0, body.amount - applied);

    // Store full input in 'dibayar' so table shows user-entered amount, but only reduce 'sisa' by applied
    payable.dibayar += body.amount;
    // persist kembalian on payable record as cumulative change amount
    // so tt_hutang contains kembalian for easy querying / UI
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (payable as any).kembalian = (((payable as any).kembalian ?? 0) + kembalian);
    payable.sisa = Math.max(0, payable.sisa - applied);

    const savedPayable = await payable.save({ session });

    const updatedPurchase = await PurchaseTransaction.findOneAndUpdate(
      { no_faktur_beli: savedPayable.no_faktur_beli },
      {
        $inc: { dibayar: body.amount, kembalian },
        $set: { status: savedPayable.sisa > 0 ? 'HUTANG' : 'LUNAS' },
      },
      { new: true, session }
    );

    if (!updatedPurchase) {
      throw createError(`Purchase transaction ${savedPayable.no_faktur_beli} not found`, 404);
    }

    // record only the applied amount as cash out, and record kembalian as cash out if present
    if (applied > 0) {
      await recordCashMovement({ type: 'beli', amount: applied }, { session, now: new Date() });
    }
    if (kembalian > 0) {
      await recordCashMovement({ direction: 'out', amount: kembalian }, { session, now: new Date() });
    }
    return savedPayable;
  });
};
