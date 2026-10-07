import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/basic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState, LoadingBlock } from "@/components/common/states";
import { inventoryApi, systemApi } from "@/services/api";
import { formatDateTime, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/system")({
  head: () => ({ meta: [{ title: "Hệ thống — Quản lý kho" }] }),
  component: SystemPage,
});

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
      toast.success("Đã khôi phục dữ liệu ban đầu.");
      void qc.invalidateQueries();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Không khôi phục được dữ liệu."),
  });
  const preview = (products.data ?? []).slice(0, 5);

  return (
    <div>
      <section className="surface-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-base font-semibold">Dữ liệu đang sử dụng</h2>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => reload.mutate()}
            disabled={reload.isPending}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            {reload.isPending ? "Đang khôi phục…" : "Khôi phục dữ liệu"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Sản phẩm và đơn hàng được tự lưu để dùng tiếp sau khi khởi động lại.
          Chọn khôi phục dữ liệu sẽ xóa các thay đổi và nạp lại bộ dữ liệu gốc.
        </p>

        {health.isPending ? (
          <LoadingBlock rows={2} className="mt-4" />
        ) : health.isError ? (
          <div className="mt-4">
            <ErrorState onRetry={() => health.refetch()} />
          </div>
        ) : (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">Sản phẩm</dt>
              <dd className="mt-1 text-xl font-bold tnum">
                {formatNumber(health.data.productCount)}
              </dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">Đơn hàng</dt>
              <dd className="mt-1 text-xl font-bold tnum">
                {formatNumber(health.data.orderCount)}
              </dd>
            </div>
          </dl>
        )}

        {products.isPending ? (
          <LoadingBlock rows={5} className="mt-4" />
        ) : products.isError ? (
          <ErrorState onRetry={() => products.refetch()} />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-border">
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
      </section>
    </div>
  );
}

function StatusTab() {
  const health = useQuery({ queryKey: ["health"], queryFn: () => systemApi.getHealth() });
  const ping = useMutation({
    mutationFn: () => systemApi.ping(),
    onSuccess: (r) => toast.success(`Kết nối ổn định · ${r.latencyMs} ms.`),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Không kết nối được hệ thống."),
  });

  if (health.isPending) return <LoadingBlock rows={6} />;
  if (health.isError) return <ErrorState onRetry={() => health.refetch()} />;

  const h = health.data;

  return (
    <section className="surface-card p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <h2 className="truncate text-base font-semibold">Trạng thái hệ thống</h2>
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
            ["Trạng thái", "Đang hoạt động"],
            ["Cập nhật dữ liệu", formatDateTime(h.lastLoadAt)],
            ["Số sản phẩm", formatNumber(h.productCount)],
            ["Số đơn hàng", formatNumber(h.orderCount)],
            ["Thời gian phản hồi", `${h.latencyMs} ms`],
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
  );
}

function SystemPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Dữ liệu & hệ thống" />
      <Tabs defaultValue="data" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="data">Dữ liệu</TabsTrigger>
          <TabsTrigger value="status">Trạng thái</TabsTrigger>
        </TabsList>
        <TabsContent value="data">
          <DataTab />
        </TabsContent>
        <TabsContent value="status">
          <StatusTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
