"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Valor usado para ordenar. Quando ausente, a coluna não é ordenável. */
  sortValue?: (row: T) => number | string;
  render: (row: T, index: number) => React.ReactNode;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T, index: number) => string;
  initialSort?: { key: string; direction: "asc" | "desc" };
  /** Quantas linhas mostrar antes do botão "ver todos". */
  pageSize?: number;
  emptyLabel?: string;
};

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  initialSort,
  pageSize,
  emptyLabel = "Nenhum registro para os filtros atuais.",
}: Props<T>) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv), "pt-BR") * factor;
    });
  }, [rows, sort, columns]);

  const visible = pageSize && !expanded ? sorted.slice(0, pageSize) : sorted;
  const hidden = sorted.length - visible.length;

  const toggleSort = (key: string) => {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  };

  if (!rows.length) {
    return <p className="px-5 py-8 text-center text-sm text-ink-faint">{emptyLabel}</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((c) => {
                const sortable = Boolean(c.sortValue);
                const activeSort = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    className={`th ${c.align === "right" ? "text-right" : ""}`}
                    aria-sort={
                      activeSort
                        ? sort!.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={`inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-ink ${
                          activeSort ? "text-ink" : ""
                        } ${c.align === "right" ? "flex-row-reverse" : ""}`}
                      >
                        {c.header}
                        {activeSort &&
                          (sort!.direction === "asc" ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          ))}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={rowKey(row, i)} className="transition hover:bg-canvas">
                {columns.map((c) => (
                  <td key={c.key} className={`td ${c.align === "right" ? "text-right" : ""}`}>
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hidden > 0 && (
        <div className="border-t border-line px-5 py-3">
          <button type="button" className="btn-ghost" onClick={() => setExpanded(true)}>
            Ver todos ({hidden} a mais)
          </button>
        </div>
      )}
      {expanded && pageSize && (
        <div className="border-t border-line px-5 py-3">
          <button type="button" className="btn-ghost" onClick={() => setExpanded(false)}>
            Mostrar menos
          </button>
        </div>
      )}
    </div>
  );
}
