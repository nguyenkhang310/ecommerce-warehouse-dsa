import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Download, GraduationCap, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { ComplexityChip } from "@/components/common/badges";
import { ErrorState, LoadingBlock } from "@/components/common/states";
import { orderApi, systemApi } from "@/services/mockApiAdapter";
import { formatDateTime, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/system")({
  head: () => ({
    meta: [
      { title: "Hệ thống — Quản lý kho" },
      {
        name: "description",
        content: "Quản lý dữ liệu và kết nối.",
      },
      { property: "og:title", content: "Hệ thống — Quản lý kho" },
      {
        property: "og:description",
        content: "Dữ liệu và trạng thái hệ thống.",
      },
    ],
  }),
  component: SystemPage,
});

const PREVIEW_ROWS = [
  ["LAP-DELL-5420", "Laptop Dell Latitude 5420", "Laptop", "142", "40"],
  ["LAP-ASUS-A15", "Laptop Asus TUF Gaming A15", "Laptop", "38", "45"],
  ["KEY-LOGI-K380", "Bàn phím Bluetooth Logitech K380", "Phụ kiện", "320", "80"],
  ["MON-LG-27UP", "Màn hình LG 27UP850 4K USB-C", "Màn hình", "64", "25"],
  ["PHN-IP15-128", "Điện thoại iPhone 15 128GB", "Điện thoại", "88", "35"],
];

const MODULES = [
  {
    name: "Bảng băm",
    tag: "MC1",
    duty: "Tra cứu theo SKU và mã đơn.",
    ops: "lấy(khóa), đặt(khóa, giá trị), xóa(khóa)",
    complexity: "Trung bình O(1)",
  },
  {
    name: "Hàng đợi ưu tiên + phân xử bằng số thứ tự",
    tag: "MC2 + TP1",
    duty: "Lấy đơn ưu tiên; cùng mức thì đơn đến trước được xử lý trước.",
    ops: "xemĐỉnh(), chèn(đơn), lấyRa()",
    complexity: "O(log n)",
  },
  {
    name: "Cây tiền tố",
    tag: "TP2",
    duty: "Gợi ý theo tiền tố.",
    ops: "chèn(từ), tìm(tiền tố)",
    complexity: "O(k + m)",
  },
  {
    name: "Danh sách liên kết đôi + Bảng băm",
    tag: "TP3",
    duty: "Theo dõi cập nhật gần đây.",
    ops: "thêm(khóa), chuyểnLênĐầu(nút), xóaCuối()",
    complexity: "O(1)",
  },
];

