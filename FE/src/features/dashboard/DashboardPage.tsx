import { useState } from "react";
import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import productIcon from "../../../assets/product_icon.png";
import transaksiIcon from "../../../assets/transaksi_icon.png";
import piutangIcon from "../../../assets/piutang_icon.png";
import hutangIcon from "../../../assets/hutang_icon.png";
import emptyIcon from "../../../assets/empty.svg";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardService } from "@/services/dashboard";
import { formatCurrency, formatNumber } from "@/lib/format";
import { ErrorState } from "@/components/common/States";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const toDateOnly = (value?: string) => {
  if (!value) return "-";
  const matched = value.match(/\d{4}-\d{2}-\d{2}/);
  if (matched?.[0]) return matched[0];

  const normalized = value.replace(" GMT+7", "+07:00").replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return value;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DashboardPage() {
  const [activeSeries, setActiveSeries] = useState<"penjualan" | "pembelian" | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", "summary", 7],
    queryFn: () => dashboardService.summary(7),
  });

  type CardItem = {
    label: string;
    value: string | number;
    icon: string | ComponentType<{ className?: string }>;
    alt?: string;
  };

  const cards: CardItem[] = [
    { label: "Total produk", value: data ? formatNumber(data.totalProducts) : "—", icon: productIcon, alt: "product_icon" },
    { label: "Total transaksi", value: data ? formatNumber(data.totalTransactions) : "—", icon: transaksiIcon, alt: "transaksi_icon" },
    { label: "Piutang belum lunas", value: data ? formatCurrency(data.totalOutstandingDebts) : "—", icon: piutangIcon, alt: "piutang_icon" },
    { label: "Hutang belum lunas", value: data ? formatCurrency(data.totalOutstandingPayables) : "—", icon: hutangIcon, alt: "hutang_icon" },
  ];

  return (
    <div>
      <Card className="overflow-hidden p-0">
        <div className="bg-primary px-6 py-4 text-primary-foreground">
          <h1 className="text-lg font-semibold">Dasbor</h1>
        </div>

        <div className="flex flex-col gap-3 border-b border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Ringkasan inventaris, transaksi, piutang, dan hutang Anda.</p>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6 border border-border bg-muted/20 p-4">
            {isError ? (
              <ErrorState message="Gagal memuat ringkasan." onRetry={() => refetch()} />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {cards.map((c) => {
                    const Icon = typeof c.icon === "string" ? null : (c.icon as ComponentType<{ className?: string }>);
                    return (
                      <div key={c.label} className="border border-border bg-card p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-muted-foreground">{c.label}</div>
                          {Icon ? (
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <img src={c.icon as string} alt={c.alt} className="h-5 w-5 object-contain" />
                          )}
                        </div>
                        <div className="mt-4">
                          {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-semibold tracking-tight">{c.value}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border border-border bg-card">
                  <div className="bg-primary px-4 py-3 text-primary-foreground">
                    <h2 className="text-sm font-semibold">Grafik Tren Penjualan Dan Pembelian (7 Hari)</h2>
                  </div>
                  <div className="p-4">
                    <div className="h-[320px] w-full">
                      {isLoading ? (
                        <Skeleton className="h-full w-full" />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data?.trend.items ?? []} margin={{ top: 12, right: 12, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis width={92} tickFormatter={(v) => formatNumber(Number(v) || 0)} />
                            <Tooltip
                              cursor={false}
                              formatter={(v) => formatCurrency(Number(v) || 0)}
                              content={({ active, label, payload }) => {
                                if (!active || !payload?.length) return null;
                                const activeItem = activeSeries
                                  ? payload.find((entry) => entry.dataKey === activeSeries)
                                  : payload[0];
                                if (!activeItem) return null;
                                const activeValue = Number(activeItem.value) || 0;
                                if (activeValue <= 0) return null;

                                return (
                                  <div className="rounded-none border border-border bg-background px-3 py-2 shadow-sm">
                                    <div className="mb-1 text-sm font-medium">{label}</div>
                                    <div className="text-sm font-semibold" style={{ color: String(activeItem.color ?? "#111827") }}>
                                      {activeItem.name}: {formatCurrency(activeValue)}
                                    </div>
                                  </div>
                                );
                              }}
                            />
                            <Legend />
                            <Bar
                              name="Penjualan"
                              dataKey="penjualan"
                              stackId="a"
                              fill="#1f2937"
                              radius={[2, 2, 0, 0]}
                              onMouseOver={() => setActiveSeries("penjualan")}
                              onMouseLeave={() => setActiveSeries(null)}
                            />
                            <Bar
                              name="Pembelian"
                              dataKey="pembelian"
                              stackId="a"
                              fill="#f59e0b"
                              radius={[2, 2, 0, 0]}
                              onMouseOver={() => setActiveSeries("pembelian")}
                              onMouseLeave={() => setActiveSeries(null)}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="border border-border bg-card">
                    <div className="bg-primary px-4 py-3 text-primary-foreground">
                      <h2 className="text-sm font-semibold">Piutang Jatuh Tempo</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">No Faktur</TableHead>
                            <TableHead className="text-xs">Tgl Piutang</TableHead>
                            <TableHead className="text-xs">Jatuh Tempo</TableHead>
                            <TableHead className="text-xs">Nama Customer</TableHead>
                            <TableHead className="text-right text-xs">Sisa</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell colSpan={5}>
                                <Skeleton className="h-8 w-full" />
                              </TableCell>
                            </TableRow>
                          ) : !(data?.due.piutang.length) ? (
                            <TableRow>
                              <TableCell colSpan={5} className="h-44">
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                                  <img src={emptyIcon} alt="empty" className="h-64 w-64 object-contain opacity-80" />
                                  <span className="text-xs">Tidak ada data piutang jatuh tempo</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            data.due.piutang.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-xs">{item.noFaktur}</TableCell>
                                <TableCell className="text-xs">{toDateOnly(item.tanggalTransaksi)}</TableCell>
                                <TableCell className="text-xs">{toDateOnly(item.tanggalJatuhTempo)}</TableCell>
                                <TableCell className="text-xs">{(item.namaCustomer ?? "").toUpperCase()}</TableCell>
                                <TableCell className="text-right text-xs">{formatCurrency(item.sisa)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="border border-border bg-card">
                    <div className="bg-primary px-4 py-3 text-primary-foreground">
                      <h2 className="text-sm font-semibold">Hutang Jatuh Tempo</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">No Faktur</TableHead>
                            <TableHead className="text-xs">Tgl Hutang</TableHead>
                            <TableHead className="text-xs">Jatuh Tempo</TableHead>
                            <TableHead className="text-xs">Nama Customer</TableHead>
                            <TableHead className="text-right text-xs">Sisa</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            <TableRow>
                              <TableCell colSpan={5}>
                                <Skeleton className="h-8 w-full" />
                              </TableCell>
                            </TableRow>
                          ) : !(data?.due.hutang.length) ? (
                            <TableRow>
                              <TableCell colSpan={5} className="h-44">
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                                  <img src={emptyIcon} alt="empty" className="h-64 w-64 object-contain opacity-80" />
                                  <span className="text-xs">Tidak ada data hutang jatuh tempo</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            data.due.hutang.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-xs">{item.noFaktur}</TableCell>
                                <TableCell className="text-xs">{toDateOnly(item.tanggalTransaksi)}</TableCell>
                                <TableCell className="text-xs">{toDateOnly(item.tanggalJatuhTempo)}</TableCell>
                                <TableCell className="text-xs">{(item.namaCustomer ?? "").toUpperCase()}</TableCell>
                                <TableCell className="text-right text-xs">{formatCurrency(item.sisa)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
