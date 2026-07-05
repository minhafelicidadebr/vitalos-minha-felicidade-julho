// Cofre de Ciclos — engine PURO (Arco da Prova, I-P1, substrato E do S6.75).
//
// Mapeia o que o banco guarda de um ciclo REGISTRADO (capsule selado + a chave
// de ciclo que um humano declarou) para o MESMO tipo que capsule-history-mock.ts
// devolve hoje — MeasurementContextCapsule[] — para que buildLongitudinalReading,
// evaluateInterventionBatch e buildCycleProof funcionem SEM MUDAR UMA LINHA
// de engine (composição, não acúmulo — Fable5 §5.1).
//
// DECISÃO DE CONVERSÃO (honesta, verificada contra o código real, não inventada):
// `wave_capsules.dimensions` guarda `{mean, high_risk_pct, n}` por dimensão —
// `mean` é a média bruta NA ESCALA DO INSTRUMENTO após reversão de item
// (capsule-aggregator.server.ts já normaliza polaridade: baixo = mais
// exposição, uniforme entre dimensões). Reconstruir um `loadScore` 0..100 a
// partir de `mean` exigiria conhecer os limites da escala, que não são
// persistidos aqui. `high_risk_pct` JÁ é 0..100 e JÁ significa "quanto pior,
// maior" — exatamente a convenção que `loadScore` espera — por isso é usado
// DIRETAMENTE como loadScore, sem inventar fórmula de conversão de escala.
//
// riskLevel é uma banda de PROBABILIDADE apenas (reusa `probabilityFromLoad`
// do pgr-engine, os MESMOS limiares 40/60/75 já usados no PGR real) — não é a
// matriz NR-01 completa (probabilidade × severidade), que exige severidade por
// DRIVER (crosswalk), não por dimensão bruta. Documentado para não ser
// confundido com `classifyRisk`.
//
// Labels de dimensão vêm INJETADAS (dimensionMeta) — o engine nunca importa
// domain/ nem mocks; o chamador passa o registro canônico (hoje:
// NR1_CROSSWALK.dimensions, já usado pelo pipeline real de exposição).
//
// Engine puro: sem React, sem I/O, sem imports de domain/.

import { probabilityFromLoad, type RiskLevel } from "../nr1/pgr-engine";
import {
  buildMeasurementCapsule,
  type CapsuleDimensionInput,
  type MeasurementContextCapsule,
  type PriorCycleInput,
} from "../ai/measurement-capsule-engine";

export interface DimensionMeta {
  id: string;
  label: string;
  isOutcome?: boolean;
}

export interface CapsuleDimRow {
  mean: number;
  high_risk_pct: number;
  n: number;
}

/** Um ciclo registrado, já resolvido do banco (org_cycle_registry ⋈ wave_capsules). */
export interface RegisteredCycleRow {
  cycleKey: string;
  capsuleId: string;
  waveId: string;
  instrument: string;
  domain: "A" | "B";
  closedOn: string;
  participantCount: number;
  kAnonymityMin: number;
  dimensions: Record<string, CapsuleDimRow>;
  outcomes: Record<string, CapsuleDimRow> | null;
}

const PROB_BAND_TO_RISK: Record<string, RiskLevel> = {
  baixa: "baixo",
  media: "moderado",
  alta: "alto",
  muito_alta: "critico",
};

/** Banda de probabilidade (não a matriz NR-01 completa) — ver nota de decisão no topo. */
export function riskLevelFromHighRiskPct(highRiskPct: number): RiskLevel {
  return PROB_BAND_TO_RISK[probabilityFromLoad(highRiskPct).band]!;
}

function dimensionInputsFromRow(
  row: RegisteredCycleRow,
  dimensionMeta: readonly DimensionMeta[],
): CapsuleDimensionInput[] {
  const metaById = new Map(dimensionMeta.map((m) => [m.id, m]));
  const inputs: CapsuleDimensionInput[] = [];

  function pushGroup(group: Record<string, CapsuleDimRow> | null, isOutcome: boolean) {
    if (!group) return;
    for (const [dimId, row2] of Object.entries(group)) {
      const meta = metaById.get(dimId);
      // Honestidade: uma dimensão sem registro canônico de label é OMITIDA,
      // nunca exibida com um rótulo inventado.
      if (!meta) continue;
      inputs.push({
        dimensionId: dimId,
        label: meta.label,
        loadScore: row2.high_risk_pct,
        n: row2.n,
        visible: row2.n >= row.kAnonymityMin,
        riskLevel: row.domain === "B" ? riskLevelFromHighRiskPct(row2.high_risk_pct) : null,
        isOutcome,
      });
    }
  }

  pushGroup(row.dimensions, false);
  pushGroup(row.outcomes, true);
  return inputs;
}

/**
 * Constrói a série longitudinal de capsules a partir de ciclos REGISTRADOS
 * (ordem cronológica por closedOn) — o mesmo formato que
 * `capsule-history-mock.getCapsuleHistory` devolve hoje.
 */
export function buildRegisteredHistory(
  rows: readonly RegisteredCycleRow[],
  dimensionMeta: readonly DimensionMeta[],
  packId: string,
): MeasurementContextCapsule[] {
  const sorted = [...rows].sort((a, b) => a.closedOn.localeCompare(b.closedOn));
  const capsules: MeasurementContextCapsule[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i]!;
    const priorCycles: PriorCycleInput[] = sorted.slice(0, i).map((prior) => ({
      cycleId: prior.cycleKey,
      label: prior.cycleKey,
      dimensions: dimensionInputsFromRow(prior, dimensionMeta).map((d) => ({
        dimensionId: d.dimensionId,
        loadScore: d.loadScore,
        visible: d.visible,
      })),
    }));

    capsules.push(
      buildMeasurementCapsule({
        capsuleId: row.capsuleId,
        packId,
        waveId: row.waveId,
        cohortId: row.cycleKey,
        closedOn: row.closedOn,
        instrument: row.instrument,
        instrumentShort: row.instrument,
        domain: row.domain,
        participantCount: row.participantCount,
        kAnonymityMin: row.kAnonymityMin,
        dimensions: dimensionInputsFromRow(row, dimensionMeta),
        priorCycles,
      }),
    );
  }

  return capsules;
}
