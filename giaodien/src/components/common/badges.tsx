import { AlertTriangle, CheckCircle2, CircleSlash, Flame, Gauge, Timer } from "lucide-react";
import type { Priority, StockStatus } from "@/core/types";
import { priorityLabel, statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const map = {
    urgent: {
      cls: "border-[#ff3b30]/18 bg-gradient-to-b from-[#ff3b30]/12 to-[#ff3b30]/7 text-[#d70015]",
      Icon: Flame,
    },
    high: {
      cls: "border-[#ff9f0a]/20 bg-gradient-to-b from-[#ffcc00]/14 to-[#ff9f0a]/8 text-[#b25000]",
      Icon: Gauge,
    },
    normal: {
      cls: "border-slate-300/55 bg-gradient-to-b from-white/76 to-slate-100/65 text-slate-600",
      Icon: Timer,
    },
  } as const;
  const { cls, Icon } = map[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-[0_4px_12px_rgba(28,54,78,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md",
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
      cls: "border-[#34c759]/20 bg-[#34c759]/11 text-[#16843a]",
      Icon: CheckCircle2,
    },
    low_stock: {
      cls: "border-[#ff9f0a]/20 bg-[#ff9f0a]/10 text-[#b25000]",
      Icon: AlertTriangle,
    },
    out_of_stock: {
      cls: "border-[#ff3b30]/18 bg-[#ff3b30]/10 text-[#d70015]",
      Icon: CircleSlash,
    },
  } as const;
  const { cls, Icon } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md",
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
