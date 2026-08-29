import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Binary,
  ChartNoAxesCombined,
  Database,
  LayoutDashboard,
  ListOrdered,
  PackagePlus,
  PackageSearch,
  PlayCircle,
  Warehouse,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { inventoryApi, orderApi } from "@/services/mockApiAdapter";
import { formatNumber } from "@/lib/format";

const navItems = [
  { label: "Tổng quan", to: "/", icon: LayoutDashboard },
  { label: "Sản phẩm", to: "/products", icon: PackageSearch },
  { label: "Hàng đợi đơn", to: "/orders", icon: ListOrdered },
  { label: "Mô phỏng DSA", to: "/visualizer", icon: Binary },
  { label: "Hiệu năng", to: "/performance", icon: ChartNoAxesCombined },
  { label: "Dữ liệu & hệ thống", to: "/system", icon: Database },
] as const;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  const prefix = useQuery({
    queryKey: ["cmd-prefix", debounced],
    queryFn: () => inventoryApi.searchProductsByPrefix(debounced, "auto"),
    enabled: open && debounced.trim().length > 0,
  });

  const exact = useQuery({
    queryKey: ["cmd-order", debounced],
    queryFn: () => orderApi.lookupOrderExact(debounced),
    enabled: open && debounced.trim().toUpperCase().startsWith("ORD"),
  });

  const go = (to: string) => {
    onOpenChange(false);
    setQuery("");
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Tìm sản phẩm hoặc đơn hàng… ⌘K"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Không tìm thấy kết quả phù hợp.</CommandEmpty>
        <CommandGroup heading="Điều hướng">
          {navItems.map((item) => (
            <CommandItem key={item.to} value={item.label} onSelect={() => go(item.to)}>
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {prefix.data && prefix.data.entries.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Sản phẩm gợi ý • Cây tiền tố O(k + m)">
              {prefix.data.entries.map((p) => (
                <CommandItem key={p.sku} value={p.sku} onSelect={() => go("/products")}>
                  <PackageSearch className="h-4 w-4" aria-hidden />
                  <span className="font-mono text-xs">{p.sku}</span>
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground tnum">
                    {formatNumber(p.stock)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {exact.data?.order ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Đơn hàng chính xác • Tra cứu bảng băm trung bình O(1)">
              <CommandItem value={exact.data.order.orderCode} onSelect={() => go("/orders")}>
                <ListOrdered className="h-4 w-4" aria-hidden />
                <span className="font-mono text-xs">{exact.data.order.orderCode}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  thứ tự #{exact.data.order.sequenceNumber}
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}

        <CommandSeparator />
        <CommandGroup heading="Thao tác nhanh">
          <CommandItem value="tao-don" onSelect={() => go("/orders")}>
            <PackagePlus className="h-4 w-4" aria-hidden />
            Tạo đơn mới
          </CommandItem>
          <CommandItem value="cap-nhat-ton-kho" onSelect={() => go("/products")}>
            <Warehouse className="h-4 w-4" aria-hidden />
            Cập nhật tồn kho
          </CommandItem>
          <CommandItem value="benchmark" onSelect={() => go("/performance")}>
            <ChartNoAxesCombined className="h-4 w-4" aria-hidden />
            Đo hiệu năng
          </CommandItem>
          <CommandItem value="heap-visualizer" onSelect={() => go("/visualizer")}>
            <PlayCircle className="h-4 w-4" aria-hidden />
            Mở mô phỏng hàng đợi ưu tiên
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
