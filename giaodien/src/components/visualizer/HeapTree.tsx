import type { HeapNodeView } from "@/core/types";
import { cn } from "@/lib/utils";

const toneByPriority: Record<string, string> = {
  urgent: "border-destructive/50 bg-destructive/10",
  high: "border-warning/50 bg-warning/10",
  normal: "border-border bg-card",
};

export function HeapTree({
  nodes,
  highlight,
  comparing = [],
}: {
  nodes: HeapNodeView[];
  highlight?: string | null;
  comparing?: number[];
}) {
  const levels: HeapNodeView[][] = [];
  let start = 0;
  let size = 1;
  while (start < nodes.length) {
    levels.push(nodes.slice(start, start + size));
    start += size;
    size *= 2;
  }

  return (
    <div className="grid-lab overflow-x-auto rounded-xl border border-border p-4">
      <div className="min-w-[640px] space-y-6">
        {levels.map((level, li) => (
          <div key={li} className="flex items-start justify-center gap-3">
            {level.map((node) => (
              <div
                key={node.orderCode}
                className={cn(
                  "min-w-[128px] rounded-xl border-2 px-3 py-2 text-center transition-all",
                  toneByPriority[node.priority],
                  node.index === 0 && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  highlight === node.orderCode && "border-primary bg-primary/15",
                  comparing.includes(node.index) && "border-accent bg-accent/15",
                )}
              >
                {node.index === 0 ? (
                  <p className="text-[10px] font-bold tracking-wider text-primary uppercase">
                    Tiếp theo
                  </p>
                ) : null}
                <p className="font-mono text-xs font-semibold tnum">
                  {node.orderCode.replace("ORD-2026-", "…")}
                </p>
                <p className="text-[11px] text-muted-foreground tnum">
                  ưu tiên {node.priorityValue} • thứ tự {node.sequenceNumber}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
