import { Schema, model, Document } from 'mongoose';

export interface ICashDailyHistory extends Document {
  tanggal: string; // YYYY-MM-DD (GMT+7)
  saldo_awal: number;
  uang_masuk: number;
  uang_keluar: number;
  saldo_akhir: number;
  is_closed: boolean;
  closed_at: string;
  created_date: string;
  updated_date: string;
  created_date_ts?: Date;
  updated_date_ts?: Date;
}

const CashDailyHistorySchema = new Schema<ICashDailyHistory>(
  {
    tanggal: { type: String, required: true, trim: true, unique: true },
    saldo_awal: { type: Number, required: true, min: 0, default: 0 },
    uang_masuk: { type: Number, required: true, min: 0, default: 0 },
    uang_keluar: { type: Number, required: true, min: 0, default: 0 },
    saldo_akhir: { type: Number, required: true, default: 0 },
    is_closed: { type: Boolean, required: true, default: true },
    closed_at: { type: String, required: true },
    created_date: { type: String, required: true },
    updated_date: { type: String, required: true },
    created_date_ts: { type: Date, required: false },
    updated_date_ts: { type: Date, required: false },
  },
  { timestamps: false }
);

CashDailyHistorySchema.index({ tanggal: 1 }, { unique: true });
CashDailyHistorySchema.index({ updated_date_ts: -1 });

export const CashDailyHistory = model<ICashDailyHistory>(
  'CashDailyHistory',
  CashDailyHistorySchema,
  'th_cash_daily'
);
