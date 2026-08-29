import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Play, TriangleAlert, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { ErrorState, LoadingBlock } from "@/components/common/states";
import { benchmarkApi } from "@/services/mockApiAdapter";
import { formatDateTime, formatNumber, operationLabel } from "@/lib/format";
import type { BenchmarkPoint } from "@/core/types";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Hiệu năng — Quản lý kho" },
      {
        name: "description",
        content: "So sánh DSA với quét tuyến tính.",
      },
      { property: "og:title", content: "Hiệu năng — Quản lý kho" },
      {
        property: "og:description",
        content: "Đo hiệu năng cấu trúc dữ liệu.",
      },
    ],
  }),
  component: PerformancePage,
});

const SIZES = [1000, 5000, 10000, 50000];

function PerformancePage() {
  const qc = useQueryClient();
  const [operation, setOperation] = useState<BenchmarkPoint["operation"]>("hash_lookup");
  const [sizes, setSizes] = useState<number[]>(SIZES);
  const [iterations, setIterations] = useState("1000");
  const [warmup, setWarmup] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const [focusSize, setFocusSize] = useState(10000);
  const [progress, setProgress] = useState(0);

  const history = useQuery({
    queryKey: ["bench-history"],
    queryFn: () => benchmarkApi.getHistory(),
  });

  const run = useMutation({
    mutationFn: async () => {
      setProgress(15);
      const timer = setInterval(() => setProgress((p) => Math.min(90, p + 12)), 180);
      try {
        return await benchmarkApi.run({
          operation,
          sizes,
          iterations: Number(iterations) || 1000,
          warmup,
        });
      } finally {
        clearInterval(timer);
        setProgress(100);
      }
    },
    onSuccess: () => {
      toast.success("Đã chạy benchmark.");
      void qc.invalidateQueries({ queryKey: ["bench-history"] });
      setTimeout(() => setProgress(0), 800);
    },
    onError: () => toast.error("Benchmark thất bại. Vui lòng thử lại."),
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
  const speedup = focus ? focus.linear / focus.dsa : 0;
  const smallest = chartData[0];
  const largest = chartData[chartData.length - 1];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đo hiệu năng thực nghiệm"
        description="So sánh DSA với quét tuyến tính."
        actions={
          <Button onClick={() => run.mutate()} disabled={run.isPending} className="gap-1.5">
            <Play className="h-4 w-4" aria-hidden />
            {run.isPending ? "Đang chạy…" : "Chạy benchmark"}
          </Button>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <p className="text-sm">Dữ liệu mô phỏng, chỉ dùng thử.</p>
      </div>

      <section className="surface-card p-4" aria-label="Thiết lập benchmark">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="bench-op">Phép đo</Label>
            <Select
              value={operation}
              onValueChange={(v) => setOperation(v as BenchmarkPoint["operation"])}
            >
              <SelectTrigger id="bench-op">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hash_lookup">Hash lookup vs Linear scan</SelectItem>
                <SelectItem value="heap_extract">Heap extract vs Scan max</SelectItem>
                <SelectItem value="trie_prefix">Trie prefix search vs String scan</SelectItem>
                <SelectItem value="initial_load">Merge sort + initial loading</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kích thước dữ liệu</Label>
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
                  {s / 1000}K
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="iters">Số lần lặp</Label>
            <Input
              id="iters"
              inputMode="numeric"
              value={iterations}
              onChange={(e) => setIterations(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tuỳ chọn</Label>
            <label className="flex items-center gap-2 pt-2 text-sm">
              <Checkbox checked={warmup} onCheckedChange={(v) => setWarmup(Boolean(v))} />
              Chạy warm-up trước khi đo
            </label>
          </div>
        </div>

        {run.isPending || progress > 0 ? (
          <div className="mt-4 flex items-center gap-3">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground tnum">{progress}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                run.reset();
                setProgress(0);
              }}
              className="gap-1"
            >
              <X className="h-4 w-4" aria-hidden />
              Huỷ
            </Button>
          </div>
        ) : null}
      </section>

      {history.isPending ? (
        <LoadingBlock rows={6} />
      ) : history.isError ? (
        <ErrorState onRetry={() => history.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Thời gian cấu trúc DSA",
                value: `${focus?.dsa.toFixed(4) ?? "—"} ms`,
                hint: `Tại ${formatNumber(focus?.size ?? 0)} bản ghi`,
              },
              {
                label: "Thời gian linear baseline",
                value: `${focus?.linear.toFixed(4) ?? "—"} ms`,
                hint: "Quét tuyến tính cùng input",
              },
              { label: "Nhanh hơn", value: `${speedup.toFixed(1)}x`, hint: "So với baseline" },
              {
                label: "Xu hướng khi tăng 10 lần dữ liệu",
                value: smallest && largest ? `${(largest.dsa / smallest.dsa).toFixed(2)}x` : "—",
                hint: "Chi phí tăng của cấu trúc DSA",
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
                  Thang {logScale ? "Log" : "Linear"}
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
                      name="Cấu trúc đã chọn (DSA)"
                      type="monotone"
                      dataKey="dsa"
                      stroke="var(--color-primary)"
                      strokeWidth={2.5}
                      dot
                    />
                    <Line
                      name="Linear scan (baseline)"
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
                Chênh lệch rõ rệt nhất ở mốc {formatNumber(largest?.size ?? 0)} bản ghi, nơi quét
                tuyến tính tăng gần tuyến tính theo n.
              </p>
              <table className="mt-3 w-full text-xs">
                <caption className="sr-only">Bảng số liệu thay thế cho biểu đồ</caption>
                <thead>
                  <tr className="text-muted-foreground">
                    <th scope="col" className="py-1 text-left">
                      Bản ghi
                    </th>
                    <th scope="col" className="py-1 text-right">
                      DSA (ms)
                    </th>
                    <th scope="col" className="py-1 text-right">
                      Baseline (ms)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((r) => (
                    <tr key={r.size} className="border-t border-border">
                      <td className="py-1 tnum">{formatNumber(r.size)}</td>
                      <td className="py-1 text-right tnum">{r.dsa}</td>
                      <td className="py-1 text-right tnum">{r.linear}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="surface-card p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <h2 className="truncate text-base font-semibold">So sánh tại một mốc</h2>
                <Select value={String(focusSize)} onValueChange={(v) => setFocusSize(Number(v))}>
                  <SelectTrigger className="w-[120px]" aria-label="Chọn mốc dữ liệu">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZES.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s / 1000}K
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
                      name="Cấu trúc đã chọn"
                      dataKey="dsa"
                      fill="var(--color-primary)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      name="Linear scan"
                      dataKey="linear"
                      fill="var(--color-chart-5)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="surface-card p-5">
            <Accordion type="single" collapsible>
              <AccordionItem value="method">
                <AccordionTrigger>Phương pháp đo</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Dữ liệu lấy từ chương trình.</li>
                    <li>Có warm-up và lặp nhiều lần.</li>
                    <li>Hai cách dùng cùng input.</li>
                    <li>Storage không thay thế core DSA.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          <section className="surface-card overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border p-4">
              <h2 className="truncate text-base font-semibold">Lịch sử benchmark</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={async () => {
                    await benchmarkApi.export("csv");
                    toast.success("Đã xuất lịch sử benchmark ra CSV.");
                  }}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={async () => {
                    await benchmarkApi.export("json");
                    toast.success("Đã xuất lịch sử benchmark ra JSON.");
                  }}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  JSON
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian chạy</TableHead>
                    <TableHead>Phép đo</TableHead>
                    <TableHead className="text-right">Dataset</TableHead>
                    <TableHead className="text-right">Iterations</TableHead>
                    <TableHead className="text-right">DSA mean</TableHead>
                    <TableHead className="text-right">Baseline mean</TableHead>
                    <TableHead className="text-right">Speedup</TableHead>
                    <TableHead>Mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(history.data ?? []).slice(0, 16).map((b, i) => (
                    <TableRow key={`${b.operation}-${b.datasetSize}-${b.measuredAt}-${i}`}>
                      <TableCell className="text-xs text-muted-foreground tnum">
                        {formatDateTime(b.measuredAt)}
                      </TableCell>
                      <TableCell className="text-xs">{operationLabel[b.operation]}</TableCell>
                      <TableCell className="text-right tnum">
                        {formatNumber(b.datasetSize)}
                      </TableCell>
                      <TableCell className="text-right tnum">
                        {formatNumber(b.iterations)}
                      </TableCell>
                      <TableCell className="text-right tnum">{b.dsaMeanMs}</TableCell>
                      <TableCell className="text-right tnum">{b.baselineMeanMs}</TableCell>
                      <TableCell className="text-right font-semibold tnum">
                        {(b.baselineMeanMs / b.dsaMeanMs).toFixed(1)}x
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-warning/40 text-warning-foreground"
                        >
                          {b.mode}
                        </Badge>
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
