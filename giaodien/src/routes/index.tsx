import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  Binary,
  Boxes,
  Hash,
  Layers,
  ListTree,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { PageHeader } from "@/components/layout/PageHeader";
import { NextOrderCard } from "@/components/dashboard/NextOrderCard";
import { ComplexityChip, PriorityBadge } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/common/states";
import { WhyPopover } from "@/components/common/WhyPopover";
import { useDefenseMode } from "@/context/defense-mode";
import { benchmarkApi, inventoryApi, orderApi } from "@/services/mockApiAdapter";
import { formatNumber, operationLabel, relativeTime } from "@/lib/format";
import type { BenchmarkPoint } from "@/core/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tổng quan — Quản lý kho" },
      {
        name: "description",
        content: "Theo dõi tồn kho và đơn hàng.",
      },
      { property: "og:title", content: "Tổng quan — Quản lý kho" },
      {
        property: "og:description",
        content: "Tổng quan kho và cấu trúc dữ liệu.",
      },
    ],
  }),
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
    <article className="surface-card relative overflow-hidden p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="cursor-help truncate text-sm text-muted-foreground">{label}</p>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
          <p className="mt-2 text-[32px] font-normal leading-none tnum">{value}</p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-sky-200/65 bg-sky-50/82 text-[#0878b8] shadow-[0_5px_16px_rgba(8,120,184,0.07),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-md dark:border-sky-400/15 dark:bg-sky-400/9 dark:text-[#64d2ff] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>{hint}</span>
        {badge ? (
          <Badge
            variant="outline"
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
  const queue = useQuery({
    queryKey: ["queue-preview"],
    queryFn: () => orderApi.getNextCandidates(6),
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
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan kho & đơn hàng"
        description="Tồn kho, đơn chờ và cấu trúc dữ liệu."
        actions={
          <>
            <Button onClick={() => navigate({ to: "/orders" })} className="gap-1.5">
              <PackagePlus className="h-4 w-4" aria-hidden />
              Tạo đơn mới
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/products" })}
              className="gap-1.5"
            >
              <Warehouse className="h-4 w-4" aria-hidden />
              Cập nhật tồn kho
            </Button>
          </>
        }
      />

      {summary.isPending ? (
        <LoadingBlock rows={2} />
      ) : summary.isError ? (
        <ErrorState onRetry={() => summary.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Tổng sản phẩm"
            value={formatNumber(summary.data.totalProducts)}
            hint={`+${summary.data.productsAddedThisMonth} trong tháng này`}
            icon={Boxes}
            tooltip="Số key trong Hash Table."
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
            hint="Dưới hoặc bằng ngưỡng cảnh báo"
            icon={TriangleAlert}
            tooltip="Tồn kho dưới ngưỡng."
            link={{ to: "/products", label: "Xem danh sách" }}
          />
          <KpiCard
            label="Đơn đang chờ"
            value={formatNumber(summary.data.pendingOrders)}
            hint="Đang nằm trong Priority Heap"
            icon={Layers}
            tooltip="Số node trong Priority Heap."
            badge={`${summary.data.urgentOrders} đơn gấp`}
          />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <NextOrderCard onOpenHeap={() => navigate({ to: "/visualizer" })} />

        <section className="surface-card p-4" aria-labelledby="queue-preview-title">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <h2 id="queue-preview-title" className="truncate text-base font-semibold">
              Hàng đợi rút gọn
            </h2>
            <Link to="/orders" className="text-sm font-medium text-primary hover:underline">
              Mở toàn bộ hàng đợi
            </Link>
          </div>
          {queue.isPending ? (
            <LoadingBlock rows={4} className="mt-4" />
          ) : queue.isError ? (
            <ErrorState onRetry={() => queue.refetch()} />
          ) : (
            <div className="mt-3 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Ưu tiên</TableHead>
                    <TableHead className="text-right">Sequence</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(queue.data ?? []).slice(0, 5).map((o, i) => (
                    <TableRow key={o.orderCode}>
                      <TableCell className="text-muted-foreground tnum">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs tnum">{o.orderCode}</TableCell>
                      <TableCell>
                        <PriorityBadge priority={o.priority} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tnum">
                        #{o.sequenceNumber}
                      </TableCell>
                      <TableCell className="text-right tnum">{o.totalQuantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="surface-card p-4" aria-labelledby="recent-title">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <h2 id="recent-title" className="truncate text-base font-semibold">
              Cập nhật tồn kho gần đây
            </h2>
            <WhyPopover
              structure="Doubly Linked List + Hash Map"
              comparisonKey="SKU → node"
              complexity="lookup O(1) • move-to-front O(1)"
              explanation="Bản ghi mới lên HEAD; quá dung lượng sẽ loại TAIL."
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
              description="Chưa có cập nhật tồn kho."
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
                      <Badge variant="outline" className="text-[10px]">
                        HEAD
                      </Badge>
                    ) : null}
                    {defense.enabled && i === arr.length - 1 ? (
                      <Badge variant="outline" className="text-[10px]">
                        TAIL
                      </Badge>
                    ) : null}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="space-y-5">
          <section className="surface-card p-4" aria-labelledby="dsa-health-title">
            <h2 id="dsa-health-title" className="text-base font-semibold">
              Trạng thái DSA
            </h2>
            {summary.isPending ? (
              <LoadingBlock rows={2} className="mt-4" />
            ) : summary.isError ? (
              <ErrorState onRetry={() => summary.refetch()} />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    name: "Hash Table",
                    icon: Hash,
                    primary: `${formatNumber(summary.data.dsaHealth.hashKeys)} keys`,
                    secondary: `Load factor ${summary.data.dsaHealth.hashLoadFactor}`,
                    chip: "Avg O(1)" as const,
                    tone: "indigo" as const,
                  },
                  {
                    name: "Priority Heap",
                    icon: Layers,
                    primary: `${formatNumber(summary.data.dsaHealth.heapNodes)} nodes`,
                    secondary: `Next: ${summary.data.dsaHealth.heapNext}`,
                    chip: "O(log n)" as const,
                    tone: "indigo" as const,
                  },
                  {
                    name: "Trie",
                    icon: ListTree,
                    primary: `${formatNumber(summary.data.dsaHealth.trieTerms)} terms`,
                    secondary: `Max depth ${summary.data.dsaHealth.trieMaxDepth}`,
                    chip: "O(k + m)" as const,
                    tone: "cyan" as const,
                  },
                  {
                    name: "Recent Cache",
                    icon: Binary,
                    primary: `${summary.data.dsaHealth.recentUsed} / ${summary.data.dsaHealth.recentCapacity} slots`,
                    secondary: "Move-to-front",
                    chip: "O(1)" as const,
                    tone: "emerald" as const,
                  },
                ].map((card) => (
                  <article key={card.name} className="rounded-sm border border-border bg-card p-3">
                    <div className="flex items-center gap-2">
                      <card.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <p className="text-sm font-semibold">{card.name}</p>
                    </div>
                    <p className="mt-1.5 text-sm font-medium tnum">{card.primary}</p>
                    <p className="truncate text-xs text-muted-foreground tnum">{card.secondary}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <ComplexityChip tone={card.tone}>{card.chip}</ComplexityChip>
                      <Link
                        to="/visualizer"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Mô phỏng
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="surface-card p-4" aria-labelledby="quick-chart-title">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 id="quick-chart-title" className="truncate text-base font-semibold">
                DSA vs Linear scan
              </h2>
              <Select
                value={operation}
                onValueChange={(v) => setOperation(v as BenchmarkPoint["operation"])}
              >
                <SelectTrigger className="w-[210px]" aria-label="Chọn phép đo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hash_lookup">Tra cứu theo mã</SelectItem>
                  <SelectItem value="heap_extract">Lấy đơn tiếp theo</SelectItem>
                  <SelectItem value="trie_prefix">Tìm theo tiền tố</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bench.isPending ? (
              <LoadingBlock rows={3} className="mt-4" />
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
                        name="Cấu trúc đã chọn"
                        type="monotone"
                        dataKey="dsa"
                        stroke="var(--color-primary)"
                        strokeWidth={2.5}
                        dot
                      />
                      <Line
                        name="Linear scan"
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
                <p className="mt-2 text-xs text-muted-foreground">
                  {operationLabel[operation]} • Dữ liệu mô phỏng.
                </p>
                <Link
                  to="/performance"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Mở trang Hiệu năng
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
