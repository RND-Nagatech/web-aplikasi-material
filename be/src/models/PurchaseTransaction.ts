import { Schema, model, Document } from 'mongoose';

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
}

const PurchaseTransactionItemSchema = new Schema<IPurchaseTransactionItem>(
  {
    kode_produk: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    harga_beli: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseTransactionSchema = new Schema<IPurchaseTransaction>(
  {
    type_trx: { type: String, enum: ['BELI'], required: true, default: 'BELI' },
    no_faktur_beli: { type: String, required: true, trim: true, unique: true },
    kode_customer: { type: String, required: true, trim: true, default: '-' },
    nama_customer: { type: String, required: true, trim: true },
    no_hp: { type: String, required: true, trim: true, default: '-' },
    alamat: { type: String, required: true, trim: true, default: '-' },
    items: { type: [PurchaseTransactionItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    dibayar: { type: Number, required: true, min: 0, default: 0 },
    kembalian: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['LUNAS', 'HUTANG'], required: true },
    created_date: { type: String, required: true },
  },
  { timestamps: false }
);

export const PurchaseTransaction = model<IPurchaseTransaction>(
  'PurchaseTransaction',
  PurchaseTransactionSchema,
  'tt_beli_detail'
);
