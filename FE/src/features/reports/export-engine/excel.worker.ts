/// <reference lib="webworker" />
import ExcelJS from "exceljs";
import type { FillPattern } from "exceljs";
import type {
  BuildExcelPayload,
  WorkerExcelResponse,
  StockExcelItem,
  DebtExcelItem,
  PayableExcelItem,
  FinanceExcelItem,
} from "./excel-worker.types";

const EXCEL_BORDER = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
} as const;

const EXCEL_HEADER_FILL: FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE5E5E5" },
};

const EXCEL_TOTAL_FILL: FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF3F3F3" },
};

const NUM_FMT_RUPIAH = '"Rp" #,##0';
const NUM_FMT_NUMBER = "#,##0";

const applyBorderRow = (row: ExcelJS.Row): void => {
  row.eachCell((cell) => {
    cell.border = EXCEL_BORDER;
  });
};

const styleHeaderRow = (row: ExcelJS.Row, alignRightFromCol?: number): void => {
  row.eachCell((cell) => {
    cell.font = { bold: true };
    const colIndex = typeof cell.col === "number" ? cell.col : Number(cell.col);
    const isRight = typeof alignRightFromCol === "number" && Number.isFinite(colIndex) && colIndex >= alignRightFromCol;
    cell.alignment = { horizontal: isRight ? "right" : "center", vertical: "middle" };
    cell.fill = EXCEL_HEADER_FILL;
    cell.border = EXCEL_BORDER;
  });
};

const addStandardExcelHeader = (
  worksheet: ExcelJS.Worksheet,
  options: { title: string; dateFrom: string; dateTo: string; storeName?: string; totalCols: number }
): void => {
  const { title, dateFrom, dateTo, storeName, totalCols } = options;
  const endCol = worksheet.getColumn(totalCols).letter;
  worksheet.mergeCells(`A1:${endCol}1`);
  worksheet.getCell("A1").value = title;
  worksheet.getCell("A1").font = { bold: true, size: 16 };
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells(`A2:${endCol}2`);
  worksheet.getCell("A2").value = `Tanggal : ${dateFrom} s/d ${dateTo}`;
  worksheet.getCell("A2").font = { bold: true, size: 12 };
  worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells(`A3:${endCol}3`);
  worksheet.getCell("A3").value = `${storeName ?? "-"}`;
  worksheet.getCell("A3").font = { bold: true, size: 12 };
  worksheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };
};

const addPrintDateRow = (worksheet: ExcelJS.Worksheet, totalCols: number): void => {
  const endCol = worksheet.getColumn(totalCols).letter;
  const row = worksheet.addRow([`Print Date : ${new Date().toLocaleDateString("id-ID")}`]);
  worksheet.mergeCells(`A${row.number}:${endCol}${row.number}`);
  row.getCell(1).font = { italic: true, size: 10 };
  row.getCell(1).alignment = { horizontal: "left" };
};

const formatDate = (iso: string): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const createWorkbook = (sheetName: string): { workbook: ExcelJS.Workbook; worksheet: ExcelJS.Worksheet } => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  return { workbook, worksheet };
};

