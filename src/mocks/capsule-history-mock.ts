// Histórico de capsules selados por pack/instrumento — a fonte de dados do MOAT
// longitudinal. Concern SEPARADO do wave-lifecycle (que cuida da OPERAÇÃO da onda
// corrente): aqui vivem os capsules de MÚLTIPLOS ciclos que provam o antes/depois.
//
// Cada entrada é o que o pipeline selou ao fim de cada onda histórica (k-anon a
// montante). Domínio B (COPSOQ) carrega riskLevel; alto loadScore = mais exposição.
//
// Os números contam uma história HONESTA: entre 2025-T1 e 2026-T1 as exigências
// caíram (intervenção surtiu), mas o ritmo piorou (nem tudo melhora) — exatamente o
// tipo de leitura que o longitudinal-engine expõe sem maquiar.

import {
  buildMeasurementCapsule,
  type CapsuleDimensionInput,
  type CapsuleInput,
  type MeasurementContextCapsule,
} from "@/engine/ai/measurement-capsule-engine";

function copsoq(
  packId: string,
  closedOn: string,
  waveId: string,
  cohortId: string,
  participantCount: number,
  dims: CapsuleDimensionInput[],
): CapsuleInput {
  return {
    capsuleId: `cap-${waveId}`,
    packId,
    waveId,
    cohortId,
    closedOn,
    instrument: "COPSOQ II · NR-1",
    instrumentShort: "COPSOQ",
    domain: "B",
    participantCount,
    kAnonymityMin: 5,
    dimensions: dims,
  };
}

function d(
  id: string,
  label: string,
  load: number,
  risk: CapsuleDimensionInput["riskLevel"],
  isOutcome = false,
  n = 403,
): CapsuleDimensionInput {
  return { dimensionId: id, label, loadScore: load, n, visible: true, riskLevel: risk, isOutcome };
}

// Enterprise · COPSOQ — dois ciclos (T1-2025 → T1-2026). Indústria, n=403.
const ENTERPRISE_COPSOQ_HISTORY: CapsuleInput[] = [
  copsoq("enterprise", "2025-01-22", "onda-2025-t1-copsoq", "cohort-enterprise-2025-t1", 403, [
    d("demands_quant", "Demandas quantitativas", 80, "critico"),
    d("work_pace", "Ritmo de trabalho", 60, "moderado"),
    d("demands_emotional", "Exigências emocionais", 64, "alto"),
    d("influence", "Influência no trabalho", 38, "moderado"),
    d("leadership_quality", "Qualidade da liderança", 52, "moderado"),
    d("insecurity", "Insegurança laboral", 45, "moderado"),
    d("burnout", "Burnout (desfecho)", 66, "alto", true),
  ]),
  copsoq("enterprise", "2026-01-22", "onda-2026-t1-copsoq", "cohort-enterprise-2026-t1", 403, [
    d("demands_quant", "Demandas quantitativas", 58, "moderado"), // melhora forte
    d("work_pace", "Ritmo de trabalho", 70, "alto"), // piorou
    d("demands_emotional", "Exigências emocionais", 55, "moderado"),
    d("influence", "Influência no trabalho", 44, "moderado"),
    d("leadership_quality", "Qualidade da liderança", 47, "moderado"),
    d("insecurity", "Insegurança laboral", 39, "baixo"),
    d("burnout", "Burnout (desfecho)", 54, "moderado", true),
  ]),
];

// Saúde · COPSOQ — dois ciclos. Hospital, n=280: perfil DISTINTO (exigências
// emocionais altas caem; ritmo persiste) — prova que o arco lê o dado setorial.
const N_HEALTH = 280;
const HEALTH_COPSOQ_HISTORY: CapsuleInput[] = [
  copsoq("health", "2025-02-22", "onda-2025-saude-copsoq", "cohort-health-2025", N_HEALTH, [
    d("demands_emotional", "Exigências emocionais", 82, "critico", false, N_HEALTH),
    d("work_pace", "Ritmo de trabalho", 72, "alto", false, N_HEALTH),
    d("influence", "Influência no trabalho", 44, "moderado", false, N_HEALTH),
    d("leadership_quality", "Qualidade da liderança", 50, "moderado", false, N_HEALTH),
    d("burnout", "Burnout (desfecho)", 70, "alto", true, N_HEALTH),
  ]),
  copsoq("health", "2026-02-22", "onda-2026-saude-copsoq", "cohort-health-2026", N_HEALTH, [
    d("demands_emotional", "Exigências emocionais", 64, "alto", false, N_HEALTH), // melhora forte
    d("work_pace", "Ritmo de trabalho", 71, "alto", false, N_HEALTH), // persiste
    d("influence", "Influência no trabalho", 41, "moderado", false, N_HEALTH),
    d("leadership_quality", "Qualidade da liderança", 45, "moderado", false, N_HEALTH),
    d("burnout", "Burnout (desfecho)", 60, "moderado", true, N_HEALTH),
  ]),
];

// Mapa pack → instrumento → histórico de inputs.
const HISTORY: Record<string, Record<string, CapsuleInput[]>> = {
  enterprise: {
    COPSOQ: ENTERPRISE_COPSOQ_HISTORY,
  },
  health: {
    COPSOQ: HEALTH_COPSOQ_HISTORY,
  },
};

/** Histórico de capsules selados de um pack+instrumento, em ordem cronológica. */
export function getCapsuleHistory(
  packId: string,
  instrumentShort: string,
): MeasurementContextCapsule[] {
  const inputs = HISTORY[packId]?.[instrumentShort] ?? [];
  return inputs
    .map((i) => buildMeasurementCapsule(i))
    .sort((a, b) => a.closedOn.localeCompare(b.closedOn));
}

/** O capsule mais recente (estado corrente) de um pack+instrumento. Null se vazio. */
export function getLatestCapsule(
  packId: string,
  instrumentShort: string,
): MeasurementContextCapsule | null {
  const history = getCapsuleHistory(packId, instrumentShort);
  return history.at(-1) ?? null;
}

/** Instrumentos com histórico disponível para um pack. */
export function getInstrumentsWithHistory(packId: string): string[] {
  return Object.keys(HISTORY[packId] ?? {});
}
