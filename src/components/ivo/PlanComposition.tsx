import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { FibtActionPlanView, IvoQ2View } from "@/lib/ivo/ivo-views";
import { formatIsoDateLong, todayInSaoPaulo } from "@/lib/ivo/local-date";
import {
  CLOSED_PLAN_EXPLANATION,
  CLOSED_PLAN_NO_REOPEN,
  CLOSURE_NOT_EVALUATION_NOTE,
  PLAN_EMPTY_MESSAGE,
  PLAN_STATUS_LABEL,
  assessPlanClosure,
  describePending,
} from "@/lib/ivo/plan-closure";
import { Field, buttonPrimary, buttonSecondary, inputClass, type EvidenceSubmitResult } from "./FibtActionLoop";

// PI-13 — composição e encerramento do plano (apresentação).
//
// Duas operações, ambas SOBRE O PLANO (execução, aprendizagem e avaliação de
// eficácia continuam nos próprios cartões):
//   · incluir uma ação num plano que já existe;
//   · encerrar o plano operacionalmente.
// Toda decisão de acesso é do servidor; aqui só há formulários e as mesmas regras
// puras (plan-closure) para antecipar o que o servidor vai aceitar.

const EFFORT_OPTIONS = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
] as const;

const STATUS_NAME = { draft: "Rascunho", active: "Ativo", closed: "Encerrado" } as const;
const GENERIC_ERROR = "Falha de comunicação com o servidor. Nada foi confirmado; o que você digitou foi mantido.";

/** Chave de idempotência de UMA tentativa de envio (uuid v4). Não é segredo nem identidade. */
function newRequestId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
}

function civilDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : formatIsoDateLong(todayInSaoPaulo(d));
}

// ─── Incluir ação ────────────────────────────────────────────────────────────

export interface AddActionFormInput {
  requestId: string;
  waveId: string;
  cohortId: string;
  factorId: string;
  title: string;
  description: string;
  effort: "baixo" | "medio" | "alto";
  /** Só em plano ativo (obrigatório lá). */
  accountability?: { ownerRoleLabel: string; dueOn: string; executionMetric: { label: string; baseline: number; target: number; unit: string } };
}

