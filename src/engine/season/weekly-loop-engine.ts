// Loop Vivo da Semana — engine PURO (I3, Academia Viva 2.0). Os 7 passos do
// ritual individual do irmão viram maré COLETIVA de equipe dentro do ritmo M.E.T.E.
//
// TESE: cada passo destrava pela COBERTURA da equipe (% de pessoas que
// completaram), nunca pelo progresso de um indivíduo — e a cobertura só é
// revelada quando a equipe tem gente suficiente para proteger quem ainda não
// completou (mesmo piso k-anon usado em toda a economia de Sementes e no
// Diário de Prática: equipes pequenas demais ficam "protegidas", nunca expostas).
//
// Ciência: Fredrickson 2001 (broaden-and-build — Celebrar não é enfeite, é
// mecanismo); Gaertner & Dovidio (identidade de grupo comum — a equipe fecha
// o loop JUNTA); Gollwitzer 1999 (Praticar carrega intenção de implementação).
//
// Novo vs. um loop individual: aqui não existe "sua barra de progresso" — só o
// anel do TIME. Destravamento é sequencial (um passo só abre quando o anterior
// foi concluído PELA EQUIPE), espelhando a estrutura de um ritual semanal real.
//
// Engine ≠ Domínio: rótulos, threshold de cobertura e k-anon chegam por parâmetro.

export type LoopStepId =
  | "aprender"
  | "praticar"
  | "evidenciar"
  | "refletir"
  | "compartilhar"
  | "celebrar"
  | "evoluir";

export const LOOP_STEP_ORDER: readonly LoopStepId[] = [
  "aprender",
  "praticar",
  "evidenciar",
  "refletir",
  "compartilhar",
  "celebrar",
  "evoluir",
];

export interface WeeklyLoopPolicy {
  /** % mínimo da equipe que precisa completar um passo para ele contar como feito. */
  coverageThresholdPct: number;
  /** Tamanho mínimo de equipe para revelar cobertura com segurança (mesmo piso k-anon do app). */
  kAnonymityMin: number;
}

export const DEFAULT_LOOP_POLICY: WeeklyLoopPolicy = {
  coverageThresholdPct: 60,
  kAnonymityMin: 5,
};

export interface WeeklyLoopInput {
  teamSize: number;
  /** Nº de pessoas da equipe que completaram cada passo neste ciclo (nunca quem, só quantas). */
  completedCountByStep: Partial<Record<LoopStepId, number>>;
}

export interface LoopStepResult {
  id: LoopStepId;
  /** null quando a equipe é pequena demais para revelar cobertura com segurança. */
  coveragePct: number | null;
  done: boolean;
  /** true só quando o passo ANTERIOR foi concluído pela equipe — destravamento sequencial. */
  unlocked: boolean;
}

export interface WeeklyLoopResult {
  /** false quando teamSize < kAnonymityMin — o loop inteiro fica protegido, nunca exposto. */
  visible: boolean;
  steps: LoopStepResult[];
  completedSteps: number;
  totalSteps: number;
}

export function buildWeeklyLoop(
  input: WeeklyLoopInput,
  policy: WeeklyLoopPolicy = DEFAULT_LOOP_POLICY,
): WeeklyLoopResult {
  const visible = input.teamSize >= policy.kAnonymityMin;

  let previousDone = true; // "aprender" é o primeiro passo — nasce destravado.
  const steps: LoopStepResult[] = LOOP_STEP_ORDER.map((id) => {
    const completedCount = input.completedCountByStep[id] ?? 0;
    const coveragePct =
      visible && input.teamSize > 0 ? Math.round((completedCount / input.teamSize) * 100) : null;
    const done = coveragePct !== null && coveragePct >= policy.coverageThresholdPct;
    const unlocked = previousDone;
    previousDone = done;
    return { id, coveragePct, done, unlocked };
  });

  return {
    visible,
    steps,
    completedSteps: steps.filter((s) => s.done).length,
    totalSteps: steps.length,
  };
}
