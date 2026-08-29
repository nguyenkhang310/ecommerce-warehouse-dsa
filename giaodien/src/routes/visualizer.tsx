import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { ComplexityChip } from "@/components/common/badges";
import { ErrorState, LoadingBlock } from "@/components/common/states";
import { HeapTree } from "@/components/visualizer/HeapTree";
import { inventoryApi, orderApi, visualizerApi } from "@/services/mockApiAdapter";
import { formatMs, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/visualizer")({
  head: () => ({
    meta: [
      { title: "Mô phỏng DSA — Quản lý kho" },
      {
        name: "description",
        content: "Mô phỏng cấu trúc dữ liệu.",
      },
      { property: "og:title", content: "Mô phỏng DSA — Quản lý kho" },
      {
        property: "og:description",
        content: "Mô phỏng bốn cấu trúc dữ liệu.",
      },
    ],
  }),
  component: VisualizerPage,
});

function Legend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {[
        ["bg-card border-border", "Node thường"],
        ["bg-primary/15 border-primary", "Node hiện tại"],
        ["bg-accent/20 border-accent", "Node đang so sánh"],
        ["bg-success/15 border-success", "Node kết thúc từ / kết quả"],
      ].map(([cls, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded border ${cls}`} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}

function Pseudocode({ lines, active }: { lines: string[]; active: number }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-3 font-mono text-xs leading-6">
      {lines.map((line, i) => (
        <div
          key={line}
          className={
            i === active ? "rounded bg-primary/15 px-1 font-semibold text-primary" : "px-1"
          }
        >
          {line}
        </div>
      ))}
    </pre>
  );
}

function DefenseExplain({
  problem,
  why,
  complexity,
}: {
  problem: string;
  why: string;
  complexity: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" aria-hidden />
        Giải thích như khi bảo vệ
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Giải thích ngắn gọn</DialogTitle>
            <DialogDescription>
              Ba phần: bài toán, lý do chọn cấu trúc, độ phức tạp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-semibold">Bài toán: </span>
              {problem}
            </p>
            <p>
              <span className="font-semibold">Lý do chọn cấu trúc: </span>
              {why}
            </p>
            <p>
              <span className="font-semibold">Độ phức tạp: </span>
              <span className="font-mono">{complexity}</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------ Hash tab ------------------------------ */

function HashTab() {
  const [input, setInput] = useState("LAP-DELL-5420");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const buckets = useQuery({
    queryKey: ["hash-buckets"],
    queryFn: () => visualizerApi.getHashSnapshot(24),
  });
  const lookup = useQuery({
    queryKey: ["hash-lookup", input],
    queryFn: () => inventoryApi.lookupProductExact(input),
    enabled: input.trim().length > 0,
  });

  const steps = [
    `Chuẩn hóa khóa đầu vào "${input.toUpperCase()}"`,
    "Tính hash bằng djb2",
    "Lấy bucket index = hash % capacity",
    "Duyệt chain trong bucket để so khớp khóa",
    "Trả về bản ghi tương ứng",
  ];

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), 1200 / speed);
    return () => clearInterval(id);
  }, [playing, speed, steps.length]);

  const trace = lookup.data?.trace;

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      <div className="surface-card space-y-3 p-4">
        <Label htmlFor="hash-input">productCode hoặc orderId</Label>
        <Input
          id="hash-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="font-mono"
        />
        <Button
          className="w-full gap-1.5"
          onClick={() => lookup.refetch()}
          disabled={lookup.isFetching}
        >
          <Search className="h-4 w-4" aria-hidden />
          {lookup.isFetching ? "Đang tra cứu…" : "Tra cứu"}
        </Button>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Bước trước"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={playing ? "Tạm dừng" : "Chạy"}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Bước sau"
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <Select value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
            <SelectTrigger className="w-[92px]" aria-label="Tốc độ">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Đặt lại"
            onClick={() => {
              setStep(0);
              setPlaying(false);
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <Pseudocode
          lines={[
            "index = hash(key) % capacity",
            "chain = buckets[index]",
            "for entry in chain:",
            "  if entry.key == key: return entry",
            "return null",
          ]}
          active={Math.min(step, 4)}
        />
        <DefenseExplain
          problem="Tra cứu theo mã (MC1)."
          why="Truy cập trực tiếp theo khóa."
          complexity="Average O(1), worst O(n) khi collision dồn về một bucket, space O(n)."
        />
      </div>

      <div className="surface-card p-4">
        {buckets.isPending ? (
          <LoadingBlock rows={6} />
        ) : buckets.isError ? (
          <ErrorState onRetry={() => buckets.refetch()} />
        ) : (
          <div className="grid-lab max-h-[520px] overflow-auto rounded-xl border border-border p-3">
            <ul className="space-y-1.5">
              {buckets.data!.map((b) => (
                <li
                  key={b.index}
                  className={`grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${
                    trace && trace.bucketIndex === b.index
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="font-mono text-muted-foreground tnum">#{b.index}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {b.entries.length === 0 ? (
                      <span className="text-muted-foreground">trống</span>
                    ) : (
                      b.entries.map((e) => (
                        <Badge key={e.sku} variant="outline" className="font-mono text-[10px]">
                          {e.sku}
                        </Badge>
                      ))
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-3">
          <Legend />
        </div>
      </div>

      <div className="surface-card space-y-3 p-4">
        <h3 className="text-sm font-semibold">Operation inspector</h3>
        {lookup.isPending ? (
          <LoadingBlock rows={4} />
        ) : trace ? (
          <dl className="space-y-2 text-sm">
            {[
              ["Input", trace.input],
              ["Hash value", String(trace.hashValue)],
              ["Bucket index", `#${trace.bucketIndex}`],
              ["Số phép so sánh", String(trace.comparisons)],
              ["Thời gian", formatMs(trace.elapsedMs)],
              ["Kết quả", trace.found ? "Tìm thấy" : "Không tồn tại"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono text-xs tnum">{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <ComplexityChip>Average O(1)</ComplexityChip>
          <ComplexityChip tone="amber">Worst O(n)</ComplexityChip>
          <ComplexityChip tone="cyan">Space O(n)</ComplexityChip>
        </div>
        <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
          Bước {step + 1}/{steps.length}: {steps[step]}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ Heap tab ------------------------------ */

function HeapTab() {
  const qc = useQueryClient();
  const heap = useQuery({ queryKey: ["heap"], queryFn: () => orderApi.getHeapSnapshot() });
  const [note, setNote] = useState<string | null>(null);

  const insert = useMutation({
    mutationFn: () =>
      orderApi.enqueue({
        orderCode: `ORD-2026-${Math.floor(8500 + Math.random() * 400)}`,
        priority: Math.random() > 0.6 ? "urgent" : "normal",
        items: [{ sku: "KEY-LOGI-K380", quantity: 2 }],
      }),
    onSuccess: (o) => {
      setNote(`Đã chèn ${o.orderCode} và sift-up. O(log n).`);
      void qc.invalidateQueries();
    },
  });

  const extract = useMutation({
    mutationFn: () => orderApi.extractNext(),
    onSuccess: (o) => {
      if (o) setNote(`Đã extract ${o.orderCode} và sift-down. O(log n).`);
      void qc.invalidateQueries();
    },
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="surface-card p-4">
        {heap.isPending ? (
          <LoadingBlock rows={5} />
        ) : heap.isError ? (
          <ErrorState onRetry={() => heap.refetch()} />
        ) : (
          <HeapTree nodes={heap.data!.nodes.slice(0, 15)} />
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => insert.mutate()} disabled={insert.isPending}>
            Thêm đơn
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const root = heap.data?.nodes[0];
              toast.info(root ? `Peek: ${root.orderCode}` : "Heap trống", {
                description: "Xem nhưng không loại khỏi Heap.",
              });
            }}
          >
            Peek
          </Button>
          <Button variant="outline" onClick={() => extract.mutate()} disabled={extract.isPending}>
            Extract
          </Button>
        </div>
        {note ? (
          <p className="mt-3 animate-slide-in-top rounded-lg border border-primary/25 bg-primary/8 p-2 text-sm">
            {note}
          </p>
        ) : null}
        <div className="mt-3">
          <Legend />
        </div>
      </div>

      <div className="surface-card space-y-3 p-4">
        <h3 className="text-sm font-semibold">Comparator</h3>
        <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
          <li>Priority lớn hơn được ưu tiên.</li>
          <li>Cùng mức: sequence nhỏ hơn trước.</li>
        </ol>
        <div className="rounded-lg border border-border p-3 text-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Ví dụ FIFO cùng mức Gấp
          </p>
          <p className="mt-1 font-mono text-xs tnum">ORD-2026-08341 • p3 • seq 3281 → thắng</p>
          <p className="font-mono text-xs text-muted-foreground tnum">
            ORD-2026-08342 • p3 • seq 3282
          </p>
        </div>
        <Pseudocode
          lines={[
            "if a.priority != b.priority:",
            "  return b.priority - a.priority",
            "return a.sequence - b.sequence",
          ]}
          active={0}
        />
        <div className="flex flex-wrap gap-2">
          <ComplexityChip tone="emerald">Peek O(1)</ComplexityChip>
          <ComplexityChip>Insert O(log n)</ComplexityChip>
          <ComplexityChip>Extract O(log n)</ComplexityChip>
        </div>
        <DefenseExplain
          problem="Lấy đơn ưu tiên và giữ FIFO."
          why="Root là đơn ưu tiên nhất; cập nhật O(log n)."
          complexity="Peek O(1), Insert O(log n), Extract O(log n)."
        />
      </div>
    </div>
  );
}

/* ------------------------------ Trie tab ------------------------------ */

function TrieTab() {
  const [prefix, setPrefix] = useState("lap");
  const [field, setField] = useState<"sku" | "name">("sku");
  const snapshot = useQuery({
    queryKey: ["trie", prefix, field],
    queryFn: () => visualizerApi.getTrieSnapshot(prefix, field),
  });

  const byDepth = new Map<
    number,
    typeof snapshot.data extends undefined ? never : NonNullable<typeof snapshot.data>["nodes"]
  >();
  for (const n of snapshot.data?.nodes ?? []) {
    const list = byDepth.get(n.depth) ?? [];
    list.push(n);
    byDepth.set(n.depth, list);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="surface-card p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
          <div className="space-y-1.5">
            <Label htmlFor="trie-input">Tiền tố</Label>
            <Input
              id="trie-input"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="font-mono"
              placeholder="Gõ từng ký tự…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trie-field">Tìm theo</Label>
            <Select value={field} onValueChange={(v) => setField(v as "sku" | "name")}>
              <SelectTrigger id="trie-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sku">Mã sản phẩm</SelectItem>
                <SelectItem value="name">Tên sản phẩm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {snapshot.isPending ? (
          <LoadingBlock rows={5} className="mt-4" />
        ) : snapshot.isError ? (
          <ErrorState onRetry={() => snapshot.refetch()} />
        ) : (
          <div className="grid-lab mt-4 max-h-[420px] overflow-auto rounded-xl border border-border p-4">
            {Array.from(byDepth.keys())
              .sort((a, b) => a - b)
              .map((depth) => (
                <div key={depth} className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">
                    depth {depth}
                  </span>
                  {byDepth.get(depth)!.map((n) => (
                    <span
                      key={n.id}
                      className={`grid h-9 w-9 place-items-center rounded-lg border font-mono text-sm ${
                        n.onPath ? "border-accent bg-accent/20" : "border-border bg-card"
                      } ${n.isWord ? "ring-2 ring-success/60" : ""}`}
                      title={n.isWord ? "Node kết thúc từ" : undefined}
                    >
                      {n.char}
                    </span>
                  ))}
                </div>
              ))}
            {(snapshot.data?.nodes.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Không có nhánh nào khớp tiền tố này.</p>
            ) : null}
          </div>
        )}
        <div className="mt-3">
          <Legend />
        </div>
      </div>

      <div className="surface-card space-y-3 p-4">
        <h3 className="text-sm font-semibold">Gợi ý theo tiền tố</h3>
        {snapshot.isPending ? (
          <LoadingBlock rows={4} />
        ) : (
          <ul className="space-y-1.5">
            {(snapshot.data?.suggestions ?? []).map((s) => (
              <li key={s.sku} className="rounded-lg border border-border px-3 py-2">
                <p className="font-mono text-xs text-muted-foreground">{s.sku}</p>
                <p className="truncate text-sm">{s.name}</p>
              </li>
            ))}
            {(snapshot.data?.suggestions.length ?? 0) === 0 ? (
              <li className="text-sm text-muted-foreground">Chưa có kết quả.</li>
            ) : null}
          </ul>
        )}
        <dl className="space-y-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Prefix length (k)</dt>
            <dd className="font-mono tnum">{snapshot.data?.prefixLength ?? 0}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Số kết quả (m)</dt>
            <dd className="font-mono tnum">{snapshot.data?.matches ?? 0}</dd>
          </div>
        </dl>
        <ComplexityChip tone="cyan">O(k + m)</ComplexityChip>
        <DefenseExplain
          problem="Gợi ý theo tiền tố (TP2)."
          why="Đi theo từng ký tự, không quét toàn bộ."
          complexity="O(k + m) với k là độ dài tiền tố và m là số kết quả trả về."
        />
      </div>
    </div>
  );
}

/* --------------------------- Recent list tab --------------------------- */

function RecentTab() {
  const qc = useQueryClient();
  const snapshot = useQuery({
    queryKey: ["recent-snapshot"],
    queryFn: () => visualizerApi.getRecentListSnapshot(),
  });
  const products = useQuery({
    queryKey: ["products", "all", "all"],
    queryFn: () => inventoryApi.getProducts({}),
  });
  const [sku, setSku] = useState("STO-SAM-990P");
  const [note, setNote] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: () =>
      inventoryApi.updateStock(sku, { delta: 10, reason: "inbound", note: "Từ mô phỏng DSA" }),
    onSuccess: (res) => {
      setNote(
        res.movedToFront
          ? `${sku}: move-to-front O(1).`
          : `${sku}: thêm vào HEAD${res.evicted ? `, loại ${res.evicted}` : ""}.`,
      );
      void qc.invalidateQueries();
    },
  });

  const items = snapshot.data?.items ?? [];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="surface-card p-4">
        {snapshot.isPending ? (
          <LoadingBlock rows={4} />
        ) : snapshot.isError ? (
          <ErrorState onRetry={() => snapshot.refetch()} />
        ) : (
          <>
            <div className="grid-lab overflow-x-auto rounded-xl border border-border p-4">
              <div className="flex min-w-max items-center gap-2">
                <Badge variant="outline" className="shrink-0">
                  HEAD
                </Badge>
                {items.map((it, i) => (
                  <div key={it.sku} className="flex items-center gap-2">
                    <div className="animate-slide-in-top w-[150px] rounded-xl border border-border bg-card p-2.5">
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {it.sku}
                      </p>
                      <p className="truncate text-xs font-medium">{it.name}</p>
                      <p
                        className={`text-xs font-bold tnum ${it.delta >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {it.delta > 0 ? "+" : ""}
                        {it.delta} → {formatNumber(it.stockAfter)}
                      </p>
                    </div>
                    {i < items.length - 1 ? (
                      <span className="text-muted-foreground" aria-hidden>
                        ⇄
                      </span>
                    ) : null}
                  </div>
                ))}
                <Badge variant="outline" className="shrink-0">
                  TAIL
                </Badge>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Hash Map: SKU → vị trí node
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {(snapshot.data?.map ?? []).map((m) => (
                  <li
                    key={m.key}
                    className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-[11px] tnum"
                  >
                    {m.key} → #{m.position}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
        <div className="mt-3">
          <Legend />
        </div>
      </div>

      <div className="surface-card space-y-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="recent-sku">Chọn sản phẩm</Label>
          <Select value={sku} onValueChange={setSku}>
            <SelectTrigger id="recent-sku">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(products.data ?? []).slice(0, 12).map((p) => (
                <SelectItem key={p.sku} value={p.sku}>
                  {p.sku}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" onClick={() => update.mutate()} disabled={update.isPending}>
          {update.isPending ? "Đang cập nhật…" : "Cập nhật tồn kho (+10)"}
        </Button>
        {note ? (
          <p className="animate-slide-in-top rounded-lg border border-primary/25 bg-primary/8 p-2 text-sm">
            {note}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <ComplexityChip tone="emerald">lookup O(1)</ComplexityChip>
          <ComplexityChip tone="emerald">move-to-front O(1)</ComplexityChip>
          <ComplexityChip tone="emerald">remove tail O(1)</ComplexityChip>
        </div>
        <DefenseExplain
          problem="Xem sản phẩm vừa cập nhật (TP3)."
          why="Đổi thứ tự và tìm node trong O(1)."
          complexity="lookup O(1), move-to-front O(1), remove tail O(1)."
        />
      </div>
    </div>
  );
}

function VisualizerPage() {
  const [tab, setTab] = useState("hash");
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const order = ["hash", "heap", "trie", "recent"];
    const id = setInterval(() => {
      setTab((t) => order[(order.indexOf(t) + 1) % order.length]);
    }, 4500);
    return () => clearInterval(id);
  }, [auto]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mô phỏng DSA"
        description="Mô phỏng bốn cấu trúc dữ liệu."
        actions={
          <Button
            variant={auto ? "default" : "outline"}
            onClick={() => setAuto((v) => !v)}
            className="gap-1.5"
          >
            {auto ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
            {auto ? "Dừng demo tự động" : "Chạy demo tự động"}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="hash">Hash Table</TabsTrigger>
          <TabsTrigger value="heap">Priority Heap</TabsTrigger>
          <TabsTrigger value="trie">Trie</TabsTrigger>
          <TabsTrigger value="recent">Recent Updates</TabsTrigger>
        </TabsList>
        <TabsContent value="hash">
          <HashTab />
        </TabsContent>
        <TabsContent value="heap">
          <HeapTab />
        </TabsContent>
        <TabsContent value="trie">
          <TrieTab />
        </TabsContent>
        <TabsContent value="recent">
          <RecentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
