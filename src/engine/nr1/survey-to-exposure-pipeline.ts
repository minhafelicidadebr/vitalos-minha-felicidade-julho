// Survey-to-Exposure Pipeline — compositor de 3 engines em sequência.
// Prova o moat VitalOS: de resposta cega a decisão de risco em uma pipeline pura.
//
// Pipeline (mock-first, Fase 2 = server-side):
//   1. Validação cega (response-capture-engine)
//   2. Agregação k-anon (response-aggregation-engine)
//   3. Derivação de exposição (exposure-derivation-engine)
//   → DimensionExposure[] pronto para crosswalk-engine
//
// Engine puro: nunca importa de domain/. Sem efeitos colaterais.
// Determinístico: mesmos inputs → mesmo output (testável, auditável).

import type { SurveyDefinition } from "../survey/survey-engine";
import {
    validateBlindSubmission,
    type BlindSurveySubmission,
} from "../survey/response-capture-engine";
import {
    aggregateValidatedResponses,
    publishKAnonymousAggregation,
    type AggregationItemDefinition,
    type AggregationScale,
    type AggregationSubmission,
} from "../aggregation/response-aggregation-engine";
import {
    deriveExposure,
    type AggregateInput,
    type DimensionPolarity,
    type ExposureDerivationResult,
} from "./exposure-derivation-engine";
import type { DimensionExposure } from "./crosswalk-engine";

export interface PipelineConfig {
    survey: SurveyDefinition;
    scale: AggregationScale;
    kAnonymityMin: number;
    polarities: DimensionPolarity[];
}

export type PipelineStage = "validation" | "aggregation" | "derivation";

export interface PipelineSuccess {
    success: true;
    cohortId: string;
    participantCount: number;
    publishable: boolean;
    exposures: DimensionExposure[];
    derivation: ExposureDerivationResult;
    rejectedSubmissions: string[];
}

export interface PipelineFailure {
    success: false;
    stage: PipelineStage;
    reason: string;
    participantCount: number;
    rejectedSubmissions: string[];
}

export type PipelineResult = PipelineSuccess | PipelineFailure;

/**
 * Executa o pipeline completo: submissões cegas → exposição derivada.
 * Rejeita submissões inválidas individualmente (tolerante), mas falha se
 * NENHUMA submissão passar (não pode agregar zero respostas).
 */
export function runSurveyToExposurePipeline(
    cohortId: string,
    submissions: readonly BlindSurveySubmission[],
    config: PipelineConfig,
): PipelineResult {
    const rejected: string[] = [];

    // Stage 1: Validação individual — tolerante (rejeita cada uma sem abortar).
    const validSubmissions: AggregationSubmission[] = [];
    for (const sub of submissions) {
        const validation = validateBlindSubmission(sub, config.survey);
        if (validation.valid) {
            validSubmissions.push({
                submissionId: sub.submissionId,
                answers: validation.normalizedAnswers,
            });
        } else {
            rejected.push(sub.submissionId);
        }
    }

    if (validSubmissions.length === 0) {
        return {
            success: false,
            stage: "validation",
            reason: "no_valid_submissions",
            participantCount: 0,
            rejectedSubmissions: rejected,
        };
    }

    // Stage 2: Agregação.
    const items: AggregationItemDefinition[] = config.survey.items.map((item) => ({
        itemId: item.id,
        pillarId: item.pillarId,
        reverse: item.reverse,
    }));

    const aggResult = aggregateValidatedResponses(validSubmissions, items, config.scale);

    if (!aggResult.valid) {
        return {
            success: false,
            stage: "aggregation",
            reason: aggResult.reason,
            participantCount: 0,
            rejectedSubmissions: rejected,
        };
    }

    // Stage 3: Publicação k-anon → derivação de exposição.
    const publicAgg = publishKAnonymousAggregation(
        cohortId,
        aggResult,
        config.kAnonymityMin,
    );

    const aggregateInputs: AggregateInput[] = publicAgg.pillars.map((p) => ({
        pillarId: p.pillarId,
        mean: p.mean,
        n: p.n,
        visible: p.visible,
    }));

    const derivation = deriveExposure(aggregateInputs, {
        scaleMin: config.scale.min,
        scaleMax: config.scale.max,
        kAnonymityMin: config.kAnonymityMin,
        polarities: config.polarities,
    });

    return {
        success: true,
        cohortId,
        participantCount: publicAgg.participantCount,
        publishable: publicAgg.publishable,
        exposures: derivation.exposures,
        derivation,
        rejectedSubmissions: rejected,
    };
}
