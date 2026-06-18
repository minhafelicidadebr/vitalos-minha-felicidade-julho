import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APPLICATIONS, type CtaAction } from "../data/landing-copy";
import { landingIcon, TONE_CLASS } from "./icons";

const LIGHT_TONE_TEXT: Record<string, string> = {
  sky: "text-sky-800",
  emerald: "text-emerald-800",
  rose: "text-rose-800",
  violet: "text-violet-800",
  amber: "text-amber-800",
};

export function EcosystemApplicationsSection({
  onAction,
}: {
  onAction: (action: CtaAction) => void;
}) {
  return (
    <section
      id="aplicacoes"
      className="landing-light-grid relative scroll-mt-24 overflow-hidden border-y border-border/40 bg-background py-16 sm:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,93,16,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,93,16,0.065)_1px,transparent_1px)] bg-[size:64px_64px] opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(252,211,77,0.28),transparent_32%),radial-gradient(circle_at_86%_24%,rgba(255,255,255,0.9),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(255,252,232,0.86)_52%,rgba(254,243,199,0.66)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/55 to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            {APPLICATIONS.eyebrow}
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
            {APPLICATIONS.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {APPLICATIONS.lead}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {APPLICATIONS.items.map((item, index) => {
            const Icon = landingIcon(item.icon);
            const tone = TONE_CLASS[item.tone] ?? TONE_CLASS.sky!;
            const toneText = LIGHT_TONE_TEXT[item.tone] ?? "text-primary";

            return (
              <article
                key={item.modal}
                className={`group relative flex min-h-[390px] flex-col overflow-hidden rounded-3xl border border-white/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.38)_0%,rgba(255,255,255,0.16)_52%,rgba(254,243,199,0.16)_100%)] p-5 text-[#1c2a24] shadow-xl shadow-amber-900/5 backdrop-blur-2xl ring-1 ring-inset ${tone.ring} transition-all hover:-translate-y-1 hover:border-amber-300/70 hover:bg-white/30 hover:shadow-xl hover:shadow-amber-900/10`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-1 ${tone.dot} opacity-90`}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.42),transparent_34%),linear-gradient(to_right,rgba(120,93,16,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,93,16,0.035)_1px,transparent_1px)] bg-[size:auto,36px_36px,36px_36px]"
                />
                <div className="flex items-center justify-between gap-3">
                  <span
                    aria-hidden
                    className={`landing-light-icon relative grid h-12 w-12 place-items-center rounded-2xl ${toneText} ring-1 ring-inset ring-primary/20`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="relative rounded-full border border-amber-200/70 bg-white/35 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#6a5a21] backdrop-blur">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <p
                  className={`relative mt-4 text-xs font-semibold uppercase tracking-[0.16em] ${toneText}`}
                >
                  {item.label}
                </p>
                <h3 className="relative mt-1 font-serif text-xl leading-tight text-[#1c2a24]">
                  {item.title}
                </h3>
                <p className="relative mt-3 flex-1 text-sm leading-relaxed text-[#4d5a52]">
                  {item.text}
                </p>
                <div className="relative mt-4 rounded-2xl border border-amber-200/70 bg-white/35 p-3 shadow-inner backdrop-blur">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8a6b13]">
                    Sinal estratégico
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#425047]">
                    {item.signal.replace("Sinal estratégico: ", "")}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="relative mt-4 w-full justify-between gap-3 border-amber-300/70 bg-white/35 text-[#1c2a24] backdrop-blur hover:bg-amber-100/55 hover:text-[#1c2a24]"
                  onClick={() => onAction({ kind: "modal", modal: item.modal })}
                >
                  {item.cta}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
