// Movimento discreto da proposta: contadores e revelação de blocos. Tudo respeita
// prefers-reduced-motion e a preferência do A11yProvider (.a11y-reduce-motion no <html>).
// O HTML do servidor já sai com o valor final e os blocos visíveis: sem JS, impressão e
// leitores de tela nunca veem estado intermediário.
import { useEffect, useRef, useState, type RefObject } from "react";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true ||
    document.documentElement.classList.contains("a11y-reduce-motion")
  );
}

/** Conta de 0 até `target` quando o elemento entra na tela (1,2 s, desaceleração suave). */
export function useCountUp(target: number): [number, RefObject<HTMLSpanElement | null>] {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(target);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    setValue(0);
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 1200);
          setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    // Impressão/PDF nunca pode sair com um contador parado no meio (ou em zero).
    const finish = () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      setValue(target);
    };
    const printQuery = window.matchMedia?.("print");
    const onPrintChange = (e: MediaQueryListEvent) => e.matches && finish();
    window.addEventListener("beforeprint", finish);
    printQuery?.addEventListener?.("change", onPrintChange);
    return () => {
      window.removeEventListener("beforeprint", finish);
      printQuery?.removeEventListener?.("change", onPrintChange);
      finish();
    };
  }, [target]);
  return [value, ref];
}

/** Revela blocos `.proposal-reveal` que ainda estão abaixo da dobra quando entram na tela. */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const host = root.current;
    if (!host || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    const pending = Array.from(
      host.querySelectorAll<HTMLElement>(".proposal-reveal, .proposal-section"),
    ).filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "shown";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    for (const el of pending) {
      el.dataset.reveal = "hidden";
      observer.observe(el);
    }
    const showAll = () => pending.forEach((el) => (el.dataset.reveal = "shown"));
    window.addEventListener("beforeprint", showAll);
    return () => {
      observer.disconnect();
      window.removeEventListener("beforeprint", showAll);
      showAll();
    };
  }, [root]);
}
