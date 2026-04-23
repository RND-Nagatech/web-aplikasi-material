import dotenv from 'dotenv';
import { Types } from 'mongoose';
import connectDB from '../config/database';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Store } from '../models/Store';
import { SaleTransaction } from '../models/SaleTransaction';
import { PurchaseTransaction } from '../models/PurchaseTransaction';
import { Debt } from '../models/Debt';
import { Payable } from '../models/Payable';
import { parseGmt7StringToDate } from '../utils/date';

dotenv.config();

type ModelLike = {
  modelName: string;
  find: (filter: Record<string, unknown>) => {
    select: (fields: string) => {
      lean: () => Promise<Array<{ _id: Types.ObjectId; created_date?: string }>>;
    };
  };
  bulkWrite: (
    operations: Array<{
      updateOne: {
        filter: { _id: Types.ObjectId };
        update: { $set: { created_date_ts: Date } };
      };
    }>,
    options: { ordered: boolean }
  ) => Promise<{ modifiedCount?: number }>;
};

const runBackfillForModel = async (model: ModelLike): Promise<void> => {
  const docs = await model
    .find({
      $or: [{ created_date_ts: { $exists: false } }, { created_date_ts: null }],
      created_date: { $exists: true, $type: 'string' },
    })
    .select('_id created_date')
    .lean();

  if (!docs.length) {
    console.log(`[BACKFILL] ${model.modelName}: no pending documents`);
    return;
  }

  const operations = docs
    .map((doc) => {
      const parsed = parseGmt7StringToDate(doc.created_date);
      if (!parsed) return null;
      return {
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { created_date_ts: parsed } },
        },
      };
    })
    .filter((op): op is NonNullable<typeof op> => Boolean(op));

  if (!operations.length) {
    console.log(`[BACKFILL] ${model.modelName}: no valid created_date to convert`);
    return;
  }

  const result = await model.bulkWrite(operations, { ordered: false });
  const modified = result.modifiedCount ?? 0;
  console.log(`[BACKFILL] ${model.modelName}: updated ${modified} documents`);
};

const main = async (): Promise<void> => {
  await connectDB();

  await runBackfillForModel(Product);
  await runBackfillForModel(Customer);
  await runBackfillForModel(Store);
  await runBackfillForModel(SaleTransaction);
  await runBackfillForModel(PurchaseTransaction);
  await runBackfillForModel(Debt);
  await runBackfillForModel(Payable);

  console.log('[BACKFILL] completed');
  process.exit(0);
};

main().catch((error) => {
  console.error('[BACKFILL] failed', error);
  process.exit(1);
});
