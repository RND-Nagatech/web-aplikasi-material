import mongoose from 'mongoose';
import { CashDailyCurrent, ICashDailyCurrent } from '../models/CashDailyCurrent';
import { CashDailyHistory } from '../models/CashDailyHistory';
import { formatDateOnlyGmt7, formatGmt7 } from '../utils/date';
import { logger } from '../utils/logger';

type SessionOptions = { session?: mongoose.ClientSession; now?: Date };

const getLastArchivedOrCurrentSaldoAkhir = async (
  options: SessionOptions = {}
): Promise<number> => {
  const { session } = options;

  const [lastHistory] = await CashDailyHistory.find({})
    .sort({ tanggal: -1 })
    .limit(1)
    .select('saldo_akhir')
    .session(session ?? null)
    .lean();
  if (lastHistory) return lastHistory.saldo_akhir ?? 0;

  const [lastCurrent] = await CashDailyCurrent.find({})
    .sort({ tanggal: -1 })
    .limit(1)
    .select('saldo_akhir')
    .session(session ?? null)
    .lean();

  return lastCurrent?.saldo_akhir ?? 0;
};

const archiveCurrentToHistory = async (
  current: Pick<ICashDailyCurrent, 'tanggal' | 'saldo_awal' | 'uang_masuk' | 'uang_keluar' | 'saldo_akhir' | 'created_date' | 'created_date_ts'>,
  options: SessionOptions = {}
): Promise<void> => {
  const { session, now = new Date() } = options;
  const closedAt = formatGmt7(now);

  await CashDailyHistory.updateOne(
    { tanggal: current.tanggal },
    {
      $set: {
        tanggal: current.tanggal,
        saldo_awal: current.saldo_awal,
        uang_masuk: current.uang_masuk,
        uang_keluar: current.uang_keluar,
        saldo_akhir: current.saldo_akhir,
        is_closed: true,
        closed_at: closedAt,
        created_date: current.created_date,
        updated_date: closedAt,
        created_date_ts: current.created_date_ts ?? now,
        updated_date_ts: now,
      },
    },
    { upsert: true, session }
  );
};

const createCurrentDaily = async (
  tanggal: string,
  saldoAwal: number,
  options: SessionOptions = {}
): Promise<ICashDailyCurrent> => {
  const { session, now = new Date() } = options;
  const nowGmt7 = formatGmt7(now);

  const [doc] = await CashDailyCurrent.create(
    [
      {
        tanggal,
        saldo_awal: saldoAwal,
        uang_masuk: 0,
        uang_keluar: 0,
        saldo_akhir: saldoAwal,
        is_closed: false,
        closed_at: '-',
        created_date: nowGmt7,
        updated_date: nowGmt7,
        created_date_ts: now,
        updated_date_ts: now,
      },
    ],
    { session }
  );

  return doc;
};

const createOrGetCurrentDaily = async (
  tanggal: string,
  saldoAwal: number,
  options: SessionOptions = {}
): Promise<ICashDailyCurrent> => {
  const { session, now } = options;

  try {
    return await createCurrentDaily(tanggal, saldoAwal, { session, now });
  } catch (error) {
    if (error instanceof mongoose.Error && (error as { code?: number }).code === 11000) {
      const existing = await CashDailyCurrent.findOne({ tanggal }).session(session ?? null);
      if (existing) return existing;
    }
    throw error;
  }
};

export const ensureCurrentCashDaily = async (options: SessionOptions = {}): Promise<ICashDailyCurrent> => {
  const { session, now = new Date() } = options;
  const today = formatDateOnlyGmt7(now);

  const [current] = await CashDailyCurrent.find({})
    .sort({ tanggal: -1 })
    .limit(1)
    .session(session ?? null);

  if (!current) {
    const saldoAwal = await getLastArchivedOrCurrentSaldoAkhir({ session, now });
    return createOrGetCurrentDaily(today, saldoAwal, { session, now });
  }

  if (current.tanggal === today) {
    return current;
  }

  if (current.tanggal < today) {
    await archiveCurrentToHistory(
      {
        tanggal: current.tanggal,
        saldo_awal: current.saldo_awal,
        uang_masuk: current.uang_masuk,
        uang_keluar: current.uang_keluar,
        saldo_akhir: current.saldo_akhir,
        created_date: current.created_date,
        created_date_ts: current.created_date_ts,
      },
      { session, now }
    );

    await CashDailyCurrent.deleteOne({ _id: current._id }, { session });
    return createOrGetCurrentDaily(today, current.saldo_akhir, { session, now });
  }

  // Fallback safety if server time drifts backward.
  return current;
};

