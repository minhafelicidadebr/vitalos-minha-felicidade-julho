import { useEffect, useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Building2,
  Compass,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  APPLICATION_MODALS,
  EDUCATIONAL_INNOVATION_MODALS,
  JOURNEY,
  DASHBOARD_PREVIEW,
  EXECUTIVE_FORM,
  IVO_DIMENSION_MODALS,
  LENSES_DEEP,
  LENS_TOOL_MODALS,
  METHOD_DEEP,
  NR1_PLAYBOOK_MODAL,
  type CtaAction,
  type LandingModalType,
} from "../data/landing-copy";
import { TONE_CLASS } from "./icons";

type LensToolModalType = keyof typeof LENS_TOOL_MODALS;
type ApplicationModalType = keyof typeof APPLICATION_MODALS;
type EducationalInnovationModalType = keyof typeof EDUCATIONAL_INNOVATION_MODALS;
type IvoDimensionModalType = keyof typeof IVO_DIMENSION_MODALS;

const IVO_MODAL_ICON: Record<string, LucideIcon> = {
  user: UserRound,
  users: UsersRound,
  compass: Compass,
  building: Building2,
};

function isLensToolModalType(value: LandingModalType | null): value is LensToolModalType {
  return value !== null && value in LENS_TOOL_MODALS;
}

function isApplicationModalType(value: LandingModalType | null): value is ApplicationModalType {
  return value !== null && value in APPLICATION_MODALS;
}

function isEducationalInnovationModalType(
  value: LandingModalType | null,
): value is EducationalInnovationModalType {
  return value !== null && value in EDUCATIONAL_INNOVATION_MODALS;
}

function isIvoDimensionModalType(value: LandingModalType | null): value is IvoDimensionModalType {
  return value !== null && value in IVO_DIMENSION_MODALS;
}

export function LandingModal({
  open,
  onClose,
  onAction,
}: {
  open: LandingModalType | null;
  onClose: () => void;
  onAction?: (action: CtaAction) => void;
}) {
  const lensToolModal = isLensToolModalType(open) ? open : null;
  const applicationModal = isApplicationModalType(open) ? open : null;
  const educationalInnovationModal = isEducationalInnovationModalType(open) ? open : null;
  const ivoDimensionModal = isIvoDimensionModalType(open) ? open : null;

  return (
    <Dialog open={open !== null} onOpenChange={(o) => !o && onClose()}>
      {open === "journey" && <JourneyModal />}
      {open === "dashboard" && <DashboardModal />}
      {open === "executive" && <ExecutiveModal />}
      {open === "lenses-deep" && <LensesDeepModal onAction={onAction} onClose={onClose} />}
      {open === "method-deep" && <MethodDeepModal onAction={onAction} onClose={onClose} />}
      {open === "nr1-playbook" && <Nr1PlaybookModal onAction={onAction} onClose={onClose} />}
      {ivoDimensionModal && (
        <IvoDimensionModal type={ivoDimensionModal} onAction={onAction} onClose={onClose} />
      )}
      {applicationModal && (
        <ApplicationIvoModal type={applicationModal} onAction={onAction} onClose={onClose} />
      )}
      {educationalInnovationModal && (
        <EducationalInnovationModal
          type={educationalInnovationModal}
          onAction={onAction}
          onClose={onClose}
        />
      )}
      {lensToolModal && (
        <LensToolModal type={lensToolModal} onAction={onAction} onClose={onClose} />
      )}
    </Dialog>
  );
}

// ─── Modal · Inovação educacional ────────────────────────────────────────────

