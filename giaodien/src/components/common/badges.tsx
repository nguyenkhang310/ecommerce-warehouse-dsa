import { AlertTriangle, CheckCircle2, CircleSlash, Flame, Gauge, Timer } from "lucide-react";
import type { Priority, StockStatus } from "@/core/types";
import { priorityLabel, statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const map = {
    urgent: {
      cls: "border-[#ff3b30]/18 bg-gradient-to-b from-[#ff3b30]/12 to-[#ff3b30]/7 text-[#d70015] dark:border-[#ff6961]/22 dark:from-[#ff453a]/18 dark:to-[#ff453a]/9 dark:text-[#ff6961]",
      Icon: Flame,
    },
    high: {
      cls: "border-[#ff9f0a]/20 bg-gradient-to-b from-[#ffcc00]/14 to-[#ff9f0a]/8 text-[#b25000] dark:border-[#ffb340]/24 dark:from-[#ff9f0a]/18 dark:to-[#ff9f0a]/8 dark:text-[#ffb340]",
      Icon: Gauge,
    },
    normal: {
      cls: "border-slate-300/55 bg-gradient-to-b from-white/76 to-slate-100/65 text-slate-600 dark:border-white/10 dark:from-white/9 dark:to-white/4 dark:text-slate-300",
      Icon: Timer,
    },
  } as const;
  const { cls, Icon } = map[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-[0_4px_12px_rgba(28,54,78,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md dark:shadow-[0_5px_14px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]",
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
      cls: "border-[#34c759]/20 bg-[#34c759]/11 text-[#16843a] dark:border-[#30d158]/22 dark:bg-[#30d158]/13 dark:text-[#5de778]",
      Icon: CheckCircle2,
    },
    low_stock: {
      cls: "border-[#ff9f0a]/20 bg-[#ff9f0a]/10 text-[#b25000] dark:border-[#ffb340]/24 dark:bg-[#ff9f0a]/14 dark:text-[#ffb340]",
      Icon: AlertTriangle,
    },
    out_of_stock: {
      cls: "border-[#ff3b30]/18 bg-[#ff3b30]/10 text-[#d70015] dark:border-[#ff6961]/22 dark:bg-[#ff453a]/14 dark:text-[#ff6961]",
      Icon: CircleSlash,
    },
  } as const;
  const { cls, Icon } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
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
      "border-[#0a84ff]/20 bg-[#0a84ff]/9 text-[#0071e3] dark:border-[#64d2ff]/20 dark:bg-[#0a84ff]/14 dark:text-[#64d2ff]",
    cyan: "border-cyan-400/20 bg-cyan-400/9 text-cyan-700 dark:text-cyan-300",
    emerald: "border-[#34c759]/20 bg-[#34c759]/10 text-[#16843a] dark:text-[#5de778]",
    amber: "border-[#ff9f0a]/20 bg-[#ff9f0a]/10 text-[#b25000] dark:text-[#ffb340]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2 py-0.5 font-mono text-[11px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-sm tnum dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
        map[tone],
      )}
    >
      {children}
    </span>
  );
}
