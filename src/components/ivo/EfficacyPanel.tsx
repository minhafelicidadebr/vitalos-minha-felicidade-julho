import { useEffect, useRef, useState, type FormEvent } from "react";
import { Route, FilePenLine, ListChecks, Info } from "lucide-react";
import type { EvidenceGrade, ObservedChange } from "@/engine/ivo/efficacy-protocol";
import { GOVERNANCE_STATE_LABEL, type GovernanceState } from "@/engine/ivo/governance-decision";
import { efficacyIssueLabel } from "@/lib/ivo/efficacy-labels";
import { formatIsoDateLong } from "@/lib/ivo/local-date";
import type { EfficacyGovernanceView, EfficacyItemView, EfficacyProtocolFields, FibtActionView } from "@/lib/ivo/ivo-views";
import { Field, buttonPrimary, buttonSecondary, inputClass } from "./FibtActionLoop";

// Protocolo de eficácia (C8) no cartão da ação. Separa SEMPRE quatro coisas:
//   execução (a ação aconteceu) · mudança observada · alcance da meta · atribuição causal.
// Concluir a ação NÃO cria nem altera a avaliação, e nada aqui toca o IVO.
// Protocolo incompleto fica em rascunho; parecer conclusivo depende da decisão D9.

export interface PanelResult {
  ok: boolean;
  message: string;
}
export interface VerdictFormInput {
  verdict: "meta_atingida" | "meta_nao_atingida" | "inconclusiva";
  evidenceGrade: EvidenceGrade;
  attribution: { status: "nao_avaliada" | "nao_sustentada" | "sustentada_por_desenho"; design?: string };
  reason: string;
  limitations: string[];
  qualitativeTargetReached: boolean | null;
}
export interface EfficacyCallbacks {
  saveDraft: (itemId: string, fields: Partial<EfficacyProtocolFields>, useSourceAsBaseline: boolean) => Promise<PanelResult>;
  startRevision: (itemId: string) => Promise<PanelResult>;
  register: (itemId: string) => Promise<PanelResult>;
  observe: (itemId: string, input: { observedOn: string; value: number; note?: string }) => Promise<PanelResult>;
  verdict: (itemId: string, input: VerdictFormInput) => Promise<PanelResult>;
}

const VERDICT_LABEL = { meta_atingida: "Meta atingida", meta_nao_atingida: "Meta não atingida", inconclusiva: "Avaliação inconclusiva" } as const;
const GRADE_LABEL: Record<EvidenceGrade, string> = {
  descritiva: "Descritiva",
  pre_pos: "Pré/pós (antes e depois)",
  comparacao_referencia: "Comparação com referência",
  desenho_causal: "Desenho causal",
};
const CHANGE_LABEL: Record<ObservedChange, string> = {
  melhorou: "melhorou",
  piorou: "piorou",
  sem_mudanca: "sem mudança",
  nao_comparavel: "não comparável",
};
const ATTRIBUTION_LABEL = { nao_avaliada: "não avaliada", nao_sustentada: "não sustentada", sustentada_por_desenho: "sustentada por desenho" } as const;

const toNumber = (v: string): number | null | "invalid" => {
  const t = v.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : "invalid";
};
const orNull = (v: string): string | null => (v.trim() === "" ? null : v.trim());

interface DraftForm {
  objective: string; indicatorLabel: string; indicatorKind: string; indicatorOrigin: string; unit: string; direction: string;
  baselineObservedOn: string; baselinePopulation: string; baselineSource: string; baselineValue: string; useSourceBaseline: boolean;
  targetKind: string; targetValue: string; targetCriterion: string; meaningfulDifference: string; windowStart: string; windowEnd: string;
  source: string; sameCohort: boolean; sameInstrumentVersion: boolean; sameCalculationVersion: boolean;
  responsibleRole: string; reviewerRole: string; limitations: string;
}
function formFrom(d: EfficacyItemView["draft"]): DraftForm {
  return {
    objective: d?.objective ?? "", indicatorLabel: d?.indicatorLabel ?? "", indicatorKind: d?.indicatorKind ?? "", indicatorOrigin: d?.indicatorOrigin ?? "",
    unit: d?.unit ?? "", direction: d?.direction ?? "", baselineObservedOn: d?.baselineObservedOn ?? "", baselinePopulation: d?.baselinePopulation ?? "",
    baselineSource: d?.baselineSource ?? "", baselineValue: d?.baselineValue != null ? String(d.baselineValue) : "", useSourceBaseline: !d?.baselineRef,
    targetKind: d?.targetKind ?? "", targetValue: d?.targetValue != null ? String(d.targetValue) : "", targetCriterion: d?.targetCriterion ?? "",
    meaningfulDifference: d?.meaningfulDifference != null ? String(d.meaningfulDifference) : "", windowStart: d?.windowStart ?? "", windowEnd: d?.windowEnd ?? "",
    source: d?.source ?? "", sameCohort: d?.comparisonRule?.sameCohort ?? false, sameInstrumentVersion: d?.comparisonRule?.sameInstrumentVersion ?? false,
    sameCalculationVersion: d?.comparisonRule?.sameCalculationVersion ?? false, responsibleRole: d?.responsibleRole ?? "", reviewerRole: d?.reviewerRole ?? "",
    limitations: (d?.limitations ?? []).join("\n"),
  };
}