function IvoDimensionModal({
  type,
  onAction,
  onClose,
}: {
  type: IvoDimensionModalType;
  onAction?: (action: CtaAction) => void;
  onClose: () => void;
}) {
  const d = IVO_DIMENSION_MODALS[type];
  const tone = TONE_CLASS[d.tone] ?? TONE_CLASS.sky!;
  const Icon = IVO_MODAL_ICON[d.icon] ?? Sparkles;
  const diagramPositions = [
    "col-start-2 row-start-1",
    "col-start-1 row-start-2",
    "col-start-3 row-start-2",
    "col-start-2 row-start-3",
  ];

  return (
    <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto p-0 sm:rounded-2xl">
      <DialogHeader className="relative overflow-hidden border-b border-white/10 bg-institutional-deep px-6 py-7 pr-14 text-left text-white sm:px-8">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(201,162,39,0.2),transparent_30%),radial-gradient(circle_at_88%_76%,rgba(16,185,129,0.16),transparent_34%),linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,54px_54px,54px_54px]"
        />
        <div aria-hidden className={`absolute inset-x-0 top-0 h-1 ${tone.dot} opacity-90`} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <span
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/[0.08] ${tone.text} shadow-2xl backdrop-blur`}
          >
            <Icon className="h-8 w-8" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.bg} ${tone.text}`}
              >
                {d.index} · {d.label}
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">
                Dimensão IVO
              </span>
            </div>
            <DialogTitle className="mt-3 max-w-3xl font-serif text-2xl leading-tight text-white sm:text-3xl">
              {d.title}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70">
              {d.subtitle}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-5 bg-background p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[0.84fr_1.16fr]">
          <section
            className={`relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 ring-1 ring-inset ${tone.ring}`}
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_44%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_36%,transparent)_1px,transparent_1px)] bg-[size:42px_42px] opacity-35"
            />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${tone.text}`}>
                  Mapa vivo da dimensão
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Quatro sinais que formam uma experiência
                </p>
              </div>
              <BrainCircuit className={`h-5 w-5 ${tone.text}`} aria-hidden />
            </div>

            <div className="relative mt-5 grid min-h-[390px] grid-cols-[1fr_1.18fr_1fr] grid-rows-3 items-center gap-2">
              <span
                aria-hidden
                className={`absolute left-1/2 top-[15%] h-[70%] w-px -translate-x-1/2 ${tone.dot} opacity-25`}
              />
              <span
                aria-hidden
                className={`absolute left-[15%] top-1/2 h-px w-[70%] -translate-y-1/2 ${tone.dot} opacity-25`}
              />

              {d.drivers.map((driver, index) => (
                <div
                  key={driver.label}
                  className={`relative z-10 rounded-2xl border border-border/70 bg-background/80 px-2 py-3 text-center shadow-sm backdrop-blur ${diagramPositions[index]}`}
                >
                  <p
                    className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${tone.text}`}
                  >
                    {driver.label}
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-tight text-card-foreground">
                    {driver.title}
                  </p>
                </div>
              ))}

              <div
                className={`relative z-20 col-start-2 row-start-2 mx-auto grid h-28 w-28 place-items-center rounded-full border border-border/70 ${tone.bg} shadow-[0_18px_50px_rgba(11,61,46,0.14)] ring-1 ring-inset ${tone.ring}`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-3 rounded-full border border-dashed ${tone.ring}`}
                />
                <div className="relative text-center">
                  <Icon className={`mx-auto h-7 w-7 ${tone.text}`} aria-hidden />
                  <p className={`mt-1 font-serif text-xl ${tone.text}`}>{d.label}</p>
                  <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Vitalidade
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mt-4 rounded-2xl border border-accent/25 bg-accent/5 p-4">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Atenção que gera valor
              </p>
              <p className="mt-2 font-serif text-sm leading-relaxed text-card-foreground">
                {d.neuroHook}
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-3xl border border-border/70 bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                O que esta dimensão revela
              </p>
              <p className="mt-2 font-serif text-lg leading-relaxed text-card-foreground">
                {d.thesis}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {d.drivers.map((driver) => (
                  <article
                    key={driver.label}
                    className={`rounded-2xl border border-border/70 bg-background/55 p-4 ring-1 ring-inset ${tone.ring}`}
                  >
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${tone.text}`}
                    >
                      {driver.label}
                    </p>
                    <h3 className="mt-1 font-serif text-base text-card-foreground">
                      {driver.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {driver.text}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Ciência do aprendizado aplicada
              </p>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {d.learningFlow.map((step) => (
                  <li key={step.k} className="relative rounded-2xl bg-muted/35 p-3">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-xl font-mono text-[10px] font-semibold ${tone.bg} ${tone.text}`}
                    >
                      {step.k}
                    </span>
                    <p className="mt-3 font-serif text-sm text-card-foreground">{step.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {step.text}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-border/70 bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Como o VitalOS desenvolve esta dimensão
              </p>
              <p className="mt-1 text-sm text-card-foreground">
                Tecnologia, educação e governança trabalhando como um único sistema.
              </p>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              Sinal → aprendizagem → ação → evidência
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {d.activations.map((activation, index) => (
              <article
                key={activation.title}
                className={`relative overflow-hidden rounded-2xl border border-border/70 bg-background/55 p-4 ring-1 ring-inset ${tone.ring}`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-1 ${tone.dot} opacity-80`}
                />
                <p className={`font-mono text-[10px] font-semibold ${tone.text}`}>0{index + 1}</p>
                <h3 className="mt-2 font-serif text-base text-card-foreground">
                  {activation.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {activation.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 rounded-3xl border border-primary/20 bg-primary/5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Valor para a gestão
            </p>
            <p className="mt-2 font-serif text-base leading-relaxed text-card-foreground">
              {d.outcome}
            </p>
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {d.guardrail}
            </p>
          </div>
          <Button
            size="lg"
            className="min-w-56 gap-2"
            onClick={() => {
              onClose();
              onAction?.({ kind: "modal", modal: "executive" });
            }}
          >
            Desenvolver esta dimensão
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </section>
      </div>
    </DialogContent>
  );
}

function EducationalInnovationModal({
  type,
  onAction,
  onClose,
}: {
  type: EducationalInnovationModalType;
  onAction?: (action: CtaAction) => void;
  onClose: () => void;
}) {
  const d = EDUCATIONAL_INNOVATION_MODALS[type];

  return (
    <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            {d.eyebrow}
          </span>
          <a
            href={d.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Abrir formação
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
        <DialogTitle className="font-serif text-2xl leading-tight text-foreground">
          {d.title}
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">{d.subtitle}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr]">
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_44%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_36%,transparent)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40"
          />
          <div className="relative rounded-3xl border border-accent/20 bg-accent/5 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Tese de inovação
            </p>
            <p className="mt-3 font-serif text-xl leading-tight text-card-foreground">{d.thesis}</p>
          </div>

          <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
            {d.pillars.map((pillar) => {
              const tone = TONE_CLASS[pillar.tone] ?? TONE_CLASS.sky!;
              return (
                <article
                  key={pillar.title}
                  className={`rounded-2xl border border-border/70 bg-background/70 p-4 ring-1 ring-inset ${tone.ring}`}
                >
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.bg} ${tone.text}`}
                  >
                    {pillar.label}
                  </span>
                  <h3 className="mt-3 font-serif text-base leading-tight text-card-foreground">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {pillar.text}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-border/70 bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Arquitetura pedagógica
            </p>
            <ol className="mt-4 space-y-3">
              {d.learningFlow.map((step, index) => (
                <li key={step} className="flex gap-3 rounded-2xl bg-background/60 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 font-mono text-xs font-semibold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-xs leading-relaxed text-card-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Valor institucional
            </p>
            <p className="mt-2 font-serif text-base leading-relaxed text-card-foreground">
              {d.outcome}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" variant="outline" className="flex-1">
                <a href={d.sourceUrl} target="_blank" rel="noreferrer">
                  Abrir formação
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={() => {
                  onClose();
                  onAction?.({ kind: "modal", modal: "executive" });
                }}
              >
                Aplicar no VitalOS
              </Button>
            </div>
          </div>
        </section>
      </div>
    </DialogContent>
  );
}

// ─── Modal · Adaptação IVO por ecossistema ───────────────────────────────────

function ApplicationIvoModal({
  type,
  onAction,
  onClose,
}: {
  type: ApplicationModalType;
  onAction?: (action: CtaAction) => void;
  onClose: () => void;
}) {
  const d = APPLICATION_MODALS[type];

  return (
    <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
      <DialogHeader>
        <span className="w-fit rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {d.eyebrow}
        </span>
        <DialogTitle className="font-serif text-2xl leading-tight text-foreground">
          {d.title}
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">{d.subtitle}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_44%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_36%,transparent)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40"
          />
          <div className="relative rounded-3xl border border-border/60 bg-background/70 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              IVO adaptativo
            </p>
            <p className="mt-3 font-serif text-xl leading-tight text-card-foreground">{d.thesis}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {d.dimensions.map((dimension) => {
                const tone = TONE_CLASS[dimension.tone] ?? TONE_CLASS.sky!;
                return (
                  <div
                    key={dimension.label}
                    className={`rounded-2xl border border-border/70 bg-card p-4 ring-1 ring-inset ${tone.ring}`}
                  >
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.bg} ${tone.text}`}
                    >
                      {dimension.label}
                    </span>
                    <p className="mt-3 font-serif text-base leading-tight text-card-foreground">
                      {dimension.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative mt-4 rounded-3xl border border-accent/20 bg-accent/5 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Ciência do aprendizado aplicada
            </p>
            <p className="mt-2 text-sm leading-relaxed text-card-foreground">{d.learning}</p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-border/70 bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Como as 4 dimensões se adaptam ao contexto
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {d.dimensions.map((dimension) => {
                const tone = TONE_CLASS[dimension.tone] ?? TONE_CLASS.sky!;
                return (
                  <article
                    key={dimension.title}
                    className={`rounded-2xl border border-border/70 bg-background/60 p-4 ring-1 ring-inset ${tone.ring}`}
                  >
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.text}`}
                    >
                      {dimension.label}
                    </p>
                    <h3 className="mt-1 font-serif text-lg text-card-foreground">
                      {dimension.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {dimension.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Saída gerencial
            </p>
            <p className="mt-2 font-serif text-base leading-relaxed text-card-foreground">
              {d.outcome}
            </p>
            <Button
              size="lg"
              className="mt-4 w-full"
              onClick={() => {
                onClose();
                onAction?.({ kind: "modal", modal: "executive" });
              }}
            >
              Desenhar aplicação no meu contexto
            </Button>
          </div>
        </section>
      </div>
    </DialogContent>
  );
}

// ─── Modal · Rede NR-1 + COPSOQ ──────────────────────────────────────────────

function Nr1PlaybookModal({
  onAction,
  onClose,
}: {
  onAction?: (action: CtaAction) => void;
  onClose: () => void;
}) {
  const d = NR1_PLAYBOOK_MODAL;

  return (
    <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
            {d.eyebrow}
          </span>
          <a
            href={d.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-border/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {d.sourceLabel}
          </a>
        </div>
        <DialogTitle className="font-serif text-2xl leading-tight text-foreground">
          {d.title}
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">{d.subtitle}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_44%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_36%,transparent)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/45 to-transparent"
          />
          <div className="relative grid min-h-[360px] place-items-center rounded-3xl border border-border/60 bg-background/65 p-4">
            <div className="relative grid h-72 w-72 place-items-center">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full border border-dashed border-sky-500/30"
              />
              <span
                aria-hidden
                className="absolute inset-8 rounded-full border border-primary/25"
              />
              <div className="relative z-10 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                  COPSOQ + NR-1
                </p>
                <p className="mt-1 font-serif text-3xl text-card-foreground">GRO/PGR</p>
                <p className="mx-auto mt-2 max-w-40 text-xs leading-relaxed text-muted-foreground">
                  escuta, risco, driver, ação e evidência
                </p>
              </div>
              {["Escopo", "Coleta", "Matriz", "Backlog", "Evidência"].map((label, index) => (
                <span
                  key={label}
                  className="absolute rounded-full border border-border/60 bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-card-foreground shadow-sm"
                  style={{
                    top:
                      index === 0
                        ? "1%"
                        : index === 1
                          ? "26%"
                          : index === 2
                            ? "78%"
                            : index === 3
                              ? "52%"
                              : "26%",
                    left: index === 0 ? "35%" : index === 1 ? "-6%" : index === 2 ? "34%" : "72%",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <p className="relative mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 font-serif text-sm leading-relaxed text-card-foreground">
            {d.thesis}
          </p>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-border/70 bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Sequência metodológica aplicada
            </p>
            <ol className="mt-4 space-y-3">
              {d.flow.map((step) => {
                const tone = TONE_CLASS[step.tone] ?? TONE_CLASS.sky!;
                return (
                  <li
                    key={step.k}
                    className={`relative overflow-hidden rounded-2xl border border-border/70 bg-background/55 p-4 ring-1 ring-inset ${tone.ring}`}
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-y-0 left-0 w-1 ${tone.dot} opacity-80`}
                    />
                    <div className="flex gap-3">
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-mono text-xs font-semibold ${tone.bg} ${tone.text}`}
                      >
                        {step.k}
                      </span>
                      <div>
                        <p className="font-serif text-lg text-card-foreground">{step.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {step.text}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Entregáveis
              </p>
              <ul className="mt-3 space-y-2">
                {d.deliverables.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-xs leading-relaxed text-card-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Guardrails
              </p>
              <ul className="mt-3 space-y-2">
                {d.guardrails.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-xs leading-relaxed text-card-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
            <p className="font-serif text-base leading-relaxed text-card-foreground">{d.closing}</p>
            <Button
              size="lg"
              className="mt-4 w-full"
              onClick={() => {
                onClose();
                onAction?.({ kind: "modal", modal: "executive" });
              }}
            >
              Conversar sobre aplicação institucional
            </Button>
          </div>
        </section>
      </div>
    </DialogContent>
  );
}

function LensToolModal({
  type,
  onAction,
  onClose,
}: {
  type: LensToolModalType;
  onAction?: (action: CtaAction) => void;
  onClose: () => void;
}) {
  const d = LENS_TOOL_MODALS[type];
  const tone = TONE_CLASS[d.tone] ?? TONE_CLASS.sky!;

  return (
    <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.bg} ${tone.text}`}
          >
            {d.quarter}
          </span>
          <span className="rounded-full border border-border/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {d.theme}
          </span>
        </div>
        <DialogTitle className="font-serif text-2xl leading-tight text-foreground">
          {d.instrument}: {d.title}
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">{d.subtitle}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div
          className={`relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 ring-1 ring-inset ${tone.ring}`}
        >
          <div className="relative">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${tone.text}`}>
              Mapa de aferição
            </p>
            <div className="mt-5 grid aspect-square place-items-center rounded-3xl border border-border/60 bg-background/70">
              <div className="relative grid h-56 w-56 place-items-center">
                <span
                  aria-hidden
                  className={`absolute inset-0 rounded-full border border-dashed ${tone.ring}`}
                />
                <span aria-hidden className={`absolute inset-8 rounded-full border ${tone.ring}`} />
                <span
                  aria-hidden
                  className={`absolute inset-16 rounded-full ${tone.bg} opacity-60`}
                />
                <div className="relative z-10 text-center">
                  <p className={`font-mono text-xs font-semibold ${tone.text}`}>{d.quarter}</p>
                  <p className="mt-1 font-serif text-3xl text-card-foreground">{d.instrument}</p>
                  <p className="mx-auto mt-2 max-w-36 text-[11px] leading-relaxed text-muted-foreground">
                    evidência agregada para decisão
                  </p>
                </div>
                {d.measures.slice(0, 4).map((item, index) => (
                  <span
                    key={item}
                    className={`absolute rounded-full border border-border/60 bg-card px-2.5 py-1 text-[10px] font-medium ${tone.text}`}
                    style={{
                      top: index < 2 ? "6%" : "84%",
                      left: index % 2 === 0 ? "-4%" : "58%",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 p-4 font-serif text-sm italic leading-relaxed text-card-foreground">
              {d.neuroHook}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-border/70 bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              O que observa
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {d.measures.map((item) => (
                <span
                  key={item}
                  className={`rounded-full border border-border/60 px-3 py-1.5 text-xs ${tone.text}`}
                >
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border/70 bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Ciência do aprendizado aplicada
            </p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {d.learningFlow.map((step, index) => (
                <li key={step} className="flex gap-3 rounded-2xl bg-muted/35 p-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-semibold ${tone.bg} ${tone.text}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs leading-relaxed text-card-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Saída do trimestre
              </p>
              <p className="mt-2 text-sm leading-relaxed text-card-foreground">{d.output}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Base metodológica
              </p>
              <p className="mt-2 text-sm leading-relaxed text-card-foreground">{d.evidence}</p>
            </div>
          </section>

          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              onClose();
              onAction?.({ kind: "modal", modal: "journey" });
            }}
          >
            Ver como entra no programa anual
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ─── Modal · Deep dive · As 4 Lentes ──────────────────────────────────────────

function LensesDeepModal({
  onAction,
  onClose,
}: {
  onAction?: (action: CtaAction) => void;
  onClose: () => void;
}) {
  const d = LENSES_DEEP;
  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl leading-tight text-foreground">
          {d.title}
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">{d.subtitle}</DialogDescription>
      </DialogHeader>
      <p className="-mt-1 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 font-serif text-sm italic leading-relaxed text-foreground">
        {d.hook}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {d.pillars.map((p) => {
          const tone = TONE_CLASS[p.tone] ?? TONE_CLASS.sky!;
          return (
            <article
              key={p.q}
              className={`rounded-2xl border border-border/70 bg-card p-4 ring-1 ring-inset ${tone.ring}`}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.text}`}>
                {p.q}
              </p>
              <p className="mt-1 font-serif text-base text-card-foreground">{p.instrument}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Base científica
              </p>
              <p className="text-xs leading-relaxed text-foreground/80">{p.science}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                O que mede
              </p>
              <p className="text-xs leading-relaxed text-foreground/80">{p.what}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Por que importa
              </p>
              <p className="text-xs leading-relaxed text-foreground/80">{p.why}</p>
            </article>
          );
        })}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{d.closing}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="lg"
          onClick={() => {
            onClose();
            onAction?.(d.cta.action);
          }}
        >
          {d.cta.label}
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Modal · Deep dive · Método M.E.T.E. ──────────────────────────────────────

function MethodDeepModal({
  onAction,
  onClose,
}: {
  onAction?: (action: CtaAction) => void;
  onClose: () => void;
}) {
  const d = METHOD_DEEP;
  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl leading-tight text-foreground">
          {d.title}
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">{d.subtitle}</DialogDescription>
      </DialogHeader>
      <p className="-mt-1 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 font-serif text-sm italic leading-relaxed text-foreground">
        {d.hook}
      </p>
      <ol className="space-y-3">
        {d.stages.map((s) => {
          const tone = TONE_CLASS[s.tone] ?? TONE_CLASS.sky!;
          return (
            <li
              key={s.n}
              className={`flex gap-4 rounded-2xl border border-border/70 bg-card p-4 ring-1 ring-inset ${tone.ring}`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-mono text-base font-semibold ${tone.bg} ${tone.text}`}
              >
                {s.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg text-card-foreground">{s.title}</p>
                <p className={`text-[11px] font-medium uppercase tracking-[0.12em] ${tone.text}`}>
                  {s.science}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">{s.what}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground/70">Ciência do aprendizado:</span>{" "}
                  {s.learning}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <ul className="grid gap-2 rounded-2xl bg-muted/30 p-4 sm:grid-cols-2">
        {d.pillars.map((p) => (
          <li key={p} className="flex gap-2 text-xs leading-relaxed text-foreground/80">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            {p}
          </li>
        ))}
      </ul>
      <p className="text-sm leading-relaxed text-muted-foreground">{d.closing}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="lg"
          onClick={() => {
            onClose();
            onAction?.(d.cta.action);
          }}
        >
          {d.cta.label}
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Modal · Jornada de 12 meses ──────────────────────────────────────────────

function JourneyModal() {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-serif text-xl">{JOURNEY.title}</DialogTitle>
        <DialogDescription>{JOURNEY.subtitle}</DialogDescription>
      </DialogHeader>
      <ol className="mt-2 space-y-3">
        {JOURNEY.quarters.map((q) => {
          const tone = TONE_CLASS[q.tone] ?? TONE_CLASS.sky!;
          return (
            <li key={q.q} className="flex gap-3 rounded-xl border border-border/60 bg-card p-3.5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold ${tone.bg} ${tone.text}`}
              >
                {q.q}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-card-foreground">
                  {q.instrument} · <span className="text-muted-foreground">{q.theme}</span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{q.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </DialogContent>
  );
}

// ─── Modal · Dashboard demo ───────────────────────────────────────────────────

function DashboardModal() {
  const d = DASHBOARD_PREVIEW;
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-serif text-xl">Dashboard — demonstração</DialogTitle>
        <DialogDescription>{d.note}</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-3 gap-3">
        {d.metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border/60 bg-background p-3">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              {m.label}
            </p>
            <p className="mt-1 font-serif text-2xl text-foreground">{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.sub}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2.5">
        {d.dimensions.map((dimension) => (
          <div key={dimension.name} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs font-medium text-card-foreground">
              {dimension.name}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${dimension.score}%` }}
                aria-hidden
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {dimension.score}
            </span>
          </div>
        ))}
      </div>
      <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        Pré-visualização ilustrativa. No app, cada número é agregado (n≥5) e rastreável ao
        instrumento.
      </p>
    </DialogContent>
  );
}

// ─── Modal · Apresentação executiva (form visual, sem backend) ────────────────

function ExecutiveModal() {
  const f = EXECUTIVE_FORM;
  const [submitted, setSubmitted] = useState(false);
  const [interest, setInterest] = useState<string>(f.interests[0]!);

  // Reinicia o estado sempre que o modal monta.
  useEffect(() => {
    setSubmitted(false);
    setInterest(f.interests[0]!);
  }, [f.interests]);

  if (submitted) {
    return (
      <DialogContent className="max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{f.successTitle}</DialogTitle>
          <DialogDescription>{f.successText}</DialogDescription>
        </DialogHeader>
        <span
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          aria-hidden
        >
          ✓
        </span>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif text-xl">{f.title}</DialogTitle>
        <DialogDescription>{f.subtitle}</DialogDescription>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        {f.fields.map((field) => (
          <div key={field.id}>
            <Label htmlFor={`lp-${field.id}`} className="text-xs text-muted-foreground">
              {field.label}
            </Label>
            <Input
              id={`lp-${field.id}`}
              type={field.type}
              placeholder={field.placeholder}
              autoComplete="off"
              className="mt-1"
            />
          </div>
        ))}

        <div>
          <Label htmlFor="lp-interesse" className="text-xs text-muted-foreground">
            Principal interesse
          </Label>
          <div
            className="mt-1.5 flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Principal interesse"
          >
            {f.interests.map((opt) => (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={interest === opt}
                onClick={() => setInterest(opt)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  interest === opt
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/60 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" className="mt-2 w-full">
          {f.submitLabel}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Demonstração visual — nenhum dado é enviado ou armazenado.
        </p>
      </form>
    </DialogContent>
  );
}
