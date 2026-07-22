// CodesignStudioCard — Estúdio de Co-design (LD-009, LDX-4 pull-forward,
// Fatia C). Builder por blocos: escolhe um padrão validado, declara escopo e
// alvo, preenche os campos obrigatórios do registry, reconhece efeitos
// adversos, passa por revisão humana e produz um export rastreável.
//
// Doutrina (LD-009, R3_HIGH, aiMode NONE): SEM IA — o motor só valida, nunca
// gera. O guardrail "não individualizar causa organizacional" aparece como
// BLOQUEIO destacado (não aviso). Dono é escolhido num SELETOR DE PAPÉIS do
// pack — nunca texto livre —, o que elimina por construção o risco de digitar
// nome de pessoa. SESSION_ONLY: nada é persistido; o export é entregue ao
// chamador (download/handoff), nunca gravado.

import { useMemo, useState } from "react";
import {
  buildTraceableExport,
  setDeadline,
  setField,
  setIndicator,
  setMeasureTarget,
  setOwnerRole,
  setScope,
  startDraft,
  toggleAdverseEffect,
  validateDraft,
  type CodesignDraft,
  type InterventionScope,
  type MeasureTarget,
  type TraceableExport,
} from "@/engine/learning/codesign-studio-engine";
import type { InterventionPattern, Plan90dPhase } from "@/domain/evidence/intervention-patterns";

const SCOPE_LABEL: Record<InterventionScope, string> = {
  equipe: "Equipe",
  lideranca: "Liderança",
  organizacional: "Organizacional",
  cultural: "Cultural",
};

const TARGET_LABEL: Record<MeasureTarget, string> = {
  individuo: "Indivíduo",
  equipe: "Equipe",
  processo: "Processo",
  politica: "Política",
  ambiente: "Ambiente",
};

/** Rótulo humano de cada campo obrigatório do registry. Chaves desconhecidas
 * caem no fallback (o registry pode crescer sem quebrar a UI). */
const FIELD_LABEL: Record<string, string> = {
  hypothesis: "Hipótese",
  eligible_context: "Contexto elegível",
  process_metrics: "Métricas de processo",
  outcome_metrics: "Métricas de resultado",
  adverse_effects_monitored: "Efeitos adversos monitorados",
  stop_rule: "Stop rule (quando interromper)",
};

const FIELD_HINT: Record<string, string> = {
  hypothesis: "O que esperamos que mude, e por quê.",
  eligible_context: "Onde isto se aplica — e onde NÃO se aplica.",
  process_metrics: "Como saberemos que a intervenção aconteceu de fato.",
  outcome_metrics: "O que observaremos mudar (mudança observada, nunca garantia).",
  adverse_effects_monitored: "O que vigiaremos para não piorar nada sem perceber.",
  stop_rule: "O sinal objetivo que nos faz interromper.",
};

export interface CodesignStudioCardProps {
  patterns: readonly InterventionPattern[];
  requiredFieldKeys: readonly string[];
  adverseEffectsWatchlist: readonly string[];
  plan90dPhases: readonly Plan90dPhase[];
  /** Papéis do pack — o dono é ESCOLHIDO daqui, nunca digitado. */
  ownerRoleOptions: readonly { id: string; label: string }[];
  /** Papel de quem está revisando (persona ativa). */
  reviewerRole: string;
  /** Injetado para manter o componente testável/determinístico. */
  now?: () => string;
}

