import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { canTransition, type PlanActionStatus } from "@/engine/action-plan/action-log-engine";
import type { FibtActionPlanView, FibtActionView, IvoQ2View } from "@/lib/ivo/ivo-views";
import { formatIsoDateLong } from "@/lib/ivo/local-date";
import { formatDateBR } from "./IvoQ2Detail";

// Ciclo resultado FIB-T → prioridade → ação → evidência → aprendizagem
// (spec docs/vitalos/specs/action-learning-loop.md). Componentes de
// apresentação: todas as escritas são callbacks que a rota liga às server
// functions; nenhuma decisão de acesso acontece aqui.

export const STATUS_LABEL: Record<PlanActionStatus, string> = {
  planejada: "Planejada",
  em_execucao: "Em execução",
  concluida: "Concluída",
  em_vigilancia: "Em vigilância",
  interrompida: "Interrompida",
};

const ALL_STATUSES: PlanActionStatus[] = ["planejada", "em_execucao", "concluida", "em_vigilancia", "interrompida"];

const EFFORT_LABEL = { baixo: "Baixo", medio: "Médio", alto: "Alto" } as const;

const inputClass =
  "mt-1 block min-h-11 w-full rounded-md border border-foreground/55 bg-background px-3 text-sm text-foreground outline-none [color-scheme:light] focus:border-primary focus:ring-2 focus:ring-primary/30 dark:[color-scheme:dark]";
const buttonPrimary =
  "inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const buttonSecondary =
  "inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Ação principal do registro de execução: dourado institucional com texto verde-escuro
// (contraste ≈10,4:1 medido; hover ≈11,1:1). Borda escura mantém o contorno no tema claro.
const buttonExecution =
  "inline-flex min-h-12 w-full items-center justify-center rounded-md border border-[var(--institutional-deep)] bg-[var(--institutional-gold)] px-5 text-sm font-semibold text-[var(--institutional-deep)] shadow-sm hover:bg-[color-mix(in_oklab,var(--institutional-gold)_88%,white)] aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto";
// Tratamento secundário da aprendizagem: superfície secundária do tema + borda primária
// (texto ≈11,7:1 claro / ≈12,4:1 escuro; borda ≈12:1 / ≈7,5:1 contra o cartão).
const buttonLearning =
  "inline-flex min-h-12 w-full items-center justify-center rounded-md border-2 border-primary bg-secondary px-5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/70 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto";
function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ─── Prioridades (cria o plano do ciclo) ────────────────────────────────────

export interface PriorityDraft {
  cohortId: string;
  factorId: string;
  title: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
}

