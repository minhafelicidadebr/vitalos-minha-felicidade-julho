// SocraticArenaCard — Arena de Debate Socrático (LD-010, LDX-4 pull-forward,
// Fatia C). Roteiro determinístico: enquadramento → tese → antítese →
// evidência → revisão → síntese. Zero IA generativa, zero ranking, zero
// vencedor — só o motor puro (socratic-arena-engine.ts) e o React por cima.
//
// SESSION_ONLY: todo estado vive neste componente; nada é persistido, nada é
// enviado a ninguém. Decisão de design desta fatia: SEM campo de rascunho de
// texto livre — o Ramo C do plano previa um opcional, mas omiti-lo elimina
// por completo a superfície de risco de "persistência de texto livre" em vez
// de depender de disciplina para nunca gravá-lo (a revisão de posição
// autodeclarada já serve o primaryOutcome sem precisar de texto livre).

import { useMemo, useState } from "react";
import {
  ARENA_STAGE_ORDER,
  canAdvanceFrom,
  goToStage,
  setPositionAfter,
  setPositionBefore,
  startArena,
  summarizeArena,
  toggleArgumentConsidered,
  validateDilemma,
  type ArenaDilemma,
  type ArenaPosition,
  type ArenaSide,
  type ArenaStage,
  type ArenaState,
  type ArgumentBasis,
} from "@/engine/learning/socratic-arena-engine";

const STAGE_LABEL: Record<ArenaStage, string> = {
  enquadramento: "Enquadramento",
  tese: "Tese",
  antitese: "Antítese",
  evidencia: "Evidência",
  revisao: "Revisão",
  sintese: "Síntese",
};

const BASIS_LABEL: Record<ArgumentBasis, string> = {
  evidencia_empirica: "Evidência empírica",
  sintese_teorica: "Síntese teórica",
  valor_operacional: "Raciocínio operacional (sem estudo)",
};

const POSITION_LABEL: Record<ArenaPosition, (dilemma: ArenaDilemma) => string> = {
  ladoA: (d) => d.sideALabel,
  ladoB: (d) => d.sideBLabel,
  indeciso: () => "Ainda decidindo",
};

interface SocraticArenaCardProps {
  dilemma: ArenaDilemma;
  resolveSourceLabel: (studyId: string) => string;
}

export function SocraticArenaCard({ dilemma, resolveSourceLabel }: SocraticArenaCardProps) {
  const dilemmaErrors = useMemo(() => validateDilemma(dilemma), [dilemma]);
  const [state, setState] = useState<ArenaState>(() => startArena(dilemma));

  if (dilemmaErrors.length > 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-4" role="note">
        <p className="text-sm text-muted-foreground">
          A Arena está indisponível no momento — o dilema não passou na validação estrutural.
        </p>
      </div>
    );
  }

  const sideACards = dilemma.cards.filter((c) => c.side === "A");
  const sideBCards = dilemma.cards.filter((c) => c.side === "B");

  function go(stage: ArenaStage) {
    setState((prev) => goToStage(dilemma, prev, stage));
  }
  function toggle(cardId: string) {
    setState((prev) => toggleArgumentConsidered(prev, cardId));
  }
  function restart() {
    setState(startArena(dilemma));
  }

  return (
    <div className="space-y-4">
      <StageStepper state={state} onSelect={go} />

      {state.stage === "enquadramento" && (
        <EnquadramentoStage
          dilemma={dilemma}
          state={state}
          onSetPositionBefore={(p) => setState((prev) => setPositionBefore(prev, p))}
          onBegin={() => go("tese")}
        />
      )}

      {state.stage === "tese" && (
        <ArgumentStage
          stageLabel="Tese"
          side="A"
          sideLabel={dilemma.sideALabel}
          cards={sideACards}
          consideredCardIds={state.consideredCardIds}
          onToggle={toggle}
          resolveSourceLabel={resolveSourceLabel}
          canContinue={canAdvanceFrom(dilemma, state, "tese")}
          continueHint="Considere ao menos 1 argumento deste lado para continuar."
          onContinue={() => go("antitese")}
        />
      )}

      {state.stage === "antitese" && (
        <ArgumentStage
          stageLabel="Antítese"
          side="B"
          sideLabel={dilemma.sideBLabel}
          cards={sideBCards}
          consideredCardIds={state.consideredCardIds}
          onToggle={toggle}
          resolveSourceLabel={resolveSourceLabel}
          canContinue={canAdvanceFrom(dilemma, state, "antitese")}
          continueHint="Considere ao menos 1 argumento deste lado para continuar."
          onContinue={() => go("evidencia")}
        />
      )}

      {state.stage === "evidencia" && (
        <EvidenciaStage
          dilemma={dilemma}
          state={state}
          resolveSourceLabel={resolveSourceLabel}
          onContinue={() => go("revisao")}
        />
      )}

      {state.stage === "revisao" && (
        <RevisaoStage
          dilemma={dilemma}
          state={state}
          onSetPositionAfter={(p) => setState((prev) => setPositionAfter(prev, p))}
          onContinue={() => go("sintese")}
        />
      )}

      {state.stage === "sintese" && (
        <SinteseStage dilemma={dilemma} state={state} onRestart={restart} />
      )}
    </div>
  );
}