const buildStockWorkbook = (payload: Extract<BuildExcelPayload, { kind: "stock" }>): ExcelJS.Workbook => {
  const { workbook, worksheet } = createWorkbook(payload.title);
  worksheet.columns = [{ width: 8 }, { width: 34 }, { width: 14 }, { width: 18 }, { width: 18 }, { width: 22 }];
  addStandardExcelHeader(worksheet, {
    title: payload.title,
    dateFrom: payload.dateFrom,
    dateTo: payload.dateTo,
    storeName: payload.storeName,
    totalCols: 6,
  });

  const headerRow = worksheet.addRow(["No", "Produk", "Stok", "Harga Grosir", "Harga Eceran", "Nilai Stok (Grosir)"]);
  const headerRowNumber = headerRow.number;
  styleHeaderRow(headerRow);

  payload.items.forEach((item: StockExcelItem, index: number) => {
    const row = worksheet.addRow([index + 1, item.name, item.stock, item.wholesalePrice, item.retailPrice, item.stock * item.wholesalePrice]);
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(3).alignment = { horizontal: "right" };
    row.getCell(4).alignment = { horizontal: "right" };
    row.getCell(5).alignment = { horizontal: "right" };
    row.getCell(6).alignment = { horizontal: "right" };
    row.getCell(4).numFmt = NUM_FMT_RUPIAH;
    row.getCell(5).numFmt = NUM_FMT_RUPIAH;
    row.getCell(6).numFmt = NUM_FMT_RUPIAH;
    applyBorderRow(row);
  });

  const totalStok = payload.items.reduce((sum, item) => sum + item.stock, 0);
  const totalHargaGrosir = payload.items.reduce((sum, item) => sum + item.wholesalePrice, 0);
  const totalHargaEceran = payload.items.reduce((sum, item) => sum + item.retailPrice, 0);
  const totalNilaiStokGrosir = payload.items.reduce((sum, item) => sum + item.stock * item.wholesalePrice, 0);

  const grandTotalRow = worksheet.addRow([`GRAND TOTAL : ${payload.items.length}`, "", totalStok, totalHargaGrosir, totalHargaEceran, totalNilaiStokGrosir]);
  worksheet.mergeCells(`A${grandTotalRow.number}:B${grandTotalRow.number}`);
  grandTotalRow.getCell(1).font = { bold: true };
  grandTotalRow.getCell(1).alignment = { horizontal: "left" };
  grandTotalRow.getCell(3).alignment = { horizontal: "right" };
  grandTotalRow.getCell(4).alignment = { horizontal: "right" };
  grandTotalRow.getCell(5).alignment = { horizontal: "right" };
  grandTotalRow.getCell(6).alignment = { horizontal: "right" };
  grandTotalRow.getCell(3).font = { bold: true };
  grandTotalRow.getCell(4).font = { bold: true };
  grandTotalRow.getCell(5).font = { bold: true };
  grandTotalRow.getCell(6).font = { bold: true };
  grandTotalRow.getCell(4).numFmt = NUM_FMT_RUPIAH;
  grandTotalRow.getCell(5).numFmt = NUM_FMT_RUPIAH;
  grandTotalRow.getCell(6).numFmt = NUM_FMT_RUPIAH;
  grandTotalRow.eachCell((cell) => {
    cell.fill = EXCEL_TOTAL_FILL;
  });
  applyBorderRow(grandTotalRow);

  addPrintDateRow(worksheet, 6);
  for (let i = 1; i <= 3; i += 1) worksheet.getRow(i).height = 22;
  worksheet.getRow(headerRowNumber).height = 24;
  worksheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
  return workbook;
};

