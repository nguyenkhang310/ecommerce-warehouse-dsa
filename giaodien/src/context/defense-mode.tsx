import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface DemoStep {
  title: string;
  route: string;
  target?: "recent" | "create";
}

export const DEMO_STEPS: DemoStep[] = [
  {
    title: "Tra cứu bảng băm",
    route: "/products",
  },
  {
    title: "Gợi ý bằng cây tiền tố",
    route: "/products",
  },
  {
    title: "Cập nhật kho và danh sách gần đây",
    route: "/visualizer",
    target: "recent",
  },
  {
    title: "Thêm đơn vào hàng đợi ưu tiên",
    route: "/orders",
    target: "create",
  },
  {
    title: "Xử lý đơn tiếp theo",
    route: "/orders",
  },
  {
    title: "Đánh giá hiệu năng",
    route: "/performance",
  },
];

interface DefenseModeValue {
  enabled: boolean;
  toggle: () => void;
  demoActive: boolean;
  stepIndex: number;
  startDemo: () => void;
  stopDemo: () => void;
  next: () => void;
  prev: () => void;
}

const DefenseModeContext = createContext<DefenseModeValue | null>(null);

export function DefenseModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const toggle = useCallback(() => {
    setEnabled((v) => {
      if (v) {
        setDemoActive(false);
        setStepIndex(0);
      }
      return !v;
    });
  }, []);

  const value = useMemo<DefenseModeValue>(
    () => ({
      enabled,
      toggle,
      demoActive,
      stepIndex,
      startDemo: () => {
        setEnabled(true);
        setStepIndex(0);
        setDemoActive(true);
      },
      stopDemo: () => setDemoActive(false),
      next: () => setStepIndex((i) => Math.min(DEMO_STEPS.length - 1, i + 1)),
      prev: () => setStepIndex((i) => Math.max(0, i - 1)),
    }),
    [enabled, toggle, demoActive, stepIndex],
  );

  return <DefenseModeContext.Provider value={value}>{children}</DefenseModeContext.Provider>;
}

export function useDefenseMode(): DefenseModeValue {
  const ctx = useContext(DefenseModeContext);
  if (!ctx) throw new Error("useDefenseMode phải được dùng bên trong DefenseModeProvider");
  return ctx;
}
