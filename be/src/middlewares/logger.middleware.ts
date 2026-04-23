import morgan from 'morgan';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.headers['x-request-id'];
  const requestId =
    (typeof incoming === 'string' && incoming.trim())
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};

morgan.token('request_id', (_req: Request, res: Response) => (res.locals.requestId as string | undefined) ?? '-');

export const loggerMiddleware = morgan(format, {
  stream: {
    write: (message: string) => {
      logger.info('http_access', { message: message.trim() });
    },
  },
});

export const structuredLoggerMiddleware = morgan(
  ':method :url :status :response-time ms rid=:request_id',
  {
    stream: {
      write: (message: string) => {
        logger.info('http_access', { message: message.trim() });
      },
    },
  }
);
