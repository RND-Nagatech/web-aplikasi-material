import { FilterQuery } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';
import { CreateCustomerBody, UpdateCustomerBody, PaginationQuery, PaginatedResult } from '../types';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { createError } from '../middlewares/error.middleware';
import { formatGmt7 } from '../utils/date';

const normalizeUpper = (value?: string): string => (value ?? '').trim().toUpperCase();
const normalizeTrim = (value?: string): string => (value ?? '').trim();

export const getAllCustomers = async (query: PaginationQuery): Promise<PaginatedResult<ICustomer>> => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter: FilterQuery<ICustomer> = { is_active: true };
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
    Customer.find(filter).skip(skip).limit(limit).sort({ created_date_ts: -1, created_date: -1 }),
    Customer.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, page, limit);
};

export const createCustomer = async (body: CreateCustomerBody): Promise<ICustomer> => {
  const normalizedName = normalizeUpper(body.nama_customer);
  const normalizedAddress = normalizeUpper(body.alamat);
  const normalizedPhone = normalizeTrim(body.no_hp);
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
    no_hp: normalizedPhone,
    alamat: normalizedAddress,
    is_active: true,
    created_date: formatGmt7(),
    created_date_ts: new Date(),
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
  if (body.nama_customer !== undefined) payload.nama_customer = normalizeUpper(body.nama_customer);
  if (body.alamat !== undefined) payload.alamat = normalizeUpper(body.alamat);
  if (body.no_hp !== undefined) payload.no_hp = normalizeTrim(body.no_hp);
  const customer = await Customer.findOneAndUpdate({ _id: id, is_active: true }, payload, { new: true, runValidators: true });
  if (!customer) throw createError('Customer not found', 404);
  return customer;
};

export const deleteCustomer = async (id: string, actorName?: string): Promise<void> => {
  const payload: any = {
    is_active: false,
    ...(actorName ? { deleted_by: actorName } : {}),
    deleted_date: formatGmt7(),
  };
  const customer = await Customer.findOneAndUpdate({ _id: id, is_active: true }, payload, { new: true });
  if (!customer) throw createError('Customer not found', 404);
};
