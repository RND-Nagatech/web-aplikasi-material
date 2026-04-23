import { Debt, IDebt } from '../models/Debt';
import { SaleTransaction } from '../models/SaleTransaction';
import { Customer } from '../models/Customer';
import { DebtPaymentBody, PaginationQuery, PaginatedResult } from '../types';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { createError } from '../middlewares/error.middleware';
import { recordCashMovement } from './cash-daily.service';
import { runWithTransaction } from '../utils/transaction';

type DebtListItem = {
  _id: unknown;
  kode_customer: string;
  nama_customer?: string;
  no_faktur_jual: string;
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

export const getAllDebts = async (query: PaginationQuery): Promise<PaginatedResult<DebtListItem>> => {
  const { page, limit, skip } = getPaginationParams(query);
  const where: Record<string, unknown> = {};

  if (query.no_faktur?.trim()) {
    const escaped = query.no_faktur.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    where.no_faktur_jual = { $regex: `^${escaped}`, $options: 'i' };
  }

  const [rawItems, total] = await Promise.all([
    Debt.find(where)
      .skip(skip)
      .limit(limit)
      .sort({ created_date_ts: -1, created_date: -1 })
      .lean(),
    Debt.countDocuments(where),
  ]);

  const items = await attachCustomerName(rawItems) as DebtListItem[];
  return buildPaginatedResult(items, total, page, limit);
};

export const processDebtPayment = async (body: DebtPaymentBody): Promise<IDebt> => {
  return runWithTransaction<IDebt>(async (session) => {
    const debt = await Debt.findById(body.debt_id).session(session);
    if (!debt) throw createError('Debt record not found', 404);

    if (debt.sisa <= 0) {
      throw createError('This debt has already been fully paid', 400);
    }

    if (body.amount <= 0) {
      throw createError('Payment amount must be greater than zero', 400);
    }

    if (body.amount > debt.sisa) {
      throw createError(`Payment amount exceeds remaining debt of ${debt.sisa}`, 400);
    }

    debt.dibayar += body.amount;
    debt.sisa -= body.amount;

    const savedDebt = await debt.save({ session });

    const updatedSale = await SaleTransaction.findOneAndUpdate(
      { no_faktur_jual: savedDebt.no_faktur_jual },
      {
        dibayar: savedDebt.dibayar,
        status: savedDebt.sisa > 0 ? 'PIUTANG' : 'LUNAS',
      },
      { new: true, session }
    );

    if (!updatedSale) {
      throw createError(`Sale transaction ${savedDebt.no_faktur_jual} not found`, 404);
    }

    await recordCashMovement(
      { type: 'jual', amount: body.amount },
      { session, now: new Date() }
    );
    return savedDebt;
  });
};
