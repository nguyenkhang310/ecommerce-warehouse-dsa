import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDefenseMode } from "@/context/defense-mode";

export function WhyPopover({
  structure,
  comparisonKey,
  complexity,
  explanation,
}: {
  structure: string;
  comparisonKey: string;
  complexity: string;
  explanation: string;
}) {
  const { enabled } = useDefenseMode();
  if (!enabled) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          Vì sao kết quả này xuất hiện?
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" align="end">
        <p className="font-semibold">{structure}</p>
        <p className="mt-2 text-muted-foreground">{explanation}</p>
        <dl className="mt-3 space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Khóa so sánh</dt>
            <dd className="font-mono">{comparisonKey}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Độ phức tạp</dt>
            <dd className="font-mono">{complexity}</dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}
