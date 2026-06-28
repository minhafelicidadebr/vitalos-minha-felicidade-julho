import { describe, expect, test } from "bun:test";
import { buildSectorPgrDocument } from "./pgr-document.server";
import { buildPgrPlan } from "@/engine/nr1/pgr-engine";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";
import { getSectorExposure, getSectorPgrMeasures } from "@/mocks/nr1-sector-exposure";

// Fronteira server do dossiê — prova a montagem ponta a ponta E a fonte única
// (não diverge do que /plano-nr1 mostra).

describe("buildSectorPgrDocument — montagem ponta a ponta", () => {
  test("monta o dossiê do setor Operações (enterprise) com Markdown", () => {
    const res = buildSectorPgrDocument("enterprise", "Operações");
    expect(res.document.sections.length).toBeGreaterThanOrEqual(7);
    expect(res.markdown).toContain("# Programa de Gerenciamento de Riscos Psicossociais");
    expect(res.markdown).toContain("Operações");
  });

  test("enterprise tem histórico COPSOQ → anexa a reavaliação longitudinal", () => {
    const res = buildSectorPgrDocument("enterprise", "Operações");
    expect(res.hasReavaliacao).toBe(true);
    expect(res.markdown).toContain("Reavaliação longitudinal");
  });

  test("pack sem histórico não anexa reavaliação (mas monta o dossiê)", () => {
    const res = buildSectorPgrDocument("government", "Atendimento ao Cidadão");
    expect(res.hasReavaliacao).toBe(false);
    expect(res.markdown).not.toContain("Reavaliação longitudinal");
    expect(res.document.sections.some((s) => s.id === "inventario")).toBe(true);
  });

  test("o documentId é estável e identifica o pack", () => {
    const res = buildSectorPgrDocument("enterprise", "Operações");
    expect(res.document.meta.documentId).toContain("ENTERPRISE");
  });
});

describe("buildSectorPgrDocument — fonte única (não diverge das telas)", () => {
  test("o inventário do dossiê bate com o plano construído da mesma fonte", () => {
    // Reconstrói o plano como /plano-nr1 faz e compara o nº de riscos detalhados.
    const plan = buildPgrPlan({
      registry: NR1_CROSSWALK,
      exposures: getSectorExposure("enterprise"),
      measures: getSectorPgrMeasures("enterprise"),
      generatedAt: NR1_CROSSWALK.updatedAt,
      currentWeek: 6,
      horizonWeeks: 13,
      topRisks: 5,
    });
    const res = buildSectorPgrDocument("enterprise", "Operações");
    const inventory = res.document.sections.find((s) => s.id === "inventario")!;
    const dataRows = inventory.body.filter(
      (l) => l.startsWith("| ") && !l.includes("---") && !l.includes("Fator de risco"),
    );
    expect(dataRows.length).toBe(plan.risks.length);
  });

  test("determinístico: duas chamadas produzem o mesmo Markdown", () => {
    const a = buildSectorPgrDocument("enterprise", "Operações");
    const b = buildSectorPgrDocument("enterprise", "Operações");
    expect(a.markdown).toBe(b.markdown);
  });
});

describe("buildSectorPgrDocument — honestidade", () => {
  test("o dossiê carrega o aviso legal de não-substituição e o bloco de assinatura", () => {
    const res = buildSectorPgrDocument("enterprise", "Operações");
    expect(res.document.legalNotice).toContain("NÃO substitui");
    expect(res.markdown).toContain("Responsável técnico");
    expect(res.markdown).toContain("profissional legalmente habilitado");
  });
});
