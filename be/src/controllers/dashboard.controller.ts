import { Request, Response } from 'express';
import { getDashboardSummary } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/async-handler';
import { parseDashboardPeriod } from '../utils/request';

export const summary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const period = parseDashboardPeriod(req.query.period);
  const result = await getDashboardSummary(period);
  sendSuccess(res, 'Dashboard summary retrieved successfully', result);
});
