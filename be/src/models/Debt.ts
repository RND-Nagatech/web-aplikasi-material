import { Schema, model, Document } from 'mongoose';

export interface IDebt extends Document {
  kode_customer: string;
  nama_customer: string;
  no_faktur_jual: string;
  total: number;
  dibayar: number;
  sisa: number;
  created_date: string;
}

const DebtSchema = new Schema<IDebt>(
  {
    kode_customer: { type: String, required: true, trim: true, default: '-' },
    nama_customer: { type: String, required: true, trim: true, default: '-' },
    no_faktur_jual: { type: String, required: true, trim: true },
    total: { type: Number, required: true, min: 0 },
    dibayar: { type: Number, default: 0, min: 0 },
    sisa: { type: Number, required: true, min: 0 },
    created_date: { type: String, required: true },
  },
  { timestamps: false }
);

DebtSchema.index({ no_faktur_jual: 1 });

export const Debt = model<IDebt>('Debt', DebtSchema, 'tt_piutang');
