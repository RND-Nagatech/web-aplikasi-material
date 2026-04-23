import { Response } from 'express';
import { AuthenticatedRequest, CreateTransactionBody } from '../types';
import { getAllTransactions, createTransaction } from '../services/transaction.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';
import { asyncHandler } from '../utils/async-handler';
import { parsePaginationQuery } from '../utils/request';

export const index = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await getAllTransactions(parsePaginationQuery(req));
  sendSuccess(res, 'Transactions retrieved successfully', result);
});

export const store = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const body = req.body as CreateTransactionBody;

  if (!body.type || !['jual', 'beli'].includes(body.type)) {
    throw createError('type must be either "jual" or "beli"', 400, 'VALIDATION_ERROR');
  }
  if (!body.customer && !body.nama_customer?.trim()) {
    throw createError('customer or nama_customer is required', 400, 'VALIDATION_ERROR');
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw createError('items must be a non-empty array', 400, 'VALIDATION_ERROR');
  }
  if (body.total === undefined) throw createError('total is required', 400, 'VALIDATION_ERROR');
  const dibayar = body.dibayar ?? body.paid ?? 0;
  if (dibayar < 0) {
    throw createError('dibayar/paid must be a number >= 0', 400, 'VALIDATION_ERROR');
  }
  if (body.status && !['LUNAS', 'UTANG', 'HUTANG', 'PIUTANG'].includes(body.status)) {
    throw createError('status must be one of LUNAS, UTANG, HUTANG, PIUTANG', 400, 'VALIDATION_ERROR');
  }

  const transaction = await createTransaction(body);
  sendSuccess(res, 'Transaction created successfully', transaction, 201);
});
