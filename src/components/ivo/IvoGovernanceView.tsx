import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  GOVERNANCE_STATE_LABEL,
  GOVERNANCE_STATES,
  DECISION_ERROR_LABEL,
  canTransitionGovernance,
  type GovernanceEntry,
  type GovernanceState,
} from "@/engine/ivo/governance-decision";
import type { LoadGovernanceOutcome, PrepareGovernanceDecisionOutcome } from "@/lib/ivo/ivo-views";
import { Field, buttonPrimary, buttonSecondary, inputClass } from "./FibtActionLoop";

// Governança metodológica aplicada (R8): consulta das decisões D1–D10 e dos
// mapeamentos M1–M6, com estado, justificativa, fontes, critérios e efeito da
// pendência. Toda entrada nasce como PROPOSTA; o estado só muda por registro
// versionado no repositório. "Preparar decisão" só existe para a autoridade
// metodológica configurada no servidor e NÃO grava nada.

export type GovernanceView = Extract<LoadGovernanceOutcome, { ok: true }>;

export interface PrepareInput {
  entryId: string;
  toState: GovernanceState;
  owner: string | null;
  reviewer: string | null;
  evidence: string[];
  criteriaMet: string[];
  intendedUse: string | null;
}

const STATE_TONE: Record<GovernanceState, string> = {
  proposta: "bg-muted text-foreground",
  em_revisao: "bg-sky-500/20 text-foreground",
  aprovado_para_piloto: "bg-amber-500/25 text-foreground",
  validado_para_uso_definido: "bg-emerald-500/25 text-foreground",
  rejeitada: "bg-destructive/15 text-foreground",
  retirada: "bg-muted text-muted-foreground",
};

const NATURE_LABEL = { direta: "direta", complementar: "complementar", inadequada: "inadequada", insuficiente: "insuficiente" } as const;

const STATE_GLOSSARY: Array<{ state: GovernanceState; meaning: string }> = [
  { state: "proposta", meaning: "Material preparado para decisão. Não tem efeito no produto: nenhum número, mapeamento ou parecer depende dela." },
  { state: "em_revisao", meaning: "Responsável e revisor independentes foram designados e a análise está em curso. Ainda sem efeito no produto." },
  { state: "aprovado_para_piloto", meaning: "Uso experimental, delimitado e identificado como piloto. Não é validação científica." },
  { state: "validado_para_uso_definido", meaning: "Há evidência de validação para o uso declarado na aprovação — e somente para ele." },
];

