import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  ISG_PROPOSAL,
  PROPOSAL_INSTALLMENTS,
  PROPOSAL_MONTHLY_EQUIVALENT,
  PROPOSAL_MONTHS_PER_STAGE,
  PROPOSAL_TOTAL,
  PRICE_MODEL,
  formatBRL,
  resolveLiterature,
  resolvePlaybook,
  resolveTrack,
} from "./isg-content.server";

const p = ISG_PROPOSAL;
const text = JSON.stringify(p);
// Todo valor monetário do conteúdo tem de vir do modelo de preço (fonte única).
const allowedMoney = new Set(
  [
    PROPOSAL_TOTAL,
    PROPOSAL_TOTAL / PROPOSAL_INSTALLMENTS,
    PROPOSAL_MONTHLY_EQUIVALENT,
    p.pricing.referencePerStage,
    p.pricing.referenceTotal,
    PRICE_MODEL.licenseMonthly,
    PRICE_MODEL.isgTechnicalRate,
    PRICE_MODEL.isgTechnicalRate * PRICE_MODEL.isgTechnicalHours,
    ...Object.values(PRICE_MODEL.rates),
    ...p.pricing.components.flatMap((c) => [c.perStage, c.program]),
    ...p.pricing.bridge.map((b) => Math.abs(b.perStage)),
  ].map(formatBRL),
);

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
    expect(investment.title).toBe("R$ 12.000 por etapa");
    expect(investment.body).toContain("R$ 4.000");
    expect(investment.body).toContain("R$ 60.000");
    // Nenhum outro valor monetário escondido no texto.
    expect(text.match(/R\$ ?\d{1,3}(?:\.\d{3})*/g)?.every((m) => allowedMoney.has(m))).toBe(true);
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
      // "Parceria/endosso" só podem aparecer negados, na ressalva de atribuição ("sem parceria ou endosso").
      const affirmative = text.replace(/\bsem parceria(?:, chancela)? ou endosso\b/gi, "");
      expect(banned.test(affirmative)).toBe(false);
    }
    expect(text).toMatch(/sem parceria ou endosso/);
    expect(text).not.toMatch(/chancelad|validado por Oxford|parceria com Oxford/i);
    expect(p.conditions.join(" ")).toMatch(/não promete efeito/);
    expect(p.indicators.effect).toMatch(/Não está incluído/);
  });

  test("exemplo marcado como fictício e sem números de resultado", () => {
    expect(p.scenario.title).toMatch(/fictício/i);
    expect(p.scenario.record.find((r) => r.field === "Efeito")!.value).toBe("Não avaliado");
    expect(p.sources.some((s) => s.kind === "exemplo")).toBe(true);
  });

  test("CTA decidido: combinar pela mensagem original, sem link, formulário ou agenda", () => {
    expect(p.hero.primaryCta).toBe("Combinar a reunião de implantação");
    expect(p.nextSession.contact).toBeNull();
    expect(p.nextSession.howTo).toMatch(/responda à mensagem em que recebeu esta proposta/);
    expect(p.nextSession.howTo).toMatch(/duas opções de data e horário/);
    expect(`${p.nextSession.howTo} ${p.nextSession.note}`).not.toMatch(
      /https?:|@|formulário|calendly|agenda online/i,
    );
    // Combinar a reunião não é contratação nem início do projeto.
    expect(p.nextSession.note).toMatch(/não confirma a contratação nem inicia o projeto/);
    expect(p.nextSession.note).toMatch(/proposta e estimativa até a aprovação/);
  });

  test("metadados públicos da rota não carregam destinatário nem termos comerciais", () => {
    const route = readFileSync(new URL("../../routes/proposta.tsx", import.meta.url), "utf8");
    expect(route).not.toMatch(/ISG|60\.000|12\.000|R\$/);
  });
});

