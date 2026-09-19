/**
 * Kiểu dữ liệu dùng chung cho hệ thống Quản lý kho.
 * Đây là hợp đồng (contract) giữa Presentation Layer và Core DSA Layer.
 */

export type Priority = "urgent" | "high" | "normal";
export type OrderStatus = "queued" | "processing" | "completed" | "cancelled";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  reorderLevel: number;
  status: StockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  sku: string;
  delta: number;
  stockAfter: number;
  reason: "inbound" | "outbound" | "adjustment";
  note?: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
}

export interface Order {
  id: string;
  orderCode: string;
  priority: Priority;
  priorityValue: 1 | 2 | 3;
  sequenceNumber: number;
  items: OrderItem[];
  totalQuantity: number;
  status: OrderStatus;
  note?: string;
  createdAt: string;
  processedAt?: string;
}

export interface BenchmarkPoint {
  operation: "hash_lookup" | "heap_extract" | "trie_prefix" | "initial_load";
  datasetSize: number;
  iterations: number;
  dsaMeanMs: number;
  baselineMeanMs: number;
  medianMs?: number;
  p95Ms?: number;
  measuredAt: string;
  mode: "live";
}

export interface RecentUpdate {
  productId: string;
  sku: string;
  name: string;
  delta: number;
  stockAfter: number;
  updatedAt: string;
}

export interface DashboardSummary {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  pendingOrders: number;
  urgentOrders: number;
  productsAddedThisMonth: number;
  inboundToday: number;
  dsaHealth: {
    hashKeys: number;
    hashLoadFactor: number;
    heapNodes: number;
    heapNext: string;
    trieTerms: number;
    trieMaxDepth: number;
    recentUsed: number;
    recentCapacity: number;
  };
}

export interface QueueSummary {
  urgent: number;
  high: number;
  normal: number;
  avgWaitMinutes: Record<Priority, number>;
}

export interface HeapNodeView {
  index: number;
  orderCode: string;
  priority: Priority;
  priorityValue: number;
  sequenceNumber: number;
}

export interface HeapSnapshot {
  nodes: HeapNodeView[];
  size: number;
}

export interface OperationLogEntry {
  id: string;
  at: string;
  level: "info" | "success" | "warning" | "error";
  source: string;
  message: string;
}

export interface LookupTrace {
  input: string;
  hashValue: number;
  bucketIndex: number;
  comparisons: number;
  elapsedMs: number;
  complexity: string;
  found: boolean;
}

export interface HashBucketView {
  index: number;
  entries: { sku: string; name: string }[];
}

export interface TrieNodeView {
  id: string;
  parentId: string | null;
  char: string;
  depth: number;
  isWord: boolean;
  onPath: boolean;
}

export interface TrieSnapshot {
  nodes: TrieNodeView[];
  suggestions: { sku: string; name: string }[];
  prefixLength: number;
  matches: number;
}

export interface HealthStatus {
  coreApiUrl: string;
  connected: boolean;
  mode: "live";
  storageType: string;
  lastLoadAt: string;
  productCount: number;
  orderCount: number;
  heapSize: number;
  trieTerms: number;
  recentCapacity: number;
  latencyMs: number;
}
