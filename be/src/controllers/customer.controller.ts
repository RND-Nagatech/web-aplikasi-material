import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, PaginationQuery, CreateCustomerBody, UpdateCustomerBody } from '../types';
import { getAllCustomers, createCustomer, updateCustomer, deleteCustomer } from '../services/customer.service';
import { sendSuccess } from '../utils/response';
import { createError } from '../middlewares/error.middleware';

export const index = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await getAllCustomers(req.query as PaginationQuery);
    sendSuccess(res, 'Customers retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const store = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as CreateCustomerBody;
    if (!body.nama_customer) {
      throw createError('nama_customer is required', 400);
    }
    const customer = await createCustomer(body);
    sendSuccess(res, 'Customer created successfully', customer, 201);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await updateCustomer(req.params.id, req.body as UpdateCustomerBody, req.user?.name);
    sendSuccess(res, 'Customer updated successfully', customer);
  } catch (error) {
    next(error);
  }
};

export const destroy = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await deleteCustomer(req.params.id, req.user?.name);
    sendSuccess(res, 'Customer deleted successfully');
  } catch (error) {
    next(error);
  }
};
