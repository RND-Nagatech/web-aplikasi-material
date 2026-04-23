import { Debt } from '../models/Debt';
import { Payable } from '../models/Payable';
import { Product } from '../models/Product';
import { SaleTransaction } from '../models/SaleTransaction';
import { PurchaseTransaction } from '../models/PurchaseTransaction';
import { DashboardSummary } from '../types';
import { getGmt7DateRangeStrings, parseGmt7StringToDate } from '../utils/date';

const DUE_DAYS = 30;
const JAKARTA_TIMEZONE = 'Asia/Jakarta';

const formatJakartaDate = (date: Date): string => {
  const year = new Intl.DateTimeFormat('en-CA', { year: 'numeric', timeZone: JAKARTA_TIMEZONE }).format(date);
  const month = new Intl.DateTimeFormat('en-CA', { month: '2-digit', timeZone: JAKARTA_TIMEZONE }).format(date);
  const day = new Intl.DateTimeFormat('en-CA', { day: '2-digit', timeZone: JAKARTA_TIMEZONE }).format(date);
  return `${year}-${month}-${day}`;
};

const formatJakartaLabel = (date: Date): string =>
  new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', timeZone: JAKARTA_TIMEZONE }).format(date);

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const getDashboardSummary = async (periodDays: 7 | 30 = 7): Promise<DashboardSummary> => {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (periodDays - 1));
  const createdDateRange = getGmt7DateRangeStrings(start, today);
  const trendWhere =
    start && today
      ? {
          $or: [
            { created_date_ts: { $gte: start, $lte: today } },
            ...(createdDateRange.from && createdDateRange.to
              ? [{ created_date: { $gte: createdDateRange.from, $lte: createdDateRange.to } }]
              : []),
          ],
        }
      : {};

  const [totalProducts, totalSales, totalPurchases, outstandingDebtResult, outstandingPayableResult, sales, purchases, debts, payables] = await Promise.all([
    Product.countDocuments(),
    SaleTransaction.countDocuments(),
    PurchaseTransaction.countDocuments(),
    Debt.aggregate<{ totalOutstandingDebts: number }>([
      { $group: { _id: null, totalOutstandingDebts: { $sum: '$sisa' } } },
    ]),
    Payable.aggregate<{ totalOutstandingPayables: number }>([
      { $group: { _id: null, totalOutstandingPayables: { $sum: '$sisa' } } },
    ]),
    SaleTransaction.find(trendWhere).select('created_date created_date_ts total').lean(),
    PurchaseTransaction.find(trendWhere).select('created_date created_date_ts total').lean(),
    Debt.find({ sisa: { $gt: 0 } })
      .sort({ created_date_ts: -1, created_date: -1 })
      .select('kode_customer nama_customer no_faktur_jual total dibayar sisa created_date created_date_ts')
      .lean(),
    Payable.find({ sisa: { $gt: 0 } })
      .sort({ created_date_ts: -1, created_date: -1 })
      .select('kode_customer nama_customer no_faktur_beli total dibayar sisa created_date created_date_ts')
      .lean(),
  ]);

  const trendBucket = new Map<string, { date: string; label: string; penjualan: number; pembelian: number }>();
  for (let offset = 0; offset < periodDays; offset += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + offset);
    const key = formatJakartaDate(current);
    trendBucket.set(key, {
      date: key,
      label: formatJakartaLabel(current),
      penjualan: 0,
      pembelian: 0,
    });
  }

  sales.forEach((item) => {
    const createdAt = item.created_date_ts ?? parseGmt7StringToDate(item.created_date);
    if (!createdAt) return;
    const key = formatJakartaDate(createdAt);
    const bucket = trendBucket.get(key);
    if (!bucket) return;
    bucket.penjualan += item.total ?? 0;
  });

  purchases.forEach((item) => {
    const createdAt = item.created_date_ts ?? parseGmt7StringToDate(item.created_date);
    if (!createdAt) return;
    const key = formatJakartaDate(createdAt);
    const bucket = trendBucket.get(key);
    if (!bucket) return;
    bucket.pembelian += item.total ?? 0;
  });

  const debtInvoiceSet = [...new Set(debts.map((d) => d.no_faktur_jual).filter(Boolean))];
  const payableInvoiceSet = [...new Set(payables.map((p) => p.no_faktur_beli).filter(Boolean))];

  const [saleDetails, purchaseDetails] = await Promise.all([
    SaleTransaction.find({ no_faktur_jual: { $in: debtInvoiceSet } }).select('no_faktur_jual no_hp alamat').lean(),
    PurchaseTransaction.find({ no_faktur_beli: { $in: payableInvoiceSet } }).select('no_faktur_beli no_hp alamat').lean(),
  ]);

  const saleByInvoice = new Map(saleDetails.map((item) => [item.no_faktur_jual, item]));
  const purchaseByInvoice = new Map(purchaseDetails.map((item) => [item.no_faktur_beli, item]));

  const piutang = debts
    .map((item) => {
      const trxDate = item.created_date_ts ?? parseGmt7StringToDate(item.created_date);
      const dueDate = trxDate ? addDays(trxDate, DUE_DAYS) : null;
      const detail = saleByInvoice.get(item.no_faktur_jual);
      return {
        id: String(item._id),
        no_faktur: item.no_faktur_jual,
        tanggal_transaksi: item.created_date ?? '-',
        tanggal_jatuh_tempo: dueDate ? `${formatJakartaDate(dueDate)} GMT+7` : '-',
        nama_customer: item.nama_customer ?? '-',
        no_hp: detail?.no_hp ?? '-',
        alamat: detail?.alamat ?? '-',
        total: item.total ?? 0,
        dibayar: item.dibayar ?? 0,
        sisa: item.sisa ?? 0,
        dueSort: dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => a.dueSort - b.dueSort)
    .slice(0, 10)
    .map(({ dueSort, ...rest }) => rest);

  const hutang = payables
    .map((item) => {
      const trxDate = item.created_date_ts ?? parseGmt7StringToDate(item.created_date);
      const dueDate = trxDate ? addDays(trxDate, DUE_DAYS) : null;
      const detail = purchaseByInvoice.get(item.no_faktur_beli);
      return {
        id: String(item._id),
        no_faktur: item.no_faktur_beli,
        tanggal_transaksi: item.created_date ?? '-',
        tanggal_jatuh_tempo: dueDate ? `${formatJakartaDate(dueDate)} GMT+7` : '-',
        nama_customer: item.nama_customer ?? '-',
        no_hp: detail?.no_hp ?? '-',
        alamat: detail?.alamat ?? '-',
        total: item.total ?? 0,
        dibayar: item.dibayar ?? 0,
        sisa: item.sisa ?? 0,
        dueSort: dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => a.dueSort - b.dueSort)
    .slice(0, 10)
    .map(({ dueSort, ...rest }) => rest);

  return {
    totalProducts,
    totalTransactions: totalSales + totalPurchases,
    totalOutstandingDebts: outstandingDebtResult[0]?.totalOutstandingDebts ?? 0,
    totalOutstandingPayables: outstandingPayableResult[0]?.totalOutstandingPayables ?? 0,
    trend: {
      period_days: periodDays,
      items: Array.from(trendBucket.values()),
    },
    due: {
      piutang,
      hutang,
    },
  };
};