describe("proposta ISG · V2 (cronograma, preço por etapa, ciência, equipe)", () => {
  test("cinco etapas de três meses: 15 meses relativos, um marco por etapa, sem datas de calendário", () => {
    const months = p.schedule.stages.flatMap((s) => s.months);
    expect(p.schedule.monthsPerStage).toBe(3);
    expect(months.map((m) => m.label)).toEqual(
      Array.from({ length: 15 }, (_, i) => `Mês ${i + 1}`),
    );
    for (const s of p.schedule.stages) expect(s.months.filter((m) => m.milestone)).toHaveLength(1);
    expect(JSON.stringify(p.schedule)).not.toMatch(/\b20\d\d\b|janeiro|fevereiro|março|dezembro/i);
    // Etapas condicionadas aparecem no calendário (coleta do Q1 e convite do Q2).
    expect(months.filter((m) => m.conditioned).length).toBeGreaterThanOrEqual(2);
  });

  test("equivalente mensal é derivado (parcela ÷ meses) e o total continua declarado", () => {
    expect(PROPOSAL_MONTHLY_EQUIVALENT).toBe(12_000 / 3);
    expect(p.investment.monthsPerStage).toBe(PROPOSAL_MONTHS_PER_STAGE);
    expect(p.investment.terms.join(" ")).toMatch(/não mensal/);
  });

  test("números e ciência vêm do Commercial Claims Registry, com escopo e atribuição", () => {
    expect(p.track?.items.map((m) => m.value)).toEqual([110_000, 219, 700, 1_300]);
    expect(p.track?.items.map((m) => m.label)).toContain("instituições de ensino");
    expect(p.track?.record).toMatch(/mais de 110 mil respostas/);
    // Sem superlativo: "recorde" e "maior do mundo" exigem evidência comparativa independente (pendente).
    expect(JSON.stringify(p.track)).not.toMatch(/recorde|maior pesquisa|maior do mundo/i);
    expect(p.track?.scope).toMatch(/Não são resultados em empresas/);
    expect(p.science.playbook?.studies).toBe(3_000);
    expect(p.science.playbook?.edition).toBe("Guia Prático de Bem-Estar no Trabalho");
    expect(p.literature?.items).toHaveLength(2);
    expect(p.science.anchors.find((a) => a.id === "q1")?.status).toBe("condicionado");
  });

  test("fail-closed: sem claim aprovado, o bloco some em vez de mostrar número solto", () => {
    const failing = (() => {
      throw new Error("claim indisponível");
    }) as never;
    expect(resolveTrack(failing)).toBeNull();
    expect(resolveLiterature(failing)).toBeNull();
    expect(resolvePlaybook(failing)).toBeNull();
  });

  test("bios curtas, sem cargo público nem instituições-halo", () => {
    expect(p.team.members).toHaveLength(3);
    for (const m of p.team.members) {
      expect(m.bio.split(/\s+/).length).toBeLessThanOrEqual(45);
      expect(m.bio).not.toMatch(/Ouvidor|Ministério|Conselho|Comissão|Yale|MIT|Harvard|UnB/);
    }
  });
});

