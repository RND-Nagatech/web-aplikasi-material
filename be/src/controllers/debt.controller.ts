import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, PaginationQuery, DebtPaymentBody } from '../types';
import { getAllDebts, processDebtPayment } from '../services/debt.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';

export const index = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await getAllDebts(req.query as PaginationQuery);
    sendSuccess(res, 'Debts retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const payment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as DebtPaymentBody;
    if (!body.debt_id) throw createError('debt_id is required', 400);
    if (!body.amount || body.amount <= 0) throw createError('amount must be a positive number', 400);

    const debt = await processDebtPayment(body);
    sendSuccess(res, 'Payment processed successfully', debt);
  } catch (error) {
    next(error);
  }
};
