// Guia da Jornada · jornada navegável por etapa (Q1–Q5) e perspectiva, guiada pelo caso.
// O conteúdo chega do servidor. A perspectiva muda só o texto; o CTA operacional depende
// do contexto do SERVIDOR (operationalCta) e nunca da perspectiva escolhida.
// Design informacional: docs/vitalos/guia/SUPERPROMPT_DESIGN_INFORMACIONAL_GUIA.md.
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Compass,
  Eye,
  FlaskConical,
  Inbox,
  KeyRound,
  ListChecks,
  Map as MapIcon,
  RefreshCw,
  Scale,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  UsersRound,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { CyclePhase, GuideCheck, GuideContent, GuideLens, GuideLensContent, GuidePerspective, IvoPerspective } from "@/domain/guide/guide-types";
import { effectiveLevel, operationalCta, statusLabel, type GuideServerContext } from "@/lib/guide/guide-entry";

const MODE_LABEL = { atua: "Você atua", acompanha: "Você acompanha", dependencia: "Depende de decisão" } as const;
const HANDOFF_ICON = { leitura: Eye, decisao: ClipboardCheck, acao: Users, retorno: BookOpen } as const;
const PHASES: CyclePhase[] = ["Mensurar", "Educar", "Transformar", "Evoluir"];
const IVO: { id: IvoPerspective; label: string; icon: typeof User }[] = [
  { id: "eu", label: "EU", icon: User },
  { id: "nos", label: "NÓS", icon: UsersRound },
  { id: "lideranca", label: "LIDERANÇA", icon: Compass },
  { id: "organizacao", label: "ORGANIZAÇÃO", icon: Building2 },
];
const Q5_STYLE: Record<string, { icon: typeof User; border: string }> = {
  "Execução registrada": { icon: CheckCircle2, border: "border-l-4 border-l-primary" },
  "Decisão documentada": { icon: Scale, border: "border-l-4 border-l-accent" },
  "Mudança observada": { icon: TrendingUp, border: "border-l-4 border-dashed border-l-muted-foreground" },
  "Efeito avaliado": { icon: FlaskConical, border: "border-l-4 border-dotted border-l-muted-foreground" },
};

export function InlineDetail({ label, children, icon: Icon }: { label: string; children: React.ReactNode; icon?: typeof User }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1.5 text-left text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {Icon ? <Icon aria-hidden className="h-4 w-4 shrink-0" /> : null}
        {label}
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={id} hidden={!open} className="mt-1 rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
        {children}
      </div>
    </div>
  );
}

