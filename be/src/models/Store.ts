import { Schema, model, Document } from 'mongoose';

export interface IStore extends Document {
  kode_toko: string;
  nama_toko: string;
  no_hp: string;
  alamat: string;
  created_date: string;
  edited_by: string;
  edited_date: string;
}

const StoreSchema = new Schema<IStore>(
  {
    kode_toko: { type: String, required: true, trim: true, unique: true },
    nama_toko: { type: String, required: true, trim: true },
    no_hp: { type: String, required: true, trim: true },
    alamat: { type: String, required: true, trim: true },
    created_date: { type: String, required: true },
    edited_by: { type: String, trim: true, required: true, default: '-' },
    edited_date: { type: String, required: true, default: '-' },
  },
  { timestamps: false }
);

StoreSchema.index({ nama_toko: 'text' });
StoreSchema.index({ kode_toko: 1 }, { unique: true });

export const Store = model<IStore>('Store', StoreSchema, 'tm_toko');
