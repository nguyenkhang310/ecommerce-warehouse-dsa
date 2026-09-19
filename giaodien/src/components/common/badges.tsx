import { CheckCircle2, ChevronsUp, CircleSlash, Flame, Minus, TriangleAlert } from "lucide-react";
import type { Priority, StockStatus } from "@/core/types";
import { priorityLabel, statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const map = {
    urgent: {
      cls: "border-red-200 bg-red-50 text-red-700",
      Icon: Flame,
    },
    high: {
      cls: "border-amber-200 bg-amber-50 text-amber-700",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        cls,
        className,
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
      cls: "border-green-200 bg-green-50 text-green-700",
      Icon: CheckCircle2,
    },
    low_stock: {
      cls: "border-amber-200 bg-amber-50 text-amber-700",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
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
  tone = "indigo",
}: {
  children: React.ReactNode;
  tone?: "indigo" | "cyan" | "emerald" | "amber";
}) {
  const map = {
    indigo:
      "border-[#0a84ff]/20 bg-[#0a84ff]/9 text-[#0071e3]",
    cyan: "border-cyan-400/20 bg-cyan-400/9 text-cyan-700",
    emerald: "border-[#34c759]/20 bg-[#34c759]/10 text-[#16843a]",
    amber: "border-[#ff9f0a]/20 bg-[#ff9f0a]/10 text-[#b25000]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-sm tnum",
        map[tone],
      )}
    >
      {children}
    </span>
  );
}
