const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("pt-BR");

export function formatCurrency(value: number): string {
  return currency.format(value ?? 0);
}

export function formatNumber(value: number): string {
  return integer.format(value ?? 0);
}

export function formatDecimal(value: number): string {
  return decimal.format(value ?? 0);
}

export function formatPercent(value: number): string {
  return `${decimal.format(value ?? 0)}%`;
}

/** ISO yyyy-mm-dd -> dd/mm/aaaa, sem deslocamento de fuso. */
export function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** ISO -> dd/mm, para eixos de gráfico. */
export function formatDateShort(iso: string): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function formatWeekday(iso: string): string {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function formatTime(isoTimestamp: string | null): string {
  if (!isoTimestamp) return "—";
  return new Date(isoTimestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(isoTimestamp: string | null): string {
  if (!isoTimestamp) return "—";
  return new Date(isoTimestamp).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
