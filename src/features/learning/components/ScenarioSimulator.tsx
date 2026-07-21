// ScenarioSimulator — simulador de decisões determinístico e governado
// (LD-008, LDX-2 Fatia C). Uma biblioteca de cenários, um por vez, com
// navegação livre. Cada escolha revela consequência PROVÁVEL, mecanismo, erro
// comum, alternativa melhor e a fonte — nunca pontua "bom líder", nunca
// recomenda sanção, nenhuma opção é humilhante.
//
// SESSION_ONLY: todo estado vive neste componente; nada é persistido nem vira
// avaliação de desempenho. O que sobe para a trilha é só a contagem de cenários
// já explorados (para o marco de progresso), jamais a escolha em si.

import { useEffect, useMemo, useState } from "react";
import {
  resolveScenarioChoice,
  type BranchingScenario,
} from "@/engine/learning/trail-engine";

interface ScenarioSimulatorProps {
  scenarios: readonly BranchingScenario[];
  resolveSourceLabel: (studyId: string) => string;
  /** Reporta quantos cenários distintos já receberam uma escolha. */
  onExploredChange?: (exploredCount: number) => void;
}

export function ScenarioSimulator({
  scenarios,
  resolveSourceLabel,
  onExploredChange,
}: ScenarioSimulatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [choiceByScenario, setChoiceByScenario] = useState<Record<string, string>>({});

  const exploredCount = useMemo(
    () => scenarios.filter((s) => choiceByScenario[s.id]).length,
    [scenarios, choiceByScenario],
  );
  useEffect(() => {
    onExploredChange?.(exploredCount);
  }, [exploredCount, onExploredChange]);

  if (scenarios.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-4" role="note">
        <p className="text-sm text-muted-foreground">Nenhum cenário disponível no momento.</p>
      </div>
    );
  }

  const active = scenarios[Math.min(activeIndex, scenarios.length - 1)];
  const chosenId = choiceByScenario[active.id] ?? null;
  const result = chosenId ? resolveScenarioChoice(active, chosenId) : null;

  function choose(choiceId: string) {
    setChoiceByScenario((prev) => ({ ...prev, [active.id]: choiceId }));
  }

  return (
    <div className="space-y-4">
      {scenarios.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {scenarios.map((s, i) => {
            const isActive = i === activeIndex;
            const explored = Boolean(choiceByScenario[s.id]);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-current={isActive ? "true" : undefined}
                className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  isActive
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-medium">Cenário {i + 1}</span>
                {explored && (
                  <span className="ml-1.5 text-[10px] text-primary" aria-label="explorado">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {exploredCount} de {scenarios.length} explorados
          </span>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-card-foreground">{active.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{active.setup}</p>
      </div>

      <div className="flex flex-col gap-2">
        {active.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => choose(choice.id)}
            aria-pressed={chosenId === choice.id}
            className={`min-h-11 rounded-xl border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              chosenId === choice.id
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>

      {result && (
        <div
          className="space-y-2 rounded-2xl border border-border/70 bg-card p-4"
          aria-live="polite"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {result.isBest
              ? "Escolha mais alinhada ao mecanismo"
              : "Escolha tentadora — veja o custo provável"}
          </p>
          <FeedbackLine label="Consequência provável" value={result.choice.likelyConsequence} />
          <FeedbackLine label="Mecanismo" value={result.choice.mechanismNote} />
          <FeedbackLine label="Erro comum" value={result.choice.commonMistake} />
          {result.choice.betterAlternative && (
            <FeedbackLine label="Alternativa melhor" value={result.choice.betterAlternative} />
          )}
          <p className="pt-1 text-[11px] text-muted-foreground">
            Fonte: {resolveSourceLabel(result.choice.sourceStudyId)}
          </p>
          <button
            type="button"
            onClick={() => choose("")}
            className="mt-1 min-h-11 rounded-xl border border-border/70 bg-background px-4 py-2 text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Tentar outra resposta
          </button>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Simulação para treinar o julgamento — as escolhas não são gravadas, não pontuam liderança
        nem viram avaliação de desempenho.
      </p>
    </div>
  );
}

function FeedbackLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs leading-relaxed text-card-foreground">
      <span className="font-semibold">{label}: </span>
      {value}
    </p>
  );
}
