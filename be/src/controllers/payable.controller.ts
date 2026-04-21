import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, PaginationQuery, PayablePaymentBody } from '../types';
import { getAllPayables, processPayablePayment } from '../services/payable.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';

export const index = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await getAllPayables(req.query as PaginationQuery);
    sendSuccess(res, 'Payables retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const payment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as PayablePaymentBody;
    if (!body.payable_id) throw createError('payable_id is required', 400);
    if (!body.amount || body.amount <= 0) throw createError('amount must be a positive number', 400);

    const payable = await processPayablePayment(body);
    sendSuccess(res, 'Payable payment processed successfully', payable);
  } catch (error) {
    next(error);
  }
};
