import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, PaginationQuery, CreateProductBody, UpdateProductBody } from '../types';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../services/product.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';

export const index = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await getAllProducts(req.query as PaginationQuery);
    sendSuccess(res, 'Products retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const store = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as CreateProductBody;
    if (
      !body.nama_produk
      || body.stock_on_hand === undefined
      || body.harga_grosir === undefined
      || body.harga_ecer === undefined
    ) {
      throw createError('nama_produk, stock_on_hand, harga_grosir, and harga_ecer are required', 400);
    }
    const product = await createProduct(body);
    sendSuccess(res, 'Product created successfully', product, 201);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await updateProduct(req.params.id, req.body as UpdateProductBody, req.user?.name);
    sendSuccess(res, 'Product updated successfully', product);
  } catch (error) {
    next(error);
  }
};

export const destroy = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await deleteProduct(req.params.id, req.user?.name);
    sendSuccess(res, 'Product deleted successfully');
  } catch (error) {
    next(error);
  }
};
