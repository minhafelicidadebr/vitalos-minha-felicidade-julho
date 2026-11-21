// Guia da Jornada · jornada navegável por etapa (Q1–Q5) e perspectiva, guiada pelo caso.
// O conteúdo chega do servidor. A perspectiva muda só o texto; o CTA operacional depende
// do contexto do SERVIDOR (operationalCta) e nunca da perspectiva escolhida.
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, ClipboardCheck, Eye, ShieldCheck, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { GuideCheck, GuideContent, GuideLens, GuidePerspective } from "@/domain/guide/guide-types";
import { effectiveLevel, operationalCta, statusLabel, type GuideServerContext } from "@/lib/guide/guide-entry";

const MODE_LABEL = { atua: "Você atua", acompanha: "Você acompanha", dependencia: "Depende de decisão" } as const;
const HANDOFF_ICON = { leitura: Eye, decisao: ClipboardCheck, acao: Users, retorno: BookOpen } as const;

export function InlineDetail({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1 text-left text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        {label}
      </button>
      <div id={id} hidden={!open} className="mt-1 rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground">
        {children}
      </div>
    </div>
  );
}

export function GuideCheckCard({ check, title }: { check: GuideCheck; title: string }) {
  const [picked, setPicked] = useState<string | null>(null);
  const chosen = check.options.find((o) => o.id === picked);
  return (
    <section aria-labelledby={`check-${check.id}`} className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title} · opcional, sem pontuação</p>
      <fieldset className="mt-2">
        <legend id={`check-${check.id}`} className="font-medium text-foreground">{check.question}</legend>
        <div className="mt-3 grid gap-2">
          {check.options.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={picked === o.id}
              onClick={() => setPicked(o.id)}
              className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${picked === o.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-foreground hover:bg-muted/40"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm text-foreground">
        {chosen ? chosen.feedback : ""}
      </p>
    </section>
  );
}

function StatusChip({ text, solid }: { text: string; solid: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${solid ? "border-primary bg-primary/10 text-primary" : "border-dashed border-muted-foreground/60 text-muted-foreground"}`}>
      {text}
    </span>
  );
}

export interface GuideJourneyProps {
  content: GuideContent;
  context: GuideServerContext | null;
  environment: string;
  stage: GuideLens;
  perspective: GuidePerspective;
  onChange: (next: { stage?: GuideLens; perspective?: GuidePerspective }) => void;
}

export function GuideJourney({ content, context, environment, stage, perspective, onChange }: GuideJourneyProps) {
  const lens = content.lenses.find((l) => l.lens === stage) ?? content.lenses[1]!;
  const cell = lens.matrix[perspective];
  const perspLabel = content.perspectives.find((p) => p.id === perspective)?.label ?? perspective;
  const voiceRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    voiceRef.current?.focus();
    setAnnounce(`Etapa ${lens.lens}. Perspectiva: ${perspLabel}.`);
  }, [stage, perspective, lens.lens, perspLabel]);

  const cta = operationalCta(cell.capability, context);
  const level = cell.capability ? effectiveLevel(cell.capability, environment) : null;

  return (
    <div className="space-y-5">
      <p className="sr-only" aria-live="polite">{announce}</p>

      {/* Barra de navegação: etapa + perspectiva (fixa no celular, uma linha) */}
      <nav aria-label="Mapa da jornada" className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:px-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <ol className="flex flex-1 justify-between gap-1 sm:justify-start" aria-label="Etapas do ano">
            {content.lenses.map((l) => (
              <li key={l.lens} className="shrink-0">
                <button
                  type="button"
                  aria-current={l.lens === stage ? "step" : undefined}
                  onClick={() => onChange({ stage: l.lens })}
                  className={`min-h-11 min-w-11 rounded-lg px-2 text-sm sm:px-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${l.lens === stage ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/60"}`}
                >
                  {l.lens}
                  <span className="sr-only"> · {l.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <label className="flex items-center gap-2 text-sm text-muted-foreground sm:shrink-0">
            <span>Perspectiva</span>
            <select
              value={perspective}
              onChange={(e) => onChange({ perspective: e.target.value as GuidePerspective })}
              className="min-h-11 flex-1 rounded-lg border border-border bg-card px-2 text-sm sm:flex-none text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {content.perspectives.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>
      </nav>

      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{lens.phase} · {lens.instrument}</p>
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">{lens.title}</h2>
        <p className="text-sm text-muted-foreground">{lens.question}</p>
        <p className="pt-1"><StatusChip text={content.caseLabel} solid={false} /></p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Coluna de leitura da perspectiva (vem primeiro no celular) */}
        <section aria-labelledby="guide-voice" className="order-1 space-y-4 rounded-xl border border-border bg-card p-4 lg:order-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip text={MODE_LABEL[cell.mode]} solid={cell.mode === "atua"} />
            <span className="text-xs text-muted-foreground">Perspectiva: {perspLabel}</span>
          </div>
          <h3 id="guide-voice" ref={voiceRef} tabIndex={-1} className="font-serif text-xl text-foreground focus-visible:outline-none">
            {lens.voices[perspective] ?? cell.who}
          </h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-medium text-foreground">{cell.mode === "atua" ? "Sua tarefa" : "Quem atua"}</dt>
              <dd className="text-muted-foreground">{cell.who}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">{cell.mode === "atua" ? "Quem recebe" : "O que você consulta"}</dt>
              <dd className="text-muted-foreground">{cell.receives}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Condição</dt>
              <dd className="text-muted-foreground">{cell.condition}</dd>
            </div>
          </dl>
          {cell.capability ? (
            <p className="text-xs text-muted-foreground">
              Situação neste ambiente: <StatusChip text={statusLabel(level)} solid={level === "ambiente"} />
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {cta ? (
              <a href={cta.href} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {cta.label} <ArrowRight aria-hidden className="h-4 w-4" />
              </a>
            ) : (
              <a href="#guide-scene" className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Ver como funciona nesta etapa
              </a>
            )}
          </div>
          <InlineDetail label="O que fica protegido?">
            <ul className="list-disc space-y-1 pl-5">
              {lens.guardrails.map((g) => <li key={g}>{g}</li>)}
            </ul>
          </InlineDetail>
        </section>

        {/* Caso e passagens */}
        <section id="guide-scene" aria-labelledby="guide-scene-title" className="order-2 space-y-4 lg:order-1">
          <h3 id="guide-scene-title" className="font-medium text-foreground">O caso nesta etapa</h3>
          <ol className="space-y-2 text-sm text-foreground">
            {lens.scene.map((s, i) => (
              <li key={s} className="flex gap-2"><span aria-hidden className="mt-0.5 text-xs font-semibold text-primary">{i + 1}</span><span>{s}</span></li>
            ))}
          </ol>
          {lens.lens === "Q2" ? <Handoffs content={content} perspective={perspective} /> : null}
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Ler o caso inteiro, do Q1 ao Q5
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[85dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>O caso inteiro</DialogTitle>
                <DialogDescription>{content.caseLabel}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                {content.lenses.map((l) => (
                  <section key={l.lens}>
                    <h4 className="font-medium text-foreground">{l.title}</h4>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">{l.scene.map((s) => <li key={s}>{s}</li>)}</ul>
                  </section>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </section>
      </div>

      {lens.lens === "Q2" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Exemplo resolvido</p>
            <p className="mt-2 text-foreground">{content.resolvedExample}</p>
          </section>
          <GuideCheckCard check={content.checks[0]!} title="Checagem" />
        </div>
      ) : null}

      {lens.lens === "Q5" ? <Q5Extract content={content} /> : null}

      <InlineDetail label="Três mapas: lente, ciclo e perspectiva">
        <ul className="space-y-1">
          <li>{content.maps.lenses}</li>
          <li>{content.maps.cycle}</li>
          <li>{content.maps.perspectives}</li>
          <li className="text-muted-foreground">{content.maps.scene}</li>
          <li className="text-muted-foreground">{content.maps.ivoDefinition}</li>
        </ul>
      </InlineDetail>

      <footer className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <p>{content.whatNext}</p>
        <p>{content.readingNotice}</p>
      </footer>
    </div>
  );
}

function Handoffs({ content, perspective }: { content: GuideContent; perspective: GuidePerspective }) {
  return (
    <section aria-labelledby="handoffs-title" className="rounded-xl border border-border bg-card p-3">
      <h4 id="handoffs-title" className="text-sm font-medium text-foreground">Passagens de responsabilidade</h4>
      <ol className="mt-2 grid gap-2 sm:grid-cols-4">
        {content.handoffs.map((h, i) => {
          const Icon = HANDOFF_ICON[h.id as keyof typeof HANDOFF_ICON] ?? Eye;
          const mine = h.perspective === perspective;
          return (
            <li key={h.id} className={`rounded-lg p-2 text-sm ${mine ? "border-2 border-primary bg-primary/5" : "border border-border"}`}>
              <p className="flex items-center gap-1 font-medium text-foreground">
                <Icon aria-hidden className="h-4 w-4 text-primary" />
                <span>{i + 1}. {h.verb}</span>
              </p>
              <p className="text-xs text-muted-foreground">{h.owner}{mine ? " · você" : ""}</p>
              <InlineDetail label="Que evidência fica?">{h.evidence}</InlineDetail>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Q5Extract({ content }: { content: GuideContent }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section aria-labelledby="q5-extract" className="rounded-xl border border-border bg-card p-4">
        <h3 id="q5-extract" className="font-medium text-foreground">Extrato do relatório · o caso da troca de turno</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Tipos de informação no relatório e sua origem</caption>
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-3">Tipo</th>
                <th scope="col" className="py-2 pr-3">Trecho</th>
                <th scope="col" className="py-2">Origem</th>
              </tr>
            </thead>
            <tbody>
              {content.q5Extract.rows.map((r) => (
                <tr key={r.kind} className="border-b border-border/60 align-top">
                  <th scope="row" className="py-2 pr-3 font-medium text-foreground">{r.kind}</th>
                  <td className="py-2 pr-3 text-foreground">{r.text}</td>
                  <td className="py-2 text-muted-foreground">{r.origin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex items-start gap-1 text-xs text-muted-foreground"><ShieldCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />{content.q5Extract.note}</p>
      </section>
      <GuideCheckCard check={content.checks[1]!} title="Checagem" />
    </div>
  );
}
