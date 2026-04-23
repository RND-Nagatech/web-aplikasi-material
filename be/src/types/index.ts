import { Request } from 'express';
import { Types } from 'mongoose';

export interface AuthPayload {
  id: string;
  email: string;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  nama_customer?: string;
  no_hp?: string;
  alamat?: string;
  no_faktur?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginBody {
  email?: string;
  username?: string;
  password: string;
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

export interface CreateProductBody {
  nama_produk: string;
  stock_on_hand: number;
  harga_grosir: number;
  harga_ecer: number;
  restore_existing?: boolean;
}

export interface UpdateProductBody {
  nama_produk?: string;
  stock_on_hand?: number;
  harga_grosir?: number;
  harga_ecer?: number;
}

export interface CreateCustomerBody {
  nama_customer: string;
  no_hp?: string;
  alamat?: string;
  restore_existing?: boolean;
}

export interface UpdateCustomerBody {
  nama_customer?: string;
  no_hp?: string;
  alamat?: string;
}

export interface CreateStoreBody {
  nama_toko: string;
  no_hp: string;
  alamat: string;
}

export interface UpdateStoreBody {
  nama_toko?: string;
  no_hp?: string;
  alamat?: string;
}

export interface TransactionItem {
  product: Types.ObjectId | string;
  qty: number;
  price?: number;
  harga_jual?: number;
  harga_beli?: number;
  subtotal: number;
}

export interface CreateTransactionBody {
  type: 'jual' | 'beli';
  customer?: Types.ObjectId | string;
  nama_customer?: string;
  no_hp?: string;
  alamat?: string;
  items: TransactionItem[];
  total: number;
  paid?: number;
  dibayar?: number;
  status?: 'LUNAS' | 'UTANG' | 'HUTANG' | 'PIUTANG';
}

export interface DebtPaymentBody {
  debt_id: string;
  amount: number;
}

export interface PayablePaymentBody {
  payable_id: string;
  amount: number;
}

export interface DashboardSummary {
  totalProducts: number;
  totalTransactions: number;
  totalOutstandingDebts: number;
  totalOutstandingPayables: number;
  trend: {
    period_days: 7 | 30;
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
      no_faktur: string;
      tanggal_transaksi: string;
      tanggal_jatuh_tempo: string;
      nama_customer: string;
      no_hp: string;
      alamat: string;
      total: number;
      dibayar: number;
      sisa: number;
    }>;
    hutang: Array<{
      id: string;
      no_faktur: string;
      tanggal_transaksi: string;
      tanggal_jatuh_tempo: string;
      nama_customer: string;
      no_hp: string;
      alamat: string;
      total: number;
      dibayar: number;
      sisa: number;
    }>;
  };
}
