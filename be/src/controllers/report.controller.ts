import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { getDebtReport, getFinanceReport, getPayableReport, getStockReport } from '../services/report.service';
import { asyncHandler } from '../utils/async-handler';
import { parseDateRangeQuery, parseFinanceType } from '../utils/request';

export const stock = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { dateFrom, dateTo } = parseDateRangeQuery(req);
  const result = await getStockReport(dateFrom, dateTo);
  sendSuccess(res, 'Stock report retrieved successfully', result);
});

export const debts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { dateFrom, dateTo } = parseDateRangeQuery(req);
  const noFaktur = typeof req.query.no_faktur === 'string' ? req.query.no_faktur : undefined;
  const result = await getDebtReport(dateFrom, dateTo, noFaktur);
  sendSuccess(res, 'Debt report retrieved successfully', result);
});

export const payables = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { dateFrom, dateTo } = parseDateRangeQuery(req);
  const noFaktur = typeof req.query.no_faktur === 'string' ? req.query.no_faktur : undefined;
  const result = await getPayableReport(dateFrom, dateTo, noFaktur);
  sendSuccess(res, 'Payable report retrieved successfully', result);
});

export const finance = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { dateFrom, dateTo } = parseDateRangeQuery(req);
  const reportType = parseFinanceType(req.query.type);
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;

  const result = await getFinanceReport(reportType, dateFrom, dateTo, search);
  sendSuccess(res, 'Finance report retrieved successfully', result);
});
