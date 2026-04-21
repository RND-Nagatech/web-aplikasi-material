import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password_hash: string;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 255 },
    password_hash: { type: String, required: true },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema, 'tm_user');