export function GuideCheckCard({ check, title }: { check: GuideCheck; title: string }) {
  const [picked, setPicked] = useState<string | null>(null);
  const chosen = check.options.find((o) => o.id === picked);
  const right = chosen?.id === check.correctOptionId;
  return (
    <section aria-labelledby={`check-${check.id}`} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <ListChecks aria-hidden className="h-3.5 w-3.5" /> {title} · opcional, sem pontuação
      </p>
      <fieldset className="mt-2">
        <legend id={`check-${check.id}`} className="font-medium text-foreground">{check.question}</legend>
        <div className="mt-3 grid gap-2">
          {check.options.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={picked === o.id}
              onClick={() => setPicked(o.id)}
              className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${picked === o.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-foreground hover:bg-muted/40"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <p role="status" aria-live="polite" className={`mt-3 min-h-6 rounded-lg text-sm ${chosen ? `p-3 ${right ? "bg-primary/10 text-foreground" : "bg-muted/50 text-foreground"}` : ""}`}>
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

/** Mapa 1, 2 e 3 lado a lado: onde o leitor está, antes do conteúdo. */
function OrientationMaps({ content, lens, perspectiveLabel }: { content: GuideContent; lens: GuideLensContent; perspectiveLabel: string }) {
  const phaseIndex = PHASES.indexOf(lens.cyclePhase);
  return (
    <section aria-labelledby="orientation-title" className="rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="orientation-title" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <MapIcon aria-hidden className="h-4 w-4 text-primary" /> Onde você está
        </h3>
        <span className="text-xs text-muted-foreground">Lendo como: <strong className="font-medium text-foreground">{perspectiveLabel}</strong></span>
      </div>
      {/* Celular: resumo de uma linha; os cartões completos ficam do tablet em diante. */}
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center md:hidden">
        <div className="rounded-lg border border-border bg-card px-1 py-1.5">
          <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Lente</dt>
          <dd className="text-sm font-semibold text-foreground">{lens.lens}</dd>
        </div>
        <div className="rounded-lg border border-border bg-card px-1 py-1.5">
          <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Fase</dt>
          <dd className="text-xs font-semibold text-foreground [overflow-wrap:anywhere]">{lens.cyclePhase}</dd>
        </div>
        <div className="rounded-lg border border-border bg-card px-1 py-1.5">
          <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Olhares</dt>
          <dd className="text-[10px] font-semibold leading-tight text-foreground [overflow-wrap:anywhere]">
            {lens.ivoScene ? IVO.filter((p) => lens.ivoScene?.[p.id]).map((p) => <span key={p.id} className="block">{p.label}</span>) : "—"}
          </dd>
        </div>
      </dl>
      <div className="mt-3 hidden gap-3 md:grid md:grid-cols-3">
        {/* Mapa 1 · trilha das lentes */}
        <article aria-labelledby="map-lens" className="rounded-xl border border-border bg-card p-3">
          <p id="map-lens" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Compass aria-hidden className="h-3.5 w-3.5" /> Lente do ano
          </p>
          <ol className="mt-2 flex items-center justify-between gap-1" aria-label="Lentes Q1 a Q5">
            {content.lenses.map((l, i) => {
              const current = l.lens === lens.lens;
              return (
                <li key={l.lens} className="flex flex-1 items-center gap-1">
                  <span
                    aria-current={current ? "step" : undefined}
                    className={`flex h-8 min-w-8 items-center justify-center rounded-full border text-xs font-semibold ${current ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
                  >
                    {l.lens}
                  </span>
                  {i < content.lenses.length - 1 ? <span aria-hidden className="h-px flex-1 bg-border" /> : null}
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-sm text-foreground">{lens.title.replace(/^Q\d · /, "")}</p>
        </article>

        {/* Mapa 2 · ciclo de trabalho */}
        <article aria-labelledby="map-cycle" className="rounded-xl border border-border bg-card p-3">
          <p id="map-cycle" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <RefreshCw aria-hidden className="h-3.5 w-3.5" /> Fase do ciclo
          </p>
          <ol className="mt-2 grid grid-cols-4 gap-1" aria-label="Ciclo de trabalho">
            {PHASES.map((p, i) => {
              const current = i === phaseIndex;
              return (
                <li key={p} aria-current={current ? "step" : undefined} className="text-center">
                  <span aria-hidden className={`mx-auto block h-1.5 rounded-full ${current ? "bg-primary" : i < phaseIndex ? "bg-primary/40" : "bg-border"}`} />
                  <span className={`mt-1 block text-[11px] leading-tight ${current ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{p}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-sm text-foreground">O caso está em <strong>{lens.cyclePhase}</strong>.</p>
        </article>

        {/* Mapa 3 · perspectivas do IVO na cena */}
        <article aria-labelledby="map-ivo" className="rounded-xl border border-border bg-card p-3">
          <p id="map-ivo" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Eye aria-hidden className="h-3.5 w-3.5" /> Olhares do IVO na cena
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1.5">
            {IVO.map((p) => {
              const note = lens.ivoScene?.[p.id];
              const Icon = p.icon;
              return (
                <li
                  key={p.id}
                  title={note}
                  className={`flex min-h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold ${note ? "border-primary bg-primary/10 text-foreground" : "border-dashed border-border text-muted-foreground"}`}
                >
                  <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
                  <span>{p.label}</span>
                  <span className="sr-only">{note ? `: ${note}` : ": não aparece nesta cena"}</span>
                </li>
              );
            })}
          </ul>
          {lens.ivoScene ? (
            <ul aria-hidden className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {IVO.filter((p) => lens.ivoScene?.[p.id]).map((p) => (
                <li key={p.id}><strong className="font-semibold text-foreground">{p.label}</strong> · {lens.ivoScene?.[p.id]}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Esta cena não destaca um olhar específico.</p>
          )}
        </article>
      </div>
      <div className="mt-2">
        <InlineDetail label="Como ler os três mapas" icon={BookOpen}>
          <dl className="grid gap-2 sm:grid-cols-3">
            <div><dt className="font-medium">Lente do ano</dt><dd className="text-muted-foreground">Em que momento do ano estamos: Q1 a Q4 e a síntese anual (Q5).</dd></div>
            <div><dt className="font-medium">Fase do ciclo</dt><dd className="text-muted-foreground">O que fazemos com o que aprendemos: Mensurar → Educar → Transformar → Evoluir.</dd></div>
            <div><dt className="font-medium">Olhares do IVO</dt><dd className="text-muted-foreground">De onde olhamos: EU, NÓS, LIDERANÇA, ORGANIZAÇÃO. São olhares de leitura, não papéis de acesso.</dd></div>
          </dl>
          {lens.ivoScene ? (
            <ul className="mt-3 space-y-1 border-t border-border pt-2">
              {IVO.filter((p) => lens.ivoScene?.[p.id]).map((p) => (
                <li key={p.id}><strong>{p.label}:</strong> {lens.ivoScene?.[p.id]}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 border-t border-border pt-2 text-muted-foreground"><dfn className="font-medium not-italic text-foreground">IVO</dfn>: {content.maps.ivoDefinition.replace(/^IVO, /, "")}</p>
        </InlineDetail>
      </div>
    </section>
  );
}

function SceneTimeline({ lens, perspective }: { lens: GuideLensContent; perspective?: GuidePerspective }) {
  const owner = perspective === "rh" ? "RH" : perspective === "lideranca" ? "Liderança" : undefined;
  const followsReturn = perspective === "colaborador" || perspective === "sst";
  return (
    <ol className="relative space-y-3 border-l-2 border-border pl-5">
      {lens.scene.map((s, i) => {
        const roleLabel = lens.lens === "Q2"
          ? owner === s.who ? "Sua atuação" : followsReturn && s.label === "Devolutiva coletiva" ? "Você acompanha" : null
          : null;
        return (
        <li key={s.label} className={`relative rounded-xl p-2 transition-colors motion-reduce:transition-none ${roleLabel ? "bg-primary/10 ring-1 ring-primary/40" : ""}`}>
          <span aria-hidden className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-background text-[11px] font-bold text-primary">
            {i + 1}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">{s.label}</h4>
            {roleLabel ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{roleLabel}</span> : null}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">{s.who}</span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{s.text}</p>
        </li>
        );
      })}
    </ol>
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
    setAnnounce(`Etapa ${lens.lens}, fase ${lens.cyclePhase}. Perspectiva: ${perspLabel}.`);
  }, [stage, perspective, lens.lens, lens.cyclePhase, perspLabel]);

  const cta = operationalCta(cell.capability, context);
  const level = cell.capability ? effectiveLevel(cell.capability, environment) : null;
  const acts = cell.mode === "atua";

  return (
    <div className="space-y-5">
      <p className="sr-only" aria-live="polite">{announce}</p>

      {/* Barra de navegação: etapa + perspectiva (fixa no celular) */}
      <nav aria-label="Mapa da jornada" className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:px-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <ol className="flex flex-1 justify-between gap-1 sm:justify-start" aria-label="Etapas do ano">
            {content.lenses.map((l) => (
              <li key={l.lens} className="shrink-0">
                <button
                  type="button"
                  aria-current={l.lens === stage ? "step" : undefined}
                  onClick={() => onChange({ stage: l.lens })}
                  className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 ${l.lens === stage ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/60"}`}
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
              className="min-h-11 flex-1 rounded-lg border border-border bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none"
            >
              {content.perspectives.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>
      </nav>

      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{lens.instrument}</p>
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">{lens.title}</h2>
        <p className="text-sm text-muted-foreground">{lens.question}</p>
        <p className="pt-1"><StatusChip text={content.caseLabel} solid={false} /></p>
      </header>

      <OrientationMaps content={content} lens={lens} perspectiveLabel={perspLabel} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {/* Leitura da perspectiva (vem primeiro no celular) */}
        <section aria-labelledby="guide-voice" className="order-1 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5 lg:order-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip text={MODE_LABEL[cell.mode]} solid={acts} />
            <span className="text-xs text-muted-foreground">Perspectiva: {perspLabel}</span>
          </div>
          <h3 id="guide-voice" ref={voiceRef} tabIndex={-1} className="font-serif text-xl leading-snug text-foreground focus-visible:outline-none">
            {lens.voices[perspective] ?? cell.who}
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { icon: acts ? ClipboardCheck : Users, title: acts ? "Sua tarefa" : "Quem atua", text: cell.who },
              { icon: Inbox, title: acts ? "Quem recebe" : "O que você consulta", text: cell.receives },
              { icon: KeyRound, title: "Condição", text: cell.condition },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border border-border bg-background p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Icon aria-hidden className="h-4 w-4 text-primary" /> {title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
          {cell.capability ? (
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              Situação neste ambiente: <StatusChip text={statusLabel(level)} solid={level === "ambiente"} />
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {cta ? (
              <a href={cta.href} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {cta.label} <ArrowRight aria-hidden className="h-4 w-4" />
              </a>
            ) : (
              <a href="#guide-scene" className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Ver como funciona nesta etapa
              </a>
            )}
          </div>
          <InlineDetail label="O que fica protegido?" icon={ShieldCheck}>
            <ul className="space-y-1.5">
              {lens.guardrails.map((g) => (
                <li key={g} className="flex gap-2"><ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{g}</span></li>
              ))}
            </ul>
          </InlineDetail>
        </section>

        {/* Caso e passagens */}
        <section id="guide-scene" aria-labelledby="guide-scene-title" className="order-2 space-y-4 lg:order-1">
            <h3 id="guide-scene-title" className="font-semibold text-foreground">Fluxo compartilhado</h3>
            <SceneTimeline lens={lens} perspective={perspective} />
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <BookOpen aria-hidden className="h-4 w-4" /> Ler o caso inteiro, do Q1 ao Q5
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[85dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>O caso inteiro</DialogTitle>
                <DialogDescription>{content.caseLabel}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 text-sm">
                {content.lenses.map((l) => (
                  <section key={l.lens} className="space-y-2">
                    <h4 className="font-medium text-foreground">{l.title} <span className="text-xs font-normal text-muted-foreground">· {l.cyclePhase}</span></h4>
                    <SceneTimeline lens={l} />
                  </section>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </section>
      </div>

      {lens.lens === "Q2" ? <Handoffs content={content} perspective={perspective} /> : null}

      {lens.lens === "Q2" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border border-l-4 border-l-accent bg-muted/20 p-4 text-sm">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground"><Scale aria-hidden className="h-3.5 w-3.5" /> Exemplo resolvido</p>
            <p className="mt-2 text-foreground">{content.resolvedExample}</p>
          </section>
          <GuideCheckCard check={content.checks[0]!} title="Checagem" />
        </div>
      ) : null}

      {lens.lens === "Q5" ? <Q5Extract content={content} /> : null}

      <footer className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <p>{content.whatNext}</p>
        <p>{content.readingNotice}</p>
      </footer>
    </div>
  );
}

function Handoffs({ content, perspective }: { content: GuideContent; perspective: GuidePerspective }) {
  return (
    <section aria-labelledby="handoffs-title" className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <h4 id="handoffs-title" className="text-sm font-semibold text-foreground">Passagens de responsabilidade</h4>
      <ol className="mt-3 flex flex-col gap-1 md:flex-row md:items-stretch">
        {content.handoffs.map((h, i) => {
          const Icon = HANDOFF_ICON[h.id as keyof typeof HANDOFF_ICON] ?? Eye;
          const mine = h.perspective === perspective;
          const last = i === content.handoffs.length - 1;
          return (
            <li key={h.id} className="flex flex-col items-stretch gap-1 md:flex-1 md:flex-row md:items-center">
              <div className={`flex-1 rounded-xl p-2.5 text-sm ${mine ? "border-2 border-primary bg-primary/5" : "border border-border"}`}>
                <p className="flex items-center gap-1.5 font-medium text-foreground">
                  <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10"><Icon className="h-3.5 w-3.5 text-primary" /></span>
                  <span>{i + 1}. {h.verb}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{h.owner}{mine ? " · você" : ""}</p>
                <InlineDetail label="Que evidência fica?">{h.evidence}</InlineDetail>
              </div>
              {!last ? (
                <>
                  <ArrowRight aria-hidden className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block" />
                  <ArrowDown aria-hidden className="mx-auto h-4 w-4 shrink-0 text-muted-foreground md:hidden" />
                </>
              ) : null}
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
      <section aria-labelledby="q5-extract" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 id="q5-extract" className="font-semibold text-foreground">Extrato do relatório · o caso da troca de turno</h3>
        <p className="mt-1 text-xs text-muted-foreground">Quatro tipos de informação, cada um com sua origem. Um não substitui o outro.</p>
        <ul aria-hidden className="mt-3 grid gap-2 sm:grid-cols-2">
          {content.q5Extract.rows.map((r) => {
            const s = Q5_STYLE[r.kind] ?? { icon: CheckCircle2, border: "" };
            const Icon = s.icon;
            return (
              <li key={r.kind} className={`rounded-xl border border-border bg-background p-3 ${s.border}`}>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground"><Icon className="h-4 w-4 text-primary" /> {r.kind}</p>
                <p className="mt-1 text-sm text-foreground">{r.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">Origem: {r.origin}</p>
              </li>
            );
          })}
        </ul>
        <div className="sr-only">
        <table>
          <caption>Tipos de informação no relatório e sua origem</caption>
          <thead><tr><th scope="col">Tipo</th><th scope="col">Trecho</th><th scope="col">Origem</th></tr></thead>
          <tbody>
            {content.q5Extract.rows.map((r) => (
              <tr key={r.kind}><th scope="row">{r.kind}</th><td>{r.text}</td><td>{r.origin}</td></tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground"><ShieldCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />{content.q5Extract.note}</p>
      </section>
      <GuideCheckCard check={content.checks[1]!} title="Checagem" />
    </div>
  );
}
