import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { Product, Store, Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/format";

export interface NotaItem {
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

type PdfWithGState = jsPDF & {
  setGState?: (gState: unknown) => void;
  GState?: new (options: { opacity: number }) => unknown;
};

export const loadImageAsDataUrl = (src: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

const createQrDataUrl = async (value: string): Promise<string | null> => {
  const sanitized = value.trim();
  if (!sanitized || sanitized === "-") return null;
  try {
    return await QRCode.toDataURL(sanitized, {
      margin: 0,
      width: 220,
      errorCorrectionLevel: "M",
    });
  } catch {
    return null;
  }
};

const chunkItems = <T,>(list: T[], size: number): T[][] => {
  if (size <= 0) return [list];
  const chunks: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks.length ? chunks : [[]];
};

const drawNotaSection = (
  doc: jsPDF,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    store?: Store;
    logoDataUrl: string | null;
    statusIconDataUrl: string | null;
    qrDataUrl: string | null;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    invoiceNumber: string;
    transactionDate: string;
    items: NotaItem[];
    total: number;
  },
) => {
  const {
    x, y, width, height, store, logoDataUrl, statusIconDataUrl, qrDataUrl, customerName, customerPhone, customerAddress,
    invoiceNumber, transactionDate, items, total,
  } = options;

  const pad = 10;
  const contentX = x + pad;
  const contentY = y + pad;
  const contentW = width - pad * 2;
  const sectionBottom = y + height;
  const rightX = x + width - pad;

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.6);
  doc.rect(x, y, width, height);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text((store?.nama_toko ?? "-").toUpperCase(), contentX, contentY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Alamat: ${(store?.alamat ?? "-").toUpperCase()}`, contentX, contentY + 14);
  doc.text(`No HP : ${store?.no_hp ?? "-"}`, contentX, contentY + 22);
  doc.text(`No Nota: ${invoiceNumber || "-"}`, contentX, contentY + 30);
  doc.text(`Tanggal: ${transactionDate}`, contentX, contentY + 38);

  if (logoDataUrl) {
    try {
      const imageProps = doc.getImageProperties(logoDataUrl);
      const targetWidth = 44;
      const targetHeight = targetWidth * (imageProps.height / imageProps.width);
      doc.addImage(logoDataUrl, "PNG", rightX - targetWidth, contentY, targetWidth, targetHeight);
    } catch {
      // ignore logo failures to keep nota generation robust
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Customer", rightX - 160, contentY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Nama  : ${customerName || "-"}`, rightX - 160, contentY + 14);
  doc.text(`No HP : ${customerPhone || "-"}`, rightX - 160, contentY + 22);
  doc.text(`Alamat: ${customerAddress || "-"}`, rightX - 160, contentY + 30, { maxWidth: 155 });

  const tableTop = contentY + 48;
  const tableBottom = sectionBottom - 40;
  const tableHeight = Math.max(56, tableBottom - tableTop);
  const rowCount = 8;
  const rowH = tableHeight / rowCount;
  const colNo = 24;
  const colProduct = 126;
  const colPrice = 66;
  const colQty = 40;
  const colTotal = contentW - (colNo + colProduct + colPrice + colQty);

  const colX = [
    contentX,
    contentX + colNo,
    contentX + colNo + colProduct,
    contentX + colNo + colProduct + colPrice,
    contentX + colNo + colProduct + colPrice + colQty,
    contentX + colNo + colProduct + colPrice + colQty + colTotal,
  ];

  doc.setLineWidth(0.5);
  doc.rect(contentX, tableTop, contentW, tableHeight);
  const grandRowTop = tableTop + (rowCount - 1) * rowH;
  for (let i = 1; i < colX.length - 1; i += 1) {
    if (i === 4) {
      doc.line(colX[i], tableTop, colX[i], tableTop + tableHeight);
      continue;
    }
    doc.line(colX[i], tableTop, colX[i], grandRowTop);
  }
  for (let r = 1; r < rowCount; r += 1) {
    const yLine = tableTop + r * rowH;
    doc.line(contentX, yLine, contentX + contentW, yLine);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("NO", colX[0] + colNo / 2, tableTop + rowH / 2 + 3, { align: "center" });
  doc.text("JENIS BARANG", colX[1] + 3, tableTop + rowH / 2 + 3);
  doc.text("HARGA", colX[2] + colPrice / 2, tableTop + rowH / 2 + 3, { align: "center" });
  doc.text("QTY", colX[3] + colQty / 2, tableTop + rowH / 2 + 3, { align: "center" });
  doc.text("JUMLAH", colX[4] + colTotal / 2, tableTop + rowH / 2 + 3, { align: "center" });

  const sixRows = [...items];
  while (sixRows.length < 6) sixRows.push({ productName: "", qty: 0, unitPrice: 0, subtotal: 0 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  sixRows.forEach((item, idx) => {
    const rowY = tableTop + (idx + 1) * rowH + rowH / 2 + 3;
    doc.text(item.productName ? String(idx + 1) : "", colX[0] + colNo / 2, rowY, { align: "center" });
    doc.text(item.productName || "", colX[1] + 3, rowY, { maxWidth: colProduct - 6 });
    doc.text(item.productName ? formatCurrency(item.unitPrice) : "", colX[3] - 4, rowY, { align: "right" });
    doc.text(item.productName ? String(item.qty) : "", colX[3] + colQty / 2, rowY, { align: "center" });
    doc.text(item.productName ? formatCurrency(item.subtotal) : "", colX[5] - 4, rowY, { align: "right" });
  });

  if (statusIconDataUrl) {
    try {
      const wmProps = doc.getImageProperties(statusIconDataUrl);
      const wmWidth = 112;
      const wmHeight = wmWidth * (wmProps.height / wmProps.width);
      const wmX = x + (width - wmWidth) / 2;
      const wmY = y + (height - wmHeight) / 2;
      const pdfWithState = doc as PdfWithGState;
      if (typeof pdfWithState.setGState === "function" && typeof pdfWithState.GState === "function") {
        pdfWithState.setGState(new pdfWithState.GState({ opacity: 0.22 }));
      }
      doc.addImage(statusIconDataUrl, "PNG", wmX, wmY, wmWidth, wmHeight);
      if (typeof pdfWithState.setGState === "function" && typeof pdfWithState.GState === "function") {
        pdfWithState.setGState(new pdfWithState.GState({ opacity: 1 }));
      }
    } catch {
      // ignore watermark failures to keep nota generation robust
    }
  }

  const grandY = tableTop + (rowCount - 1) * rowH + rowH / 2 + 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const grandLabelCenterX = (colX[0] + colX[4]) / 2;
  doc.text("GRAND TOTAL", grandLabelCenterX, grandY, { align: "center" });
  doc.text(formatCurrency(total), colX[5] - 4, grandY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const noteY = sectionBottom - 26;
  doc.rect(contentX, noteY, 120, 18);
  doc.text("Barang yang sudah dibeli", contentX + 60, sectionBottom - 18, { align: "center" });
  doc.text("tidak dapat ditukar/diuangkan", contentX + 60, sectionBottom - 11, { align: "center" });

  if (qrDataUrl) {
    try {
      const qrX = contentX + 126;
      const qrY = sectionBottom - 37;
      const qrSize = 30;
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch {
      // ignore QR failures to keep nota generation robust
    }
  }

  const signatureCenterX = rightX - 90;
  doc.setFontSize(10);
  doc.text("Hormat Kami,", signatureCenterX, sectionBottom - 32, { align: "center" });
  doc.text("(.....................................)", signatureCenterX, sectionBottom - 4, { align: "center" });
};

export const downloadNotaPdf = async (params: {
  store?: Store;
  logoDataUrl: string | null;
  statusIconDataUrl: string | null;
  transaction: Transaction;
  items: NotaItem[];
}) => {
  const { store, logoDataUrl, statusIconDataUrl, transaction, items } = params;
  const chunks = chunkItems(items, 6);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const sectionsPerPage = 3;
  const sectionGap = 10;
  const sectionH = (pageH - margin * 2 - sectionGap * (sectionsPerPage - 1)) / sectionsPerPage;
  const customerPhone = transaction.customerPhone?.trim() || "-";
  const customerAddress = transaction.customerAddress?.trim() || "-";
  const customerName = transaction.customerName?.trim() || "-";
  const transactionDate = formatDate(transaction.createdAt);
  const invoiceNumber = transaction.invoiceNumber ?? "-";
  const qrDataUrl = await createQrDataUrl(invoiceNumber);

  chunks.forEach((chunk, idx) => {
    if (idx > 0 && idx % sectionsPerPage === 0) {
      doc.addPage();
    }
    const positionInPage = idx % sectionsPerPage;
    const y = margin + positionInPage * (sectionH + sectionGap);
    drawNotaSection(doc, {
      x: margin,
      y,
      width: pageW - margin * 2,
      height: sectionH,
      store,
      logoDataUrl,
      statusIconDataUrl,
      qrDataUrl,
      customerName,
      customerPhone,
      customerAddress,
      invoiceNumber,
      transactionDate,
      items: chunk,
      total: transaction.total,
    });
  });

  const fileName = `NOTA-${(transaction.invoiceNumber ?? "TRANSAKSI").replace(/\s+/g, "-")}.pdf`;
  doc.save(fileName);
};

export const mapNotaItemsFromTransaction = (transaction: Transaction, products: Product[]): NotaItem[] =>
  transaction.items.map((it, idx) => ({
    productName:
      it.productName
      ?? products.find((p) => p.id === it.productId || p.kodeProduk === it.productId)?.name
      ?? it.productId
      ?? `Item ${idx + 1}`,
    qty: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice) || 0,
    subtotal: Number(it.subtotal) || ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)),
  }));
