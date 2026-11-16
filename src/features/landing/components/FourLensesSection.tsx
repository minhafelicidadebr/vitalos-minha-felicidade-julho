import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Grid3X3, ScanSearch } from "lucide-react";
import { LENSES, CATEGORY, IVO_DIMENSIONS, IVO_BRAND, type CtaAction } from "../data/landing-copy";
import { TONE_CLASS } from "./icons";
import strategyLenses from "@/assets/strategy-lenses-hologram-transparent.png";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";

function IvoBrandMark() {
  return (
    <div className="flex min-w-0 flex-col gap-5 rounded-3xl border border-accent/25 bg-background/65 p-5 shadow-xl shadow-primary/5 backdrop-blur">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
        <VitalOSBrand
          variant="mark"
          size="ivo"
          className="drop-shadow-[0_0_18px_rgba(201,162,39,0.26)]"
        />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            {IVO_BRAND.acronym}
          </p>
          <p className="font-serif text-xl leading-tight text-card-foreground">{IVO_BRAND.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{IVO_BRAND.promise}</p>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {IVO_BRAND.axes.map((axis) => (
          <span
            key={axis}
            className="rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary"
          >
            {axis}
          </span>
        ))}
      </div>
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {IVO_BRAND.signature}
      </p>
    </div>
  );
}

export function FourLensesSection({ onAction }: { onAction: (action: CtaAction) => void }) {
  return (
    <section id="solucao" className="relative scroll-mt-24 overflow-hidden py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />
      <div className="mx-auto max-w-6xl px-6">
        {/* Nova categoria */}
        <div id="nova-categoria" className="mx-auto max-w-3xl scroll-mt-24 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {CATEGORY.eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">{CATEGORY.title}</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{CATEGORY.text}</p>
        </div>

        {/* IVO — 4 Dimensões da Vitalidade Organizacional */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
          <div className="grid min-w-0 grid-cols-1 gap-0 lg:grid-cols-[0.9fr_1.4fr]">
            <div className="border-b border-border/60 bg-primary/5 p-6 sm:p-8 lg:border-r lg:border-b-0">
              <IvoBrandMark />
              <p className="mt-7 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {IVO_DIMENSIONS.eyebrow}
              </p>
              <h3 className="mt-3 font-serif text-2xl leading-tight text-card-foreground sm:text-3xl">
                {IVO_DIMENSIONS.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {IVO_DIMENSIONS.text}
              </p>
              <div className="mt-6 rounded-2xl border border-primary/15 bg-background/70 p-4">
                <p className="font-serif text-base leading-relaxed text-card-foreground">
                  {IVO_DIMENSIONS.insight}
                </p>
              </div>
            </div>

            <ol className="grid min-w-0 grid-cols-1 gap-3 bg-background/45 p-4 sm:grid-cols-2 sm:p-5">
              {IVO_DIMENSIONS.dimensions.map((dimension, index) => {
                const tone = TONE_CLASS[dimension.tone] ?? TONE_CLASS.sky!;
                return (
                  <li
                    key={dimension.id}
                    className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/90 p-5 shadow-sm ring-1 ring-inset ${tone.ring} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 top-0 h-1 ${tone.dot} opacity-90`}
                    />
                    <div className="relative flex flex-1 items-start gap-4">
                      <span
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-mono text-sm font-semibold ${tone.bg} ${tone.text} ring-1 ring-inset ${tone.ring} shadow-sm`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`text-xs font-semibold uppercase tracking-[0.14em] ${tone.text}`}
                          >
                            {dimension.label}
                          </p>
                          <span className="rounded-full border border-border/60 bg-background/65 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            Dimensão IVO
                          </span>
                        </div>
                        <h4 className="mt-1 font-serif text-xl text-card-foreground">
                          {dimension.title}
                        </h4>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {dimension.text}
                        </p>
                        <div className="my-4 h-px bg-gradient-to-r from-border/0 via-border to-border/0" />
                        <p className="border-l border-border/70 pl-3 text-xs leading-relaxed text-card-foreground/80">
                          {dimension.signal}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onAction({
                          kind: "modal",
                          modal: dimension.modal,
                        })
                      }
                      className="relative mt-5 h-auto min-h-11 w-full justify-between gap-3 whitespace-normal bg-background/55 py-2 text-left text-card-foreground backdrop-blur hover:bg-background/85"
                    >
                      <span className="min-w-0 break-words">{dimension.cta}</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-institutional-deep p-5 text-white shadow-2xl shadow-black/15 sm:p-7">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(201,162,39,0.17),transparent_32%),radial-gradient(circle_at_88%_76%,rgba(16,185,129,0.14),transparent_34%),linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,52px_52px,52px_52px]"
          />
          <div className="relative">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-institutional-gold">
                  {IVO_DIMENSIONS.bridge.eyebrow}
                </p>
                <h3 className="mt-2 font-serif text-2xl leading-tight text-white sm:text-3xl">
                  {IVO_DIMENSIONS.bridge.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/68">
                  {IVO_DIMENSIONS.bridge.text}
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-institutional-gold/40 bg-institutional-gold/10 px-4 py-2 font-mono text-xs font-semibold text-institutional-gold">
                <Grid3X3 className="h-4 w-4" aria-hidden />
                {IVO_DIMENSIONS.bridge.equation}
              </span>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  <Grid3X3 className="h-3.5 w-3.5 text-accent" aria-hidden />
                  {IVO_DIMENSIONS.bridge.dimensionsLabel}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {IVO_DIMENSIONS.dimensions.map((dimension) => {
                    const tone = TONE_CLASS[dimension.tone] ?? TONE_CLASS.sky!;
                    return (
                      <span
                        key={dimension.id}
                        className={`rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold ${tone.text} backdrop-blur`}
                      >
                        {dimension.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-accent/30 bg-accent/10 font-serif text-2xl text-accent shadow-[0_0_32px_rgba(201,162,39,0.16)]">
                  ×
                </span>
              </div>

              <div>
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  <ScanSearch className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
                  {IVO_DIMENSIONS.bridge.lensesLabel}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {LENSES.items.map((lens) => {
                    const tone = TONE_CLASS[lens.tone] ?? TONE_CLASS.sky!;
                    return (
                      <span
                        key={lens.q}
                        className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs backdrop-blur"
                      >
                        <span className={`font-mono font-semibold ${tone.text}`}>{lens.q}</span>
                        <span className="ml-2 text-white/72">{lens.instrument}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* As 4 Lentes VitalOS™ — header com imagem estratégica */}
        <div className="mt-14 grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {LENSES.eyebrow}
            </p>
            <h3 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              {LENSES.title}
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {LENSES.lead}
            </p>
            <div className="mt-6 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
                Jornada instrucional
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{LENSES.annual}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {LENSES.items.map((item) => (
                  <span
                    key={item.q}
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-card-foreground"
                  >
                    <span className="font-mono font-semibold text-primary">{item.q}</span>
                    {item.instrument}
                  </span>
                ))}
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 text-xs text-card-foreground">
                  <FileText className="h-3.5 w-3.5 text-accent" aria-hidden />
                  {LENSES.finale.title}
                </span>
              </div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0.88, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative isolate min-h-[260px] overflow-visible sm:min-h-[320px]"
          >
            <div
              aria-hidden
              className="absolute inset-x-[10%] top-[28%] z-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
            />
            <motion.span
              aria-hidden
              initial={{ rotate: 0 }}
              whileInView={{ rotate: 360 }}
              viewport={{ once: false }}
              transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
              className="absolute left-1/2 top-1/2 z-0 h-[78%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-primary/20"
            />
            <motion.span
              aria-hidden
              initial={{ rotate: 0 }}
              whileInView={{ rotate: -360 }}
              viewport={{ once: false }}
              transition={{ duration: 58, repeat: Infinity, ease: "linear" }}
              className="absolute left-1/2 top-1/2 z-0 h-[56%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20"
            />
            <img
              src={strategyLenses}
              alt="Quatro lentes interconectadas representando bem-estar, ecossistema, performance e cultura"
              loading="lazy"
              width={1040}
              height={585}
              className="relative z-10 h-full min-h-[260px] w-full object-contain opacity-[0.96] drop-shadow-[0_22px_56px_rgba(0,160,150,0.28)] [filter:saturate(1.18)_contrast(1.04)_drop-shadow(0_0_24px_rgba(201,162,39,0.24))]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 rounded-[2rem] bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_4px,rgba(255,255,255,0.08)_4px,rgba(255,255,255,0.08)_5px)] opacity-40 mix-blend-overlay [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_72%)]"
            />
            <div className="relative z-30 mx-auto mt-3 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
              {LENSES.items.map((item) => {
                const tone = TONE_CLASS[item.tone] ?? TONE_CLASS.sky!;
                return (
                  <span
                    key={item.q}
                    className={`inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-card-foreground shadow-sm backdrop-blur ring-1 ring-inset ${tone.ring}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} aria-hidden />
                    <span className={tone.text}>Etapa {item.q}</span>
                    <span className="truncate text-muted-foreground">{item.instrument}</span>
                  </span>
                );
              })}
            </div>
          </motion.div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LENSES.items.map((lens, index) => {
            const tone = TONE_CLASS[lens.tone] ?? TONE_CLASS.sky!;
            const modal = lens.modal as Extract<CtaAction, { kind: "modal" }>["modal"];
            return (
              <article
                key={lens.q}
                className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.045)_52%,rgba(201,162,39,0.08)_100%)] p-5 text-white shadow-2xl shadow-black/15 backdrop-blur-2xl ring-1 ring-inset ${tone.ring} transition-all hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.095] hover:shadow-black/25`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-1 ${tone.dot} opacity-90`}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:auto,34px_34px,34px_34px] opacity-80"
                />
                <div className="relative flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex h-10 items-center rounded-xl px-3 font-mono text-sm font-semibold ${tone.bg} ${tone.text} ring-1 ring-inset ${tone.ring}`}
                  >
                    {lens.q}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur">
                    <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} aria-hidden />
                    Etapa {index + 1}/4
                  </span>
                </div>

                <div className={`relative mt-4 h-16 ${tone.text}`}>
                  <svg viewBox="0 0 220 72" className="h-full w-full" aria-hidden>
                    <path
                      d="M18 54 C58 14 162 14 202 54"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="5 7"
                      strokeLinecap="round"
                      strokeWidth="2.5"
                      opacity="0.42"
                    />
                    <path
                      d="M18 54 C58 14 162 14 202 54"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="5"
                      opacity="0.14"
                    />
                    <circle cx="18" cy="54" r="6" fill="currentColor" opacity="0.72" />
                    <circle cx="110" cy="26" r="4.5" fill="currentColor" opacity="0.52" />
                    <circle cx="202" cy="54" r="6" fill="currentColor" opacity="0.72" />
                  </svg>
                </div>

                <p className="relative mt-1 font-serif text-2xl text-white">{lens.instrument}</p>
                <p
                  className={`relative text-xs font-semibold uppercase tracking-[0.14em] ${tone.text}`}
                >
                  {lens.theme}
                </p>
                <p className="relative mt-2 inline-flex w-fit rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/72 backdrop-blur">
                  {lens.period}
                </p>
                <p className="relative mt-3 flex-1 text-sm leading-relaxed text-white/76">
                  {lens.text}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction({ kind: "modal", modal })}
                  className="relative mt-5 w-full justify-between gap-3 border-white/18 bg-white/[0.065] text-white backdrop-blur hover:bg-white/15 hover:text-white"
                >
                  Entender {lens.instrument}
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
