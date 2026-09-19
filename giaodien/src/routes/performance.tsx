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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { benchmarkApi } from "@/services/api";
import { formatDateTime, formatNumber, operationLabel } from "@/lib/format";
import type { BenchmarkPoint } from "@/core/types";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Đánh giá hiệu năng — Quản lý kho" },
      {
        name: "description",
        content: "So sánh giải pháp DSA của nhóm với phương pháp duyệt tuyến tính.",
      },
      { property: "og:title", content: "Đánh giá hiệu năng — Quản lý kho" },
      {
        property: "og:description",
        content: "So sánh hiệu năng các cấu trúc dữ liệu.",
      },
    ],
  }),
  component: PerformancePage,
});

const SIZES = [1000, 5000, 10000];

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
            iterations: Number(iterations) || 100,
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
      toast.error("Đo thất bại, vui lòng thử lại.");
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
  const speedup = focus ? focus.linear / focus.dsa : 0;
  const baselineLabel =
    operation === "initial_load"
      ? "sắp xếp có sẵn của C++ (stable_sort)"
      : operation === "heap_extract"
        ? "quét toàn bộ hàng đợi"
        : "quét toàn bộ danh sách";
  const smallest = chartData[0];
  const largest = chartData[chartData.length - 1];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đánh giá hiệu năng"
        description="So sánh giải pháp DSA của nhóm với phương pháp duyệt tuyến tính truyền thống."
        actions={
          <Button onClick={() => run.mutate()} disabled={run.isPending} className="gap-1.5">
            <Play className="h-4 w-4" aria-hidden />
            {run.isPending ? "Đang đo…" : "Bắt đầu đo"}
          </Button>
        }
      />

      <section className="surface-card p-4" aria-label="Cấu hình đo hiệu năng">
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
                <SelectItem value="hash_lookup">Tra cứu theo mã</SelectItem>
                <SelectItem value="heap_extract">Lấy đơn ưu tiên</SelectItem>
                <SelectItem value="trie_prefix">Tìm theo tiền tố</SelectItem>
                <SelectItem value="initial_load">Sắp xếp Merge Sort</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kích thước tập dữ liệu</Label>
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
            <Label htmlFor="iters">Số lần lặp lại</Label>
            <Input
              id="iters"
              inputMode="numeric"
              value={iterations}
              onChange={(e) => setIterations(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tùy chọn</Label>
            <label className="flex items-center gap-2 pt-2 text-sm">
              <Checkbox checked={warmup} onCheckedChange={(v) => setWarmup(Boolean(v))} />
              Chạy khởi động để ổn định kết quả
            </label>
          </div>
        </div>

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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Giải pháp DSA (trung bình)",
                value: `${focus?.dsa.toFixed(4) ?? "—"} ms`,
                hint: `Với ${formatNumber(focus?.size ?? 0)} bản ghi`,
              },
              {
                label: "Duyệt tuyến tính (trung bình)",
                value: `${focus?.linear.toFixed(4) ?? "—"} ms`,
                hint: "Cùng tập dữ liệu",
              },
              {
                label: "Nhanh hơn",
                value: `${speedup.toFixed(1)}x`,
                hint: "So với duyệt tuyến tính",
              },
              {
                label: "Độ ổn định khi tăng dữ liệu",
                value: smallest && largest ? `${(largest.dsa / smallest.dsa).toFixed(2)}x` : "—",
                hint: "Càng gần 1 càng ổn định",
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
                  Thang đo: {logScale ? "logarit" : "tuyến tính"}
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
              <p className="mt-2 text-xs text-muted-foreground">
                Cả hai phương pháp chạy trên cùng tập dữ liệu, tối đa{" "}
                {formatNumber(largest?.size ?? 0)} bản ghi. Đường liền là giải pháp DSA, đường đứt
                nét là phương pháp đối chứng ({baselineLabel}).
              </p>
              <table className="mt-3 w-full text-xs">
                <caption className="sr-only">Số liệu chi tiết của biểu đồ</caption>
                <thead>
                  <tr className="text-muted-foreground">
                    <th scope="col" className="py-1 text-left">
                      Số bản ghi
                    </th>
                    <th scope="col" className="py-1 text-right">
                      Giải pháp DSA (ms)
                    </th>
                    <th scope="col" className="py-1 text-right">
                      Duyệt tuyến tính (ms)
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
                <h2 className="truncate text-base font-semibold">So sánh tại một điểm dữ liệu</h2>
                <Select value={String(focusSize)} onValueChange={(v) => setFocusSize(Number(v))}>
                  <SelectTrigger className="w-[120px]" aria-label="Chọn điểm dữ liệu">
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
                      name="Giải pháp DSA"
                      dataKey="dsa"
                      fill="var(--color-primary)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      name="Duyệt tuyến tính"
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
                    <li>Sử dụng dữ liệu thực từ backend C++.</li>
                    <li>Chạy khởi động trước, lặp nhiều lần rồi lấy giá trị trung bình.</li>
                    <li>Hai phương pháp chạy trên cùng đầu vào để đảm bảo công bằng.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          <section className="surface-card overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border p-4">
              <h2 className="truncate text-base font-semibold">Lịch sử đo</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={async () => {
                    await benchmarkApi.export("csv");
                    toast.success("Đã xuất kết quả ra file CSV.");
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
                    toast.success("Đã xuất kết quả ra file JSON.");
                  }}
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
                      <dt className="text-muted-foreground">Trung bình DSA / tuyến tính</dt>
                      <dd className="mt-0.5 font-medium tnum">
                        {b.dsaMeanMs} / {b.baselineMeanMs} ms
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-muted-foreground">Nhanh hơn</dt>
                      <dd className="mt-0.5 font-semibold text-primary tnum">
                        {(b.baselineMeanMs / b.dsaMeanMs).toFixed(1)}x
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
                    <TableHead className="text-right">Trung bình DSA (ms)</TableHead>
                    <TableHead className="text-right">Trung bình tuyến tính (ms)</TableHead>
                    <TableHead className="text-right">Nhanh hơn</TableHead>
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
