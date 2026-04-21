import { FilterQuery } from 'mongoose';
import { Store, IStore } from '../models/Store';
import { CreateStoreBody, UpdateStoreBody, PaginationQuery, PaginatedResult } from '../types';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { createError } from '../middlewares/error.middleware';
import { formatGmt7 } from '../utils/date';

const createStoreCodeBase = (rawName: string): string => {
  const normalized = rawName.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!normalized) return 'TOK';
  if (normalized.length >= 3) return normalized.slice(0, 3);
  return normalized.padEnd(3, 'X');
};

const generateNextStoreCode = async (namaToko: string): Promise<string> => {
  const base = createStoreCodeBase(namaToko);
  const regex = new RegExp(`^${base}(\\d+)?$`);
  const existing = await Store.find({ kode_toko: { $regex: regex } })
    .select('kode_toko')
    .lean();

  if (!existing.length) {
    return base;
  }

  let maxSequence = 1;
  for (const row of existing) {
    const suffix = row.kode_toko.slice(base.length);
    if (!suffix) {
      maxSequence = Math.max(maxSequence, 1);
      continue;
    }
    const seq = Number.parseInt(suffix, 10);
    if (!Number.isNaN(seq)) {
      maxSequence = Math.max(maxSequence, seq);
    }
  }

  const next = maxSequence + 1;
  const suffix = next < 100 ? String(next).padStart(2, '0') : String(next);
  return `${base}${suffix}`;
};

export const getAllStores = async (query: PaginationQuery): Promise<PaginatedResult<IStore>> => {
  const { page, limit, skip } = getPaginationParams(query);
  const filter: FilterQuery<IStore> = {};

  if (query.search) {
    filter.$or = [
      { nama_toko: { $regex: query.search, $options: 'i' } },
      { kode_toko: { $regex: query.search, $options: 'i' } },
      { alamat: { $regex: query.search, $options: 'i' } },
      { no_hp: { $regex: query.search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Store.find(filter).skip(skip).limit(limit).sort({ created_date: -1 }),
    Store.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, page, limit);
};

export const createStore = async (body: CreateStoreBody): Promise<IStore> => {
  const namaToko = body.nama_toko.trim().toUpperCase();
  const alamat = body.alamat.trim().toUpperCase();
  const noHp = body.no_hp.trim();

  const kodeToko = await generateNextStoreCode(namaToko);

  const store = new Store({
    kode_toko: kodeToko,
    nama_toko: namaToko,
    no_hp: noHp,
    alamat,
    created_date: formatGmt7(),
    edited_by: '-',
    edited_date: '-',
  });

  return store.save();
};

export const updateStore = async (id: string, body: UpdateStoreBody, actorName?: string): Promise<IStore> => {
  const payload: Partial<IStore> & { edited_date: string; edited_by?: string } = {
    edited_date: formatGmt7(),
  };

  if (body.nama_toko !== undefined) payload.nama_toko = body.nama_toko.trim().toUpperCase();
  if (body.no_hp !== undefined) payload.no_hp = body.no_hp.trim();
  if (body.alamat !== undefined) payload.alamat = body.alamat.trim().toUpperCase();
  if (actorName) payload.edited_by = actorName;

  const store = await Store.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!store) throw createError('Store not found', 404);
  return store;
};
