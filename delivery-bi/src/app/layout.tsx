import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { DatasetProvider } from "@/store/DatasetProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delivery BI · Fruit Mania",
  description: "Análise operacional e financeira dos pedidos de delivery.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">
        <DatasetProvider>
          <AppShell>{children}</AppShell>
        </DatasetProvider>
      </body>
    </html>
  );
}
