import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  ISG_PROPOSAL,
  PROPOSAL_INSTALLMENTS,
  PROPOSAL_TOTAL,
  formatBRL,
} from "./isg-content.server";

const p = ISG_PROPOSAL;
const text = JSON.stringify(p);

describe("proposta ISG · preço com fonte única", () => {
  test("R$ 60.000 em 5 parcelas de R$ 12.000, iguais no resumo, nos marcos e no detalhamento", () => {
    expect(PROPOSAL_TOTAL).toBe(60_000);
    expect(PROPOSAL_INSTALLMENTS).toBe(5);
    expect(p.investment.total).toBe(PROPOSAL_TOTAL);
    expect(p.journey.stages).toHaveLength(5);
    for (const s of p.journey.stages) expect(s.installment).toBe(12_000);
    expect(p.journey.stages.reduce((a, s) => a + s.installment, 0)).toBe(PROPOSAL_TOTAL);
    expect(formatBRL(PROPOSAL_TOTAL)).toBe("R$ 60.000");
    const investment = p.summary.find((s) => s.label === "Quanto investe")!;
    expect(investment.title).toBe("R$ 60.000");
    expect(investment.body).toContain("R$ 12.000");
    // Nenhum outro valor monetário escondido no texto.
    expect(text.match(/R\$ ?[\d.]+/g)?.every((m) => ["R$ 60.000", "R$ 12.000"].includes(m))).toBe(
      true,
    );
  });
});

describe("proposta ISG · maturidade honesta das etapas", () => {
  test("cada etapa tem verbo, entrega, condição, participantes e critérios de aceite", () => {
    expect(p.journey.stages.map((s) => `${s.code} · ${s.verb}`)).toEqual([
      "Q1 · Preparar",
      "Q2 · Agir e devolver",
      "Q3 · Praticar",
      "Q4 · Refletir e aplicar",
      "Q5 · Consolidar",
    ]);
    for (const s of p.journey.stages) {
      expect(s.deliverable.length).toBeGreaterThan(20);
      expect(s.condition.length).toBeGreaterThan(10);
      expect(s.participants.length).toBeGreaterThan(0);
      expect(s.instituteActivities.length).toBeGreaterThan(0);
      expect(s.acceptance.length).toBeGreaterThan(0);
    }
  });

  test("toda capacidade condicionada descreve a decisão comercial necessária", () => {
    const caps = p.journey.stages.flatMap((s) => s.capabilities);
    for (const c of caps) {
      if (c.availability === "condicionada") expect(c.decision?.length ?? 0).toBeGreaterThan(30);
    }
  });

  test("coleta do Q1, prática do Q3/Q4, convite publicado e relatório do Q5 aparecem como condicionados", () => {
    const byStage = (id: string) => p.journey.stages.find((s) => s.id === id)!.capabilities;
    const conditioned = (id: string, word: RegExp) =>
      byStage(id).some((c) => c.availability === "condicionada" && word.test(c.label));
    expect(conditioned("q1", /coleta/i)).toBe(true);
    expect(conditioned("q2", /convite/i)).toBe(true);
    expect(conditioned("q3", /mensura/i)).toBe(true);
    expect(conditioned("q4", /plataforma/i)).toBe(true);
    expect(conditioned("q5", /relat/i)).toBe(true);
    expect(byStage("q5").find((c) => /relat/i.test(c.label))!.decision).toMatch(/demonstrativo/);
    expect(p.journey.stages.find((s) => s.id === "q4")!.condition).toMatch(/sem painel coletivo/i);
  });
});

describe("proposta ISG · linguagem e circulação", () => {
  test("sem promessa de ROI, efeito garantido, urgência artificial, claim sobre cérebro ou parceria", () => {
    for (const banned of [
      /\bROI\b/,
      /garant/i,
      /urgente|últimas vagas|só hoje/i,
      /cérebro|neuro/i,
      /parceir|endoss/i,
      /blindag/i,
      /conformidade com a NR/i,
    ]) {
      expect(banned.test(text)).toBe(false);
    }
    expect(p.conditions.join(" ")).toMatch(/não promete efeito/);
    expect(p.indicators.effect).toMatch(/Não está incluído/);
  });

  test("exemplo marcado como fictício e sem números de resultado", () => {
    expect(p.scenario.title).toMatch(/fictício/i);
    expect(p.scenario.record.find((r) => r.field === "Efeito")!.value).toBe("Não avaliado");
    expect(p.sources.some((s) => s.kind === "exemplo")).toBe(true);
  });

  test("CTA sem destino inventado: nulo até o Instituto confirmar, ou https", () => {
    const c = p.nextSession.contact;
    if (c) expect(c.href.startsWith("https://")).toBe(true);
    else expect(p.nextSession.howTo.length).toBeGreaterThan(10);
  });

  test("metadados públicos da rota não carregam destinatário nem termos comerciais", () => {
    const route = readFileSync(new URL("../../routes/proposta.tsx", import.meta.url), "utf8");
    expect(route).not.toMatch(/ISG|60\.000|12\.000|R\$/);
  });
});
