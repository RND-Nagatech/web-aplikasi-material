import { Schema, model, Document } from 'mongoose';

const toUpperTrim = (value: string): string => value.trim().toUpperCase();

export interface IDebt extends Document {
  kode_customer: string;
  nama_customer: string;
  no_faktur_jual: string;
  total: number;
  dibayar: number;
  sisa: number;
  created_date: string;
  created_date_ts?: Date;
}

const DebtSchema = new Schema<IDebt>(
  {
    kode_customer: { type: String, required: true, trim: true, default: '-', set: toUpperTrim },
    nama_customer: { type: String, required: true, trim: true, default: '-', set: toUpperTrim },
    no_faktur_jual: { type: String, required: true, trim: true, set: toUpperTrim },
    total: { type: Number, required: true, min: 0 },
    dibayar: { type: Number, default: 0, min: 0 },
    sisa: { type: Number, required: true, min: 0 },
    created_date: { type: String, required: true },
    created_date_ts: { type: Date, required: false },
  },
  { timestamps: false }
);

DebtSchema.index({ no_faktur_jual: 1 });
DebtSchema.index({ created_date: -1 });
DebtSchema.index({ created_date_ts: -1 });
DebtSchema.index({ kode_customer: 1 });
DebtSchema.index({ sisa: 1 });
DebtSchema.index({ sisa: 1, created_date_ts: -1 });

export const Debt = model<IDebt>('Debt', DebtSchema, 'tt_piutang');
