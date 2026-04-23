import { NavLink } from "@/components/NavLink";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import laporanIcon from "../../../assets/laporan_icon.png";
import piutangIcon from "../../../assets/piutang_icon.png";
import hutangIcon from "../../../assets/hutang_icon.png";
import transaksiIcon from "../../../assets/transaksi_icon.png";
import productIcon from "../../../assets/product_icon.png";
import customerIcon from "../../../assets/customer_icon.png";
import dashboardIcon from "../../../assets/dashboard_icon.png";
import storeIcon from "../../../assets/store_icon.png";

type SidebarIconProps = {
  className?: string;
};

const PiutangIcon = (props: SidebarIconProps) => (
  <img src={piutangIcon} alt="Piutang" className={`${props.className ?? ''} object-contain`} />
);

const HutangIcon = (props: SidebarIconProps) => (
  <img src={hutangIcon} alt="Hutang" className={`${props.className ?? ''} object-contain`} />
);
const TransaksiIcon = (props: SidebarIconProps) => (
  <img src={transaksiIcon} alt="Transaksi" className={`${props.className ?? ''} object-contain`} />
);

const ProductIcon = (props: SidebarIconProps) => (
  <img src={productIcon} alt="Produk" className={`${props.className ?? ''} object-contain`} />
);

const CustomerIcon = (props: SidebarIconProps) => (
  <img src={customerIcon} alt="Pelanggan" className={`${props.className ?? ''} object-contain`} />
);

const DashboardIcon = (props: SidebarIconProps) => (
  <img src={dashboardIcon} alt="Dasbor" className={`${props.className ?? ''} object-contain`} />
);

const StoreIcon = (props: SidebarIconProps) => (
  <img src={storeIcon} alt="Master Toko" className={`${props.className ?? ''} object-contain`} />
);

const items = [
  { to: "/", label: "Dasbor", icon: DashboardIcon, end: true },
  { to: "/products", label: "Produk", icon: ProductIcon },
  { to: "/customers", label: "Pelanggan", icon: CustomerIcon },
  { to: "/stores", label: "Master Toko", icon: StoreIcon },
  { to: "/transactions", label: "Transaksi", icon: TransaksiIcon },
  { to: "/debts", label: "Piutang", icon: PiutangIcon },
  { to: "/payables", label: "Hutang", icon: HutangIcon },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
};

export function Sidebar({ mobileOpen = false, onMobileOpenChange }: SidebarProps) {
  const location = useLocation();
  const reportActive = location.pathname.startsWith("/reports/");
  const [reportOpen, setReportOpen] = useState(reportActive);

  useEffect(() => {
    if (reportActive) setReportOpen(true);
  }, [reportActive]);

  useEffect(() => {
    onMobileOpenChange?.(false);
  }, [location.pathname, onMobileOpenChange]);

  const menuContent = (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-xs font-semibold text-black">
          A
        </div>
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">Admin</span>
        <button
          type="button"
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-white/10 hover:text-white md:hidden"
          onClick={() => onMobileOpenChange?.(false)}
          aria-label="Tutup menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:text-white"
            activeClassName="text-white font-semibold"
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setReportOpen((v) => !v)}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:text-white ${
              reportActive ? "font-semibold text-white" : ""
            }`}
          >
            <img src={laporanIcon} alt="Laporan" className="h-4 w-4 object-contain" />
            <span className="flex-1 text-left">Laporan</span>
            {reportOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {reportOpen && (
            <div className="relative mt-1 ml-4 space-y-1 pl-4">
              <div className="pointer-events-none absolute bottom-2 left-0 top-2 w-px bg-white/25" />
              <NavLink
                to="/reports/stock"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:text-white"
                activeClassName="text-white font-semibold"
              >
                <span className="absolute left-0 h-px w-3 bg-white/25" />
                <span className="flex-1">Laporan Stock</span>
              </NavLink>
              <NavLink
                to="/reports/payables"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:text-white"
                activeClassName="text-white font-semibold"
              >
                <span className="absolute left-0 h-px w-3 bg-white/25" />
                <span className="flex-1">Laporan Hutang</span>
              </NavLink>
              <NavLink
                to="/reports/debts"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:text-white"
                activeClassName="text-white font-semibold"
              >
                <span className="absolute left-0 h-px w-3 bg-white/25" />
                <span className="flex-1">Laporan Piutang</span>
              </NavLink>
              <NavLink
                to="/reports/finance"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:text-white"
                activeClassName="text-white font-semibold"
              >
                <span className="absolute left-0 h-px w-3 bg-white/25" />
                <span className="flex-1">Laporan Keuangan</span>
              </NavLink>
            </div>
          )}
        </div>
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/70">
        v1.0
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-screen w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        {menuContent}
      </aside>

      <div className={`fixed inset-0 z-40 md:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => onMobileOpenChange?.(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-xl transition-transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {menuContent}
        </aside>
      </div>
    </>
  );
}
