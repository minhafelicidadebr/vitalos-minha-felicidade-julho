// V3 da proposta: capa com a marca VitalOS, Matriz IFT, janelas "Entenda" (camada 2),
// exemplo trabalhado dos turnos e ponte de valor. Tudo lê a mesma fonte de dados do servidor.
// Ciência da aprendizagem aplicada (declarada): codificação dupla (ícone + palavra), segmentação
// (um passo por vez, "1 de 4"), sinalização (o que muda), exemplo trabalhado (antes × depois),
// pré-treino (os quatro movimentos antes das etapas) e contiguidade (rótulo junto do elemento).
import { useContext } from "react";
import { DialogContainer, IFT_ICON, IFT_ORDER, brl } from "./proposal-shared";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Flag,
  Info,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import instituteOnLight from "@/assets/proposal/instituto-logo-on-light.webp";
import instituteOnDark from "@/assets/proposal/instituto-logo-on-dark.webp";
import type {
  Availability,
  IftMovement,
  JourneyStage,
  ProposalContent,
  ScheduleMonth,
} from "./types";

// ── Marca do Instituto: versão de texto escuro no claro, de texto claro no escuro (sem cápsula). ──
export function InstitutoMark({
  surface,
  className = "h-9 w-auto sm:h-11",
}: {
  surface?: "light" | "dark";
  className?: string;
}) {
  const common = { width: 720, alt: "Instituto Felicidade para Todos" } as const;
  if (surface === "dark")
    return <img src={instituteOnDark} height={263} {...common} className={className} />;
  if (surface === "light")
    return <img src={instituteOnLight} height={289} {...common} className={className} />;
  return (
    <>
      <img src={instituteOnLight} height={289} {...common} className={`${className} dark:hidden`} />
      <img
        src={instituteOnDark}
        height={263}
        {...common}
        className={`${className} hidden dark:block`}
      />
    </>
  );
}

const IFT_NAME: Record<IftMovement, string> = {
  mensurar: "Mensurar",
  educar: "Educar",
  transformar: "Transformar",
  evoluir: "Evoluir",
};

export function IftBadge({ m, withLabel = true }: { m: IftMovement; withLabel?: boolean }) {
  const Icon = IFT_ICON[m];
  return (
    <span
      className={`proposal-ift-badge proposal-ift-${m} inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold`}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {withLabel ? IFT_NAME[m] : <span className="sr-only">{IFT_NAME[m]}</span>}
    </span>
  );
}

const STATUS: Record<Availability, string> = {
  plataforma: "Disponível na plataforma",
  instituto: "Conduzido pelo Instituto",
  condicionada: "Condicionado à liberação",
};
export function StatusMark({ a }: { a: Availability }) {
  const Icon = a === "condicionada" ? CircleDashed : a === "instituto" ? Users : CheckCircle2;
  return (
    <span
      className={`proposal-status-mark is-${a} inline-flex items-center gap-1 text-[0.72rem] font-medium`}
    >
      <Icon aria-hidden className="h-3 w-3" />
      {STATUS[a]}
    </span>
  );
}

// ── Camada 2: janela "Entenda". Em modo apresentação o portal vai para dentro do palco
// (que pode estar em tela cheia); na página, para o body. ──

