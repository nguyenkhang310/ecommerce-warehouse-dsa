import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Boxes, Clock, Eye, Layers, PackageCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PriorityBadge } from "@/components/common/badges";
import { WhyPopover } from "@/components/common/WhyPopover";
import { LoadingBlock, EmptyState, ErrorState } from "@/components/common/states";
import { orderApi } from "@/services/api";
import { formatDateTime, relativeTime } from "@/lib/format";

export function NextOrderCard({
  detailed = false,
  onOpenHeap,
}: {
  detailed?: boolean;
  onOpenHeap?: () => void;
}) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [heapNote, setHeapNote] = useState<string | null>(null);

  const candidates = useQuery({
    queryKey: ["next-candidates"],
    queryFn: () => orderApi.getNextCandidates(3),
  });

  const extract = useMutation({
    mutationFn: () => orderApi.extractNext(),
    onSuccess: (order) => {
      if (!order) return;
      setHeapNote(`Đã xử lý ${order.orderCode}. Đơn tiếp theo đã lên đầu hàng đợi.`);
      toast.success(`Đã xử lý ${order.orderCode}`, {
        description: "Đơn tiếp theo đã sẵn sàng.",
      });
      void qc.invalidateQueries();
    },
    onError: () => toast.error("Không xử lý được đơn. Vui lòng thử lại."),
  });

  if (candidates.isPending) return <LoadingBlock rows={4} />;
  if (candidates.isError)
    return (
      <ErrorState
        onRetry={() => candidates.refetch()}
        message="Không lấy được đơn tiếp theo từ hàng đợi ưu tiên."
      />
    );

  const [next, second, third] = candidates.data ?? [];
  if (!next)
    return (
      <EmptyState icon={Layers} title="Hàng đợi trống" description="Thêm đơn mới để tiếp tục." />
    );

  return (
    <section
      className="hero-gradient surface-card relative overflow-hidden p-4 sm:p-6"
      aria-labelledby="next-order-title"
    >
      <div
        className="pointer-events-none absolute -top-20 left-1/3 h-36 w-72 rounded-full bg-primary/12 blur-3xl"
        aria-hidden
      />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">
            Đơn tiếp theo
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 id="next-order-title" className="font-mono text-2xl font-bold tracking-tight tnum">
              {next.orderCode}
            </h2>
            <PriorityBadge priority={next.priority} />
          </div>
        </div>
        <WhyPopover
          structure="Hàng đợi ưu tiên"
          comparisonKey="Ưu tiên, số thứ tự"
          complexity="Xem O(1) • Lấy ra O(log n)"
          explanation="Ưu tiên cao hơn xử lý trước; cùng mức thì đơn đến trước xử lý trước."
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Tạo lúc</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold tnum">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {formatDateTime(next.createdAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Số thứ tự</dt>
          <dd className="mt-0.5 font-mono text-sm font-semibold tnum">#{next.sequenceNumber}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Số sản phẩm</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold tnum">
            <Boxes className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {next.items.length}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Tổng số lượng</dt>
          <dd className="mt-0.5 text-sm font-semibold tnum">{next.totalQuantity}</dd>
        </div>
      </dl>

      {detailed && (second || third) ? (
        <div className="mt-4 rounded-sm border border-border bg-card/78 p-3.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Hai đơn kế tiếp</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {[second, third].filter(Boolean).map((o) => (
              <li key={o!.orderCode} className="flex flex-wrap items-center gap-2">
                <span className="font-mono tnum">{o!.orderCode}</span>
                <PriorityBadge priority={o!.priority} />
                <span className="font-mono text-xs text-muted-foreground tnum">
                  STT #{o!.sequenceNumber}
                </span>
                <span className="text-xs text-muted-foreground">
                  {o!.priorityValue < next.priorityValue
                    ? "chờ vì ưu tiên thấp hơn"
                    : "chờ vì đến sau"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Xem trước để kiểm tra · Xử lý để lấy đơn khỏi hàng đợi.
          </p>
        </div>
      ) : null}

      {heapNote ? (
        <p className="mt-3 animate-slide-in-top rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm">
          {heapNote}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={extract.isPending}
          className="gap-1.5"
        >
          <PackageCheck className="h-4 w-4" aria-hidden />
          Xử lý đơn này
        </Button>
        {detailed ? (
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              void candidates.refetch();
              toast.info(`Đơn tiếp theo: ${next.orderCode}`, {
                description: "Xem nhưng không lấy khỏi hàng đợi.",
              });
            }}
          >
            <Eye className="h-4 w-4" aria-hidden />
            Xem trước
          </Button>
        ) : (
          <Button variant="outline" className="gap-1.5" onClick={onOpenHeap}>
            Xem hàng đợi ưu tiên
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xử lý đơn {next.orderCode}?</AlertDialogTitle>
            <AlertDialogDescription>
              Lấy đơn khỏi hàng đợi ưu tiên và đưa đơn tiếp theo lên đầu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={() => extract.mutate()} disabled={extract.isPending}>
              Xác nhận xử lý
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="sr-only">Cập nhật gần nhất {relativeTime(next.createdAt)}</p>
    </section>
  );
}