export function CodesignStudioCard({
  patterns,
  requiredFieldKeys,
  adverseEffectsWatchlist,
  plan90dPhases,
  ownerRoleOptions,
  reviewerRole,
  now,
}: CodesignStudioCardProps) {
  const [draft, setDraft] = useState<CodesignDraft | null>(null);
  const [exported, setExported] = useState<TraceableExport | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  const validation = useMemo(
    () => (draft ? validateDraft(draft, requiredFieldKeys, adverseEffectsWatchlist) : null),
    [draft, requiredFieldKeys, adverseEffectsWatchlist],
  );

  const activePattern = draft ? patterns.find((p) => p.pattern_id === draft.patternId) ?? null : null;

  function restart() {
    setDraft(null);
    setExported(null);
    setReviewConfirmed(false);
  }

  // ─── Export pronto ────────────────────────────────────────────────────────
  if (exported) {
    return (
      <div className="space-y-4" aria-live="polite">
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Intervenção composta
          </p>
          <p className="mt-2 text-sm font-medium text-card-foreground">
            {activePattern?.name ?? exported.patternId}
          </p>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            <li>
              Escopo: {SCOPE_LABEL[exported.scope]} · Alvo: {TARGET_LABEL[exported.measureTarget]}
            </li>
            <li>
              Dono: {exported.ownerRole} · Prazo: {exported.deadline}
            </li>
            <li>
              Indicador: {exported.indicator.label} — de {exported.indicator.baseline} para{" "}
              {exported.indicator.target} ({exported.indicator.unit})
            </li>
            <li>
              Revisado por: {exported.reviewedByRole} · em {exported.reviewedAt.slice(0, 10)}
            </li>
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Rascunho desta sessão — nada foi salvo. Leve este resumo para o plano de ação; a
            execução e o registro de evidência acontecem lá.
          </p>
        </div>
        <button
          type="button"
          onClick={restart}
          className="min-h-11 rounded-xl border border-border/70 bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Compor outra
        </button>
      </div>
    );
  }

  // ─── Seleção do padrão ────────────────────────────────────────────────────
  if (!draft) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Comece por um bloco validado — em vez de uma folha em branco. Cada padrão traz seu escopo
          e quem supervisiona.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {patterns.map((p) => (
            <button
              key={p.pattern_id}
              type="button"
              onClick={() => setDraft(startDraft(p.pattern_id))}
              className="rounded-2xl border border-border/70 bg-card p-4 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <p className="text-sm font-medium text-card-foreground">{p.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.scope}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Supervisão: {p.supervision}</p>
              {p.rule && (
                <p className="mt-2 rounded-r-lg border-l-4 border-amber-400 bg-amber-50/60 px-2 py-1 text-[11px] text-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                  {p.rule}
                </p>
              )}
            </button>
          ))}
        </div>
        {plan90dPhases.length > 0 && (
          <details className="rounded-2xl border border-border/70 bg-background p-4">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Cronograma de referência (90 dias)
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {plan90dPhases.map((ph) => (
                <li key={ph.days}>
                  <span className="font-medium text-foreground">Dias {ph.days}:</span> {ph.focus}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    );
  }

  // ─── Composição ───────────────────────────────────────────────────────────
  const guardrailBlocked = (validation?.guardrailErrors.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-card-foreground">{activePattern?.name}</p>
        <button
          type="button"
          onClick={restart}
          className="min-h-9 rounded-xl border border-border/70 bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Trocar padrão
        </button>
      </div>

      {/* Escopo + alvo (onde o guardrail vive) */}
      <fieldset className="rounded-2xl border border-border/70 bg-background p-4">
        <legend className="px-1 text-xs font-semibold text-foreground">Escopo e alvo</legend>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Onde a causa está, e o que a medida vai tratar.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Escopo da intervenção">
          {(Object.keys(SCOPE_LABEL) as InterventionScope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setDraft((d) => (d ? setScope(d, s) : d))}
              aria-pressed={draft.scope === s}
              className={chipClass(draft.scope === s)}
            >
              {SCOPE_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Alvo da medida">
          {(Object.keys(TARGET_LABEL) as MeasureTarget[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDraft((d) => (d ? setMeasureTarget(d, t) : d))}
              aria-pressed={draft.measureTarget === t}
              className={chipClass(draft.measureTarget === t)}
            >
              {TARGET_LABEL[t]}
            </button>
          ))}
        </div>

        {guardrailBlocked && (
          <div
            className="mt-3 rounded-r-lg border-l-4 border-destructive bg-destructive/5 px-3 py-2"
            role="alert"
          >
            {validation!.guardrailErrors.map((e) => (
              <p key={e} className="text-xs leading-relaxed text-foreground">
                <span className="font-semibold">Bloqueio: </span>
                {e}
              </p>
            ))}
          </div>
        )}
      </fieldset>

      {/* Campos obrigatórios do registry */}
      <fieldset className="space-y-3 rounded-2xl border border-border/70 bg-background p-4">
        <legend className="px-1 text-xs font-semibold text-foreground">
          Campos obrigatórios do padrão
        </legend>
        {requiredFieldKeys.map((key) => (
          <label key={key} className="block">
            <span className="text-xs font-medium text-foreground">{FIELD_LABEL[key] ?? key}</span>
            {FIELD_HINT[key] && (
              <span className="ml-1 text-[11px] text-muted-foreground">— {FIELD_HINT[key]}</span>
            )}
            <textarea
              value={draft.fields[key] ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setDraft((d) => (d ? setField(d, key, value) : d));
              }}
              rows={2}
              className="mt-1 w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
        ))}
      </fieldset>

      {/* Indicador */}
      <fieldset className="rounded-2xl border border-border/70 bg-background p-4">
        <legend className="px-1 text-xs font-semibold text-foreground">Indicador</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["label", "unit", "baseline", "target"] as const).map((part) => (
            <label key={part} className="block">
              <span className="text-xs text-muted-foreground">
                {part === "label"
                  ? "O que medir"
                  : part === "unit"
                    ? "Unidade"
                    : part === "baseline"
                      ? "Baseline (hoje)"
                      : "Alvo"}
              </span>
              <input
                type="text"
                value={draft.indicator?.[part] ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setDraft((d) => {
                    if (!d) return d;
                    const base = d.indicator ?? { label: "", baseline: "", target: "", unit: "" };
                    return setIndicator(d, { ...base, [part]: value });
                  });
                }}
                className="mt-1 w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
          ))}
        </div>
      </fieldset>

      {/* Dono (papel) + prazo */}
      <fieldset className="rounded-2xl border border-border/70 bg-background p-4">
        <legend className="px-1 text-xs font-semibold text-foreground">Responsável e prazo</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-muted-foreground">Dono (papel, nunca uma pessoa)</span>
            <select
              value={draft.ownerRole ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setDraft((d) => (d ? setOwnerRole(d, value) : d));
              }}
              className="mt-1 w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Selecione um papel…</option>
              {ownerRoleOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Prazo</span>
            <input
              type="date"
              value={draft.deadline ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setDraft((d) => (d ? setDeadline(d, value) : d));
              }}
              className="mt-1 w-full rounded-xl border border-border/70 bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
        </div>
      </fieldset>

      {/* Efeitos adversos */}
      <fieldset className="rounded-2xl border border-border/70 bg-background p-4">
        <legend className="px-1 text-xs font-semibold text-foreground">
          Efeitos adversos a vigiar
        </legend>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Reconheça ao menos um — toda intervenção pode piorar algo sem querer.
        </p>
        <div className="space-y-2">
          {adverseEffectsWatchlist.map((effect) => (
            <label key={effect} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={draft.acknowledgedAdverseEffects.includes(effect)}
                onChange={() => setDraft((d) => (d ? toggleAdverseEffect(d, effect) : d))}
                className="mt-0.5 h-4 w-4 rounded border-border/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <span className="text-xs leading-relaxed text-card-foreground">{effect}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Gate de revisão humana */}
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        {validation && validation.errors.length > 0 && (
          <details className="mb-3">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Faltam {validation.errors.length} item(ns) para poder revisar
            </summary>
            <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              {validation.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </details>
        )}

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={reviewConfirmed}
            disabled={!validation?.valid}
            onChange={(e) => setReviewConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <span className="text-xs leading-relaxed text-card-foreground">
            Revisei esta composição como <strong>{reviewerRole}</strong> e assumo que ela não
            individualiza uma causa organizacional.
          </span>
        </label>

        <button
          type="button"
          disabled={!validation?.valid || !reviewConfirmed}
          onClick={() => {
            const stamp = now ? now() : new Date().toISOString();
            const result = buildTraceableExport(
              draft,
              requiredFieldKeys,
              adverseEffectsWatchlist,
              reviewerRole,
              stamp,
            );
            if (result) setExported(result);
          }}
          className="mt-3 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
        >
          Fechar composição
        </button>
      </div>
    </div>
  );
}

function chipClass(active: boolean): string {
  return `min-h-11 rounded-xl border px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
    active
      ? "border-primary/50 bg-primary/10 text-foreground"
      : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
  }`;
}
