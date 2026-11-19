import { WAVE_K_ANON_MIN } from "@/engine/campaign/campaign-engine";
import { applyPreparation, prepCommandSchema, type PrepState } from "./q1-preparation";

type SyntheticGroup = {
  cycle: string;
  label: string;
  publication: "pending" | "published";
  eligibleResponses: number;
  observation: string;
};

/**
 * Projection for authored fixtures only. The production path must consume
 * authorized published aggregates and enforce its own publication rules.
 */
export function projectSyntheticQ1Feedback(group: SyntheticGroup) {
  const context = { synthetic: true as const, cycle: group.cycle, label: group.label };
  if (!Number.isSafeInteger(group.eligibleResponses) || group.eligibleResponses < WAVE_K_ANON_MIN) {
    return {
      ...context,
      state: "protected" as const,
      guidance:
        "Use escuta coletiva e observação da organização do trabalho para orientar a preparação.",
    };
  }
  if (group.publication !== "published") {
    return {
      ...context,
      state: "awaiting_publication" as const,
      guidance: "Aguarde a publicação coletiva antes de interpretar o resultado.",
    };
  }
  return {
    ...context,
    state: "available" as const,
    observation: group.observation,
    guidance:
      "Confira com a equipe em que situações isso ocorre e que condição do trabalho pode ser ajustada.",
  };
}

const syntheticExample: SyntheticGroup = {
  cycle: "2027-T1",
  label: "Turno fictício",
  publication: "published",
  eligibleResponses: WAVE_K_ANON_MIN,
  observation:
    "No cenário de demonstração, a cobertura das pausas no início do turno merece investigação.",
};

export const syntheticQ1FeedbackExamples = {
  available: projectSyntheticQ1Feedback(syntheticExample),
  pending: projectSyntheticQ1Feedback({ ...syntheticExample, publication: "pending" }),
  protected: projectSyntheticQ1Feedback({
    ...syntheticExample,
    eligibleResponses: WAVE_K_ANON_MIN - 1,
  }),
};

const pauseControlId = "00000000-0000-4000-8000-000000000001";
export type SyntheticFollowup = "observed" | "revisit";

/** Replays authored events in memory using the same preparation contract as the journal. */
export function syntheticPauseCase(outcome: SyntheticFollowup | null) {
  const commands = [
    {
      kind: "declare",
      choice: { kind: "catalog", key: "breaks" },
      scope: "Início do turno fictício",
    },
    {
      kind: "verify",
      controlId: pauseControlId,
      source: "dialogue",
      evidence: "Escuta coletiva e escala da equipe fictícia.",
      finding: {
        coverage: "partial",
        gap: "A primeira hora do turno ficou sem cobertura para as pausas.",
      },
    },
    {
      kind: "plan",
      controlId: pauseControlId,
      action: "Garantir cobertura no início do turno",
      owner: "Coordenação do turno",
      due: "2027-02-05",
      indicator: "Turnos com cobertura prevista e conferida",
    },
  ];
  const review = outcome && {
    kind: "review",
    controlId: pauseControlId,
    evidence:
      outcome === "observed"
        ? "A equipe conferiu a cobertura prevista na nova escala durante a semana de ensaio."
        : "A escala revisada ainda deixou um dia da semana sem cobertura.",
    result: outcome === "observed" ? { outcome } : { outcome, nextDate: "2027-02-12" },
  };
  const history = review ? [...commands, review] : commands;
  const state = history.reduce<PrepState>(
    (previous, command, index) => {
      const next = applyPreparation(previous, {
        id:
          index === 0
            ? pauseControlId
            : "00000000-0000-4000-8000-" + String(index + 1).padStart(12, "0"),
        command: prepCommandSchema.parse(command),
      });
      if ("ok" in next) throw new Error("Sequência sintética de pausas inválida.");
      return next;
    },
    { controls: [] },
  );
  return state.controls[0]!;
}
