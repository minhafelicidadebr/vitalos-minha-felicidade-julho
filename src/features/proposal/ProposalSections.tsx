// Blocos da V2 da proposta: números do Instituto, literatura, ciência, caso externo, faixas com
// ilustração, cronograma de 15 meses e equipe. Conteúdo sempre vindo do servidor (fonte única).
import {
  BookOpen,
  CircleDashed,
  Compass,
  ExternalLink,
  Flag,
  Heart,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { BAND_IMAGES, ILLUSTRATION, TEAM_PHOTOS } from "./media";
import { useCountUp } from "./motion";
import type {
  ProposalBand,
  ProposalContent,
  ProposalMetric,
  ScienceAnchor,
  ScienceIcon,
} from "./types";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function MetricValue({
  metric,
  className = "",
}: {
  metric: ProposalMetric;
  className?: string;
}) {
  const [shown, ref] = useCountUp(metric.value);
  const full = `${metric.prefix ?? ""}${fmt(metric.value)}${metric.suffix ?? ""}`;
  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {metric.prefix}
        {fmt(shown)}
        {metric.suffix}
      </span>
      <span className="sr-only">{full}</span>
    </span>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="proposal-kicker text-xs font-semibold uppercase tracking-[0.16em]">{children}</p>
  );
}

function EmptyBlock({ title }: { title: string }) {
  return (
    <div
      role="note"
      className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground"
    >
      {title}: conteúdo indisponível no momento. Nenhum número é exibido sem registro aprovado.
    </div>
  );
}

