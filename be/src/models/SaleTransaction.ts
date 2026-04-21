import { Schema, model, Document } from 'mongoose';

export interface ISaleTransactionItem {
  kode_produk: string;
  qty: number;
  harga_jual: number;
  subtotal: number;
}

export interface ISaleTransaction extends Document {
  type_trx: 'JUAL';
  no_faktur_jual: string;
  kode_customer: string;
  nama_customer: string;
  no_hp: string;
  alamat: string;
  items: ISaleTransactionItem[];
  total: number;
  dibayar: number;
  kembalian: number;
  status: 'LUNAS' | 'PIUTANG';
  created_date: string;
}

const SaleTransactionItemSchema = new Schema<ISaleTransactionItem>(
  {
    kode_produk: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    harga_jual: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleTransactionSchema = new Schema<ISaleTransaction>(
  {
    type_trx: { type: String, enum: ['JUAL'], required: true, default: 'JUAL' },
    no_faktur_jual: { type: String, required: true, trim: true, unique: true },
    kode_customer: { type: String, required: true, trim: true, default: '-' },
    nama_customer: { type: String, required: true, trim: true },
    no_hp: { type: String, required: true, trim: true, default: '-' },
    alamat: { type: String, required: true, trim: true, default: '-' },
    items: { type: [SaleTransactionItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    dibayar: { type: Number, required: true, min: 0, default: 0 },
    kembalian: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['LUNAS', 'PIUTANG'], required: true },
    created_date: { type: String, required: true },
  },
  { timestamps: false }
);

export const SaleTransaction = model<ISaleTransaction>('SaleTransaction', SaleTransactionSchema, 'tt_jual_detail');
