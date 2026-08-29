import {
  HashTable,
  PriorityHeap,
  RecentList,
  Trie,
  compareOrders,
  normalize,
  type HeapItem,
} from "./structures";
import {
  benchmarkHistory,
  orders as orderSeed,
  products as productSeed,
  recentSeed,
  stockMovements,
} from "./dataset";
import type {
  BenchmarkPoint,
  DashboardSummary,
  HashBucketView,
  HealthStatus,
  HeapSnapshot,
  LookupTrace,
  Order,
  OperationLogEntry,
  Priority,
  Product,
  QueueSummary,
  RecentUpdate,
  StockMovement,
  TrieNodeView,
  TrieSnapshot,
} from "./types";

/**
 * CORE DSA SERVICE — mô phỏng tầng lõi chạy phía backend.
 * Mọi câu trả lời nghiệp vụ đều đi qua tầng này, không dùng
 * Array.find / Array.sort / query database để thay thế thuật toán.
 */

interface HeapOrder extends HeapItem {
  order: Order;
}

class CoreService {
  productsByKey = new HashTable<Product>(64);
  ordersByCode = new HashTable<Order>(64);
  heap = new PriorityHeap<HeapOrder>();
  skuTrie = new Trie();
  nameTrie = new Trie();
  recent = new RecentList<RecentUpdate>(6);
  movements: StockMovement[] = [];
  log: OperationLogEntry[] = [];
  benchmarks: BenchmarkPoint[] = [];
  private sequenceCounter = 3290;
  private lastLoadAt = new Date().toISOString();

  constructor() {
    this.load();
  }

  load() {
    this.productsByKey = new HashTable<Product>(64);
    this.ordersByCode = new HashTable<Order>(64);
    this.heap = new PriorityHeap<HeapOrder>();
    this.skuTrie = new Trie();
    this.nameTrie = new Trie();
    this.recent = new RecentList<RecentUpdate>(6);
    this.movements = stockMovements.slice();
    this.benchmarks = benchmarkHistory.slice();
    this.log = [];

    for (const p of productSeed) {
      const copy = { ...p };
      this.productsByKey.set(copy.sku, copy);
      this.skuTrie.insert(copy.sku, { sku: copy.sku, name: copy.name });
      this.skuTrie.insertAllWords(copy.sku, { sku: copy.sku, name: copy.name });
      this.nameTrie.insertAllWords(copy.name, { sku: copy.sku, name: copy.name });
    }
    for (const o of orderSeed) {
      const copy = { ...o };
      this.ordersByCode.set(copy.orderCode, copy);
      this.heap.insert({
        orderCode: copy.orderCode,
        priorityValue: copy.priorityValue,
        sequenceNumber: copy.sequenceNumber,
        order: copy,
      });
    }
    for (const m of recentSeed) {
      const p = this.productsByKey.get(m.sku).value;
      if (!p) continue;
      this.recent.push(m.sku, {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        delta: m.delta,
        stockAfter: p.stock,
        updatedAt: m.createdAt,
      });
    }
    this.lastLoadAt = new Date().toISOString();
    this.pushLog("info", "core", "Đã nạp dữ liệu vào Hash Table, Heap, Trie và Recent list.");
  }

