/**
 * CORE DSA LAYER — cài đặt thuần các cấu trúc dữ liệu.
 * Tầng này KHÔNG phụ thuộc React và không dùng Array.sort/find để thay thế
 * thuật toán lõi. Presentation Layer chỉ gọi xuống thông qua API adapter.
 */

/* ------------------------------------------------------------------ */
/* Hash Table (separate chaining) — MC1: tra cứu chính xác theo mã      */
/* ------------------------------------------------------------------ */

export interface HashLookupResult<T> {
  value: T | null;
  hashValue: number;
  bucketIndex: number;
  comparisons: number;
}

export class HashTable<T> {
  private buckets: { key: string; value: T }[][];
  private count = 0;

  constructor(private capacity = 64) {
    this.buckets = Array.from({ length: capacity }, () => []);
  }

  /** djb2 hash */
  hash(key: string): number {
    let h = 5381;
    for (let i = 0; i < key.length; i++) {
      h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
    }
    return h;
  }

  private indexOfKey(key: string): number {
    return this.hash(key) % this.capacity;
  }

  set(key: string, value: T): void {
    const idx = this.indexOfKey(key);
    const chain = this.buckets[idx];
    for (let i = 0; i < chain.length; i++) {
      if (chain[i].key === key) {
        chain[i].value = value;
        return;
      }
    }
    chain.push({ key, value });
    this.count++;
    if (this.count / this.capacity > 0.85) this.rehash();
  }

  private rehash() {
    const old = this.buckets;
    this.capacity *= 2;
    this.buckets = Array.from({ length: this.capacity }, () => []);
    this.count = 0;
    for (const chain of old) {
      for (const entry of chain) this.set(entry.key, entry.value);
    }
  }

  get(key: string): HashLookupResult<T> {
    const hashValue = this.hash(key);
    const bucketIndex = hashValue % this.capacity;
    const chain = this.buckets[bucketIndex];
    let comparisons = 0;
    for (const entry of chain) {
      comparisons++;
      if (entry.key === key) {
        return { value: entry.value, hashValue, bucketIndex, comparisons };
      }
    }
    return { value: null, hashValue, bucketIndex, comparisons };
  }

  delete(key: string): boolean {
    const idx = this.indexOfKey(key);
    const chain = this.buckets[idx];
    for (let i = 0; i < chain.length; i++) {
      if (chain[i].key === key) {
        chain.splice(i, 1);
        this.count--;
        return true;
      }
    }
    return false;
  }

  get size(): number {
    return this.count;
  }

  get loadFactor(): number {
    return this.count / this.capacity;
  }

  get bucketCount(): number {
    return this.capacity;
  }

  bucketAt(index: number): { key: string; value: T }[] {
    return this.buckets[index] ?? [];
  }

  values(): T[] {
    const out: T[] = [];
    for (const chain of this.buckets) for (const e of chain) out.push(e.value);
    return out;
  }
}

/* ------------------------------------------------------------------ */
/* Priority Heap — MC2 + TP1 (tie-break FIFO bằng sequenceNumber)       */
/* ------------------------------------------------------------------ */

export interface HeapItem {
  orderCode: string;
  priorityValue: number; // 3 = urgent, 2 = high, 1 = normal
  sequenceNumber: number;
}

/**
 * So sánh: ưu tiên cao hơn đứng trước; nếu bằng nhau thì sequence nhỏ hơn
 * đứng trước (đơn tạo trước xử lý trước — FIFO trong cùng mức ưu tiên).
 */
export function compareOrders(a: HeapItem, b: HeapItem): number {
  if (a.priorityValue !== b.priorityValue) return b.priorityValue - a.priorityValue;
  return a.sequenceNumber - b.sequenceNumber;
}

export class PriorityHeap<T extends HeapItem> {
  private heap: T[] = [];

  get size(): number {
    return this.heap.length;
  }

  toArray(): T[] {
    return this.heap.slice();
  }

  peek(): T | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  insert(item: T): number {
    this.heap.push(item);
    let i = this.heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (compareOrders(this.heap[i], this.heap[parent]) < 0) {
        this.swap(i, parent);
        i = parent;
      } else break;
    }
    return i;
  }

  extract(): T | null {
    if (this.heap.length === 0) return null;
    const root = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.heapifyDown(0);
    }
    return root;
  }

  /** Trả về top-k phần tử theo đúng thứ tự xử lý (không phá heap gốc). */
  topK(k: number): T[] {
    const clone = new PriorityHeap<T>();
    for (const item of this.heap) clone.insert(item);
    const out: T[] = [];
    for (let i = 0; i < k; i++) {
      const next = clone.extract();
      if (!next) break;
      out.push(next);
    }
    return out;
  }

  remove(orderCode: string): boolean {
    const idx = this.heap.findIndex((n) => n.orderCode === orderCode);
    if (idx < 0) return false;
    const last = this.heap.pop()!;
    if (idx < this.heap.length) {
      this.heap[idx] = last;
      this.heapifyDown(idx);
    }
    return true;
  }

  private heapifyDown(start: number) {
    let i = start;
    const n = this.heap.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let best = i;
      if (l < n && compareOrders(this.heap[l], this.heap[best]) < 0) best = l;
      if (r < n && compareOrders(this.heap[r], this.heap[best]) < 0) best = r;
      if (best === i) break;
      this.swap(i, best);
      i = best;
    }
  }

  private swap(a: number, b: number) {
    const tmp = this.heap[a];
    this.heap[a] = this.heap[b];
    this.heap[b] = tmp;
  }
}

