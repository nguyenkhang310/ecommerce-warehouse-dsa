import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface DemoStep {
  title: string;
  route: string;
  description: string;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    title: "Tra cứu Hash Table",
    route: "/products",
    description: "Nhập SKU để tra cứu O(1).",
  },
  {
    title: "Gợi ý Trie",
    route: "/products",
    description: "Gõ tiền tố để tìm O(k + m).",
  },
  {
    title: "Cập nhật kho & Recent list",
    route: "/visualizer",
    description: "Cập nhật kho và xem move-to-front.",
  },
  {
    title: "Thêm đơn vào Heap",
    route: "/orders",
    description: "Chèn đơn và heapify O(log n).",
  },
  {
    title: "Xử lý đơn tiếp theo",
    route: "/orders",
    description: "Extract đơn ưu tiên nhất.",
  },
  {
    title: "Xem benchmark",
    route: "/performance",
    description: "So sánh DSA với quét tuyến tính.",
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
