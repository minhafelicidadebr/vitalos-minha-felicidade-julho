import { describe, expect, test } from "bun:test";
import {
  buildPgrPlan,
  classifyRisk,
  probabilityFromLoad,
  type PgrMeasureSeed,
} from "./pgr-engine";
import { NR1_CROSSWALK, DEMO_COPSOQ_EXPOSURE } from "@/mocks/nr1-crosswalk-mock";
import { PGR_MEASURES } from "@/mocks/pgr-nr1-mock";

const base = {
  registry: NR1_CROSSWALK,
  exposures: DEMO_COPSOQ_EXPOSURE,
  measures: PGR_MEASURES,
  generatedAt: "2026-06-23",
  currentWeek: 6,
  horizonWeeks: 13,
  topRisks: 5,
};

describe("pgr-engine — classificação de risco (matriz NR-01)", () => {
  test("probabilidade segue as bandas de exposição medida", () => {
    expect(probabilityFromLoad(80).band).toBe("muito_alta");
    expect(probabilityFromLoad(65).band).toBe("alta");
    expect(probabilityFromLoad(45).band).toBe("media");
    expect(probabilityFromLoad(20).band).toBe("baixa");
  });

  test("matriz probabilidade × severidade mapeia para 4 níveis", () => {
    expect(classifyRisk(4, 4).level).toBe("critico"); // 16
    expect(classifyRisk(3, 3).level).toBe("alto"); // 9
    expect(classifyRisk(2, 2).level).toBe("moderado"); // 4
    expect(classifyRisk(1, 2).level).toBe("baixo"); // 2
  });
});

