import { useEffect, useState } from "react";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";

const KEY = "vitalos-splash-seen";

/** Abertura cinematográfica (1x por sessão). Respeita prefers-reduced-motion. */
export function SplashScreen() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase("in");
    const t1 = setTimeout(() => setPhase("out"), reduced ? 500 : 2000);
    const t2 = setTimeout(() => setPhase("hidden"), reduced ? 900 : 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (phase === "hidden") return null;
  return (
    <div
      aria-hidden="true"
      onClick={() => setPhase("hidden")}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background transition-opacity duration-500 ${phase === "out" ? "opacity-0" : "opacity-100"}`}
    >
      <div className={`motion-safe:transition-transform motion-safe:duration-[1800ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${phase === "out" ? "scale-110" : "motion-safe:animate-[vitalos-splash_1.6s_cubic-bezier(0.16,1,0.3,1)_both]"}`}>
        <VitalOSBrand size="lg" />
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000">
        Sistema Operacional da Vitalidade
      </p>
      <style>{`@keyframes vitalos-splash{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
