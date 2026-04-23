import { PaginationQuery, PaginatedResult } from '../types';

export const getPaginationParams = (query: PaginationQuery): { page: number; limit: number; skip: number } => {
  const parsedPage = Number.parseInt(query.page ?? '1', 10);
  const parsedLimit = Number.parseInt(query.limit ?? '10', 10);
  const page = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
  const limit = Number.isNaN(parsedLimit) ? 10 : Math.min(100, Math.max(1, parsedLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildPaginatedResult = <T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> => ({
  items,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});
