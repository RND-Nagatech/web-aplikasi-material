import { Schema, model, Document } from 'mongoose';

export interface IPayable extends Document {
  kode_customer: string;
  nama_customer: string;
  no_faktur_beli: string;
  total: number;
  dibayar: number;
  sisa: number;
  created_date: string;
}

const PayableSchema = new Schema<IPayable>(
  {
    kode_customer: { type: String, required: true, trim: true, default: '-' },
    nama_customer: { type: String, required: true, trim: true, default: '-' },
    no_faktur_beli: { type: String, required: true, trim: true },
    total: { type: Number, required: true, min: 0 },
    dibayar: { type: Number, default: 0, min: 0 },
    sisa: { type: Number, required: true, min: 0 },
    created_date: { type: String, required: true },
  },
  { timestamps: false }
);

PayableSchema.index({ no_faktur_beli: 1 });

export const Payable = model<IPayable>('Payable', PayableSchema, 'tt_hutang');
