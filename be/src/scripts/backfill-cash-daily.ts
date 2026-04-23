import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database';
import { SaleTransaction } from '../models/SaleTransaction';
import { PurchaseTransaction } from '../models/PurchaseTransaction';
import { CashDailyCurrent } from '../models/CashDailyCurrent';
import { CashDailyHistory } from '../models/CashDailyHistory';
import { formatDateOnlyGmt7, formatGmt7, parseGmt7StringToDate } from '../utils/date';

dotenv.config();

type DayBucket = {
  tanggal: string;
  uang_masuk: number;
  uang_keluar: number;
};

const toDayKey = (createdDate?: Date, createdDateGmt7?: string): string | null => {
  if (createdDate) {
    return formatDateOnlyGmt7(createdDate);
  }

  const parsed = parseGmt7StringToDate(createdDateGmt7);
  if (!parsed) return null;
  return formatDateOnlyGmt7(parsed);
};

const run = async (): Promise<void> => {
  await connectDB();

  const [sales, purchases] = await Promise.all([
    SaleTransaction.find({}).select('total dibayar kembalian created_date created_date_ts').lean(),
    PurchaseTransaction.find({}).select('total dibayar kembalian created_date created_date_ts').lean(),
  ]);

  const bucketMap = new Map<string, DayBucket>();

  const upsertBucket = (tanggal: string): DayBucket => {
    const existing = bucketMap.get(tanggal);
    if (existing) return existing;

    const next: DayBucket = {
      tanggal,
      uang_masuk: 0,
      uang_keluar: 0,
    };
    bucketMap.set(tanggal, next);
    return next;
  };

  sales.forEach((item) => {
    const key = toDayKey(item.created_date_ts, item.created_date);
    if (!key) return;
    const bucket = upsertBucket(key);
    const total = Math.max(0, item.total ?? 0);
    const dibayar = Math.max(0, item.dibayar ?? 0);
    const effectivePaid = Math.min(dibayar, total);
    const kembalian = Math.max(0, item.kembalian ?? 0);
    bucket.uang_masuk += effectivePaid;
    bucket.uang_keluar += kembalian;
  });

  purchases.forEach((item) => {
    const key = toDayKey(item.created_date_ts, item.created_date);
    if (!key) return;
    const bucket = upsertBucket(key);
    const total = Math.max(0, item.total ?? 0);
    const dibayar = Math.max(0, item.dibayar ?? 0);
    const effectivePaid = Math.min(dibayar, total);
    const kembalian = Math.max(0, item.kembalian ?? 0);
    bucket.uang_keluar += effectivePaid + kembalian;
  });

  const sorted = [...bucketMap.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const today = formatDateOnlyGmt7(new Date());
  const now = new Date();
  const nowGmt7 = formatGmt7(now);

  let runningSaldo = 0;
  for (const item of sorted) {
    const saldoAwal = runningSaldo;
    const saldoAkhir = saldoAwal + item.uang_masuk - item.uang_keluar;

    if (item.tanggal === today) {
      await CashDailyCurrent.updateOne(
        { tanggal: item.tanggal },
        {
          $set: {
            tanggal: item.tanggal,
            saldo_awal: saldoAwal,
            uang_masuk: item.uang_masuk,
            uang_keluar: item.uang_keluar,
            saldo_akhir: saldoAkhir,
            is_closed: false,
            closed_at: '-',
            created_date: nowGmt7,
            updated_date: nowGmt7,
            created_date_ts: now,
            updated_date_ts: now,
          },
        },
        { upsert: true }
      );
    } else {
      await CashDailyHistory.updateOne(
        { tanggal: item.tanggal },
        {
          $set: {
            tanggal: item.tanggal,
            saldo_awal: saldoAwal,
            uang_masuk: item.uang_masuk,
            uang_keluar: item.uang_keluar,
            saldo_akhir: saldoAkhir,
            is_closed: true,
            closed_at: nowGmt7,
            created_date: nowGmt7,
            updated_date: nowGmt7,
            created_date_ts: now,
            updated_date_ts: now,
          },
        },
        { upsert: true }
      );
    }

    runningSaldo = saldoAkhir;
  }

  if (!sorted.find((row) => row.tanggal === today)) {
    await CashDailyCurrent.updateOne(
      { tanggal: today },
      {
        $set: {
          tanggal: today,
          saldo_awal: runningSaldo,
          uang_masuk: 0,
          uang_keluar: 0,
          saldo_akhir: runningSaldo,
          is_closed: false,
          closed_at: '-',
          created_date: nowGmt7,
          updated_date: nowGmt7,
          created_date_ts: now,
          updated_date_ts: now,
        },
      },
      { upsert: true }
    );
  }

  await CashDailyCurrent.deleteMany({ tanggal: { $ne: today } });

  console.log(`[BACKFILL] cash daily completed. days=${sorted.length}, today=${today}`);

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error('[BACKFILL] cash daily failed', error);
  try {
    await mongoose.connection.close();
  } catch (_err) {
    // ignore
  }
  process.exit(1);
});
