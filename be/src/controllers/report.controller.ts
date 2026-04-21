import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/response';
import { getDebtReport, getFinanceReport, getPayableReport, getStockReport } from '../services/report.service';
import { createError } from '../middlewares/error.middleware';

export const stock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawDateFrom = typeof req.query.date_from === 'string' ? req.query.date_from : undefined;
    const rawDateTo = typeof req.query.date_to === 'string' ? req.query.date_to : undefined;

    const dateFrom = rawDateFrom ? new Date(rawDateFrom) : undefined;
    const dateTo = rawDateTo ? new Date(rawDateTo) : undefined;

    if (dateFrom && Number.isNaN(dateFrom.getTime())) {
      throw createError('date_from is invalid, expected YYYY-MM-DD', 400);
    }
    if (dateTo && Number.isNaN(dateTo.getTime())) {
      throw createError('date_to is invalid, expected YYYY-MM-DD', 400);
    }

    if (dateTo) {
      dateTo.setHours(23, 59, 59, 999);
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw createError('date_from must be earlier than or equal to date_to', 400);
    }

    const result = await getStockReport(dateFrom, dateTo);
    sendSuccess(res, 'Stock report retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const debts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawDateFrom = typeof req.query.date_from === 'string' ? req.query.date_from : undefined;
    const rawDateTo = typeof req.query.date_to === 'string' ? req.query.date_to : undefined;

    const dateFrom = rawDateFrom ? new Date(rawDateFrom) : undefined;
    const dateTo = rawDateTo ? new Date(rawDateTo) : undefined;

    if (dateFrom && Number.isNaN(dateFrom.getTime())) {
      throw createError('date_from is invalid, expected YYYY-MM-DD', 400);
    }
    if (dateTo && Number.isNaN(dateTo.getTime())) {
      throw createError('date_to is invalid, expected YYYY-MM-DD', 400);
    }

    if (dateTo) {
      dateTo.setHours(23, 59, 59, 999);
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw createError('date_from must be earlier than or equal to date_to', 400);
    }

    const result = await getDebtReport(dateFrom, dateTo);
    sendSuccess(res, 'Debt report retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const payables = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawDateFrom = typeof req.query.date_from === 'string' ? req.query.date_from : undefined;
    const rawDateTo = typeof req.query.date_to === 'string' ? req.query.date_to : undefined;

    const dateFrom = rawDateFrom ? new Date(rawDateFrom) : undefined;
    const dateTo = rawDateTo ? new Date(rawDateTo) : undefined;

    if (dateFrom && Number.isNaN(dateFrom.getTime())) {
      throw createError('date_from is invalid, expected YYYY-MM-DD', 400);
    }
    if (dateTo && Number.isNaN(dateTo.getTime())) {
      throw createError('date_to is invalid, expected YYYY-MM-DD', 400);
    }

    if (dateTo) {
      dateTo.setHours(23, 59, 59, 999);
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw createError('date_from must be earlier than or equal to date_to', 400);
    }

    const result = await getPayableReport(dateFrom, dateTo);
    sendSuccess(res, 'Payable report retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const finance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawDateFrom = typeof req.query.date_from === 'string' ? req.query.date_from : undefined;
    const rawDateTo = typeof req.query.date_to === 'string' ? req.query.date_to : undefined;
    const reportType = typeof req.query.type === 'string' ? req.query.type : 'rekap';
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const dateFrom = rawDateFrom ? new Date(rawDateFrom) : undefined;
    const dateTo = rawDateTo ? new Date(rawDateTo) : undefined;

    if (dateFrom && Number.isNaN(dateFrom.getTime())) {
      throw createError('date_from is invalid, expected YYYY-MM-DD', 400);
    }
    if (dateTo && Number.isNaN(dateTo.getTime())) {
      throw createError('date_to is invalid, expected YYYY-MM-DD', 400);
    }
    if (dateTo) {
      dateTo.setHours(23, 59, 59, 999);
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw createError('date_from must be earlier than or equal to date_to', 400);
    }
    if (!['rekap', 'detail'].includes(reportType)) {
      throw createError('type must be either "rekap" or "detail"', 400);
    }

    const result = await getFinanceReport(reportType as 'rekap' | 'detail', dateFrom, dateTo, search);
    sendSuccess(res, 'Finance report retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};
