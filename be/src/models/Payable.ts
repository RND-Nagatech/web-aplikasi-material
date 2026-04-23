import { Schema, model, Document } from 'mongoose';

const toUpperTrim = (value: string): string => value.trim().toUpperCase();

export interface IPayable extends Document {
  kode_customer: string;
  nama_customer: string;
  no_faktur_beli: string;
  total: number;
  dibayar: number;
  sisa: number;
  created_date: string;
  created_date_ts?: Date;
}

const PayableSchema = new Schema<IPayable>(
  {
    kode_customer: { type: String, required: true, trim: true, default: '-', set: toUpperTrim },
    nama_customer: { type: String, required: true, trim: true, default: '-', set: toUpperTrim },
    no_faktur_beli: { type: String, required: true, trim: true, set: toUpperTrim },
    total: { type: Number, required: true, min: 0 },
    dibayar: { type: Number, default: 0, min: 0 },
    sisa: { type: Number, required: true, min: 0 },
    created_date: { type: String, required: true },
    created_date_ts: { type: Date, required: false },
  },
  { timestamps: false }
);

PayableSchema.index({ no_faktur_beli: 1 });
PayableSchema.index({ created_date: -1 });
PayableSchema.index({ created_date_ts: -1 });
PayableSchema.index({ kode_customer: 1 });
PayableSchema.index({ sisa: 1 });
PayableSchema.index({ sisa: 1, created_date_ts: -1 });

export const Payable = model<IPayable>('Payable', PayableSchema, 'tt_hutang');