export function TrackSection({ p }: { p: ProposalContent }) {
  const t = p.track;
  const lit = p.literature;
  return (
    <section
      id="numeros"
      aria-labelledby="titulo-numeros"
      className="proposal-section proposal-anchor proposal-reveal space-y-8"
    >
      <header className="max-w-3xl space-y-2">
        <Kicker>Prova</Kicker>
        <h2
          id="titulo-numeros"
          className="font-serif text-2xl leading-tight text-foreground sm:text-3xl"
        >
          {t?.title ?? "O que o Instituto já fez"}
        </h2>
        {t ? <p className="text-base text-muted-foreground">{t.intro}</p> : null}
      </header>
      {t ? (
        <div className="proposal-track rounded-3xl p-6 sm:p-8">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.items.map((m) => (
              <li key={m.label} className="border-l-4 pl-4 proposal-track-item">
                <MetricValue
                  metric={m}
                  className="block font-serif text-4xl leading-none text-foreground sm:text-5xl"
                />
                <span className="mt-2 block text-sm font-semibold text-foreground">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.detail}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex gap-2 text-sm text-foreground">
            <Flag aria-hidden className="mt-0.5 h-4 w-4 shrink-0 proposal-accent-icon" />
            {t.record}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t.source} {t.scope}
          </p>
        </div>
      ) : (
        <EmptyBlock title="Números do Instituto" />
      )}
      <div className="space-y-4">
        <h3 className="font-serif text-xl text-foreground">
          {lit?.title ?? "O que a literatura mostra"}
        </h3>
        {lit ? (
          <>
            <p className="max-w-3xl text-sm text-muted-foreground">{lit.intro}</p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {lit.items.map((m) => (
                <li
                  key={m.label}
                  className="proposal-card rounded-2xl border border-border bg-card p-5"
                >
                  <MetricValue
                    metric={m}
                    className="block font-serif text-4xl leading-none proposal-accent-text"
                  />
                  <span className="mt-2 block text-sm font-semibold text-foreground">
                    {m.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">{m.detail}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{lit.note}</p>
          </>
        ) : (
          <EmptyBlock title="Literatura" />
        )}
      </div>
    </section>
  );
}

const ICONS: Record<ScienceIcon, typeof BookOpen> = {
  book: BookOpen,
  heart: Heart,
  compass: Compass,
  sun: Sun,
  shield: ShieldCheck,
};

function AnchorCard({ a }: { a: ScienceAnchor }) {
  const Icon = ICONS[a.icon];
  return (
    <li
      className={`proposal-card proposal-anchor-card proposal-anchor-${a.status} flex flex-col rounded-2xl border bg-card p-5`}
    >
      <span
        aria-hidden
        className="proposal-icon-badge flex h-10 w-10 items-center justify-center rounded-full"
      >
        <Icon className="h-5 w-5" />
      </span>
      <h4 className="mt-3 font-semibold text-foreground">{a.name}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{a.what}</p>
      <p className="mt-2 text-sm text-foreground">{a.inProposal}</p>
      <div className="mt-auto pt-3">
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${a.status === "condicionado" ? "border-dashed border-muted-foreground/70 text-muted-foreground" : "proposal-status"}`}
        >
          {a.status === "condicionado" ? (
            <CircleDashed aria-hidden className="h-3.5 w-3.5" />
          ) : null}
          {a.statusLabel}
        </span>
      </div>
    </li>
  );
}

export function ScienceSection({ p }: { p: ProposalContent }) {
  const s = p.science;
  const c = p.externalCase;
  return (
    <section
      id="ciencia"
      aria-labelledby="titulo-ciencia"
      className="proposal-section proposal-anchor proposal-reveal space-y-8"
    >
      <header className="max-w-3xl space-y-2">
        <Kicker>Base científica</Kicker>
        <h2
          id="titulo-ciencia"
          className="font-serif text-2xl leading-tight text-foreground sm:text-3xl"
        >
          {s.title}
        </h2>
        <p className="text-base text-muted-foreground">{s.intro}</p>
      </header>
      {s.playbook ? (
        <figure className="proposal-playbook grid gap-6 rounded-3xl p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="text-center lg:pr-8 lg:text-left">
            <p className="font-serif text-6xl leading-none tabular-nums proposal-on-dark-accent">
              +{fmt(s.playbook.studies)}
            </p>
            <p className="mt-2 text-sm font-semibold">estudos revisados</p>
            <p className="text-xs opacity-80">{s.playbook.edition}</p>
          </div>
          <div className="space-y-3">
            <blockquote className="font-serif text-xl leading-snug sm:text-2xl">
              {s.playbook.statement}
            </blockquote>
            <p className="text-sm opacity-90">{s.playbook.detail}</p>
            <figcaption className="text-xs opacity-80">
              {s.playbook.attribution}{" "}
              <a
                href={s.playbook.source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                {s.playbook.source.label}
                <ExternalLink aria-hidden className="h-3 w-3" />
              </a>
            </figcaption>
          </div>
        </figure>
      ) : (
        <EmptyBlock title="Playbook" />
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {s.anchors.map((a) => (
          <AnchorCard key={a.id} a={a} />
        ))}
      </ul>
      <p className="max-w-3xl border-l-4 pl-4 text-base text-foreground proposal-principle">
        {s.principle}
      </p>
      <article
        aria-labelledby="titulo-caso-externo"
        className="proposal-card grid gap-4 rounded-2xl border border-border bg-card p-6 lg:grid-cols-[1fr_1.2fr]"
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Caso externo
          </p>
          <h3 id="titulo-caso-externo" className="font-serif text-xl text-foreground">
            {c.title}
          </h3>
          <p className="text-sm text-muted-foreground">{c.summary}</p>
        </div>
        <div className="space-y-3">
          <dl className="grid gap-3 sm:grid-cols-3">
            {c.practices.map((pr) => (
              <div key={pr.label} className="rounded-xl bg-muted/50 p-3">
                <dt className="text-sm font-semibold text-foreground">{pr.label}</dt>
                <dd className="text-xs text-muted-foreground">{pr.body}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">{c.note}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {c.sources.map((src) => (
              <li key={src.href}>
                <a
                  href={src.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-6 items-center gap-1 font-medium text-primary underline underline-offset-2"
                >
                  {src.label}
                  <ExternalLink aria-hidden className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </section>
  );
}

export function ImageBand({ band, caption }: { band: ProposalBand; caption: string }) {
  return (
    <section
      aria-labelledby={`titulo-${band.id}`}
      className="proposal-band proposal-reveal relative overflow-hidden rounded-3xl"
    >
      <img
        src={BAND_IMAGES[band.image]}
        width={ILLUSTRATION.width}
        height={ILLUSTRATION.height}
        alt={band.imageAlt}
        loading="lazy"
        decoding="async"
        className="proposal-band-image absolute inset-0 h-full w-full object-cover"
      />
      <div className="proposal-band-scrim relative flex min-h-[22rem] flex-col justify-end p-6 sm:min-h-[26rem] sm:p-10 lg:max-w-[62%] lg:justify-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
          {band.kicker}
        </p>
        <h2
          id={`titulo-${band.id}`}
          className="mt-2 font-serif text-2xl leading-tight text-white sm:text-4xl"
        >
          {band.title}
        </h2>
        <p className="mt-3 max-w-xl text-base text-white/90">{band.summary}</p>
      </div>
      <span className="absolute right-3 top-3 rounded-full bg-black/75 px-3 py-1 text-xs text-white">
        {caption}
      </span>
    </section>
  );
}

const STAGE_TOKEN = ["q1", "q2", "q3", "q4", "q5"] as const;

export function ScheduleSection({ p }: { p: ProposalContent }) {
  const sc = p.schedule;
  const stages = p.journey.stages;
  return (
    <section
      id="cronograma"
      aria-labelledby="titulo-cronograma"
      className="proposal-section proposal-anchor proposal-reveal space-y-6"
    >
      <header className="max-w-3xl space-y-2">
        <Kicker>Cronograma</Kicker>
        <h2
          id="titulo-cronograma"
          className="font-serif text-2xl leading-tight text-foreground sm:text-3xl"
        >
          {sc.title}
        </h2>
        <p className="text-base text-muted-foreground">{sc.intro}</p>
      </header>
      {/* Visão geral: decorativa (a lista abaixo carrega toda a informação). */}
      <div aria-hidden="true" className="proposal-timeline hidden sm:block">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${stages.length * sc.monthsPerStage}, minmax(0, 1fr))`,
          }}
        >
          {sc.stages.flatMap((st) =>
            st.months.map((m) => (
              <div
                key={m.label}
                className={`proposal-timeline-cell proposal-stage-${st.id} ${m.conditioned ? "is-conditioned" : ""}`}
              >
                <span className="text-[0.7rem] font-medium tabular-nums">
                  {m.label.replace("Mês ", "")}
                </span>
              </div>
            )),
          )}
        </div>
        <div
          className="mt-2 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
        >
          {stages.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between text-xs font-semibold text-foreground"
            >
              <span>
                {s.code} · {s.verb}
              </span>
              <Flag className="h-3.5 w-3.5 proposal-accent-icon" />
            </div>
          ))}
        </div>
      </div>
      <ol className="grid gap-4 lg:grid-cols-5">
        {sc.stages.map((st, i) => {
          const stage = stages.find((s) => s.id === st.id)!;
          return (
            <li
              key={st.id}
              className={`proposal-card proposal-schedule-stage proposal-stage-${STAGE_TOKEN[i]} rounded-2xl border border-border bg-card p-4`}
            >
              <h3 className="font-serif text-lg text-foreground">
                {stage.code} · {stage.verb}
              </h3>
              <ol className="mt-3 space-y-3">
                {st.months.map((m) => (
                  <li key={m.label} className="proposal-month">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {m.label} · <span className="text-foreground">{m.focus}</span>
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                      {m.activities.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                    {m.conditioned ? (
                      <p className="mt-1 flex gap-1.5 rounded-md border border-dashed border-muted-foreground/60 px-2 py-1 text-xs text-muted-foreground">
                        <CircleDashed aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          <span className="sr-only">Condicionado: </span>
                          {m.conditioned}
                        </span>
                      </p>
                    ) : null}
                    {m.milestone ? (
                      <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Flag aria-hidden className="h-4 w-4 proposal-accent-icon" />
                        <span>
                          {m.milestone} ·{" "}
                          <span className="whitespace-nowrap">{fmtBRL(stage.installment)}</span>
                        </span>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">{sc.note}</p>
    </section>
  );
}

const fmtBRL = (v: number) => "R$ " + fmt(v);

export function TeamSection({ p }: { p: ProposalContent }) {
  const t = p.team;
  return (
    <section
      id="equipe"
      aria-labelledby="titulo-equipe"
      className="proposal-section proposal-anchor proposal-reveal space-y-6"
    >
      <header className="max-w-3xl space-y-2">
        <Kicker>Equipe</Kicker>
        <h2
          id="titulo-equipe"
          className="font-serif text-2xl leading-tight text-foreground sm:text-3xl"
        >
          {t.title}
        </h2>
        <p className="text-base text-muted-foreground">{t.intro}</p>
      </header>
      <ul className="grid gap-4 md:grid-cols-3">
        {t.members.map((m) => (
          <li
            key={m.name}
            className="proposal-card flex flex-col rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center gap-4">
              <img
                src={TEAM_PHOTOS[m.photo]}
                width={360}
                height={360}
                alt={`Retrato de ${m.name}`}
                loading="lazy"
                decoding="async"
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-offset-2 ring-offset-card proposal-photo-ring"
              />
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug text-foreground">{m.name}</h3>
                <p className="text-sm proposal-accent-text">{m.label}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{m.bio}</p>
            <p className="mt-auto pt-4 text-xs font-semibold uppercase tracking-[0.1em] text-foreground">
              {m.role}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{t.note}</p>
    </section>
  );
}
