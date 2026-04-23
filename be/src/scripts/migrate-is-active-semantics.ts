import dotenv from 'dotenv';
import connectDB from '../config/database';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';

dotenv.config();

const NON_DELETED_DATE_CONDITION = [{ deleted_date: '-' }, { deleted_date: '' }, { deleted_date: null }, { deleted_date: { $exists: false } }];

const DELETED_DATE_CONDITION = { deleted_date: { $exists: true, $nin: ['-', '', null] } };

const main = async (): Promise<void> => {
  await connectDB();

  const [productActiveResult, productDeletedResult, customerActiveResult, customerDeletedResult] = await Promise.all([
    Product.updateMany(
      {
        is_active: false,
        $or: NON_DELETED_DATE_CONDITION,
      },
      { $set: { is_active: true } }
    ),
    Product.updateMany(
      {
        is_active: true,
        ...DELETED_DATE_CONDITION,
      },
      { $set: { is_active: false } }
    ),
    Customer.updateMany(
      {
        is_active: false,
        $or: NON_DELETED_DATE_CONDITION,
      },
      { $set: { is_active: true } }
    ),
    Customer.updateMany(
      {
        is_active: true,
        ...DELETED_DATE_CONDITION,
      },
      { $set: { is_active: false } }
    ),
  ]);

  console.log(`[MIGRATE] Product active records flipped to true: ${productActiveResult.modifiedCount}`);
  console.log(`[MIGRATE] Product deleted records flipped to false: ${productDeletedResult.modifiedCount}`);
  console.log(`[MIGRATE] Customer active records flipped to true: ${customerActiveResult.modifiedCount}`);
  console.log(`[MIGRATE] Customer deleted records flipped to false: ${customerDeletedResult.modifiedCount}`);
  console.log('[MIGRATE] is_active semantics migration completed');

  process.exit(0);
};

main().catch((error) => {
  console.error('[MIGRATE] is_active semantics migration failed', error);
  process.exit(1);
});
