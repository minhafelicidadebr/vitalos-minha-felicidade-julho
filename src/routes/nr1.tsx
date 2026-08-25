// Rota pública de conversão · /nr1 — entrada de campanha (tráfego pago).
// Foca a janela regulatória da NR-1 como PORTA (T1 · COPSOQ II) e conduz à
// jornada anual das 4 Lentes + Relatório Global ESG. Honestidade Fable 5 §8:
// mensuração e evidência agregada — nunca "blindagem jurídica". A copy vive em
// landing-copy.ts (fonte única); este componente apenas apresenta.
// Reusa o modal executivo da landing (compor, não acumular).

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Check, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/app/shell/ThemeToggle";
import { LandingModal } from "@/features/landing/components/LandingModal";
import { useLandingModal } from "@/features/landing/hooks/useLandingModal";
import { landingIcon, TONE_CLASS } from "@/features/landing/components/icons";
import { NR1_LANDING, type CtaAction } from "@/features/landing/data/landing-copy";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";

export const Route = createFileRoute("/nr1")({
  head: () => ({
    meta: [
      { title: NR1_LANDING.meta.title },
      { name: "description", content: NR1_LANDING.meta.description },
    ],
  }),
  component: Nr1Page,
});

const VARIANT: Record<string, "default" | "outline" | "ghost"> = {
  primary: "default",
  outline: "outline",
  ghost: "ghost",
};

// Provas de método (derivadas da metodologia, não de resultados prometidos).
const METHOD_PROOFS = [
  { k: "COPSOQ II", label: "Bateria estruturada nas dimensões do instrumento internacional" },
  { k: "n ≥ 5", label: "K-anonimato imposto no banco — não apenas na tela" },
  { k: "4 lentes", label: "Jornada anual: risco, bem-comum, florescimento e forças" },
  { k: "13 semanas", label: "Ciclo M.E.T.E. — medir, educar, transformar, evoluir" },
];

