import { Schema, model, Document } from 'mongoose';

const toUpperTrim = (value: string): string => value.trim().toUpperCase();

export interface IPurchaseTransactionItem {
  kode_produk: string;
  qty: number;
  harga_beli: number;
  subtotal: number;
}

export interface IPurchaseTransaction extends Document {
  type_trx: 'BELI';
  no_faktur_beli: string;
  kode_customer: string;
  nama_customer: string;
  no_hp: string;
  alamat: string;
  items: IPurchaseTransactionItem[];
  total: number;
  dibayar: number;
  kembalian: number;
  status: 'LUNAS' | 'HUTANG';
  created_date: string;
  created_date_ts?: Date;
}

const PurchaseTransactionItemSchema = new Schema<IPurchaseTransactionItem>(
  {
    kode_produk: { type: String, required: true, trim: true, set: toUpperTrim },
    qty: { type: Number, required: true, min: 1 },
    harga_beli: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseTransactionSchema = new Schema<IPurchaseTransaction>(
  {
    type_trx: { type: String, enum: ['BELI'], required: true, default: 'BELI' },
    no_faktur_beli: { type: String, required: true, trim: true, unique: true, set: toUpperTrim },
    kode_customer: { type: String, required: true, trim: true, default: '-', set: toUpperTrim },
    nama_customer: { type: String, required: true, trim: true, set: toUpperTrim },
    no_hp: { type: String, required: true, trim: true, default: '-' },
    alamat: { type: String, required: true, trim: true, default: '-', set: toUpperTrim },
    items: { type: [PurchaseTransactionItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    dibayar: { type: Number, required: true, min: 0, default: 0 },
    kembalian: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['LUNAS', 'HUTANG'], required: true, set: toUpperTrim },
    created_date: { type: String, required: true },
    created_date_ts: { type: Date, required: false },
  },
  { timestamps: false }
);

PurchaseTransactionSchema.index({ created_date: -1 });
PurchaseTransactionSchema.index({ created_date_ts: -1 });
PurchaseTransactionSchema.index({ kode_customer: 1 });
PurchaseTransactionSchema.index({ nama_customer: 1 });
PurchaseTransactionSchema.index({ status: 1 });
PurchaseTransactionSchema.index({ status: 1, created_date_ts: -1 });
PurchaseTransactionSchema.index({ kode_customer: 1, created_date_ts: -1 });

export const PurchaseTransaction = model<IPurchaseTransaction>(
  'PurchaseTransaction',
  PurchaseTransactionSchema,
  'tt_beli_detail'
);