/* ------------------------------------------------------------------ */
/* Trie — TP2: gợi ý theo tiền tố                                       */
/* ------------------------------------------------------------------ */

export interface TrieEntry {
  sku: string;
  name: string;
}

export class TrieNode {
  children = new Map<string, TrieNode>();
  entries: TrieEntry[] = [];
  isWord = false;
  constructor(
    public char: string,
    public depth: number,
    public parent: TrieNode | null,
  ) {}
}

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export class Trie {
  root = new TrieNode("", 0, null);
  private termCount = 0;
  private depthMax = 0;

  insert(word: string, entry: TrieEntry): void {
    const key = normalize(word);
    let node = this.root;
    for (const ch of key) {
      let next = node.children.get(ch);
      if (!next) {
        next = new TrieNode(ch, node.depth + 1, node);
        node.children.set(ch, next);
      }
      node = next;
      if (node.depth > this.depthMax) this.depthMax = node.depth;
    }
    node.isWord = true;
    node.entries.push(entry);
    this.termCount++;
  }

  /** Chèn từng từ của một chuỗi để hỗ trợ tìm theo tiền tố bất kỳ từ nào. */
  insertAllWords(text: string, entry: TrieEntry): void {
    for (const word of normalize(text).split(/[\s\-_/]+/)) {
      if (word) this.insert(word, entry);
    }
  }

  findNode(prefix: string): TrieNode | null {
    let node = this.root;
    for (const ch of normalize(prefix)) {
      const next = node.children.get(ch);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  search(prefix: string, limit = 8): TrieEntry[] {
    const start = this.findNode(prefix);
    if (!start) return [];
    const out: TrieEntry[] = [];
    const seen = new Set<string>();
    const stack: TrieNode[] = [start];
    while (stack.length > 0 && out.length < limit) {
      const node = stack.pop()!;
      if (node.isWord) {
        for (const e of node.entries) {
          if (!seen.has(e.sku)) {
            seen.add(e.sku);
            out.push(e);
            if (out.length >= limit) break;
          }
        }
      }
      const kids = Array.from(node.children.values());
      for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
    }
    return out;
  }

  get terms(): number {
    return this.termCount;
  }

  get maxDepth(): number {
    return this.depthMax;
  }
}

/* ------------------------------------------------------------------ */
/* Doubly Linked List + Hash Map — TP3: sản phẩm vừa cập nhật           */
/* ------------------------------------------------------------------ */

export class DllNode<T> {
  prev: DllNode<T> | null = null;
  next: DllNode<T> | null = null;
  constructor(
    public key: string,
    public value: T,
  ) {}
}

export class RecentList<T> {
  private head: DllNode<T> | null = null;
  private tail: DllNode<T> | null = null;
  private map = new Map<string, DllNode<T>>();
  private count = 0;
  lastEvicted: string | null = null;
  lastMovedToFront = false;

  constructor(public capacity = 6) {}

  /** O(1): nếu key đã tồn tại thì detach + move-to-front, ngược lại chèn HEAD. */
  push(key: string, value: T): void {
    this.lastEvicted = null;
    this.lastMovedToFront = false;
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.detach(existing);
      this.attachFront(existing);
      this.lastMovedToFront = true;
      return;
    }
    const node = new DllNode(key, value);
    this.map.set(key, node);
    this.attachFront(node);
    this.count++;
    if (this.count > this.capacity && this.tail) {
      const evicted = this.tail;
      this.detach(evicted);
      this.map.delete(evicted.key);
      this.count--;
      this.lastEvicted = evicted.key;
    }
  }

  private attachFront(node: DllNode<T>) {
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private detach(node: DllNode<T>) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
    node.prev = null;
    node.next = null;
  }

  toArray(): T[] {
    const out: T[] = [];
    let node = this.head;
    while (node) {
      out.push(node.value);
      node = node.next;
    }
    return out;
  }

  positions(): { key: string; position: number }[] {
    const out: { key: string; position: number }[] = [];
    let node = this.head;
    let i = 0;
    while (node) {
      out.push({ key: node.key, position: i++ });
      node = node.next;
    }
    return out;
  }

  get size(): number {
    return this.count;
  }
}
