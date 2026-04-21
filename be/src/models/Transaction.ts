import { Schema, model, Document, Types } from 'mongoose';

export interface ITransactionItem {
  product: Types.ObjectId;
  qty: number;
  price: number;
  subtotal: number;
}

export interface ITransaction extends Document {
  type: 'jual' | 'beli';
  customer: Types.ObjectId;
  items: ITransactionItem[];
  total: number;
  paid: number;
  status: 'lunas' | 'utang';
}

const TransactionItemSchema = new Schema<ITransactionItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const TransactionSchema = new Schema<ITransaction>(
  {
    type: { type: String, enum: ['jual', 'beli'], required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: { type: [TransactionItemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    paid: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['lunas', 'utang'], required: true },
  },
  { timestamps: true }
);

export const Transaction = model<ITransaction>('Transaction', TransactionSchema, 'tt_transaksi');
