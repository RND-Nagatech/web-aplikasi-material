import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';

const parsePositiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    Object.entries(source).forEach(([key, nestedValue]) => {
      if (key.startsWith('$') || key.includes('.')) {
        return;
      }
      sanitized[key] = sanitizeValue(nestedValue);
    });

    return sanitized;
  }

  return value;
};

export const securityHeaders = helmet({
  crossOriginEmbedderPolicy: false,
});

export const hppProtection = hpp();

export const requestSanitizer = (req: Request, _res: Response, next: NextFunction): void => {
  req.body = sanitizeValue(req.body) as Request['body'];
  req.query = sanitizeValue(req.query) as Request['query'];
  req.params = sanitizeValue(req.params) as Request['params'];
  next();
};

const defaultWindowMs = parsePositiveNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
const defaultMax = parsePositiveNumber(process.env.RATE_LIMIT_MAX, 300);
const authWindowMs = parsePositiveNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60_000);
const authMax = parsePositiveNumber(process.env.AUTH_RATE_LIMIT_MAX, 20);

const createLimiter = (windowMs: number, max: number) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
    },
  });

export const apiRateLimiter = createLimiter(defaultWindowMs, defaultMax);
export const authRateLimiter = createLimiter(authWindowMs, authMax);