export function StateBadge({ state }: { state: GovernanceState }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATE_TONE[state]}`}>{GOVERNANCE_STATE_LABEL[state]}</span>;
}

function List({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-foreground">{title}</p>
      <ul className="list-disc space-y-2 break-words pl-5 leading-relaxed text-muted-foreground">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function PrepareDecisionForm({
  entry,
  onPrepare,
}: {
  entry: GovernanceEntry;
  onPrepare: (input: PrepareInput) => Promise<PrepareGovernanceDecisionOutcome>;
}) {
  const targets = GOVERNANCE_STATES.filter((s) => canTransitionGovernance(entry.state, s));
  const [toState, setToState] = useState<GovernanceState | "">(targets[0] ?? "");
  const [owner, setOwner] = useState(entry.owner ?? "");
  const [reviewer, setReviewer] = useState(entry.reviewer ?? "");
  const [evidence, setEvidence] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [met, setMet] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [result, setResult] = useState<PrepareGovernanceDecisionOutcome | { ok: false; category: "network"; error: string } | null>(null);
  const p = `gov-${entry.id}`;

  if (targets.length === 0) {
    return <p className="text-sm text-muted-foreground">Esta entrada está em estado final; não há transição possível.</p>;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || toState === "") return;
    inFlight.current = true;
    setPending(true);
    try {
      setResult(
        await onPrepare({
          entryId: entry.id,
          toState,
          owner: owner.trim() || null,
          reviewer: reviewer.trim() || null,
          evidence: evidence.split("\n").map((l) => l.trim()).filter(Boolean),
          criteriaMet: met,
          intendedUse: intendedUse.trim() || null,
        }),
      );
    } catch {
      setResult({ ok: false, category: "network", error: "Falha de comunicação com o servidor. Nada foi preparado." });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit} aria-label={`Preparar decisão de ${entry.id}`}>
      <Field id={`${p}-para`} label="Novo estado">
        <select id={`${p}-para`} className={inputClass} value={toState} onChange={(e) => setToState(e.target.value as GovernanceState)}>
          {targets.map((s) => (
            <option key={s} value={s}>
              {GOVERNANCE_STATE_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${p}-resp`} label="Responsável metodológico">
          <input id={`${p}-resp`} maxLength={80} className={inputClass} value={owner} onChange={(e) => setOwner(e.target.value)} />
        </Field>
        <Field id={`${p}-rev`} label="Revisor independente" hint="Deve ser diferente do responsável.">
          <input id={`${p}-rev`} aria-describedby={`${p}-rev-hint`} maxLength={80} className={inputClass} value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
        </Field>
      </div>
      <Field id={`${p}-evid`} label="Evidências da decisão (uma por linha)">
        <textarea id={`${p}-evid`} rows={2} className={`${inputClass} min-h-16 py-2`} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
      </Field>
      {toState === "validado_para_uso_definido" ? (
        <Field id={`${p}-uso`} label="Uso definido coberto pela validação">
          <textarea id={`${p}-uso`} rows={2} maxLength={500} className={`${inputClass} min-h-16 py-2`} value={intendedUse} onChange={(e) => setIntendedUse(e.target.value)} />
        </Field>
      ) : null}
      <fieldset className="space-y-1 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-medium text-foreground">Critérios de aprovação atendidos</legend>
        {entry.approvalCriteria.map((c, i) => (
          <label key={c} className="flex min-h-11 items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              id={`${p}-crit-${i}`}
              checked={met.includes(c)}
              onChange={(e) => setMet((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))}
            />
            {c}
          </label>
        ))}
      </fieldset>
      <button type="submit" className={buttonPrimary} aria-disabled={pending}>
        {pending ? "Preparando…" : "Preparar decisão"}
      </button>
      <div role="status" aria-live="polite" className="text-sm">
        {result && result.ok && result.accepted ? (
          <div className="space-y-2 rounded-md border border-border p-3">
            <p className="font-medium text-foreground">
              Decisão preparada (não gravada): {result.audit.from} → {result.audit.to}
              {result.audit.test ? " · identidade de TESTE" : ""}
            </p>
            <p className="text-muted-foreground">{result.note}</p>
            <pre className="max-h-64 overflow-auto rounded bg-muted/40 p-2 text-xs text-foreground">{JSON.stringify(result.entry, null, 2)}</pre>
          </div>
        ) : null}
      </div>
      {result && result.ok && !result.accepted ? (
        <div role="alert" className="text-sm font-medium text-destructive">
          <p>{result.message}</p>
          {result.errors.length > 0 ? (
            <ul className="list-disc pl-5">
              {result.errors.map((code) => (
                <li key={code}>{DECISION_ERROR_LABEL[code] ?? code}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {result && !result.ok ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {result.error}
        </p>
      ) : null}
    </form>
  );
}

function EntryDetails({ entry, canApprove, onPrepare }: { entry: GovernanceEntry; canApprove: boolean; onPrepare: (input: PrepareInput) => Promise<PrepareGovernanceDecisionOutcome> }) {
  return (
    <div className="space-y-3 px-3 pb-3 text-sm">
      <p className="text-foreground">
        <span className="font-medium">Proposta: </span>
        {entry.proposal}
      </p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Justificativa: </span>
        {entry.rationale}
      </p>
      <p className="text-foreground">
        <span className="font-medium">Recomendação: </span>
        {entry.recommendation}
      </p>
      <List title="Alternativas consideradas" items={entry.alternatives} />
      {entry.mapping ? (
        <p className="text-muted-foreground">
          Mapeamento: lente {entry.mapping.lens}
          {entry.mapping.sourceConstructId ? ` · construto ${entry.mapping.sourceConstructId}` : ""} → {entry.mapping.dimension ?? "nenhuma dimensão"} ({NATURE_LABEL[entry.mapping.nature]})
        </p>
      ) : null}
      <div>
        <p className="font-medium text-foreground">Fontes</p>
        <ul className="list-disc space-y-2 break-words pl-5 leading-relaxed text-muted-foreground">
          {entry.sources.map((s) => (
            <li key={s.ref}>
              {s.ref}
              {s.kind === "externa_a_verificar" ? <span className="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-foreground">externa, a verificar</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <List title="Limitações" items={entry.limitations} />
      <p className="text-muted-foreground">
        Responsável: <span className="text-foreground">{entry.owner ?? "não designado"}</span> · Revisor: <span className="text-foreground">{entry.reviewer ?? "não designado"}</span>
      </p>
      <List title="Critérios para aprovar" items={entry.approvalCriteria} />
      <div>
        <p className="font-medium text-foreground">Efeito enquanto estiver pendente</p>
        <ul className="list-disc space-y-2 break-words pl-5 leading-relaxed text-muted-foreground">
          {entry.effects.map((e) => (
            <li key={`${e.feature}:${e.effect}`}>
              <span className="text-foreground">{e.feature}:</span> {e.effect}
            </li>
          ))}
        </ul>
      </div>
      {entry.dependsOn.length > 0 ? <p className="text-muted-foreground">Depende de: {entry.dependsOn.join(", ")}</p> : null}
      {entry.approval ? (
        <p className="text-foreground">
          Decidida em {entry.approval.decidedAt.split("-").reverse().join("/")} por {entry.approval.decidedBy}
          {entry.approval.test ? " (identidade de TESTE)" : ""}.
        </p>
      ) : (
        <p className="text-muted-foreground">Sem decisão registrada.</p>
      )}
      <div className="rounded-md border border-dashed border-muted-foreground/40 p-3">
        <p className="mb-2 font-medium text-foreground">Decisão</p>
        {canApprove ? (
          <PrepareDecisionForm entry={entry} onPrepare={onPrepare} />
        ) : (
          <>
            <button type="button" className={buttonSecondary} aria-disabled="true" onClick={(e) => e.preventDefault()}>
              Preparar decisão<span className="sr-only"> de {entry.id} (indisponível)</span>
            </button>
            <p className="mt-2 text-muted-foreground" role="note">
              Indisponível: veja o motivo no painel “Quem pode decidir”. A consulta e a comparação das propostas continuam disponíveis.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

type KindFilter = "todas" | "decision" | "mapping";

export function IvoGovernanceView({
  view,
  onPrepare,
}: {
  view: GovernanceView;
  onPrepare: (input: PrepareInput) => Promise<PrepareGovernanceDecisionOutcome>;
}) {
  const [kind, setKind] = useState<KindFilter>("todas");
  const [state, setState] = useState<GovernanceState | "todos">("todos");
  const entries = useMemo(
    () => view.entries.filter((e) => (kind === "todas" || e.kind === kind) && (state === "todos" || e.state === state)),
    [view.entries, kind, state],
  );
  const gate = view.efficacyGate;
  const anyApproved = view.counts.aprovado_para_piloto + view.counts.validado_para_uso_definido > 0;

  return (
    <div className="min-w-0 space-y-6 break-words">
      <section aria-label="Resumo da governança" className="space-y-2 rounded-md border border-border bg-muted/20 p-4">
        <h2 className="text-base font-semibold text-foreground">Situação do registro metodológico</h2>
        <p className="text-sm text-muted-foreground">
          Registro canônico versão {view.registryVersion}. {view.authorityPolicy}
        </p>
        <ul className="flex flex-wrap gap-2 text-sm">
          {GOVERNANCE_STATES.map((s) => (
            <li key={s} className="flex items-center gap-2 rounded-md border border-border px-3 py-1">
              <StateBadge state={s} />
              <span className="text-foreground">{view.counts[s]}</span>
            </li>
          ))}
        </ul>
        {!anyApproved ? (
          <p className="text-sm text-foreground" role="note">
            Nenhuma decisão ou mapeamento foi aprovado. Por isso nenhuma dimensão recebe valor e nenhum índice composto é calculado.
          </p>
        ) : null}
      </section>

      <section aria-label="Quem pode decidir" className="space-y-1 rounded-md border border-border p-4 text-sm">
        <h2 className="text-base font-semibold text-foreground">Quem pode decidir</h2>
        <p className="text-muted-foreground">
          A aprovação é da autoridade metodológica configurada no servidor. O papel de administrador de uma organização vale só dentro dela e não aprova método global.
        </p>
        <p className="text-foreground">
          {view.authority.canApprove
            ? "Sua sessão é da autoridade metodológica: você pode preparar decisões."
            : view.authority.configured
              ? "Há autoridade configurada, mas sua sessão não é dela."
              : "Nenhuma autoridade metodológica configurada neste ambiente."}
        </p>
        {view.authority.reason ? <p className="text-muted-foreground">Aprovação indisponível: {view.authority.reason}</p> : null}
        <p className="text-xs text-muted-foreground">Preparar uma decisão não grava nada: o resultado é revisto e registrado por commit no repositório.</p>
      </section>

      <section aria-label="Parâmetros de eficácia (D9)" className="space-y-1 rounded-md border border-border p-4 text-sm">
        <h2 className="text-base font-semibold text-foreground">Efeito sobre o protocolo de eficácia (D9)</h2>
        <p className="text-foreground">
          Decisão D9: <StateBadge state={gate.state} />
          {gate.source === "teste_sintetico" ? <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs">TESTE SINTÉTICO — ambiente local descartável</span> : null}
        </p>
        <p className="text-muted-foreground">
          {gate.conclusiveAllowed
            ? "Pareceres conclusivos de eficácia estão liberados neste ambiente."
            : (gate.reason ?? "Pareceres conclusivos de eficácia aguardam a decisão D9. Enquanto isso, só é possível registrar protocolos, observações e pareceres inconclusivos.")}
        </p>
      </section>

      <section aria-label="Estados de uma decisão" className="rounded-md border border-border p-4 text-sm">
        <h2 className="text-base font-semibold text-foreground">O que cada estado significa</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 [&>div]:min-w-0 [&>div]:rounded-lg [&>div]:border [&>div]:border-border [&>div]:bg-muted/20 [&>div]:p-3">
          {STATE_GLOSSARY.map((g) => (
            <div key={g.state}>
              <dt>
                <StateBadge state={g.state} />
              </dt>
              <dd className="mt-1 text-muted-foreground">{g.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Decisões e mapeamentos" className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field id="gov-filtro-tipo" label="Mostrar">
            <select id="gov-filtro-tipo" className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as KindFilter)}>
              <option value="todas">Decisões e mapeamentos</option>
              <option value="decision">Decisões (D1–D10)</option>
              <option value="mapping">Mapeamentos FIB-T → dimensão (M1–M6)</option>
            </select>
          </Field>
          <Field id="gov-filtro-estado" label="Estado">
            <select id="gov-filtro-estado" className={inputClass} value={state} onChange={(e) => setState(e.target.value as GovernanceState | "todos")}>
              <option value="todos">Todos</option>
              {GOVERNANCE_STATES.map((s) => (
                <option key={s} value={s}>
                  {GOVERNANCE_STATE_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {entries.length} de {view.entries.length} entradas.
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma entrada neste filtro.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id}>
                <details className="rounded-md border border-border">
                  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm text-foreground">
                    <span className="font-semibold">{entry.id}</span>
                    <span>{entry.title}</span>
                    <StateBadge state={entry.state} />
                    <span className="text-xs text-muted-foreground">versão {entry.version}</span>
                  </summary>
                  <EntryDetails entry={entry} canApprove={view.authority.canApprove} onPrepare={onPrepare} />
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
