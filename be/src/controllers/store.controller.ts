import { Response } from 'express';
import { AuthenticatedRequest, CreateStoreBody, UpdateStoreBody } from '../types';
import { getAllStores, createStore, updateStore } from '../services/store.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';
import { asyncHandler } from '../utils/async-handler';
import { parsePaginationQuery } from '../utils/request';

export const index = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await getAllStores(parsePaginationQuery(req));
  sendSuccess(res, 'Stores retrieved successfully', result);
});

export const store = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const body = req.body as CreateStoreBody;
  if (!body.nama_toko) throw createError('nama_toko is required', 400, 'VALIDATION_ERROR');
  if (!body.no_hp) throw createError('no_hp is required', 400, 'VALIDATION_ERROR');
  if (!body.alamat) throw createError('alamat is required', 400, 'VALIDATION_ERROR');

  const result = await createStore(body);
  sendSuccess(res, 'Store created successfully', result, 201);
});

export const update = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await updateStore(req.params.id, req.body as UpdateStoreBody, req.user?.name);
  sendSuccess(res, 'Store updated successfully', result);
});
