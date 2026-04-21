import { FilterQuery } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';
import { CreateCustomerBody, UpdateCustomerBody, PaginationQuery, PaginatedResult } from '../types';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { createError } from '../middlewares/error.middleware';
import { formatGmt7 } from '../utils/date';

export const getAllCustomers = async (query: PaginationQuery): Promise<PaginatedResult<ICustomer>> => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter: FilterQuery<ICustomer> = { is_active: false };
  const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (query.nama_customer?.trim()) {
    filter.nama_customer = { $regex: escapeRegex(query.nama_customer.trim()), $options: 'i' };
  }

  if (query.no_hp?.trim()) {
    filter.no_hp = { $regex: escapeRegex(query.no_hp.trim()), $options: 'i' };
  }

  if (query.alamat?.trim()) {
    filter.alamat = { $regex: escapeRegex(query.alamat.trim()), $options: 'i' };
  }

  if (query.search?.trim()) {
    const q = escapeRegex(query.search.trim());
    filter.$or = [
      { nama_customer: { $regex: q, $options: 'i' } },
      { no_hp: { $regex: q, $options: 'i' } },
      { alamat: { $regex: q, $options: 'i' } },
      { kode_customer: { $regex: q, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Customer.find(filter).skip(skip).limit(limit).sort({ created_date: -1 }),
    Customer.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, page, limit);
};

export const createCustomer = async (body: CreateCustomerBody): Promise<ICustomer> => {
  const normalizedName = body.nama_customer.trim();
  const last = await Customer.findOne({
    kode_customer: { $regex: '^C\\d{8}$' },
  })
    .sort({ kode_customer: -1 })
    .select('kode_customer')
    .lean();
  const lastNumber = last?.kode_customer ? Number.parseInt(last.kode_customer.slice(1), 10) : 0;
  const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  const kodeCustomer = `C${String(nextNumber).padStart(8, '0')}`;

  const customer = new Customer({
    kode_customer: kodeCustomer,
    nama_customer: normalizedName,
    no_hp: body.no_hp ?? '',
    alamat: body.alamat ?? '',
    is_active: false,
    created_date: formatGmt7(),
    edited_by: '-',
    edited_date: '-',
    deleted_by: '-',
    deleted_date: '-',
  });
  return customer.save();
};

export const updateCustomer = async (id: string, body: UpdateCustomerBody, actorName?: string): Promise<ICustomer> => {
  const payload: any = {
    ...body,
    ...(actorName ? { edited_by: actorName } : {}),
    edited_date: formatGmt7(),
  };
  const customer = await Customer.findOneAndUpdate({ _id: id, is_active: false }, payload, { new: true, runValidators: true });
  if (!customer) throw createError('Customer not found', 404);
  return customer;
};

export const deleteCustomer = async (id: string, actorName?: string): Promise<void> => {
  const payload: any = {
    is_active: true,
    ...(actorName ? { deleted_by: actorName } : {}),
    deleted_date: formatGmt7(),
  };
  const customer = await Customer.findOneAndUpdate({ _id: id, is_active: false }, payload, { new: true });
  if (!customer) throw createError('Customer not found', 404);
};
