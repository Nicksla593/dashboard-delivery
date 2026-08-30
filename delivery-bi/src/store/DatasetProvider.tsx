"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_POLL_INTERVAL_MS } from "@/lib/config";
import { EMPTY_FILTERS, applyFilters } from "@/lib/metrics";
import type { Dataset, Filters } from "@/lib/types";

const STORAGE_KEY = "delivery-bi:spreadsheet-url";

export type ConnectionStatus =
  | "desconectado"
  | "conectando"
  | "conectado"
  | "atualizando"
  | "erro";

type DatasetContextValue = {
  url: string;
  status: ConnectionStatus;
  error: string | null;
  dataset: Dataset | null;
  lastCheckedAt: string | null;
  justUpdated: boolean;
  autoRefresh: boolean;
  pollIntervalMs: number;
  filters: Filters;
  setFilters: (next: Filters) => void;
  setAutoRefresh: (value: boolean) => void;
  setPollIntervalMs: (value: number) => void;
  connect: (url: string) => Promise<void>;
  refresh: (force?: boolean) => Promise<void>;
  disconnect: () => void;
};

const DatasetContext = createContext<DatasetContextValue | null>(null);

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Falha na comunicação com o servidor.");
  return json as T;
}

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("desconectado");
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pollIntervalMs, setPollIntervalMs] = useState(DEFAULT_POLL_INTERVAL_MS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const inFlight = useRef(false);
  const datasetRef = useRef<Dataset | null>(null);
  datasetRef.current = dataset;

  const load = useCallback(async (targetUrl: string, force: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const known = datasetRef.current;
    setStatus(known ? "atualizando" : "conectando");
    setError(null);

    try {
      const result = await postJson<
        | { unchanged: true; revision: string | null; checkedAt: string }
        | { unchanged: false; dataset: Dataset }
      >("/api/sheets/data", {
        url: targetUrl,
        spreadsheetId: known?.spreadsheetId,
        knownRevision: known?.revision ?? null,
        force,
      });

      if (result.unchanged) {
        setLastCheckedAt(result.checkedAt);
      } else {
        const changed =
          !known || known.orders.length !== result.dataset.orders.length || force;
        setDataset(result.dataset);
        setLastCheckedAt(result.dataset.fetchedAt);
        if (changed && known) {
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 4000);
        }
      }
      setStatus("conectado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      setStatus(datasetRef.current ? "conectado" : "erro");
    } finally {
      inFlight.current = false;
    }
  }, []);

  const connect = useCallback(
    async (nextUrl: string) => {
      setUrl(nextUrl);
      setDataset(null);
      datasetRef.current = null;
      await load(nextUrl, true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, nextUrl);
      }
    },
    [load],
  );

  const refresh = useCallback(
    async (force = true) => {
      if (!url) return;
      await load(url, force);
    },
    [load, url],
  );

  const disconnect = useCallback(() => {
    setUrl("");
    setDataset(null);
    setStatus("desconectado");
    setError(null);
    setFilters(EMPTY_FILTERS);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Reconecta sozinho na planilha usada por último.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setUrl(saved);
      void load(saved, true);
    }
  }, [load]);

  // Verificação periódica de alterações.
  useEffect(() => {
    if (!autoRefresh || !url || status === "erro") return;
    const timer = setInterval(() => {
      void load(url, false);
    }, pollIntervalMs);
    return () => clearInterval(timer);
  }, [autoRefresh, url, pollIntervalMs, status, load]);

  const value = useMemo<DatasetContextValue>(
    () => ({
      url,
      status,
      error,
      dataset,
      lastCheckedAt,
      justUpdated,
      autoRefresh,
      pollIntervalMs,
      filters,
      setFilters,
      setAutoRefresh,
      setPollIntervalMs,
      connect,
      refresh,
      disconnect,
    }),
    [
      url,
      status,
      error,
      dataset,
      lastCheckedAt,
      justUpdated,
      autoRefresh,
      pollIntervalMs,
      filters,
      connect,
      refresh,
      disconnect,
    ],
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset() {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error("useDataset precisa estar dentro de DatasetProvider.");
  return ctx;
}

/** Pedidos já filtrados + metadados derivados, memoizados. */
export function useFilteredOrders() {
  const { dataset, filters } = useDataset();
  return useMemo(() => {
    if (!dataset) return { all: [], filtered: [] };
    return { all: dataset.orders, filtered: applyFilters(dataset.orders, filters) };
  }, [dataset, filters]);
}
