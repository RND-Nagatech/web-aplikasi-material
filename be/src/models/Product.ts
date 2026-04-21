import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  kode_produk: string;
  nama_produk: string;
  stock_on_hand: number;
  harga_grosir: number;
  harga_ecer: number;
  is_active: boolean;
  created_date: string;
  edited_by: string;
  edited_date: string;
  deleted_by: string;
  deleted_date: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    kode_produk: { type: String, required: true, trim: true },
    nama_produk: { type: String, required: true, trim: true },
    stock_on_hand: { type: Number, required: true, default: 0, min: 0 },
    harga_grosir: { type: Number, required: true, min: 0 },
    harga_ecer: { type: Number, required: true, min: 0 },
    // User request semantics: true means soft-deleted/non-active.
    is_active: { type: Boolean, required: true, default: false },
    created_date: { type: String, required: true },
    edited_by: { type: String, trim: true, required: true, default: '-' },
    edited_date: { type: String, required: true, default: '-' },
    deleted_by: { type: String, trim: true, required: true, default: '-' },
    deleted_date: { type: String, required: true, default: '-' },
  },
  { timestamps: false }
);

ProductSchema.index({ nama_produk: 'text' });
ProductSchema.index({ kode_produk: 1 }, { unique: true, sparse: true });

export const Product = model<IProduct>('Product', ProductSchema, 'tm_produk');
