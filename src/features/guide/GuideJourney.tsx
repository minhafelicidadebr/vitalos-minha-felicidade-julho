// Guia da Jornada · jornada navegável por etapa (Q1–Q5) e perspectiva, um formato único (referência: Q2).
// O conteúdo chega do servidor. A perspectiva muda só o texto; o CTA operacional depende
// do contexto do SERVIDOR (operationalCta) e nunca da perspectiva escolhida.
// Design informacional: docs/vitalos/guia/SUPERPROMPT_DESIGN_INFORMACIONAL_GUIA.md.
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
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
import type { CyclePhase, GuideCheck, GuideContent, GuideHandoff, GuideLens, GuideLensContent, GuidePerspective, IvoPerspective } from "@/domain/guide/guide-types";
import enterprisePack from "@/domain/packs/enterprise/enterprise.pack.json";
import { allAvailabilityEntries, effectiveLevel, operationalCta, statusLabel, type GuideServerContext } from "@/lib/guide/guide-entry";

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

function FullCaseDialog({ content }: { content: GuideContent }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex min-h-11 items-center gap-1.5 text-left text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BookOpen aria-hidden className="h-4 w-4 shrink-0" /> Ler o caso inteiro, do Q1 ao Q5
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>O caso inteiro</DialogTitle>
          <DialogDescription>{content.caseLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 text-sm">
          {content.lenses.map((lens) => (
            <section key={lens.lens} className="space-y-2">
              <h4 className="font-medium text-foreground">{lens.title} <span className="text-xs font-normal text-muted-foreground">· {lens.cyclePhase}</span></h4>
              <SceneTimeline lens={lens} />
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface GuideJourneyProps {
  content: GuideContent;
  context: GuideServerContext | null;
  environment: string;
  stage: GuideLens;
  perspective: GuidePerspective;
  hasTaskPanel?: boolean;
  onChange: (next: { stage?: GuideLens; perspective?: GuidePerspective }) => void;
}

/** Cor de lente: só na aba ativa, na sobrelinha e em pequenos acentos. Q2 e Q5 usam o verde da marca. */
const LENS_ACCENT: Partial<Record<GuideLens, string>> = {
  Q1: "oklch(0.42 0.07 215)",
  Q3: "oklch(0.40 0.12 340)",
  Q4: "oklch(0.40 0.14 275)",
  Q5: "oklch(0.52 0.11 85)",
};
const TAB_FILL: Partial<Record<GuideLens, string>> = { Q1: LENS_ACCENT.Q1, Q3: LENS_ACCENT.Q3, Q4: LENS_ACCENT.Q4 };
const accentText = (accent: string): CSSProperties => ({ color: `color-mix(in oklab, ${accent} 70%, var(--color-foreground))` });

export function GuideJourney({ content, context, environment, stage, perspective: requestedPerspective, hasTaskPanel = false, onChange }: GuideJourneyProps) {
  // Perfil vindo da URL pode estar adulterado: valor fora da lista cai no perfil da sessão (ou RH, sem sessão).
  const perspective: GuidePerspective = content.perspectives.some((p) => p.id === requestedPerspective) ? requestedPerspective : (context?.perspective ?? "rh");
  const lens = content.lenses.find((l) => l.lens === stage) ?? content.lenses[1]!;
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

  const accent = LENS_ACCENT[lens.lens] ?? "var(--color-primary)";

  return (
    <div className="space-y-5">
      <p className="sr-only" aria-live="polite">{announce}</p>

      <nav aria-label="Mapa da jornada" className={`-mx-4 border-b border-border bg-background/95 px-4 py-2 sm:mx-0 sm:rounded-2xl sm:border sm:px-3 ${context ? "" : "sticky top-0 z-30 backdrop-blur sm:static"}`}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <ol className="flex flex-1 justify-between gap-1 sm:justify-start" aria-label="Etapas do ano">
            {content.lenses.map((l) => {
              const current = l.lens === stage;
              return (
                <li key={l.lens} className="shrink-0">
                  <button
                    type="button"
                    aria-current={current ? "step" : undefined}
                    onClick={() => onChange({ stage: l.lens })}
                    style={current && TAB_FILL[l.lens] ? { backgroundColor: TAB_FILL[l.lens] } : undefined}
                    className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 ${current ? `${TAB_FILL[l.lens] ? "" : "bg-primary "}text-primary-foreground` : "text-foreground hover:bg-muted/60"}`}
                  >
                    {l.lens}
                    <span className="sr-only"> · {l.title}{current ? " (etapa atual)" : ""}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <label className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:shrink-0">
            <span>{context ? "Perspectiva de leitura" : "Consultar jornada como"}</span>
            <select
              value={perspective}
              onChange={(e) => onChange({ perspective: e.target.value as GuidePerspective })}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none"
            >
              {content.perspectives.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>
      </nav>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={accentText(accent)}>{lens.instrument}</p>
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">{lens.title}</h2>
        <p className="text-sm text-muted-foreground">{lens.question}</p>
        {lens.journey?.stageChip ? <p className="pt-1"><StatusChip text={lens.journey.stageChip} solid={false} /></p> : null}
        {lens.journey?.flow ? <FlowStrip flow={lens.journey.flow} accent={accent} /> : null}
      </header>

      <ProfileJourney content={content} lens={lens} perspective={perspective} perspectiveLabel={perspLabel} context={context} environment={environment} hasTaskPanel={hasTaskPanel} headingRef={voiceRef} accent={accent} onChange={onChange} />

      <footer className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <p>{content.whatNext}</p>
        <p>{content.readingNotice}</p>
      </footer>
    </div>
  );
}

function FlowStrip({ flow, accent }: { flow: NonNullable<GuideLensContent["journey"]>["flow"] & object; accent: string }) {
  return (
    <div className="pt-2">
      <ol aria-label="Fluxo da etapa" className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
        {flow.steps.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 font-medium text-foreground" style={{ borderColor: accent }}>
              <span aria-hidden className="text-xs" style={accentText(accent)}>{i + 1}</span>{step}
            </span>
            {flow.arrows && i < flow.steps.length - 1 ? <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
          </li>
        ))}
      </ol>
      {flow.note ? <p className="mt-1.5 text-xs text-muted-foreground">{flow.note}</p> : null}
    </div>
  );
}

const TOOL_NAMES: Record<string, string> = {
  "q1.preparacao": "Preparação do Q1",
  "q1.coleta": "Coleta oficial do COPSOQ II-Br",
  "q2.leitura_plano": "Prioridades e ações do ciclo",
  "q2.execucao_lideranca": "Minhas ações do ciclo",
  "q2.devolutiva_coletiva": "Devolutiva da equipe",
  "q3.vitalidade_001": "Prática Vitalidade 001",
  "q4.percurso_individual": "Percurso individual de forças",
  "q5.relatorio": "Relatório Global",
};
/** Etapas cujas ferramentas já têm caminho no painel (Visão IVO). As demais são exemplos. */
const LENSES_WITH_DASHBOARD_PATH: GuideLens[] = ["Q1", "Q2"];
const IVO_MENU_LABEL = enterprisePack.navigation.find((item) => item.id === "ivo")?.label ?? "IVO";
const PRIMARY_LINK = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function toolStatus(id: string, environment: string): { text: string; solid: boolean } {
  const level = effectiveLevel(id, environment);
  if (level === "ambiente") return { text: "Disponível", solid: true };
  if (level === "demonstrativo") return { text: "Exemplo educativo", solid: false };
  return { text: "Em preparação", solid: false };
}

const Q3_DEMO_TASKS: Partial<Record<GuidePerspective, string>> = {
  rh: "Na visão de RH, consulte os resultados agregados e explore a devolutiva coletiva.",
  lideranca: "Na visão de liderança, abra suas ações e confira o andamento da prática atribuída.",
  colaborador: "Na visão de colaborador, experimente responder ao questionário e consultar a devolutiva coletiva.",
};

function ProfileJourney({ content, lens, perspective, perspectiveLabel, context, environment, hasTaskPanel, headingRef, accent, onChange }: {
  content: GuideContent;
  lens: GuideLensContent;
  perspective: GuidePerspective;
  perspectiveLabel: string;
  context: GuideServerContext | null;
  environment: string;
  hasTaskPanel: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  accent: string;
  onChange: GuideJourneyProps["onChange"];
}) {
  const cell = lens.matrix[perspective];
  const journey = lens.journey;
  const session = context?.perspective === perspective ? context : null;
  const viewingOtherRole = Boolean(context && !session);
  const cta = operationalCta(cell.capability, session);
  const acts = cell.mode === "atua";
  const depends = cell.mode === "dependencia";
  const showPrimary = cta && !hasTaskPanel;
  const firstLabel = cell.labels?.first ?? (acts ? "Sua parte" : "Quem atua");
  const secondLabel = cell.labels?.second ?? (acts ? "Quem recebe depois" : "O que você acompanha");
  const isQ2 = lens.lens === "Q2";
  const leaderWithoutTask = Boolean(isQ2 && session && perspective === "lideranca" && !session.unavailable &&
    session.grantedCapabilities.includes("q2.execucao_lideranca") &&
    !session.tasks.some((task) => task.lens === "Q2" && (task.status === "planejada" || task.status === "em_execucao")));
  const tools = allAvailabilityEntries().filter((entry) => entry.lens === lens.lens && (
    entry.id === cell.capability || (session && session.grantedCapabilities.includes(entry.id)) || entry.id === "q1.coleta"
  ));
  const check = journey?.checkId ? content.checks.find((c) => c.id === journey.checkId) : undefined;
  const handoffs = lens.handoffs ?? content.handoffs;
  const hasDashboardPath = LENSES_WITH_DASHBOARD_PATH.includes(lens.lens);
  const neighbor = lens.lens === "Q2" ? ({ stage: "Q5", label: "Ver como isso aparece na síntese anual (Q5)" } as const) : lens.lens === "Q5" ? ({ stage: "Q2", label: "Ver a ação de origem, no Q2" } as const) : null;

  return (
    <div className="space-y-5">
      <section aria-labelledby="guide-voice" className="space-y-4 rounded-2xl border border-primary/25 border-t-4 bg-card p-4 sm:p-6" style={{ borderTopColor: accent }}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip text={MODE_LABEL[cell.mode]} solid={acts} />
          <span className="text-sm text-muted-foreground">{viewingOtherRole ? "Consultando a perspectiva de" : "Papel consultado:"} <strong className="text-foreground">{perspectiveLabel}</strong></span>
        </div>
        <h3 id="guide-voice" ref={headingRef} tabIndex={-1} className="scroll-mt-32 font-serif text-xl leading-snug text-foreground focus-visible:outline-none sm:text-2xl">
          {lens.voices[perspective] ?? cell.who}
        </h3>
        {viewingOtherRole ? <p className="text-sm text-muted-foreground">Sua sessão continua como {context?.roleLabel}. Aqui você consulta como {perspectiveLabel} participa.</p> : null}
        {journey?.stageNotice ? <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">{journey.stageNotice}</p> : null}
        {session?.unavailable ? (
          <p role="status" className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">Não foi possível verificar a disponibilidade agora. Tente novamente.</p>
        ) : session && !session.availableLenses.includes(lens.lens) ? (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">Esta etapa ainda não está habilitada nesta organização. Você pode consultar o exemplo.</p>
        ) : leaderWithoutTask ? (
          <p className="text-sm text-muted-foreground">Nenhuma ação atribuída neste momento.</p>
        ) : null}
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-xl bg-muted/30 p-3 sm:p-4">
            <dt className="flex items-center gap-2 text-sm font-semibold text-foreground"><ClipboardCheck aria-hidden className="h-4 w-4 shrink-0 text-primary" />{firstLabel}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{cell.who}</dd>
          </div>
          <div className="min-w-0 rounded-xl bg-muted/30 p-3 sm:p-4">
            <dt className="flex items-center gap-2 text-sm font-semibold text-foreground"><Inbox aria-hidden className="h-4 w-4 shrink-0 text-primary" />{secondLabel}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{cell.receives}</dd>
          </div>
          {depends ? (
            <div className="min-w-0 rounded-xl border border-dashed border-border p-3 sm:col-span-2 sm:p-4">
              <dt className="flex items-center gap-2 text-sm font-semibold text-foreground"><KeyRound aria-hidden className="h-4 w-4 shrink-0 text-primary" />O que depende de decisão</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{cell.condition}</dd>
            </div>
          ) : null}
        </dl>
        {showPrimary ? <a href={cta.href} className={PRIMARY_LINK}>{leaderWithoutTask ? "Consultar minhas ações" : cta.label}<ArrowRight aria-hidden className="h-4 w-4 shrink-0" /></a> : null}
      </section>

      {lens.lens === "Q1" && (perspective === "rh" || perspective === "sst") && (
        <aside aria-label="Preparação da avaliação Q1" className="space-y-2 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
          <p className="text-sm font-semibold">{perspective === "rh" ? "Organize a preparação do ciclo" : "Revise tecnicamente a preparação"}</p>
          <p className="text-sm text-muted-foreground">{perspective === "rh"
            ? "Defina o ciclo, prepare o comunicado à equipe e registre os controles existentes para encaminhar a revisão técnica."
            : "Revise com o RH o comunicado e os controles registrados. Combine as pendências técnicas antes de avançar para a coleta."}</p>
          <p className="text-sm text-muted-foreground">A aplicação do questionário é uma etapa posterior.</p>
        </aside>
      )}

      {lens.lens === "Q4" && perspective === "colaborador" && (
        <aside aria-label="Prática demonstrativa do VIA" className="space-y-2 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
          <p className="text-sm font-semibold">Explore suas forças de caráter</p>
          <p className="text-sm text-muted-foreground">Veja uma devolutiva fictícia, experimente o questionário e escolha uma força para aplicar em uma situação do seu dia a dia.</p>
          <a href="/viat" className={PRIMARY_LINK}>Abrir exemplo de forças de caráter <ArrowRight aria-hidden className="h-4 w-4 shrink-0" /></a>
        </aside>
      )}

      {lens.lens === "Q3" && Q3_DEMO_TASKS[perspective] && (
        <aside aria-label="Prática demonstrativa de PERMA+V" className="space-y-2 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
          <p className="text-sm font-semibold">Pratique com dados fictícios</p>
          <p className="text-sm text-muted-foreground">{Q3_DEMO_TASKS[perspective]}</p>
          <p className="text-sm text-muted-foreground">Use o seletor de perfil da demonstração para abrir a visão correspondente.</p>
          <a href="/q3-demo" className={PRIMARY_LINK}>Abrir demonstração PERMA+V <ArrowRight aria-hidden className="h-4 w-4 shrink-0" /></a>
        </aside>
      )}

      <div className="rounded-2xl border border-border bg-card px-4 py-2 sm:px-5">
        <InlineDetail label={viewingOtherRole ? `Ferramentas da perspectiva: ${perspectiveLabel}` : context ? "Ferramentas do meu perfil" : "Ferramentas deste perfil"} icon={Compass}>
          {tools.length ? <>
            {hasDashboardPath ? <>
              <p className="font-medium">{enterprisePack.navGroups.medir} <span aria-hidden>›</span> {IVO_MENU_LABEL} <span aria-hidden>›</span> Visão IVO</p>
              <p className="mt-1 text-xs text-muted-foreground">As ferramentas do {lens.lens} ficam na Visão IVO.</p>
            </> : <p className="text-xs text-muted-foreground">Esta etapa ainda não tem caminho próprio no painel: o guia a apresenta como exemplo.</p>}
            <ul className="mt-2 divide-y divide-border">
              {tools.map((tool) => {
                const link = operationalCta(tool.id, session);
                const isPrimary = tool.id === cell.capability && (hasTaskPanel || showPrimary);
                const status = toolStatus(tool.id, environment);
                return <li key={tool.id} className="py-3">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">{TOOL_NAMES[tool.id] ?? tool.capability} <StatusChip text={status.text} solid={status.solid} /></p>
                  <p className="mt-0.5 text-muted-foreground">{tool.capability}.</p>
                  {link && !isPrimary ? <a href={link.href} className="inline-flex min-h-11 items-center gap-2 font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{link.label}<ArrowRight aria-hidden className="h-4 w-4 shrink-0" /></a> : null}
                  {isPrimary && link ? <p className="mt-1 text-xs text-muted-foreground">Atalho na ação em destaque acima.</p> : null}
                  {!link && session && tool.route ? <p className="mt-1 text-xs text-muted-foreground">Sem atalho disponível para esta sessão.</p> : null}
                </li>;
              })}
            </ul>
          </> : <p>O guia ainda não apresenta uma ferramenta do {lens.lens} para este papel.</p>}
          <p className="border-t border-border pt-2 text-xs text-muted-foreground">{cell.condition}</p>
        </InlineDetail>
      </div>

      <Handoffs handoffs={handoffs} perspective={perspective} />

      <div id="guide-scene" className="scroll-mt-28 space-y-1 rounded-2xl border border-border bg-card px-4 py-2 sm:px-5">
        <InlineDetail label="Ver um exemplo" icon={BookOpen}>
          <p className="text-xs font-medium text-muted-foreground">{content.caseLabel}</p>
          <p className="my-3 leading-relaxed">{journey?.example ?? content.resolvedExample}</p>
          {journey?.evidence ? (
            <p className="mb-3 rounded-lg bg-muted/60 p-3 font-medium"><span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Que evidência fica?</span>{journey.evidence}</p>
          ) : null}
          {lens.lens === "Q5" ? <Q5Extract content={content} /> : null}
          {check ? <GuideCheckCard check={check} title="Confira seu entendimento" /> : null}
          <InlineDetail label="Ver as etapas deste caso" icon={ListChecks}>
            <SceneTimeline lens={lens} perspective={perspective} />
          </InlineDetail>
          {neighbor ? (
            <button type="button" onClick={() => onChange({ stage: neighbor.stage })} className="inline-flex min-h-11 items-center gap-1.5 text-left text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowRight aria-hidden className="h-4 w-4 shrink-0" /> {neighbor.label}
            </button>
          ) : null}
          <FullCaseDialog content={content} />
        </InlineDetail>
        <InlineDetail label="O que fica protegido?" icon={ShieldCheck}>
          <ul className="list-disc space-y-1 pl-5">{lens.guardrails.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        </InlineDetail>
        <InlineDetail label="Onde esta etapa se encaixa" icon={MapIcon}>
          <OrientationMaps content={content} lens={lens} perspectiveLabel={perspectiveLabel} />
        </InlineDetail>
      </div>
    </div>
  );
}

function Handoffs({ handoffs, perspective }: { handoffs: GuideHandoff[]; perspective: GuidePerspective }) {
  return (
    <section aria-labelledby="handoffs-title" className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <h3 id="handoffs-title" className="font-semibold text-foreground">Como a equipe colabora</h3>
      <ol className={`mt-3 grid gap-2 sm:grid-cols-2 ${handoffs.length > 3 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {handoffs.map((h, i) => {
          const Icon = HANDOFF_ICON[h.id as keyof typeof HANDOFF_ICON] ?? Eye;
          const mine = h.perspective === perspective || Boolean(h.also?.includes(perspective));
          return (
            <li key={h.id} className={`min-w-0 rounded-xl border p-3 text-sm ${mine ? "border-primary bg-primary/5" : "border-border"}`}>
                <p className="flex items-center gap-1.5 font-medium text-foreground">
                  <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10"><Icon className="h-3.5 w-3.5 text-primary" /></span>
                  <span>{i + 1}. {h.verb}</span>
                </p>
                <p className="mt-1 text-xs font-medium text-primary">{h.owner}{mine ? (h.follow ? " · Você acompanha" : " · Sua atuação") : ""}</p>
                <p className="mt-1 leading-relaxed text-muted-foreground">{h.evidence}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const Q5_MEANING: Record<string, string> = {
  "Execução registrada": "o que aconteceu",
  "Decisão documentada": "o que se resolveu fazer",
  "Mudança observada": "o que uma nova leitura mostrou",
  "Efeito avaliado": "o que foi avaliado, com método e limites",
};

function Q5Extract({ content }: { content: GuideContent }) {
  return (
    <section aria-labelledby="q5-extract" className="mb-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h4 id="q5-extract" className="font-semibold text-foreground">Extrato do relatório · o caso da troca de turno</h4>
      <p className="mt-1 text-xs text-muted-foreground">Quatro tipos de informação, cada um com sua origem. Um não substitui o outro.</p>
      <ul aria-hidden className="mt-3 grid gap-2 sm:grid-cols-2">
        {content.q5Extract.rows.map((r) => {
          const s = Q5_STYLE[r.kind] ?? { icon: CheckCircle2, border: "" };
          const Icon = s.icon;
          return (
            <li key={r.kind} className={`rounded-xl border border-border bg-background p-3 ${s.border}`}>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground"><Icon className="h-4 w-4 text-primary" /> {r.kind}</p>
              <p className="text-xs text-muted-foreground">{Q5_MEANING[r.kind]}</p>
              <p className="mt-1 text-sm text-foreground">{r.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">Origem: {r.origin}</p>
            </li>
          );
        })}
      </ul>
      <div className="sr-only">
        <table>
          <caption>Tipos de informação no relatório e sua origem</caption>
          <thead><tr><th scope="col">Tipo</th><th scope="col">Significado</th><th scope="col">Trecho</th><th scope="col">Origem</th></tr></thead>
          <tbody>
            {content.q5Extract.rows.map((r) => (
              <tr key={r.kind}><th scope="row">{r.kind}</th><td>{Q5_MEANING[r.kind]}</td><td>{r.text}</td><td>{r.origin}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-lg bg-muted/40 p-2 text-sm text-foreground"><strong className="font-semibold">Próximo compromisso</strong> · definir prioridade, responsável, indicador e data de revisão.</p>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground"><ShieldCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />{content.q5Extract.note}</p>
    </section>
  );
}
