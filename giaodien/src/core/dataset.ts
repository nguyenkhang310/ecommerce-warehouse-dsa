import type { BenchmarkPoint, Order, Priority, Product, StockMovement } from "./types";

/** Dữ liệu mẫu nhất quán cho toàn bộ ứng dụng (mode "mock"). */

const BASE = new Date("2026-08-29T01:00:00Z").getTime();
const minutesAgo = (m: number) => new Date(BASE - m * 60_000).toISOString();

interface Seed {
  sku: string;
  name: string;
  category: string;
  stock: number;
  reorderLevel: number;
}

const seeds: Seed[] = [
  {
    sku: "LAP-DELL-5420",
    name: "Laptop Dell Latitude 5420",
    category: "Laptop",
    stock: 142,
    reorderLevel: 40,
  },
  {
    sku: "LAP-ASUS-A15",
    name: "Laptop Asus TUF Gaming A15",
    category: "Laptop",
    stock: 38,
    reorderLevel: 45,
  },
  {
    sku: "LAP-HP-440G9",
    name: "Laptop HP ProBook 440 G9",
    category: "Laptop",
    stock: 96,
    reorderLevel: 30,
  },
  {
    sku: "LAP-MAC-M3AIR",
    name: "Laptop MacBook Air M3 13 inch",
    category: "Laptop",
    stock: 0,
    reorderLevel: 20,
  },
  {
    sku: "KEY-LOGI-K380",
    name: "Bàn phím Bluetooth Logitech K380",
    category: "Phụ kiện",
    stock: 320,
    reorderLevel: 80,
  },
  {
    sku: "KEY-AKKO-3068",
    name: "Bàn phím cơ Akko 3068B Plus",
    category: "Phụ kiện",
    stock: 74,
    reorderLevel: 60,
  },
  {
    sku: "KEY-DARE-EK75",
    name: "Bàn phím Dareu EK75 không dây",
    category: "Phụ kiện",
    stock: 18,
    reorderLevel: 40,
  },
  {
    sku: "MOU-LOGI-MX3S",
    name: "Chuột không dây Logitech MX Master 3S",
    category: "Phụ kiện",
    stock: 210,
    reorderLevel: 60,
  },
  {
    sku: "MOU-RAZ-VIPER",
    name: "Chuột gaming Razer Viper V3",
    category: "Phụ kiện",
    stock: 47,
    reorderLevel: 50,
  },
  {
    sku: "MON-LG-27UP",
    name: "Màn hình LG 27UP850 4K USB-C",
    category: "Màn hình",
    stock: 64,
    reorderLevel: 25,
  },
  {
    sku: "MON-DELL-U2723",
    name: "Màn hình Dell UltraSharp U2723QE",
    category: "Màn hình",
    stock: 29,
    reorderLevel: 30,
  },
  {
    sku: "MON-SAM-G5",
    name: "Màn hình cong Samsung Odyssey G5",
    category: "Màn hình",
    stock: 0,
    reorderLevel: 15,
  },
  {
    sku: "PHN-IP15-128",
    name: "Điện thoại iPhone 15 128GB",
    category: "Điện thoại",
    stock: 88,
    reorderLevel: 35,
  },
  {
    sku: "PHN-SS-S24U",
    name: "Điện thoại Samsung Galaxy S24 Ultra",
    category: "Điện thoại",
    stock: 41,
    reorderLevel: 25,
  },
  {
    sku: "PHN-XIA-14T",
    name: "Điện thoại Xiaomi 14T Pro",
    category: "Điện thoại",
    stock: 133,
    reorderLevel: 40,
  },
  {
    sku: "TAB-IPAD-A11",
    name: "Máy tính bảng iPad Air 11 inch M2",
    category: "Máy tính bảng",
    stock: 57,
    reorderLevel: 20,
  },
  {
    sku: "TAB-SS-TABS9",
    name: "Máy tính bảng Samsung Tab S9 FE",
    category: "Máy tính bảng",
    stock: 22,
    reorderLevel: 25,
  },
  {
    sku: "AUD-SONY-1000",
    name: "Tai nghe chống ồn Sony WH-1000XM5",
    category: "Âm thanh",
    stock: 105,
    reorderLevel: 30,
  },
  {
    sku: "AUD-AIR-PRO2",
    name: "Tai nghe AirPods Pro thế hệ 2",
    category: "Âm thanh",
    stock: 12,
    reorderLevel: 30,
  },
  {
    sku: "AUD-JBL-GO4",
    name: "Loa di động JBL Go 4",
    category: "Âm thanh",
    stock: 264,
    reorderLevel: 70,
  },
  {
    sku: "STO-SAM-990P",
    name: "Ổ cứng SSD Samsung 990 Pro 1TB",
    category: "Lưu trữ",
    stock: 178,
    reorderLevel: 50,
  },
  {
    sku: "STO-WD-BLACK2",
    name: "Ổ cứng SSD WD Black SN770 2TB",
    category: "Lưu trữ",
    stock: 33,
    reorderLevel: 40,
  },
  {
    sku: "NET-TPL-AX55",
    name: "Router Wi-Fi 6 TP-Link Archer AX55",
    category: "Mạng",
    stock: 149,
    reorderLevel: 45,
  },
  {
    sku: "NET-UBI-U6LR",
    name: "Access Point Ubiquiti U6 Long Range",
    category: "Mạng",
    stock: 26,
    reorderLevel: 20,
  },
  {
    sku: "PRT-CAN-2900",
    name: "Máy in laser Canon LBP 2900W",
    category: "Thiết bị văn phòng",
    stock: 61,
    reorderLevel: 20,
  },
  {
    sku: "PRT-EPS-L3250",
    name: "Máy in phun màu Epson L3250",
    category: "Thiết bị văn phòng",
    stock: 9,
    reorderLevel: 18,
  },
];

