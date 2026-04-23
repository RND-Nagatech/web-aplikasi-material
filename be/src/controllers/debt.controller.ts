import { Response } from 'express';
import { AuthenticatedRequest, DebtPaymentBody } from '../types';
import { getAllDebts, processDebtPayment } from '../services/debt.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';
import { asyncHandler } from '../utils/async-handler';
import { parsePaginationQuery } from '../utils/request';

export const index = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await getAllDebts(parsePaginationQuery(req));
  sendSuccess(res, 'Debts retrieved successfully', result);
});

export const payment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const body = req.body as DebtPaymentBody;
  if (!body.debt_id) throw createError('debt_id is required', 400, 'VALIDATION_ERROR');
  if (!body.amount || body.amount <= 0) throw createError('amount must be a positive number', 400, 'VALIDATION_ERROR');

  const debt = await processDebtPayment(body);
  sendSuccess(res, 'Payment processed successfully', debt);
});
