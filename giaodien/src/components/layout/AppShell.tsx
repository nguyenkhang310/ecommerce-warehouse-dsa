import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Binary,
  ChartNoAxesCombined,
  ChevronLeft,
  Database,
  LayoutDashboard,
  ListOrdered,
  Menu,
  PackageSearch,
  PanelLeftOpen,
  Presentation,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { CommandPalette } from "@/components/layout/CommandPalette";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEMO_STEPS, useDefenseMode } from "@/context/defense-mode";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Tổng quan", to: "/", icon: LayoutDashboard },
  { label: "Sản phẩm", to: "/products", icon: PackageSearch },
  { label: "Hàng đợi đơn", to: "/orders", icon: ListOrdered },
  { label: "Mô phỏng DSA", to: "/visualizer", icon: Binary },
  { label: "Hiệu năng", to: "/performance", icon: ChartNoAxesCombined },
  { label: "Dữ liệu & hệ thống", to: "/system", icon: Database },
] as const;

const MOBILE_NAV = [NAV[0], NAV[1], NAV[2], NAV[3]];

function UniversityLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_4px_12px_rgba(32,102,149,0.1)]",
        compact ? "h-9 w-9 p-1.5" : "h-11 w-11 p-1.5",
      )}
    >
      <img
        src="/hcmute-logo.png"
        alt="Logo Đại học Công nghệ Kỹ Thuật TP.HCM (HCM-UTE)"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-transparent text-sidebar-foreground">
      <span
        className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute top-52 -left-24 h-48 w-48 rounded-full bg-indigo-100/22 blur-3xl"
        aria-hidden
      />

      <div className={cn("relative z-10 p-3 pb-2", collapsed && "px-2")}>
        <div
          className={cn(
            "glass-control flex min-h-16 items-center gap-3 rounded-lg border p-2.5",
            collapsed &&
              "mx-auto h-11 min-h-0 w-11 justify-center border-0 bg-transparent p-0 shadow-none backdrop-blur-none",
          )}
        >
          <UniversityLogo compact={collapsed} />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.015em] text-sidebar-foreground">
                Quản lý kho
              </p>
              <p className="mt-1 truncate text-[10px] font-semibold tracking-[0.13em] text-muted-foreground uppercase">
                HCM-UTE · Đồ án DSA
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {!collapsed ? (
        <p className="relative z-10 px-5 pt-4 pb-2 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground/72 uppercase">
          Điều hướng
        </p>
      ) : (
        <div className="relative z-10 h-3" />
      )}

      <nav className="relative z-10 flex-1 space-y-1 px-3" aria-label="Điều hướng chính">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.to === "/" }}
            className={cn(
              "relative flex min-h-12 items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/58 hover:text-sidebar-accent-foreground hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] focus-visible:ring-2 focus-visible:ring-sidebar-ring/45 focus-visible:outline-none",
              collapsed && "justify-center px-1.5 hover:translate-x-0",
            )}
            activeProps={{
              className:
                "bg-gradient-to-r from-white/78 to-sky-100/58 text-sidebar-accent-foreground shadow-[0_7px_18px_rgba(42,139,197,0.1),inset_0_1px_0_rgba(255,255,255,0.92)] ring-1 ring-white/85 backdrop-blur-xl hover:translate-x-0 hover:from-white/88 hover:to-sky-100/68 [&_.sidebar-nav-icon]:bg-primary [&_.sidebar-nav-icon]:text-white [&_.sidebar-nav-icon]:shadow-none",
            }}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-nav-icon grid h-8 w-8 shrink-0 place-items-center rounded-md border border-sky-100/70 bg-sky-50/72 text-sky-700/65 transition-all">
              <item.icon className="h-[17px] w-[17px]" strokeWidth={1.9} aria-hidden />
            </span>
            {!collapsed ? (
              <span className="truncate tracking-[-0.005em]">{item.label}</span>
            ) : (
              <span className="sr-only">{item.label}</span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function breadcrumbFor(pathname: string) {
  const item = NAV.find((navItem) =>
    navItem.to === "/" ? pathname === "/" : pathname.startsWith(navItem.to),
  );
  return item?.label ?? "Tổng quan";
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const defense = useDefenseMode();
  const step = DEMO_STEPS[defense.stepIndex];

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-transparent">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Bỏ qua tới nội dung chính
      </a>

      <aside
        className={cn(
          "glass-shell sticky top-0 z-40 hidden h-screen shrink-0 overflow-hidden border-r transition-[width] duration-200 lg:block",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-shell sticky top-0 z-30 h-16 border-b">
          <div className="flex h-full items-center gap-2 px-4 lg:px-6">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu">
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="glass-popover w-64 border-sidebar-border p-0"
              >
                <SheetTitle className="sr-only">Điều hướng</SheetTitle>
                <SidebarContent collapsed={false} onNavigate={() => setDrawerOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="mr-1 lg:hidden">
              <UniversityLogo compact />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:inline-flex"
                  onClick={() => setCollapsed((current) => !current)}
                  aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-5 w-5" aria-hidden />
                  ) : (
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}</TooltipContent>
            </Tooltip>

            <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
              <p className="truncate text-sm font-semibold">{breadcrumbFor(pathname)}</p>
            </nav>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="glass-control ml-auto hidden h-10 w-full max-w-[370px] items-center gap-2 rounded-md border px-3 text-left text-sm text-muted-foreground transition-all hover:border-primary/30 hover:bg-white/76 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none sm:flex"
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">Tìm SKU hoặc mã đơn</span>
              <kbd className="ml-auto rounded-md border border-border/80 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium shadow-sm">
                ⌘K
              </kbd>
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="ml-auto sm:hidden"
              onClick={() => setPaletteOpen(true)}
              aria-label="Mở tìm kiếm"
            >
              <Search className="h-5 w-5" aria-hidden />
            </Button>

            <Button
              variant={defense.enabled ? "default" : "outline"}
              size="sm"
              className="hidden shrink-0 gap-1.5 xl:inline-flex"
              onClick={defense.toggle}
              aria-pressed={defense.enabled}
            >
              <Presentation className="h-4 w-4" aria-hidden />
              Chế độ bảo vệ
            </Button>

          </div>
        </header>

        {defense.enabled ? (
          <div className="animate-slide-in-top border-b border-primary/15 bg-primary/6 px-4 py-2.5 lg:px-6">
            <div className="flex w-full flex-wrap items-center gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Presentation className="h-4 w-4" aria-hidden />
                Giải thích thuật toán
              </p>
              {defense.demoActive ? (
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {defense.stepIndex + 1}/{DEMO_STEPS.length} · {step.title}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={defense.prev}
                    disabled={defense.stepIndex === 0}
                  >
                    Trước
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const nextStep =
                        DEMO_STEPS[Math.min(DEMO_STEPS.length - 1, defense.stepIndex + 1)];
                      defense.next();
                      navigate({ to: nextStep.route });
                    }}
                    disabled={defense.stepIndex === DEMO_STEPS.length - 1}
                  >
                    Tiếp
                  </Button>
                  <Button size="sm" variant="ghost" onClick={defense.stopDemo}>
                    <X className="h-4 w-4" aria-hidden />
                    Thoát
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    defense.startDemo();
                    navigate({ to: DEMO_STEPS[0].route });
                  }}
                >
                  Bắt đầu trình diễn
                </Button>
              )}
            </div>
          </div>
        ) : null}

        <main
          id="main-content"
          className="w-full flex-1 px-4 pt-7 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:px-8 lg:pb-10"
        >
          {children}
        </main>
      </div>

      <nav
        className="glass-shell fixed inset-x-3 bottom-[calc(.75rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-4 rounded-lg border px-2 py-1.5 md:hidden"
        aria-label="Điều hướng nhanh"
      >
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors"
            activeProps={{ className: "bg-accent text-primary" }}
          >
            <item.icon className="h-5 w-5" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