function statusOf(stock: number, reorderLevel: number): Product["status"] {
  if (stock === 0) return "out_of_stock";
  if (stock <= reorderLevel) return "low_stock";
  return "in_stock";
}

export const products: Product[] = seeds.map((s, i) => ({
  id: `prd_${String(i + 1).padStart(3, "0")}`,
  sku: s.sku,
  name: s.name,
  category: s.category,
  stock: s.stock,
  reorderLevel: s.reorderLevel,
  status: statusOf(s.stock, s.reorderLevel),
  createdAt: minutesAgo(60 * 24 * (120 - i * 3)),
  updatedAt: minutesAgo(30 + i * 47),
}));

const bySku = new Map(products.map((p) => [p.sku, p]));

export const stockMovements: StockMovement[] = [
  { sku: "STO-SAM-990P", delta: 120, reason: "inbound", note: "Nhập lô NCC Digiworld", m: 4 },
  {
    sku: "KEY-LOGI-K380",
    delta: -8,
    reason: "outbound",
    note: "Xuất cho đơn ORD-2026-08337",
    m: 12,
  },
  { sku: "MON-LG-27UP", delta: 24, reason: "inbound", note: "Nhập bổ sung", m: 26 },
  { sku: "AUD-AIR-PRO2", delta: -18, reason: "outbound", note: "Xuất đơn gấp", m: 41 },
  { sku: "PHN-IP15-128", delta: 40, reason: "inbound", note: "Nhập hàng chính hãng", m: 63 },
  { sku: "STO-SAM-990P", delta: -15, reason: "outbound", note: "Xuất kho bán lẻ", m: 88 },
  { sku: "LAP-ASUS-A15", delta: -6, reason: "outbound", note: "Xuất mẫu trưng bày", m: 121 },
  { sku: "PRT-EPS-L3250", delta: -3, reason: "adjustment", note: "Kiểm kê lệch", m: 190 },
].map((r, i) => {
  const p = bySku.get(r.sku)!;
  return {
    id: `mov_${String(i + 1).padStart(3, "0")}`,
    productId: p.id,
    sku: p.sku,
    delta: r.delta,
    stockAfter: p.stock,
    reason: r.reason as StockMovement["reason"],
    note: r.note,
    createdAt: minutesAgo(r.m),
  };
});

/** 6 recent updates, mới nhất trước; STO-SAM-990P xuất hiện lại để demo move-to-front. */
export const recentSeed = stockMovements.slice(0, 6).reverse();

const priorityValue: Record<Priority, 1 | 2 | 3> = { normal: 1, high: 2, urgent: 3 };

