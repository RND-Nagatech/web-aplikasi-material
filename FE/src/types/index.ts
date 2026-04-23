export interface Product {
  id: string;
  kodeProduk?: string;
  name: string;
  stock: number;
  wholesalePrice: number;
  retailPrice: number;
  createdAt?: string;
}

export type ProductInput = Omit<Product, "id" | "createdAt">;

export interface Customer {
  id: string;
  kodeCustomer?: string;
  nama_customer: string;
  no_hp?: string;
  alamat?: string;
  is_active?: boolean;
  created_date?: string;
  edited_by?: string;
  edited_date?: string;
  deleted_by?: string;
  deleted_date?: string;
  createdAt?: string;
}

export type CustomerInput = Omit<Customer, "id" | "createdAt">;

export interface Store {
  id: string;
  kode_toko: string;
  nama_toko: string;
  no_hp: string;
  alamat: string;
  createdAt?: string;
  edited_by?: string;
  edited_date?: string;
}

export type StoreInput = Omit<Store, "id" | "kode_toko" | "createdAt" | "edited_by" | "edited_date">;

export type TransactionType = "sale" | "purchase";
export type PriceType = "wholesale" | "retail";

export interface TransactionItem {
  productId: string;
  productName?: string;
  quantity: number;
  priceType: PriceType;
  unitPrice: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  invoiceNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: TransactionItem[];
  total: number;
  paid: number;
  change: number;
  createdAt: string;
}

export interface TransactionInput {
  type: TransactionType;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: Omit<TransactionItem, "subtotal" | "productName">[];
  paid: number;
}

export interface Debt {
  id: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  transactionId: string;
  total: number;
  paid: number;
  change?: number;
  remaining: number;
  createdAt: string;
}

export interface DebtPaymentInput {
  debtId: string;
  amount: number;
}

export interface Payable {
  id: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  transactionId: string;
  total: number;
  paid: number;
  change?: number;
  remaining: number;
  createdAt: string;
}

export interface PayablePaymentInput {
  payableId: string;
  amount: number;
}

export interface DashboardSummary {
  totalProducts: number;
  totalTransactions: number;
  totalOutstandingDebts: number;
  totalOutstandingPayables: number;
  trend: {
    periodDays: 7 | 30;
    items: Array<{
      date: string;
      label: string;
      penjualan: number;
      pembelian: number;
    }>;
  };
  due: {
    piutang: Array<{
      id: string;
      noFaktur: string;
      tanggalTransaksi: string;
      tanggalJatuhTempo: string;
      namaCustomer: string;
      noHp: string;
      alamat: string;
      total: number;
      dibayar: number;
      sisa: number;
    }>;
    hutang: Array<{
      id: string;
      noFaktur: string;
      tanggalTransaksi: string;
      tanggalJatuhTempo: string;
      namaCustomer: string;
      noHp: string;
      alamat: string;
      total: number;
      dibayar: number;
      sisa: number;
    }>;
  };
}

export interface StockReportItem {
  id: string;
  name: string;
  stock: number;
  wholesalePrice: number;
  retailPrice: number;
}

export interface StockReportSummary {
  totalItems: number;
  totalStock: number;
  totalStockValueWholesale: number;
  totalStockValueRetail: number;
}

export interface StockReport {
  items: StockReportItem[];
  summary: StockReportSummary;
}

export interface DebtReportSummary {
  totalRecords: number;
  totalDebt: number;
  totalPaid: number;
  totalOutstanding: number;
}

export interface DebtReport {
  items: Debt[];
  summary: DebtReportSummary;
}

export interface PayableReportSummary {
  totalRecords: number;
  totalPayable: number;
  totalPaid: number;
  totalOutstanding: number;
}

export interface PayableReport {
  items: Payable[];
  summary: PayableReportSummary;
}

export type FinanceReportType = "rekap" | "detail";

export interface FinanceReportItem {
  kategori: string;
  deskripsi: string;
  uangMasuk: number;
  uangKeluar: number;
  createdDate?: string;
}

export interface FinanceReportSummary {
  saldoAwal: number;
  totalUangMasuk: number;
  totalUangKeluar: number;
  saldoAkhir: number;
}

export interface FinanceReport {
  type: FinanceReportType;
  items: FinanceReportItem[];
  summary: FinanceReportSummary;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface ApiError {
  message: string;
  status?: number;
}