export function Understand({
  label,
  title,
  description,
  children,
  variant = "link",
}: {
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
  variant?: "link" | "button" | "on-dark";
}) {
  const container = useContext(DialogContainer);
  const trigger =
    variant === "button"
      ? "proposal-understand-btn inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold"
      : variant === "on-dark"
        ? "proposal-understand-dark inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold"
        : "proposal-understand-link inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-semibold underline-offset-4 hover:underline";
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger
        className={`${trigger} proposal-no-print focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        <Info aria-hidden className="h-4 w-4" />
        {label}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal container={container ?? undefined}>
        <DialogPrimitive.Overlay className="proposal-dialog-overlay" />
        <DialogPrimitive.Content data-proposal-dialog className="proposal-dialog proposal">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="proposal-kicker text-xs font-semibold uppercase tracking-[0.14em]">
                Entenda
              </p>
              <DialogPrimitive.Title className="font-serif text-2xl leading-tight text-foreground">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-5 space-y-5 text-sm text-foreground">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── Detalhe de uma etapa (janela do Q e anexo de impressão). ──
export function StageDetail({ p, stage }: { p: ProposalContent; stage: JourneyStage }) {
  const f = stage.framework;
  const months: ScheduleMonth[] = p.schedule.stages.find((s) => s.id === stage.id)?.months ?? [];
  const labels = p.ift.roleLabels;
  const total = f.hours.coord + f.hours.educ + f.hours.impl;
  return (
    <div className="space-y-5">
      <p className="flex flex-wrap items-center gap-2">
        <span
          className={`proposal-lens-chip proposal-stage-${stage.id} rounded-full px-2.5 py-0.5 text-xs font-semibold`}
        >
          Lente: {f.lens}
        </span>
        {f.domain === "B" ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <ShieldAlert aria-hidden className="h-3.5 w-3.5" /> Risco psicossocial · educativo
          </span>
        ) : null}
        <span className="font-serif text-base italic text-foreground">“{f.question}”</span>
      </p>
      <section aria-label="Matriz IFT da etapa">
        <ol className="grid gap-2 sm:grid-cols-2">
          {IFT_ORDER.map((m, i) => (
            <li key={m} className={`proposal-ift-cell proposal-ift-${m} rounded-xl p-3`}>
              <p className="flex items-center justify-between gap-2">
                <IftBadge m={m} />
                <span className="text-[0.7rem] text-muted-foreground">{i + 1} de 4</span>
              </p>
              <p className="mt-1.5 text-sm text-foreground">{f.ift[m].text}</p>
              <p className="mt-1">
                {m === "mensurar" && (stage.id === "q1" || stage.id === "q3") ? <span className="text-xs">Referência metodológica</span> : <StatusMark a={f.ift[m].availability} />}
              </p>
            </li>
          ))}
        </ol>
      </section>
      <section aria-label="Mês a mês">
        <h3 className="text-sm font-semibold">Mês a mês</h3>
        <ol className="mt-2 grid gap-2 sm:grid-cols-3">
          {months.map((mo) => (
            <li key={mo.label} className="rounded-xl border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {mo.label} · <span className="text-foreground">{mo.focus}</span>
              </p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {mo.activities.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              {mo.conditioned ? (
                <p className="mt-1 flex gap-1 text-[0.72rem] text-muted-foreground">
                  <CircleDashed aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
                  {mo.conditioned}
                </p>
              ) : null}
              {mo.milestone ? (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold">
                  <Flag aria-hidden className="h-3 w-3 proposal-accent-icon" /> Marco de aceite
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
      <section aria-label="Quem faz o quê">
        <h3 className="text-sm font-semibold">Quem faz o quê</h3>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
            <div key={k} className={`proposal-role proposal-role-${k} rounded-lg p-2.5`}>
              <dt className="text-xs font-semibold uppercase tracking-[0.08em]">{labels[k]}</dt>
              <dd className="text-sm">{f.roles[k]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-1 text-xs text-muted-foreground">{p.ift.rolesNote}</p>
      </section>
      <section aria-label="Equipe do Instituto nesta etapa" className="grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Equipe do Instituto nesta etapa</h3>
          <HoursBar coord={f.hours.coord} educ={f.hours.educ} impl={f.hours.impl} />
          <p className="mt-1 text-xs text-muted-foreground">
            Cerca de {total} horas em 3 meses (proposta).
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Entrega e aceite</h3>
          <p className="text-sm">{stage.deliverable}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {stage.acceptance.map((a) => (
              <li key={a} className="flex gap-1">
                <CheckCircle2 aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </section>
      {stage.capabilities.some((c) => c.decision) ? (
        <section aria-label="Condições">
          <h3 className="text-sm font-semibold">O que depende de liberação</h3>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {stage.capabilities
              .filter((c) => c.decision)
              .map((c) => (
                <li key={c.label}>
                  <span className="font-semibold text-foreground">{c.label}: </span>
                  {c.decision}
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Barra empilhada de horas por papel (rótulos contíguos; tabela implícita para leitor de tela). */
export function HoursBar({ coord, educ, impl }: { coord: number; educ: number; impl: number }) {
  const total = coord + educ + impl;
  const parts = [
    { k: "coord", label: "Coordenação científica", v: coord },
    { k: "educ", label: "Educação e facilitação", v: educ },
    { k: "impl", label: "Implantação e engajamento", v: impl },
  ];
  return (
    <div className="mt-2">
      <div aria-hidden className="flex h-3 overflow-hidden rounded-full">
        {parts.map((x) => (
          <span
            key={x.k}
            className={`proposal-hours-${x.k}`}
            style={{ width: `${(x.v / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-1.5 grid gap-0.5 text-xs">
        {parts.map((x) => (
          <li key={x.k} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`proposal-hours-${x.k} inline-block h-2.5 w-2.5 rounded-sm`}
            />
            {x.label}: <span className="font-semibold tabular-nums">{x.v} h</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Capa da página (D9). ──
export function CoverHero({
  p,
  cta,
  image,
}: {
  p: ProposalContent;
  cta: React.ReactNode;
  image: React.ReactNode;
}) {
  return (
    <section aria-labelledby="titulo-abertura" className="proposal-section">
      <div className="proposal-cover grid overflow-hidden rounded-3xl lg:grid-cols-[1.15fr_1fr]">
        <div className="min-w-0 space-y-5 self-center p-6 sm:p-10">
          <p className="proposal-kicker text-xs font-semibold uppercase tracking-[0.16em]">
            {p.hero.eyebrow}
          </p>
          <VitalOSBrand
            variant="horizontal"
            size="lg"
            decorative={false}
            alt="VitalOS"
            className="proposal-cover-logo"
          />
          <h1
            id="titulo-abertura"
            className="font-serif text-3xl leading-tight text-foreground sm:text-5xl"
          >
            {p.cover.brandLine}
          </h1>
          <p className="max-w-2xl text-lg text-foreground sm:text-xl">{p.cover.valueLine}</p>
          <ul className="flex flex-wrap gap-2" aria-label="Destaques">
            {p.cover.chips.map((c) => (
              <li key={c.label} className="proposal-cover-chip rounded-full px-3 py-1 text-xs">
                <span className="font-semibold">{c.label}</span>
                <span className="text-muted-foreground"> · {c.detail}</span>
              </li>
            ))}
          </ul>
          <p className="max-w-2xl text-base text-muted-foreground">{p.hero.subtitle}</p>
          {cta}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Proposta do</span>
            <InstitutoMark className="h-10 w-auto" />
            <span>{p.version}</span>
          </div>
        </div>
        {image}
      </div>
    </section>
  );
}

// ── Matriz IFT (D1, D2): pré-treino dos 4 movimentos + matriz Q × movimento. ──
export function IftSection({ p }: { p: ProposalContent }) {
  return (
    <section
      id="matriz-ift"
      aria-labelledby="titulo-ift"
      className="proposal-section proposal-anchor space-y-6"
    >
      <header className="max-w-3xl space-y-2">
        <p className="proposal-kicker text-xs font-semibold uppercase tracking-[0.16em]">
          Framework
        </p>
        <h2
          id="titulo-ift"
          className="font-serif text-2xl leading-tight text-foreground sm:text-3xl"
        >
          {p.ift.title}
        </h2>
        <p className="text-base text-muted-foreground">{p.ift.intro}</p>
      </header>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Os quatro movimentos">
        {p.ift.movements.map((m, i) => {
          const Icon = IFT_ICON[m.id];
          return (
            <li
              key={m.id}
              className={`proposal-card proposal-brand-top proposal-ift-move proposal-ift-${m.id} rounded-2xl border border-border bg-card p-5`}
            >
              <span
                aria-hidden
                className="proposal-ift-icon flex h-11 w-11 items-center justify-center rounded-full"
              >
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-xs font-semibold text-muted-foreground">{i + 1}</p>
              <h3 className="font-serif text-xl text-foreground">{m.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
            </li>
          );
        })}
      </ol>
      <div className="proposal-ift-matrix overflow-hidden rounded-2xl border border-border bg-card">
        <div aria-hidden className="proposal-ift-head hidden lg:grid">
          <span />
          {IFT_ORDER.map((m) => (
            <span key={m} className="px-3 py-2">
              <IftBadge m={m} />
            </span>
          ))}
        </div>
        <ol>
          {p.journey.stages.map((s) => (
            <li
              key={s.id}
              className={`proposal-ift-row proposal-stage-${s.id} ${s.framework.domain === "B" ? "is-risk" : ""}`}
            >
              <div className="proposal-ift-rowhead p-4">
                <p className="font-serif text-lg text-foreground">
                  {s.code} · {s.framework.lens}
                </p>
                <p className="text-sm italic text-muted-foreground">“{s.framework.question}”</p>
                {s.framework.domain === "B" ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <ShieldAlert aria-hidden className="h-3.5 w-3.5" /> Risco psicossocial ·
                    educativo
                  </p>
                ) : null}
                <div className="mt-2">
                  <Understand
                    label={`Entenda o ${s.code}`}
                    title={`${s.code} · ${s.verb} · ${s.framework.lens}`}
                    description={s.deliverable}
                  >
                    <StageDetail p={p} stage={s} />
                  </Understand>
                </div>
              </div>
              {IFT_ORDER.map((m) => (
                <div key={m} className="proposal-ift-matrix-cell p-4">
                  <span className="lg:hidden">
                    <IftBadge m={m} />
                  </span>
                  <p className="mt-1 text-sm text-foreground lg:mt-0">{s.framework.ift[m].text}</p>
                  <p className="mt-1">
                    {m === "mensurar" && (s.id === "q1" || s.id === "q3") ? <span className="text-xs">Referência metodológica</span> : <StatusMark a={s.framework.ift[m].availability} />}
                  </p>
                </div>
              ))}
            </li>
          ))}
        </ol>
      </div>
      <p className="flex gap-2 text-sm text-muted-foreground">
        <ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        {p.ift.domainNote}
      </p>
    </section>
  );
}

// ── Exemplo trabalhado dos turnos (D4): problema → diagrama → 4 passos → antes × depois. ──
export function HandoverDiagram({ p, compact = false }: { p: ProposalContent; compact?: boolean }) {
  const h = p.scenario.handover;
  return (
    <figure
      className={`proposal-handover rounded-2xl border border-border bg-card ${compact ? "p-3" : "p-5"}`}
    >
      <figcaption className="text-sm font-semibold text-foreground">
        O que se perde na troca de turno
      </figcaption>
      <div className="mt-3 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="proposal-shift rounded-xl p-3 text-center text-sm font-semibold">
          {h.from}
        </div>
        <ArrowRight
          aria-hidden
          className="mx-auto h-5 w-5 rotate-90 text-muted-foreground sm:rotate-0"
        />
        <div className="proposal-shift rounded-xl p-3 text-center text-sm font-semibold">
          {h.to}
        </div>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {h.tickets.map((t) => (
          <li
            key={t.label}
            className={`flex items-start gap-2 rounded-lg border p-2 text-xs ${t.lost ? "border-dashed proposal-ticket-lost" : "border-border"}`}
          >
            {t.lost ? (
              <AlertTriangle
                aria-hidden
                className="mt-0.5 h-3.5 w-3.5 shrink-0 proposal-accent-icon"
              />
            ) : (
              <CheckCircle2
                aria-hidden
                className="mt-0.5 h-3.5 w-3.5 shrink-0 proposal-accent-text"
              />
            )}
            <span>
              {t.lost ? <span className="sr-only">Perde contexto: </span> : null}
              {t.label}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function ScenarioDetail({ p }: { p: ProposalContent }) {
  const s = p.scenario;
  return (
    <div className="space-y-4">
      <p className="text-sm">{s.problem}</p>
      <HandoverDiagram p={p} compact />
      <ol className="space-y-2">
        {s.steps.map((st, i) => (
          <li key={st.label} className="rounded-xl border border-border p-3">
            <p className="flex items-center gap-2 font-semibold">
              <span className="proposal-step-num flex h-6 w-6 items-center justify-center rounded-full text-xs">
                {i + 1}
              </span>
              {st.label}
              <span className="ml-auto text-[0.7rem] font-normal text-muted-foreground">
                {i + 1} de {s.steps.length}
              </span>
            </p>
            <p className="mt-1 text-sm">{st.body}</p>
            <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-3">
              <div>
                <dt className="font-semibold text-muted-foreground">Quem faz</dt>
                <dd>{st.who}</dd>
              </div>
              <div>
                <dt className="font-semibold text-muted-foreground">O que fica registrado</dt>
                <dd>{st.record}</dd>
              </div>
              <div>
                <dt className="font-semibold text-muted-foreground">O que a equipe vê</dt>
                <dd>{st.teamSees}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
      <BeforeAfter p={p} />
      <div>
        <h3 className="text-sm font-semibold">O que faltaria para falar em efeito</h3>
        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          {s.missing.map((m) => (
            <li key={m} className="flex gap-1">
              <CircleDashed aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
              {m}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BeforeAfter({ p }: { p: ProposalContent }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl border border-dashed border-muted-foreground/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Antes
        </p>
        <p className="mt-1 text-sm">{p.scenario.before}</p>
      </div>
      <div className="proposal-after rounded-xl p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em]">
          Depois (execução, não efeito)
        </p>
        <p className="mt-1 text-sm">{p.scenario.after}</p>
      </div>
    </div>
  );
}

// ── Ponte de valor (D16–D18). ──
export function ValueBridge({ p, large = false }: { p: ProposalContent; large?: boolean }) {
  const max = p.pricing.referencePerStage;
  let running = max;
  return (
    <figure
      className="proposal-bridge"
      aria-label="Do valor de referência à condição desta implantação, por etapa"
    >
      <ol className="space-y-2">
        {p.pricing.bridge.map((b) => {
          let start = 0;
          let width = 0;
          if (b.kind === "reference") {
            width = b.perStage;
          } else if (b.kind === "reduction") {
            running += b.perStage;
            start = running;
            width = -b.perStage;
          } else {
            width = b.perStage;
          }
          return (
            <li
              key={b.label}
              className={`grid items-center gap-x-3 gap-y-1 ${large ? "sm:grid-cols-[14rem_1fr_7rem]" : "sm:grid-cols-[12rem_1fr_6.5rem]"}`}
            >
              <span className="text-sm font-semibold text-foreground">{b.label}</span>
              <span aria-hidden className="proposal-bridge-track relative h-7 rounded-md">
                <span
                  className={`proposal-bridge-bar is-${b.kind} absolute inset-y-0 rounded-md`}
                  style={{ left: `${(start / max) * 100}%`, width: `${(width / max) * 100}%` }}
                />
              </span>
              <span
                className={`text-right font-semibold tabular-nums ${b.kind === "condition" ? "proposal-accent-text text-base" : "text-sm text-foreground"}`}
              >
                {brl(b.perStage)}
              </span>
              <span className="text-xs text-muted-foreground sm:col-start-2 sm:col-end-4">
                {b.detail}
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

export function PriceDetail({ p }: { p: ProposalContent }) {
  const pr = p.pricing;
  return (
    <div className="space-y-5">
      <section aria-label="Composição">
        <h3 className="text-sm font-semibold">Composição do valor de referência</h3>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">Composição por etapa e no programa</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="py-1 font-medium">
                Componente
              </th>
              <th scope="col" className="py-1 pl-3 text-right font-medium">
                Por etapa
              </th>
              <th scope="col" className="py-1 pl-3 text-right font-medium">
                Programa
              </th>
            </tr>
          </thead>
          <tbody>
            {pr.components.map((c) => (
              <tr key={c.label} className="border-b border-border/60 align-top">
                <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                  {c.label}
                  <span className="block text-xs text-muted-foreground">{c.detail}</span>
                </th>
                <td className="whitespace-nowrap py-1.5 pl-3 text-right tabular-nums">
                  {brl(c.perStage)}
                </td>
                <td className="whitespace-nowrap py-1.5 pl-3 text-right tabular-nums">
                  {brl(c.program)}
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-1.5 text-left font-semibold">
                Valor de referência
              </th>
              <td className="whitespace-nowrap py-1.5 pl-3 text-right font-semibold tabular-nums">
                {brl(pr.referencePerStage)}
              </td>
              <td className="whitespace-nowrap py-1.5 pl-3 text-right font-semibold tabular-nums">
                {brl(pr.referenceTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <section aria-label="Horas por etapa">
        <h3 className="text-sm font-semibold">Horas da equipe do Instituto por etapa (proposta)</h3>
        <table className="mt-2 w-full text-xs">
          <caption className="sr-only">Horas por papel e por etapa</caption>
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th scope="col" className="py-1 font-medium">
                Etapa
              </th>
              <th scope="col" className="py-1 pl-3 text-right font-medium">
                <span aria-hidden className="sm:hidden">
                  Coord.
                </span>
                <span className="sr-only sm:not-sr-only">Coordenação</span>
              </th>
              <th scope="col" className="py-1 pl-3 text-right font-medium">
                <span aria-hidden className="sm:hidden">
                  Facil.
                </span>
                <span className="sr-only sm:not-sr-only">Facilitação</span>
              </th>
              <th scope="col" className="py-1 pl-3 text-right font-medium">
                <span aria-hidden className="sm:hidden">
                  Impl.
                </span>
                <span className="sr-only sm:not-sr-only">Implantação</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {p.journey.stages.map((s) => (
              <tr key={s.id} className="border-b border-border/60">
                <th scope="row" className="py-1 text-left font-normal">
                  {s.code} · {s.framework.lens}
                </th>
                <td className="whitespace-nowrap py-1 pl-3 text-right tabular-nums">
                  {s.framework.hours.coord} h
                </td>
                <td className="whitespace-nowrap py-1 pl-3 text-right tabular-nums">
                  {s.framework.hours.educ} h
                </td>
                <td className="whitespace-nowrap py-1 pl-3 text-right tabular-nums">
                  {s.framework.hours.impl} h
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section aria-label="Parâmetros" className="grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Parâmetros do modelo</h3>
          <dl className="mt-1 space-y-0.5 text-xs">
            {pr.parameters.map((x) => (
              <div key={x.label} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{x.label}</dt>
                <dd className="font-semibold tabular-nums">{x.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Licença: o que inclui</h3>
          <p className="text-xs text-muted-foreground">{pr.license.wording}</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {pr.license.includes.map((x) => (
              <li key={x} className="flex gap-1">
                <CheckCircle2
                  aria-hidden
                  className="mt-0.5 h-3 w-3 shrink-0 proposal-accent-text"
                />
                {x}
              </li>
            ))}
          </ul>
          <h3 className="mt-2 text-sm font-semibold">Fica de fora</h3>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {pr.license.excludes.map((x) => (
              <li key={x} className="flex gap-1">
                <CircleDashed aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ul className="space-y-0.5 text-xs text-muted-foreground">
        {pr.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

export function PricingSection({ p }: { p: ProposalContent }) {
  const pr = p.pricing;
  return (
    <section
      id="conta"
      aria-labelledby="titulo-conta"
      className="proposal-section proposal-anchor space-y-6"
    >
      <header className="max-w-3xl space-y-2">
        <p className="proposal-kicker text-xs font-semibold uppercase tracking-[0.16em]">
          Transparência
        </p>
        <h2
          id="titulo-conta"
          className="font-serif text-2xl leading-tight text-foreground sm:text-3xl"
        >
          {pr.title}
        </h2>
        <p className="text-base text-muted-foreground">{pr.intro}</p>
      </header>
      <div className="proposal-card proposal-brand-top rounded-2xl border border-border bg-card p-5 sm:p-6">
        <ValueBridge p={p} large />
        <p className="mt-5 rounded-xl px-4 py-3 text-sm text-foreground proposal-total">
          {pr.collaboration}
        </p>
        <div className="mt-4">
          <Understand
            label="Entenda a conta"
            title="Como chegamos ao valor de referência"
            description="Composição, horas por etapa, parâmetros e o que a licença inclui."
            variant="button"
          >
            <PriceDetail p={p} />
          </Understand>
        </div>
      </div>
    </section>
  );
}

// ── Anexo de impressão: todo o conteúdo das janelas, para o PDF (camada 2 nunca some no papel). ──
export function PrintAppendix({ p }: { p: ProposalContent }) {
  return (
    <section
      aria-label="Aprofundamentos"
      className="proposal-print-only proposal-appendix space-y-8"
    >
      <h2 className="font-serif text-2xl">Aprofundamentos</h2>
      {p.journey.stages.map((s) => (
        <article key={s.id} className="space-y-2">
          <h3 className="font-serif text-xl">
            {s.code} · {s.verb} · {s.framework.lens}
          </h3>
          <StageDetail p={p} stage={s} />
        </article>
      ))}
      <article className="space-y-2">
        <h3 className="font-serif text-xl">Como chegamos ao valor de referência</h3>
        <PriceDetail p={p} />
      </article>
    </section>
  );
}