function useGuardedAction() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  async function run(fn: () => Promise<PanelResult>): Promise<boolean> {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const r = await fn();
      setFeedback({ tone: r.ok ? "ok" : "error", text: r.message });
      return r.ok;
    } catch {
      setFeedback({ tone: "error", text: "Falha de comunicação com o servidor. Nada foi confirmado; o texto foi mantido." });
      return false;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return { pending, feedback, run, clear: () => setFeedback(null) };
}

function Feedback({ feedback }: { feedback: { tone: "ok" | "error"; text: string } | null }) {
  return (
    <>
      <div role="status" aria-live="polite" className="min-h-5 text-sm">
        {feedback?.tone === "ok" ? <p className="text-emerald-700 dark:text-emerald-300">{feedback.text}</p> : null}
      </div>
      {feedback?.tone === "error" ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {feedback.text}
        </p>
      ) : null}
    </>
  );
}

function ProtocolDraftForm({ action, item, busy, callbacks }: { action: FibtActionView; item: EfficacyItemView | null; busy: boolean; callbacks: EfficacyCallbacks }) {
  const draft = item?.draft ?? null;
  const [f, setF] = useState<DraftForm>(() => formFrom(draft));
  const [localError, setLocalError] = useState<string | null>(null);
  const { pending, feedback, run, clear } = useGuardedAction();
  const key = `${draft?.id ?? "novo"}:${draft?.updatedAt ?? ""}`;
  useEffect(() => {
    setF(formFrom(draft));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const p = `efic-${action.id}`;
  const set = <K extends keyof DraftForm>(k: K, v: DraftForm[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setLocalError(null);
    clear();
  };
  const published = f.indicatorOrigin === "leitura_publicada";
  const blocked = busy || pending;

  function collect(): { fields: Partial<EfficacyProtocolFields>; useSource: boolean } | null {
    const base = toNumber(f.baselineValue);
    const target = toNumber(f.targetValue);
    const diff = toNumber(f.meaningfulDifference);
    if (base === "invalid" || target === "invalid" || diff === "invalid") {
      setLocalError("Use apenas números nos campos de valor, meta e diferença mínima.");
      return null;
    }
    if (typeof diff === "number" && diff < 0) {
      setLocalError("A diferença mínima não pode ser negativa.");
      return null;
    }
    const rule = f.indicatorOrigin === "leitura_publicada" ? { sameCohort: true, sameInstrumentVersion: true, sameCalculationVersion: true } : { sameCohort: f.sameCohort, sameInstrumentVersion: f.sameInstrumentVersion, sameCalculationVersion: f.sameCalculationVersion };
    return {
      useSource: published && (f.useSourceBaseline || !draft?.baselineRef),
      fields: {
        objective: orNull(f.objective), indicatorLabel: orNull(f.indicatorLabel),
        indicatorKind: (orNull(f.indicatorKind) as EfficacyProtocolFields["indicatorKind"]), indicatorOrigin: (orNull(f.indicatorOrigin) as EfficacyProtocolFields["indicatorOrigin"]),
        unit: orNull(f.unit), direction: (orNull(f.direction) as EfficacyProtocolFields["direction"]),
        baselineObservedOn: orNull(f.baselineObservedOn), baselinePopulation: orNull(f.baselinePopulation), baselineSource: orNull(f.baselineSource),
        baselineValue: published ? null : base, targetKind: (orNull(f.targetKind) as EfficacyProtocolFields["targetKind"]), targetValue: f.targetKind === "numerico" ? target : null,
        targetCriterion: f.targetKind === "qualitativo" ? orNull(f.targetCriterion) : null, meaningfulDifference: diff,
        windowStart: orNull(f.windowStart), windowEnd: orNull(f.windowEnd), source: orNull(f.source), comparisonRule: rule,
        responsibleRole: orNull(f.responsibleRole), reviewerRole: orNull(f.reviewerRole),
        limitations: f.limitations.split("\n").map((l) => l.trim()).filter(Boolean),
      },
    };
  }
  async function save(e?: FormEvent) {
    e?.preventDefault();
    const c = collect();
    if (!c) return;
    await run(() => callbacks.saveDraft(action.id, c.fields, c.useSource));
  }
  async function register() {
    const c = collect();
    if (!c) return;
    const saved = await run(() => callbacks.saveDraft(action.id, c.fields, c.useSource));
    if (saved) await run(() => callbacks.register(action.id));
  }

  const issues = item?.registrationIssues ?? [];
  const sel = (id: string, label: string, value: string, onChange: (v: string) => void, options: Array<[string, string]>, hint?: string) => (
    <Field id={`${p}-${id}`} label={label} hint={hint}>
      <select id={`${p}-${id}`} aria-describedby={hint ? `${p}-${id}-hint` : undefined} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecione…</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </Field>
  );
  const txt = (id: string, label: string, value: string, onChange: (v: string) => void, opts: { hint?: string; type?: string; max?: number } = {}) => (
    <Field id={`${p}-${id}`} label={label} hint={opts.hint}>
      <input id={`${p}-${id}`} aria-describedby={opts.hint ? `${p}-${id}-hint` : undefined} type={opts.type ?? "text"} maxLength={opts.max} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );

  return (
    <form className="min-w-0 space-y-5 break-words" onSubmit={save} aria-label="Protocolo de avaliação em rascunho">
      <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold"><Route aria-hidden="true" className="size-4 shrink-0 text-primary" />Roteiro para preparar a avaliação</h4>
      <ol className="grid gap-2 text-sm leading-relaxed sm:grid-cols-2 [&>li]:rounded-md [&>li]:border [&>li]:border-border [&>li]:bg-background/60 [&>li]:p-3">
        <li>1. Defina o objetivo e o indicador.</li>
        <li>2. Identifique a linha de base e a meta.</li>
        <li>3. Combine a janela, a fonte e a comparação.</li>
        <li>4. Revise os papéis, as limitações e as pendências.</li>
      </ol>
      <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"><Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />O roteiro orienta o preenchimento; não indica progresso salvo nem comprova eficácia.</p>
      </div>
      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold"><FilePenLine aria-hidden="true" className="size-4 shrink-0 text-primary" />Estado do documento</h4>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Rascunho {draft ? `(revisão ${draft.revision})` : "novo"}: pode ficar incompleto. Ele só vale como protocolo depois de registrado; registrado, não pode ser alterado (nova revisão).
      </p>
      </div>
      <Field id={`${p}-objetivo`} label="Objetivo da avaliação" hint="O que a ação pretende mudar. Sem nomes de pessoas.">
        <textarea id={`${p}-objetivo`} aria-describedby={`${p}-objetivo-hint`} rows={2} maxLength={500} className={`${inputClass} min-h-16 py-2`} value={f.objective} onChange={(e) => set("objective", e.target.value)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {txt("indicador", "Indicador", f.indicatorLabel, (v) => set("indicatorLabel", v), { max: 120 })}
        {txt("unidade", "Unidade", f.unit, (v) => set("unit", v), { max: 40 })}
        {sel("tipo", "Tipo de indicador", f.indicatorKind, (v) => set("indicatorKind", v), [["resultado", "Resultado (mudança a observar)"], ["execucao", "Execução (entrega)"]], "Execução mede entrega e nunca é apresentada como melhora de resultado.")}
        {sel("origem", "Origem da medida", f.indicatorOrigin, (v) => set("indicatorOrigin", v), [["leitura_publicada", "Leitura publicada (só referência)"], ["medida_da_organizacao", "Medida da organização (valor informado)"]])}
        {sel("direcao", "Direção desejada", f.direction, (v) => set("direction", v), [["aumentar", "Aumentar"], ["diminuir", "Diminuir"]])}
      </div>
      <fieldset className="space-y-3 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-medium text-foreground">Linha de base</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {txt("base-data", "Data da linha de base", f.baselineObservedOn, (v) => set("baselineObservedOn", v), { type: "date", hint: f.baselineObservedOn ? `Data selecionada: ${formatIsoDateLong(f.baselineObservedOn)}` : "Deve ser anterior ao início da janela." })}
          {txt("base-populacao", "População", f.baselinePopulation, (v) => set("baselinePopulation", v), { max: 200 })}
          {txt("base-fonte", "Fonte da linha de base", f.baselineSource, (v) => set("baselineSource", v), { max: 200 })}
          {published ? (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Baseline por referência</p>
              <p>{draft?.baselineRef ? `Leitura publicada de ${draft.baselineRef.cohortKey} (${draft.baselineRef.cycleKey}), instrumento ${draft.baselineRef.instrumentVersion}. O valor protegido não é copiado.` : "A referência será derivada da leitura publicada que originou esta ação. O valor protegido não é copiado."}</p>
              {draft?.baselineRef ? (
                <label className="mt-1 flex min-h-11 items-center gap-2 text-foreground">
                  <input type="checkbox" checked={f.useSourceBaseline} onChange={(e) => set("useSourceBaseline", e.target.checked)} /> Reaplicar a referência da leitura de origem
                </label>
              ) : null}
            </div>
          ) : (
            txt("base-valor", "Valor da linha de base", f.baselineValue, (v) => set("baselineValue", v), { hint: "Valor informado pela organização (não é leitura protegida)." })
          )}
        </div>
      </fieldset>
      <fieldset className="space-y-3 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-medium text-foreground">Meta e diferença mínima</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {sel("meta-tipo", "Tipo de meta", f.targetKind, (v) => set("targetKind", v), [["numerico", "Numérica"], ["qualitativo", "Qualitativa (critério descrito)"]], "A meta é uma decisão de gestão, não uma faixa interpretativa.")}
          {f.targetKind === "qualitativo"
            ? txt("meta-criterio", "Critério qualitativo", f.targetCriterion, (v) => set("targetCriterion", v), { max: 500 })
            : txt("meta-valor", "Valor da meta", f.targetValue, (v) => set("targetValue", v))}
          {txt("dif-minima", "Diferença mínima (opcional)", f.meaningfulDifference, (v) => set("meaningfulDifference", v), { hint: "Definida por você; não há valor padrão. Sem ela, a mudança é só descritiva." })}
        </div>
      </fieldset>
      <fieldset className="space-y-3 rounded-md border border-border p-3">
        <legend className="px-1 text-sm font-medium text-foreground">Janela, fonte e comparação</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {txt("janela-ini", "Início da janela de observação", f.windowStart, (v) => set("windowStart", v), { type: "date", hint: f.windowStart ? `Data selecionada: ${formatIsoDateLong(f.windowStart)}` : undefined })}
          {txt("janela-fim", "Fim da janela de observação", f.windowEnd, (v) => set("windowEnd", v), { type: "date", hint: f.windowEnd ? `Data selecionada: ${formatIsoDateLong(f.windowEnd)}` : undefined })}
          {txt("fonte", "Fonte da medida posterior", f.source, (v) => set("source", v), { max: 200 })}
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">Regra de comparação</p>
          {(
            [
              ["sameCohort", "Mesmo recorte (setor)"],
              ["sameInstrumentVersion", "Mesma versão do instrumento"],
              ["sameCalculationVersion", "Mesma versão do cálculo"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex min-h-11 items-center gap-2 text-foreground">
              <input type="checkbox" checked={published ? true : f[k]} disabled={published} onChange={(e) => set(k, e.target.checked)} /> {label}
            </label>
          ))}
          <p className="text-xs text-muted-foreground">Só leituras publicadas (k≥5, sem supressão) entram na comparação — isso não é configurável.{published ? " Para leitura publicada, as três condições são obrigatórias." : ""}</p>
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        {txt("resp", "Papel responsável", f.responsibleRole, (v) => set("responsibleRole", v), { max: 80 })}
        {txt("rev", "Papel revisor", f.reviewerRole, (v) => set("reviewerRole", v), { max: 80, hint: "Deve ser diferente do responsável." })}
      </div>
      <Field id={`${p}-limit`} label="Limitações (uma por linha)" hint="Registre o que a avaliação não consegue mostrar.">
        <textarea id={`${p}-limit`} aria-describedby={`${p}-limit-hint`} rows={2} className={`${inputClass} min-h-16 py-2`} value={f.limitations} onChange={(e) => set("limitations", e.target.value)} />
      </Field>
      {issues.length > 0 ? (
        <div role="note" className="space-y-3 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-4 text-sm leading-relaxed">
          <p className="flex items-center gap-2 font-semibold text-foreground"><ListChecks aria-hidden="true" className="size-4 shrink-0 text-primary" />Para registrar, falta:</p>
          <ul className="grid list-disc gap-x-6 gap-y-2 pl-5 text-muted-foreground sm:grid-cols-2">
            {issues.map((code) => (
              <li key={code}>{efficacyIssueLabel(code)}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">Enquanto faltar algo, o protocolo permanece em rascunho — e isso não impede salvá-lo.</p>
        </div>
      ) : null}
      {localError ? <p role="alert" className="text-sm font-medium text-destructive">{localError}</p> : null}
      <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm leading-relaxed text-muted-foreground">Salvar preserva o rascunho incompleto. Registrar cria o protocolo para acompanhamento; não emite um parecer de eficácia.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="submit" className={buttonSecondary} aria-disabled={blocked}>
          {pending ? "Salvando…" : "Salvar rascunho"}
        </button>
        <button type="button" className={buttonPrimary} aria-disabled={blocked} onClick={() => void register()}>
          Registrar protocolo
        </button>
      </div>
      </div>
      <Feedback feedback={feedback} />
    </form>
  );
}

function ObservationForm({ action, item, today, busy, callbacks }: { action: FibtActionView; item: EfficacyItemView; today: string; busy: boolean; callbacks: EfficacyCallbacks }) {
  const reg = item.registered!;
  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { pending, feedback, run, clear } = useGuardedAction();
  const p = `obs-${action.id}`;
  if (reg.indicatorOrigin === "leitura_publicada") {
    return (
      <p className="text-sm text-muted-foreground" role="note">
        Observação sobre leitura publicada de outro ciclo ainda não está disponível: a resolução protegida do valor não foi implementada. Nada é copiado nem estimado.
      </p>
    );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = toNumber(value);
    if (n === null || n === "invalid") {
      setError("Informe o valor observado como número.");
      return;
    }
    const ok = await run(() => callbacks.observe(action.id, { observedOn: date, value: n, note: note.trim() || undefined }));
    if (ok) {
      setValue("");
      setNote("");
    }
  }
  return (
    <form className="space-y-2" onSubmit={submit} aria-label="Registrar observação">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${p}-data`} label="Data da observação" hint={date ? `Data selecionada: ${formatIsoDateLong(date)}` : undefined}>
          <input id={`${p}-data`} aria-describedby={`${p}-data-hint`} type="date" min={reg.windowStart ?? undefined} max={today < (reg.windowEnd ?? "9999") ? today : (reg.windowEnd ?? today)} className={inputClass} value={date} required onChange={(e) => { setDate(e.target.value); clear(); }} />
        </Field>
        <Field id={`${p}-valor`} label={`Valor observado (${reg.unit ?? "unidade"})`}>
          <input id={`${p}-valor`} inputMode="decimal" className={inputClass} value={value} required onChange={(e) => { setValue(e.target.value); setError(null); clear(); }} />
        </Field>
      </div>
      <Field id={`${p}-nota`} label="Nota (opcional)">
        <input id={`${p}-nota`} maxLength={500} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error ? <p role="alert" className="text-sm font-medium text-destructive">{error}</p> : null}
      <button type="submit" className={buttonSecondary} aria-disabled={busy || pending}>
        {pending ? "Registrando…" : "Registrar observação"}
      </button>
      <Feedback feedback={feedback} />
    </form>
  );
}

function VerdictForm({ action, item, governance, busy, callbacks }: { action: FibtActionView; item: EfficacyItemView; governance: EfficacyGovernanceView; busy: boolean; callbacks: EfficacyCallbacks }) {
  const reg = item.registered!;
  const [verdict, setVerdict] = useState<VerdictFormInput["verdict"]>("inconclusiva");
  const [grade, setGrade] = useState<EvidenceGrade>("descritiva");
  const [attr, setAttr] = useState<"nao_avaliada" | "nao_sustentada" | "sustentada_por_desenho">("nao_avaliada");
  const [design, setDesign] = useState("");
  const [reason, setReason] = useState("");
  const [limitations, setLimitations] = useState("");
  const [qual, setQual] = useState<"" | "sim" | "nao">("");
  const { pending, feedback, run, clear } = useGuardedAction();
  const p = `ver-${action.id}`;
  const a = item.assessment;
  async function submit(e: FormEvent) {
    e.preventDefault();
    await run(() =>
      callbacks.verdict(action.id, {
        verdict,
        evidenceGrade: grade,
        attribution: { status: attr, ...(attr === "sustentada_por_desenho" ? { design: design.trim() } : {}) },
        reason: reason.trim(),
        limitations: limitations.split("\n").map((l) => l.trim()).filter(Boolean),
        qualitativeTargetReached: qual === "" ? null : qual === "sim",
      }),
    );
  }
  return (
    <form className="space-y-2" onSubmit={submit} aria-label="Emitir parecer de eficácia">
      {a ? (
        <p className="text-sm text-muted-foreground" role="note">
          Cálculo que o servidor usará: mudança observada <strong className="text-foreground">{CHANGE_LABEL[a.observedChange]}</strong>
          {a.changeIsDescriptiveOnly ? " (apenas descritiva: o protocolo não define diferença mínima)" : ""}; meta{" "}
          <strong className="text-foreground">{a.targetReached === null ? "não calculável" : a.targetReached ? "atingida" : "não atingida"}</strong>.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground" role="note">Sem observação comparável: só é possível emitir parecer inconclusivo.</p>
      )}
      {!governance.conclusiveAllowed ? (
        <p className="text-sm text-muted-foreground" role="note">
          Parecer conclusivo indisponível: a decisão D9 está em “{governance.state === "proposta" ? "proposta" : governance.state}”. Só “inconclusiva” é aceita.
        </p>
      ) : governance.source === "teste_sintetico" ? (
        <p className="text-sm font-medium text-foreground" role="note">Governança D9 de TESTE SINTÉTICO (ambiente local): o parecer será identificado como teste.</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${p}-parecer`} label="Parecer">
          <select id={`${p}-parecer`} className={inputClass} value={verdict} onChange={(e) => { setVerdict(e.target.value as typeof verdict); clear(); }}>
            <option value="inconclusiva">Inconclusiva</option>
            <option value="meta_atingida" disabled={!governance.conclusiveAllowed}>Meta atingida</option>
            <option value="meta_nao_atingida" disabled={!governance.conclusiveAllowed}>Meta não atingida</option>
          </select>
        </Field>
        <Field id={`${p}-grau`} label="Grau de evidência">
          <select id={`${p}-grau`} className={inputClass} value={grade} onChange={(e) => setGrade(e.target.value as EvidenceGrade)}>
            {(Object.keys(GRADE_LABEL) as EvidenceGrade[]).map((g) => (
              <option key={g} value={g}>{GRADE_LABEL[g]}</option>
            ))}
          </select>
        </Field>
        <Field id={`${p}-atrib`} label="Atribuição causal" hint="Padrão: não avaliada. Exige desenho descrito.">
          <select id={`${p}-atrib`} aria-describedby={`${p}-atrib-hint`} className={inputClass} value={attr} onChange={(e) => setAttr(e.target.value as typeof attr)}>
            <option value="nao_avaliada">Não avaliada</option>
            <option value="nao_sustentada">Não sustentada</option>
            <option value="sustentada_por_desenho">Sustentada por desenho</option>
          </select>
        </Field>
        {reg.targetKind === "qualitativo" ? (
          <Field id={`${p}-qual`} label="Meta qualitativa atingida?">
            <select id={`${p}-qual`} className={inputClass} value={qual} onChange={(e) => setQual(e.target.value as typeof qual)}>
              <option value="">Não declarar</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </Field>
        ) : null}
      </div>
      {attr === "sustentada_por_desenho" ? (
        <Field id={`${p}-desenho`} label="Desenho que sustenta a atribuição">
          <textarea id={`${p}-desenho`} rows={2} maxLength={1000} className={`${inputClass} min-h-16 py-2`} value={design} onChange={(e) => setDesign(e.target.value)} />
        </Field>
      ) : null}
      <Field id={`${p}-motivo`} label={verdict === "inconclusiva" ? "Motivo (obrigatório)" : "Observações do revisor (opcional)"}>
        <textarea id={`${p}-motivo`} rows={2} maxLength={1000} className={`${inputClass} min-h-16 py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Field id={`${p}-lim`} label="Limitações (uma por linha)">
        <textarea id={`${p}-lim`} rows={2} className={`${inputClass} min-h-16 py-2`} value={limitations} onChange={(e) => setLimitations(e.target.value)} />
      </Field>
      <p className="text-xs text-muted-foreground">Quem criou o protocolo não emite o parecer; o parecer é identificado pelo papel revisor do protocolo.</p>
      <button type="submit" className={buttonPrimary} aria-disabled={busy || pending}>
        {pending ? "Registrando parecer…" : "Emitir parecer"}
      </button>
      <Feedback feedback={feedback} />
    </form>
  );
}

export function EfficacyPanel({
  action,
  item,
  governance,
  busy,
  today,
  callbacks: rawCallbacks,
}: {
  action: FibtActionView;
  item: EfficacyItemView | null;
  governance: EfficacyGovernanceView;
  busy: boolean;
  today: string;
  callbacks: EfficacyCallbacks;
}) {
  // Registrar, abrir revisão e emitir parecer trocam o formulário por outro conteúdo: o aviso de
  // sucesso dessas ações vive no painel (região viva estável), não no formulário que desaparece.
  const [announce, setAnnounce] = useState<string | null>(null);
  const callbacks: EfficacyCallbacks = {
    ...rawCallbacks,
    startRevision: async (itemId) => {
      setAnnounce(null);
      const r = await rawCallbacks.startRevision(itemId);
      if (r.ok) setAnnounce(r.message);
      return r;
    },
    register: async (itemId) => {
      setAnnounce(null);
      const r = await rawCallbacks.register(itemId);
      if (r.ok) setAnnounce(r.message);
      return r;
    },
    verdict: async (itemId, input) => {
      setAnnounce(null);
      const r = await rawCallbacks.verdict(itemId, input);
      if (r.ok) setAnnounce(r.message);
      return r;
    },
  };
  const reg = item?.registered ?? null;
  const draft = item?.draft ?? null;
  const [editing, setEditing] = useState(false);
  const revision = useGuardedAction();
  const label = reg ? item!.stateLabel : "não avaliada";
  const followUp = reg ? (
    <>
      <div className="space-y-2">
        <p className="font-medium text-foreground">Registrar observação</p>
        <ObservationForm action={action} item={item!} today={today} busy={busy} callbacks={callbacks} />
      </div>
      <div className="space-y-2">
        <p className="font-medium text-foreground">Parecer do revisor</p>
        <VerdictForm action={action} item={item!} governance={governance} busy={busy} callbacks={callbacks} />
      </div>
    </>
  ) : null;
  const v = item?.verdict ?? null;
  return (
    <section aria-label={`Avaliação de eficácia — ${action.title}`} className="space-y-3 rounded-md border border-dashed border-muted-foreground/40 p-3 text-sm">
      <div>
        <p className="font-medium text-foreground">Eficácia: {label}</p>
        <p className="mt-1 text-muted-foreground">
          {reg ? "Concluir a ação registra a execução — não comprova melhora do indicador nem causalidade, e não altera o IVO." : action.efficacy.reason}
        </p>
      </div>

      <div role="status" aria-live="polite" className="min-h-5">
        {announce ? <p className="font-medium text-emerald-700 dark:text-emerald-300">{announce}</p> : null}
      </div>

      {reg ? (
        <>
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Objetivo: </dt><dd className="inline">{reg.objective}</dd></div>
            <div><dt className="inline text-muted-foreground">Indicador: </dt><dd className="inline">{reg.indicatorLabel} ({reg.indicatorKind === "resultado" ? "resultado" : "execução"}; {reg.indicatorOrigin === "leitura_publicada" ? "leitura publicada, só referência" : "medida da organização"}) · {reg.unit}{reg.direction ? ` · ${reg.direction}` : ""}</dd></div>
            <div><dt className="inline text-muted-foreground">Linha de base: </dt><dd className="inline">{reg.baselineRef ? `referência à leitura publicada de ${reg.baselineRef.cohortKey} (${reg.baselineRef.cycleKey})` : reg.baselineValue !== null ? String(reg.baselineValue) : "não aplicável"}{reg.baselineObservedOn ? ` · ${formatIsoDateLong(reg.baselineObservedOn)}` : ""}</dd></div>
            <div><dt className="inline text-muted-foreground">Meta: </dt><dd className="inline">{reg.targetKind === "numerico" ? reg.targetValue : reg.targetKind === "qualitativo" ? reg.targetCriterion : "não definida"}{reg.meaningfulDifference !== null ? ` · diferença mínima ${reg.meaningfulDifference}` : " · sem diferença mínima (mudança só descritiva)"}</dd></div>
            <div><dt className="inline text-muted-foreground">Janela: </dt><dd className="inline">{reg.windowStart ? formatIsoDateLong(reg.windowStart) : "—"} a {reg.windowEnd ? formatIsoDateLong(reg.windowEnd) : "—"}{item!.windowStatus ? ` (${item!.windowStatus === "aberta" ? "aberta" : item!.windowStatus === "encerrada" ? "encerrada" : "ainda não iniciada"})` : ""}</dd></div>
            <div><dt className="inline text-muted-foreground">Fonte: </dt><dd className="inline">{reg.source}</dd></div>
            <div><dt className="inline text-muted-foreground">Responsável / revisor: </dt><dd className="inline">{reg.responsibleRole} / {reg.reviewerRole}</dd></div>
            <div><dt className="inline text-muted-foreground">Versão: </dt><dd className="inline">revisão {reg.revision}{item!.previousRevisions > 0 ? ` (${item!.previousRevisions} anterior(es))` : ""}</dd></div>
            {reg.limitations.length > 0 ? <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Limitações: </dt><dd className="inline">{reg.limitations.join("; ")}</dd></div> : null}
          </dl>

          {item!.observations.length > 0 ? (
            <div>
              <p className="font-medium text-foreground">Observações</p>
              <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                {item!.observations.map((o) => (
                  <li key={o.id}>
                    <time dateTime={o.observedOn}>{formatIsoDateLong(o.observedOn)}</time> — {o.value !== null ? `valor ${o.value}` : "referência a leitura publicada (valor não copiado)"}{o.note ? ` · ${o.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {v ? (
            <div role="group" aria-label="Parecer de eficácia" className="rounded-md border border-border p-3">
              <p className="font-medium text-foreground">
                Parecer: {VERDICT_LABEL[v.verdict]}
                {v.governance.source === "teste_sintetico" ? <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs">TESTE SINTÉTICO — critérios fictícios</span> : null}
              </p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li>Escopo: {v.claimScope === "resultado" ? "resultado" : "execução"} · grau de evidência: {GRADE_LABEL[v.evidenceGrade]}</li>
                <li>Mudança observada: {CHANGE_LABEL[v.observedChange]} · meta: {v.targetReached === null ? "não declarada" : v.targetReached ? "atingida" : "não atingida"}</li>
                <li>Atribuição causal: {ATTRIBUTION_LABEL[v.attribution.status]}</li>
                <li>Governança D9 no parecer: {GOVERNANCE_STATE_LABEL[v.governance.state as GovernanceState] ?? v.governance.state}</li>
                {v.reason ? <li>Motivo: {v.reason}</li> : null}
              </ul>
            </div>
          ) : null}
          {v ? (
            <details className="rounded-md border border-border">
              <summary className="min-h-11 cursor-pointer px-3 py-2 font-medium text-foreground">Registrar nova observação ou novo parecer</summary>
              <div className="space-y-3 px-3 pb-3">
                <p className="text-xs text-muted-foreground">Os registros são acumulativos: o parecer mais recente vale e os anteriores permanecem no histórico.</p>
                {followUp}
              </div>
            </details>
          ) : (
            followUp
          )}
        </>
      ) : null}

      {draft || (!reg && editing) ? (
        <div className="space-y-2">
          <p className="font-medium text-foreground">{reg ? "Nova revisão do protocolo (rascunho)" : "Protocolo de avaliação"}</p>
          <ProtocolDraftForm action={action} item={item} busy={busy} callbacks={callbacks} />
        </div>
      ) : null}

      {!draft && !reg && !editing ? (
        <button type="button" className={buttonSecondary} onClick={() => setEditing(true)}>
          Preparar protocolo de avaliação<span className="sr-only"> de {action.title}</span>
        </button>
      ) : null}
      {reg && !draft ? (
        <div>
          <button type="button" className={buttonSecondary} aria-disabled={busy || revision.pending} onClick={() => void revision.run(() => callbacks.startRevision(action.id))}>
            Iniciar nova revisão do protocolo<span className="sr-only"> de {action.title}</span>
          </button>
          <Feedback feedback={revision.feedback} />
        </div>
      ) : null}
    </section>
  );
}
