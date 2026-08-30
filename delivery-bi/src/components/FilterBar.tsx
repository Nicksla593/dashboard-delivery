"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { customerLabel } from "@/lib/normalize";
import { byBand, byPayment, byStore, distinctValues } from "@/lib/metrics";
import { EMPTY_FILTERS } from "@/lib/metrics";
import { useDataset } from "@/store/DatasetProvider";
import type { Filters } from "@/lib/types";

/**
 * Filtros da dashboard. Alteram o estado central, então todo KPI, gráfico e
 * tabela do sistema reage junto — nenhuma página filtra por conta própria.
 */
export default function FilterBar() {
  const { dataset, filters, setFilters } = useDataset();

  const options = useMemo(() => {
    const orders = dataset?.orders ?? [];
    const dates = orders.map((o) => o.date).filter(Boolean).sort();
    return {
      payments: distinctValues(orders, byPayment),
      stores: distinctValues(orders, byStore),
      bands: distinctValues(orders, byBand),
      customers: distinctValues(orders, (o) => customerLabel(o.customer)),
      minDate: dates[0] ?? "",
      maxDate: dates[dates.length - 1] ?? "",
    };
  }, [dataset]);

  if (!dataset) return null;

  const update = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const single = (values: string[]) => (values.length === 1 ? values[0] : "");
  const active =
    filters.dateFrom ||
    filters.dateTo ||
    filters.payments.length ||
    filters.stores.length ||
    filters.customers.length ||
    filters.bands.length;

  return (
    <div className="panel mb-5 flex flex-wrap items-end gap-3 px-5 py-4">
      <label className="flex flex-col gap-1">
        <span className="eyebrow">De</span>
        <input
          type="date"
          className="field w-[150px]"
          value={filters.dateFrom ?? ""}
          min={options.minDate}
          max={options.maxDate}
          onChange={(e) => update({ dateFrom: e.target.value || null })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="eyebrow">Até</span>
        <input
          type="date"
          className="field w-[150px]"
          value={filters.dateTo ?? ""}
          min={options.minDate}
          max={options.maxDate}
          onChange={(e) => update({ dateTo: e.target.value || null })}
        />
      </label>

      <Select
        label="Loja"
        value={single(filters.stores)}
        options={options.stores}
        onChange={(v) => update({ stores: v ? [v] : [] })}
      />
      <Select
        label="Forma de pagamento"
        value={single(filters.payments)}
        options={options.payments}
        onChange={(v) => update({ payments: v ? [v] : [] })}
      />
      <Select
        label="Faixa de valor"
        value={single(filters.bands)}
        options={options.bands}
        onChange={(v) => update({ bands: v ? [v] : [] })}
      />
      <Select
        label="Cliente"
        value={single(filters.customers)}
        options={options.customers}
        onChange={(v) => update({ customers: v ? [v] : [] })}
        width="w-[190px]"
      />

      {active ? (
        <button
          type="button"
          className="btn-ghost ml-auto"
          onClick={() => setFilters(EMPTY_FILTERS)}
        >
          <X size={14} /> Limpar filtros
        </button>
      ) : null}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  width = "w-[160px]",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  width?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      <select
        className={`field ${width}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
