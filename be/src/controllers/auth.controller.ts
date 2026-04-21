import { Request, Response, NextFunction } from 'express';
import { loginService, registerService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest, LoginBody, RegisterBody } from '../types';
import { createError } from '../middlewares/error.middleware';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body as RegisterBody;
    if (!name || !email || !password) {
      throw createError('name, email, and password are required', 400);
    }

    const result = await registerService(name, email, password);
    sendSuccess(res, 'Register successful', result, 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password } = req.body as LoginBody;
    const identifier = email ?? username ?? '';

    if (!identifier || !password) {
      throw createError('Email/username and password are required', 400);
    }

    const result = await loginService(identifier, password);
    sendSuccess(res, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

export const me = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      throw createError('Unauthorized', 401);
    }
    sendSuccess(res, 'Authenticated user retrieved successfully', req.user);
  } catch (error) {
    next(error);
  }
};