export const recordCashMovement = async (
  payload:
    | { type: 'jual' | 'beli'; amount: number }
    | { direction: 'in' | 'out'; amount: number },
  options: SessionOptions = {}
): Promise<void> => {
  const { session, now = new Date() } = options;
  const amount = Math.max(0, payload.amount || 0);
  if (amount <= 0) return;

  const current = await ensureCurrentCashDaily({ session, now });
  const nowGmt7 = formatGmt7(now);

  const isIncoming = 'direction' in payload ? payload.direction === 'in' : payload.type === 'jual';

  const updatePipeline =
    isIncoming
      ? [
          {
            $set: {
              uang_masuk: { $add: ['$uang_masuk', amount] },
              saldo_akhir: {
                $subtract: [
                  { $add: ['$saldo_awal', { $add: ['$uang_masuk', amount] }] },
                  '$uang_keluar',
                ],
              },
              updated_date: nowGmt7,
              updated_date_ts: now,
            },
          },
        ]
      : [
          {
            $set: {
              uang_keluar: { $add: ['$uang_keluar', amount] },
              saldo_akhir: {
                $subtract: [
                  { $add: ['$saldo_awal', '$uang_masuk'] },
                  { $add: ['$uang_keluar', amount] },
                ],
              },
              updated_date: nowGmt7,
              updated_date_ts: now,
            },
          },
        ];

  await CashDailyCurrent.updateOne({ _id: current._id }, updatePipeline as mongoose.PipelineStage[], { session });
};

export const runCashDailyRollover = async (now: Date = new Date()): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await ensureCurrentCashDaily({ session, now });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();

    if (error instanceof mongoose.Error && (error as { code?: number }).code === 11000) {
      // Another process completed rollover first.
      logger.warn('cash_daily_rollover_duplicate', {
        message: error.message,
      });
      return;
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

export type DailyCashSummary = {
  tanggal: string;
  saldo_awal: number;
  uang_masuk: number;
  uang_keluar: number;
  saldo_akhir: number;
};

export const getDailyCashByRange = async (
  fromDate?: string,
  toDate?: string
): Promise<DailyCashSummary[]> => {
  const rangeFilter: Record<string, string> = {};
  if (fromDate) rangeFilter.$gte = fromDate;
  if (toDate) rangeFilter.$lte = toDate;
  const where = Object.keys(rangeFilter).length ? { tanggal: rangeFilter } : {};

  const [historyRows, currentRows] = await Promise.all([
    CashDailyHistory.find(where)
      .select('tanggal saldo_awal uang_masuk uang_keluar saldo_akhir')
      .lean(),
    CashDailyCurrent.find(where)
      .select('tanggal saldo_awal uang_masuk uang_keluar saldo_akhir')
      .lean(),
  ]);

  const merged = new Map<string, DailyCashSummary>();

  [...historyRows, ...currentRows].forEach((row) => {
    merged.set(row.tanggal, {
      tanggal: row.tanggal,
      saldo_awal: row.saldo_awal ?? 0,
      uang_masuk: row.uang_masuk ?? 0,
      uang_keluar: row.uang_keluar ?? 0,
      saldo_akhir: row.saldo_akhir ?? 0,
    });
  });

  return [...merged.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
};

export const getSaldoBeforeDate = async (date: string): Promise<number> => {
  const [historyRow] = await CashDailyHistory.find({ tanggal: { $lt: date } })
    .sort({ tanggal: -1 })
    .limit(1)
    .select('saldo_akhir')
    .lean();

  if (historyRow) return historyRow.saldo_akhir ?? 0;

  const [currentRow] = await CashDailyCurrent.find({ tanggal: { $lt: date } })
    .sort({ tanggal: -1 })
    .limit(1)
    .select('saldo_akhir')
    .lean();

  return currentRow?.saldo_akhir ?? 0;
};