function Nr1Page() {
  const navigate = useNavigate();
  const { openModal, close, runAction } = useLandingModal();
  const onAction = (action: CtaAction) => runAction(action, (to) => navigate({ to }));
  const c = NR1_LANDING;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#nr1-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
      >
        Pular para o conteúdo
      </a>

      {/* Header público */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/82 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="group flex min-w-0 items-center gap-2.5" aria-label="VitalOS — início">
            <VitalOSBrand variant="horizontal" size="md" />
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Button
              size="sm"
              className="rounded-full px-3 shadow-md shadow-primary/15 sm:px-4"
              onClick={() => onAction({ kind: "modal", modal: "executive" })}
            >
              <span className="sm:hidden">Agendar</span>
              <span className="hidden sm:inline">Agendar demonstração</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="nr1-main" tabIndex={-1} className="outline-none">
        <HeroBlock hero={c.hero} onAction={onAction} />
        <MomentoBlock momento={c.momento} />
        <MudouBlock mudou={c.mudou} />
        <ComoFuncionaBlock como={c.comoFunciona} />
        <JornadaBlock jornada={c.jornada} />
        <PorQueBlock porQue={c.porQue} />
        <ParaQuemBlock paraQuem={c.paraQuem} />
        <FaqBlock faq={c.faq} />
        <FechamentoBlock fechamento={c.fechamento} onAction={onAction} />
      </main>

      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 px-6 sm:flex-row sm:items-center">
          <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground">
            VitalOS™ · Instrumento educativo de mensuração e apoio à gestão de riscos psicossociais.
            Não substitui o PGR nem a avaliação de profissional legalmente habilitado.
          </p>
          <nav className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Rodapé">
            <Link to="/" className="hover:text-foreground">
              Página inicial
            </Link>
            <Link to="/metodologia" className="hover:text-foreground">
              Metodologia
            </Link>
          </nav>
        </div>
      </footer>

      <LandingModal open={openModal} onClose={close} onAction={onAction} />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroBlock({
  hero,
  onAction,
}: {
  hero: typeof NR1_LANDING.hero;
  onAction: (a: CtaAction) => void;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#03100f] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_18%,rgba(201,162,39,0.16)_0%,transparent_38%),radial-gradient(circle_at_82%_82%,rgba(0,180,150,0.13)_0%,transparent_44%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:80px_80px] opacity-70 [mask-image:radial-gradient(circle_at_30%_30%,black,transparent_75%)]"
      />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/70 backdrop-blur sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            {hero.eyebrow}
          </p>
          <h1 className="mt-6 font-serif text-[clamp(2.25rem,8vw,3.5rem)] leading-[1.04] tracking-[-0.03em] text-white">
            {hero.headline}{" "}
            <span className="bg-gradient-to-r from-accent via-[#d9f66f] to-emerald-300 bg-clip-text text-transparent">
              {hero.headlineAccent}
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/[0.72] sm:text-lg">
            {hero.sub}
          </p>

          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            {hero.ctas.map((cta) => (
              <Button
                key={cta.label}
                size="lg"
                onClick={() => onAction(cta.action)}
                className={
                  cta.variant === "primary"
                    ? "w-full bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90 sm:w-auto"
                    : "w-full border-white/25 bg-white/[0.06] text-white hover:bg-white/[0.12] sm:w-auto"
                }
                variant={cta.variant === "primary" ? "default" : "outline"}
              >
                {cta.label}
                {cta.variant !== "primary" && <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />}
              </Button>
            ))}
          </div>

          <ul className="mt-8 flex flex-wrap gap-2" aria-label="Garantias da plataforma">
            {hero.signals.map((s) => (
              <li
                key={s}
                className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-white/[0.66] backdrop-blur"
              >
                {s}
              </li>
            ))}
          </ul>

          <p className="mt-6 max-w-2xl text-[11px] leading-relaxed text-white/45">{hero.disclaimer}</p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Fade helper (respeita reduced-motion via Framer + once) ──────────────────

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">{title}</h2>
      {lead && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{lead}</p>}
    </div>
  );
}

// ─── Momento ──────────────────────────────────────────────────────────────────

function MomentoBlock({ momento }: { momento: typeof NR1_LANDING.momento }) {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal>
          <SectionHead eyebrow={momento.eyebrow} title={momento.title} lead={momento.lead} />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {momento.cards.map((card, i) => {
            const Icon = landingIcon(card.icon);
            return (
              <Reveal key={card.title} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-serif text-lg text-card-foreground">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── O que mudou (stats + fonte honesta) ──────────────────────────────────────

function MudouBlock({ mudou }: { mudou: typeof NR1_LANDING.mudou }) {
  return (
    <section className="bg-card/40 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <SectionHead eyebrow={mudou.eyebrow} title={mudou.title} lead={mudou.text} />
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
            {mudou.body}
          </p>
        </Reveal>
        <p className="mx-auto mt-6 max-w-3xl text-center text-[11px] leading-relaxed text-muted-foreground/80">
          {mudou.source}
        </p>
      </div>
    </section>
  );
}

// ─── Como funciona ────────────────────────────────────────────────────────────

function ComoFuncionaBlock({ como }: { como: typeof NR1_LANDING.comoFunciona }) {
  return (
    <section id="nr1-como-funciona" className="scroll-mt-24 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal>
          <SectionHead eyebrow={como.eyebrow} title={como.title} lead={como.lead} />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {como.steps.map((step, i) => (
            <Reveal key={step.k} delay={i * 0.06}>
              <div className="relative h-full rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
                <span className="font-serif text-4xl font-semibold text-primary/25">{step.k}</span>
                <h3 className="mt-2 font-serif text-lg text-card-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <div className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-primary/25 bg-primary/[0.05] px-5 py-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-xs leading-relaxed text-muted-foreground">{como.note}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Jornada (valoriza a metodologia) ─────────────────────────────────────────

function JornadaBlock({ jornada }: { jornada: typeof NR1_LANDING.jornada }) {
  return (
    <section className="bg-card/40 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal>
          <SectionHead eyebrow={jornada.eyebrow} title={jornada.title} lead={jornada.lead} />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {jornada.quarters.map((q, i) => {
            const tone = TONE_CLASS[q.tone] ?? TONE_CLASS.sky;
            return (
              <Reveal key={q.q} delay={i * 0.06}>
                <div className={`h-full rounded-2xl border border-border/70 bg-background p-5 shadow-sm ring-1 ${tone.ring}`}>
                  <div className="flex items-center justify-between">
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${tone.bg} ${tone.text}`}>
                      {q.q}
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {q.theme}
                    </span>
                  </div>
                  <p className="mt-3 font-serif text-lg text-foreground">{q.instrument}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{q.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-5 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.08] to-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <span className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-foreground">
                  {jornada.finale.badge}
                </span>
                <h3 className="mt-3 font-serif text-2xl text-foreground">{jornada.finale.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {jornada.finale.text}
                </p>
              </div>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/15 font-serif text-2xl font-semibold text-accent-foreground">
                ESG
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Por que VitalOS (sem/com) ────────────────────────────────────────────────

function PorQueBlock({ porQue }: { porQue: typeof NR1_LANDING.porQue }) {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Reveal>
          <SectionHead eyebrow={porQue.eyebrow} title={porQue.title} lead={porQue.lead} />
        </Reveal>
        <Reveal delay={0.08}>
          <div className="mt-10 overflow-hidden rounded-2xl border border-border/70 shadow-sm">
            <div className="grid grid-cols-2 border-b border-border/60 bg-card/60 text-xs font-semibold uppercase tracking-wide">
              <div className="px-4 py-3 text-muted-foreground sm:px-6">Montar do zero</div>
              <div className="px-4 py-3 text-primary sm:px-6">Com VitalOS</div>
            </div>
            {porQue.rows.map((row) => (
              <div key={row.com} className="grid grid-cols-2 border-b border-border/50 last:border-0">
                <div className="flex items-start gap-2 bg-background px-4 py-4 sm:px-6">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden />
                  <span className="text-sm text-muted-foreground">{row.sem}</span>
                </div>
                <div className="flex items-start gap-2 bg-primary/[0.04] px-4 py-4 sm:px-6">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-sm text-card-foreground">{row.com}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Para quem ────────────────────────────────────────────────────────────────

function ParaQuemBlock({ paraQuem }: { paraQuem: typeof NR1_LANDING.paraQuem }) {
  return (
    <section className="bg-card/40 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal>
          <SectionHead eyebrow={paraQuem.eyebrow} title={paraQuem.title} />
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paraQuem.items.map((item, i) => {
            const Icon = landingIcon(item.icon);
            return (
              <Reveal key={item.label} delay={i * 0.05}>
                <div className="flex h-full items-start gap-3 rounded-2xl border border-border/70 bg-background p-5 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-medium text-card-foreground">{item.label}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ (native details = a11y + zero-JS) ────────────────────────────────────

function FaqBlock({ faq }: { faq: typeof NR1_LANDING.faq }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <SectionHead eyebrow={faq.eyebrow} title={faq.title} />
        </Reveal>
        <div className="mt-10 space-y-3">
          {faq.items.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 0.04}>
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="font-medium text-card-foreground">{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {isOpen && (
                    <p className="border-t border-border/50 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Fechamento ───────────────────────────────────────────────────────────────

function FechamentoBlock({
  fechamento,
  onAction,
}: {
  fechamento: typeof NR1_LANDING.fechamento;
  onAction: (a: CtaAction) => void;
}) {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Reveal>
          <h2 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">
            {fechamento.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {fechamento.text}
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              className="rounded-full bg-accent px-8 text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90"
              onClick={() => onAction(fechamento.cta.action)}
            >
              {fechamento.cta.label}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{fechamento.reassurance}</p>
        </Reveal>
      </div>
    </section>
  );
}