describe("pgr-engine — montagem do programa", () => {
  const plan = buildPgrPlan(base);

  test("inventaria no máximo topRisks drivers, só os com exposição medida", () => {
    expect(plan.risks.length).toBeGreaterThan(0);
    expect(plan.risks.length).toBeLessThanOrEqual(5);
    expect(plan.risks.every((r) => r.load > 0)).toBe(true);
  });

  test("riscos vêm ordenados pela exposição (prioridade primeiro) — carga no topo no perfil demo", () => {
    // No DEMO_COPSOQ_EXPOSURE, demands_quant=72/work_pace=68 puxam "carga" para o topo.
    expect(plan.risks[0]!.driverId).toBe("carga");
  });

  test("cada risco carrega classificação completa e dimensão-fonte", () => {
    for (const r of plan.risks) {
      expect(["baixo", "moderado", "alto", "critico"]).toContain(r.riskLevel);
      expect(r.riskScore).toBeGreaterThanOrEqual(1);
      expect(r.riskScore).toBeLessThanOrEqual(16);
      expect(r.topDimension).not.toBeNull();
    }
  });

  test("INVARIANTE Fable 5/NR-01: todo risco começa por medida de FONTE (organização, não indivíduo)", () => {
    for (const r of plan.risks) {
      expect(r.measures.length).toBeGreaterThan(0);
      const first = r.measures[0]!;
      expect(["eliminacao", "organizacao"]).toContain(first.tier);
    }
  });

  test("medidas respeitam a hierarquia NR-01 (eliminação → organização → administrativa → monitoramento)", () => {
    const rank = { eliminacao: 0, organizacao: 1, administrativa: 2, monitoramento: 3 };
    for (const r of plan.risks) {
      const seq = r.measures.map((m) => rank[m.tier]);
      const sorted = [...seq].sort((a, b) => a - b);
      expect(seq).toEqual(sorted);
    }
  });

  test("status das medidas deriva da semana atual", () => {
    const early = buildPgrPlan({ ...base, currentWeek: 1 });
    const late = buildPgrPlan({ ...base, currentWeek: 13 });
    const earlyImpl = early.summary.measuresImplemented;
    const lateImpl = late.summary.measuresImplemented;
    expect(lateImpl).toBeGreaterThanOrEqual(earlyImpl);
  });

  test("risco residual nunca é PIOR que o risco bruto", () => {
    const rank = { baixo: 0, moderado: 1, alto: 2, critico: 3 };
    for (const r of plan.risks) {
      expect(rank[r.residual]).toBeLessThanOrEqual(rank[r.riskLevel]);
    }
  });

  test("resumo é coerente com os riscos inventariados", () => {
    const s = plan.summary;
    expect(s.total).toBe(plan.risks.length);
    expect(s.critico + s.alto + s.moderado + s.baixo).toBe(s.total);
    expect(s.measuresTotal).toBe(plan.risks.flatMap((r) => r.measures).length);
    expect(s.coverage).toBeGreaterThanOrEqual(0);
    expect(s.coverage).toBeLessThanOrEqual(1);
  });

  test("disclaimer deixa claro que não substitui o PGR formal", () => {
    expect(plan.disclaimer).toMatch(/não substitui/i);
  });

  test("prioridade e prazo seguem o nível de risco (Guia MTE 2026, Quadro 5)", () => {
    const expectByLevel: Record<string, { priority: string; months: number | null }> = {
      critico: { priority: "altissima", months: null },
      alto: { priority: "alta", months: 3 },
      moderado: { priority: "moderada", months: 9 },
      baixo: { priority: "baixa", months: null },
    };
    for (const r of plan.risks) {
      const e = expectByLevel[r.riskLevel]!;
      expect(r.priority).toBe(e.priority as never);
      expect(r.deadlineMonths).toBe(e.months);
      expect(r.deadlineLabel.length).toBeGreaterThan(0);
    }
  });

  test("decisão de classificação é coerente (crítico→imediato; residual baixo→tolerável)", () => {
    for (const r of plan.risks) {
      if (r.riskLevel === "critico") {
        expect(r.decision).toBe("acao_imediata");
      } else if (r.tolerable) {
        expect(r.decision).toBe("tolerável");
        expect(r.residual).toBe("baixo");
      } else {
        expect(r.decision).toBe("adotar_acoes");
      }
    }
  });

  test("resumo conta toleráveis + que exigem ação = total", () => {
    expect(plan.summary.tolerableCount + plan.summary.requiresActionCount).toBe(plan.summary.total);
  });

  test("determinístico: mesma entrada → mesma saída", () => {
    const a = buildPgrPlan(base);
    const b = buildPgrPlan(base);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("hiddenRiskCount conta os expostos além do topRisks", () => {
    const narrow = buildPgrPlan({ ...base, topRisks: 2 });
    expect(narrow.risks.length).toBe(2);
    expect(narrow.hiddenRiskCount).toBeGreaterThan(0);
  });
});

describe("pgr-engine — integridade de domínio", () => {
  test("nenhum risco do inventário é um desfecho (separação sagrada A/B)", () => {
    const plan = buildPgrPlan(base);
    const outcomeIds = new Set(
      NR1_CROSSWALK.dimensions.filter((d) => d.isOutcome).map((d) => d.id),
    );
    // Drivers nunca são desfechos; garantimos que nenhum id de risco coincide com um desfecho.
    for (const r of plan.risks) {
      expect(outcomeIds.has(r.driverId)).toBe(false);
    }
  });

  test("toda medida tem responsável e ação não-vazios", () => {
    const plan = buildPgrPlan(base);
    for (const r of plan.risks) {
      for (const m of r.measures) {
        expect(m.action.trim().length).toBeGreaterThan(0);
        expect(m.responsible.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("todo driver do crosswalk tem ao menos uma medida-semente de fonte no catálogo", () => {
    const sourceByDriver = new Map<string, boolean>();
    for (const m of PGR_MEASURES as PgrMeasureSeed[]) {
      if (m.tier === "eliminacao" || m.tier === "organizacao") {
        sourceByDriver.set(m.driverId, true);
      }
    }
    for (const d of NR1_CROSSWALK.drivers) {
      expect(sourceByDriver.get(d.id) ?? false).toBe(true);
    }
  });
});
