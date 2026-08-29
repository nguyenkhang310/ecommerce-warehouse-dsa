import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Info, ListPlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PriorityBadge } from "@/components/common/badges";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/common/states";
import { HeapTree } from "@/components/visualizer/HeapTree";
import { inventoryApi, orderApi } from "@/services/mockApiAdapter";
import { formatDateTime, waitingTime } from "@/lib/format";
import type { Priority } from "@/core/types";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Hàng đợi đơn — Quản lý kho" },
      {
        name: "description",
        content: "Xử lý đơn bằng Priority Heap.",
      },
      { property: "og:title", content: "Hàng đợi đơn — Quản lý kho" },
      {
        property: "og:description",
        content: "Xếp đơn theo ưu tiên và thời gian.",
      },
    ],
  }),
  component: OrdersPage,
});

function CreateOrderDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (code: string) => void;
}) {
  const qc = useQueryClient();
  const [code, setCode] = useState(`ORD-2026-${Math.floor(8400 + Math.random() * 99)}`);
  const [priority, setPriority] = useState<Priority>("high");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<{ sku: string; quantity: number }[]>([]);
  const [term, setTerm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const suggestions = useQuery({
    queryKey: ["order-prefix", term],
    queryFn: () => inventoryApi.searchProductsByPrefix(term, "auto"),
    enabled: term.trim().length > 0,
  });

  const mutation = useMutation({
    mutationFn: () =>
      orderApi.enqueue({
        orderCode: code.trim().toUpperCase(),
        priority,
        items,
        note: note || undefined,
      }),
    onSuccess: (order) => {
      toast.success(`Đã thêm ${order.orderCode} vào hàng đợi.`);
      onCreated(order.orderCode);
      void qc.invalidateQueries();
      onOpenChange(false);
      setItems([]);
      setNote("");
    },
    onError: () => toast.error("Không thêm được đơn vào hàng đợi."),
  });

  const submit = () => {
    const next: Record<string, string> = {};
    if (!code.trim()) next.code = "Vui lòng nhập mã đơn.";
    if (items.length === 0) next.items = "Cần ít nhất một sản phẩm trong đơn.";
    setErrors(next);
    if (Object.keys(next).length === 0) mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Thêm đơn vào hàng đợi</DialogTitle>
          <DialogDescription>Chèn vào Priority Heap với O(log n).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ocode">Mã đơn</Label>
              <Input
                id="ocode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono"
              />
              {errors.code ? <p className="text-xs text-destructive">{errors.code}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oprio">Mức ưu tiên</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger id="oprio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Gấp</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="normal">Thường</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="oitem">Thêm sản phẩm (gợi ý theo tiền tố • Trie)</Label>
            <Input
              id="oitem"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Gõ LAP, KEY, Bàn ph…"
            />
            {term.trim() ? (
              <div className="max-h-40 overflow-auto rounded-lg border border-border">
                {suggestions.isFetching ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Đang tìm…</p>
                ) : (suggestions.data?.entries.length ?? 0) === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Không có gợi ý phù hợp.</p>
                ) : (
                  suggestions.data!.entries.map((p) => (
                    <button
                      key={p.sku}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setItems((cur) =>
                          cur.some((i) => i.sku === p.sku)
                            ? cur
                            : [...cur, { sku: p.sku, quantity: 1 }],
                        );
                        setTerm("");
                      }}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
            {errors.items ? <p className="text-xs text-destructive">{errors.items}</p> : null}
          </div>

          {items.length > 0 ? (
            <ul className="space-y-2">
              {items.map((it, idx) => (
                <li
                  key={it.sku}
                  className="grid grid-cols-[minmax(0,1fr)_90px_auto] items-center gap-2 rounded-lg border border-border p-2"
                >
                  <span className="truncate font-mono text-xs">{it.sku}</span>
                  <Input
                    aria-label={`Số lượng cho ${it.sku}`}
                    inputMode="numeric"
                    value={String(it.quantity)}
                    onChange={(e) =>
                      setItems((cur) =>
                        cur.map((x, i) =>
                          i === idx
                            ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) }
                            : x,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Xoá ${it.sku}`}
                    onClick={() => setItems((cur) => cur.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="onote">Ghi chú nội bộ</Label>
            <Textarea
              id="onote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: khách yêu cầu giao trong ngày"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Đang chèn…" : "Chèn vào Heap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrdersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<Priority | "all">("all");
  const [highlight, setHighlight] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: ["queue-summary"],
    queryFn: () => orderApi.getQueueSummary(),
  });
  const queue = useQuery({
    queryKey: ["queue", filter],
    queryFn: () => orderApi.getQueue({ priority: filter }),
  });
  const heap = useQuery({ queryKey: ["heap"], queryFn: () => orderApi.getHeapSnapshot() });
  const log = useQuery({ queryKey: ["op-log"], queryFn: () => orderApi.getOperationLog() });

  const total =
    (summary.data?.urgent ?? 0) + (summary.data?.high ?? 0) + (summary.data?.normal ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hàng đợi xử lý đơn"
        description="Xếp đơn theo ưu tiên và thời gian."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <ListPlus className="h-4 w-4" aria-hidden />
            Thêm đơn vào hàng đợi
          </Button>
        }
      />

      {summary.isPending ? (
        <LoadingBlock rows={2} />
      ) : summary.isError ? (
        <ErrorState onRetry={() => summary.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["urgent", "Gấp", summary.data.urgent],
              ["high", "Cao", summary.data.high],
              ["normal", "Thường", summary.data.normal],
            ] as [Priority, string, number][]
          ).map(([p, label, count]) => (
            <article key={p} className="surface-card p-4">
              <div className="flex items-center justify-between gap-2">
                <PriorityBadge priority={p} />
                <span className="text-2xl font-bold tnum">{count}</span>
              </div>
              <Progress value={total ? (count / total) * 100 : 0} className="mt-3 h-2" />
              <p className="mt-2 text-xs text-muted-foreground tnum">
                {label} • chờ trung bình {summary.data.avgWaitMinutes[p]} phút
              </p>
            </article>
          ))}
        </div>
      )}

      <NextOrderCard detailed />

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Danh sách vận hành</TabsTrigger>
          <TabsTrigger value="tree">Cây Heap</TabsTrigger>
          <TabsTrigger value="log">Nhật ký thao tác</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filter} onValueChange={(v) => setFilter(v as Priority | "all")}>
              <SelectTrigger className="w-[190px]" aria-label="Lọc theo mức ưu tiên">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả mức ưu tiên</SelectItem>
                <SelectItem value="urgent">Gấp</SelectItem>
                <SelectItem value="high">Cao</SelectItem>
                <SelectItem value="normal">Thường</SelectItem>
              </SelectContent>
            </Select>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" aria-hidden />
              Bộ lọc chỉ thay đổi cách hiển thị, không thay đổi thứ tự xử lý của Heap.
            </p>
          </div>

          {queue.isPending ? (
            <LoadingBlock rows={6} />
          ) : queue.isError ? (
            <ErrorState onRetry={() => queue.refetch()} />
          ) : (queue.data ?? []).length === 0 ? (
            <EmptyState
              icon={ListPlus}
              title="Hàng đợi trống"
              description="Không có đơn phù hợp."
              action={<Button onClick={() => setCreateOpen(true)}>Thêm đơn mới</Button>}
            />
          ) : (
            <div className="surface-card overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-12">Vị trí</TableHead>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Ưu tiên</TableHead>
                    <TableHead className="text-right">Sequence</TableHead>
                    <TableHead>Tạo lúc</TableHead>
                    <TableHead>Thời gian chờ</TableHead>
                    <TableHead className="text-right">Mặt hàng / SL</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(queue.data ?? []).map((o, i) => (
                    <TableRow
                      key={o.orderCode}
                      className={highlight === o.orderCode ? "bg-primary/10" : undefined}
                    >
                      <TableCell className="text-muted-foreground tnum">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs tnum">{o.orderCode}</TableCell>
                      <TableCell>
                        <PriorityBadge priority={o.priority} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tnum">
                        #{o.sequenceNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tnum">
                        {formatDateTime(o.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs tnum">{waitingTime(o.createdAt)}</TableCell>
                      <TableCell className="text-right tnum">
                        {o.items.length} / {o.totalQuantity}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Đang chờ</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tree">
          {heap.isPending ? (
            <LoadingBlock rows={5} />
          ) : heap.isError ? (
            <ErrorState onRetry={() => heap.refetch()} />
          ) : (
            <div className="surface-card p-4">
              <HeapTree nodes={heap.data!.nodes.slice(0, 15)} highlight={highlight} />
              <p className="mt-3 text-xs text-muted-foreground">
                Hiển thị tối đa 15 node đầu của Heap ({heap.data!.size} node). Root là đơn sẽ được
                xử lý tiếp theo.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="log">
          {log.isPending ? (
            <LoadingBlock rows={5} />
          ) : (log.data ?? []).length === 0 ? (
            <EmptyState icon={Plus} title="Chưa có thao tác nào" description="Chưa có nhật ký." />
          ) : (
            <ul className="surface-card divide-y divide-border">
              {(log.data ?? []).map((e) => (
                <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3">
                  <Badge
                    variant="outline"
                    className={
                      e.level === "success"
                        ? "border-success/40 text-success"
                        : e.level === "warning"
                          ? "border-warning/40 text-warning-foreground"
                          : e.level === "error"
                            ? "border-destructive/40 text-destructive"
                            : ""
                    }
                  >
                    {e.source}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm">{e.message}</p>
                    <p className="text-xs text-muted-foreground tnum">{formatDateTime(e.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setHighlight} />
    </div>
  );
}
