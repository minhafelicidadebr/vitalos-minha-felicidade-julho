// Exposure Derivation Engine — fecha o elo: Aggregation → DimensionExposure.
//
// Pipeline completo (M.E.T.E. / Medir → Transformar):
//   1. Captura cega (response-capture-engine) → respostas validadas
//   2. Agregação k-anon (response-aggregation-engine) → PublicPillarAggregate[]
//   3. **Derivação de exposição** (ESTE ENGINE) → DimensionExposure[]
//   4. Crosswalk (crosswalk-engine) → rankDriversByExposure → prioridades
//   5. PGR (pgr-engine) → plano de gestão
//
// A exposição NÃO é o score bruto: é o percentual de carga psicossocial (0..100).
// COPSOQ mede tanto positivo (influência, sentido) quanto negativo (exigências).
// Dimensões positivas: alto score = BAIXA carga. Dimensões negativas: alto = ALTA carga.
// O engine normaliza tudo para "load" uniforme: 0 = sem risco, 100 = risco máximo.
//
// k-anonymity: dimensões com `visible: false` na agregação NÃO geram exposição —
// o crosswalk-engine não pode priorizar o que não se pode revelar (n < k).
//
// Engine puro: nunca importa de domain/. Configuração entra como parâmetro.

import type { DimensionExposure } from "./crosswalk-engine";

export interface DimensionPolarity {
    dimensionId: string;
    /** "negative" = alto score na escala = alta carga (exigências, ritmo, insegurança).
     *  "positive" = alto score = BAIXA carga (influência, sentido, apoio). */
    polarity: "positive" | "negative";
}

export interface AggregateInput {
    pillarId: string; // maps to dimensionId in the crosswalk
    mean: number | null;
    n: number;
    visible: boolean;
}

export interface ExposureDerivationConfig {
    scaleMin: number;
    scaleMax: number;
    kAnonymityMin: number;
    polarities: DimensionPolarity[];
}

export interface ExposureDerivationResult {
    exposures: DimensionExposure[];
    derivedCount: number;
    protectedCount: number;
    totalDimensions: number;
}

/**
 * Converte agregados publicáveis em perfil de exposição COPSOQ.
 * Dimensões protegidas (n < k) ficam `visible: false` e load = 0 (nunca priorizadas).
 */
export function deriveExposure(
    aggregates: readonly AggregateInput[],
    config: ExposureDerivationConfig,
): ExposureDerivationResult {
    const polarityMap = new Map(config.polarities.map((p) => [p.dimensionId, p.polarity]));
    const scaleRange = config.scaleMax - config.scaleMin;

    const exposures: DimensionExposure[] = [];
    let derivedCount = 0;
    let protectedCount = 0;

    for (const agg of aggregates) {
        const visible = agg.visible && agg.n >= config.kAnonymityMin && agg.mean !== null;

        if (!visible) {
            protectedCount++;
            exposures.push({
                dimensionId: agg.pillarId,
                load: 0,
                visible: false,
            });
            continue;
        }

        // Normaliza mean (escala do instrumento) para load (0..100 = risco).
        const normalizedMean = ((agg.mean! - config.scaleMin) / scaleRange);
        const polarity = polarityMap.get(agg.pillarId) ?? "negative";

        // Positive polarity: alto score = bom → load é o inverso.
        // Negative polarity: alto score = ruim → load direto.
        const load = polarity === "positive"
            ? Math.round((1 - normalizedMean) * 100)
            : Math.round(normalizedMean * 100);

        derivedCount++;
        exposures.push({
            dimensionId: agg.pillarId,
            load: Math.max(0, Math.min(100, load)),
            visible: true,
        });
    }

    return {
        exposures,
        derivedCount,
        protectedCount,
        totalDimensions: aggregates.length,
    };
}

/**
 * Polaridades canônicas COPSOQ II (12 dimensões core + 2 desfechos).
 * Fonte: NCOPSII v2 manual de scoring + Guia MTE 2026.
 * Desfechos (burnout, comportamentos_ofensivos) são excluídos do crosswalk
 * por design (outcomeViolations guard); incluí-los aqui é defensivo.
 */
export const COPSOQ_POLARITIES: DimensionPolarity[] = [
    // Negativas: alto score na escala = alta carga
    { dimensionId: "demands_quant", polarity: "negative" },
    { dimensionId: "work_pace", polarity: "negative" },
    { dimensionId: "demands_emotional", polarity: "negative" },
    { dimensionId: "insecurity", polarity: "negative" },
    // Positivas: alto score = baixa carga (recurso protetor)
    { dimensionId: "influence", polarity: "positive" },
    { dimensionId: "meaning", polarity: "positive" },
    { dimensionId: "predictability", polarity: "positive" },
    { dimensionId: "role_clarity", polarity: "positive" },
    { dimensionId: "leadership_quality", polarity: "positive" },
    { dimensionId: "social_support", polarity: "positive" },
    { dimensionId: "recognition", polarity: "positive" },
    { dimensionId: "community", polarity: "positive" },
    // Desfechos (lidos, não acionados — outcomeViolations guard protege)
    { dimensionId: "burnout", polarity: "negative" },
    { dimensionId: "comportamentos_ofensivos", polarity: "negative" },
];
