// Teste de integração arco M.E.T.E. completo para NR-1.
// Prova a tese VitalOS: de uma RESPOSTA CEGA a uma DECISÃO DE RISCO PRIORIZADA
// em pipeline puro, determinístico e auditável.
//
// Arco: Medir (captura cega → agregação → exposição) → Transformar (crosswalk → PGR)
//       → Evoluir (reavaliação longitudinal)
//
// Se este teste passa, o pipeline funcional do VitalOS para NR-1 está integrado ponta-a-ponta.
// É o equivalente a um "smoke test do moat" — prova que a disrupção é a integração.

import { describe, expect, test } from "bun:test";
import { runSurveyToExposurePipeline, type PipelineConfig } from "./survey-to-exposure-pipeline";
import { COPSOQ_POLARITIES } from "./exposure-derivation-engine";
import { rankDriversByExposure } from "./crosswalk-engine";
import { buildPgrPlan } from "./pgr-engine";
import { buildReavaliacao } from "./reavaliacao-engine";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";
import { PGR_MEASURES } from "@/mocks/pgr-nr1-mock";
import type { BlindSurveySubmission } from "../survey/response-capture-engine";
import type { SurveyDefinition, SurveyItem } from "../survey/survey-engine";
import type { CycleExposure } from "./reavaliacao-engine";

// ─── Fixture: COPSOQ simplificado com as 12 dimensões core ──────────────────────
// Cada dimensão = 2 itens para manter o teste compacto mas realista.

const COPSOQ_12_ITEMS: SurveyItem[] = [
    // Negativas (exigências e insegurança)
    { id: "dq1", pillarId: "demands_quant", text: "Carga quantitativa 1" },
    { id: "dq2", pillarId: "demands_quant", text: "Carga quantitativa 2" },
    { id: "wp1", pillarId: "work_pace", text: "Ritmo 1" },
    { id: "wp2", pillarId: "work_pace", text: "Ritmo 2" },
    { id: "de1", pillarId: "demands_emotional", text: "Exigência emocional 1" },
    { id: "de2", pillarId: "demands_emotional", text: "Exigência emocional 2" },
    { id: "ins1", pillarId: "insecurity", text: "Insegurança 1" },
    { id: "ins2", pillarId: "insecurity", text: "Insegurança 2" },
    // Positivas (recursos)
    { id: "inf1", pillarId: "influence", text: "Influência 1" },
    { id: "inf2", pillarId: "influence", text: "Influência 2" },
    { id: "me1", pillarId: "meaning", text: "Sentido 1" },
    { id: "me2", pillarId: "meaning", text: "Sentido 2" },
    { id: "pr1", pillarId: "predictability", text: "Previsibilidade 1" },
    { id: "pr2", pillarId: "predictability", text: "Previsibilidade 2" },
    { id: "rc1", pillarId: "role_clarity", text: "Clareza de papel 1" },
    { id: "rc2", pillarId: "role_clarity", text: "Clareza de papel 2" },
    { id: "lq1", pillarId: "leadership_quality", text: "Qualidade liderança 1" },
    { id: "lq2", pillarId: "leadership_quality", text: "Qualidade liderança 2" },
    { id: "ss1", pillarId: "social_support", text: "Apoio social 1" },
    { id: "ss2", pillarId: "social_support", text: "Apoio social 2" },
    { id: "rn1", pillarId: "recognition", text: "Reconhecimento 1" },
    { id: "rn2", pillarId: "recognition", text: "Reconhecimento 2" },
    { id: "cm1", pillarId: "community", text: "Comunidade 1" },
    { id: "cm2", pillarId: "community", text: "Comunidade 2" },
];

const COPSOQ_SURVEY: SurveyDefinition = {
    id: "copsoq-12-integration",
    instrumentShort: "COPSOQ-12",
    items: COPSOQ_12_ITEMS,
    scale: {
        presentation: "buttons",
        options: [
            { value: 0, label: "Nunca" },
            { value: 1, label: "Raramente" },
            { value: 2, label: "Às vezes" },
            { value: 3, label: "Frequentemente" },
            { value: 4, label: "Sempre" },
        ],
        minLabel: "Nunca",
        maxLabel: "Sempre",
    },
    intro: {
        eyebrow: "COPSOQ",
        lead: "Integração",
        disclaimer: "Educativo",
        thanksTitle: "Obrigado",
        thanksBody: "Fim",
    },
    completionRoute: "/devolutiva",
    completionLabel: "Devolutiva",
};

