import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Boxes, Clock, Layers, PackageCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/basic";
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
import { formatDateTime } from "@/lib/format";

export function NextOrderCard({
  onOpenQueue,
}: {
  onOpenQueue?: () => void;
}) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const candidates = useQuery({
    queryKey: ["next-candidates"],
    queryFn: () => orderApi.getNextCandidates(1),
  });

  const extract = useMutation({
    mutationFn: () => orderApi.extractNext(),
    onSuccess: (order) => {
      if (!order) return;
      toast.success(`Đã xử lý ${order.orderCode}.`);
      void qc.invalidateQueries();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Không xử lý được đơn. Vui lòng thử lại."),
  });

  if (candidates.isPending) return <LoadingBlock rows={4} />;
  if (candidates.isError)
    return (
      <ErrorState
        onRetry={() => candidates.refetch()}
        message="Không lấy được đơn tiếp theo từ hàng đợi ưu tiên."
      />
    );

  const [next] = candidates.data ?? [];
  if (!next)
    return (
      <EmptyState icon={Layers} title="Hàng đợi trống" description="Thêm đơn mới để tiếp tục." />
    );

  return (
    <section
      className="surface-card relative min-w-0 overflow-hidden p-4 sm:p-5"
      aria-labelledby="next-order-title"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">
            Đơn tiếp theo
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 id="next-order-title" className="font-mono text-xl font-semibold tracking-tight tnum">
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

      <dl className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <dt className="text-xs text-muted-foreground">Tạo lúc</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold tnum">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {formatDateTime(next.createdAt)}
          </dd>
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

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={extract.isPending}
          className="gap-1.5"
        >
          <PackageCheck className="h-4 w-4" aria-hidden />
          Xử lý đơn này
        </Button>
        {onOpenQueue ? (
          <Button variant="outline" className="gap-1.5" onClick={onOpenQueue}>
            Xem hàng đợi
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xử lý đơn {next.orderCode}?</AlertDialogTitle>
            <AlertDialogDescription>
              Lấy đơn khỏi hàng đợi ưu tiên, đánh dấu đã xử lý và đưa đơn tiếp theo lên đầu.
              Demo này không tự trừ tồn kho; nhập/xuất kho được cập nhật tại mục Sản phẩm.
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
    </section>
  );
}
