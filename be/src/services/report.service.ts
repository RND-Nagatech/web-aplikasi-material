import { FilterQuery } from 'mongoose';
import { Debt } from '../models/Debt';
import { Payable } from '../models/Payable';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { SaleTransaction } from '../models/SaleTransaction';
import { PurchaseTransaction } from '../models/PurchaseTransaction';
import { formatDateOnlyGmt7, getGmt7DateRangeStrings } from '../utils/date';
import { ensureCurrentCashDaily, getDailyCashByRange, getSaldoBeforeDate } from './cash-daily.service';

const buildCreatedDateFilter = (
  dateFrom?: Date,
  dateTo?: Date
): { created_date_ts?: Record<string, Date>; created_date?: Record<string, string> } | undefined => {
  const { from, to } = getGmt7DateRangeStrings(dateFrom, dateTo);
  if (!from && !to && !dateFrom && !dateTo) return undefined;

  const rangeTs: Record<string, Date> = {};
  if (dateFrom) rangeTs.$gte = dateFrom;
  if (dateTo) rangeTs.$lte = dateTo;

  const rangeString: Record<string, string> = {};
  if (from) rangeString.$gte = from;
  if (to) rangeString.$lte = to;

  return {
    created_date_ts: Object.keys(rangeTs).length ? rangeTs : undefined,
    created_date: Object.keys(rangeString).length ? rangeString : undefined,
  };
};

const attachCustomerName = async <T extends { kode_customer: string; nama_customer?: string }>(
  items: T[]
): Promise<Array<T & { customer_name: string }>> => {
  const uniqueCodes = [...new Set(items.map((item) => item.kode_customer).filter(Boolean))];
  if (!uniqueCodes.length) {
    return items.map((item) => ({ ...item, customer_name: item.nama_customer ?? '-' }));
  }

  const customers = await Customer.find({ kode_customer: { $in: uniqueCodes } })
    .select('kode_customer nama_customer')
    .lean();

  const nameByCode = new Map(customers.map((customer) => [customer.kode_customer, customer.nama_customer]));
  return items.map((item) => ({
    ...item,
    customer_name: nameByCode.get(item.kode_customer) ?? item.nama_customer ?? '-',
  }));
};

export const getStockReport = async (_dateFrom?: Date, _dateTo?: Date) => {
  const items = await Product.find({ is_active: true }).sort({ nama_produk: 1 }).lean();

  const summary = items.reduce(
    (acc, item) => {
      acc.totalItems += 1;
      acc.totalStock += item.stock_on_hand;
      acc.totalStockValueWholesale += item.stock_on_hand * item.harga_grosir;
      acc.totalStockValueRetail += item.stock_on_hand * item.harga_ecer;
      return acc;
    },
    {
      totalItems: 0,
      totalStock: 0,
      totalStockValueWholesale: 0,
      totalStockValueRetail: 0,
    }
  );

  return { items, summary };
};

export const getDebtReport = async (dateFrom?: Date, dateTo?: Date, noFaktur?: string) => {
  const where: FilterQuery<unknown> = {};
  const createdDateRange = buildCreatedDateFilter(dateFrom, dateTo);
  if (createdDateRange) {
    where.$or = [
      ...(createdDateRange.created_date_ts ? [{ created_date_ts: createdDateRange.created_date_ts }] : []),
      ...(createdDateRange.created_date ? [{ created_date: createdDateRange.created_date }] : []),
    ];
  }
  if (noFaktur?.trim()) {
    const escaped = noFaktur.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    where.no_faktur_jual = { $regex: `^${escaped}`, $options: 'i' };
  }

  const rawItems = await Debt.find(where).sort({ created_date_ts: -1, created_date: -1 }).lean();
  const items = await attachCustomerName(rawItems);

  const summary = items.reduce(
    (acc, item) => {
      acc.totalRecords += 1;
      acc.totalDebt += item.total;
      acc.totalPaid += item.dibayar;
      acc.totalOutstanding += item.sisa;
      return acc;
    },
    {
      totalRecords: 0,
      totalDebt: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    }
  );

  return { items, summary };
};

export const getPayableReport = async (dateFrom?: Date, dateTo?: Date, noFaktur?: string) => {
  const where: FilterQuery<unknown> = {};
  const createdDateRange = buildCreatedDateFilter(dateFrom, dateTo);
  if (createdDateRange) {
    where.$or = [
      ...(createdDateRange.created_date_ts ? [{ created_date_ts: createdDateRange.created_date_ts }] : []),
      ...(createdDateRange.created_date ? [{ created_date: createdDateRange.created_date }] : []),
    ];
  }
  if (noFaktur?.trim()) {
    const escaped = noFaktur.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    where.no_faktur_beli = { $regex: `^${escaped}`, $options: 'i' };
  }

  const rawItems = await Payable.find(where).sort({ created_date_ts: -1, created_date: -1 }).lean();
  const items = await attachCustomerName(rawItems);

  const summary = items.reduce(
    (acc, item) => {
      acc.totalRecords += 1;
      acc.totalPayable += item.total;
      acc.totalPaid += item.dibayar;
      acc.totalOutstanding += item.sisa;
      return acc;
    },
    {
      totalRecords: 0,
      totalPayable: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    }
  );

  return { items, summary };
};

type FinanceReportType = 'rekap' | 'detail';

type FinanceBaseItem = {
  kategori: 'Penjualan' | 'Pembelian' | 'KEMBALIAN';
  deskripsi: string;
  uang_masuk: number;
  uang_keluar: number;
  nominal: number;
  created_date: string;
  created_date_ts?: Date;
};

const formatNominalId = (value: number): string => new Intl.NumberFormat('id-ID').format(value);

