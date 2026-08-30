"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  Database,
  LayoutDashboard,
  Link2,
  Users,
} from "lucide-react";
import { useDataset } from "@/store/DatasetProvider";
import ConnectionBar from "./ConnectionBar";

const NAV = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/diario", label: "Análise diária", icon: BarChart3 },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/dados", label: "Qualidade dos dados", icon: Database },
  { href: "/conexao", label: "Conexão", icon: Link2 },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { dataset } = useDataset();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-shell-line bg-shell lg:flex">
        <div className="border-b border-shell-line px-5 py-5">
          <p className="text-sm font-semibold tracking-tight text-white">Delivery BI</p>
          <p className="mt-0.5 text-xs text-shell-text">Fruit Mania</p>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-shell-soft font-medium text-white"
                    : "text-shell-text hover:bg-shell-soft/60 hover:text-white"
                }`}
              >
                <Icon size={16} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        {dataset && (
          <div className="border-t border-shell-line px-5 py-4">
            <p className="text-[11px] uppercase tracking-wider text-shell-text">Planilha</p>
            <p className="mt-1 truncate text-xs text-white" title={dataset.spreadsheetTitle}>
              {dataset.spreadsheetTitle}
            </p>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <ConnectionBar />
        <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
