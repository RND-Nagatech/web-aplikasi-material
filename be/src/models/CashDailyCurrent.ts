import { Schema, model, Document } from 'mongoose';

export interface ICashDailyCurrent extends Document {
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

const CashDailyCurrentSchema = new Schema<ICashDailyCurrent>(
  {
    tanggal: { type: String, required: true, trim: true, unique: true },
    saldo_awal: { type: Number, required: true, min: 0, default: 0 },
    uang_masuk: { type: Number, required: true, min: 0, default: 0 },
    uang_keluar: { type: Number, required: true, min: 0, default: 0 },
    saldo_akhir: { type: Number, required: true, default: 0 },
    is_closed: { type: Boolean, required: true, default: false },
    closed_at: { type: String, required: true, default: '-' },
    created_date: { type: String, required: true },
    updated_date: { type: String, required: true },
    created_date_ts: { type: Date, required: false },
    updated_date_ts: { type: Date, required: false },
  },
  { timestamps: false }
);

CashDailyCurrentSchema.index({ tanggal: 1 }, { unique: true });
CashDailyCurrentSchema.index({ updated_date_ts: -1 });

export const CashDailyCurrent = model<ICashDailyCurrent>(
  'CashDailyCurrent',
  CashDailyCurrentSchema,
  'tt_cash_daily'
);