const buildDebtPayableWorkbook = (
  payload: Extract<BuildExcelPayload, { kind: "debt" | "payable" }>
): ExcelJS.Workbook => {
  const { workbook, worksheet } = createWorkbook(payload.title);
  worksheet.columns = [{ width: 8 }, { width: 22 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 22 }];
  addStandardExcelHeader(worksheet, {
    title: payload.title,
    dateFrom: payload.dateFrom,
    dateTo: payload.dateTo,
    storeName: payload.storeName,
    totalCols: 9,
  });

  const customerLabel = payload.kind === "payable" ? "Supplier" : "Pelanggan";
  const headerRow = worksheet.addRow(["No", "No Faktur", customerLabel, "Kode Customer", "Tanggal", "Total", "Dibayar", "Kembalian", "Sisa"]);
  const headerRowNumber = headerRow.number;
  styleHeaderRow(headerRow);
  payload.items.forEach((item: DebtExcelItem | PayableExcelItem, index: number) => {
    const row = worksheet.addRow([
      index + 1,
      item.transactionId ?? "-",
      item.customerName ?? "-",
      item.customerCode ?? "-",
      formatDate(item.createdAt),
      item.total ?? 0,
      item.paid ?? 0,
      item.change ?? 0,
      item.remaining ?? 0,
    ]);
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { horizontal: "right" };
    row.getCell(7).alignment = { horizontal: "right" };
    row.getCell(8).alignment = { horizontal: "right" };
    row.getCell(9).alignment = { horizontal: "right" };
    row.getCell(6).numFmt = NUM_FMT_RUPIAH;
    row.getCell(7).numFmt = NUM_FMT_RUPIAH;
    row.getCell(8).numFmt = NUM_FMT_RUPIAH;
    row.getCell(9).numFmt = NUM_FMT_RUPIAH;
    applyBorderRow(row);
  });

  const totalSum = payload.items.reduce((s, it) => s + (it.total ?? 0), 0);
  const paidSum = payload.items.reduce((s, it) => s + (it.paid ?? 0), 0);
  const changeSum = payload.items.reduce((s, it) => s + (it.change ?? 0), 0);
  const remainingSum = payload.items.reduce((s, it) => s + (it.remaining ?? 0), 0);
  const grandTotalRow = worksheet.addRow([`GRAND TOTAL : ${payload.items.length}`, "", "", "", "", totalSum, paidSum, changeSum, remainingSum]);
  worksheet.mergeCells(`A${grandTotalRow.number}:E${grandTotalRow.number}`);
  grandTotalRow.getCell(1).font = { bold: true };
  grandTotalRow.getCell(1).alignment = { horizontal: "left" };
  grandTotalRow.getCell(6).alignment = { horizontal: "right" };
  grandTotalRow.getCell(7).alignment = { horizontal: "right" };
  grandTotalRow.getCell(8).alignment = { horizontal: "right" };
  grandTotalRow.getCell(9).alignment = { horizontal: "right" };
  grandTotalRow.getCell(6).font = { bold: true };
  grandTotalRow.getCell(7).font = { bold: true };
  grandTotalRow.getCell(8).font = { bold: true };
  grandTotalRow.getCell(9).font = { bold: true };
  grandTotalRow.getCell(6).numFmt = NUM_FMT_RUPIAH;
  grandTotalRow.getCell(7).numFmt = NUM_FMT_RUPIAH;
  grandTotalRow.getCell(8).numFmt = NUM_FMT_RUPIAH;
  grandTotalRow.getCell(9).numFmt = NUM_FMT_RUPIAH;
  grandTotalRow.eachCell((cell) => {
    cell.fill = EXCEL_TOTAL_FILL;
  });
  applyBorderRow(grandTotalRow);

  addPrintDateRow(worksheet, 9);
  for (let i = 1; i <= 3; i += 1) worksheet.getRow(i).height = 22;
  worksheet.getRow(headerRowNumber).height = 24;
  worksheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
  return workbook;
};

