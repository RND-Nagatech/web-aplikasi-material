import ExcelJS from "exceljs";
import { downloadExcelBuffer } from "./file-download";

export const EXCEL_BORDER = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
} as const;

export const EXCEL_HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE5E5E5" },
} as const;

export const EXCEL_TOTAL_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF3F3F3" },
} as const;

export const NUM_FMT_RUPIAH = '"Rp" #,##0';
export const NUM_FMT_NUMBER = "#,##0";

export const applyBorderRow = (row: ExcelJS.Row): void => {
  row.eachCell((cell) => {
    cell.border = EXCEL_BORDER;
  });
};

export const styleHeaderRow = (row: ExcelJS.Row, alignRightFromCol?: number): void => {
  row.eachCell((cell) => {
    cell.font = { bold: true };
    const colIndex = typeof cell.col === "number" ? cell.col : Number(cell.col);
    const isRight = typeof alignRightFromCol === "number" && Number.isFinite(colIndex) && colIndex >= alignRightFromCol;
    cell.alignment = { horizontal: isRight ? "right" : "center", vertical: "middle" };
    cell.fill = EXCEL_HEADER_FILL;
    cell.border = EXCEL_BORDER;
  });
};

export const createWorkbook = (sheetName: string): { workbook: ExcelJS.Workbook; worksheet: ExcelJS.Worksheet } => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  return { workbook, worksheet };
};

export const addStandardExcelHeader = (
  worksheet: ExcelJS.Worksheet,
  options: {
    title: string;
    dateFrom: string;
    dateTo: string;
    storeName?: string;
    totalCols: number;
  },
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

export const addExcelPrintDateRow = (worksheet: ExcelJS.Worksheet, rowNumber: number, totalCols: number): void => {
  const endCol = worksheet.getColumn(totalCols).letter;
  const row = worksheet.addRow([`Print Date : ${new Date().toLocaleDateString("id-ID")}`]);
  if (row.number !== rowNumber) {
    // keep function deterministic while preserving current worksheet flow
  }
  worksheet.mergeCells(`A${row.number}:${endCol}${row.number}`);
  row.getCell(1).font = { italic: true, size: 10 };
  row.getCell(1).alignment = { horizontal: "left" };
};

export const downloadWorkbook = async (workbook: ExcelJS.Workbook, fileName: string): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer();
  downloadExcelBuffer(buffer as ArrayBuffer, fileName);
};
