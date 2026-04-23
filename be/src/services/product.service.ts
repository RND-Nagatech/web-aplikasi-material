import { FilterQuery } from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { CreateProductBody, UpdateProductBody, PaginationQuery, PaginatedResult } from '../types';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { createError } from '../middlewares/error.middleware';
import { formatGmt7 } from '../utils/date';

const normalizeProductName = (value: string): string => value.trim().toUpperCase();

export const getAllProducts = async (query: PaginationQuery): Promise<PaginatedResult<IProduct>> => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter: FilterQuery<IProduct> = { is_active: true };

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  const [items, total] = await Promise.all([
    Product.find(filter).skip(skip).limit(limit).sort({ created_date_ts: -1, created_date: -1 }),
    Product.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, page, limit);
};

export const createProduct = async (body: CreateProductBody): Promise<IProduct> => {
  const normalizedName = body.nama_produk.trim();
  const normalizedNameUpper = normalizeProductName(body.nama_produk);
  const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = await Product.findOne({
    nama_produk: { $regex: `^${escapedName}$`, $options: 'i' },
  });

  if (existing && existing.is_active) {
    throw createError('Nama produk sudah digunakan', 409);
  }

  if (existing && !existing.is_active) {
    if (!body.restore_existing) {
      throw createError('RESTORE_CONFIRMATION_REQUIRED', 409);
    }

    existing.stock_on_hand = body.stock_on_hand;
    existing.harga_grosir = body.harga_grosir;
    existing.harga_ecer = body.harga_ecer;
    existing.nama_produk = normalizedNameUpper;
    existing.is_active = true;
    if (!existing.created_date_ts) {
      existing.created_date_ts = new Date();
    }
    existing.deleted_by = '-';
    existing.deleted_date = '-';
    existing.edited_by = '-';
    existing.edited_date = formatGmt7();
    return existing.save();
  }

  const last = await Product.findOne({
    kode_produk: { $regex: '^\\d{8}$' },
  })
    .sort({ kode_produk: -1 })
    .select('kode_produk')
    .lean();
  const lastNumber = last?.kode_produk ? Number.parseInt(last.kode_produk, 10) : 0;
  const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  const kodeProduk = String(nextNumber).padStart(8, '0');

  const product = new Product({
    ...body,
    kode_produk: kodeProduk,
    nama_produk: normalizedNameUpper,
    is_active: true,
    created_date: formatGmt7(),
    created_date_ts: new Date(),
    edited_by: '-',
    edited_date: '-',
    deleted_by: '-',
    deleted_date: '-',
  });
  return product.save();
};

export const updateProduct = async (id: string, body: UpdateProductBody, actorName?: string): Promise<IProduct> => {
  const payload: any = {
    ...body,
    ...(actorName ? { edited_by: actorName } : {}),
    edited_date: formatGmt7(),
  };
  if (body.nama_produk) payload.nama_produk = normalizeProductName(body.nama_produk);
  const product = await Product.findOneAndUpdate({ _id: id, is_active: true }, payload, { new: true, runValidators: true });
  if (!product) throw createError('Product not found', 404);
  return product;
};

export const deleteProduct = async (id: string, actorName?: string): Promise<void> => {
  const payload = {
    is_active: false,
    ...(actorName ? { deleted_by: actorName } : {}),
    deleted_date: formatGmt7(),
  };
  const product = await Product.findOneAndUpdate({ _id: id, is_active: true }, payload, { new: true });
  if (!product) throw createError('Product not found', 404);
};
