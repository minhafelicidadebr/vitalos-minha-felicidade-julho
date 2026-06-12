import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * A11yProvider — preferências de acessibilidade (WCAG 2.2 AA).
 * - reduceMotion: desativa animações
 * - highContrast: aumenta contraste
 * - fontScale: escala base de tipografia (0.875 → 1.25)
 */

interface A11yState {
  reduceMotion: boolean;
  highContrast: boolean;
  fontScale: number; // 0.875, 1, 1.125, 1.25
}

interface A11yContextValue extends A11yState {
  setReduceMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setFontScale: (v: number) => void;
}

const STORAGE_KEY = "vita.a11y";
const DEFAULTS: A11yState = { reduceMotion: false, highContrast: false, fontScale: 1 };

const A11yContext = createContext<A11yContextValue | null>(null);

function readInitial(): A11yState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  const prefersReduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return { ...DEFAULTS, reduceMotion: prefersReduce };
}

export function A11yProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<A11yState>(DEFAULTS);

  useEffect(() => {
    setState(readInitial());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("a11y-reduce-motion", state.reduceMotion);
    root.classList.toggle("a11y-high-contrast", state.highContrast);
    root.style.setProperty("--a11y-font-size", `${state.fontScale * 16}px`);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value = useMemo<A11yContextValue>(
    () => ({
      ...state,
      setReduceMotion: (v) => setState((s) => ({ ...s, reduceMotion: v })),
      setHighContrast: (v) => setState((s) => ({ ...s, highContrast: v })),
      setFontScale: (v) => setState((s) => ({ ...s, fontScale: v })),
    }),
    [state],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error("useA11y deve ser usado dentro de <A11yProvider>.");
  return ctx;
}
