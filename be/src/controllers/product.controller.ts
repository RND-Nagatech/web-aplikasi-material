import { Response } from 'express';
import { AuthenticatedRequest, CreateProductBody, UpdateProductBody } from '../types';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../services/product.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';
import { asyncHandler } from '../utils/async-handler';
import { parsePaginationQuery } from '../utils/request';

export const index = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await getAllProducts(parsePaginationQuery(req));
  sendSuccess(res, 'Products retrieved successfully', result);
});

export const store = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const body = req.body as CreateProductBody;
  if (
    !body.nama_produk
    || body.stock_on_hand === undefined
    || body.harga_grosir === undefined
    || body.harga_ecer === undefined
  ) {
    throw createError('nama_produk, stock_on_hand, harga_grosir, and harga_ecer are required', 400, 'VALIDATION_ERROR');
  }
  const product = await createProduct(body);
  sendSuccess(res, 'Product created successfully', product, 201);
});

export const update = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const product = await updateProduct(req.params.id, req.body as UpdateProductBody, req.user?.name);
  sendSuccess(res, 'Product updated successfully', product);
});

export const destroy = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await deleteProduct(req.params.id, req.user?.name);
  sendSuccess(res, 'Product deleted successfully');
});
