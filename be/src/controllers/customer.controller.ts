import { Response } from 'express';
import { AuthenticatedRequest, CreateCustomerBody, UpdateCustomerBody } from '../types';
import { getAllCustomers, createCustomer, updateCustomer, deleteCustomer } from '../services/customer.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';
import { asyncHandler } from '../utils/async-handler';
import { parsePaginationQuery } from '../utils/request';

export const index = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await getAllCustomers(parsePaginationQuery(req));
  sendSuccess(res, 'Customers retrieved successfully', result);
});

export const store = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const body = req.body as CreateCustomerBody;
  if (!body.nama_customer) {
    throw createError('nama_customer is required', 400, 'VALIDATION_ERROR');
  }
  const customer = await createCustomer(body);
  sendSuccess(res, 'Customer created successfully', customer, 201);
});

export const update = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const customer = await updateCustomer(req.params.id, req.body as UpdateCustomerBody, req.user?.name);
  sendSuccess(res, 'Customer updated successfully', customer);
});

export const destroy = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await deleteCustomer(req.params.id, req.user?.name);
  sendSuccess(res, 'Customer deleted successfully');
});
