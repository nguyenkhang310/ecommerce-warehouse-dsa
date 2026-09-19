import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/PageHeader";
import { ComplexityChip } from "@/components/common/badges";
import { ErrorState, LoadingBlock } from "@/components/common/states";
import { inventoryApi, orderApi, systemApi } from "@/services/api";
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

const MODULES = [
  {
    name: "Bảng băm",
    tag: "MC1",
    duty: "Tra cứu theo SKU và mã đơn.",
    ops: "lấy(khóa), đặt(khóa, giá trị), xóa(khóa)",
    complexity: "Trung bình O(1)",
  },
    {
      name: "Hàng đợi ưu tiên",
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
  const products = useQuery({
    queryKey: ["products", "all", "all"],
    queryFn: () => inventoryApi.getProducts({}),
  });
  const health = useQuery({ queryKey: ["health"], queryFn: () => systemApi.getHealth() });
  const reload = useMutation({
    mutationFn: () => systemApi.resetDemoData(),
    onSuccess: () => {
      toast.success("Đã nạp lại dữ liệu từ data_chinh.");
      void qc.invalidateQueries();
    },
    onError: () => toast.error("Không nạp lại được dữ liệu."),
  });
  const preview = (products.data ?? []).slice(0, 5);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Dữ liệu đang sử dụng</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Backend C++ nạp trực tiếp hai file CSV trong backend/data/data_chinh.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => reload.mutate()}
            disabled={reload.isPending}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {reload.isPending ? "Đang nạp…" : "Nạp lại dữ liệu"}
          </Button>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">Sản phẩm</dt>
            <dd className="mt-1 text-xl font-bold tnum">
              {formatNumber(health.data?.productCount ?? 0)}
            </dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">Đơn hàng</dt>
            <dd className="mt-1 text-xl font-bold tnum">
              {formatNumber(health.data?.orderCount ?? 0)}
            </dd>
          </div>
        </dl>

        {products.isPending ? (
          <LoadingBlock rows={5} className="mt-4" />
        ) : products.isError ? (
          <ErrorState onRetry={() => products.refetch()} />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
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
                {preview.map((product) => (
                  <TableRow key={product.sku}>
                    <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                    <TableCell className="text-sm">{product.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.category}
                    </TableCell>
                    <TableCell className="text-right tnum">{product.stock}</TableCell>
                    <TableCell className="text-right tnum">{product.reorderLevel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Xem 5 sản phẩm đầu tiên trong kho.
        </p>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold">Nguyên tắc tầng lưu trữ</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>CSV chỉ lưu dữ liệu gốc.</li>
          <li>C++ nạp dữ liệu vào bảng băm, hàng đợi ưu tiên, cây tiền tố và danh sách gần đây.</li>
          <li>Nút nạp lại sẽ bỏ thay đổi trong bộ nhớ và đọc lại data_chinh.</li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Đồ án DSA • HCM-UTE — Đại học Công nghệ Kỹ thuật TP.HCM
        </p>
      </section>
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
            <p className="text-sm font-semibold">Tầng dữ liệu CSV</p>
            <p className="text-xs text-muted-foreground">Nạp dữ liệu gốc từ thư mục data_chinh.</p>
          </div>
        </div>
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
    onSuccess: (r) => toast.success(`Backend C++ phản hồi trong ${r.latencyMs} ms.`),
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
            ["Chế độ", "API C++ thực tế"],
            ["Kiểu lưu trữ", h.storageType],
            ["Nạp dữ liệu lần cuối", formatDateTime(h.lastLoadAt)],
            ["Số sản phẩm", formatNumber(h.productCount)],
            ["Số đơn hàng", formatNumber(h.orderCount)],
            ["Kích thước hàng đợi ưu tiên", formatNumber(h.heapSize)],
            ["Số từ khóa cây tiền tố", formatNumber(h.trieTerms)],
            ["Sức chứa danh sách gần đây", String(h.recentCapacity)],
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
                      ? "Bảng băm"
                      : e.source === "priority_heap"
                        ? "Hàng đợi ưu tiên"
                        : e.source === "recent_list"
                          ? "Danh sách gần đây"
                          : e.source === "benchmark"
                            ? "Đo hiệu năng"
                            : e.source === "storage"
                              ? "Lưu trữ"
                              : "Tầng lõi"}
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
      <PageHeader title="Dữ liệu & hệ thống" description="Nguồn dữ liệu CSV, kiến trúc 3 tầng và tình trạng backend C++." />
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