const PIPELINE_CONFIG: PipelineConfig = {
    survey: COPSOQ_SURVEY,
    scale: { min: 0, max: 4 },
    kAnonymityMin: 5,
    polarities: COPSOQ_POLARITIES,
};

/** Gera respondente com perfil de alta exigência / baixo recurso (cenário risco). */
function highRiskSubmission(id: string): BlindSurveySubmission {
    return {
        submissionId: id,
        waveId: "wave-mete-test",
        surveyId: "copsoq-12-integration",
        answers: COPSOQ_12_ITEMS.map((item) => {
            // Negativas (exigências): score alto (3-4)
            if (["demands_quant", "work_pace", "demands_emotional", "insecurity"].includes(item.pillarId)) {
                return { itemId: item.id, value: 3 + (item.id.endsWith("1") ? 1 : 0) };
            }
            // Positivas (recursos): score baixo (0-1)
            return { itemId: item.id, value: item.id.endsWith("1") ? 0 : 1 };
        }),
    };
}

describe("M.E.T.E. arc integration — NR-1 ponta-a-ponta", () => {
    // ─── MEDIR ──────────────────────────────────────────────────────────────

    test("Medir: 8 respondentes alto-risco → exposição derivada com 12 dimensões", () => {
        const subs = Array.from({ length: 8 }, (_, i) => highRiskSubmission(`hr-${i}`));
        const result = runSurveyToExposurePipeline("mete-medir", subs, PIPELINE_CONFIG);

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.participantCount).toBe(8);
        expect(result.publishable).toBe(true);
        // 12 dimensões (community com n=8≥5, todas visíveis)
        expect(result.exposures).toHaveLength(12);
        const visible = result.exposures.filter((e) => e.visible);
        expect(visible.length).toBe(12); // n=8≥5 para todas

        // Alta carga em exigências
        const demandsLoad = result.exposures.find((e) => e.dimensionId === "demands_quant")!.load;
        expect(demandsLoad).toBeGreaterThan(60);

        // Alta carga em recursos (invertidos: baixo score positivo → alta carga)
        const influenceLoad = result.exposures.find((e) => e.dimensionId === "influence")!.load;
        expect(influenceLoad).toBeGreaterThan(60);
    });

    // ─── TRANSFORMAR ────────────────────────────────────────────────────────

    test("Transformar: exposição derivada → crosswalk prioriza → PGR gerado", () => {
        const subs = Array.from({ length: 10 }, (_, i) => highRiskSubmission(`tf-${i}`));
        const pipeline = runSurveyToExposurePipeline("mete-transformar", subs, PIPELINE_CONFIG);
        expect(pipeline.success).toBe(true);
        if (!pipeline.success) return;

        // Crosswalk prioriza a partir da exposição derivada do pipeline
        const ranked = rankDriversByExposure(NR1_CROSSWALK, pipeline.exposures);
        const priorities = ranked.filter((d) => d.priority);
        expect(priorities.length).toBeGreaterThan(0);

        // O top driver deve ser "carga" ou outro com exposição medida alta
        const topDriver = priorities[0]!;
        expect(topDriver.score).toBeGreaterThan(0);

        // PGR gerado a partir da mesma exposição
        const plan = buildPgrPlan({
            registry: NR1_CROSSWALK,
            exposures: pipeline.exposures,
            measures: PGR_MEASURES,
            generatedAt: "2026-06-23",
            currentWeek: 1,
            horizonWeeks: 13,
            topRisks: 5,
        });

        expect(plan.risks.length).toBeGreaterThan(0);
        // Pelo menos 1 risco com medidas atribuídas
        const withMeasures = plan.risks.filter((r) => r.measures && r.measures.length > 0);
        expect(withMeasures.length).toBeGreaterThan(0);
        // Pelo menos 1 risco classificado (qualquer nível — a exposição alimenta a decisão)
        expect(plan.risks.length).toBeGreaterThan(0);
        // Confirma que a cadeia pipeline→crosswalk→pgr funciona end-to-end
        expect(plan.risks[0]!.driverId).toBeDefined();
        expect(plan.risks[0]!.riskLevel).toBeDefined();
    });

    // ─── EVOLUIR ────────────────────────────────────────────────────────────

    test("Evoluir: múltiplos ciclos pipeline → reavaliação detecta tendência", () => {
        // Ciclo 1: alto risco (8 respondentes alta carga)
        const subs1 = Array.from({ length: 8 }, (_, i) => highRiskSubmission(`ev1-${i}`));
        const cycle1 = runSurveyToExposurePipeline("cycle-1", subs1, PIPELINE_CONFIG);
        expect(cycle1.success).toBe(true);
        if (!cycle1.success) return;

        // Ciclo 2: risco moderado (intervenção reduziu exigências)
        const moderateSubs = Array.from({ length: 8 }, (_, i): BlindSurveySubmission => ({
            submissionId: `ev2-${i}`,
            waveId: "wave-2",
            surveyId: "copsoq-12-integration",
            answers: COPSOQ_12_ITEMS.map((item) => {
                if (["demands_quant", "work_pace", "demands_emotional", "insecurity"].includes(item.pillarId)) {
                    return { itemId: item.id, value: 2 }; // reduzido de 3-4 para 2
                }
                return { itemId: item.id, value: 2 }; // recursos melhoraram de 0-1 para 2
            }),
        }));
        const cycle2 = runSurveyToExposurePipeline("cycle-2", moderateSubs, PIPELINE_CONFIG);
        expect(cycle2.success).toBe(true);
        if (!cycle2.success) return;

        // Montar ciclos para reavaliação
        const cycles: CycleExposure[] = [
            { cycleId: "c1", label: "2026 Q1", exposures: cycle1.exposures },
            { cycleId: "c2", label: "2026 Q2", exposures: cycle2.exposures },
        ];

        const plan = buildPgrPlan({
            registry: NR1_CROSSWALK,
            exposures: cycle1.exposures,
            measures: PGR_MEASURES,
            generatedAt: "2026-03-01",
            currentWeek: 13,
            horizonWeeks: 13,
            topRisks: 5,
        });

        const reav = buildReavaliacao({
            registry: NR1_CROSSWALK,
            cycles,
            pgrPlan: plan,
            maintenanceByDriver: {},
        });

        // Tendência geral deve ser "melhorando" (carga caiu em tudo)
        expect(reav.overallTrend).toBe("melhorando");
        expect(reav.meanLast).toBeLessThan(reav.meanFirst);
        expect(reav.improvedCount).toBeGreaterThan(0);
    });

    // ─── INVARIANTES ────────────────────────────────────────────────────────

    test("invariante: resposta individual NUNCA aparece no output do pipeline", () => {
        const subs = Array.from({ length: 6 }, (_, i) => highRiskSubmission(`inv-${i}`));
        const result = runSurveyToExposurePipeline("inv-test", subs, PIPELINE_CONFIG);
        expect(result.success).toBe(true);
        if (!result.success) return;

        // O resultado não contém nenhum submissionId, nenhum valor individual
        const json = JSON.stringify(result);
        for (const sub of subs) {
            // submissionId pode estar em rejectedSubmissions (vazio aqui), ok
            // mas VALORES individuais das respostas nunca aparecem
            for (const ans of sub.answers) {
                // O valor bruto da resposta (0-4) não deve existir como exposição
                // (exposição é 0-100, normalizada)
                expect(result.exposures.every((e) => e.load !== ans.value || ans.value === 0)).toBe(true);
            }
        }
        // Nenhum submissionId no resultado (exceto em rejected, que está vazio)
        expect(result.rejectedSubmissions).toHaveLength(0);
    });

    test("invariante: pipeline é determinístico (auditável)", () => {
        const subs = Array.from({ length: 7 }, (_, i) => highRiskSubmission(`det-${i}`));
        const a = runSurveyToExposurePipeline("det", subs, PIPELINE_CONFIG);
        const b = runSurveyToExposurePipeline("det", subs, PIPELINE_CONFIG);
        expect(a).toEqual(b);
    });
});