// ─── Stepper (navegação livre para estágios já visitados) ────────────────────

function StageStepper({
  state,
  onSelect,
}: {
  state: ArenaState;
  onSelect: (stage: ArenaStage) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 text-xs"
      role="group"
      aria-label="Progresso na Arena"
    >
      {ARENA_STAGE_ORDER.map((stage) => {
        const visited = state.visitedStages.includes(stage);
        const active = state.stage === stage;
        return (
          <button
            key={stage}
            type="button"
            disabled={!visited}
            onClick={() => onSelect(stage)}
            aria-current={active ? "step" : undefined}
            className={`min-h-9 rounded-full border px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              active
                ? "border-primary/50 bg-primary/10 font-medium text-foreground"
                : visited
                  ? "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                  : "border-border/40 bg-background text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            {STAGE_LABEL[stage]}
          </button>
        );
      })}
    </div>
  );
}

// ─── 1 · Enquadramento ────────────────────────────────────────────────────────

function EnquadramentoStage({
  dilemma,
  state,
  onSetPositionBefore,
  onBegin,
}: {
  dilemma: ArenaDilemma;
  state: ArenaState;
  onSetPositionBefore: (p: ArenaPosition) => void;
  onBegin: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <h3 className="font-serif text-lg text-card-foreground">{dilemma.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{dilemma.framing}</p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-background p-4">
        <p className="text-xs font-semibold text-foreground">
          Antes de começar: qual é a sua posição inicial?
        </p>
        <PositionPicker
          dilemma={dilemma}
          value={state.positionBefore}
          onChange={onSetPositionBefore}
        />
      </div>

      <button
        type="button"
        onClick={onBegin}
        disabled={state.positionBefore === null}
        className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
      >
        Começar
      </button>
    </div>
  );
}

function PositionPicker({
  dilemma,
  value,
  onChange,
}: {
  dilemma: ArenaDilemma;
  value: ArenaPosition | null;
  onChange: (p: ArenaPosition) => void;
}) {
  const options: ArenaPosition[] = ["ladoA", "indeciso", "ladoB"];
  return (
    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Sua posição">
      {options.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-pressed={value === p}
          className={`min-h-11 rounded-xl border px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
            value === p
              ? "border-primary/50 bg-primary/10 text-foreground"
              : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          {POSITION_LABEL[p](dilemma)}
        </button>
      ))}
    </div>
  );
}

// ─── 2/3 · Tese / Antítese ────────────────────────────────────────────────────

function ArgumentStage({
  stageLabel,
  side,
  sideLabel,
  cards,
  consideredCardIds,
  onToggle,
  resolveSourceLabel,
  canContinue,
  continueHint,
  onContinue,
}: {
  stageLabel: string;
  side: ArenaSide;
  sideLabel: string;
  cards: ArenaDilemma["cards"];
  consideredCardIds: readonly string[];
  onToggle: (cardId: string) => void;
  resolveSourceLabel: (studyId: string) => string;
  canContinue: boolean;
  continueHint: string;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {stageLabel} · {sideLabel}
      </p>
      <div className="space-y-2" role="group" aria-label={`Argumentos — ${sideLabel}`}>
        {cards.map((card) => {
          const considered = consideredCardIds.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onToggle(card.id)}
              aria-pressed={considered}
              className={`w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                considered
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/70 bg-card hover:bg-muted/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm leading-relaxed text-card-foreground">{card.text}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    considered ? "bg-primary/15 text-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {considered ? "Considerada" : "Considerar"}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {BASIS_LABEL[card.basis]}
                {card.sourceStudyId ? ` · ${resolveSourceLabel(card.sourceStudyId)}` : ""}
              </p>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
        >
          Continuar
        </button>
        {!canContinue && <span className="text-xs text-muted-foreground">{continueHint}</span>}
      </div>
    </div>
  );
}

// ─── 4 · Evidência (revisão do que foi considerado) ──────────────────────────

function EvidenciaStage({
  dilemma,
  state,
  resolveSourceLabel,
  onContinue,
}: {
  dilemma: ArenaDilemma;
  state: ArenaState;
  resolveSourceLabel: (studyId: string) => string;
  onContinue: () => void;
}) {
  const considered = dilemma.cards.filter((c) => state.consideredCardIds.includes(c.id));
  const bySide = (side: ArenaSide) => considered.filter((c) => c.side === side);

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Evidência considerada
      </p>
      {(["A", "B"] as const).map((side) => (
        <div key={side} className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-xs font-semibold text-foreground">
            {side === "A" ? dilemma.sideALabel : dilemma.sideBLabel}
          </p>
          <ul className="mt-2 space-y-2">
            {bySide(side).map((card) => (
              <li key={card.id} className="text-xs leading-relaxed text-card-foreground">
                {card.text}
                <span className="ml-1 text-muted-foreground">
                  ({BASIS_LABEL[card.basis]}
                  {card.sourceStudyId ? ` · ${resolveSourceLabel(card.sourceStudyId)}` : ""})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button
        type="button"
        onClick={onContinue}
        className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        Continuar para a revisão
      </button>
    </div>
  );
}

// ─── 5 · Revisão de posição ───────────────────────────────────────────────────

function RevisaoStage({
  dilemma,
  state,
  onSetPositionAfter,
  onContinue,
}: {
  dilemma: ArenaDilemma;
  state: ArenaState;
  onSetPositionAfter: (p: ArenaPosition) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-background p-4">
        <p className="text-xs font-semibold text-foreground">
          Depois de considerar os dois lados: onde você fica agora?
        </p>
        <PositionPicker dilemma={dilemma} value={state.positionAfter} onChange={onSetPositionAfter} />
        <p className="mt-3 text-[11px] text-muted-foreground">
          Não há resposta certa aqui — manter a mesma posição é tão válido quanto mudar.
        </p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        disabled={state.positionAfter === null}
        className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
      >
        Ver síntese
      </button>
    </div>
  );
}

// ─── 6 · Síntese (sem vencedor) + encerramento reflexivo ─────────────────────

function SinteseStage({
  dilemma,
  state,
  onRestart,
}: {
  dilemma: ArenaDilemma;
  state: ArenaState;
  onRestart: () => void;
}) {
  const summary = summarizeArena(dilemma, state);
  return (
    <div className="space-y-4" aria-live="polite">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Síntese
        </p>
        <p className="mt-2 text-sm leading-relaxed text-card-foreground">
          {dilemma.closingSynthesis}
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-background p-4">
        <p className="text-xs font-semibold text-foreground">Sua sessão</p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>
            {summary.sideACardsConsidered} argumento(s) considerado(s) em {dilemma.sideALabel}
          </li>
          <li>
            {summary.sideBCardsConsidered} argumento(s) considerado(s) em {dilemma.sideBLabel}
          </li>
          <li>
            Posição inicial: {summary.positionBefore ? POSITION_LABEL[summary.positionBefore](dilemma) : "—"}
            {" → "}
            posição final: {summary.positionAfter ? POSITION_LABEL[summary.positionAfter](dilemma) : "—"}
            {summary.positionShifted ? " (mudou)" : " (manteve)"}
          </li>
        </ul>
      </div>

      <div className="rounded-r-lg border-l-4 border-border bg-muted/30 px-3 py-2">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Sessão privada e reflexiva — nada aqui foi salvo ou compartilhado. Considerar os dois
          lados com seriedade importa mais do que chegar a uma conclusão única.
        </p>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="min-h-11 rounded-xl border border-border/70 bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        Recomeçar
      </button>
    </div>
  );
}
