import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { CommandPalette, NAV_ITEMS } from "@/components/layout/CommandPalette";
import { Button } from "@/components/ui/basic";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEMO_STEPS, useDefenseMode } from "@/context/defense-mode";
import { cn } from "@/lib/utils";

const MOBILE_NAV = NAV_ITEMS.slice(0, 4);

function UniversityLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center",
        compact ? "h-9 w-9" : "h-11 w-11",
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-sidebar-foreground">
      <div className={cn("px-3 pt-3 pb-2", collapsed && "px-2")}>
        {collapsed ? (
          <div className="mx-auto grid h-12 w-12 place-items-center">
            <UniversityLogo compact />
          </div>
        ) : (
          <div className="flex h-14 items-center gap-3 px-1">
            <UniversityLogo />
            <div className="min-w-0 border-l border-slate-200 pl-3">
              <p className="truncate text-[16px] font-semibold tracking-[-0.02em] text-slate-950">
                Quản lý kho
              </p>
              <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-[9px] font-semibold tracking-[0.06em] uppercase">
                <span className="text-primary">HCM-UTE</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400">Đồ án DSA</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {!collapsed ? (
        <p className="px-5 pt-5 pb-2 text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          Điều hướng
        </p>
      ) : (
        <div className="h-3" />
      )}

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Menu chính">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "relative flex h-10 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/25",
                collapsed && "justify-center px-1.5",
                active
                  ? "bg-primary font-semibold text-white shadow-[0_3px_10px_-6px_rgb(2_83_132/0.6)] before:absolute before:inset-y-3 before:left-1 before:w-0.5 before:rounded-full before:bg-destructive"
                  : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              )}
            >
              <span
                className={cn(
                  "sidebar-nav-icon grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/6 text-primary transition-colors",
                  active && "bg-white/12 text-white",
                )}
              >
                <item.icon className="h-[17px] w-[17px]" strokeWidth={2} aria-hidden />
              </span>
              {!collapsed ? (
                <span className="truncate tracking-[-0.005em]">{item.label}</span>
              ) : (
                <span className="sr-only">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const defense = useDefenseMode();
  const step = DEMO_STEPS[defense.stepIndex];
  const openDemoStep = (target: (typeof DEMO_STEPS)[number]) => {
    if (target.target === "recent") {
      void navigate({ to: "/visualizer", search: { tab: "recent" } });
    } else if (target.target === "create") {
      void navigate({ to: "/orders", search: { action: "create" } });
    } else {
      void navigate({ to: target.route });
    }
  };

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
    <div className="flex min-h-screen w-full overflow-x-clip bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Bỏ qua tới nội dung chính
      </a>

      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-screen shrink-0 overflow-hidden border-r border-border bg-white transition-[width] duration-200 lg:block",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 h-14 border-b border-border bg-white">
          <div className="flex h-full items-center gap-2 px-4 lg:px-7">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu">
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-60 border-sidebar-border bg-white p-0"
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
                    <PanelLeftClose className="h-5 w-5" aria-hidden />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}</TooltipContent>
            </Tooltip>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="ml-auto hidden h-9 w-full max-w-[340px] items-center gap-2 rounded-md border border-input bg-white px-3 text-left text-sm text-slate-500 transition-colors hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/15 focus-visible:outline-none sm:flex"
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">Tìm SKU hoặc mã đơn…</span>
              <kbd className="ml-auto rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                Ctrl K
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
                Chế độ bảo vệ
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
                      openDemoStep(nextStep);
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
                    openDemoStep(DEMO_STEPS[0]);
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
          className="mx-auto w-full max-w-[1600px] flex-1 px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:px-8 lg:pt-7 lg:pb-10"
        >
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white px-2 pt-1 pb-[calc(.35rem+env(safe-area-inset-bottom))] md:hidden"
        aria-label="Menu nhanh"
      >
        {MOBILE_NAV.map((item) => {
          const active =
            item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 border-t-2 border-transparent px-1 py-1.5 text-[10px] font-medium transition-colors",
                active ? "border-primary font-semibold text-primary" : "text-slate-500",
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
