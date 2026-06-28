// Registros de ciclo de vida das ondas — mock-first. Cada onda da jornada tem um
// estado OPERACIONAL (decisão do gestor), distinto do estado temporal (calendário).
//
// Mapeamento à jornada canônica da Empresa (campaign-mock):
//   onda-2026-t1-copsoq → SELADA  (COPSOQ/NR-1 de jan, encerrada, capsule publicável)
//   onda-2026-t2-fibt   → SELADA  (FIB-T de abr, encerrada, capsule publicável)
//   onda-2026-t3-perma  → COLETANDO (PERMA de jun, janela aberta hoje)
//   onda-2026-t4-viat   → AGENDADA (VIA-T de out, publicada, aguardando abrir)
//
// O `sealInput` de cada onda é o que o pipeline produziria ao fechar a coleta:
// as dimensões agregadas (k-anon a montante). Para as ondas já seladas, o mock
// constrói o capsule no carregamento; para a onda em coleta, fornece o sealInput
// que o gestor usaria ao clicar "encerrar".
//
// Domínio A (PERMA, FIB-T, VIA-T) nunca carrega riskLevel; Domínio B (COPSOQ) sim.

import type { CapsuleDimensionInput, CapsuleInput } from "@/engine/ai/measurement-capsule-engine";
import {
  createWaveRecord,
  sealWave,
  applyTransition,
  type WaveLifecycleRecord,
  type WaveLifecycleStatus,
} from "@/engine/survey/wave-lifecycle-engine";

// Ator de sistema para os eventos seed (NUNCA uma pessoa real).
const SEED_ACTOR = "sistema";

// ─── Dimensões agregadas demo por onda (o que o pipeline entregou ao fechar) ───

// COPSOQ (Domínio B) — exposição psicossocial. Alto loadScore = mais risco.
const COPSOQ_DIMS: CapsuleDimensionInput[] = [
  { dimensionId: "demands_quant",      label: "Demandas quantitativas", loadScore: 72, n: 403, visible: true, riskLevel: "alto",     isOutcome: false },
  { dimensionId: "work_pace",          label: "Ritmo de trabalho",      loadScore: 68, n: 403, visible: true, riskLevel: "alto",     isOutcome: false },
  { dimensionId: "demands_emotional",  label: "Exigências emocionais",  loadScore: 58, n: 403, visible: true, riskLevel: "moderado", isOutcome: false },
  { dimensionId: "influence",          label: "Influência no trabalho", loadScore: 41, n: 403, visible: true, riskLevel: "moderado", isOutcome: false },
  { dimensionId: "leadership_quality", label: "Qualidade da liderança", loadScore: 47, n: 403, visible: true, riskLevel: "moderado", isOutcome: false },
  { dimensionId: "insecurity",         label: "Insegurança laboral",    loadScore: 39, n: 403, visible: true, riskLevel: "baixo",    isOutcome: false },
  { dimensionId: "burnout",            label: "Burnout (desfecho)",     loadScore: 55, n: 403, visible: true, riskLevel: "moderado", isOutcome: true },
];

// FIB-T (Domínio A) — ecossistema/bem-comum. loadScore = "distância do ideal".
const FIBT_DIMS: CapsuleDimensionInput[] = [
  { dimensionId: "fib_saude",      label: "Saúde",               loadScore: 30, n: 379, visible: true, isOutcome: false },
  { dimensionId: "fib_trabalho",   label: "Trabalho e renda",    loadScore: 44, n: 379, visible: true, isOutcome: false },
  { dimensionId: "fib_governanca", label: "Governança e voz",    loadScore: 38, n: 379, visible: true, isOutcome: false },
];

// ─── Seal inputs por onda (parâmetro do capsule sem o que o record já guarda) ──

interface WaveLifecycleSeed {
  waveId: string;
  packId: string;
  /** Estado operacional alvo deste seed. */
  targetStatus: WaveLifecycleStatus;
  /** Dados de selamento — presentes para ondas seláveis/seladas. */
  sealInput?: CapsuleInput;
}

function copsoqSealInput(): CapsuleInput {
  return {
    capsuleId: "cap-onda-2026-t1-copsoq",
    packId: "enterprise",
    waveId: "onda-2026-t1-copsoq",
    cohortId: "cohort-enterprise-2026-t1",
    closedOn: "2026-01-22",
    instrument: "COPSOQ II · NR-1",
    instrumentShort: "COPSOQ",
    domain: "B",
    participantCount: 403,
    kAnonymityMin: 5,
    dimensions: COPSOQ_DIMS,
  };
}