export const getFinanceReport = async (
  type: FinanceReportType,
  dateFrom?: Date,
  dateTo?: Date,
  search?: string
) => {
  await ensureCurrentCashDaily();

  const fromDateOnly = dateFrom ? formatDateOnlyGmt7(dateFrom) : undefined;
  const toDateOnly = dateTo ? formatDateOnlyGmt7(dateTo) : undefined;
  const dailyRows = await getDailyCashByRange(fromDateOnly, toDateOnly);

  const saldoAwal = fromDateOnly ? await getSaldoBeforeDate(fromDateOnly) : 0;
  const totalUangMasuk = dailyRows.reduce((acc, row) => acc + (row.uang_masuk ?? 0), 0);
  const totalUangKeluar = dailyRows.reduce((acc, row) => acc + (row.uang_keluar ?? 0), 0);
  const saldoAkhir = saldoAwal + totalUangMasuk - totalUangKeluar;

  const summary = {
    saldo_awal: saldoAwal,
    total_uang_masuk: totalUangMasuk,
    total_uang_keluar: totalUangKeluar,
    saldo_akhir: saldoAkhir,
  };

  const rangedFilter = buildCreatedDateFilter(dateFrom, dateTo);
  const whereSale: FilterQuery<unknown> = rangedFilter
    ? {
        $or: [
          ...(rangedFilter.created_date_ts ? [{ created_date_ts: rangedFilter.created_date_ts }] : []),
          ...(rangedFilter.created_date ? [{ created_date: rangedFilter.created_date }] : []),
        ],
      }
    : {};
  const wherePurchase: FilterQuery<unknown> = rangedFilter
    ? {
        $or: [
          ...(rangedFilter.created_date_ts ? [{ created_date_ts: rangedFilter.created_date_ts }] : []),
          ...(rangedFilter.created_date ? [{ created_date: rangedFilter.created_date }] : []),
        ],
      }
    : {};

  const [salesInRange, purchasesInRange] = await Promise.all([
    SaleTransaction.find(whereSale).sort({ created_date_ts: 1, created_date: 1 }).lean(),
    PurchaseTransaction.find(wherePurchase).sort({ created_date_ts: 1, created_date: 1 }).lean(),
  ]);

  let ranged: FinanceBaseItem[] = [
    ...salesInRange.map((item) => ({
      kategori: 'Penjualan' as const,
      deskripsi: `${item.no_faktur_jual} (Rp ${formatNominalId(item.total)})`,
      uang_masuk: item.total,
      uang_keluar: 0,
      nominal: item.total,
      created_date: item.created_date,
      created_date_ts: item.created_date_ts,
    })),
    ...salesInRange
      .filter((item) => (item.kembalian ?? 0) > 0)
      .map((item) => ({
        kategori: 'KEMBALIAN' as const,
        deskripsi: `${item.no_faktur_jual} (Rp ${formatNominalId(item.kembalian ?? 0)})`,
        uang_masuk: 0,
        uang_keluar: item.kembalian ?? 0,
        nominal: item.kembalian ?? 0,
        created_date: item.created_date,
        created_date_ts: item.created_date_ts,
      })),
    ...purchasesInRange.map((item) => ({
      kategori: 'Pembelian' as const,
      deskripsi: `${item.no_faktur_beli} (Rp ${formatNominalId(item.total)})`,
      uang_masuk: 0,
      uang_keluar: item.total,
      nominal: item.total,
      created_date: item.created_date,
      created_date_ts: item.created_date_ts,
    })),
    ...purchasesInRange
      .filter((item) => (item.kembalian ?? 0) > 0)
      .map((item) => ({
        kategori: 'KEMBALIAN' as const,
        deskripsi: `${item.no_faktur_beli} (Rp ${formatNominalId(item.kembalian ?? 0)})`,
        uang_masuk: 0,
        uang_keluar: item.kembalian ?? 0,
        nominal: item.kembalian ?? 0,
        created_date: item.created_date,
        created_date_ts: item.created_date_ts,
      })),
  ].sort((a, b) => {
    const aTime = a.created_date_ts?.getTime() ?? 0;
    const bTime = b.created_date_ts?.getTime() ?? 0;
    return aTime - bTime || a.created_date.localeCompare(b.created_date);
  });

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    ranged = ranged.filter((item) =>
      item.kategori.toLowerCase().includes(q) || item.deskripsi.toLowerCase().includes(q)
    );
  }

  if (type === 'rekap') {
    const rekap = ranged.reduce(
      (acc, item) => {
        const key = item.kategori;
        if (!acc[key]) {
          acc[key] = { masuk: 0, keluar: 0 };
        }
        acc[key].masuk += item.uang_masuk;
        acc[key].keluar += item.uang_keluar;
        return acc;
      },
      {} as Record<string, { masuk: number; keluar: number }>
    );

    const items = [
      { kategori: 'Penjualan', deskripsi: '-', uang_masuk: rekap.Penjualan?.masuk ?? 0, uang_keluar: 0, created_date: '-' },
      { kategori: 'Pembelian', deskripsi: '-', uang_masuk: 0, uang_keluar: rekap.Pembelian?.keluar ?? 0, created_date: '-' },
      { kategori: 'KEMBALIAN', deskripsi: '-', uang_masuk: 0, uang_keluar: rekap.KEMBALIAN?.keluar ?? 0, created_date: '-' },
    ];

    return { type, items, summary };
  }

  const items = ranged.map((item) => ({
    kategori: item.kategori,
    deskripsi: item.deskripsi,
    uang_masuk: item.uang_masuk,
    uang_keluar: item.uang_keluar,
    created_date: item.created_date,
  }));

  return { type, items, summary };
};
