import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
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
import { loggerMiddleware } from './middlewares/logger.middleware';
import { sendError } from './utils/response';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);
const corsOrigin = process.env.CORS_ORIGIN?.trim();

app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin,
        }
      : undefined
  )
);
app.use(express.json());
app.use(loggerMiddleware);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' });
});

const router = express.Router();

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

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`[SERVER] API running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('[SERVER] Failed to start server', error);
    process.exit(1);
  });