function fibtSealInput(): CapsuleInput {
  return {
    capsuleId: "cap-onda-2026-t2-fibt",
    packId: "enterprise",
    waveId: "onda-2026-t2-fibt",
    cohortId: "cohort-enterprise-2026-t2",
    closedOn: "2026-04-22",
    instrument: "FIB-T · Felicidade Interna Bruta",
    instrumentShort: "FIB-T",
    domain: "A",
    participantCount: 379,
    kAnonymityMin: 5,
    dimensions: FIBT_DIMS,
  };
}

function permaSealInput(): CapsuleInput {
  return {
    capsuleId: "cap-onda-2026-t3-perma",
    packId: "enterprise",
    waveId: "onda-2026-t3-perma",
    cohortId: "cohort-enterprise-2026-t3",
    closedOn: "2026-06-22",
    instrument: "PERMA+V → IVO",
    instrumentShort: "PERMA+V / IVO",
    domain: "A",
    participantCount: 311,
    kAnonymityMin: 5,
    dimensions: [
      { dimensionId: "perma_p", label: "Emoções positivas", loadScore: 28, n: 311, visible: true, isOutcome: false },
      { dimensionId: "perma_e", label: "Engajamento",       loadScore: 22, n: 311, visible: true, isOutcome: false },
      { dimensionId: "perma_r", label: "Relacionamentos",   loadScore: 34, n: 311, visible: true, isOutcome: false },
      { dimensionId: "perma_m", label: "Sentido",           loadScore: 19, n: 311, visible: true, isOutcome: false },
      { dimensionId: "perma_a", label: "Realização",        loadScore: 26, n: 311, visible: true, isOutcome: false },
    ],
  };
}

const SEEDS: Record<string, WaveLifecycleSeed> = {
  "onda-2026-t1-copsoq": {
    waveId: "onda-2026-t1-copsoq",
    packId: "enterprise",
    targetStatus: "sealed",
    sealInput: copsoqSealInput(),
  },
  "onda-2026-t2-fibt": {
    waveId: "onda-2026-t2-fibt",
    packId: "enterprise",
    targetStatus: "sealed",
    sealInput: fibtSealInput(),
  },
  "onda-2026-t3-perma": {
    waveId: "onda-2026-t3-perma",
    packId: "enterprise",
    targetStatus: "collecting",
    sealInput: permaSealInput(),
  },
  "onda-2026-t4-viat": {
    waveId: "onda-2026-t4-viat",
    packId: "enterprise",
    targetStatus: "scheduled",
  },
};

// ─── Construção dos registros a partir dos seeds ───────────────────────────────

const SEED_CTX = { actorRole: SEED_ACTOR, at: "2026-01-01T00:00:00.000Z" };

/** Constrói o record no estado alvo, percorrendo as transições legais (auditável). */
function buildSeedRecord(seed: WaveLifecycleSeed): WaveLifecycleRecord {
  let record = createWaveRecord(seed.waveId);

  // draft → scheduled (publicar)
  if (seed.targetStatus === "draft") return record;
  record = unwrap(applyTransition(record, "publish", { ...SEED_CTX, at: "2026-01-02T00:00:00.000Z" }));
  if (seed.targetStatus === "scheduled") return record;

  // scheduled → collecting (abrir)
  record = unwrap(applyTransition(record, "open", { ...SEED_CTX, at: "2026-01-08T00:00:00.000Z" }));
  if (seed.targetStatus === "collecting") return record;

  // collecting → sealed (selar com o sealInput do seed)
  if (seed.targetStatus === "sealed" && seed.sealInput) {
    const sealed = sealWave(record, { capsule: seed.sealInput }, { ...SEED_CTX, at: "2026-01-22T18:00:00.000Z" });
    if (sealed.ok) return sealed.record;
  }
  return record;
}

function unwrap(result: { ok: true; record: WaveLifecycleRecord } | { ok: false }): WaveLifecycleRecord {
  if (!result.ok) throw new Error("[wave-lifecycle-mock] transição seed ilegal — seed inconsistente");
  return result.record;
}

// ─── API do mock ───────────────────────────────────────────────────────────────

/** O record de ciclo de vida de uma onda (reconstruído do seed a cada chamada). */
export function getWaveLifecycleRecord(waveId: string): WaveLifecycleRecord | null {
  const seed = SEEDS[waveId];
  return seed ? buildSeedRecord(seed) : null;
}

/** O sealInput de uma onda em coleta — o que o gestor usaria ao encerrar. */
export function getWaveSealInput(waveId: string): CapsuleInput | null {
  return SEEDS[waveId]?.sealInput ?? null;
}

/** Todos os waveIds de um pack com seed de ciclo de vida. */
export function getPackWaveIds(packId: string): string[] {
  return Object.values(SEEDS)
    .filter((s) => s.packId === packId)
    .map((s) => s.waveId);
}
