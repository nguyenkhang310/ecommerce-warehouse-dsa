import { CheckCircle2, ChevronsUp, CircleSlash, Flame, Minus, TriangleAlert } from "lucide-react";
import type { Priority, StockStatus } from "@/core/types";
import { priorityLabel, statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const map = {
    urgent: {
      cls: "border-red-200 bg-red-50 text-red-700",
      Icon: Flame,
    },
    high: {
      cls: "border-primary/20 bg-primary/10 text-primary",
      Icon: ChevronsUp,
    },
    normal: {
      cls: "border-slate-200 bg-slate-100 text-slate-600",
      Icon: Minus,
    },
  } as const;
  const { cls, Icon } = map[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        cls,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {priorityLabel[priority]}
    </span>
  );
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const map = {
    in_stock: {
      cls: "border-primary/20 bg-primary/10 text-primary",
      Icon: CheckCircle2,
    },
    low_stock: {
      cls: "border-destructive/20 bg-destructive/5 text-destructive",
      Icon: TriangleAlert,
    },
    out_of_stock: {
      cls: "border-red-200 bg-red-50 text-red-700",
      Icon: CircleSlash,
    },
  } as const;
  const { cls, Icon } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        cls,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {statusLabel[status]}
    </span>
  );
}

export function ComplexityChip({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 tnum">
      {children}
    </span>
  );
}
