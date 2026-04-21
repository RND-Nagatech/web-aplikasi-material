import { Request, Response, NextFunction } from 'express';
import { getDashboardSummary } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export const summary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const periodRaw = String(req.query.period ?? '7');
    const period = periodRaw === '30' ? 30 : 7;
    const result = await getDashboardSummary(period);
    sendSuccess(res, 'Dashboard summary retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};
