// Teste de integração do pipeline completo: Survey → Exposure.
// Prova o moat VitalOS: respostas cegas viram decisão de risco em uma única cadeia pura.

import { describe, expect, test } from "bun:test";
import {
    runSurveyToExposurePipeline,
    type PipelineConfig,
} from "./survey-to-exposure-pipeline";
import { COPSOQ_POLARITIES } from "./exposure-derivation-engine";
import type { BlindSurveySubmission } from "../survey/response-capture-engine";
import type { SurveyDefinition, SurveyItem } from "../survey/survey-engine";

// Mini-COPSOQ para teste: 4 itens (2 dimensões: demands_quant neg, influence pos)
const MINI_ITEMS: SurveyItem[] = [
    { id: "dq1", pillarId: "demands_quant", text: "Sua carga de trabalho é excessiva?" },
    { id: "dq2", pillarId: "demands_quant", text: "Precisa trabalhar rápido demais?" },
    { id: "inf1", pillarId: "influence", text: "Você pode influenciar decisões?" },
    { id: "inf2", pillarId: "influence", text: "Tem autonomia no seu trabalho?" },
];

const MINI_SURVEY: SurveyDefinition = {
    id: "copsoq-mini-test",
    instrumentShort: "COPSOQ-mini",
    items: MINI_ITEMS,
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
        eyebrow: "COPSOQ Mini",
        lead: "Teste",
        disclaimer: "Demonstrativo",
        thanksTitle: "Obrigado",
        thanksBody: "Fim",
    },
    completionRoute: "/devolutiva",
    completionLabel: "Ver devolutiva",
};

const CONFIG: PipelineConfig = {
    survey: MINI_SURVEY,
    scale: { min: 0, max: 4 },
    kAnonymityMin: 5,
    polarities: COPSOQ_POLARITIES,
};

function makeSub(id: string, dq1: number, dq2: number, inf1: number, inf2: number): BlindSurveySubmission {
    return {
        submissionId: id,
        waveId: "wave-1",
        surveyId: "copsoq-mini-test",
        answers: [
            { itemId: "dq1", value: dq1 },
            { itemId: "dq2", value: dq2 },
            { itemId: "inf1", value: inf1 },
            { itemId: "inf2", value: inf2 },
        ],
    };
}

describe("survey-to-exposure-pipeline — pipeline completo", () => {
    test("pipeline com k≥5 respondentes: exposição derivada com sucesso", () => {
        // 6 respondentes: alta carga (demands alto), baixa autonomia (influence baixo)
        const subs = [
            makeSub("s1", 3, 4, 1, 1),
            makeSub("s2", 4, 3, 1, 2),
            makeSub("s3", 3, 3, 2, 1),
            makeSub("s4", 4, 4, 1, 1),
            makeSub("s5", 3, 4, 2, 2),
            makeSub("s6", 4, 3, 1, 1),
        ];

        const result = runSurveyToExposurePipeline("cohort-test", subs, CONFIG);
        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.participantCount).toBe(6);
        expect(result.publishable).toBe(true);
        expect(result.exposures).toHaveLength(2);

        // demands_quant: negativo, alto → alta carga (>50)
        const dq = result.exposures.find((e) => e.dimensionId === "demands_quant");
        expect(dq!.visible).toBe(true);
        expect(dq!.load).toBeGreaterThan(50);

        // influence: positivo, baixo → alta carga (inversão → >50)
        const inf = result.exposures.find((e) => e.dimensionId === "influence");
        expect(inf!.visible).toBe(true);
        expect(inf!.load).toBeGreaterThan(50);
    });

    test("pipeline com n<5: publicável=false, dimensões protegidas", () => {
        const subs = [
            makeSub("s1", 3, 4, 1, 1),
            makeSub("s2", 4, 3, 1, 2),
            makeSub("s3", 3, 3, 2, 1),
        ]; // só 3

        const result = runSurveyToExposurePipeline("thin-cohort", subs, CONFIG);
        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.participantCount).toBe(3);
        expect(result.publishable).toBe(false);
        // Dimensões devem ficar protegidas (n=3 < k=5)
        for (const e of result.exposures) {
            expect(e.visible).toBe(false);
            expect(e.load).toBe(0);
        }
    });

    test("submissões inválidas são rejeitadas sem abortar o pipeline", () => {
        const valid = [
            makeSub("s1", 3, 4, 1, 1),
            makeSub("s2", 4, 3, 1, 2),
            makeSub("s3", 3, 3, 2, 1),
            makeSub("s4", 4, 4, 1, 1),
            makeSub("s5", 3, 4, 2, 2),
        ];
        const invalid: BlindSurveySubmission = {
            submissionId: "bad",
            waveId: "wave-1",
            surveyId: "copsoq-mini-test",
            answers: [{ itemId: "dq1", value: 99 }], // incompleta + valor inválido
        };

        const result = runSurveyToExposurePipeline("mixed", [...valid, invalid], CONFIG);
        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.participantCount).toBe(5);
        expect(result.rejectedSubmissions).toContain("bad");
        expect(result.rejectedSubmissions).toHaveLength(1);
    });

    test("zero submissões válidas: falha no estágio de validação", () => {
        const allBad: BlindSurveySubmission[] = [
            { submissionId: "", waveId: "w", surveyId: "copsoq-mini-test", answers: [] },
        ];

        const result = runSurveyToExposurePipeline("empty", allBad, CONFIG);
        expect(result.success).toBe(false);
        if (result.success) return;

        expect(result.stage).toBe("validation");
        expect(result.reason).toBe("no_valid_submissions");
    });

    test("determinismo: mesmos inputs → mesmo output", () => {
        const subs = [
            makeSub("s1", 3, 4, 1, 1),
            makeSub("s2", 4, 3, 1, 2),
            makeSub("s3", 3, 3, 2, 1),
            makeSub("s4", 4, 4, 1, 1),
            makeSub("s5", 3, 4, 2, 2),
        ];

        const a = runSurveyToExposurePipeline("det-1", subs, CONFIG);
        const b = runSurveyToExposurePipeline("det-1", subs, CONFIG);
        expect(a).toEqual(b);
    });

    test("composição com crosswalk: exposição derivada é compatível com rankDriversByExposure", async () => {
        const { rankDriversByExposure } = await import("./crosswalk-engine");
        const { NR1_CROSSWALK } = await import("@/mocks/nr1-crosswalk-mock");

        // Gerar submissões que simulam um cenário com todas as 12 dimensões
        // Aqui usamos o mini (2 dims) como proxy — o contrato de tipo é o mesmo
        const subs = [
            makeSub("s1", 4, 4, 0, 0), // alta carga, zero autonomia
            makeSub("s2", 4, 4, 0, 1),
            makeSub("s3", 4, 3, 1, 0),
            makeSub("s4", 3, 4, 0, 0),
            makeSub("s5", 4, 4, 1, 1),
        ];

        const result = runSurveyToExposurePipeline("compose-test", subs, CONFIG);
        expect(result.success).toBe(true);
        if (!result.success) return;

        // A exposição pode ser passada ao crosswalk — o contrato DimensionExposure é satisfeito
        const ranked = rankDriversByExposure(NR1_CROSSWALK, result.exposures);
        // Pode não ter prioridades se as dimensões não cobrem o crosswalk inteiro, mas não deve falhar
        expect(ranked).toBeInstanceOf(Array);
    });
});
