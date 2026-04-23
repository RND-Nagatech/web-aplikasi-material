import { Request } from 'express';
import { createError } from '../middlewares/error.middleware';
import { PaginationQuery } from '../types';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseDate = (label: string, value?: string, options?: { endOfDay?: boolean }): Date | undefined => {
  if (!value) return undefined;
  const endOfDay = options?.endOfDay ?? false;
  const parsed = DATE_ONLY_RE.test(value)
    ? new Date(`${value}${endOfDay ? 'T23:59:59.999+07:00' : 'T00:00:00.000+07:00'}`)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createError(`${label} is invalid, expected YYYY-MM-DD`, 400, 'VALIDATION_ERROR');
  }
  if (!DATE_ONLY_RE.test(value) && endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  }
  return parsed;
};

export const parseDateRangeQuery = (req: Request): { dateFrom?: Date; dateTo?: Date } => {
  const rawDateFrom = typeof req.query.date_from === 'string' ? req.query.date_from : undefined;
  const rawDateTo = typeof req.query.date_to === 'string' ? req.query.date_to : undefined;

  const dateFrom = parseDate('date_from', rawDateFrom);
  const dateTo = parseDate('date_to', rawDateTo, { endOfDay: true });

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw createError('date_from must be earlier than or equal to date_to', 400, 'VALIDATION_ERROR');
  }

  return { dateFrom, dateTo };
};

export const parseDashboardPeriod = (rawPeriod: unknown): 7 | 30 => {
  if (rawPeriod === '30' || rawPeriod === 30) return 30;
  return 7;
};

export const parsePaginationQuery = (req: Request): PaginationQuery => {
  const readString = (key: string): string | undefined => {
    const value = req.query[key];
    return typeof value === 'string' ? value : undefined;
  };

  return {
    page: readString('page'),
    limit: readString('limit'),
    search: readString('search'),
    nama_customer: readString('nama_customer'),
    no_hp: readString('no_hp'),
    alamat: readString('alamat'),
    no_faktur: readString('no_faktur'),
  };
};

export const parseFinanceType = (rawType: unknown): 'rekap' | 'detail' => {
  const normalized = typeof rawType === 'string' ? rawType : 'rekap';
  if (normalized !== 'rekap' && normalized !== 'detail') {
    throw createError('type must be either "rekap" or "detail"', 400, 'VALIDATION_ERROR');
  }
  return normalized;
};
