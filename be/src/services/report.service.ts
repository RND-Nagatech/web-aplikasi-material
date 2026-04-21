import { Debt } from '../models/Debt';
import { Payable } from '../models/Payable';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { SaleTransaction } from '../models/SaleTransaction';
import { PurchaseTransaction } from '../models/PurchaseTransaction';

const parseCreatedDateGmt7 = (value?: string, fallback?: Date): Date | null => {
  if (!value) return null;
  const normalized = value.replace(' GMT+7', '+07:00').replace(' ', 'T');
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return fallback ?? null;
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

export const getStockReport = async (dateFrom?: Date, dateTo?: Date) => {
  const allActive = await Product.find({ is_active: false }).sort({ nama_produk: 1 });

  const items = allActive.filter((item) => {
    const legacyCreatedAt = (item as unknown as { createdAt?: Date }).createdAt;
    const createdAt = parseCreatedDateGmt7(item.created_date, legacyCreatedAt);
    if (!createdAt) return !dateFrom && !dateTo;
    if (dateFrom && createdAt < dateFrom) return false;
    if (dateTo && createdAt > dateTo) return false;
    return true;
  });

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

export const getDebtReport = async (dateFrom?: Date, dateTo?: Date) => {
  const allItems = await Debt.find().sort({ created_date: -1 }).lean();
  const filteredItems = allItems.filter((item) => {
    const createdAt = parseCreatedDateGmt7(item.created_date);
    if (!createdAt) return !dateFrom && !dateTo;
    if (dateFrom && createdAt < dateFrom) return false;
    if (dateTo && createdAt > dateTo) return false;
    return true;
  });
  const items = await attachCustomerName(filteredItems);

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

export const getPayableReport = async (dateFrom?: Date, dateTo?: Date) => {
  const allItems = await Payable.find().sort({ created_date: -1 }).lean();
  const filteredItems = allItems.filter((item) => {
    const createdAt = parseCreatedDateGmt7(item.created_date);
    if (!createdAt) return !dateFrom && !dateTo;
    if (dateFrom && createdAt < dateFrom) return false;
    if (dateTo && createdAt > dateTo) return false;
    return true;
  });
  const items = await attachCustomerName(filteredItems);

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
  kategori: 'Penjualan' | 'Pembelian';
  deskripsi: string;
  uang_masuk: number;
  uang_keluar: number;
  nominal: number;
  created_date: string;
};

const formatNominalId = (value: number): string => new Intl.NumberFormat('id-ID').format(value);

export const getFinanceReport = async (
  type: FinanceReportType,
  dateFrom?: Date,
  dateTo?: Date,
  search?: string
) => {
  const [sales, purchases] = await Promise.all([
    SaleTransaction.find().sort({ created_date: 1 }).lean(),
    PurchaseTransaction.find().sort({ created_date: 1 }).lean(),
  ]);

  const allItems: FinanceBaseItem[] = [
    ...sales.map((item) => ({
      kategori: 'Penjualan' as const,
      deskripsi: `${item.no_faktur_jual} (Rp ${formatNominalId(item.total)})`,
      uang_masuk: item.total,
      uang_keluar: 0,
      nominal: item.total,
      created_date: item.created_date,
    })),
    ...purchases.map((item) => ({
      kategori: 'Pembelian' as const,
      deskripsi: `${item.no_faktur_beli} (Rp ${formatNominalId(item.total)})`,
      uang_masuk: 0,
      uang_keluar: item.total,
      nominal: item.total,
      created_date: item.created_date,
    })),
  ].sort((a, b) => {
    const aTime = parseCreatedDateGmt7(a.created_date)?.getTime() ?? 0;
    const bTime = parseCreatedDateGmt7(b.created_date)?.getTime() ?? 0;
    return aTime - bTime;
  });

  const saldoAwal = allItems
    .filter((item) => {
      const createdAt = parseCreatedDateGmt7(item.created_date);
      if (!createdAt || !dateFrom) return false;
      return createdAt < dateFrom;
    })
    .reduce((acc, item) => acc + item.uang_masuk - item.uang_keluar, 0);

  let ranged = allItems.filter((item) => {
    const createdAt = parseCreatedDateGmt7(item.created_date);
    if (!createdAt) return !dateFrom && !dateTo;
    if (dateFrom && createdAt < dateFrom) return false;
    if (dateTo && createdAt > dateTo) return false;
    return true;
  });

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    ranged = ranged.filter((item) =>
      item.kategori.toLowerCase().includes(q) || item.deskripsi.toLowerCase().includes(q)
    );
  }

  const totalUangMasuk = ranged.reduce((acc, item) => acc + item.uang_masuk, 0);
  const totalUangKeluar = ranged.reduce((acc, item) => acc + item.uang_keluar, 0);
  const saldoAkhir = saldoAwal + totalUangMasuk - totalUangKeluar;

  const summary = {
    saldo_awal: saldoAwal,
    total_uang_masuk: totalUangMasuk,
    total_uang_keluar: totalUangKeluar,
    saldo_akhir: saldoAkhir,
  };

  if (type === 'rekap') {
    const penjualanMasuk = ranged
      .filter((item) => item.kategori === 'Penjualan')
      .reduce((acc, item) => acc + item.uang_masuk, 0);
    const pembelianKeluar = ranged
      .filter((item) => item.kategori === 'Pembelian')
      .reduce((acc, item) => acc + item.uang_keluar, 0);

    const items = [
      {
        kategori: 'Penjualan',
        deskripsi: '-',
        uang_masuk: penjualanMasuk,
        uang_keluar: 0,
        created_date: '-',
      },
      {
        kategori: 'Pembelian',
        deskripsi: '-',
        uang_masuk: 0,
        uang_keluar: pembelianKeluar,
        created_date: '-',
      },
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
