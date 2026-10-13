import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Download, Play, X } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
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
  Button,
  Checkbox,
  Input,
  Label,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/basic";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState, LoadingBlock } from "@/components/common/states";
import { benchmarkApi } from "@/services/api";
import { benchmarkInfo, formatDateTime, formatNumber, operationLabel } from "@/lib/format";
import type { BenchmarkPoint } from "@/core/types";

export const Route = createFileRoute("/performance")({
  head: () => ({ meta: [{ title: "So sánh thời gian chạy — Quản lý kho" }] }),
  component: PerformancePage,
});

const SIZES = [1000, 5000, 10000];

function comparisonText(dsaMs: number, baselineMs: number) {
  if (dsaMs <= 0 || baselineMs <= 0) return "Chưa có dữ liệu";
  const ratio = baselineMs / dsaMs;
  if (ratio >= 0.95 && ratio <= 1.05) return "Tốc độ gần bằng nhau";
  return ratio > 1
    ? `Nhanh hơn ${ratio.toFixed(1)} lần`
    : `Chậm hơn ${(1 / ratio).toFixed(1)} lần`;
}

function PerformancePage() {
  const qc = useQueryClient();
  const [operation, setOperation] = useState<BenchmarkPoint["operation"]>("hash_lookup");
  const [sizes, setSizes] = useState<number[]>(SIZES);
  const [iterations, setIterations] = useState("100");
  const [warmup, setWarmup] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const [focusSize, setFocusSize] = useState(10000);
  const [progress, setProgress] = useState(0);
  const runController = useRef<AbortController | null>(null);
  const iterationCount = Number(iterations);
  const validConfig =
    sizes.length > 0 &&
    Number.isInteger(iterationCount) &&
    iterationCount >= 1 &&
    iterationCount <= 1000;

  const history = useQuery({
    queryKey: ["bench-history"],
    queryFn: () => benchmarkApi.getHistory(),
  });

  const run = useMutation({
    mutationFn: async () => {
      const controller = new AbortController();
      runController.current = controller;
      setProgress(15);
      const timer = setInterval(() => setProgress((p) => Math.min(90, p + 12)), 180);
      try {
        return await benchmarkApi.run(
          {
            operation,
            sizes,
            iterations: iterationCount,
            warmup,
          },
          controller.signal,
        );
      } finally {
        clearInterval(timer);
        runController.current = null;
        if (!controller.signal.aborted) setProgress(100);
      }
    },
    onSuccess: () => {
      toast.success("Đo hoàn tất.");
      void qc.invalidateQueries({ queryKey: ["bench-history"] });
      setTimeout(() => setProgress(0), 800);
    },
    onError: (error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Đo thất bại, vui lòng thử lại.");
    },
  });

  const rows = (history.data ?? []).filter((b) => b.operation === operation);
  const chartData = rows
    .reduce<{ size: number; dsa: number; linear: number }[]>((acc, b) => {
      if (acc.some((r) => r.size === b.datasetSize)) return acc;
      acc.push({ size: b.datasetSize, dsa: b.dsaMeanMs, linear: b.baselineMeanMs });
      return acc;
    }, [])
    .sort((a, b) => a.size - b.size);

  const focus = chartData.find((r) => r.size === focusSize) ?? chartData[chartData.length - 1];
  const info = benchmarkInfo[operation];
  const exportResults = async (format: "csv" | "json") => {
    try {
      await benchmarkApi.export(format);
      toast.success(`Đã xuất kết quả ra file ${format.toUpperCase()}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xuất được kết quả.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="So sánh thời gian chạy"
        actions={
          <Button
            onClick={() => run.mutate()}
            disabled={run.isPending || !validConfig}
            className="gap-1.5"
          >
            <Play className="h-4 w-4" aria-hidden />
            {run.isPending ? "Đang đo…" : "Chạy đo"}
          </Button>
        }
      />

      <section className="surface-card p-4" aria-label="Cấu hình đo hiệu năng">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="bench-op">Chức năng cần đo</Label>
            <Select
              value={operation}
              onValueChange={(v) => setOperation(v as BenchmarkPoint["operation"])}
            >
              <SelectTrigger id="bench-op">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(operationLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Số bản ghi dùng để đo</Label>
            <div className="flex flex-wrap gap-3 pt-2">
              {SIZES.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={sizes.includes(s)}
                    onCheckedChange={(v) =>
                      setSizes((cur) =>
                        v ? [...cur, s].sort((a, b) => a - b) : cur.filter((x) => x !== s),
                      )
                    }
                    aria-label={`Kích thước ${s}`}
                  />
                  {formatNumber(s)}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iters">Số lần lặp lại</Label>
            <Input
              id="iters"
              type="number"
              min={1}
              max={1000}
              step={1}
              inputMode="numeric"
              value={iterations}
              onChange={(e) => setIterations(e.target.value)}
            />
            {!Number.isInteger(iterationCount) || iterationCount < 1 || iterationCount > 1000 ? (
              <p className="text-xs text-destructive">Nhập số nguyên từ 1 đến 1000.</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Tùy chọn</Label>
            <label className="flex items-center gap-2 pt-2 text-sm">
              <Checkbox checked={warmup} onCheckedChange={(v) => setWarmup(Boolean(v))} />
              Chạy thử 1 lần trước khi đo (nên bật)
            </label>
          </div>
        </div>

        {sizes.length === 0 ? (
          <p className="mt-3 text-xs text-destructive">Chọn ít nhất một kích thước dữ liệu.</p>
        ) : null}

        <p className="mt-3 text-sm text-muted-foreground">
          {info.description} So sánh <span className="font-medium text-foreground">{info.dsa}</span>
          {" với "}
          <span className="font-medium text-foreground">{info.baseline}</span>. Thời gian càng nhỏ
          thì chạy càng nhanh. Kết quả là thời gian trung bình của các lần chạy; ms là mili giây.
        </p>

        {run.isPending || progress > 0 ? (
          <div className="mt-4 flex items-center gap-3">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground tnum">{progress}%</span>
            {run.isPending ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  runController.current?.abort();
                  run.reset();
                  setProgress(0);
                }}
                className="gap-1"
              >
                <X className="h-4 w-4" aria-hidden />
                Huỷ
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      {history.isPending ? (
        <LoadingBlock rows={6} />
      ) : history.isError ? (
        <ErrorState onRetry={() => history.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Thuật toán (trung bình)",
                value: `${focus?.dsa.toFixed(4) ?? "—"} ms`,
                hint: info.dsa,
              },
              {
                label: "Cách đối chiếu (trung bình)",
                value: `${focus?.linear.toFixed(4) ?? "—"} ms`,
                hint: info.baseline,
              },
              {
                label: "Kết quả so sánh",
                value: focus ? comparisonText(focus.dsa, focus.linear) : "—",
                hint: `Trên ${formatNumber(focus?.size ?? 0)} bản ghi`,
              },
            ].map((c) => (
              <article key={c.label} className="surface-card p-4">
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-2xl font-bold tnum">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.hint}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <section className="surface-card p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <h2 className="truncate text-base font-semibold">{operationLabel[operation]}</h2>
                <Button variant="outline" size="sm" onClick={() => setLogScale((v) => !v)}>
                  Kiểu trục: {logScale ? "logarit" : "thông thường"}
                </Button>
              </div>
              <div className="mt-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="size"
                      tick={{ fontSize: 12 }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <YAxis
                      scale={logScale ? "log" : "linear"}
                      domain={logScale ? [0.0001, "auto"] : [0, "auto"]}
                      tick={{ fontSize: 12 }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <RTooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number, name) => [`${v} ms`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      name={info.dsa}
                      type="monotone"
                      dataKey="dsa"
                      stroke="var(--color-primary)"
                      strokeWidth={2.5}
                      dot
                    />
                    <Line
                      name={info.baseline}
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
            </section>

            <section className="surface-card p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <h2 className="truncate text-base font-semibold">So sánh ở một số lượng bản ghi</h2>
                <Select value={String(focusSize)} onValueChange={(v) => setFocusSize(Number(v))}>
                  <SelectTrigger className="w-[120px]" aria-label="Chọn điểm dữ liệu">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {formatNumber(s)} bản ghi
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      focus
                        ? [{ name: `${focus.size} bản ghi`, dsa: focus.dsa, linear: focus.linear }]
                        : []
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                    <RTooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      name={info.dsa}
                      dataKey="dsa"
                      fill="var(--color-primary)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      name={info.baseline}
                      dataKey="linear"
                      fill="var(--color-chart-5)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="surface-card overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border p-4">
              <h2 className="truncate text-base font-semibold">Lịch sử đo</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void exportResults("csv")}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void exportResults("json")}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  JSON
                </Button>
              </div>
            </div>
            <ol className="divide-y divide-border md:hidden">
              {(history.data ?? []).slice(0, 16).map((b, i) => (
                <li
                  key={`${b.operation}-${b.datasetSize}-${b.measuredAt}-${i}`}
                  className="space-y-3 px-4 py-4"
                >
                  <p className="text-xs text-muted-foreground tnum">
                    {formatDateTime(b.measuredAt)}
                  </p>
                  <p className="text-sm font-medium leading-snug">{operationLabel[b.operation]}</p>
                  <p className="text-xs text-muted-foreground">
                    Đối chiếu: {benchmarkInfo[b.operation].baseline}
                  </p>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Số bản ghi</dt>
                      <dd className="mt-0.5 font-medium tnum">{formatNumber(b.datasetSize)}</dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-muted-foreground">Số lần lặp</dt>
                      <dd className="mt-0.5 font-medium tnum">{formatNumber(b.iterations)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Thuật toán / đối chiếu</dt>
                      <dd className="mt-0.5 font-medium tnum">
                        {b.dsaMeanMs} / {b.baselineMeanMs} ms
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-muted-foreground">Kết quả</dt>
                      <dd className="mt-0.5 font-semibold text-primary tnum">
                        {comparisonText(b.dsaMeanMs, b.baselineMeanMs)}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>

            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời điểm đo</TableHead>
                    <TableHead>Phép đo</TableHead>
                    <TableHead className="text-right">Số bản ghi</TableHead>
                    <TableHead className="text-right">Số lần lặp</TableHead>
                    <TableHead className="text-right">Thuật toán (ms)</TableHead>
                    <TableHead className="text-right">Cách đối chiếu (ms)</TableHead>
                    <TableHead className="text-right">Kết quả</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(history.data ?? []).slice(0, 16).map((b, i) => (
                    <TableRow key={`${b.operation}-${b.datasetSize}-${b.measuredAt}-${i}`}>
                      <TableCell className="text-xs text-muted-foreground tnum">
                        {formatDateTime(b.measuredAt)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <p>{operationLabel[b.operation]}</p>
                        <p className="text-muted-foreground">
                          Đối chiếu: {benchmarkInfo[b.operation].baseline}
                        </p>
                      </TableCell>
                      <TableCell className="text-right tnum">
                        {formatNumber(b.datasetSize)}
                      </TableCell>
                      <TableCell className="text-right tnum">
                        {formatNumber(b.iterations)}
                      </TableCell>
                      <TableCell className="text-right tnum">{b.dsaMeanMs}</TableCell>
                      <TableCell className="text-right tnum">{b.baselineMeanMs}</TableCell>
                      <TableCell className="text-right font-semibold tnum">
                        {comparisonText(b.dsaMeanMs, b.baselineMeanMs)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
