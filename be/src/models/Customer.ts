import { Schema, model, Document } from 'mongoose';

export interface ICustomer extends Document {
  kode_customer: string;
  nama_customer: string;
  no_hp?: string;
  alamat?: string;
  is_active: boolean;
  created_date: string;
  edited_by: string;
  edited_date: string;
  deleted_by: string;
  deleted_date: string;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    kode_customer: { type: String, required: true, trim: true },
    nama_customer: { type: String, required: true, trim: true },
    no_hp: { type: String, trim: true, default: '' },
    alamat: { type: String, trim: true, default: '' },
    is_active: { type: Boolean, required: true, default: false },
    created_date: { type: String, required: true },
    edited_by: { type: String, trim: true, required: true, default: '-' },
    edited_date: { type: String, required: true, default: '-' },
    deleted_by: { type: String, trim: true, required: true, default: '-' },
    deleted_date: { type: String, required: true, default: '-' },
  },
  { timestamps: false }
);

CustomerSchema.index({ nama_customer: 'text' });
CustomerSchema.index({ kode_customer: 1 }, { unique: true, sparse: true });

export const Customer = model<ICustomer>('Customer', CustomerSchema, 'tm_customer');
