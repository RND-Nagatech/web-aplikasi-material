import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["sale", "purchase"]).optional(),
  customerId: z.string().optional(),
  customerName: z.string().trim().min(1, "Nama customer wajib diisi"),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  paid: z.coerce.number().min(0, "Harus ≥ 0"),
  items: z.array(
    z.object({
      productId: z.string().min(1, "Pilih produk"),
      quantity: z.coerce.number().int("Quantity harus bilangan bulat").min(1, "Maaf data quantity harus diisi"),
      priceType: z.enum(["wholesale", "retail"]),
      unitPrice: z.coerce.number().min(0),
    }),
  ).min(1, "Tambahkan minimal satu item"),
});

export type TransactionFormValues = z.input<typeof transactionSchema>;
export type TransactionFormOutput = z.output<typeof transactionSchema>;

export const typeLabel = (t: "sale" | "purchase") => (t === "sale" ? "Penjualan" : "Pembelian");
export const DEFAULT_PAGE_SIZE = 10;
