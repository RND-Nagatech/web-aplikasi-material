import mongoose from 'mongoose';
import { ISaleTransaction, SaleTransaction } from '../models/SaleTransaction';
import { IPurchaseTransaction, PurchaseTransaction } from '../models/PurchaseTransaction';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Debt } from '../models/Debt';
import { Payable } from '../models/Payable';
import { CreateTransactionBody, PaginationQuery, PaginatedResult } from '../types';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { createError } from '../middlewares/error.middleware';
import { formatGmt7, formatGmt7DateCode } from '../utils/date';

type TransactionRecord = ISaleTransaction | IPurchaseTransaction;

const generateNextCustomerCode = async (): Promise<string> => {
  const last = await Customer.findOne({ kode_customer: { $regex: '^C\\d{8}$' } })
    .sort({ kode_customer: -1 })
    .select('kode_customer')
    .lean();
  const lastNumber = last?.kode_customer ? Number.parseInt(last.kode_customer.slice(1), 10) : 0;
  const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  return `C${String(nextNumber).padStart(8, '0')}`;
};

const generateNextProductCode = async (): Promise<string> => {
  const last = await Product.findOne({ kode_produk: { $regex: '^\\d{8}$' } })
    .sort({ kode_produk: -1 })
    .select('kode_produk')
    .lean();
  const lastNumber = last?.kode_produk ? Number.parseInt(last.kode_produk, 10) : 0;
  const nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  return String(nextNumber).padStart(8, '0');
};

const generateNextSaleInvoiceNumber = async (
  dateCode: string,
  session: mongoose.ClientSession
): Promise<string> => {
  const regex = new RegExp(`^FJ-${dateCode}-\\d{4}$`);
  const lastDoc = await SaleTransaction.findOne({ no_faktur_jual: { $regex: regex } })
    .sort({ no_faktur_jual: -1 })
    .select('no_faktur_jual')
    .session(session)
    .lean();
  const lastInvoice = lastDoc?.no_faktur_jual ?? '';
  const lastSequenceRaw = lastInvoice.split('-')[2];
  const lastSequence = Number.parseInt(lastSequenceRaw, 10);
  const nextSequence = Number.isNaN(lastSequence) ? 1 : lastSequence + 1;
  return `FJ-${dateCode}-${String(nextSequence).padStart(4, '0')}`;
};

const generateNextPurchaseInvoiceNumber = async (
  dateCode: string,
  session: mongoose.ClientSession
): Promise<string> => {
  const regex = new RegExp(`^FB-${dateCode}-\\d{4}$`);
  const lastDoc = await PurchaseTransaction.findOne({ no_faktur_beli: { $regex: regex } })
    .sort({ no_faktur_beli: -1 })
    .select('no_faktur_beli')
    .session(session)
    .lean();
  const lastInvoice = lastDoc?.no_faktur_beli ?? '';
  const lastSequenceRaw = lastInvoice.split('-')[2];
  const lastSequence = Number.parseInt(lastSequenceRaw, 10);
  const nextSequence = Number.isNaN(lastSequence) ? 1 : lastSequence + 1;
  return `FB-${dateCode}-${String(nextSequence).padStart(4, '0')}`;
};

export const getAllTransactions = async (query: PaginationQuery): Promise<PaginatedResult<TransactionRecord>> => {
  const { page, limit, skip } = getPaginationParams(query);

  const [sales, purchases] = await Promise.all([
    SaleTransaction.find().sort({ created_date: -1 }),
    PurchaseTransaction.find().sort({ created_date: -1 }),
  ]);

  const merged = [...sales, ...purchases].sort((a, b) => {
    const aTime = a.created_date ? new Date(a.created_date.replace(' GMT+7', '+07:00').replace(' ', 'T')).getTime() : 0;
    const bTime = b.created_date ? new Date(b.created_date.replace(' GMT+7', '+07:00').replace(' ', 'T')).getTime() : 0;
    return bTime - aTime;
  });

  const total = merged.length;
  const items = merged.slice(skip, skip + limit) as TransactionRecord[];

  return buildPaginatedResult(items, total, page, limit);
};

