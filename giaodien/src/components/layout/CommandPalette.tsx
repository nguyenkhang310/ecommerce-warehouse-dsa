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
import { inventoryApi, orderApi } from "@/services/api";
import { formatNumber } from "@/lib/format";

export const NAV_ITEMS = [
  { label: "Tổng quan", to: "/", icon: LayoutDashboard },
  { label: "Sản phẩm", to: "/products", icon: PackageSearch },
  { label: "Hàng đợi đơn", to: "/orders", icon: ListOrdered },
  { label: "Trực quan DSA", to: "/visualizer", icon: Binary },
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
    queryKey: ["cmd-prefix", debounced.trim()],
    queryFn: () => inventoryApi.searchProductsByPrefix(debounced.trim(), "auto"),
    enabled: open && debounced.trim().length > 0,
  });

  const exact = useQuery({
    queryKey: ["cmd-order", debounced.trim()],
    queryFn: () => orderApi.lookupOrderExact(debounced.trim()),
    enabled: open && debounced.trim().toUpperCase().startsWith("ORD"),
  });

  const go = (to: string) => {
    onOpenChange(false);
    setQuery("");
    navigate({ to });
  };

  const close = () => {
    onOpenChange(false);
    setQuery("");
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Tìm SKU hoặc mã đơn…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Không tìm thấy kết quả phù hợp.</CommandEmpty>
        <CommandGroup heading="Điều hướng">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.to} value={item.label} onSelect={() => go(item.to)}>
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {prefix.data && prefix.data.entries.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Sản phẩm gợi ý">
              {prefix.data.entries.map((p) => (
                <CommandItem
                  key={p.sku}
                  value={`${p.sku} ${p.name}`}
                  onSelect={() => {
                    close();
                    void navigate({ to: "/products", search: { sku: p.sku } });
                  }}
                >
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
            <CommandGroup heading="Đơn hàng">
              <CommandItem
                value={exact.data.order.orderCode}
                onSelect={() => {
                  close();
                  void navigate({
                    to: "/orders",
                    search: { order: exact.data.order!.orderCode },
                  });
                }}
              >
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
          <CommandItem
            value="tao-don"
            onSelect={() => {
              close();
              void navigate({ to: "/orders", search: { action: "create" } });
            }}
          >
            <PackagePlus className="h-4 w-4" aria-hidden />
            Tạo đơn mới
          </CommandItem>
          <CommandItem value="cap-nhat-ton-kho" onSelect={() => go("/products")}>
            <Warehouse className="h-4 w-4" aria-hidden />
            Mở danh mục sản phẩm
          </CommandItem>
          <CommandItem value="benchmark" onSelect={() => go("/performance")}>
            <ChartNoAxesCombined className="h-4 w-4" aria-hidden />
            Mở đánh giá hiệu năng
          </CommandItem>
          <CommandItem
            value="heap-visualizer"
            onSelect={() => {
              close();
              void navigate({ to: "/visualizer", search: { tab: "heap" } });
            }}
          >
            <PlayCircle className="h-4 w-4" aria-hidden />
            Mở trực quan hàng đợi ưu tiên
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
