import { Request, Response } from 'express';
import { loginService, registerService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest, LoginBody, RegisterBody } from '../types';
import { createError } from '../middlewares/error.middleware';
import { asyncHandler } from '../utils/async-handler';

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body as RegisterBody;
  if (!name || !email || !password) {
    throw createError('name, email, and password are required', 400, 'VALIDATION_ERROR');
  }

  const result = await registerService(name, email, password);
  sendSuccess(res, 'Register successful', result, 201);
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body as LoginBody;
  const identifier = email ?? username ?? '';

  if (!identifier || !password) {
    throw createError('Email/username and password are required', 400, 'VALIDATION_ERROR');
  }

  const result = await loginService(identifier, password);
  sendSuccess(res, 'Login successful', result);
});

export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw createError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  sendSuccess(res, 'Authenticated user retrieved successfully', req.user);
});
