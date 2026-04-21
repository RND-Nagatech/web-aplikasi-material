import { signToken } from '../utils/jwt';
import { createError } from '../middlewares/error.middleware';
import { AuthUser } from '../types';
import { User } from '../models/User';
import { hashPassword, verifyPassword } from '../utils/password';

const mapAuthUser = (user: { _id: unknown; name: string; email: string }): AuthUser => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
});

export const registerService = async (
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> => {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    throw createError('name, email, and password are required', 400);
  }
  if (normalizedPassword.length < 4) {
    throw createError('password must be at least 4 characters', 400);
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw createError('Email already registered', 409);
  }

  const password_hash = await hashPassword(normalizedPassword);
  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password_hash,
  });

  const authUser = mapAuthUser(user);
  return {
    token: signToken(authUser),
    user: authUser,
  };
};

export const loginService = async (
  identifier: string,
  password: string
): Promise<{ token: string; user: AuthUser }> => {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedIdentifier || !normalizedPassword) {
    throw createError('Identifier and password are required', 400);
  }

  const user = await User.findOne({ email: normalizedIdentifier });
  if (!user) {
    throw createError('Invalid email/username or password', 401);
  }

  const validPassword = await verifyPassword(normalizedPassword, user.password_hash);
  if (!validPassword) {
    throw createError('Invalid email/username or password', 401);
  }

  const authUser = mapAuthUser(user);
  return {
    token: signToken(authUser),
    user: authUser,
  };
};
