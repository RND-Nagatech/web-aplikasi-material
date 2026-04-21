import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, PaginationQuery, CreateStoreBody, UpdateStoreBody } from '../types';
import { getAllStores, createStore, updateStore } from '../services/store.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';

export const index = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await getAllStores(req.query as PaginationQuery);
    sendSuccess(res, 'Stores retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const store = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as CreateStoreBody;
    if (!body.nama_toko) throw createError('nama_toko is required', 400);
    if (!body.no_hp) throw createError('no_hp is required', 400);
    if (!body.alamat) throw createError('alamat is required', 400);

    const result = await createStore(body);
    sendSuccess(res, 'Store created successfully', result, 201);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await updateStore(req.params.id, req.body as UpdateStoreBody, req.user?.name);
    sendSuccess(res, 'Store updated successfully', result);
  } catch (error) {
    next(error);
  }
};
