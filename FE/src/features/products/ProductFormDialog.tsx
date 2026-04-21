import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import type { Product, ProductInput } from "@/types";

const schema = z.object({
  name: z.string().trim().min(1, "Wajib diisi").max(120),
  stock: z.coerce.number().int("Bilangan bulat").min(0, "Harus ≥ 0"),
  wholesalePrice: z.coerce.number().min(0, "Harus ≥ 0"),
  retailPrice: z.coerce.number().min(0, "Harus ≥ 0"),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Product | null;
  onSubmit: (input: ProductInput) => Promise<void> | void;
  submitting?: boolean;
}

export function ProductFormDialog({ open, onOpenChange, initial, onSubmit, submitting }: Props) {
  const form = useForm<z.input<typeof schema>, unknown, ProductInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", stock: 0, wholesalePrice: 0, retailPrice: 0 },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        initial
          ? {
              name: initial.name,
              stock: initial.stock,
              wholesalePrice: initial.wholesalePrice,
              retailPrice: initial.retailPrice,
            }
          : { name: "", stock: 0, wholesalePrice: 0, retailPrice: 0 },
      );
    }
  }, [open, initial, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit produk" : "Produk baru"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="stock">Stok</Label>
              <Input id="stock" type="number" step="1" {...form.register("stock")} />
              {form.formState.errors.stock && <p className="text-xs text-destructive">{form.formState.errors.stock.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wholesalePrice">Grosir</Label>
              <CurrencyInput
                id="wholesalePrice"
                value={Number(form.watch("wholesalePrice")) || 0}
                onChange={(value) => form.setValue("wholesalePrice", value, { shouldValidate: true })}
              />
              {form.formState.errors.wholesalePrice && <p className="text-xs text-destructive">{form.formState.errors.wholesalePrice.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="retailPrice">Eceran</Label>
              <CurrencyInput
                id="retailPrice"
                value={Number(form.watch("retailPrice")) || 0}
                onChange={(value) => form.setValue("retailPrice", value, { shouldValidate: true })}
              />
              {form.formState.errors.retailPrice && <p className="text-xs text-destructive">{form.formState.errors.retailPrice.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button className="rounded-none" type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button className="rounded-none" type="submit" disabled={submitting}>
              {submitting ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
