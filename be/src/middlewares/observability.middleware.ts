import { NextFunction, Request, Response } from 'express';
import { recordRequestMetric } from '../observability/metrics';
import { logger } from '../utils/logger';

const toMs = (hrtime: [number, number]): number => {
  const [seconds, nanoseconds] = hrtime;
  return Number(((seconds * 1e3) + (nanoseconds / 1e6)).toFixed(2));
};

export const observabilityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime();

  res.on('finish', () => {
    const durationMs = toMs(process.hrtime(start));
    const path = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;

    recordRequestMetric(req.method, path, res.statusCode, durationMs);
    logger.info('http_request', {
      request_id: res.locals.requestId ?? '-',
      method: req.method,
      path,
      status_code: res.statusCode,
      duration_ms: durationMs,
    });
  });

  next();
};
