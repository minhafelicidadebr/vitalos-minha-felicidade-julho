// Proposta web por seções · leitura executiva primeiro, detalhes sob demanda.
// O conteúdo (inclusive preço) só chega depois da senha validada no servidor (/api/proposta).
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  CalendarCheck,
  Flag,
  CheckCircle2,
  CircleDashed,
  Info,
  LockKeyhole,
  LogOut,
  MonitorPlay,
  Printer,
  Users,
} from "lucide-react";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import { HERO_IMAGE, ILLUSTRATION } from "./media";
import { useReveal } from "./motion";
import {
  ImageBand,
  ScheduleSection,
  ScienceSection,
  TeamSection,
  TrackSection,
} from "./ProposalSections";
import { ProposalSlides } from "./ProposalSlides";
import {
  BeforeAfter,
  CoverHero,
  HandoverDiagram,
  IftBadge,
  IftSection,
  InstitutoMark,
  PricingSection,
  PrintAppendix,
  ScenarioDetail,
  StageDetail,
  Understand,
} from "./ProposalV3";
import { IFT_ORDER } from "./proposal-shared";
import type { Availability, ClaimKind, JourneyStage, ProposalContent } from "./types";
import "./proposal.css";

type Screen = "checking" | "locked" | "unavailable" | "limited" | "error";
const brl = (value: number) =>
  "R$ " + value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const STAGE_ACCENT: Record<JourneyStage["id"], string> = {
  q1: "proposal-accent-1",
  q2: "proposal-accent-2",
  q3: "proposal-accent-3",
  q4: "proposal-accent-4",
  q5: "proposal-accent-5",
};

const CLAIM_LABEL: Record<ClaimKind, string> = {
  fato: "Fato verificado",
  hipotese: "Hipótese para a conversa",
  condicao: "Condição proposta",
  exemplo: "Exemplo fictício",
};

const AVAILABILITY: Record<Availability, { label: string; className: string }> = {
  plataforma: {
    label: "Disponível na plataforma",
    className: "border-primary bg-primary/10 text-primary",
  },
  instituto: {
    label: "Conduzido pelo Instituto",
    className: "border-accent bg-accent/15 text-foreground",
  },
  condicionada: {
    label: "Condicionado à liberação",
    className: "border-dashed border-muted-foreground/70 text-muted-foreground",
  },
};

function Tag({ kind }: { kind: ClaimKind }) {
  return (
    <span className="proposal-tag inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {CLAIM_LABEL[kind]}
    </span>
  );
}