const buildFinanceWorkbook = (payload: Extract<BuildExcelPayload, { kind: "finance" }>): ExcelJS.Workbook => {
  const { workbook, worksheet } = createWorkbook(payload.title);
  const totalCols = payload.reportType === "rekap" ? 3 : 4;
  worksheet.columns = payload.reportType === "rekap" ? [{ width: 46 }, { width: 30 }, { width: 32 }] : [{ width: 36 }, { width: 58 }, { width: 26 }, { width: 28 }];

  addStandardExcelHeader(worksheet, {
    title: payload.title,
    dateFrom: payload.dateFrom,
    dateTo: payload.dateTo,
    storeName: payload.storeName,
    totalCols,
  });

  worksheet.addRow([`Alamat : ${(payload.storeAddress ?? "-").toUpperCase()}`]);
  worksheet.mergeCells(`A4:${worksheet.getColumn(totalCols).letter}4`);
  worksheet.getCell("A4").font = { bold: true, size: 12 };
  worksheet.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };

  worksheet.addRow([]);
  const headers = payload.reportType === "rekap" ? ["Kategori", "Uang Masuk", "Uang Keluar"] : ["Kategori", "Deskripsi", "Uang Masuk", "Uang Keluar"];
  const headerRow = worksheet.addRow(headers);
  styleHeaderRow(headerRow, payload.reportType === "rekap" ? 2 : 3);
  headerRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  if (payload.reportType === "detail") headerRow.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
  headerRow.height = 30;

  let currentRow = headerRow.number + 1;
  payload.items.forEach((item: FinanceExcelItem) => {
    const row = worksheet.getRow(currentRow);
    const values = payload.reportType === "rekap"
      ? [item.kategori.toUpperCase(), item.uangMasuk, item.uangKeluar]
      : [item.kategori.toUpperCase(), item.deskripsi ?? "-", item.uangMasuk, item.uangKeluar];
    values.forEach((value, idx) => {
      row.getCell(idx + 1).value = value;
    });
    const moneyStartCol = payload.reportType === "rekap" ? 2 : 3;
    row.getCell(moneyStartCol).alignment = { horizontal: "right" };
    row.getCell(moneyStartCol + 1).alignment = { horizontal: "right" };
    row.getCell(moneyStartCol).numFmt = NUM_FMT_NUMBER;
    row.getCell(moneyStartCol + 1).numFmt = NUM_FMT_NUMBER;
    applyBorderRow(row);
    row.height = 30;
    currentRow += 1;
  });

  const totalRow = worksheet.getRow(currentRow);
  if (payload.reportType === "detail") worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  totalRow.getCell(1).value = "GRAND TOTAL";
  totalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
  if (payload.reportType === "rekap") {
    totalRow.getCell(2).value = payload.summary.totalUangMasuk;
    totalRow.getCell(3).value = payload.summary.totalUangKeluar;
    totalRow.getCell(2).numFmt = NUM_FMT_NUMBER;
    totalRow.getCell(3).numFmt = NUM_FMT_NUMBER;
    totalRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
    totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
  } else {
    totalRow.getCell(3).value = payload.summary.totalUangMasuk;
    totalRow.getCell(4).value = payload.summary.totalUangKeluar;
    totalRow.getCell(3).numFmt = NUM_FMT_NUMBER;
    totalRow.getCell(4).numFmt = NUM_FMT_NUMBER;
    totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
    totalRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
  }
  for (let col = 1; col <= totalCols; col += 1) {
    const cell = totalRow.getCell(col);
    cell.font = { bold: true, size: 12 };
    cell.fill = EXCEL_HEADER_FILL;
  }
  applyBorderRow(totalRow);
  totalRow.height = 30;

  const summaryStartRow = currentRow + 2;
  const summaryLabelCol = payload.reportType === "rekap" ? 2 : 3;
  const summaryValueCol = payload.reportType === "rekap" ? 3 : 4;
  const summaryRows = [
    ["Saldo Awal", payload.summary.saldoAwal],
    ["Uang Masuk", payload.summary.totalUangMasuk],
    ["Uang Keluar", payload.summary.totalUangKeluar],
    ["Saldo Akhir", payload.summary.saldoAkhir],
  ] as const;

  summaryRows.forEach(([label, value], idx) => {
    const rowNumber = summaryStartRow + idx;
    if (payload.reportType === "detail") worksheet.mergeCells(`A${rowNumber}:B${rowNumber}`);
    const row = worksheet.getRow(rowNumber);
    for (let col = 1; col <= totalCols; col += 1) {
      row.getCell(col).fill = EXCEL_HEADER_FILL;
    }
    row.getCell(summaryLabelCol).value = label;
    row.getCell(summaryValueCol).value = value;
    row.getCell(summaryLabelCol).font = { bold: true, size: 12 };
    row.getCell(summaryLabelCol).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(summaryValueCol).font = { bold: true, size: 12 };
    row.getCell(summaryValueCol).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(summaryValueCol).numFmt = NUM_FMT_NUMBER;
    applyBorderRow(row);
    row.height = 30;
  });

  addPrintDateRow(worksheet, totalCols);
  return workbook;
};

const toArrayBuffer = (bufferLike: unknown): ArrayBuffer => {
  if (bufferLike instanceof ArrayBuffer) return bufferLike.slice(0);
  if (typeof SharedArrayBuffer !== "undefined" && bufferLike instanceof SharedArrayBuffer) {
    return new Uint8Array(bufferLike).slice().buffer;
  }
  if (ArrayBuffer.isView(bufferLike)) {
    const view = bufferLike as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice().buffer;
  }
  throw new Error("Unsupported excel buffer type");
};

const buildWorkbook = (payload: BuildExcelPayload): ExcelJS.Workbook => {
  switch (payload.kind) {
    case "stock":
      return buildStockWorkbook(payload);
    case "debt":
    case "payable":
      return buildDebtPayableWorkbook(payload);
    case "finance":
      return buildFinanceWorkbook(payload);
    default:
      throw new Error("Unknown excel payload");
  }
};

self.onmessage = async (event: MessageEvent<BuildExcelPayload>): Promise<void> => {
  try {
    const payload = event.data;
    const workbook = buildWorkbook(payload);
    const rawBuffer = await workbook.xlsx.writeBuffer();
    const buffer = toArrayBuffer(rawBuffer);
    const response: WorkerExcelResponse = { ok: true, fileName: payload.fileName, buffer };
    self.postMessage(response, [buffer]);
  } catch (error) {
    const response: WorkerExcelResponse = {
      ok: false,
      error: error instanceof Error ? error.message : "Gagal membuat file Excel",
    };
    self.postMessage(response);
  }
};

export {};
