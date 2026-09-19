import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Database,
  Download,
  MoreHorizontal,
  PackagePlus,
  PackageSearch,
  Search,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/PageHeader";
import { ComplexityChip, StockStatusBadge } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/common/states";
import { Pagination } from "@/components/common/Pagination";
import { WhyPopover } from "@/components/common/WhyPopover";
import { inventoryApi } from "@/services/api";
import { formatDateTime, formatMs, formatNumber, relativeTime, statusLabel } from "@/lib/format";
import type { Product, StockMovement } from "@/core/types";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Sản phẩm — Quản lý kho" },
      {
        name: "description",
        content: "Tra cứu sản phẩm bằng bảng băm và cây tiền tố.",
      },
      { property: "og:title", content: "Sản phẩm — Quản lý kho" },
      {
        property: "og:description",
        content: "Tra cứu sản phẩm bằng cấu trúc dữ liệu.",
      },
    ],
  }),
  component: ProductsPage,
});

type SearchMode = "auto" | "exact" | "prefix";

function highlight(text: string, prefix: string) {
  if (!prefix) return text;
  const idx = text.toLowerCase().indexOf(prefix.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/12 px-0.5 font-semibold text-primary">
        {text.slice(idx, idx + prefix.length)}
      </mark>
      {text.slice(idx + prefix.length)}
    </>
  );
}

