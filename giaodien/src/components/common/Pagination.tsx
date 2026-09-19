import { Button } from "@/components/ui/button";

// Thanh chuyển trang dùng chung cho bảng sản phẩm và hàng đợi đơn.
export function Pagination({
  from,
  to,
  total,
  unit,
  page,
  pageCount,
  onPrev,
  onNext,
  className = "border-t border-border p-4",
}: {
  from: number;
  to: number;
  total: number;
  unit: string;
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 text-sm ${className}`}
    >
      <p className="text-muted-foreground tnum">
        Hiển thị {from}–{to} / {total} {unit}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page === 1}>
          Trước
        </Button>
        <span className="text-xs text-muted-foreground tnum">
          Trang {page}/{pageCount}
        </span>
        <Button variant="outline" size="sm" onClick={onNext} disabled={page === pageCount}>
          Sau
        </Button>
      </div>
    </div>
  );
}
