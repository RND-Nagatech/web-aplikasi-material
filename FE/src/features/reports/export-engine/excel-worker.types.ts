export type StockExcelItem = {
  name: string;
  stock: number;
  wholesalePrice: number;
  retailPrice: number;
};

export type DebtExcelItem = {
  transactionId?: string;
  customerName?: string;
  customerCode?: string;
  createdAt: string;
  total: number;
  paid: number;
  remaining: number;
};

export type PayableExcelItem = {
  transactionId?: string;
  customerName?: string;
  customerCode?: string;
  createdAt: string;
  total: number;
  paid: number;
  remaining: number;
};

export type FinanceExcelItem = {
  kategori: string;
  deskripsi?: string;
  uangMasuk: number;
  uangKeluar: number;
};

export type FinanceExcelSummary = {
  saldoAwal: number;
  totalUangMasuk: number;
  totalUangKeluar: number;
  saldoAkhir: number;
};

export type BuildExcelPayload =
  | {
      kind: "stock";
      fileName: string;
      title: string;
      dateFrom: string;
      dateTo: string;
      storeName?: string;
      items: StockExcelItem[];
    }
  | {
      kind: "debt";
      fileName: string;
      title: string;
      dateFrom: string;
      dateTo: string;
      storeName?: string;
      items: DebtExcelItem[];
    }
  | {
      kind: "payable";
      fileName: string;
      title: string;
      dateFrom: string;
      dateTo: string;
      storeName?: string;
      items: PayableExcelItem[];
    }
  | {
      kind: "finance";
      fileName: string;
      title: string;
      dateFrom: string;
      dateTo: string;
      storeName?: string;
      storeAddress?: string;
      reportType: "rekap" | "detail";
      items: FinanceExcelItem[];
      summary: FinanceExcelSummary;
    };

export type WorkerExcelSuccess = {
  ok: true;
  fileName: string;
  buffer: ArrayBuffer;
};

export type WorkerExcelError = {
  ok: false;
  error: string;
};

export type WorkerExcelResponse = WorkerExcelSuccess | WorkerExcelError;
