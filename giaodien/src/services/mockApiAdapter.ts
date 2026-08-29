import { getCore } from "@/core/coreService";
import type { BenchmarkPoint, Order, Priority, Product, StockMovement } from "@/core/types";

/**
 * MOCK API ADAPTER — điểm duy nhất cần thay khi có REST API thật.
 * Giữ nguyên chữ ký hàm, chỉ đổi phần thân sang fetch().
 */

export const API_MODE: "mock" | "live" = "mock";

const delay = (min = 300, max = 700) =>
  new Promise<void>((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));

async function call<T>(fn: () => T, min?: number, max?: number): Promise<T> {
  await delay(min, max);
  return fn();
}

export interface ProductQuery {
  category?: string;
  status?: string;
}

export const inventoryApi = {
  getDashboardSummary: () => call(() => getCore().dashboard()),
  getProducts: (params: ProductQuery = {}) =>
    call(() =>
      getCore()
        .allProducts()
        .filter((p) =>
          !params.category || params.category === "all" ? true : p.category === params.category,
        )
        .filter((p) =>
          !params.status || params.status === "all" ? true : p.status === params.status,
        ),
    ),
  lookupProductExact: (sku: string) => call(() => getCore().lookupProduct(sku), 180, 380),
  searchProductsByPrefix: (prefix: string, field: "sku" | "name" | "auto" = "auto") =>
    call(() => getCore().searchPrefix(prefix, field), 120, 260),
  getProduct: (sku: string) =>
    call(() => {
      const core = getCore();
      const { product } = core.lookupProduct(sku);
      if (!product) throw new Error("Không tìm thấy sản phẩm");
      return { product, movements: core.movementsOf(product.id) };
    }),
  createProduct: (payload: Pick<Product, "sku" | "name" | "category" | "stock" | "reorderLevel">) =>
    call(() => {
      const core = getCore();
      const now = new Date().toISOString();
      const product: Product = {
        ...payload,
        id: `prd_${Date.now()}`,
        status:
          payload.stock === 0
            ? "out_of_stock"
            : payload.stock <= payload.reorderLevel
              ? "low_stock"
              : "in_stock",
        createdAt: now,
        updatedAt: now,
      };
      core.productsByKey.set(product.sku, product);
      core.skuTrie.insert(product.sku, { sku: product.sku, name: product.name });
      core.nameTrie.insertAllWords(product.name, { sku: product.sku, name: product.name });
      core.pushLog("success", "hash_table", `Thêm sản phẩm ${product.sku} vào Hash Table.`);
      return product;
    }),
  updateStock: (
    sku: string,
    payload: { delta: number; reason: StockMovement["reason"]; note?: string },
  ) => call(() => getCore().updateStock(sku, payload.delta, payload.reason, payload.note)),
  getRecentUpdates: (limit = 6) => call(() => getCore().recentSnapshot().items.slice(0, limit)),
};

export const orderApi = {
  getQueueSummary: () => call(() => getCore().queueSummary()),
  getQueue: (params: { priority?: Priority | "all" } = {}) =>
    call(() =>
      getCore()
        .queueOrders()
        .filter((o) =>
          !params.priority || params.priority === "all" ? true : o.priority === params.priority,
        ),
    ),
  lookupOrderExact: (orderCode: string) => call(() => getCore().lookupOrder(orderCode), 180, 380),
  peekNext: () => call(() => getCore().peekNext(), 200, 420),
  getNextCandidates: (k = 5) => call(() => getCore().nextCandidates(k)),
  enqueue: (payload: {
    orderCode: string;
    priority: Priority;
    items: { sku: string; quantity: number }[];
    note?: string;
  }) => call(() => getCore().enqueue(payload)),
  extractNext: () => call(() => getCore().extractNext()),
  getHeapSnapshot: () => call(() => getCore().heapSnapshot()),
  getOperationLog: () => call(() => getCore().log.slice(), 120, 260),
};

export const visualizerApi = {
  getHashSnapshot: (limit = 24) => call(() => getCore().hashBuckets(limit), 150, 320),
  getTrieSnapshot: (prefix: string, field: "sku" | "name" = "sku") =>
    call(() => getCore().trieSnapshot(prefix, field), 100, 220),
  getRecentListSnapshot: () => call(() => getCore().recentSnapshot(), 150, 300),
};

export interface BenchmarkRunPayload {
  operation: BenchmarkPoint["operation"];
  sizes: number[];
  iterations: number;
  warmup: boolean;
}

export const benchmarkApi = {
  run: (payload: BenchmarkRunPayload) =>
    call(
      () => {
        const core = getCore();
        const now = new Date().toISOString();
        const base = core.benchmarks.filter((b) => b.operation === payload.operation);
        const points: BenchmarkPoint[] = payload.sizes.map((size) => {
          const template = base.find((b) => b.datasetSize === size) ?? base[0];
          const jitter = 0.9 + Math.random() * 0.2;
          return {
            operation: payload.operation,
            datasetSize: size,
            iterations: payload.iterations,
            dsaMeanMs: Number((template.dsaMeanMs * jitter).toFixed(4)),
            baselineMeanMs: Number((template.baselineMeanMs * jitter).toFixed(4)),
            medianMs: Number((template.dsaMeanMs * jitter * 0.94).toFixed(4)),
            p95Ms: Number((template.dsaMeanMs * jitter * 1.3).toFixed(4)),
            measuredAt: now,
            mode: "mock",
          };
        });
        core.benchmarks = points.concat(core.benchmarks).slice(0, 60);
        core.pushLog(
          "info",
          "benchmark",
          `Chạy benchmark ${payload.operation} • ${payload.iterations} vòng lặp (mô phỏng).`,
        );
        return points;
      },
      600,
      1200,
    ),
  getHistory: () => call(() => getCore().benchmarks.slice()),
  export: (format: "csv" | "json") =>
    call(
      () => {
        const rows = getCore().benchmarks;
        if (format === "json") return JSON.stringify(rows, null, 2);
        const header =
          "measuredAt,operation,datasetSize,iterations,dsaMeanMs,baselineMeanMs,speedup,mode";
        const body = rows
          .map((r) =>
            [
              r.measuredAt,
              r.operation,
              r.datasetSize,
              r.iterations,
              r.dsaMeanMs,
              r.baselineMeanMs,
              (r.baselineMeanMs / r.dsaMeanMs).toFixed(2),
              r.mode,
            ].join(","),
          )
          .join("\n");
        return `${header}\n${body}`;
      },
      200,
      400,
    ),
};

export const systemApi = {
  getHealth: () => call(() => getCore().health()),
  importData: (file: { name: string; size: number }, entityType: "products" | "orders") =>
    call(
      () => {
        const core = getCore();
        const total = entityType === "products" ? 240 : 320;
        core.pushLog("success", "storage", `Nạp ${file.name} (${entityType}) vào core structures.`);
        return { success: total - 6, skipped: 4, duplicates: 2, errors: 0, total };
      },
      800,
      1400,
    ),
  getArchitectureStats: () => call(() => getCore().dashboard().dsaHealth),
  resetDemoData: () =>
    call(
      () => {
        getCore().load();
        return true;
      },
      400,
      800,
    ),
  ping: () =>
    call(() => ({ ok: true, latencyMs: Math.round(280 + Math.random() * 220) }), 200, 500),
};

export type { Order, Product };
