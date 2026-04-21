import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, PaginationQuery, CreateTransactionBody } from '../types';
import { getAllTransactions, createTransaction } from '../services/transaction.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';

export const index = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await getAllTransactions(req.query as PaginationQuery);
    sendSuccess(res, 'Transactions retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const store = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as CreateTransactionBody;

    if (!body.type || !['jual', 'beli'].includes(body.type)) {
      throw createError('type must be either "jual" or "beli"', 400);
    }
    if (!body.customer && !body.nama_customer?.trim()) {
      throw createError('customer or nama_customer is required', 400);
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw createError('items must be a non-empty array', 400);
    }
    if (body.total === undefined) throw createError('total is required', 400);
    const dibayar = body.dibayar ?? body.paid ?? 0;
    if (dibayar < 0) {
      throw createError('dibayar/paid must be a number >= 0', 400);
    }
    if (body.status && !['LUNAS', 'UTANG', 'HUTANG', 'PIUTANG'].includes(body.status)) {
      throw createError('status must be one of LUNAS, UTANG, HUTANG, PIUTANG', 400);
    }

    const transaction = await createTransaction(body);
    sendSuccess(res, 'Transaction created successfully', transaction, 201);
  } catch (error) {
    next(error);
  }
};
