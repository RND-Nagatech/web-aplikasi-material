import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export const errorMiddleware = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? 'Internal Server Error';
  const code = err.code ?? 'INTERNAL_ERROR';
  const requestId = (res.locals.requestId as string | undefined)
    ?? (typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'] : undefined)
    ?? '-';

  logger.error('request_failed', {
      level: 'error',
      request_id: requestId,
      method: req.method,
      path: req.originalUrl,
      status_code: statusCode,
      error_code: code,
      message,
      details: err.details ?? null,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  sendError(res, message, statusCode);
};

export const createError = (
  message: string,
  statusCode: number,
  code = 'BAD_REQUEST',
  details?: unknown
): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};