function DataTab() {
  const qc = useQueryClient();
  const [entity, setEntity] = useState<"products" | "orders">("products");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  const importer = useMutation({
    mutationFn: () => systemApi.importData(file!, entity),
    onSuccess: () => {
      toast.success("Đã nạp dữ liệu.");
      void qc.invalidateQueries();
    },
    onError: () => toast.error("Nạp dữ liệu thất bại."),
  });

  const reset = useMutation({
    mutationFn: () => systemApi.resetDemoData(),
    onSuccess: () => {
      toast.success("Đã đặt lại dữ liệu.");
      setResetOpen(false);
      setConfirmText("");
      void qc.invalidateQueries();
    },
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">Nhập dữ liệu CSV / JSON</h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) setFile({ name: f.name, size: f.size });
          }}
          className={`mt-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm font-medium">Kéo thả tệp vào đây</p>
          <p className="text-xs text-muted-foreground">Hỗ trợ .csv và .json, tối đa 20 MB</p>
          <div className="mt-3">
            <Input
              id="file-input"
              type="file"
              accept=".csv,.json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile({ name: f.name, size: f.size });
              }}
            />
            <Label
              htmlFor="file-input"
              className="glass-control inline-flex h-10 cursor-pointer items-center justify-center px-4 text-sm font-medium text-foreground hover:bg-white/80"
            >
              Chọn tệp dữ liệu
            </Label>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="entity">Loại dữ liệu</Label>
            <Select value={entity} onValueChange={(v) => setEntity(v as "products" | "orders")}>
              <SelectTrigger id="entity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="products">Sản phẩm</SelectItem>
                <SelectItem value="orders">Đơn hàng</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tệp đã chọn</Label>
            <p className="truncate rounded-lg border border-border px-3 py-2 text-sm tnum">
              {file ? `${file.name} • ${(file.size / 1024).toFixed(1)} KB` : "Chưa chọn tệp"}
            </p>
          </div>
        </div>

        {file ? (
          <p className="mt-2 text-xs">
            <Badge variant="outline" className="border-success/40 text-success">
              Xác thực: hợp lệ
            </Badge>
          </p>
        ) : null}

        <ul className="mt-4 divide-y divide-border rounded-xl border border-border md:hidden">
          {PREVIEW_ROWS.map((r) => (
            <li key={r[0]} className="space-y-2 px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r[1]}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{r[0]}</p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 text-xs">
                <span className="truncate text-muted-foreground">{r[2]}</span>
                <span className="tnum">Tồn {r[3]}</span>
                <span className="tnum">Ngưỡng {r[4]}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border md:block">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead className="text-right">Tồn</TableHead>
                <TableHead className="text-right">Ngưỡng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PREVIEW_ROWS.map((r) => (
                <TableRow key={r[0]}>
                  <TableCell className="font-mono text-xs">{r[0]}</TableCell>
                  <TableCell className="text-sm">{r[1]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r[2]}</TableCell>
                  <TableCell className="text-right tnum">{r[3]}</TableCell>
                  <TableCell className="text-right tnum">{r[4]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Xem trước 5 dòng đầu của tệp mẫu.</p>

        {importer.isPending ? <Progress value={70} className="mt-4 h-2" /> : null}

        {importer.data ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Thành công", importer.data.success],
              ["Bỏ qua", importer.data.skipped],
              ["Trùng lặp", importer.data.duplicates],
              ["Lỗi", importer.data.errors],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold tnum">{formatNumber(value as number)}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => importer.mutate()} disabled={!file || importer.isPending}>
            {importer.isPending ? "Đang nạp…" : "Nạp vào cấu trúc lõi"}
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => toast.success("Đã tải tệp mẫu products-sample.csv (mô phỏng).")}
          >
            <Download className="h-4 w-4" aria-hidden />
            Tải tệp mẫu
          </Button>
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            Xóa dữ liệu mẫu
          </Button>
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">Nguyên tắc tầng lưu trữ</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>CSV/JSON/SQLite chỉ nạp và lưu dữ liệu.</li>
          <li>Cơ sở dữ liệu không thay thế hàng đợi ưu tiên, cây tiền tố hay bảng băm.</li>
          <li>Dữ liệu được đưa vào bộ nhớ của dịch vụ lõi.</li>
        </ul>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden />
          Đồ án DSA • HCM-UTE — Đại học Công nghệ Kỹ Thuật TP.HCM
        </p>
      </section>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa toàn bộ dữ liệu mẫu?</DialogTitle>
            <DialogDescription>
              Gõ <span className="font-mono">XÓA DỮ LIỆU</span> để xác nhận.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Xác nhận</Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="XÓA DỮ LIỆU"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "XÓA DỮ LIỆU" || reset.isPending}
              onClick={() => reset.mutate()}
            >
              Xóa dữ liệu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArchitectureTab() {
  const [active, setActive] = useState(MODULES[0].name);
  const current = MODULES.find((m) => m.name === active)!;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">Kiến trúc 3 tầng</h2>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm font-semibold">Tầng giao diện React</p>
            <p className="text-xs text-muted-foreground">Chỉ nhận thao tác và hiển thị dữ liệu.</p>
          </div>
          <div className="flex justify-center text-muted-foreground" aria-hidden>
            <ArrowRight className="h-5 w-5 rotate-90" />
          </div>
          <div className="rounded-xl border border-accent/40 bg-accent/8 p-4">
            <p className="text-sm font-semibold">Dịch vụ lõi DSA</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {MODULES.map((m) => (
                <button
                  key={m.name}
                  type="button"
                  onMouseEnter={() => setActive(m.name)}
                  onClick={() => setActive(m.name)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    active === m.name ? "border-primary bg-card" : "border-border bg-card/70"
                  }`}
                >
                  <span className="block font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.tag}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-center text-muted-foreground" aria-hidden>
            <ArrowRight className="h-5 w-5 rotate-90" />
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <p className="text-sm font-semibold">Tầng lưu trữ CSV / JSON / SQLite</p>
            <p className="text-xs text-muted-foreground">Chỉ nạp và lưu dữ liệu.</p>
          </div>
        </div>
        <p className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          Nghiệp vụ đi qua tầng lõi DSA.
        </p>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">{current.name}</h2>
        <Badge variant="outline" className="mt-1">
          {current.tag}
        </Badge>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground uppercase">Trách nhiệm</dt>
            <dd className="mt-0.5">{current.duty}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground uppercase">Phép toán</dt>
            <dd className="mt-0.5 font-mono text-xs">{current.ops}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground uppercase">Độ phức tạp</dt>
            <dd className="mt-1">
              <ComplexityChip>{current.complexity}</ComplexityChip>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function StatusTab() {
  const health = useQuery({ queryKey: ["health"], queryFn: () => systemApi.getHealth() });
  const log = useQuery({ queryKey: ["op-log"], queryFn: () => orderApi.getOperationLog() });
  const ping = useMutation({
    mutationFn: () => systemApi.ping(),
    onSuccess: (r) => toast.success(`Kết nối phản hồi trong ${r.latencyMs} ms (mô phỏng).`),
  });

  if (health.isPending) return <LoadingBlock rows={6} />;
  if (health.isError) return <ErrorState onRetry={() => health.refetch()} />;

  const h = health.data;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="surface-card p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <h2 className="truncate text-base font-semibold">Trạng thái dịch vụ lõi</h2>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => ping.mutate()}
            disabled={ping.isPending}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Kiểm tra kết nối
          </Button>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          {[
            ["Địa chỉ API lõi", h.coreApiUrl],
            ["Chế độ", h.mode === "mock" ? "Dữ liệu minh họa" : "API thực tế"],
            ["Kiểu lưu trữ", h.storageType],
            ["Nạp dữ liệu lần cuối", formatDateTime(h.lastLoadAt)],
            ["Số sản phẩm", formatNumber(h.productCount)],
            ["Số đơn hàng", formatNumber(h.orderCount)],
            ["Kích thước hàng đợi ưu tiên", formatNumber(h.heapSize)],
            ["Số từ khóa cây tiền tố", formatNumber(h.trieTerms)],
            ["Dung lượng danh sách gần đây", String(h.recentCapacity)],
            ["Độ trễ API", `${h.latencyMs} ms`],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="flex justify-between gap-3 border-b border-border pb-2 last:border-0"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="truncate text-right font-medium tnum">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">Nhật ký sự kiện</h2>
        {log.isPending ? (
          <LoadingBlock rows={5} className="mt-3" />
        ) : (
          <ul className="mt-3 max-h-[420px] space-y-2 overflow-auto">
            {(log.data ?? []).map((e) => (
              <li key={e.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-muted-foreground tnum">
                    {formatDateTime(e.at)}
                  </span>
                  <Badge variant="outline">
                    {e.level === "success"
                      ? "Thành công"
                      : e.level === "warning"
                        ? "Cảnh báo"
                        : e.level === "error"
                          ? "Lỗi"
                          : "Thông tin"}
                  </Badge>
                  <span className="font-mono text-muted-foreground">
                    {e.source === "hash_table"
                      ? "bảng_băm"
                      : e.source === "priority_heap"
                        ? "hàng_đợi_ưu_tiên"
                      : e.source === "recent_list"
                          ? "danh_sách_gần_đây"
                          : e.source === "benchmark"
                            ? "đo_hiệu_năng"
                            : e.source === "storage"
                              ? "lưu_trữ"
                              : "tầng_lõi"}
                  </span>
                </div>
                <p className="mt-1 text-sm">{e.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SystemPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Dữ liệu & hệ thống" description="Dữ liệu và trạng thái hệ thống." />
      <Tabs defaultValue="data" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
          <TabsTrigger value="data">Dữ liệu</TabsTrigger>
          <TabsTrigger value="arch">Kiến trúc</TabsTrigger>
          <TabsTrigger value="status">Trạng thái</TabsTrigger>
        </TabsList>
        <TabsContent value="data">
          <DataTab />
        </TabsContent>
        <TabsContent value="arch">
          <ArchitectureTab />
        </TabsContent>
        <TabsContent value="status">
          <StatusTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
