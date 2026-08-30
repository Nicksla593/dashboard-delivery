"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatPercent } from "@/lib/format";

type Props = {
  label: string;
  value: string;
  hint?: string;
  /** Variação percentual contra o período anterior. */
  delta?: number | null;
  /** Quando true, uma queda é considerada positiva. */
  invertDelta?: boolean;
};

export default function KpiCard({ label, value, hint, delta, invertDelta }: Props) {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta);
  const positive = hasDelta ? (invertDelta ? delta! < 0 : delta! > 0) : false;
  const neutral = hasDelta && Math.abs(delta!) < 0.05;

  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const tone = neutral
    ? "text-ink-faint"
    : positive
      ? "text-brand-dark"
      : "text-danger";

  return (
    <div className="panel px-5 py-4">
      <p className="eyebrow">{label}</p>
      <p className="tabular mt-2 text-[27px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {hasDelta && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${tone}`}>
            <Icon size={13} />
            <span className="tabular">{formatPercent(Math.abs(delta!))}</span>
          </span>
        )}
        {hint && <span className="text-xs text-ink-faint">{hint}</span>}
      </div>
    </div>
  );
}
