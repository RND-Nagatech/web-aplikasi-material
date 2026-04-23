import dotenv from 'dotenv';
import connectDB from '../config/database';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Store } from '../models/Store';
import { SaleTransaction } from '../models/SaleTransaction';
import { PurchaseTransaction } from '../models/PurchaseTransaction';
import { Debt } from '../models/Debt';
import { Payable } from '../models/Payable';

dotenv.config();

const main = async (): Promise<void> => {
  await connectDB();

  await Product.syncIndexes();
  await Customer.syncIndexes();
  await Store.syncIndexes();
  await SaleTransaction.syncIndexes();
  await PurchaseTransaction.syncIndexes();
  await Debt.syncIndexes();
  await Payable.syncIndexes();

  console.log('[INDEX] syncIndexes completed');
  process.exit(0);
};

main().catch((error) => {
  console.error('[INDEX] syncIndexes failed', error);
  process.exit(1);
});
