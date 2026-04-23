import { Response } from 'express';
import { AuthenticatedRequest, PayablePaymentBody } from '../types';
import { getAllPayables, processPayablePayment } from '../services/payable.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';
import { asyncHandler } from '../utils/async-handler';
import { parsePaginationQuery } from '../utils/request';

export const index = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await getAllPayables(parsePaginationQuery(req));
  sendSuccess(res, 'Payables retrieved successfully', result);
});

export const payment = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const body = req.body as PayablePaymentBody;
  if (!body.payable_id) throw createError('payable_id is required', 400, 'VALIDATION_ERROR');
  if (!body.amount || body.amount <= 0) throw createError('amount must be a positive number', 400, 'VALIDATION_ERROR');

  const payable = await processPayablePayment(body);
  sendSuccess(res, 'Payable payment processed successfully', payable);
});
