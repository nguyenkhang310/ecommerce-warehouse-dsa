import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Download,
  MoreHorizontal,
  PackagePlus,
  PackageSearch,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  buttonVariants,
} from "@/components/ui/basic";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/PageHeader";
import { StockStatusBadge } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/common/states";
import { Pagination } from "@/components/common/Pagination";
import { WhyPopover } from "@/components/common/WhyPopover";
import { useDefenseMode } from "@/context/defense-mode";
import { inventoryApi } from "@/services/api";
import { formatDateTime, formatNumber, relativeTime } from "@/lib/format";
import type { Product, StockMovement } from "@/core/types";

export const Route = createFileRoute("/products")({
  validateSearch: (search: Record<string, unknown>): { sku?: string } =>
    typeof search.sku === "string" ? { sku: search.sku } : {},
  head: () => ({ meta: [{ title: "Sản phẩm — Quản lý kho" }] }),
  component: ProductsPage,
});

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
  const defense = useDefenseMode();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 220);
    return () => clearTimeout(id);
  }, [term]);

  const isExact = /^[A-Z]{3}-[A-Z0-9]+-[A-Z0-9]+$/i.test(debounced.trim());

  const prefixQuery = useQuery({
    queryKey: ["prefix", debounced.trim()],
    queryFn: () => inventoryApi.searchProductsByPrefix(debounced.trim(), "auto"),
    enabled: debounced.trim().length > 0 && !isExact,
  });

  const exactQuery = useQuery({
    queryKey: ["exact", debounced.trim()],
    queryFn: () => inventoryApi.lookupProductExact(debounced.trim()),
    enabled: debounced.trim().length > 0 && isExact,
  });

  const results: Product[] = isExact
    ? exactQuery.data?.product
      ? [exactQuery.data.product]
      : []
    : (prefixQuery.data?.entries ?? []);

  const loading = isExact ? exactQuery.isFetching : prefixQuery.isFetching;
  const error = isExact ? exactQuery.isError : prefixQuery.isError;

  return (
    <section className="surface-card p-4" aria-label="Tìm sản phẩm">
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
                if (results.length) setCursor((c) => Math.min(results.length - 1, c + 1));
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
            className="h-10 pl-9"
            placeholder="Tìm theo SKU hoặc tên sản phẩm…"
            aria-label="Tìm sản phẩm"
            aria-expanded={open}
          />

          {open && debounced.trim().length > 0 ? (
            <div className="absolute inset-x-0 top-[46px] z-20 overflow-hidden rounded-md border border-border bg-popover shadow-[var(--shadow-pop)]">
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
                  Không tìm thấy sản phẩm phù hợp.
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
            </div>
          ) : null}
      </div>
      {defense.enabled ? (
        <div className="mt-3">
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
      ) : null}
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
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Cập nhật thất bại. Vui lòng thử lại."),
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
              if (!Number.isInteger(value) || value === 0) {
                setError("Số lượng thay đổi phải là số nguyên khác 0.");
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
        category: form.category.trim(),
        stock: Number(form.stock),
        reorderLevel: Number(form.reorderLevel),
      }),
    onSuccess: (p) => {
      toast.success(`Đã thêm ${p.sku}.`);
      void qc.invalidateQueries();
      onOpenChange(false);
      setForm({ sku: "", name: "", category: "Phụ kiện", stock: "0", reorderLevel: "10" });
      setErrors({});
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Không thêm được sản phẩm."),
  });

  const submit = () => {
    const next: Record<string, string> = {};
    if (!form.sku.trim()) next.sku = "Vui lòng nhập SKU.";
    if (!form.name.trim()) next.name = "Vui lòng nhập tên sản phẩm.";
    if (!form.category.trim()) next.category = "Vui lòng nhập danh mục.";
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0)
      next.stock = "Tồn kho phải là số nguyên không âm.";
    if (!Number.isInteger(Number(form.reorderLevel)) || Number(form.reorderLevel) < 0)
      next.reorderLevel = "Ngưỡng phải là số nguyên không âm.";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm sản phẩm</DialogTitle>
          <DialogDescription className="sr-only">Nhập thông tin sản phẩm.</DialogDescription>
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="category">Danh mục</Label>
            <Input
              id="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            {errors.category ? <p className="text-xs text-destructive">{errors.category}</p> : null}
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
            {errors.reorderLevel ? (
              <p className="text-xs text-destructive">{errors.reorderLevel}</p>
            ) : null}
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
  const { sku } = Route.useSearch();
  const navigate = useNavigate();
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailSku, setDetailSku] = useState<string | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const pageSize = 8;

  useEffect(() => {
    if (sku) setDetailSku(sku);
  }, [sku]);

  const products = useQuery({
    queryKey: ["products", "all", "all"],
    queryFn: () => inventoryApi.getProducts({}),
  });

  const detail = useQuery({
    queryKey: ["product-detail", detailSku],
    queryFn: () => inventoryApi.getProduct(detailSku!),
    enabled: Boolean(detailSku),
  });

  const categories = useMemo(() => {
    const set = new Set((products.data ?? []).map((p) => p.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [products.data]);

  const rows = useMemo(
    () =>
      (products.data ?? []).filter(
        (p) =>
          (category === "all" || p.category === category) &&
          (status === "all" || p.status === status),
      ),
    [products.data, category, status],
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const pageSkus = pageRows.map((p) => p.sku);
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
    <div className="space-y-5">
      <PageHeader
        title="Danh mục sản phẩm"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <PackagePlus className="h-4 w-4" aria-hidden />
            Thêm sản phẩm
          </Button>
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
                setSelected([]);
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
                setSelected([]);
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
              <Badge className="tnum">
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
                <Link to="/system" className={buttonVariants()}>
                  Mở dữ liệu & hệ thống
                </Link>
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
                        checked={pageSkus.length > 0 && pageSkus.every((sku) => selected.includes(sku))}
                        onCheckedChange={(v) =>
                          setSelected((current) =>
                            v
                              ? [...new Set([...current, ...pageSkus])]
                              : current.filter((sku) => !pageSkus.includes(sku)),
                          )
                        }
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
                            setSelected((s) =>
                              v
                                ? s.includes(p.sku)
                                  ? s
                                  : [...s, p.sku]
                                : s.filter((x) => x !== p.sku),
                            )
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

      <Sheet
        open={Boolean(detailSku)}
        onOpenChange={(open) => {
          if (open) return;
          setDetailSku(null);
          if (sku) void navigate({ to: "/products", search: {}, replace: true });
        }}
      >
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
                    if (sku) void navigate({ to: "/products", search: {}, replace: true });
                    setStockTarget(detail.data.product);
                  }}
                >
                  Điều chỉnh tồn kho
                </Button>
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
