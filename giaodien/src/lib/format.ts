import type { Priority, StockStatus } from "@/core/types";

export const nf = new Intl.NumberFormat("vi-VN");

export function formatNumber(value: number): string {
  return nf.format(value);
}

export function formatMs(value: number): string {
  if (value < 0.01) return `${(value * 1000).toFixed(1)} µs`;
  return `${value.toFixed(value < 1 ? 3 : 2)} ms`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

export function waitingTime(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} phút`;
  return `${Math.floor(mins / 60)} giờ ${mins % 60} phút`;
}

// Sinh mã đơn đúng định dạng dữ liệu thật (ORD-XXXXX) để tránh trùng.
export function randomOrderCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let tail = "";
  for (let i = 0; i < 5; i += 1) tail += chars[Math.floor(Math.random() * chars.length)];
  return `ORD-${tail}`;
}

export const priorityLabel: Record<Priority, string> = {
  urgent: "Gấp",
  high: "Cao",
  normal: "Thường",
};

export const statusLabel: Record<StockStatus, string> = {
  in_stock: "Còn hàng",
  low_stock: "Sắp hết",
  out_of_stock: "Hết hàng",
};

export const operationLabel: Record<string, string> = {
  hash_lookup: "Tra cứu theo mã",
  heap_extract: "Lấy đơn ưu tiên",
  trie_prefix: "Tìm theo tiền tố",
  initial_load: "Sắp xếp Merge Sort",
};
