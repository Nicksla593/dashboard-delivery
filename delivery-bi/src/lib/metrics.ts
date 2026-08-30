import { customerLabel } from "./normalize";
import type {
  BreakdownRow,
  CustomerRow,
  DailyRow,
  Filters,
  Kpis,
  Order,
} from "./types";

/**
 * Todo o cálculo do sistema vive aqui, em funções puras que recebem
 * pedidos e devolvem números. Componentes não calculam nada.
 */

export const EMPTY_FILTERS: Filters = {
  dateFrom: null,
  dateTo: null,
  payments: [],
  stores: [],
  customers: [],
  bands: [],
};

export function applyFilters(orders: Order[], filters: Filters): Order[] {
  return orders.filter((o) => {
    if (filters.dateFrom && o.date < filters.dateFrom) return false;
    if (filters.dateTo && o.date > filters.dateTo) return false;
    if (filters.payments.length && !filters.payments.includes(o.payment)) return false;
    if (filters.stores.length && !filters.stores.includes(o.storeLabel)) return false;
    if (filters.bands.length && !filters.bands.includes(o.band)) return false;
    if (filters.customers.length && !filters.customers.includes(customerLabel(o.customer)))
      return false;
    return true;
  });
}

function round(n: number): number {
  return Number(n.toFixed(2));
}

export function computeKpis(orders: Order[]): Kpis {
  const revenue = orders.reduce((sum, o) => sum + o.value, 0);
  const days = new Set(orders.map((o) => o.date).filter(Boolean));
  const customers = new Set(orders.map((o) => o.customer).filter((c): c is string => c !== null));
  const activeDays = days.size || 0;

  return {
    orders: orders.length,
    revenue: round(revenue),
    averageTicket: orders.length ? round(revenue / orders.length) : 0,
    uniqueCustomers: customers.size,
    activeDays,
    ordersPerDay: activeDays ? round(orders.length / activeDays) : 0,
    revenuePerDay: activeDays ? round(revenue / activeDays) : 0,
  };
}

/**
 * Série diária.
 *
 * `calendarRange` preenche os dias sem pedido com zero. Sem isso os quatro
 * domingos fechados sumiriam do gráfico e a média diária ficaria inflada.
 */
export function computeDaily(orders: Order[], calendarRange = true): DailyRow[] {
  const map = new Map<string, { orders: number; revenue: number; customers: Set<string> }>();

  for (const o of orders) {
    if (!o.date) continue;
    let entry = map.get(o.date);
    if (!entry) {
      entry = { orders: 0, revenue: 0, customers: new Set() };
      map.set(o.date, entry);
    }
    entry.orders++;
    entry.revenue += o.value;
    if (o.customer) entry.customers.add(o.customer);
  }

  let dates = [...map.keys()].sort();
  if (calendarRange && dates.length > 1) {
    dates = fillDateRange(dates[0], dates[dates.length - 1]);
  }

  return dates.map((date) => {
    const entry = map.get(date);
    const count = entry?.orders ?? 0;
    const revenue = entry?.revenue ?? 0;
    return {
      date,
      orders: count,
      revenue: round(revenue),
      averageTicket: count ? round(revenue / count) : 0,
      customers: entry?.customers.size ?? 0,
    };
  });
}

function fillDateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function computeCustomers(orders: Order[]): CustomerRow[] {
  const map = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const key = customerLabel(o.customer);
    const entry = map.get(key) ?? { orders: 0, revenue: 0 };
    entry.orders++;
    entry.revenue += o.value;
    map.set(key, entry);
  }
  return [...map.entries()]
    .map(([customer, v]) => ({
      customer,
      orders: v.orders,
      revenue: round(v.revenue),
      averageTicket: round(v.revenue / v.orders),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Agregação genérica por uma dimensão (pagamento, loja, faixa). */
export function computeBreakdown(
  orders: Order[],
  key: (o: Order) => string,
): BreakdownRow[] {
  const map = new Map<string, { orders: number; revenue: number }>();
  let totalOrders = 0;
  let totalRevenue = 0;

  for (const o of orders) {
    const k = key(o);
    const entry = map.get(k) ?? { orders: 0, revenue: 0 };
    entry.orders++;
    entry.revenue += o.value;
    map.set(k, entry);
    totalOrders++;
    totalRevenue += o.value;
  }

  return [...map.entries()]
    .map(([k, v]) => ({
      key: k,
      orders: v.orders,
      revenue: round(v.revenue),
      averageTicket: round(v.revenue / v.orders),
      ordersShare: totalOrders ? round((v.orders / totalOrders) * 100) : 0,
      revenueShare: totalRevenue ? round((v.revenue / totalRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export const byPayment = (o: Order) => o.payment;
export const byStore = (o: Order) => o.storeLabel;
export const byBand = (o: Order) => o.band;

/**
 * Período anterior de mesma duração, para comparação.
 * Retorna null quando não há dados suficientes antes do período atual.
 */
export function previousPeriod(
  allOrders: Order[],
  filters: Filters,
): { kpis: Kpis; from: string; to: string } | null {
  const current = applyFilters(allOrders, filters);
  if (!current.length) return null;

  const dates = current.map((o) => o.date).filter(Boolean).sort();
  const from = filters.dateFrom ?? dates[0];
  const to = filters.dateTo ?? dates[dates.length - 1];
  if (!from || !to) return null;

  const spanDays =
    Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
    ) + 1;
  if (spanDays < 1) return null;

  const prevTo = new Date(`${from}T00:00:00Z`);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - (spanDays - 1));

  const prevFilters: Filters = {
    ...filters,
    dateFrom: prevFrom.toISOString().slice(0, 10),
    dateTo: prevTo.toISOString().slice(0, 10),
  };
  const previous = applyFilters(allOrders, prevFilters);
  if (!previous.length) return null;

  return {
    kpis: computeKpis(previous),
    from: prevFilters.dateFrom!,
    to: prevFilters.dateTo!,
  };
}

export function delta(current: number, previous: number): number | null {
  if (!previous) return null;
  return round(((current - previous) / previous) * 100);
}

/** Ranking de dias, usado nos blocos "melhores dias". */
export function rankDays(
  daily: DailyRow[],
  metric: "orders" | "revenue",
  limit = 5,
): DailyRow[] {
  return [...daily]
    .filter((d) => d[metric] > 0)
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, limit);
}

export function distinctValues(orders: Order[], key: (o: Order) => string): string[] {
  return [...new Set(orders.map(key))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
