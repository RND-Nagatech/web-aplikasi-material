import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not defined');
  }
  return 'dev-local-secret';
};

export const signToken = (payload: AuthPayload): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
  return jwt.sign(payload, getSecret(), { expiresIn } as jwt.SignOptions);
};

export const verifyToken = (token: string): AuthPayload => {
  return jwt.verify(token, getSecret()) as AuthPayload;
};