function SmartSearch({ onSelect }: { onSelect: (sku: string) => void }) {
  const [mode, setMode] = useState<SearchMode>("auto");
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 220);
    return () => clearTimeout(id);
  }, [term]);

  const isExact =
    mode === "exact" ||
    (mode === "auto" && /^[A-Z]{3}-[A-Z0-9]+-[A-Z0-9]+$/i.test(debounced.trim()));

  const prefixQuery = useQuery({
    queryKey: ["prefix", debounced],
    queryFn: () => inventoryApi.searchProductsByPrefix(debounced, "auto"),
    enabled: debounced.trim().length > 0 && !isExact,
  });

  const exactQuery = useQuery({
    queryKey: ["exact", debounced],
    queryFn: () => inventoryApi.lookupProductExact(debounced),
    enabled: debounced.trim().length > 0 && isExact,
  });

  const results: Product[] = isExact
    ? exactQuery.data?.product
      ? [exactQuery.data.product]
      : []
    : (prefixQuery.data?.entries ?? []);

  const loading = isExact ? exactQuery.isFetching : prefixQuery.isFetching;
  const error = isExact ? exactQuery.isError : prefixQuery.isError;

  const footer = isExact
    ? `Tra cứu bằng bảng băm • trung bình O(1)${exactQuery.data ? ` • ngăn #${exactQuery.data.trace.bucketIndex} • ${formatMs(exactQuery.data.trace.elapsedMs)}` : ""}`
    : `Kết quả từ cây tiền tố • O(k + m)${prefixQuery.data ? ` • ${prefixQuery.data.matches} kết quả • ${formatMs(prefixQuery.data.elapsedMs)}` : ""}`;

  return (
    <section className="surface-card p-4 sm:p-5" aria-label="Tìm kiếm thông minh">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div
          className="inline-flex h-11 items-center rounded-xl border border-border bg-muted p-1"
          role="group"
          aria-label="Chế độ tìm kiếm"
        >
          {(
            [
              ["auto", "Tự động"],
              ["exact", "Chính xác"],
              ["prefix", "Tiền tố"],
            ] as [SearchMode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative min-w-0">
          <Search
            className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setOpen(true);
              setCursor(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(results.length - 1, c + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(0, c - 1));
              } else if (e.key === "Enter" && results[cursor]) {
                onSelect(results[cursor].sku);
                setOpen(false);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            className="h-11 pl-9 text-base"
            placeholder="Nhập SKU hoặc tên, ví dụ: LAP, KEY, Bàn phím…"
            aria-label="Tìm sản phẩm"
            aria-expanded={open}
          />

          {open && debounced.trim().length > 0 ? (
            <div className="absolute inset-x-0 top-[52px] z-20 overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-pop)]">
              {loading ? (
                <div className="p-3">
                  <LoadingBlock rows={3} />
                </div>
              ) : error ? (
                <div className="p-3">
                  <ErrorState
                    onRetry={() => (isExact ? exactQuery.refetch() : prefixQuery.refetch())}
                  />
                </div>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Không có sản phẩm nào khớp “{debounced}”. Thử rút ngắn tiền tố.
                </p>
              ) : (
                <ul role="listbox" className="max-h-80 overflow-auto">
                  {results.map((p, i) => (
                    <li key={p.sku}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === cursor}
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => {
                          onSelect(p.sku);
                          setOpen(false);
                        }}
                        className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left ${
                          i === cursor ? "bg-muted" : ""
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {highlight(p.sku, debounced)}
                          </span>
                          <span className="block truncate text-sm font-medium">
                            {highlight(p.name, debounced)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.category}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-sm tnum">{formatNumber(p.stock)}</span>
                          <StockStatusBadge status={p.status} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="border-t border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
                {footer}
              </p>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ComplexityChip>Bảng băm • Trung bình O(1)</ComplexityChip>
        <ComplexityChip tone="cyan">Cây tiền tố • O(k + m)</ComplexityChip>
        <WhyPopover
          structure={isExact ? "Bảng băm" : "Cây tiền tố"}
          comparisonKey={isExact ? "băm(SKU) → ngăn" : "đường dẫn tiền tố → cây con"}
          complexity={isExact ? "Trung bình O(1)" : "O(k + m)"}
          explanation={
            isExact
              ? "Tra cứu trực tiếp theo SKU trong bảng băm."
              : "Duyệt theo từng ký tự tiền tố, không quét toàn bộ."
          }
        />
      </div>
    </section>
  );
}

function StockDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState<StockMovement["reason"]>("inbound");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      inventoryApi.updateStock(product!.sku, {
        delta: Number(delta),
        reason,
        note: note || undefined,
      }),
    onSuccess: () => {
      toast.success("Đã cập nhật tồn kho.");
      void qc.invalidateQueries();
      onOpenChange(false);
      setDelta("0");
      setNote("");
    },
    onError: () => toast.error("Cập nhật thất bại. Vui lòng thử lại."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
          <DialogDescription>
            {product
              ? `${product.name} • ${product.sku} • tồn hiện tại ${formatNumber(product.stock)}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="delta">Số lượng thay đổi</Label>
            <Input
              id="delta"
              inputMode="numeric"
              value={delta}
              onChange={(e) => {
                setDelta(e.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(error)}
            />
            <p className="text-xs text-muted-foreground">Số dương là nhập kho · Số âm là xuất kho.</p>
            {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Lý do</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as StockMovement["reason"])}>
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inbound">Nhập kho</SelectItem>
                <SelectItem value="outbound">Xuất kho</SelectItem>
                <SelectItem value="adjustment">Điều chỉnh kiểm kê</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: nhập lô từ NCC Digiworld"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            disabled={mutation.isPending || !product}
            onClick={() => {
              const value = Number(delta);
              if (!Number.isFinite(value) || value === 0) {
                setError("Số lượng thay đổi phải là số khác 0.");
                return;
              }
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateProductDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "Phụ kiện",
    stock: "0",
    reorderLevel: "10",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () =>
      inventoryApi.createProduct({
        sku: form.sku.trim().toUpperCase(),
        name: form.name.trim(),
        category: form.category,
        stock: Number(form.stock),
        reorderLevel: Number(form.reorderLevel),
      }),
    onSuccess: (p) => {
      toast.success(`Đã thêm ${p.sku}.`);
      void qc.invalidateQueries();
      onOpenChange(false);
      setForm({ sku: "", name: "", category: "Phụ kiện", stock: "0", reorderLevel: "10" });
    },
  });

  const submit = () => {
    const next: Record<string, string> = {};
    if (!form.sku.trim()) next.sku = "Vui lòng nhập SKU.";
    if (!form.name.trim()) next.name = "Vui lòng nhập tên sản phẩm.";
    if (!Number.isFinite(Number(form.stock))) next.stock = "Tồn kho phải là số.";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm sản phẩm</DialogTitle>
          <DialogDescription>Chèn vào bảng băm và cây tiền tố.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="VD: KEY-LOGI-K380"
            />
            {errors.sku ? <p className="text-xs text-destructive">{errors.sku}</p> : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pname">Tên sản phẩm</Label>
            <Input
              id="pname"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock">Tồn kho ban đầu</Label>
            <Input
              id="stock"
              inputMode="numeric"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
            {errors.stock ? <p className="text-xs text-destructive">{errors.stock}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reorder">Ngưỡng cảnh báo</Label>
            <Input
              id="reorder"
              inputMode="numeric"
              value={form.reorderLevel}
              onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Đang thêm…" : "Thêm sản phẩm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductsPage() {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailSku, setDetailSku] = useState<string | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const pageSize = 8;

  const products = useQuery({
    queryKey: ["products", category, status],
    queryFn: () => inventoryApi.getProducts({ category, status }),
  });

  const detail = useQuery({
    queryKey: ["product-detail", detailSku],
    queryFn: () => inventoryApi.getProduct(detailSku!),
    enabled: Boolean(detailSku),
  });

  const categories = useMemo(() => {
    const set = new Set((products.data ?? []).map((p) => p.category));
    return Array.from(set);
  }, [products.data]);

  const rows = products.data ?? [];
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const exportProducts = () => {
    const exported = selected.length ? rows.filter((product) => selected.includes(product.sku)) : rows;
    const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const contents = [
      "sku,name,category,stock,reorder_level,status",
      ...exported.map((product) =>
        [
          product.sku,
          product.name,
          product.category,
          product.stock,
          product.reorderLevel,
          product.status,
        ]
          .map(quote)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "san_pham.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${exported.length} dòng ra tệp CSV.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục sản phẩm"
        description="Tra cứu bằng bảng băm và cây tiền tố."
        actions={
          <>
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <PackagePlus className="h-4 w-4" aria-hidden />
              Thêm sản phẩm
            </Button>
            <Button variant="outline" asChild className="hidden gap-1.5 sm:inline-flex">
              <Link to="/system">
                <Database className="h-4 w-4" aria-hidden />
                Nguồn dữ liệu
              </Link>
            </Button>
            <Button
              variant="outline"
              className="hidden gap-1.5 sm:inline-flex"
              onClick={() => setStockTarget(rows[0] ?? null)}
              disabled={rows.length === 0}
            >
              <Warehouse className="h-4 w-4" aria-hidden />
              Cập nhật tồn kho
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1.5 sm:hidden">
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                  Thao tác khác
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/system">
                    <Database className="h-4 w-4" aria-hidden />
                    Nguồn dữ liệu
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={rows.length === 0}
                  onSelect={() => setStockTarget(rows[0] ?? null)}
                >
                  <Warehouse className="h-4 w-4" aria-hidden />
                  Cập nhật tồn kho
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <SmartSearch onSelect={(sku) => setDetailSku(sku)} />

      <section className="surface-card overflow-hidden">
        <div className="grid grid-cols-1 gap-3 border-b border-border p-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[190px]" aria-label="Lọc theo danh mục">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[170px]" aria-label="Lọc theo trạng thái">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="in_stock">Còn hàng</SelectItem>
                <SelectItem value="low_stock">Sắp hết</SelectItem>
                <SelectItem value="out_of_stock">Hết hàng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selected.length > 0 ? (
              <Badge variant="outline" className="tnum">
                Đã chọn {selected.length}
              </Badge>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={selected.length === 0}
              onClick={() => {
                const first = rows.find((p) => p.sku === selected[0]) ?? null;
                setStockTarget(first);
              }}
            >
              Cập nhật tồn kho
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={exportProducts}
            >
              <Download className="h-4 w-4" aria-hidden />
              Xuất danh sách
            </Button>
          </div>
        </div>

        {products.isPending ? (
          <div className="p-4">
            <LoadingBlock rows={6} />
          </div>
        ) : products.isError ? (
          <div className="p-4">
            <ErrorState onRetry={() => products.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={PackageSearch}
              title="Chưa có sản phẩm nào khớp bộ lọc"
              description="Đổi bộ lọc hoặc xem lại nguồn dữ liệu."
              action={
                <Button asChild>
                  <Link to="/system">Mở dữ liệu & hệ thống</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Chọn tất cả"
                        checked={selected.length === pageRows.length && pageRows.length > 0}
                        onCheckedChange={(v) => setSelected(v ? pageRows.map((p) => p.sku) : [])}
                      />
                    </TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead className="text-right">Tồn kho</TableHead>
                    <TableHead className="text-right">Ngưỡng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((p) => (
                    <TableRow
                      key={p.sku}
                      className="cursor-pointer"
                      onClick={() => setDetailSku(p.sku)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Chọn ${p.sku}`}
                          checked={selected.includes(p.sku)}
                          onCheckedChange={(v) =>
                            setSelected((s) => (v ? [...s, p.sku] : s.filter((x) => x !== p.sku)))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{p.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.category}</TableCell>
                      <TableCell className="text-right font-semibold tnum">
                        {formatNumber(p.stock)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tnum">
                        {p.reorderLevel}
                      </TableCell>
                      <TableCell>
                        <StockStatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {relativeTime(p.updatedAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label={`Thao tác với ${p.sku}`}>
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setDetailSku(p.sku)}>
                              Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setStockTarget(p)}>
                              Điều chỉnh tồn kho
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {pageRows.map((p) => (
                <li key={p.sku}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left"
                    onClick={() => setDetailSku(p.sku)}
                  >
                    <p className="font-medium">{p.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <StockStatusBadge status={p.status} />
                      <span className="tnum">Tồn {formatNumber(p.stock)}</span>
                      <span className="text-muted-foreground">{p.category}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <Pagination
              from={(page - 1) * pageSize + 1}
              to={Math.min(page * pageSize, rows.length)}
              total={rows.length}
              unit="sản phẩm"
              page={page}
              pageCount={pageCount}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
            />
          </>
        )}
      </section>

      <Sheet open={Boolean(detailSku)} onOpenChange={(v) => !v && setDetailSku(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{detail.data?.product.name ?? "Chi tiết sản phẩm"}</SheetTitle>
            <SheetDescription className="font-mono">{detailSku}</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-6">
            {detail.isPending ? (
              <LoadingBlock rows={5} />
            ) : detail.isError ? (
              <ErrorState onRetry={() => detail.refetch()} />
            ) : detail.data ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Tồn kho hiện tại</p>
                    <p className="text-xl font-bold tnum">
                      {formatNumber(detail.data.product.stock)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Trạng thái</p>
                    <div className="mt-1">
                      <StockStatusBadge status={detail.data.product.status} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Danh mục</p>
                    <p className="text-sm font-medium">{detail.data.product.category}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Ngưỡng cảnh báo</p>
                    <p className="text-sm font-medium tnum">{detail.data.product.reorderLevel}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                  <p className="text-sm font-semibold">Tra cứu bằng bảng băm</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tra cứu trực tiếp theo SKU • Trung bình O(1)
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold">Lịch sử biến động tồn kho</p>
                  {detail.data.movements.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Chưa có biến động nào được ghi nhận.
                    </p>
                  ) : (
                    <ol className="mt-2 space-y-2 border-l border-dashed border-border pl-4">
                      {detail.data.movements.map((m) => (
                        <li key={m.id} className="relative">
                          <span
                            className="absolute top-2 -left-[21px] h-2 w-2 rounded-full bg-primary"
                            aria-hidden
                          />
                          <p className="text-sm">
                            <span
                              className={
                                m.delta >= 0
                                  ? "font-semibold text-success"
                                  : "font-semibold text-destructive"
                              }
                            >
                              {m.delta > 0 ? "+" : ""}
                              {m.delta}
                            </span>{" "}
                            → tồn {formatNumber(m.stockAfter)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(m.createdAt)} • {m.note ?? "—"}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    setDetailSku(null);
                    setStockTarget(detail.data.product);
                  }}
                >
                  Điều chỉnh tồn kho
                </Button>
                <p className="text-xs text-muted-foreground">
                  Tạo lúc {formatDateTime(detail.data.product.createdAt)} • Cập nhật{" "}
                  {formatDateTime(detail.data.product.updatedAt)} •{" "}
                  {statusLabel[detail.data.product.status]}
                </p>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <StockDialog
        product={stockTarget}
        open={Boolean(stockTarget)}
        onOpenChange={(v) => !v && setStockTarget(null)}
      />
      <CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