export const createTransaction = async (body: CreateTransactionBody): Promise<TransactionRecord> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();
    const createdDate = formatGmt7(now);
    const dateCode = formatGmt7DateCode(now);
    const resolvedPaid = body.dibayar ?? body.paid ?? 0;
    const manualName = (body.nama_customer ?? '').trim();
    const manualNoHp = (body.no_hp ?? '').trim();
    const manualAlamat = (body.alamat ?? '').trim();

    let resolvedKodeCustomer = '-';
    let resolvedNamaCustomer = '';
    let resolvedNoHp = '-';
    let resolvedAlamat = '-';

    if (body.customer) {
      const customerDoc = await Customer.findById(body.customer).session(session);
      if (!customerDoc) {
        throw createError(`Customer ${body.customer} not found`, 404);
      }
      if (customerDoc.is_active) {
        throw createError(`Customer ${customerDoc.nama_customer} is inactive`, 400);
      }
      if (!customerDoc.kode_customer) {
        customerDoc.kode_customer = await generateNextCustomerCode();
        await customerDoc.save({ session });
      }

      resolvedKodeCustomer = customerDoc.kode_customer;
      resolvedNamaCustomer = customerDoc.nama_customer;
      resolvedNoHp = '-';
      resolvedAlamat = '-';
    } else {
      if (!manualName) {
        throw createError('nama_customer is required when customer is not selected', 400);
      }
      resolvedNamaCustomer = manualName;
      resolvedNoHp = manualNoHp || '-';
      resolvedAlamat = manualAlamat || '-';
    }

    const normalizedItems: Array<{ kode_produk: string; qty: number; unit_price: number; subtotal: number }> = [];

    for (const item of body.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw createError(`Product ${item.product} not found`, 404);
      }
      if (product.is_active) {
        throw createError(`Product ${product.nama_produk} is inactive`, 400);
      }
      if (!product.kode_produk) {
        product.kode_produk = await generateNextProductCode();
      }

      if (body.type === 'jual') {
        if (product.stock_on_hand < item.qty) {
          throw createError(`Insufficient stock for product: ${product.nama_produk}`, 400);
        }
        product.stock_on_hand -= item.qty;
      } else {
        product.stock_on_hand += item.qty;
      }

      await product.save({ session });

      normalizedItems.push({
        kode_produk: product.kode_produk,
        qty: item.qty,
        unit_price:
          body.type === 'jual'
            ? (item.harga_jual ?? item.harga_beli ?? item.price ?? 0)
            : (item.harga_beli ?? item.harga_jual ?? item.price ?? 0),
        subtotal: item.subtotal,
      });
    }

    const remaining = Math.max(0, body.total - resolvedPaid);
    const kembalian = Math.max(0, resolvedPaid - body.total);
    const resolvedStatus =
      remaining <= 0
        ? 'LUNAS'
        : body.type === 'jual'
          ? 'PIUTANG'
          : 'HUTANG';
    const invoiceNumber =
      body.type === 'jual'
        ? await generateNextSaleInvoiceNumber(dateCode, session)
        : await generateNextPurchaseInvoiceNumber(dateCode, session);

    const [transaction] =
      body.type === 'jual'
        ? await SaleTransaction.create(
            [
              {
                type_trx: (body.type || '').toUpperCase(),
                no_faktur_jual: invoiceNumber,
                kode_customer: resolvedKodeCustomer,
                nama_customer: resolvedNamaCustomer,
                no_hp: resolvedNoHp,
                alamat: resolvedAlamat,
                items: normalizedItems.map((item) => ({
                  kode_produk: item.kode_produk,
                  qty: item.qty,
                  harga_jual: item.unit_price,
                  subtotal: item.subtotal,
                })),
                total: body.total,
                dibayar: resolvedPaid,
                kembalian,
                status: resolvedStatus,
                created_date: createdDate,
              },
            ],
            { session }
          )
        : await PurchaseTransaction.create(
            [
              {
                type_trx: (body.type || '').toUpperCase(),
                no_faktur_beli: invoiceNumber,
                kode_customer: resolvedKodeCustomer,
                nama_customer: resolvedNamaCustomer,
                no_hp: resolvedNoHp,
                alamat: resolvedAlamat,
                items: normalizedItems.map((item) => ({
                  kode_produk: item.kode_produk,
                  qty: item.qty,
                  harga_beli: item.unit_price,
                  subtotal: item.subtotal,
                })),
                total: body.total,
                dibayar: resolvedPaid,
                kembalian,
                status: resolvedStatus,
                created_date: createdDate,
              },
            ],
            { session }
          );

    if (body.type === 'jual' && remaining > 0) {
      await Debt.create(
        [
          {
            kode_customer: resolvedKodeCustomer,
            nama_customer: resolvedNamaCustomer,
            no_faktur_jual: invoiceNumber,
            total: body.total,
            dibayar: resolvedPaid,
            sisa: remaining,
            created_date: createdDate,
          },
        ],
        { session }
      );
    }

    if (body.type === 'beli' && remaining > 0) {
      await Payable.create(
        [
          {
            kode_customer: resolvedKodeCustomer,
            nama_customer: resolvedNamaCustomer,
            no_faktur_beli: invoiceNumber,
            total: body.total,
            dibayar: resolvedPaid,
            sisa: remaining,
            created_date: createdDate,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    return transaction;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