interface OrderSeed {
  code: string;
  priority: Priority;
  seq: number;
  minutes: number;
  items: [string, number][];
}

const orderSeeds: OrderSeed[] = [
  {
    code: "ORD-2026-08341",
    priority: "urgent",
    seq: 3281,
    minutes: 18,
    items: [
      ["LAP-DELL-5420", 4],
      ["MOU-LOGI-MX3S", 6],
    ],
  },
  {
    code: "ORD-2026-08342",
    priority: "urgent",
    seq: 3282,
    minutes: 16,
    items: [["PHN-IP15-128", 2]],
  },
  {
    code: "ORD-2026-08331",
    priority: "urgent",
    seq: 3283,
    minutes: 15,
    items: [
      ["AUD-SONY-1000", 3],
      ["KEY-AKKO-3068", 2],
    ],
  },
  {
    code: "ORD-2026-08350",
    priority: "urgent",
    seq: 3290,
    minutes: 9,
    items: [["MON-LG-27UP", 1]],
  },
  {
    code: "ORD-2026-08329",
    priority: "high",
    seq: 3271,
    minutes: 42,
    items: [["STO-SAM-990P", 10]],
  },
  {
    code: "ORD-2026-08330",
    priority: "high",
    seq: 3272,
    minutes: 40,
    items: [
      ["KEY-LOGI-K380", 12],
      ["MOU-RAZ-VIPER", 4],
    ],
  },
  {
    code: "ORD-2026-08333",
    priority: "high",
    seq: 3275,
    minutes: 36,
    items: [["TAB-IPAD-A11", 3]],
  },
  {
    code: "ORD-2026-08336",
    priority: "high",
    seq: 3278,
    minutes: 30,
    items: [["NET-TPL-AX55", 8]],
  },
  {
    code: "ORD-2026-08344",
    priority: "high",
    seq: 3285,
    minutes: 14,
    items: [
      ["PRT-CAN-2900", 2],
      ["STO-WD-BLACK2", 5],
    ],
  },
  {
    code: "ORD-2026-08301",
    priority: "normal",
    seq: 3240,
    minutes: 180,
    items: [["AUD-JBL-GO4", 20]],
  },
  {
    code: "ORD-2026-08302",
    priority: "normal",
    seq: 3241,
    minutes: 176,
    items: [["MOU-LOGI-MX3S", 3]],
  },
  {
    code: "ORD-2026-08305",
    priority: "normal",
    seq: 3244,
    minutes: 168,
    items: [
      ["PHN-XIA-14T", 4],
      ["AUD-AIR-PRO2", 2],
    ],
  },
  {
    code: "ORD-2026-08309",
    priority: "normal",
    seq: 3248,
    minutes: 150,
    items: [["LAP-HP-440G9", 6]],
  },
  {
    code: "ORD-2026-08312",
    priority: "normal",
    seq: 3251,
    minutes: 142,
    items: [["MON-DELL-U2723", 2]],
  },
  {
    code: "ORD-2026-08315",
    priority: "normal",
    seq: 3254,
    minutes: 130,
    items: [["KEY-DARE-EK75", 9]],
  },
  {
    code: "ORD-2026-08318",
    priority: "normal",
    seq: 3257,
    minutes: 121,
    items: [["NET-UBI-U6LR", 4]],
  },
  {
    code: "ORD-2026-08320",
    priority: "normal",
    seq: 3259,
    minutes: 115,
    items: [["TAB-SS-TABS9", 5]],
  },
  {
    code: "ORD-2026-08322",
    priority: "normal",
    seq: 3261,
    minutes: 108,
    items: [["STO-WD-BLACK2", 7]],
  },
  {
    code: "ORD-2026-08324",
    priority: "normal",
    seq: 3263,
    minutes: 99,
    items: [["PRT-EPS-L3250", 1]],
  },
  {
    code: "ORD-2026-08326",
    priority: "normal",
    seq: 3265,
    minutes: 92,
    items: [
      ["AUD-SONY-1000", 2],
      ["MOU-RAZ-VIPER", 2],
    ],
  },
  {
    code: "ORD-2026-08327",
    priority: "normal",
    seq: 3266,
    minutes: 88,
    items: [["LAP-ASUS-A15", 1]],
  },
  {
    code: "ORD-2026-08328",
    priority: "normal",
    seq: 3267,
    minutes: 84,
    items: [["PHN-SS-S24U", 3]],
  },
  {
    code: "ORD-2026-08332",
    priority: "normal",
    seq: 3274,
    minutes: 70,
    items: [["KEY-AKKO-3068", 6]],
  },
  {
    code: "ORD-2026-08334",
    priority: "normal",
    seq: 3276,
    minutes: 66,
    items: [["MON-SAM-G5", 2]],
  },
  {
    code: "ORD-2026-08335",
    priority: "normal",
    seq: 3277,
    minutes: 60,
    items: [["AUD-JBL-GO4", 15]],
  },
  {
    code: "ORD-2026-08337",
    priority: "normal",
    seq: 3279,
    minutes: 55,
    items: [["KEY-LOGI-K380", 8]],
  },
  {
    code: "ORD-2026-08338",
    priority: "normal",
    seq: 3280,
    minutes: 50,
    items: [["STO-SAM-990P", 4]],
  },
  {
    code: "ORD-2026-08343",
    priority: "normal",
    seq: 3284,
    minutes: 24,
    items: [["NET-TPL-AX55", 3]],
  },
  {
    code: "ORD-2026-08345",
    priority: "normal",
    seq: 3286,
    minutes: 20,
    items: [["LAP-MAC-M3AIR", 1]],
  },
  {
    code: "ORD-2026-08346",
    priority: "normal",
    seq: 3287,
    minutes: 17,
    items: [["MOU-LOGI-MX3S", 10]],
  },
  {
    code: "ORD-2026-08347",
    priority: "normal",
    seq: 3288,
    minutes: 13,
    items: [["TAB-IPAD-A11", 2]],
  },
  {
    code: "ORD-2026-08348",
    priority: "normal",
    seq: 3289,
    minutes: 11,
    items: [
      ["PRT-CAN-2900", 1],
      ["AUD-JBL-GO4", 6],
    ],
  },
];