export function AddActionToPlanForm({
  plan,
  view,
  busy,
  onSubmit,
}: {
  plan: FibtActionPlanView;
  view: IvoQ2View | null;
  busy: boolean;
  onSubmit: (planId: string, input: AddActionFormInput) => Promise<EvidenceSubmitResult>;
}) {
  const cycle = plan.cycleKeyCanonical ?? plan.cycleKey;
  const needsAccountability = plan.status === "active";
  const p = `add-${plan.id}`;

  const published = (view?.sectors ?? []).filter((s) => s.group === "available" && s.factors && s.factors.length > 0);
  const [cohortId, setCohortId] = useState(published[0]?.cohortId ?? "");
  const [factorId, setFactorId] = useState(published[0]?.factors?.[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [effort, setEffort] = useState<AddActionFormInput["effort"]>("medio");
  const [role, setRole] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [metricLabel, setMetricLabel] = useState("");
  const [baseline, setBaseline] = useState("0");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // Uma chave por tentativa: só muda depois de um sucesso. Reenviar após falha usa a MESMA chave.
  const requestId = useRef(newRequestId());
  const inFlight = useRef(false);

  const heading = (
    <h3 id={`${p}-title`} className="text-sm font-semibold text-foreground">
      Incluir ação neste plano
    </h3>
  );
  const wrapper = (children: ReactNode) => (
    <section aria-labelledby={`${p}-title`} className="space-y-3 rounded-md border border-dashed border-foreground/40 bg-background p-4">
      {heading}
      {children}
    </section>
  );

  if (plan.composition === "unavailable") {
    return wrapper(
      <p role="note" className="text-sm text-muted-foreground">
        Incluir ação ainda não está disponível neste ambiente: a atualização do banco de dados não foi aplicada. Nada foi alterado.
      </p>,
    );
  }
  if (!view) {
    return wrapper(
      <p role="note" className="text-sm text-muted-foreground">
        A leitura publicada do ciclo {cycle} não está carregada. Sem ela não há origem para a nova ação.
      </p>,
    );
  }
  if (view.cycleKey !== plan.cycleKeyCanonical) {
    return wrapper(
      <p role="note" className="text-sm text-muted-foreground">
        A leitura carregada é do ciclo {view.cycleKey}, e este plano é do ciclo {cycle}. A nova ação só pode partir de leitura publicada do mesmo ciclo do plano.
      </p>,
    );
  }
  if (published.length === 0) {
    return wrapper(
      <p role="note" className="text-sm text-muted-foreground">
        Nenhum setor tem leitura publicada neste ciclo. Setores protegidos não embasam ações, e isso não significa resultado ruim nem zero.
      </p>,
    );
  }

  const sector = published.find((s) => s.cohortId === cohortId) ?? published[0]!;
  const factors = sector.factors ?? [];
  const waveId = view.wave.id;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || busy) return;
    if (title.trim().length < 3) {
      setFeedback({ tone: "error", text: "Descreva a ação com ao menos 3 caracteres." });
      return;
    }
    let accountability: AddActionFormInput["accountability"];
    if (needsAccountability) {
      const b = Number(baseline.replace(",", "."));
      const t = Number(target.replace(",", "."));
      if (!role.trim() || !dueOn || !metricLabel.trim() || !Number.isFinite(b) || !Number.isFinite(t) || target.trim() === "") {
        setFeedback({ tone: "error", text: "Plano ativo: informe responsável, prazo e indicador de execução (linha de base e meta) da nova ação." });
        return;
      }
      accountability = { ownerRoleLabel: role.trim(), dueOn, executionMetric: { label: metricLabel.trim(), baseline: b, target: t, unit: unit.trim() } };
    }
    inFlight.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const result = await onSubmit(plan.id, {
        requestId: requestId.current,
        waveId,
        cohortId: sector.cohortId,
        factorId: factorId || factors[0]!.id,
        title: title.trim(),
        description: description.trim(),
        effort,
        ...(accountability ? { accountability } : {}),
      });
      if (result.ok) {
        // Sucesso: limpa o que foi enviado e abre uma nova tentativa (nova chave).
        setTitle("");
        setDescription("");
        setRole("");
        setDueOn("");
        setMetricLabel("");
        setBaseline("0");
        setTarget("");
        setUnit("");
        requestId.current = newRequestId();
        setFeedback({ tone: "ok", text: result.message });
      } else {
        // Falha: tudo fica como está (inclusive a chave) para uma nova tentativa segura.
        setFeedback({ tone: "error", text: result.message });
      }
    } catch {
      setFeedback({ tone: "error", text: GENERIC_ERROR });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const blocked = busy || pending;
  const actionsCount = plan.actions.length;
  return wrapper(
    <>
      <p className="text-sm text-muted-foreground">
        A nova ação entra num plano que já existe e guarda a origem (setor, fator, versão e data da publicação). Nenhum valor do resultado é copiado para ela, e as ações atuais não mudam.
      </p>
      <div role="group" aria-label="Destino da nova ação" className="rounded-md border border-border bg-muted/30 p-3 text-sm">
        <p className="text-foreground">
          Destino: <strong>plano do ciclo {cycle}</strong> · <strong>{STATUS_NAME[plan.status]}</strong> · {actionsCount} {actionsCount === 1 ? "ação" : "ações"}
        </p>
        <p className="mt-1 text-muted-foreground">
          {needsAccountability
            ? "Plano ativo: a nova ação já precisa de responsável, prazo e indicador de execução. Um plano ativo não aceita ação sem eles."
            : "Plano em rascunho: responsável, prazo e indicador da nova ação são definidos depois, como nas demais, antes de ativar o plano."}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2" aria-busy={blocked}>
        <Field id={`${p}-setor`} label="Setor com leitura publicada">
          <select
            id={`${p}-setor`}
            className={inputClass}
            value={sector.cohortId}
            onChange={(e) => {
              setCohortId(e.target.value);
              setFactorId(published.find((s) => s.cohortId === e.target.value)?.factors?.[0]?.id ?? "");
            }}
          >
            {published.map((s) => (
              <option key={s.cohortId} value={s.cohortId}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${p}-fator`} label="Fator FIB-T">
          <select id={`${p}-fator`} className={inputClass} value={factorId || factors[0]?.id} onChange={(e) => setFactorId(e.target.value)}>
            {factors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${p}-titulo`} label="Título da nova ação">
          <input
            id={`${p}-titulo`}
            className={inputClass}
            value={title}
            maxLength={200}
            required
            minLength={3}
            onChange={(e) => {
              setTitle(e.target.value);
              if (feedback) setFeedback(null);
            }}
          />
        </Field>
        <Field id={`${p}-esforco`} label="Esforço">
          <select id={`${p}-esforco`} className={inputClass} value={effort} onChange={(e) => setEffort(e.target.value as AddActionFormInput["effort"])}>
            {EFFORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field id={`${p}-descricao`} label="O que será feito (opcional)" hint="Não inclua nomes de pessoas nem respostas individuais.">
            <textarea
              id={`${p}-descricao`}
              aria-describedby={`${p}-descricao-hint`}
              className={`${inputClass} min-h-20 py-2`}
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        {needsAccountability ? (
          <fieldset className="grid gap-3 md:col-span-2 md:grid-cols-2">
            <legend className="text-sm font-medium text-foreground">Responsável, prazo e indicador de execução (obrigatórios no plano ativo)</legend>
            <Field id={`${p}-papel`} label="Responsável (função que executa)">
              <input id={`${p}-papel`} className={inputClass} value={role} required minLength={2} maxLength={80} onChange={(e) => setRole(e.target.value)} />
            </Field>
            <Field id={`${p}-prazo`} label="Prazo" hint={dueOn ? `Data selecionada: ${formatIsoDateLong(dueOn)}` : "Escolha o dia no calendário ou digite dia/mês/ano."}>
              <input id={`${p}-prazo`} aria-describedby={`${p}-prazo-hint`} type="date" className={inputClass} value={dueOn} required onChange={(e) => setDueOn(e.target.value)} />
            </Field>
            <Field id={`${p}-indicador`} label="Indicador de execução" hint="Mede se a ação aconteceu (ex.: oficinas realizadas). Não é o resultado FIB-T.">
              <input id={`${p}-indicador`} aria-describedby={`${p}-indicador-hint`} className={inputClass} value={metricLabel} required minLength={2} maxLength={120} onChange={(e) => setMetricLabel(e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Field id={`${p}-base`} label="Linha de base">
                <input id={`${p}-base`} inputMode="decimal" className={inputClass} value={baseline} required onChange={(e) => setBaseline(e.target.value)} />
              </Field>
              <Field id={`${p}-meta`} label="Meta">
                <input id={`${p}-meta`} inputMode="decimal" className={inputClass} value={target} required onChange={(e) => setTarget(e.target.value)} />
              </Field>
              <Field id={`${p}-unidade`} label="Unidade">
                <input id={`${p}-unidade`} className={inputClass} value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} />
              </Field>
            </div>
          </fieldset>
        ) : null}
        <div className="md:col-span-2">
          {/* aria-disabled (e não disabled) mantém o foco do teclado no botão durante o envio. */}
          <button type="submit" className={buttonPrimary} aria-disabled={blocked}>
            {pending ? "Incluindo ação…" : `Incluir ação no plano do ciclo ${cycle}`}
          </button>
        </div>
      </form>
      <div role="status" aria-live="polite" className="min-h-5 text-sm">
        {feedback?.tone === "ok" ? <p className="text-emerald-700 dark:text-emerald-300">{feedback.text}</p> : null}
      </div>
      {feedback?.tone === "error" ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {feedback.text}
        </p>
      ) : null}
    </>,
  );
}

// ─── Encerrar plano ──────────────────────────────────────────────────────────

export function ClosePlanPanel({
  plan,
  busy,
  onClose,
}: {
  plan: FibtActionPlanView;
  busy: boolean;
  onClose: (planId: string) => Promise<EvidenceSubmitResult>;
}) {
  const p = `close-${plan.id}`;
  const cycle = plan.cycleKeyCanonical ?? plan.cycleKey;
  const assessment = assessPlanClosure(plan);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inFlight = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const confirmHeading = useRef<HTMLHeadingElement>(null);

  // Ao abrir a confirmação o foco vai para o título dela; ao cancelar, volta ao botão que a abriu
  // (o botão só existe fora da confirmação, então o foco é devolvido depois que ele é renderizado).
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming) {
      wasConfirming.current = true;
      confirmHeading.current?.focus();
    } else if (wasConfirming.current) {
      wasConfirming.current = false;
      trigger.current?.focus();
    }
  }, [confirming]);

  if (plan.status !== "active" || plan.composition === "unavailable") return null;

  const blocked = busy || pending;
  const { finished, total, pending: open } = assessment;

  function cancel() {
    if (inFlight.current) return;
    setConfirming(false);
    setFeedback(null);
  }

  async function confirm() {
    if (inFlight.current || busy || !assessment.canClose) return;
    inFlight.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const result = await onClose(plan.id);
      // Em sucesso o plano passa a "Encerrado" e este painel sai de cena (o aviso do plano assume).
      if (!result.ok) setFeedback(result.message);
    } catch {
      setFeedback(GENERIC_ERROR);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <section aria-labelledby={`${p}-title`} className="space-y-3 rounded-md border border-dashed border-foreground/40 bg-background p-4">
      <h3 id={`${p}-title`} className="text-sm font-semibold text-foreground">
        Encerrar plano do ciclo {cycle}
      </h3>
      <p className="text-sm text-muted-foreground">
        Encerrar é um ato operacional: o plano deixa de receber ações, mudanças de estado e novos registros de execução ou aprendizagem. Só é possível quando cada ação está concluída, em vigilância ou interrompida.
      </p>

      {assessment.block === "pending_actions" ? (
        <div id={`${p}-pending`} role="note" className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">
            Ainda não é possível encerrar: {open.length} {open.length === 1 ? "ação está" : "ações estão"} em andamento ({describePending(open)}).
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
            {open.map((a) => (
              <li key={a.id}>
                {a.title} — {PLAN_STATUS_LABEL[a.status]}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-muted-foreground">Conclua, mantenha em vigilância ou interrompa cada uma e volte aqui.</p>
        </div>
      ) : null}

      {assessment.block === "plan_empty" ? (
        <div id={`${p}-pending`} role="note" className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">{PLAN_EMPTY_MESSAGE}</p>
          <p className="mt-1 text-muted-foreground">Inclua ao menos uma ação neste plano e volte aqui.</p>
        </div>
      ) : null}

      {!confirming ? (
        <button
          ref={trigger}
          type="button"
          className={buttonSecondary}
          aria-disabled={!assessment.canClose || blocked}
          aria-describedby={assessment.block === "pending_actions" || assessment.block === "plan_empty" ? `${p}-pending` : undefined}
          onClick={() => {
            if (assessment.canClose && !blocked) setConfirming(true);
          }}
        >
          Revisar encerramento do plano {cycle}
        </button>
      ) : (
        <div
          role="group"
          aria-labelledby={`${p}-confirm-title`}
          className="space-y-3 rounded-md border-2 border-foreground/60 bg-muted/20 p-4"
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
        >
          <h4 ref={confirmHeading} id={`${p}-confirm-title`} tabIndex={-1} className="text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Confirmar o encerramento do plano do ciclo {cycle}
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            <li>
              {total} {total === 1 ? "ação" : "ações"}: {finished.concluida} concluída(s), {finished.em_vigilancia} em vigilância, {finished.interrompida} interrompida(s).
            </li>
            <li>{CLOSED_PLAN_EXPLANATION}</li>
            <li>{CLOSED_PLAN_NO_REOPEN}</li>
            <li>{CLOSURE_NOT_EVALUATION_NOTE}</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonPrimary} aria-disabled={blocked} onClick={() => void confirm()}>
              {pending ? "Encerrando…" : "Confirmar encerramento"}
            </button>
            <button type="button" className={buttonSecondary} aria-disabled={pending} onClick={cancel}>
              Cancelar
            </button>
          </div>
          {feedback ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {feedback}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

// ─── Plano encerrado ─────────────────────────────────────────────────────────

export function ClosedPlanNotice({ plan }: { plan: FibtActionPlanView }) {
  if (plan.status !== "closed") return null;
  const date = civilDate(plan.closedAt);
  return (
    <section aria-label="Plano encerrado" role="note" className="space-y-2 rounded-md border-2 border-foreground/50 bg-muted/30 p-4 text-sm">
      <p className="font-semibold text-foreground">
        Plano encerrado
        {date && plan.closedAt ? (
          <>
            {" "}em <time dateTime={plan.closedAt}>{date}</time>
          </>
        ) : null}
        {plan.closedByRole ? ` por ${plan.closedByRole}` : ""}
      </p>
      <p className="text-foreground">{CLOSED_PLAN_EXPLANATION}</p>
      <p className="text-muted-foreground">
        {CLOSED_PLAN_NO_REOPEN} {CLOSURE_NOT_EVALUATION_NOTE}
      </p>
    </section>
  );
}