describe("proposta ISG · V3 (Matriz IFT, valoração, colaboração técnica)", () => {
  test("a conta fecha: composição = referência; ponte chega à condição; programa = 5 etapas", () => {
    const pr = p.pricing;
    expect(pr.referencePerStage).toBe(24_000);
    expect(pr.referenceTotal).toBe(120_000);
    expect(pr.components.reduce((s, c) => s + c.perStage, 0)).toBe(pr.referencePerStage);
    expect(pr.components.reduce((s, c) => s + c.program, 0)).toBe(pr.referenceTotal);
    const [ref, ...rest] = pr.bridge;
    expect(ref!.kind).toBe("reference");
    expect(pr.bridge.at(-1)!.kind).toBe("condition");
    expect(pr.bridge.at(-1)!.perStage).toBe(PROPOSAL_TOTAL / PROPOSAL_INSTALLMENTS);
    expect(ref!.perStage + rest.slice(0, -1).reduce((s, b) => s + b.perStage, 0)).toBe(
      pr.bridge.at(-1)!.perStage,
    );
    // Contrapartida da ISG estimada com o modelo (40 h × valor-hora técnico).
    expect(-pr.bridge[1]!.perStage * PROPOSAL_INSTALLMENTS).toBe(
      PRICE_MODEL.isgTechnicalHours * PRICE_MODEL.isgTechnicalRate,
    );
    // Horas: 90 por etapa, 450 no programa.
    for (const s of p.journey.stages) {
      const h = s.framework.hours;
      expect(h.coord + h.educ + h.impl).toBe(90);
    }
  });

  test("termo oficial: colaboração técnica; sem 'permuta' e sem 'parceria' afirmativa", () => {
    expect(p.pricing.collaboration).toMatch(/colaboração técnica/);
    expect(text).not.toMatch(/permuta/i);
    expect(text.replace(/sem parceria(?:, chancela)? ou endosso/gi, "")).not.toMatch(/parceri/i);
    expect(text).not.toMatch(/imperdível|só agora|economia de|oferta por tempo/i);
  });

  test("Matriz IFT: 4 movimentos com status em cada etapa; Q1 é risco (domínio B) e educativo", () => {
    expect(p.ift.movements.map((m) => m.name)).toEqual([
      "Mensurar",
      "Educar",
      "Transformar",
      "Evoluir",
    ]);
    for (const s of p.journey.stages) {
      for (const m of ["mensurar", "educar", "transformar", "evoluir"] as const) {
        expect(s.framework.ift[m].text.length).toBeGreaterThan(10);
        expect(["plataforma", "instituto", "condicionada"]).toContain(
          s.framework.ift[m].availability,
        );
      }
      expect(s.framework.question.endsWith("?")).toBe(true);
    }
    const q1 = p.journey.stages[0]!.framework;
    expect(q1.domain).toBe("B");
    expect(q1.ift.mensurar.availability).toBe("condicionada");
    expect(q1.ift.mensurar.text).toMatch(/Copenhagen Psychosocial Questionnaire/);
    expect(q1.ift.mensurar.text).toMatch(/demandas, autonomia, apoio/);
    expect(q1.ift.evoluir.text).toMatch(/não substitui o PGR/);
    expect(p.journey.stages.slice(1).every((s) => s.framework.domain === "A")).toBe(true);
    // A pergunta do Q5 reescrita (sem "comprovamos").
    expect(text).not.toMatch(/comprovamos/i);
  });

  test("capa: narrativa de continuidade e NR-1 com a ressalva educativa", () => {
    expect(p.cover.brandLine).toBe("Da felicidade da cidade à vitalidade das organizações");
    const nr1 = p.cover.chips.find((c) => c.label === "NR-1")!;
    expect(nr1.detail).toMatch(/Apoio educativo/);
    expect(nr1.detail).toMatch(/não substitui o PGR/i);
    expect(text).not.toMatch(/conformidade com a NR|garante a NR|evita multa|blindagem/i);
  });

  test("cronograma sem preço: o valor do marco só aparece na seção de investimento", () => {
    expect(JSON.stringify(p.schedule)).not.toMatch(/R\$/);
    for (const st of p.schedule.stages)
      expect(st.months.filter((m) => m.milestone)).toHaveLength(1);
  });

  test("exemplo trabalhado: problema, troca de turno e quatro passos com quem/registro/o que a equipe vê", () => {
    const s = p.scenario;
    expect(s.problem.length).toBeGreaterThan(30);
    expect(s.handover.tickets.some((t) => t.lost)).toBe(true);
    expect(s.steps).toHaveLength(4);
    for (const st of s.steps)
      for (const k of ["who", "record", "teamSees"] as const)
        expect(st[k].length).toBeGreaterThan(5);
    expect(s.after).toMatch(/responsável/);
  });
});
