import { describe, expect, test } from "bun:test";
import { buildPlanDocument, serializePlanDocumentText, type PlanDocumentMeta } from "./plan-document-engine";
import type { EnrichedActionItem, EnrichedQuarterlyPlan } from "./plan-enrichment-engine";
import type { ActionLogSummary } from "./action-log-engine";

function item(over: Partial<EnrichedActionItem> = {}): EnrichedActionItem {
  return {
    rank: 1,
    leverId: "lever-1",
    leverLabel: "Gestão de energia e carga",
    description: "Pausas reais e redistribuição de carga.",
    effort: "medio",
    expectedIvoLift: 4,
    isQuickWin: true,
    amb: { id: "amb-1", name: "Guardiões da Energia", emoji: "⚡" },
    lensId: "eu",
    lensLabel: "EU",
    lensColor: "#123456",
    esgCodes: ["ESRS S1-11"],
    startWeek: 1,
    endWeek: 7,
    milestoneWeek: 4,
    status: "em_andamento",
    weeksBudget: 7,
    controlTier: "organizacao",
    owner: { membershipId: "mem-1", displayRole: "Gestora de RH" },
    dueOn: "2026-08-14",
    metric: { label: "Horas extras/semana", baseline: 6, target: 3, unit: "h" },
    cmo: { context: "no contexto atual", mechanism: "ativa o mecanismo", outcome: "esperamos mover a métrica" },
    compliant: true,
    missing: [],
    ...over,
  };
}

function plan(over: Partial<EnrichedQuarterlyPlan> = {}): EnrichedQuarterlyPlan {
  return {
    season: { name: "Fundação Segura", color: "#0B3D2E", totalWeeks: 13, currentWeek: 8, phaseLabel: "Transformar" },
    actions: [item()],
    quickWinCount: 1,
    scheduledIvoLift: 4,
    hiddenActionsCount: 0,
    disclaimer: "Plano operacional orientativo.",
    gauge: { total: 1, compliant: 1, pct: 100, missingByField: { owner: 0, dueOn: 0, metric: 0 } },
    ...over,
  };
}

function logSummary(over: Partial<ActionLogSummary> = {}): ActionLogSummary {
  return {
    totalActions: 1,
    concludedCount: 0,
    pctConcluded: 0,
    evidenceCountByAction: {},
    maintenanceByAction: {},
    ...over,
  };
}

function meta(over: Partial<PlanDocumentMeta> = {}): PlanDocumentMeta {
  return {
    orgName: "Organização Demonstração",
    cycleLabel: "2026-t3 · Fundação Segura",
    documentId: "doc-123",
    generatedAt: "2026-07-05T10:00:00.000Z",
    ...over,
  };
}

describe("buildPlanDocument — identificação", () => {
  test("inclui organização, ciclo, documento e temporada", () => {
    const doc = buildPlanDocument(plan(), meta(), logSummary());
    const ident = doc.sections.find((s) => s.id === "identificacao")!;
    expect(ident.body.some((l) => l.includes("Organização Demonstração"))).toBe(true);
    expect(ident.body.some((l) => l.includes("2026-t3 · Fundação Segura"))).toBe(true);
    expect(ident.body.some((l) => l.includes("doc-123"))).toBe(true);
    expect(ident.body.some((l) => l.includes("Fundação Segura") && l.includes("semana 8"))).toBe(true);
  });
});

describe("buildPlanDocument — sumário", () => {
  test("reporta contagem de ações, quick wins e completude §13", () => {
    const doc = buildPlanDocument(plan(), meta(), logSummary());
    const sumario = doc.sections.find((s) => s.id === "sumario")!;
    expect(sumario.body.some((l) => l.includes("100%"))).toBe(true);
    expect(sumario.body.some((l) => l.includes("1 vitória"))).toBe(true);
    expect(sumario.body.some((l) => l.includes("+4"))).toBe(true);
  });

  test("menciona ações ocultas só quando hiddenActionsCount > 0", () => {
    const withHidden = buildPlanDocument(plan({ hiddenActionsCount: 3 }), meta(), logSummary());
    const withoutHidden = buildPlanDocument(plan({ hiddenActionsCount: 0 }), meta(), logSummary());
    const sumWith = withHidden.sections.find((s) => s.id === "sumario")!;
    const sumWithout = withoutHidden.sections.find((s) => s.id === "sumario")!;
    expect(sumWith.body.some((l) => l.includes("adicional"))).toBe(true);
    expect(sumWithout.body.some((l) => l.includes("adicional"))).toBe(false);
  });
});

describe("buildPlanDocument — ações", () => {
  test("renderiza responsável, prazo e métrica quando presentes", () => {
    const doc = buildPlanDocument(plan(), meta(), logSummary());
    const acoes = doc.sections.find((s) => s.id === "acoes")!;
    const line = acoes.body.find((l) => l.startsWith("Responsável:"))!;
    expect(line).toContain("Gestora de RH");
    expect(line).toContain("2026-08-14");
    expect(line).toContain("Horas extras/semana");
  });

  test("mostra 'a definir' quando responsável/prazo/métrica faltam", () => {
    const incomplete = item({ owner: null, dueOn: null, metric: null, isQuickWin: false });
    const doc = buildPlanDocument(plan({ actions: [incomplete] }), meta(), logSummary());
    const acoes = doc.sections.find((s) => s.id === "acoes")!;
    const line = acoes.body.find((l) => l.startsWith("Responsável:"))!;
    expect(line).toContain("a definir");
    expect((line.match(/a definir/g) ?? []).length).toBe(3);
  });

  test("marca vitória rápida no título da ação", () => {
    const doc = buildPlanDocument(plan(), meta(), logSummary());
    const acoes = doc.sections.find((s) => s.id === "acoes")!;
    expect(acoes.body.some((l) => l.includes("(vitória rápida)"))).toBe(true);
  });

  test("inclui hipótese CMO quando presente", () => {
    const doc = buildPlanDocument(plan(), meta(), logSummary());
    const acoes = doc.sections.find((s) => s.id === "acoes")!;
    expect(acoes.body.some((l) => l.startsWith("Hipótese:"))).toBe(true);
  });

  test("omite hipótese CMO quando ausente", () => {
    const noCmo = item({ cmo: null });
    const doc = buildPlanDocument(plan({ actions: [noCmo] }), meta(), logSummary());
    const acoes = doc.sections.find((s) => s.id === "acoes")!;
    expect(acoes.body.some((l) => l.startsWith("Hipótese:"))).toBe(false);
  });
});

describe("buildPlanDocument — aviso legal", () => {
  test("sempre presente e menciona que não substitui o PGR", () => {
    const doc = buildPlanDocument(plan(), meta(), logSummary());
    expect(doc.legalNotice.length).toBeGreaterThan(0);
    expect(doc.legalNotice).toContain("Não é o PGR oficial");
  });
});

describe("serializePlanDocumentText", () => {
  test("produz texto não vazio contendo nome da organização e aviso legal", () => {
    const doc = buildPlanDocument(plan(), meta(), logSummary());
    const text = serializePlanDocumentText(doc);
    expect(text).toContain("Organização Demonstração");
    expect(text).toContain(doc.legalNotice);
  });

  test("inclui todos os títulos de seção", () => {
    const doc = buildPlanDocument(plan(), meta(), logSummary());
    const text = serializePlanDocumentText(doc);
    for (const section of doc.sections) {
      expect(text).toContain(section.title);
    }
  });
});