export function PriorityPlanner({
  view,
  preselect,
  busy,
  onCreate,
}: {
  view: IvoQ2View;
  preselect: { cohortId?: string; factorId?: string };
  busy: boolean;
  onCreate: (priorities: PriorityDraft[]) => void;
}) {
  const published = view.sectors.filter((s) => s.group === "available" && s.factors && s.factors.length > 0);
  const initialSector = published.find((s) => s.cohortId === preselect.cohortId) ?? published[0];
  const initialFactor = initialSector?.factors?.find((f) => f.id === preselect.factorId) ?? initialSector?.factors?.[0];

  const [cohortId, setCohortId] = useState(initialSector?.cohortId ?? "");
  const [factorId, setFactorId] = useState(initialFactor?.id ?? "");
  const [title, setTitle] = useState(
    initialSector && initialFactor ? `Prioridade: ${initialFactor.name} — ${initialSector.label}` : "",
  );
  const [description, setDescription] = useState("");
  const [effort, setEffort] = useState<PriorityDraft["effort"]>("medio");
  const [drafts, setDrafts] = useState<PriorityDraft[]>([]);

  if (published.length === 0) {
    return (
      <div role="note" className="rounded-md border border-border bg-muted/30 p-4 text-sm">
        <p className="font-medium text-foreground">Ainda não há setor com leitura publicada</p>
        <p className="mt-1 text-muted-foreground">
          Prioridades só partem de resultado publicado. Setores protegidos (abaixo do limiar, supressão
          complementar ou lote pendente) não embasam ações — e isso não significa resultado ruim nem zero.
        </p>
      </div>
    );
  }

  const sector = published.find((s) => s.cohortId === cohortId);
  const factors = sector?.factors ?? [];
  const sectorLabel = (id: string) => view.sectors.find((s) => s.cohortId === id)?.label ?? "";
  const factorName = (cid: string, fid: string) =>
    view.sectors.find((s) => s.cohortId === cid)?.factors?.find((f) => f.id === fid)?.name ?? fid;

  function addDraft(event: FormEvent) {
    event.preventDefault();
    if (!cohortId || !factorId || title.trim().length < 3) return;
    if (drafts.some((d) => d.cohortId === cohortId && d.factorId === factorId)) return;
    setDrafts([...drafts, { cohortId, factorId, title: title.trim(), description: description.trim(), effort }]);
    setDescription("");
  }

  return (
    <section aria-labelledby="prioridades-title" className="space-y-4 rounded-md border border-border bg-background p-4">
      <div>
        <h2 id="prioridades-title" className="font-serif text-xl text-foreground">
          Definir prioridades do ciclo {view.cycleKey}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A prioridade é decisão do gestor a partir do resultado publicado. A ação guarda a origem (setor,
          fator, versão e data da publicação) — nenhum valor do resultado é copiado para ela.
        </p>
      </div>

      <form onSubmit={addDraft} className="grid gap-3 md:grid-cols-2">
        <Field id="prio-setor" label="Setor com leitura publicada">
          <select
            id="prio-setor"
            className={inputClass}
            value={cohortId}
            onChange={(e) => {
              setCohortId(e.target.value);
              const next = published.find((s) => s.cohortId === e.target.value);
              setFactorId(next?.factors?.[0]?.id ?? "");
            }}
          >
            {published.map((s) => (
              <option key={s.cohortId} value={s.cohortId}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="prio-fator" label="Fator FIB-T">
          <select id="prio-fator" className={inputClass} value={factorId} onChange={(e) => setFactorId(e.target.value)}>
            {factors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id="prio-titulo" label="Título da ação">
          <input id="prio-titulo" className={inputClass} value={title} maxLength={200} required minLength={3} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field id="prio-esforco" label="Esforço">
          <select id="prio-esforco" className={inputClass} value={effort} onChange={(e) => setEffort(e.target.value as PriorityDraft["effort"])}>
            <option value="baixo">Baixo</option>
            <option value="medio">Médio</option>
            <option value="alto">Alto</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field id="prio-descricao" label="O que será feito (opcional)" hint="Não inclua nomes de pessoas nem respostas individuais.">
            <textarea
              id="prio-descricao"
              aria-describedby="prio-descricao-hint"
              className={`${inputClass} min-h-20 py-2`}
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <button type="submit" className={buttonSecondary}>
            Adicionar prioridade
          </button>
        </div>
      </form>

      {drafts.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Prioridades escolhidas</h3>
          <ul className="space-y-1 text-sm">
            {drafts.map((d) => (
              <li key={`${d.cohortId}-${d.factorId}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/60 px-3 py-2">
                <span>
                  {d.title} <span className="text-muted-foreground">· {sectorLabel(d.cohortId)} · {factorName(d.cohortId, d.factorId)} · esforço {EFFORT_LABEL[d.effort].toLowerCase()}</span>
                </span>
                <button
                  type="button"
                  className="min-h-11 text-xs text-muted-foreground underline"
                  onClick={() => setDrafts(drafts.filter((x) => x !== d))}
                >
                  Remover<span className="sr-only"> {d.title}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={buttonPrimary} disabled={busy} onClick={() => onCreate(drafts)}>
            {busy ? "Criando…" : `Criar plano do ciclo ${view.cycleKey}`}
          </button>
        </div>
      ) : null}
    </section>
  );
}

// ─── Ação ────────────────────────────────────────────────────────────────────

export interface EvidenceInput {
  scope: "execucao" | "aprendizagem";
  kind?: "texto" | "checklist" | "metrica";
  content: string;
  occurredOn: string;
}

export interface EvidenceSubmitResult {
  ok: boolean;
  message: string;
}

export interface ActionCallbacks {
  onAccountability: (itemId: string, input: { ownerRoleLabel: string; dueOn: string; executionMetric: { label: string; baseline: number; target: number; unit: string } }) => void;
  onStatus: (itemId: string, toStatus: PlanActionStatus) => void;
  // Devolve o desfecho para o formulário mostrar sucesso/erro junto dele; `void` conta como sucesso.
  onEvidence: (itemId: string, input: EvidenceInput) => Promise<EvidenceSubmitResult> | void;
}

function AccountabilityForm({ action, busy, onSubmit }: { action: FibtActionView; busy: boolean; onSubmit: ActionCallbacks["onAccountability"] }) {
  const p = `acc-${action.id}`;
  const [role, setRole] = useState(action.owner?.roleLabel ?? "");
  const [dueOn, setDueOn] = useState(action.dueOn ?? "");
  const [label, setLabel] = useState(action.executionMetric?.label ?? "");
  const [baseline, setBaseline] = useState(String(action.executionMetric?.baseline ?? "0"));
  const [target, setTarget] = useState(String(action.executionMetric?.target ?? ""));
  const [unit, setUnit] = useState(action.executionMetric?.unit ?? "");

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const b = Number(baseline.replace(",", "."));
        const t = Number(target.replace(",", "."));
        if (!role.trim() || !dueOn || !label.trim() || !Number.isFinite(b) || !Number.isFinite(t)) return;
        onSubmit(action.id, { ownerRoleLabel: role.trim(), dueOn, executionMetric: { label: label.trim(), baseline: b, target: t, unit: unit.trim() } });
      }}
    >
      <Field id={`${p}-role`} label="Responsável (função que executa)">
        <input id={`${p}-role`} className={inputClass} value={role} required minLength={2} maxLength={80} onChange={(e) => setRole(e.target.value)} />
      </Field>
      <Field id={`${p}-due`} label="Prazo" hint={dueOn ? `Data selecionada: ${formatIsoDateLong(dueOn)}` : "Escolha o dia no calendário ou digite dia/mês/ano."}>
        <input id={`${p}-due`} aria-describedby={`${p}-due-hint`} type="date" className={inputClass} value={dueOn} required onChange={(e) => setDueOn(e.target.value)} />
      </Field>
      <Field id={`${p}-metric`} label="Indicador de execução" hint="Mede se a ação aconteceu (ex.: encontros realizados). Não é o resultado FIB-T.">
        <input id={`${p}-metric`} aria-describedby={`${p}-metric-hint`} className={inputClass} value={label} required minLength={2} maxLength={120} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field id={`${p}-base`} label="Linha de base">
          <input id={`${p}-base`} inputMode="decimal" className={inputClass} value={baseline} required onChange={(e) => setBaseline(e.target.value)} />
        </Field>
        <Field id={`${p}-target`} label="Meta">
          <input id={`${p}-target`} inputMode="decimal" className={inputClass} value={target} required onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field id={`${p}-unit`} label="Unidade">
          <input id={`${p}-unit`} className={inputClass} value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <button type="submit" className={buttonSecondary} disabled={busy}>
          Salvar responsável e prazo<span className="sr-only"> de {action.title}</span>
        </button>
      </div>
    </form>
  );
}

const SCOPE_COPY = {
  execucao: {
    title: "Evidência de execução",
    help: "Registre o que foi feito: encontro realizado, ata, checklist. Mostra que a ação aconteceu.",
    field: "Nova evidência de execução",
    submit: "Registrar execução",
    pending: "Registrando execução…",
    empty: "Nenhuma registrada.",
    tooShort: "Descreva a execução com ao menos 3 caracteres.",
  },
  aprendizagem: {
    title: "Aprendizagem",
    help: "Registre o que a equipe aprendeu ao executar. Não comprova melhora do indicador.",
    field: "Novo registro de aprendizagem",
    submit: "Registrar aprendizagem",
    pending: "Registrando aprendizagem…",
    empty: "Nenhum registro.",
    tooShort: "Descreva a aprendizagem com ao menos 3 caracteres.",
  },
} as const;

const GENERIC_SUBMIT_ERROR = "Falha de comunicação com o servidor. Nada foi confirmado; o texto foi mantido.";

function EvidenceForm({
  action,
  scope,
  busy,
  today,
  onSubmit,
}: {
  action: FibtActionView;
  scope: "execucao" | "aprendizagem";
  busy: boolean;
  today: string;
  onSubmit: ActionCallbacks["onEvidence"];
}) {
  const copy = SCOPE_COPY[scope];
  const p = `${scope}-${action.id}`;
  const [content, setContent] = useState("");
  const [occurredOn, setOccurredOn] = useState(today);
  const [kind, setKind] = useState<"texto" | "checklist" | "metrica">("texto");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // Ref síncrona: dois cliques antes do re-render não podem gerar dois envios.
  const inFlight = useRef(false);
  const blocked = busy || pending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || busy) return;
    if (content.trim().length < 3) {
      setFeedback({ tone: "error", text: copy.tooShort });
      return;
    }
    inFlight.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const result = await onSubmit(action.id, { scope, kind: scope === "execucao" ? kind : undefined, content: content.trim(), occurredOn });
      if (result && !result.ok) {
        // Falha: o texto digitado fica no campo para nova tentativa.
        setFeedback({ tone: "error", text: result.message });
      } else {
        setContent("");
        setFeedback({ tone: "ok", text: result?.message ?? (scope === "execucao" ? "Evidência de execução registrada." : "Aprendizagem registrada.") });
      }
    } catch {
      setFeedback({ tone: "error", text: GENERIC_SUBMIT_ERROR });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  // Empilhado de propósito: o cartão vive em meia coluna no desktop e em coluna
  // única no celular; campos lado a lado espremiam o texto principal.
  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Field id={`${p}-content`} label={copy.field} hint="Sem nomes de pessoas e sem respostas individuais.">
        <textarea
          id={`${p}-content`}
          aria-describedby={`${p}-content-hint`}
          className={`${inputClass} min-h-24 py-2`}
          rows={3}
          value={content}
          minLength={3}
          maxLength={2000}
          required
          onChange={(e) => {
            setContent(e.target.value);
            if (feedback) setFeedback(null);
          }}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {scope === "execucao" ? (
          <Field id={`${p}-kind`} label="Tipo">
            <select id={`${p}-kind`} className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="texto">Relato</option>
              <option value="checklist">Checklist</option>
              <option value="metrica">Indicador de execução</option>
            </select>
          </Field>
        ) : null}
        <Field
          id={`${p}-date`}
          label="Data"
          hint={occurredOn ? `Data selecionada: ${formatIsoDateLong(occurredOn)}` : "Escolha o dia no calendário ou digite dia/mês/ano."}
        >
          <input
            id={`${p}-date`}
            aria-describedby={`${p}-date-hint`}
            type="date"
            max={today}
            className={inputClass}
            value={occurredOn}
            required
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </Field>
      </div>
      {/* Rótulo visível distinto por formulário: dois botões "Registrar" lado a lado
          levaram um registro de execução a ser enviado como aprendizagem (staging,
          04/10/2026). O nome acessível contém o texto visível (WCAG 2.5.3).
          aria-disabled (e não disabled) mantém o foco do teclado no botão durante o envio. */}
      <button type="submit" className={scope === "execucao" ? buttonExecution : buttonLearning} aria-disabled={blocked}>
        {pending ? copy.pending : copy.submit}
        <span className="sr-only"> de {action.title}</span>
      </button>
      <div role="status" aria-live="polite" className="min-h-5 text-sm">
        {feedback?.tone === "ok" ? <p className="text-emerald-700 dark:text-emerald-300">{feedback.text}</p> : null}
      </div>
      {feedback?.tone === "error" ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {feedback.text}
        </p>
      ) : null}
    </form>
  );
}

function EvidenceCard({
  action,
  scope,
  records,
  showForm,
  busy,
  today,
  onSubmit,
}: {
  action: FibtActionView;
  scope: "execucao" | "aprendizagem";
  records: FibtActionView["evidence"]["execution"];
  showForm: boolean;
  busy: boolean;
  today: string;
  onSubmit: ActionCallbacks["onEvidence"];
}) {
  const copy = SCOPE_COPY[scope];
  const isExecution = scope === "execucao";
  return (
    <section
      aria-label={`${copy.title} — ${action.title}`}
      className={`flex flex-col gap-3 rounded-lg border-2 p-4 ${isExecution ? "border-[var(--institutional-gold)] bg-card" : "border-border bg-secondary/40"}`}
    >
      <header>
        <h4 className="text-sm font-semibold text-foreground">{copy.title}</h4>
        <p className="mt-1 text-xs text-muted-foreground">{copy.help}</p>
      </header>
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {records.map((e) => (
            <li key={e.id}>
              <time dateTime={e.occurredOn} className="font-medium">
                {formatIsoDateLong(e.occurredOn)}
              </time>{" "}
              — {e.content}
            </li>
          ))}
        </ul>
      )}
      {showForm ? <EvidenceForm action={action} scope={scope} busy={busy} today={today} onSubmit={onSubmit} /> : null}
    </section>
  );
}
export function FibtActionCard({
  action,
  planStatus,
  busy,
  today,
  callbacks,
}: {
  action: FibtActionView;
  planStatus: FibtActionPlanView["status"];
  busy: boolean;
  today: string;
  callbacks: ActionCallbacks;
}) {
  const headingId = `acao-${action.id}`;
  const next = ALL_STATUSES.filter((s) => canTransition(action.status, s));
  return (
    <article aria-labelledby={headingId} className="space-y-4 rounded-md border border-border bg-background p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} className="font-medium text-foreground">
          {action.title}
        </h3>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Estado: {STATUS_LABEL[action.status]}
        </span>
      </div>
      {action.description ? <p className="text-sm text-muted-foreground">{action.description}</p> : null}

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="inline text-muted-foreground">Origem: </dt>
          <dd className="inline">
            FIB-T {action.source.instrumentVersion} · {action.source.cohortLabel ?? "setor"} · fator {action.source.factorName} · leitura publicada em {formatDateBR(action.source.publishedAt)}
          </dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Dimensão IVO: </dt>
          <dd className="inline">
            {action.dimension.status === "mapping_pending"
              ? "mapeamento pendente — a ação se refere ao resultado nativo da FIB-T"
              : action.dimension.dimensionIds.join(", ")}
          </dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Responsável: </dt>
          <dd className="inline">{action.owner ? `${action.owner.roleLabel}${action.owner.isCurrentUser ? " (accountable: você)" : ""}` : "não definido"}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">Prazo: </dt>
          <dd className="inline">{action.dueOn ? <time dateTime={action.dueOn}>{formatIsoDateLong(action.dueOn)}</time> : "não definido"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline text-muted-foreground">Indicador de execução: </dt>
          <dd className="inline">
            {action.executionMetric
              ? `${action.executionMetric.label}: de ${action.executionMetric.baseline} para ${action.executionMetric.target} ${action.executionMetric.unit}`.trim()
              : "não definido"}
          </dd>
        </div>
      </dl>

      {planStatus === "draft" ? (
        <div>
          <h4 className="text-sm font-medium text-foreground">Responsável, prazo e indicador de execução</h4>
          <AccountabilityForm action={action} busy={busy} onSubmit={callbacks.onAccountability} />
        </div>
      ) : null}

      {planStatus === "active" ? (
        <div>
          <h4 className="text-sm font-medium text-foreground">Mudar estado</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {next.map((status) => (
              <button key={status} type="button" className={buttonSecondary} disabled={busy} onClick={() => callbacks.onStatus(action.id, status)}>
                {STATUS_LABEL[status]}
                <span className="sr-only"> — {action.title}</span>
              </button>
            ))}
          </div>
          {action.status === "concluida" ? (
            <p className="mt-2 text-xs text-muted-foreground">Concluir registra a execução — não comprova melhora do indicador.</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <EvidenceCard action={action} scope="execucao" records={action.evidence.execution} showForm={planStatus === "active"} busy={busy} today={today} onSubmit={callbacks.onEvidence} />
        <EvidenceCard action={action} scope="aprendizagem" records={action.evidence.learning} showForm={planStatus === "active"} busy={busy} today={today} onSubmit={callbacks.onEvidence} />
      </div>
      <div role="note" className="rounded-md border border-dashed border-muted-foreground/40 p-3 text-sm">
        <p className="font-medium text-foreground">Eficácia: não avaliada</p>
        <p className="mt-1 text-muted-foreground">{action.efficacy.reason}</p>
      </div>

      {action.timeline.length > 0 ? (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-muted-foreground">Histórico ({action.timeline.length})</summary>
          <ol className="mt-1 space-y-1 text-xs text-muted-foreground">
            {action.timeline.map((t) => (
              <li key={t.id}>
                {new Date(t.occurredAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} —{" "}
                {t.kind === "status_change" && t.toStatus
                  ? `estado: ${STATUS_LABEL[t.toStatus]}`
                  : t.kind === "evidence_recorded"
                    ? "registro de evidência/aprendizagem"
                    : t.kind}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}

export function FibtActionPlanSection({
  plan,
  busy,
  today,
  onActivate,
  callbacks,
}: {
  plan: FibtActionPlanView;
  busy: boolean;
  today: string;
  onActivate: (planId: string) => void;
  callbacks: ActionCallbacks;
}) {
  const headingId = `plano-${plan.id}`;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="font-serif text-xl text-foreground">
          Plano do ciclo {plan.cycleKeyCanonical ?? `${plan.cycleKey} (formato legado)`}
        </h2>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {plan.status === "draft" ? "Rascunho" : plan.status === "active" ? "Ativo" : "Encerrado"}
        </span>
      </div>
      {plan.status === "draft" ? (
        <div role="note" className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <p className="text-foreground">
            {plan.missingAccountability > 0
              ? `Falta definir responsável, prazo e indicador de execução em ${plan.missingAccountability} ação(ões) para ativar o plano.`
              : "Tudo definido. Ative o plano para começar a registrar execução."}
          </p>
          <button
            type="button"
            className={`${buttonPrimary} mt-2`}
            disabled={busy || plan.missingAccountability > 0}
            aria-disabled={busy || plan.missingAccountability > 0}
            onClick={() => onActivate(plan.id)}
          >
            Ativar plano
          </button>
        </div>
      ) : null}
      {plan.actions.map((action) => (
        <FibtActionCard key={action.id} action={action} planStatus={plan.status} busy={busy} today={today} callbacks={callbacks} />
      ))}
    </section>
  );
}
