import { Input } from "@/components/ui/input";

const formatRupiahInput = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.max(0, Number.isFinite(value) ? value : 0));

const parseRupiahInput = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

interface CurrencyInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
}

export function CurrencyInput({ id, value, onChange, className, placeholder }: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        className={`pl-10 ${className ?? ""}`}
        value={value > 0 ? formatRupiahInput(value) : ""}
        onChange={(e) => onChange(parseRupiahInput(e.target.value))}
        placeholder={placeholder ?? "0"}
      />
    </div>
  );
}
