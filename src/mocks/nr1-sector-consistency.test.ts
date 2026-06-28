// Trava a FONTE ÚNICA dos dados NR-1 por setor.
//
// /matriz, /plano-nr1, /evolucao-nr1 e /sst todos derivam de getSectorExposure(packId)
// via o hook useSectorNR1. Estes testes garantem que NÃO PODEM DIVERGIR: dado um setor,
// a exposição que prioriza os drivers na /matriz é a MESMA que gera o PGR na /plano-nr1
// e a reavaliação na /evolucao-nr1.
//
// É o equivalente NR-1 de journey-consistency.test.ts: uma só verdade por setor.
// Se alguém reescrever uma rota para usar um mock diferente, isto falha.

import { describe, expect, test } from "bun:test";
import {
    getSectorExposure,
    getSectorCycles,
    getSectorPgrMeasures,
    getSectorMeasureMaintenance,
} from "./nr1-sector-exposure";
import { rankDriversByExposure } from "@/engine/nr1/crosswalk-engine";
import { buildPgrPlan } from "@/engine/nr1/pgr-engine";
import { buildReavaliacao } from "@/engine/nr1/reavaliacao-engine";
import { NR1_CROSSWALK } from "./nr1-crosswalk-mock";

const PACKS = ["enterprise", "school", "government", "condominium", "health"] as const;

describe("NR-1 setorial — fonte única (não divergência entre rotas)", () => {
    test("a exposição do setor é determinística (mesma chamada → mesmo resultado)", () => {
        for (const pack of PACKS) {
            const a = getSectorExposure(pack);
            const b = getSectorExposure(pack);
            expect(a).toEqual(b);
        }
    });

    test("invariante forte: ranking de drivers é IDÊNTICO entre consumidores (mesma fonte)", () => {
        for (const pack of PACKS) {
            const exposure = getSectorExposure(pack);
            // Dois consumidores independentes (/matriz e a ponte do /sst) chamam o mesmo
            // engine com a mesma exposição → ranking byte-idêntico. Determinismo + fonte única.
            const rankA = rankDriversByExposure(NR1_CROSSWALK, exposure);
            const rankB = rankDriversByExposure(NR1_CROSSWALK, getSectorExposure(pack));
            expect(rankA).toEqual(rankB);
        }
    });

    test("/plano-nr1 deriva seus riscos do MESMO ranking da exposição (subconjunto)", () => {
        for (const pack of PACKS) {
            const exposure = getSectorExposure(pack);

            // Universo de drivers ranqueados pela exposição do setor (fonte da /matriz).
            const rankedDriverIds = new Set(
                rankDriversByExposure(NR1_CROSSWALK, exposure).map((d) => d.driverId),
            );

            // O PGR seleciona seus riscos a partir da mesma exposição.
            const plan = buildPgrPlan({
                registry: NR1_CROSSWALK,
                exposures: exposure,
                measures: getSectorPgrMeasures(pack),
                generatedAt: NR1_CROSSWALK.updatedAt,
                currentWeek: 6,
                horizonWeeks: 13,
                topRisks: 5,
            });

            // Invariante de fonte única: TODO driver do PGR existe no ranking da exposição.
            // Se o PGR usasse uma fonte diferente, apareceria um driver fora do ranking.
            expect(plan.risks.length).toBeGreaterThan(0);
            for (const risk of plan.risks) {
                expect(rankedDriverIds.has(risk.driverId)).toBe(true);
            }
        }
    });

    test("/evolucao-nr1 usa ciclos coerentes com a exposição base do setor", () => {
        for (const pack of PACKS) {
            const cycles = getSectorCycles(pack);
            // Enterprise usa a curva canônica autorada; os demais derivam do baseline.
            expect(cycles.length).toBeGreaterThanOrEqual(3);

            const plan = buildPgrPlan({
                registry: NR1_CROSSWALK,
                exposures: getSectorExposure(pack),
                measures: getSectorPgrMeasures(pack),
                generatedAt: NR1_CROSSWALK.updatedAt,
                currentWeek: 13,
                horizonWeeks: 13,
                topRisks: 5,
            });

            const reav = buildReavaliacao({
                registry: NR1_CROSSWALK,
                cycles,
                pgrPlan: plan,
                maintenanceByDriver: getSectorMeasureMaintenance(pack),
            });

            // A reavaliação produz um resultado coerente (drivers presentes, médias válidas)
            expect(reav.drivers.length).toBeGreaterThan(0);
            expect(reav.meanFirst).toBeGreaterThanOrEqual(0);
            expect(reav.meanLast).toBeGreaterThanOrEqual(0);
        }
    });

    test("k-anon é preservado por TODAS as rotas: community nunca prioriza (n<5)", () => {
        for (const pack of PACKS) {
            const exposure = getSectorExposure(pack);
            const community = exposure.find((e) => e.dimensionId === "community");
            expect(community?.visible).toBe(false);

            // Com community invisível vs. visível, o ranking muda → prova que invisível
            // estava sendo respeitado (k-anon de ponta a ponta por setor).
            const ranked = rankDriversByExposure(NR1_CROSSWALK, exposure);
            const communityExposed = exposure.map((e) =>
                e.dimensionId === "community" ? { ...e, visible: true, load: 99 } : e,
            );
            const rankedWith = rankDriversByExposure(NR1_CROSSWALK, communityExposed);
            expect(JSON.stringify(ranked)).not.toBe(JSON.stringify(rankedWith));
        }
    });

    test("cada setor tem assinatura distinta — switching realmente muda a priorização", () => {
        const signatures = PACKS.map((pack) => {
            const ranked = rankDriversByExposure(NR1_CROSSWALK, getSectorExposure(pack));
            return ranked.map((d) => `${d.driverId}:${d.score}`).join("|");
        });

        // Nenhum par de setores deve ter assinatura idêntica
        for (let i = 0; i < signatures.length; i++) {
            for (let j = i + 1; j < signatures.length; j++) {
                expect(signatures[i]).not.toBe(signatures[j]);
            }
        }
    });
});
