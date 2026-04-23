import { Schema, model, Document } from 'mongoose';

export interface ICustomer extends Document {
  kode_customer: string;
  nama_customer: string;
  no_hp?: string;
  alamat?: string;
  is_active: boolean;
  created_date: string;
  created_date_ts?: Date;
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
    is_active: { type: Boolean, required: true, default: true },
    created_date: { type: String, required: true },
    created_date_ts: { type: Date, required: false },
    edited_by: { type: String, trim: true, required: true, default: '-' },
    edited_date: { type: String, required: true, default: '-' },
    deleted_by: { type: String, trim: true, required: true, default: '-' },
    deleted_date: { type: String, required: true, default: '-' },
  },
  { timestamps: false }
);

CustomerSchema.index({ nama_customer: 'text' });
CustomerSchema.index({ kode_customer: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ created_date_ts: -1 });
CustomerSchema.index({ is_active: 1, created_date_ts: -1 });

export const Customer = model<ICustomer>('Customer', CustomerSchema, 'tm_customer');
