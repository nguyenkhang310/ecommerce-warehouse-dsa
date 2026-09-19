import type {
  BenchmarkPoint,
  DashboardSummary,
  HashBucketView,
  HealthStatus,
  HeapSnapshot,
  LookupTrace,
  OperationLogEntry,
  Order,
  Priority,
  Product,
  QueueSummary,
  RecentUpdate,
  StockMovement,
  TrieSnapshot,
} from "@/core/types";

async function call<T>(action: string, data: object = {}, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(60_000)])
        : AbortSignal.timeout(60_000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Không kết nối được backend C++. Hãy chạy npm run dev.");
  }
  const body = (await response.json()) as {
    ok: boolean;
    data?: T;
    error?: { message?: string };
  };
  if (!response.ok || !body.ok) {
    throw new Error(body.error?.message ?? "Backend C++ xử lý thất bại.");
  }
  return body.data as T;
}

export interface ProductQuery {
  category?: string;
  status?: string;
}

export const inventoryApi = {
  getDashboardSummary: () => call<DashboardSummary>("dashboard"),
  getProducts: (params: ProductQuery = {}) => call<Product[]>("products", params),
  lookupProductExact: (sku: string) =>
    call<{ product: Product | null; trace: LookupTrace }>("product_lookup", { sku }),
  searchProductsByPrefix: (prefix: string, field: "sku" | "name" | "auto" = "auto") =>
    call<{ entries: Product[]; elapsedMs: number; matches: number }>("product_search", {
      prefix,
      field,
    }),
  getProduct: (sku: string) =>
    call<{ product: Product; movements: StockMovement[] }>("product_detail", { sku }),
  createProduct: (payload: Pick<Product, "sku" | "name" | "category" | "stock" | "reorderLevel">) =>
    call<Product>("product_create", payload),
  updateStock: (
    sku: string,
    payload: { delta: number; reason: StockMovement["reason"]; note?: string },
  ) =>
    call<{
      product: Product;
      movement: StockMovement;
      movedToFront: boolean;
      evicted: string | null;
    }>("stock_update", { sku, ...payload }),
  getRecentUpdates: (limit = 6) => call<RecentUpdate[]>("recent", { limit }),
};

export const orderApi = {
  getQueueSummary: () => call<QueueSummary>("queue_summary"),
  getQueue: (params: { priority?: Priority | "all" } = {}) => call<Order[]>("queue", params),
  lookupOrderExact: (orderCode: string) =>
    call<{ order: Order | null; trace: LookupTrace }>("order_lookup", { orderCode }),
  peekNext: async () => (await call<Order[]>("next_orders", { limit: 1 }))[0] ?? null,
  getNextCandidates: (limit = 5) => call<Order[]>("next_orders", { limit }),
  enqueue: (payload: {
    orderCode: string;
    priority: Priority;
    items: { sku: string; quantity: number }[];
    note?: string;
  }) => call<Order>("order_enqueue", payload),
  extractNext: () => call<Order | null>("order_extract"),
  getHeapSnapshot: () => call<HeapSnapshot>("heap"),
  getOperationLog: () => call<OperationLogEntry[]>("logs"),
};

export const visualizerApi = {
  getHashSnapshot: (limit = 24, key = "") => call<HashBucketView[]>("hash", { limit, key }),
  getTrieSnapshot: (prefix: string, field: "sku" | "name" = "sku") =>
    call<TrieSnapshot>("trie", { prefix, field }),
  getRecentListSnapshot: () =>
    call<{
      items: RecentUpdate[];
      map: { key: string; position: number }[];
      capacity: number;
    }>("recent_snapshot"),
};

export interface BenchmarkRunPayload {
  operation: BenchmarkPoint["operation"];
  sizes: number[];
  iterations: number;
  warmup: boolean;
}

function download(contents: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export const benchmarkApi = {
  run: (payload: BenchmarkRunPayload, signal?: AbortSignal) =>
    call<BenchmarkPoint[]>("benchmark_run", payload, signal),
  getHistory: () => call<BenchmarkPoint[]>("benchmark_history"),
  export: async (format: "csv" | "json") => {
    const rows = await call<BenchmarkPoint[]>("benchmark_history");
    if (format === "json") {
      const contents = JSON.stringify(rows, null, 2);
      download(contents, "benchmark.json", "application/json");
      return contents;
    }
    const header =
      "measuredAt,operation,datasetSize,iterations,dsaMeanMs,baselineMeanMs,mode";
    const contents = [
      header,
      ...rows.map((row) =>
        [
          row.measuredAt,
          row.operation,
          row.datasetSize,
          row.iterations,
          row.dsaMeanMs,
          row.baselineMeanMs,
          row.mode,
        ].join(","),
      ),
    ].join("\n");
    download(contents, "benchmark.csv", "text/csv;charset=utf-8");
    return contents;
  },
};

export const systemApi = {
  getHealth: async () => {
    const start = performance.now();
    const health = await call<HealthStatus>("health");
    return { ...health, latencyMs: Number((performance.now() - start).toFixed(2)) };
  },
  resetDemoData: () => call<boolean>("reset"),
  ping: async () => {
    const start = performance.now();
    await call<{ ok: boolean }>("ping");
    return { ok: true, latencyMs: Number((performance.now() - start).toFixed(2)) };
  },
};

export type { Order, Product };