  pushLog(level: OperationLogEntry["level"], source: string, message: string) {
    this.log.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      level,
      source,
      message,
    });
    this.log = this.log.slice(0, 60);
  }

  /* ---------------- Products ---------------- */

  allProducts(): Product[] {
    const out: Product[] = [];
    for (const p of productSeed) {
      const found = this.productsByKey.get(p.sku).value;
      if (found) out.push(found);
    }
    return out;
  }

  lookupProduct(sku: string): { product: Product | null; trace: LookupTrace } {
    const start = performance.now();
    const res = this.productsByKey.get(sku.trim().toUpperCase());
    const elapsedMs = performance.now() - start;
    this.pushLog(
      res.value ? "success" : "warning",
      "hash_table",
      `Tra cứu sản phẩm "${sku}" • bucket #${res.bucketIndex}`,
    );
    return {
      product: res.value,
      trace: {
        input: sku,
        hashValue: res.hashValue,
        bucketIndex: res.bucketIndex,
        comparisons: res.comparisons,
        elapsedMs,
        complexity: "Avg O(1)",
        found: Boolean(res.value),
      },
    };
  }

  searchPrefix(prefix: string, field: "sku" | "name" | "auto" = "auto", limit = 8) {
    if (!prefix.trim()) return { entries: [], elapsedMs: 0, matches: 0 };
    const start = performance.now();
    const trie = field === "name" ? this.nameTrie : field === "sku" ? this.skuTrie : null;
    let entries = trie ? trie.search(prefix, limit) : this.skuTrie.search(prefix, limit);
    if (!trie && entries.length < limit) {
      const seen = new Set(entries.map((e) => e.sku));
      for (const e of this.nameTrie.search(prefix, limit)) {
        if (!seen.has(e.sku) && entries.length < limit) entries = entries.concat(e);
      }
    }
    const elapsedMs = performance.now() - start;
    const products = entries
      .map((e) => this.productsByKey.get(e.sku).value)
      .filter((p): p is Product => Boolean(p));
    return { entries: products, elapsedMs, matches: products.length };
  }

  updateStock(sku: string, delta: number, reason: StockMovement["reason"], note?: string) {
    const { value: product } = this.productsByKey.get(sku);
    if (!product) throw new Error(`Không tìm thấy sản phẩm ${sku}`);
    const updated: Product = {
      ...product,
      stock: Math.max(0, product.stock + delta),
      updatedAt: new Date().toISOString(),
    };
    updated.status =
      updated.stock === 0
        ? "out_of_stock"
        : updated.stock <= updated.reorderLevel
          ? "low_stock"
          : "in_stock";
    this.productsByKey.set(sku, updated);
    const movement: StockMovement = {
      id: `mov_${Date.now()}`,
      productId: updated.id,
      sku: updated.sku,
      delta,
      stockAfter: updated.stock,
      reason,
      note,
      createdAt: updated.updatedAt,
    };
    this.movements.unshift(movement);
    this.recent.push(sku, {
      productId: updated.id,
      sku: updated.sku,
      name: updated.name,
      delta,
      stockAfter: updated.stock,
      updatedAt: updated.updatedAt,
    });
    this.pushLog(
      "success",
      "recent_list",
      `Cập nhật tồn kho ${sku} (${delta > 0 ? "+" : ""}${delta}) • move-to-front O(1)`,
    );
    return {
      product: updated,
      movement,
      movedToFront: this.recent.lastMovedToFront,
      evicted: this.recent.lastEvicted,
    };
  }

  movementsOf(productId: string): StockMovement[] {
    return this.movements.filter((m) => m.productId === productId);
  }

  /* ---------------- Orders ---------------- */

  queueOrders(): Order[] {
    return this.heap.topK(this.heap.size).map((n) => n.order);
  }

  peekNext(): Order | null {
    return this.heap.peek()?.order ?? null;
  }

  nextCandidates(k: number): Order[] {
    return this.heap.topK(k).map((n) => n.order);
  }

  extractNext(): Order | null {
    const node = this.heap.extract();
    if (!node) return null;
    const processed: Order = {
      ...node.order,
      status: "completed",
      processedAt: new Date().toISOString(),
    };
    this.ordersByCode.set(processed.orderCode, processed);
    this.pushLog("success", "priority_heap", `Extract ${processed.orderCode} • heapify O(log n)`);
    return processed;
  }

  lookupOrder(orderCode: string): { order: Order | null; trace: LookupTrace } {
    const start = performance.now();
    const res = this.ordersByCode.get(orderCode.trim().toUpperCase());
    const elapsedMs = performance.now() - start;
    return {
      order: res.value,
      trace: {
        input: orderCode,
        hashValue: res.hashValue,
        bucketIndex: res.bucketIndex,
        comparisons: res.comparisons,
        elapsedMs,
        complexity: "Avg O(1)",
        found: Boolean(res.value),
      },
    };
  }

  enqueue(payload: {
    orderCode: string;
    priority: Priority;
    items: { sku: string; quantity: number }[];
    note?: string;
  }): Order {
    const priorityValue = payload.priority === "urgent" ? 3 : payload.priority === "high" ? 2 : 1;
    const items = payload.items.map((it) => {
      const p = this.productsByKey.get(it.sku).value;
      return {
        productId: p?.id ?? it.sku,
        sku: it.sku,
        name: p?.name ?? it.sku,
        quantity: it.quantity,
      };
    });
    const order: Order = {
      id: `ord_${Date.now()}`,
      orderCode: payload.orderCode,
      priority: payload.priority,
      priorityValue: priorityValue as 1 | 2 | 3,
      sequenceNumber: ++this.sequenceCounter,
      items,
      totalQuantity: items.reduce((s, it) => s + it.quantity, 0),
      status: "queued",
      note: payload.note,
      createdAt: new Date().toISOString(),
    };
    this.ordersByCode.set(order.orderCode, order);
    this.heap.insert({
      orderCode: order.orderCode,
      priorityValue: order.priorityValue,
      sequenceNumber: order.sequenceNumber,
      order,
    });
    this.pushLog(
      "success",
      "priority_heap",
      `Chèn ${order.orderCode} với sequence #${order.sequenceNumber} • O(log n)`,
    );
    return order;
  }

  heapSnapshot(): HeapSnapshot {
    const nodes = this.heap.toArray().map((n, index) => ({
      index,
      orderCode: n.order.orderCode,
      priority: n.order.priority,
      priorityValue: n.priorityValue,
      sequenceNumber: n.sequenceNumber,
    }));
    return { nodes, size: nodes.length };
  }

  queueSummary(): QueueSummary {
    let urgent = 0;
    let high = 0;
    let normal = 0;
    for (const n of this.heap.toArray()) {
      if (n.order.priority === "urgent") urgent++;
      else if (n.order.priority === "high") high++;
      else normal++;
    }
    return {
      urgent,
      high,
      normal,
      avgWaitMinutes: { urgent: 12, high: 38, normal: 126 },
    };
  }

  /* ---------------- Visualizer snapshots ---------------- */

  hashBuckets(limit = 24): HashBucketView[] {
    const out: HashBucketView[] = [];
    for (let i = 0; i < limit; i++) {
      const chain = this.productsByKey.bucketAt(i);
      out.push({ index: i, entries: chain.map((e) => ({ sku: e.value.sku, name: e.value.name })) });
    }
    return out;
  }

  trieSnapshot(prefix: string, field: "sku" | "name" = "sku"): TrieSnapshot {
    const trie = field === "name" ? this.nameTrie : this.skuTrie;
    const target = normalize(prefix);
    const nodes: TrieNodeView[] = [];
    const maxDepth = Math.max(4, target.length + 2);
    const walk = (
      node: (typeof trie)["root"],
      id: string,
      parentId: string | null,
      path: string,
    ) => {
      if (node !== trie.root) {
        nodes.push({
          id,
          parentId,
          char: node.char,
          depth: node.depth,
          isWord: node.isWord,
          onPath: target.length > 0 && (target.startsWith(path) || path.startsWith(target)),
        });
      }
      if (node.depth >= maxDepth || nodes.length > 90) return;
      for (const [ch, child] of node.children) {
        const childPath = path + ch;
        const relevant =
          target.length === 0
            ? node.depth < 2
            : childPath.startsWith(target.slice(0, childPath.length)) ||
              childPath.startsWith(target);
        if (!relevant) continue;
        walk(child, `${id}/${ch}`, id, childPath);
      }
    };
    walk(trie.root, "root", null, "");
    const suggestions = trie.search(prefix, 8);
    return { nodes, suggestions, prefixLength: target.length, matches: suggestions.length };
  }

  recentSnapshot(): {
    items: RecentUpdate[];
    map: { key: string; position: number }[];
    capacity: number;
  } {
    return {
      items: this.recent.toArray(),
      map: this.recent.positions(),
      capacity: this.recent.capacity,
    };
  }

  /* ---------------- Dashboard / health ---------------- */

  dashboard(): DashboardSummary {
    const all = this.allProducts();
    let totalStock = 0;
    let lowStock = 0;
    let productsAddedThisMonth = 0;
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const p of all) {
      totalStock += p.stock;
      if (p.status !== "in_stock") lowStock++;
      if (new Date(p.createdAt).getTime() >= monthAgo) productsAddedThisMonth++;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let inboundToday = 0;
    for (const movement of this.movements) {
      if (
        movement.reason === "inbound" &&
        new Date(movement.createdAt).getTime() >= today.getTime()
      ) {
        inboundToday += Math.max(0, movement.delta);
      }
    }
    const summary = this.queueSummary();
    const next = this.peekNext();
    return {
      totalProducts: this.productsByKey.size,
      totalStock,
      lowStockCount: lowStock,
      pendingOrders: this.heap.size,
      urgentOrders: summary.urgent,
      productsAddedThisMonth,
      inboundToday,
      dsaHealth: {
        hashKeys: this.productsByKey.size,
        hashLoadFactor: Number(this.productsByKey.loadFactor.toFixed(2)),
        heapNodes: this.heap.size,
        heapNext: next?.orderCode ?? "—",
        trieTerms: this.skuTrie.terms + this.nameTrie.terms,
        trieMaxDepth: Math.max(this.skuTrie.maxDepth, this.nameTrie.maxDepth),
        recentUsed: this.recent.size,
        recentCapacity: this.recent.capacity,
      },
    };
  }

  health(): HealthStatus {
    return {
      coreApiUrl: "http://localhost:8000/api/v1 (chưa kết nối)",
      connected: false,
      mode: "mock",
      storageType: "CSV / JSON in-memory (mock)",
      lastLoadAt: this.lastLoadAt,
      productCount: this.productsByKey.size,
      orderCount: this.ordersByCode.size,
      heapSize: this.heap.size,
      trieTerms: this.skuTrie.terms + this.nameTrie.terms,
      recentCapacity: this.recent.capacity,
      latencyMs: 412,
    };
  }

  compareExample() {
    const a = { orderCode: "ORD-A", priorityValue: 3, sequenceNumber: 3281 };
    const b = { orderCode: "ORD-B", priorityValue: 3, sequenceNumber: 3282 };
    return { a, b, winner: compareOrders(a, b) < 0 ? a.orderCode : b.orderCode };
  }
}

let instance: CoreService | null = null;

export function getCore(): CoreService {
  if (!instance) instance = new CoreService();
  return instance;
}

export type { CoreService };