export const orders: Order[] = orderSeeds.map((s, i) => {
  const items = s.items.map(([sku, quantity]) => {
    const p = bySku.get(sku)!;
    return { productId: p.id, sku: p.sku, name: p.name, quantity };
  });
  return {
    id: `ord_${String(i + 1).padStart(3, "0")}`,
    orderCode: s.code,
    priority: s.priority,
    priorityValue: priorityValue[s.priority],
    sequenceNumber: s.seq,
    items,
    totalQuantity: items.reduce((sum, it) => sum + it.quantity, 0),
    status: "queued",
    createdAt: minutesAgo(s.minutes),
  };
});

export const benchmarkHistory: BenchmarkPoint[] = (
  [
    [
      "hash_lookup",
      [
        [1000, 0.0021, 0.42],
        [5000, 0.0023, 2.05],
        [10000, 0.0024, 4.12],
        [50000, 0.0027, 20.8],
      ],
    ],
    [
      "heap_extract",
      [
        [1000, 0.0061, 0.38],
        [5000, 0.0072, 1.92],
        [10000, 0.0079, 3.87],
        [50000, 0.0094, 19.4],
      ],
    ],
    [
      "trie_prefix",
      [
        [1000, 0.0125, 0.66],
        [5000, 0.0138, 3.24],
        [10000, 0.0146, 6.51],
        [50000, 0.0171, 32.6],
      ],
    ],
    [
      "initial_load",
      [
        [1000, 3.2, 4.1],
        [5000, 17.4, 22.6],
        [10000, 36.8, 48.9],
        [50000, 198.2, 271.4],
      ],
    ],
  ] as [BenchmarkPoint["operation"], [number, number, number][]][]
).flatMap(([operation, rows]) =>
  rows.map(([datasetSize, dsaMeanMs, baselineMeanMs]) => ({
    operation,
    datasetSize,
    iterations: 1000,
    dsaMeanMs,
    baselineMeanMs,
    medianMs: dsaMeanMs * 0.94,
    p95Ms: dsaMeanMs * 1.32,
    measuredAt: minutesAgo(240),
    mode: "mock" as const,
  })),
);
