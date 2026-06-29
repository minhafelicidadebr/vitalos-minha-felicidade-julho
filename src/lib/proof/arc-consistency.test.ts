import { describe, expect, test } from "bun:test";
import { buildCycleProof } from "./cycle-proof.server";
import { buildEarnedSeal } from "./earned-seal.server";
import { buildBoardBrief } from "./board-brief.server";

// FONTE ÚNICA DO ARCO DE EVIDÊNCIA — o teste-guardião contra divergência.
//
// O avoidedCostYear, a contagem de intervenções com efeito e o veredicto do ciclo
// são computados por TRÊS caminhos: cycle-proof (raiz), earned-seal (compõe cycle),
// board-brief (compõe cycle + earned). Se algum dia divergirem, o board veria números
// conflitantes na mesma página. Estes testes garantem que NÃO PODEM divergir —
// o equivalente, para o Evidence Loop, do journey-consistency / nr1-sector-consistency.
//
// Se alguém reescrever um contrato para recalcular em vez de compor, isto falha.

const PACKS_COM_EVIDENCIA = ["enterprise", "health"] as const;

describe("arco de evidência — fonte única (não divergência entre contratos)", () => {
  for (const pack of PACKS_COM_EVIDENCIA) {
    describe(`${pack}`, () => {
      const cp = buildCycleProof(pack);
      const es = buildEarnedSeal(pack);
      const bb = buildBoardBrief(pack);

      test("custo evitado é IDÊNTICO em cycle-proof, earned-seal e board-brief", () => {
        const fromCycle = cp.preventionRoi?.avoidedCostYear ?? null;
        expect(fromCycle).not.toBeNull();
        // earned-seal lê do mesmo cycle-proof
        expect(es.avoidedCostYear).toBe(fromCycle);
        // board-brief expõe o mesmo número na linha do CFO
        const cfo = bb.skeptics.find((s) => s.id === "cfo")!;
        expect(cfo.metric).toContain(fromCycle!.toLocaleString("pt-BR"));
      });

      test("intervenções com efeito batem entre cycle-proof e earned-seal", () => {
        expect(es.interventionsWithEffect).toBe(cp.interventionsWithEffect);
      });

      test("o veredicto do ciclo é o mesmo em cycle-proof e earned-seal/board-brief", () => {
        expect(es.cycleVerdict).toBe(cp.verdict);
        // board-brief reflete o mesmo estado (satisfação do auditor = Domínio B ganho)
        const auditor = bb.skeptics.find((s) => s.id === "auditor")!;
        expect(auditor.satisfied).toBe(es.domainBReady);
      });

      test("redução atribuível é a mesma raiz nos três contratos", () => {
        expect(es.attributableReductionPts).toBe(cp.attributableReductionPts);
      });

      test("determinístico ponta a ponta (duas montagens = mesmos números)", () => {
        const cp2 = buildCycleProof(pack);
        const bb2 = buildBoardBrief(pack);
        expect(cp2.preventionRoi?.avoidedCostYear).toBe(cp.preventionRoi?.avoidedCostYear);
        expect(bb2.satisfiedCount).toBe(bb.satisfiedCount);
        expect(bb2.headline).toBe(bb.headline);
      });
    });
  }
});

describe("arco de evidência — honestidade preservada na composição", () => {
  test("colaborador (k-anon) é o único cético sempre satisfeito, em qualquer setor", () => {
    for (const pack of [...PACKS_COM_EVIDENCIA, "government"]) {
      const bb = buildBoardBrief(pack);
      const colab = bb.skeptics.find((s) => s.id === "colaborador")!;
      expect(colab.satisfied).toBe(true);
    }
  });

  test("setor sem evidência (government): CFO/auditor não satisfeitos, sem custo", () => {
    const cp = buildCycleProof("government");
    const es = buildEarnedSeal("government");
    const bb = buildBoardBrief("government");
    expect(cp.verdict).toBe("sem_dados");
    expect(es.avoidedCostYear).toBeNull();
    expect(bb.skeptics.find((s) => s.id === "cfo")!.satisfied).toBe(false);
    expect(bb.skeptics.find((s) => s.id === "auditor")!.satisfied).toBe(false);
  });

  test("o custo evitado NUNCA excede a parcela psicossocial (teto honesto)", () => {
    for (const pack of PACKS_COM_EVIDENCIA) {
      const roi = buildCycleProof(pack).preventionRoi!;
      expect(roi.avoidedCostYear).toBeLessThanOrEqual(roi.psychosocialBaselineCost);
    }
  });
});
