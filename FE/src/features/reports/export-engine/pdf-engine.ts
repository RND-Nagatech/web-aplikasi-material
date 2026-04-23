import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RowInput, UserOptions } from "jspdf-autotable";

export type ReportStore = {
  nama_toko?: string;
  alamat?: string;
  no_hp?: string;
};

type AutoTableDoc = jsPDF & {
  lastAutoTable?: {
    finalY?: number;
  };
};

export const createLandscapePdf = (): jsPDF =>
  new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

export const drawStandardReportHeader = (
  doc: jsPDF,
  options: {
    store?: ReportStore;
    title: string;
    dateFrom: string;
    dateTo: string;
  },
): void => {
  const { store, title, dateFrom, dateTo } = options;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text((store?.nama_toko ?? "-").toUpperCase(), 40, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Alamat : ${(store?.alamat ?? "-").toUpperCase()}`, 40, 70);
  doc.text(`No HP  : ${store?.no_hp ?? "-"}`, 40, 86);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, pageWidth - 40, 50, { align: "right" });
  doc.setFontSize(13);
  doc.text(`TANGGAL : ${dateFrom} s/d ${dateTo}`, pageWidth - 40, 72, { align: "right" });
};

export const renderReportTablePdf = (
  doc: jsPDF,
  options: {
    head: string[][];
    body: RowInput[];
    startY?: number;
    highlightLastBodyRow?: boolean;
    autoTableOptions?: Omit<UserOptions, "head" | "body" | "startY">;
  },
): void => {
  const { head, body, startY = 110, highlightLastBodyRow = true, autoTableOptions } = options;

  autoTable(doc, {
    startY,
    head,
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 6,
      lineColor: [180, 180, 180],
      lineWidth: 0.4,
      ...autoTableOptions?.styles,
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [20, 20, 20],
      fontStyle: "bold",
      ...autoTableOptions?.headStyles,
    },
    ...autoTableOptions,
    didParseCell: (data) => {
      if (highlightLastBodyRow && data.section === "body" && data.row.index === body.length - 1) {
        data.cell.styles.fillColor = [245, 245, 245];
        data.cell.styles.fontStyle = "bold";
      }
      autoTableOptions?.didParseCell?.(data);
    },
  });
};

export const drawPdfPrintDate = (doc: jsPDF, options?: { label?: string; y?: number }): void => {
  const label = options?.label ?? `Print Date : ${new Date().toLocaleDateString("id-ID")}`;
  const footerY = options?.y ?? (((doc as AutoTableDoc).lastAutoTable?.finalY ?? 120) + 20);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text(label, 40, footerY);
};

export const savePdfFile = (doc: jsPDF, fileName: string): void => {
  doc.save(fileName);
};
