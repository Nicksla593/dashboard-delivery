"use client";

import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import Link from "next/link";

export function Loading({ label = "Carregando dados da planilha" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16 text-sm text-ink-soft">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel h-[104px] animate-pulse bg-line/40" />
      ))}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="panel flex flex-col items-start gap-3 border-danger/20 bg-red-50/40 px-5 py-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-danger" />
        <div>
          <p className="text-sm font-medium text-ink">Não foi possível ler a planilha</p>
          <p className="mt-1 text-sm text-ink-soft">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost">
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Inbox size={22} className="text-ink-faint" />
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-md text-sm text-ink-soft">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary mt-2">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
