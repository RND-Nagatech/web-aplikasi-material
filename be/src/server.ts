import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import mongoose from 'mongoose';
import connectDB from './config/database';
import { login, me, register } from './controllers/auth.controller';
import { index as productsIndex, store as productsStore, update as productsUpdate, destroy as productsDestroy } from './controllers/product.controller';
import { index as customersIndex, store as customersStore, update as customersUpdate, destroy as customersDestroy } from './controllers/customer.controller';
import { index as transactionsIndex, store as transactionsStore } from './controllers/transaction.controller';
import { index as debtsIndex, payment as debtsPayment } from './controllers/debt.controller';
import { index as payablesIndex, payment as payablesPayment } from './controllers/payable.controller';
import { index as storesIndex, store as storesStore, update as storesUpdate } from './controllers/store.controller';
import { summary as dashboardSummary } from './controllers/dashboard.controller';
import { stock as reportStock, debts as reportDebts, payables as reportPayables, finance as reportFinance } from './controllers/report.controller';
import { authMiddleware } from './middlewares/auth.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { requestIdMiddleware } from './middlewares/logger.middleware';
import { observabilityMiddleware } from './middlewares/observability.middleware';
import { apiRateLimiter, authRateLimiter, hppProtection, requestSanitizer, securityHeaders } from './middlewares/security.middleware';
import { getMetricsSnapshot } from './observability/metrics';
import { sendError } from './utils/response';
import { logger } from './utils/logger';
import { runCashDailyRollover } from './services/cash-daily.service';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);
const corsOrigin = process.env.CORS_ORIGIN?.trim();
const trustProxyRaw = process.env.TRUST_PROXY?.trim();
const trustProxy = trustProxyRaw === undefined || trustProxyRaw === ''
  ? 1
  : Number.isNaN(Number(trustProxyRaw))
    ? trustProxyRaw
    : Number(trustProxyRaw);
const startedAt = Date.now();
const parsedGracefulTimeout = Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS ?? 10000);
const gracefulTimeoutMs = Number.isFinite(parsedGracefulTimeout) && parsedGracefulTimeout > 0
  ? parsedGracefulTimeout
  : 10000;

let server: Server | null = null;
let shuttingDown = false;
let cashDailyTimer: NodeJS.Timeout | null = null;

app.disable('x-powered-by');
app.set('trust proxy', trustProxy);

app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin.includes(',')
            ? corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
            : corsOrigin,
        }
      : undefined
  )
);
app.use(securityHeaders);
app.use(hppProtection);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(requestSanitizer);
app.use(requestIdMiddleware);
app.use(observabilityMiddleware);
app.use('/api/v1', apiRateLimiter);

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    uptime_sec: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ success: true, status: 'live' });
});

app.get('/health/ready', (_req: Request, res: Response) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const statusCode = mongoReady ? 200 : 503;

  res.status(statusCode).json({
    success: mongoReady,
    status: mongoReady ? 'ready' : 'not_ready',
    dependencies: {
      mongodb: {
        connected: mongoReady,
        ready_state: mongoose.connection.readyState,
      },
    },
  });
});

app.get('/metrics', (_req: Request, res: Response) => {
  const snapshot = getMetricsSnapshot();
  res.json({ success: true, data: snapshot });
});

const router = express.Router();

router.use('/auth', authRateLimiter);
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authMiddleware, me);

router.use(authMiddleware);

router.get('/products', productsIndex);
router.post('/products', productsStore);
router.put('/products/:id', productsUpdate);
router.delete('/products/:id', productsDestroy);

router.get('/customers', customersIndex);
router.post('/customers', customersStore);
router.put('/customers/:id', customersUpdate);
router.delete('/customers/:id', customersDestroy);

router.get('/stores', storesIndex);
router.post('/stores', storesStore);
router.put('/stores/:id', storesUpdate);

router.get('/transactions', transactionsIndex);
router.post('/transactions', transactionsStore);

router.get('/debts', debtsIndex);
router.post('/debts/payment', debtsPayment);

router.get('/payables', payablesIndex);
router.post('/payables/payment', payablesPayment);

router.get('/dashboard/summary', dashboardSummary);
router.get('/reports/stock', reportStock);
router.get('/reports/debts', reportDebts);
router.get('/reports/payables', reportPayables);
router.get('/reports/finance', reportFinance);

app.use('/api/v1', router);

app.use((_req: Request, res: Response) => {
  sendError(res, 'Route not found', 404);
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  errorMiddleware(err as Error, req, res, next);
});

const withTimeout = async (promise: Promise<void>, timeoutMs: number): Promise<void> => {
  await Promise.race([
    promise,
    new Promise<void>((_resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
      timeout.unref();
    }),
  ]);
};

const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.warn('shutdown_started', { signal, graceful_timeout_ms: gracefulTimeoutMs });

  try {
    if (cashDailyTimer) {
      clearInterval(cashDailyTimer);
      cashDailyTimer = null;
    }

    if (server) {
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          server?.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
        gracefulTimeoutMs
      );
    }

    if (mongoose.connection.readyState !== 0) {
      await withTimeout(mongoose.connection.close(false), gracefulTimeoutMs);
    }

    logger.info('shutdown_completed', { signal });
    process.exit(exitCode);
  } catch (error) {
    logger.error('shutdown_failed', {
      signal,
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

const registerProcessHandlers = (): void => {
  process.on('SIGINT', () => {
    void shutdown('SIGINT', 0);
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM', 0);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled_rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    void shutdown('unhandledRejection', 1);
  });

  process.on('uncaughtException', (error) => {
    logger.error('uncaught_exception', {
      error: error.message,
      stack: error.stack,
    });
    void shutdown('uncaughtException', 1);
  });
};

const startCashDailyScheduler = (): void => {
  void runCashDailyRollover().catch((error) => {
    logger.error('cash_daily_rollover_failed_startup', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  cashDailyTimer = setInterval(() => {
    void runCashDailyRollover().catch((error) => {
      logger.error('cash_daily_rollover_failed_tick', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, 60_000);

  cashDailyTimer.unref();
};

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    server = app.listen(port, () => {
      logger.info('server_started', {
        port,
        node_env: process.env.NODE_ENV ?? 'development',
      });
    });
    registerProcessHandlers();
    startCashDailyScheduler();
  } catch (error) {
    logger.error('server_start_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

void startServer();