function AvailabilityChip({ value }: { value: Availability }) {
  const a = AVAILABILITY[value];
  const Icon =
    value === "condicionada" ? CircleDashed : value === "instituto" ? Users : CheckCircle2;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${a.className}`}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {a.label}
    </span>
  );
}

function SectionHead({
  id,
  kicker,
  title,
  intro,
}: {
  id: string;
  kicker: string;
  title: string;
  intro?: string;
}) {
  return (
    <header className="max-w-3xl space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {kicker}
      </p>
      <h2 id={id} className="font-serif text-2xl leading-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {intro ? <p className="text-base text-muted-foreground">{intro}</p> : null}
    </header>
  );
}

function Details({
  summary,
  children,
  icon = false,
}: {
  summary: string;
  children: React.ReactNode;
  icon?: boolean;
}) {
  return (
    <details className="proposal-details group rounded-xl border border-border bg-card">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {icon ? <Info aria-hidden className="h-4 w-4" /> : null}
        <span>{summary}</span>
        <ArrowDown
          aria-hidden
          className="proposal-chevron ml-auto h-4 w-4 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-4 text-sm text-foreground">
        {children}
      </div>
    </details>
  );
}

const NAV = [
  { href: "#ciencia", label: "Ciência" },
  { href: "#matriz-ift", label: "Matriz IFT" },
  { href: "#jornada", label: "Jornada" },
  { href: "#cronograma", label: "Cronograma" },
  { href: "#investimento", label: "Investimento" },
  { href: "#equipe", label: "Equipe" },
  { href: "#proxima-conversa", label: "Próxima conversa" },
];

/** Marca do Instituto sem cápsula: versão de texto escuro no claro e de texto claro no escuro. */
function InstitutoLogo() {
  return <InstitutoMark className="h-9 w-auto sm:h-12" />;
}

function CtaPrimary({ p }: { p: ProposalContent }) {
  const cls =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const contact = p.nextSession.contact;
  return contact ? (
    <a href={contact.href} target="_blank" rel="noopener noreferrer" className={cls}>
      <CalendarCheck aria-hidden className="h-4 w-4" />
      {p.hero.primaryCta}
    </a>
  ) : (
    // Âncora na própria página. O foco vai para o título de destino, para quem usa teclado
    // ou leitor de tela continuar dali. A rolagem respeita scroll-padding/scroll-margin
    // (cabeçalho fixo) e o movimento reduzido (scroll-behavior via CSS).
    <a
      href="#proxima-conversa"
      className={cls}
      onClick={(event) => {
        const section = document.getElementById("proxima-conversa");
        const heading = document.getElementById("titulo-proxima");
        if (!section || !heading) return;
        event.preventDefault();
        window.history.replaceState(null, "", "#proxima-conversa");
        section.scrollIntoView({ block: "start" });
        heading.focus({ preventScroll: true });
      }}
    >
      {p.hero.primaryCta}
      <ArrowDown aria-hidden className="h-4 w-4" />
    </a>
  );
}

export function ProposalView({ p, onLogout }: { p: ProposalContent; onLogout?: () => void }) {
  // Impressão: abre todo o conteúdo expansível e restaura o estado depois.
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    const before = () => {
      opened = Array.from(
        document.querySelectorAll<HTMLDetailsElement>("details.proposal-details:not([open])"),
      );
      opened.forEach((d) => (d.open = true));
    };
    const after = () => {
      opened.forEach((d) => (d.open = false));
      opened = [];
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  const inv = p.investment;
  const parcel = inv.total / inv.installments;
  const monthly = parcel / inv.monthsPerStage;
  const root = useRef<HTMLDivElement>(null);
  const presentButton = useRef<HTMLButtonElement>(null);
  const [presenting, setPresenting] = useState(false);
  useReveal(root);
  const bandCaption = p.hero.imageCaption;
  const band = (id: string) => {
    const b = p.bands.find((x) => x.id === id);
    return b ? <ImageBand band={b} caption={bandCaption} /> : null;
  };

  if (presenting)
    return (
      <ProposalSlides
        p={p}
        onExit={() => {
          setPresenting(false);
          requestAnimationFrame(() => presentButton.current?.focus());
        }}
      />
    );

  return (
    <div ref={root} className="proposal min-h-dvh bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2"
      >
        Ir para o conteúdo
      </a>
      <header className="proposal-topbar sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
          <InstitutoLogo />
          <div className="proposal-no-print flex items-center gap-1">
            <button
              ref={presentButton}
              type="button"
              onClick={() => setPresenting(true)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-semibold text-primary hover:bg-primary/5 sm:px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MonitorPlay aria-hidden className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Apresentar</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-primary hover:bg-primary/5 sm:px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Printer aria-hidden className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir ou PDF</span>
              <span className="sr-only sm:hidden">Imprimir</span>
            </button>
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-muted sm:px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Sair</span>
              </button>
            ) : null}
          </div>
        </div>
        <nav aria-label="Seções da proposta" className="proposal-no-print mx-auto max-w-6xl px-2">
          <ul className="proposal-nav flex gap-1 overflow-x-auto pb-1">
            {NAV.map((n) => (
              <li key={n.href} className="shrink-0">
                <a
                  href={n.href}
                  className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto max-w-6xl space-y-16 px-4 pb-16 pt-6 focus:outline-none sm:space-y-20"
      >
        <p className="proposal-print-only text-xs text-muted-foreground">
          {p.version} · Circulação restrita · Proposta para conversa, não é contrato.
        </p>

        {/* 1 · Capa: marca VitalOS, categoria, frase de valor (D9) */}
        <CoverHero
          p={p}
          cta={
            <div className="proposal-no-print flex flex-wrap items-center gap-3 pt-1">
              <CtaPrimary p={p} />
              <a
                href="#entregas"
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {p.hero.secondaryCta} <ArrowRight aria-hidden className="h-4 w-4" />
              </a>
            </div>
          }
          image={
            <figure className="proposal-hero-figure relative min-w-0 overflow-hidden bg-muted">
              <img
                src={HERO_IMAGE}
                width={ILLUSTRATION.width}
                height={ILLUSTRATION.height}
                fetchPriority="high"
                alt={p.hero.imageAlt}
                className="aspect-[16/9] w-full object-cover lg:absolute lg:inset-0 lg:aspect-auto lg:h-full"
              />
              <figcaption className="absolute bottom-3 left-3 rounded-full bg-black/75 px-3 py-1 text-xs text-white">
                {p.hero.imageCaption}
              </figcaption>
            </figure>
          }
        />

        {/* Leitura de 2 minutos */}
        <section aria-labelledby="titulo-resumo" className="proposal-section space-y-6">
          <SectionHead
            id="titulo-resumo"
            kicker="Em dois minutos"
            title="O essencial da proposta"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {p.summary.map((s, i) => (
              <article
                key={s.label}
                className={`proposal-card rounded-2xl border bg-card p-5 ${i === 1 ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {s.label}
                </p>
                <h3
                  className={`mt-2 font-serif leading-snug text-foreground ${i === 1 ? "text-2xl tabular-nums" : "text-xl"}`}
                >
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 2 · Pergunta de abertura */}
        <section aria-labelledby="titulo-pergunta" className="proposal-section space-y-6">
          <div className="max-w-4xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              A pergunta
            </p>
            <h2
              id="titulo-pergunta"
              className="font-serif text-2xl leading-snug text-foreground sm:text-4xl"
            >
              “{p.opening.question}”
            </h2>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Tag kind="hipotese" /> {p.opening.note}
            </p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            {p.opening.difficulties.map((d, i) => (
              <li
                key={d.title}
                className="proposal-card rounded-2xl border border-border bg-card p-5"
              >
                <span className="font-serif text-2xl text-accent-foreground/70 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-1 text-lg font-semibold text-foreground">{d.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 3 · Por que Instituto e ISG */}
        <section aria-labelledby="titulo-porque" className="proposal-section space-y-6">
          <SectionHead
            id="titulo-porque"
            kicker="Quem faz o quê"
            title="Por que o Instituto e a ISG"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {p.why.parties.map((party) => (
              <article
                key={party.name}
                className="proposal-card rounded-2xl border border-border bg-card p-5"
              >
                {party.name === "VitalOS" ? (
                  <VitalOSBrand variant="horizontal" size="sm" />
                ) : (
                  <h3 className="text-lg font-semibold text-foreground">{party.name}</h3>
                )}
                {party.name === "VitalOS" ? <h3 className="sr-only">VitalOS</h3> : null}
                <p className="mt-2 text-sm font-medium text-primary">{party.role}</p>
                <p className="mt-1 text-sm text-muted-foreground">{party.body}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Tag kind="fato" />
                <span className="text-xs text-muted-foreground">
                  Fonte:{" "}
                  <a
                    href={p.why.affinity.source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    {p.why.affinity.source.label}
                  </a>{" "}
                  · {p.why.affinity.checked}
                </span>
              </div>
              <p className="mt-3 text-base text-foreground">{p.why.affinity.body}</p>
            </div>
            <div className="rounded-2xl border border-accent/50 bg-accent/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Janela
              </p>
              <p className="mt-2 text-base text-foreground">{p.why.window}</p>
            </div>
          </div>
        </section>

        {/* Prova: o que o Instituto já fez e o que a literatura mostra */}
        <TrackSection p={p} />

        {/* Base científica e caso externo */}
        <ScienceSection p={p} />

        {band("faixa-escutar")}

        {/* 4 · Como funciona · caso fictício */}
        <section aria-labelledby="titulo-caso" className="proposal-section space-y-6">
          <SectionHead
            id="titulo-caso"
            kicker="Como funciona"
            title={p.scenario.title}
            intro={p.scenario.context}
          />
          <Tag kind="exemplo" />
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div className="space-y-3">
              <p className="flex gap-2 text-base text-foreground">
                <AlertTriangle aria-hidden className="mt-1 h-4 w-4 shrink-0 proposal-accent-icon" />
                {p.scenario.problem}
              </p>
              <BeforeAfter p={p} />
            </div>
            <HandoverDiagram p={p} />
          </div>
          <ol aria-label="Do ouvir ao devolver, no exemplo" className="grid gap-3 md:grid-cols-4">
            {p.scenario.steps.map((s, i) => (
              <li
                key={s.label}
                className="proposal-card relative rounded-2xl border border-border bg-card p-5"
              >
                <span className="flex items-center justify-between">
                  <span className="proposal-step-num flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {i + 1} de {p.scenario.steps.length}
                  </span>
                </span>
                <h3 className="mt-3 font-semibold text-foreground">{s.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                <p className="mt-2 text-xs text-foreground">
                  <span className="font-semibold">Fica registrado: </span>
                  {s.record}
                </p>
                {i < p.scenario.steps.length - 1 ? (
                  <ArrowRight
                    aria-hidden
                    className="proposal-step-arrow absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-background text-primary md:block"
                  />
                ) : null}
              </li>
            ))}
          </ol>
          <div className="grid gap-4 lg:grid-cols-2">
            <figure className="proposal-card rounded-2xl border border-dashed border-primary/40 bg-card p-5">
              <figcaption className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">Registro de execução</span>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Exemplo fictício · não é captura de cliente
                </span>
              </figcaption>
              <dl className="mt-3 divide-y divide-border text-sm">
                {p.scenario.record.map((r) => (
                  <div key={r.field} className="grid grid-cols-[7rem_1fr] gap-3 py-2">
                    <dt className="text-muted-foreground">{r.field}</dt>
                    <dd
                      className={`font-medium ${r.field === "Efeito" ? "text-muted-foreground" : "text-foreground"}`}
                    >
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </figure>
            <div className="rounded-2xl border border-border bg-muted/50 p-5">
              <h3 className="text-sm font-semibold text-foreground">
                O que faltaria avaliar para falar em efeito
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {p.scenario.missing.map((m) => (
                  <li key={m} className="flex gap-2">
                    <CircleDashed aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Understand
            label="Entenda o exemplo passo a passo"
            title="Exemplo trabalhado · troca de turno"
            description="Quem faz o quê, o que fica registrado e o que a equipe vê em cada passo."
            variant="button"
          >
            <ScenarioDetail p={p} />
          </Understand>
        </section>

        {/* Matriz IFT: os quatro movimentos em cada etapa (D1, D2) */}
        <IftSection p={p} />

        {band("faixa-agir")}

        {/* 5 · Jornada */}
        <section
          id="jornada"
          aria-labelledby="titulo-jornada"
          className="proposal-section proposal-anchor space-y-6"
        >
          <SectionHead
            id="titulo-jornada"
            kicker="Jornada"
            title="Cinco etapas, cinco marcos"
            intro={p.journey.intro}
          />
          <ol className="proposal-journey grid gap-3 lg:grid-cols-5">
            {p.journey.stages.map((s) => (
              <li
                key={s.id}
                className={`proposal-journey-step ${STAGE_ACCENT[s.id]} rounded-2xl border border-border bg-card p-4`}
              >
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-serif text-2xl text-foreground">{s.code}</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {s.framework.lens}
                  </span>
                </p>
                <p className="mt-1 font-semibold text-foreground">{s.verb}</p>
                <p className="mt-1 text-xs italic text-muted-foreground">
                  “{s.framework.question}”
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{s.deliverable}</p>
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-foreground">
                  <Flag aria-hidden className="h-3.5 w-3.5 proposal-accent-icon" /> Marco de aceite
                </p>
              </li>
            ))}
          </ol>
          <p className="flex gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            <CircleDashed aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {p.journey.sharedCondition}
          </p>
        </section>

        {/* Entregas */}
        <section
          id="entregas"
          aria-labelledby="titulo-entregas"
          className="proposal-section proposal-anchor space-y-6"
        >
          <SectionHead
            id="titulo-entregas"
            kicker="Entregas"
            title="O que está incluído em cada etapa"
            intro="Cada capacidade vem marcada: disponível na plataforma, conduzida pelo Instituto ou condicionada a uma liberação."
          />
          <div className="flex flex-wrap gap-2" aria-label="Legenda">
            <AvailabilityChip value="plataforma" />
            <AvailabilityChip value="instituto" />
            <AvailabilityChip value="condicionada" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {p.journey.stages.map((s) => (
              <article
                key={s.id}
                aria-labelledby={`entrega-${s.id}`}
                className={`proposal-card proposal-stage ${STAGE_ACCENT[s.id]} rounded-2xl border border-border bg-card p-5`}
              >
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 id={`entrega-${s.id}`} className="font-serif text-xl text-foreground">
                    {s.code} · {s.verb}
                  </h3>
                  <span className="text-sm font-semibold text-muted-foreground">
                    Lente: {s.framework.lens}
                  </span>
                </header>
                <p className="mt-2 flex flex-wrap gap-1.5" aria-label="Matriz IFT da etapa">
                  {IFT_ORDER.map((m) => (
                    <IftBadge key={m} m={m} />
                  ))}
                </p>
                <p className="mt-2 text-sm text-foreground">
                  <span className="font-semibold">Entrega: </span>
                  {s.deliverable}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Condição: </span>
                  {s.condition}
                </p>
                <ul className="mt-3 space-y-2">
                  {s.capabilities.map((c) => (
                    <li
                      key={c.label}
                      className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                    >
                      <span className="text-foreground">{c.label}</span>
                      <AvailabilityChip value={c.availability} />
                    </li>
                  ))}
                </ul>
                <div className="mt-4 space-y-2">
                  <Understand
                    label={`Entenda o ${s.code}`}
                    title={`${s.code} · ${s.verb} · ${s.framework.lens}`}
                    description={s.deliverable}
                  >
                    <StageDetail p={p} stage={s} />
                  </Understand>
                  <Details summary={`Como funciona o ${s.code}`}>
                    <div>
                      <h4 className="font-semibold">Participantes</h4>
                      <p className="text-muted-foreground">{s.participants.join(" · ")}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Atividades do Instituto</h4>
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {s.instituteActivities.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold">Critérios de aceite do marco</h4>
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {s.acceptance.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                    {s.capabilities.some((c) => c.decision) ? (
                      <div>
                        <h4 className="font-semibold">Decisão comercial necessária</h4>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                          {s.capabilities
                            .filter((c) => c.decision)
                            .map((c) => (
                              <li key={c.label}>
                                <span className="text-foreground">{c.label}: </span>
                                {c.decision}
                              </li>
                            ))}
                        </ul>
                      </div>
                    ) : null}
                  </Details>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Cronograma de 15 meses */}
        <ScheduleSection p={p} />

        {/* 6 · Como decidir se funcionou */}
        <section aria-labelledby="titulo-indicadores" className="proposal-section space-y-6">
          <SectionHead
            id="titulo-indicadores"
            kicker="Como decidir se funcionou"
            title="Validação operacional, acordada antes de começar"
            intro="Indicadores que a ISG e o Instituto podem combinar e conferir nos registros. Respondem se a implantação aconteceu como desenhado."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {p.indicators.operational.map((k) => (
              <article
                key={k.title}
                className="proposal-card rounded-2xl border border-border bg-card p-5"
              >
                <CheckCircle2 aria-hidden className="h-5 w-5 text-primary" />
                <h3 className="mt-2 font-semibold text-foreground">{k.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{k.body}</p>
              </article>
            ))}
          </div>
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5">
            <h3 className="font-semibold text-foreground">Avaliação de efeito: separada</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.indicators.effect}</p>
          </div>
        </section>

        {band("faixa-consolidar")}

        {/* 7 · Investimento e contrapartida */}
        <section
          id="investimento"
          aria-labelledby="titulo-investimento"
          className="proposal-section proposal-anchor space-y-6"
        >
          <SectionHead
            id="titulo-investimento"
            kicker="Investimento"
            title="Investimento e contribuição, lado a lado"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <article
              aria-labelledby="bloco-investimento"
              className="proposal-card flex flex-col rounded-2xl border border-primary/40 bg-card p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Investimento da ISG
              </p>
              <h3
                id="bloco-investimento"
                className="mt-2 font-serif text-4xl tabular-nums text-foreground"
              >
                {brl(parcel)} <span className="text-2xl">por etapa</span>
              </h3>
              <p className="mt-1 text-sm text-foreground">
                Cada etapa dura {inv.monthsPerStage} meses: equivalente a cerca de{" "}
                <strong className="proposal-accent-text">{brl(monthly)} por mês</strong>. Paga após
                o aceite do marco, sem cobrança mensal.
              </p>
              <p className="proposal-total mt-3 rounded-xl px-4 py-3 text-base text-foreground">
                Total do programa: <strong className="tabular-nums">{brl(inv.total)}</strong> em{" "}
                {inv.installments} parcelas de {brl(parcel)}, uma por marco aceito.
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Tag kind="condicao" /> {inv.scope}
              </p>
              <h4 className="mt-4 text-sm font-semibold text-foreground">Inclui</h4>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {inv.composition.map((c) => (
                  <li key={c} className="flex gap-2">
                    <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {c}
                  </li>
                ))}
              </ul>
              <table className="mt-4 w-full text-sm">
                <caption className="sr-only">Parcelas por marco</caption>
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th scope="col" className="py-1.5 font-medium">
                      Marco
                    </th>
                    <th scope="col" className="py-1.5 text-right font-medium">
                      Parcela
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {p.journey.stages.map((s) => (
                    <tr key={s.id} className="border-b border-border/60">
                      <th scope="row" className="py-1.5 text-left font-normal text-foreground">
                        {s.code} · {s.verb}
                      </th>
                      <td className="py-1.5 text-right tabular-nums text-foreground">
                        {brl(s.installment)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="py-1.5 text-left font-semibold text-foreground">
                      Total
                    </th>
                    <td className="py-1.5 text-right font-semibold tabular-nums text-foreground">
                      {brl(inv.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </article>
            <article
              aria-labelledby="bloco-contrapartida"
              className="proposal-card flex flex-col rounded-2xl border border-accent/60 bg-card p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Contribuição técnica da ISG
              </p>
              <h3
                id="bloco-contrapartida"
                className="mt-2 font-serif text-4xl tabular-nums text-foreground"
              >
                {p.counterpart.hours} horas
              </h3>
              <p className="mt-1 text-sm text-foreground">
                A negociar, com três entregas propostas.
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Tag kind="condicao" /> {p.counterpart.intro}
              </p>
              <ol className="mt-4 space-y-3 text-sm">
                {p.counterpart.deliverables.map((d, i) => (
                  <li key={d.title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/25 text-xs font-semibold text-foreground">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-semibold text-foreground">{d.title}. </span>
                      <span className="text-muted-foreground">{d.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 space-y-2 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                <p>{p.counterpart.caseUse}</p>
                <p>{p.counterpart.externalUse}</p>
              </div>
            </article>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Details summary="Quantidades propostas e termos de pagamento" icon>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {inv.quantities.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {inv.terms.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </Details>
            <Details summary="Condições e limites da proposta" icon>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {p.conditions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Details>
          </div>
        </section>

        {/* Como chegamos a este valor: ponte de valor e colaboração técnica (D16–D18) */}
        <PricingSection p={p} />

        {/* Responsabilidades */}
        <section aria-labelledby="titulo-responsabilidades" className="proposal-section space-y-6">
          <SectionHead
            id="titulo-responsabilidades"
            kicker="Responsabilidades"
            title="O que cada parte faz"
            intro="Esforço interno estimado como proposta, para confirmar na sessão de desenho."
          />
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Responsabilidades e esforço por parte</caption>
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Parte
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Faz
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Esforço
                  </th>
                </tr>
              </thead>
              <tbody>
                {p.responsibilities.map((r) => (
                  <tr key={r.party} className="border-t border-border align-top">
                    <th scope="row" className="px-4 py-3 font-semibold text-foreground">
                      {r.party}
                      {r.group === "isg" ? (
                        <span className="block text-xs font-normal text-muted-foreground">ISG</span>
                      ) : null}
                    </th>
                    <td className="px-4 py-3 text-foreground">{r.does}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.effort}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Details summary="Os três papéis do Instituto e suas entregas" icon>
            <dl className="space-y-3">
              {p.roles.map((r) => (
                <div key={r.title}>
                  <dt className="font-semibold">{r.title}</dt>
                  <dd className="text-muted-foreground">{r.deliverables}</dd>
                </div>
              ))}
            </dl>
          </Details>
        </section>

        {/* Equipe executora */}
        <TeamSection p={p} />

        {/* 8 · Próxima conversa */}
        <section
          id="proxima-conversa"
          aria-labelledby="titulo-proxima"
          className="proposal-section proposal-anchor"
        >
          <div className="proposal-print-invert grid gap-6 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-10 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
                Próxima conversa
              </p>
              <h2
                id="titulo-proxima"
                tabIndex={-1}
                className="rounded-md font-serif text-2xl leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-primary sm:text-4xl"
              >
                {p.nextSession.title}
              </h2>
              <p className="text-base opacity-90">{p.nextSession.goal}</p>
              {p.nextSession.contact ? (
                <a
                  href={p.nextSession.contact.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="proposal-no-print inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
                >
                  <CalendarCheck aria-hidden className="h-4 w-4" />
                  {p.hero.primaryCta}
                </a>
              ) : null}
              <p className="text-base font-semibold">{p.nextSession.howTo}</p>
              <p className="border-l-2 border-primary-foreground/50 pl-3 text-sm opacity-90">
                {p.nextSession.note}
              </p>
            </div>
            <div className="rounded-2xl bg-primary-foreground/10 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Users aria-hidden className="h-4 w-4" />
                Sair da sessão com
              </h3>
              <ol className="mt-3 space-y-2 text-sm">
                {p.nextSession.agenda.map((a, i) => (
                  <li key={a} className="flex gap-3">
                    <span className="tabular-nums opacity-70">{i + 1}.</span>
                    {a}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Fontes */}
        <section aria-labelledby="titulo-fontes" className="proposal-section space-y-4">
          <h2 id="titulo-fontes" className="font-serif text-xl text-foreground">
            Fontes e classificação
          </h2>
          <Details summary="Como cada afirmação desta proposta foi classificada" icon>
            <ul className="space-y-2">
              {p.sources.map((s) => (
                <li
                  key={s.claim}
                  className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
                >
                  <Tag kind={s.kind} />
                  <span>
                    {s.claim}
                    <span className="block text-xs text-muted-foreground">{s.source}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Details>
        </section>

        {/* Camada 2 no papel: todas as janelas "Entenda" saem como anexo na impressão. */}
        <PrintAppendix p={p} />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <InstitutoLogo />
            <span>Plataforma</span>
            <VitalOSBrand variant="horizontal" size="sm" />
          </div>
          <p className="max-w-md">
            Proposta para conversa, não é contrato. {p.version}. A ISG aparece apenas como
            destinatária; nenhuma parceria ou endosso está implícito.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function ProposalPage() {
  const [screen, setScreen] = useState<Screen>("checking");
  const [content, setContent] = useState<ProposalContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback((message?: string) => {
    if (expiry.current) clearTimeout(expiry.current);
    setContent(null);
    setScreen("locked");
    setError(message ?? null);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/proposta", { credentials: "same-origin", cache: "no-store" });
      if (res.status === 503) return setScreen("unavailable");
      if (!res.ok) return lock();
      const body = (await res.json()) as { state: string; deck: ProposalContent; ttlMs: number };
      if (body.state !== "ready") return lock();
      setContent(body.deck);
      if (expiry.current) clearTimeout(expiry.current);
      expiry.current = setTimeout(
        () => lock("A sessão expirou. Informe a senha de novo."),
        body.ttlMs,
      );
    } catch {
      setScreen("error");
    }
  }, [lock]);

  useEffect(() => {
    void load();
    return () => {
      if (expiry.current) clearTimeout(expiry.current);
    };
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const password = input.current?.value ?? "";
    if (input.current) input.current.value = "";
    setBusy(true);
    try {
      const res = await fetch("/api/proposta", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 429) return setScreen("limited");
      if (res.status === 503) return setScreen("unavailable");
      if (!res.ok) {
        lock("Senha não reconhecida. Confira e tente de novo.");
        input.current?.focus();
        return;
      }
      await load();
    } catch {
      setScreen("error");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/proposta", { method: "DELETE", credentials: "same-origin" });
    } finally {
      lock("Você saiu da proposta.");
    }
  };

  if (content) return <ProposalView p={content} onLogout={logout} />;

  return (
    <div className="proposal min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
          <InstitutoLogo />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        {screen === "checking" ? (
          <div role="status" aria-live="polite" className="max-w-md space-y-3">
            <span className="sr-only">Verificando o acesso à proposta…</span>
            <div className="h-8 w-3/4 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          </div>
        ) : null}
        {screen === "locked" ? (
          <section
            aria-labelledby="titulo-acesso"
            className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-6"
          >
            <LockKeyhole aria-hidden className="h-6 w-6 text-primary" />
            <h1 id="titulo-acesso" className="font-serif text-2xl text-foreground">
              Proposta de implantação acompanhada
            </h1>
            <p className="text-sm text-muted-foreground">
              Esta proposta tem circulação restrita. Informe a senha que você recebeu junto com o
              link.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <label
                htmlFor="proposal-password"
                className="block text-sm font-medium text-foreground"
              >
                Senha da proposta
              </label>
              <input
                ref={input}
                id="proposal-password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
                aria-describedby={error ? "proposal-error" : undefined}
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {error ? (
                <p id="proposal-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {busy ? "Verificando…" : "Abrir proposta"}
              </button>
            </form>
          </section>
        ) : null}
        {screen === "unavailable" || screen === "limited" || screen === "error" ? (
          <section
            role="alert"
            className="max-w-md space-y-3 rounded-2xl border border-border bg-card p-6"
          >
            <h1 className="font-serif text-2xl text-foreground">
              {screen === "unavailable"
                ? "Proposta indisponível neste ambiente"
                : screen === "limited"
                  ? "Muitas tentativas"
                  : "Não foi possível confirmar o acesso"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {screen === "unavailable"
                ? "O acesso a esta proposta não está configurado aqui. Nenhum conteúdo foi carregado."
                : screen === "limited"
                  ? "Aguarde um minuto antes de tentar de novo."
                  : "Confira sua conexão e tente de novo."}
            </p>
            {screen !== "unavailable" ? (
              <button
                type="button"
                onClick={() => {
                  setScreen("checking");
                  void load();
                }}
                className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Tentar de novo
              </button>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
