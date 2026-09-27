import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  Boxes,
  Layers,
  PackagePlus,
  PackageSearch,
  TriangleAlert,
  Warehouse,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Badge,
  Button,
} from "@/components/ui/basic";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { NextOrderCard } from "@/components/dashboard/NextOrderCard";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/common/states";
import { WhyPopover } from "@/components/common/WhyPopover";
import { useDefenseMode } from "@/context/defense-mode";
import { benchmarkApi, inventoryApi } from "@/services/api";
import { formatNumber, relativeTime } from "@/lib/format";
import type { BenchmarkPoint } from "@/core/types";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Tổng quan — Quản lý kho" }] }),
  component: DashboardPage,
});

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tooltip,
  badge,
  link,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Boxes;
  tooltip: string;
  badge?: string;
  link?: { to: string; label: string };
}) {
  return (
    <article className="surface-card min-w-0 overflow-hidden p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="cursor-help truncate text-xs font-medium text-muted-foreground">{label}</p>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
          <p className="mt-2 text-[24px] leading-none font-semibold tracking-[-0.035em] text-slate-950 tnum sm:text-[30px]">{value}</p>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/8 text-primary">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
      </div>
      <div className="mt-4 flex min-h-5 flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>{hint}</span>
        {badge ? (
          <Badge
            className="border-destructive/30 bg-destructive/10 text-destructive"
          >
            {badge}
          </Badge>
        ) : null}
        {link ? (
          <Link to={link.to} className="ml-auto font-medium text-primary hover:underline">
            {link.label}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const defense = useDefenseMode();
  const [operation, setOperation] = useState<BenchmarkPoint["operation"]>("hash_lookup");

  const summary = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => inventoryApi.getDashboardSummary(),
  });
  const recent = useQuery({
    queryKey: ["recent"],
    queryFn: () => inventoryApi.getRecentUpdates(6),
  });
  const bench = useQuery({ queryKey: ["bench-history"], queryFn: () => benchmarkApi.getHistory() });

  const chartData = (bench.data ?? [])
    .filter((b) => b.operation === operation)
    .reduce<{ size: number; dsa: number; linear: number }[]>((acc, b) => {
      if (acc.some((r) => r.size === b.datasetSize)) return acc;
      acc.push({ size: b.datasetSize, dsa: b.dsaMeanMs, linear: b.baselineMeanMs });
      return acc;
    }, [])
    .sort((a, b) => a.size - b.size);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tổng quan kho & đơn hàng"
        actions={
          <>
            <Button
              onClick={() => navigate({ to: "/orders", search: { action: "create" } })}
              className="gap-1.5"
            >
              <PackagePlus className="h-4 w-4" aria-hidden />
              Tạo đơn mới
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/products" })}
              className="gap-1.5"
            >
              <Warehouse className="h-4 w-4" aria-hidden />
              Sản phẩm
            </Button>
          </>
        }
      />

      {summary.isPending ? (
        <LoadingBlock rows={2} />
      ) : summary.isError ? (
        <ErrorState onRetry={() => summary.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Tổng sản phẩm"
            value={formatNumber(summary.data.totalProducts)}
            hint={`+${summary.data.productsAddedThisMonth} trong tháng này`}
            icon={Boxes}
            tooltip="Tổng số mặt hàng đang quản lý."
          />
          <KpiCard
            label="Tổng tồn kho"
            value={formatNumber(summary.data.totalStock)}
            hint={`${formatNumber(summary.data.inboundToday)} đơn vị vừa nhập`}
            icon={Warehouse}
            tooltip="Tổng số lượng tồn kho."
          />
          <KpiCard
            label="Sắp hết hàng"
            value={formatNumber(summary.data.lowStockCount)}
            hint="Thấp hơn hoặc bằng ngưỡng cảnh báo"
            icon={TriangleAlert}
            tooltip="Số mặt hàng sắp hết hàng."
            link={{ to: "/products", label: "Xem danh sách" }}
          />
          <KpiCard
            label="Đơn đang chờ"
            value={formatNumber(summary.data.pendingOrders)}
            hint="Đang chờ xử lý theo mức ưu tiên"
            icon={Layers}
            tooltip="Số đơn chưa xử lý trong hàng đợi."
            badge={`${summary.data.urgentOrders} đơn gấp`}
          />
        </div>
      )}

      <NextOrderCard
        onOpenQueue={() => navigate({ to: "/orders", search: {} })}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="surface-card self-start p-4" aria-labelledby="recent-title">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <h2 id="recent-title" className="truncate text-base font-semibold">
              Cập nhật tồn kho gần đây
            </h2>
            <WhyPopover
              structure="Danh sách liên kết đôi + Bảng băm"
              comparisonKey="SKU → nút"
              complexity="O(1)"
              explanation="Bản ghi mới được chuyển lên đầu; khi vượt dung lượng sẽ loại phần tử cuối."
            />
          </div>
          {recent.isPending ? (
            <LoadingBlock rows={4} className="mt-4" />
          ) : recent.isError ? (
            <ErrorState onRetry={() => recent.refetch()} />
          ) : (recent.data ?? []).length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="Chưa có cập nhật"
            />
          ) : (
            <ol className="relative mt-4 space-y-3 border-l border-dashed border-border pl-5">
              {(recent.data ?? []).map((r, i, arr) => (
                <li key={`${r.sku}-${r.updatedAt}`} className="animate-slide-in-top relative">
                  <span
                    className="absolute top-3 -left-[26px] h-2.5 w-2.5 rounded-full bg-primary"
                    aria-hidden
                  />
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-border bg-card px-3 py-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-muted text-xs font-semibold">
                      {r.sku.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{r.sku}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold tnum ${r.delta >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {r.delta > 0 ? "+" : ""}
                        {r.delta}
                      </p>
                      <p className="text-xs text-muted-foreground tnum">
                        tồn {formatNumber(r.stockAfter)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 flex items-center gap-2 pl-1 text-xs text-muted-foreground">
                    {relativeTime(r.updatedAt)}
                    {defense.enabled && i === 0 ? (
                      <Badge className="text-[10px]">
                        ĐẦU
                      </Badge>
                    ) : null}
                    {defense.enabled && i === arr.length - 1 ? (
                      <Badge className="text-[10px]">
                        CUỐI
                      </Badge>
                    ) : null}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

          <section className="surface-card p-4" aria-labelledby="quick-chart-title">
            <div className="flex flex-col items-stretch gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <h2 id="quick-chart-title" className="text-base font-semibold">
                So sánh hiệu năng
              </h2>
              <Select
                value={operation}
                onValueChange={(v) => setOperation(v as BenchmarkPoint["operation"])}
              >
                <SelectTrigger className="w-full sm:w-[210px]" aria-label="Chọn phép đo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hash_lookup">Tra cứu theo mã</SelectItem>
                  <SelectItem value="heap_extract">Lấy đơn ưu tiên</SelectItem>
                  <SelectItem value="trie_prefix">Tìm theo tiền tố</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bench.isPending ? (
              <LoadingBlock rows={3} className="mt-4" />
            ) : bench.isError ? (
              <div className="mt-4">
                <ErrorState onRetry={() => bench.refetch()} />
              </div>
            ) : chartData.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Chưa có kết quả cho phép đo này.
              </p>
            ) : (
              <>
                <div className="mt-4 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 8, right: 12, bottom: 4, left: -12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="size"
                        tick={{ fontSize: 12 }}
                        stroke="var(--color-muted-foreground)"
                      />
                      <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                      <RTooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 2,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => `${v} ms`}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        name="Giải pháp DSA"
                        type="monotone"
                        dataKey="dsa"
                        stroke="var(--color-primary)"
                        strokeWidth={2.5}
                        dot
                      />
                      <Line
                        name="Duyệt tuyến tính"
                        type="monotone"
                        dataKey="linear"
                        stroke="var(--color-destructive)"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <Link
                  to="/performance"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Mở trang đánh giá hiệu năng
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </>
            )}
          </section>
      </div>
    </div>
  );
}
