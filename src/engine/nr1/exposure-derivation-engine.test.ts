// Testes do Exposure Derivation Engine — fecha o pipeline Medir → Transformar.
// Prova que agregados COPSOQ se convertem corretamente em perfil de exposição.

import { describe, expect, test } from "bun:test";
import {
    COPSOQ_POLARITIES,
    deriveExposure,
    type AggregateInput,
    type ExposureDerivationConfig,
} from "./exposure-derivation-engine";

const DEFAULT_CONFIG: ExposureDerivationConfig = {
    scaleMin: 0,
    scaleMax: 4,
    kAnonymityMin: 5,
    polarities: COPSOQ_POLARITIES,
};

function makeAgg(
    pillarId: string,
    mean: number | null,
    n: number,
    visible = true,
): AggregateInput {
    return { pillarId, mean, n, visible };
}

describe("exposure-derivation-engine", () => {
    test("dimensão negativa: alto score na escala → alta carga", () => {
        const aggs = [makeAgg("demands_quant", 3.2, 12)]; // 3.2/4 = 80%
        const result = deriveExposure(aggs, DEFAULT_CONFIG);
        expect(result.exposures[0]!.load).toBe(80); // direto
        expect(result.exposures[0]!.visible).toBe(true);
        expect(result.derivedCount).toBe(1);
    });

    test("dimensão positiva: alto score na escala → BAIXA carga (inversão)", () => {
        const aggs = [makeAgg("influence", 3.2, 10)]; // 3.2/4 = 80% positivo → 20% carga
        const result = deriveExposure(aggs, DEFAULT_CONFIG);
        expect(result.exposures[0]!.load).toBe(20); // inversão: 100 - 80
        expect(result.exposures[0]!.visible).toBe(true);
    });

    test("dimensão positiva: baixo score na escala → ALTA carga", () => {
        const aggs = [makeAgg("social_support", 1.0, 8)]; // 1/4 = 25% → carga 75%
        const result = deriveExposure(aggs, DEFAULT_CONFIG);
        expect(result.exposures[0]!.load).toBe(75);
    });

    test("dimensão protegida (n < k): load = 0, visible = false", () => {
        const aggs = [makeAgg("community", 3.5, 3, true)]; // n=3 < k=5
        const result = deriveExposure(aggs, DEFAULT_CONFIG);
        expect(result.exposures[0]!.visible).toBe(false);
        expect(result.exposures[0]!.load).toBe(0);
        expect(result.protectedCount).toBe(1);
        expect(result.derivedCount).toBe(0);
    });

    test("dimensão com visible=false na agregação: protegida independente de n", () => {
        const aggs = [makeAgg("community", 3.0, 20, false)]; // n=20 mas visible=false
        const result = deriveExposure(aggs, DEFAULT_CONFIG);
        expect(result.exposures[0]!.visible).toBe(false);
        expect(result.exposures[0]!.load).toBe(0);
    });

    test("dimensão com mean=null: protegida", () => {
        const aggs = [makeAgg("demands_quant", null, 12, true)];
        const result = deriveExposure(aggs, DEFAULT_CONFIG);
        expect(result.exposures[0]!.visible).toBe(false);
        expect(result.protectedCount).toBe(1);
    });

    test("perfil completo COPSOQ (12 dimensões): derivado e clamped 0..100", () => {
        const aggs: AggregateInput[] = [
            makeAgg("demands_quant", 2.8, 50),     // neg: 70
            makeAgg("work_pace", 3.0, 50),          // neg: 75
            makeAgg("demands_emotional", 3.2, 50),  // neg: 80
            makeAgg("influence", 2.4, 50),          // pos: 40
            makeAgg("meaning", 3.6, 50),            // pos: 10
            makeAgg("predictability", 2.0, 50),     // pos: 50
            makeAgg("role_clarity", 2.8, 50),       // pos: 30
            makeAgg("leadership_quality", 2.0, 50), // pos: 50
            makeAgg("social_support", 2.4, 50),     // pos: 40
            makeAgg("recognition", 1.6, 50),        // pos: 60
            makeAgg("community", 3.0, 3),           // protected (n<5)
            makeAgg("insecurity", 2.0, 50),         // neg: 50
        ];

        const result = deriveExposure(aggs, DEFAULT_CONFIG);
        expect(result.totalDimensions).toBe(12);
        expect(result.derivedCount).toBe(11);
        expect(result.protectedCount).toBe(1); // community

        // Todas as exposições em range
        for (const e of result.exposures) {
            expect(e.load).toBeGreaterThanOrEqual(0);
            expect(e.load).toBeLessThanOrEqual(100);
        }

        // Demands emotional é a mais alta → a "assinatura" de exaustão
        const demandsEmotional = result.exposures.find((e) => e.dimensionId === "demands_emotional");
        expect(demandsEmotional!.load).toBe(80);

        // Meaning é positiva com score alto → carga baixa
        const meaning = result.exposures.find((e) => e.dimensionId === "meaning");
        expect(meaning!.load).toBe(10);
    });

    test("escala 1..5 (versão original COPSOQ): normalização correta", () => {
        const config: ExposureDerivationConfig = {
            scaleMin: 1,
            scaleMax: 5,
            kAnonymityMin: 5,
            polarities: COPSOQ_POLARITIES,
        };
        const aggs = [makeAgg("demands_quant", 4, 10)]; // (4-1)/(5-1) = 75%
        const result = deriveExposure(aggs, config);
        expect(result.exposures[0]!.load).toBe(75);
    });

    test("load é clamped em 0 e 100 mesmo com valores de borda", () => {
        const aggs = [
            makeAgg("demands_quant", 0, 10), // 0/4 = 0%
            makeAgg("work_pace", 4, 10),     // 4/4 = 100%
        ];
        const result = deriveExposure(aggs, DEFAULT_CONFIG);
        expect(result.exposures[0]!.load).toBe(0);
        expect(result.exposures[1]!.load).toBe(100);
    });

    test("polaridade desconhecida assume negative (conservador)", () => {
        const config: ExposureDerivationConfig = {
            scaleMin: 0,
            scaleMax: 4,
            kAnonymityMin: 5,
            polarities: [], // vazio — nenhuma polaridade definida
        };
        const aggs = [makeAgg("unknown_dim", 3.0, 10)]; // 3/4 = 75% → assume neg → 75
        const result = deriveExposure(aggs, config);
        expect(result.exposures[0]!.load).toBe(75);
    });

    test("desfechos COPSOQ (burnout, comportamentos_ofensivos) são deriváveis mas outcomeViolations os protege no crosswalk", () => {
        const aggs = [
            makeAgg("burnout", 3.6, 50),                    // neg: 90
            makeAgg("comportamentos_ofensivos", 2.0, 50),   // neg: 50
        ];
        const result = deriveExposure(aggs, DEFAULT_CONFIG);
        expect(result.derivedCount).toBe(2);
        // Eles SÃO derivados aqui — o guard de outcomeViolations é no crosswalk-engine
        expect(result.exposures[0]!.load).toBe(90);
        expect(result.exposures[1]!.load).toBe(50);
    });

    test("COPSOQ_POLARITIES cobre as 12 dimensões core + 2 desfechos", () => {
        expect(COPSOQ_POLARITIES).toHaveLength(14);
        const negative = COPSOQ_POLARITIES.filter((p) => p.polarity === "negative");
        const positive = COPSOQ_POLARITIES.filter((p) => p.polarity === "positive");
        // 4 neg core + 2 desfechos = 6 neg; 8 positivas
        expect(negative).toHaveLength(6);
        expect(positive).toHaveLength(8);
    });
});
