import { describe, expect, test } from "bun:test";
import {
  buildDevolutiva,
  buildStrengthsDevolutiva,
  type DevolutivaInput,
  type StrengthsDevolutivaInput,
} from "./devolutiva-engine";

function base(over: Partial<DevolutivaInput> = {}): DevolutivaInput {
  return {
    instrumentLabel: "PERMA+V → IVO",
    instrumentShort: "PERMA+V / IVO",
    season: "Florescimento",
    indexLabel: "IVO",
    indexScore: 619,
    maturityName: "Organização Saudável",
    momentumLabel: "subindo",
    highlightLens: { name: "EU", score: 712 },
    focusLens: { name: "ORGANIZAÇÃO", score: 488, question: "O sistema sustenta?" },
    topMove: { label: "Rituais de reconhecimento", lift: 28 },
    learningRoute: "/academia",
    ...over,
  };
}

describe("devolutiva — narrativa de quatro tempos", () => {
  test("sempre tem os 4 blocos Medimos→Aprendemos→Significa→Próximo passo", () => {
    const d = buildDevolutiva(base(), "coletivo");
    expect(d.blocks.map((b) => b.kicker)).toEqual([
      "Medimos",
      "Aprendemos",
      "O que significa",
      "Próximo passo",
    ]);
  });

  test("o bloco 'Aprendemos' carrega o índice e a maturidade", () => {
    const d = buildDevolutiva(base(), "coletivo");
    expect(d.blocks[1]!.title).toContain("619");
    expect(d.blocks[1]!.title).toContain("Organização Saudável");
  });

  test("celebra a lente que brilha e nomeia a lente-foco", () => {
    const d = buildDevolutiva(base(), "coletivo");
    expect(d.blocks[2]!.body).toContain("EU");
    expect(d.blocks[2]!.body).toContain("ORGANIZAÇÃO");
  });
});

describe("devolutiva — diverge por audiência", () => {
  test("coletivo → próximo passo é AGIR (Prioridades)", () => {
    const d = buildDevolutiva(base(), "coletivo");
    expect(d.blocks[3]!.cta?.route).toBe("/prioridades");
    expect(d.blocks[3]!.title).toContain("Rituais de reconhecimento");
  });

  test("individual → próximo passo é APRENDER (Academia) e agradece", () => {
    const d = buildDevolutiva(base(), "individual");
    expect(d.blocks[3]!.cta?.route).toBe("/academia");
    expect(d.headline).toContain("Obrigado");
  });

  test("sem topMove → não fabrica alavanca, pede definir a intervenção", () => {
    const d = buildDevolutiva(base({ topMove: null }), "coletivo");
    expect(d.blocks[3]!.title).toContain("Definir");
  });

  test("o aviso de honestidade está sempre presente", () => {
    expect(buildDevolutiva(base(), "coletivo").honestyNote).toContain("não promessa");
  });
});

// ─── Devolutiva de FORÇAS (VIA-T) ─────────────────────────────────────────────

function strengthsBase(over: Partial<StrengthsDevolutivaInput> = {}): StrengthsDevolutivaInput {
  return {
    instrumentLabel: "VIA-T v1 · Forças de caráter",
    season: "Forças em Cultura",
    signatureStrength: { name: "Curiosidade", score: 7.4 },
    topStrengths: [
      { name: "Curiosidade", score: 7.4 },
      { name: "Trabalho em equipe", score: 7.1 },
      { name: "Justiça e equidade", score: 6.9 },
    ],
    emergingStrength: { name: "Gratidão", score: 5.6 },
    developmentRoute: "/academia",
    ...over,
  };
}

describe("devolutiva de forças — positiva e dentro dos guardrails VIA-T", () => {
  test("celebra a força assinatura e nomeia as top forças", () => {
    const d = buildStrengthsDevolutiva(strengthsBase(), "coletivo");
    expect(d.blocks[1]!.title).toContain("Curiosidade");
    expect(d.blocks[2]!.body).toContain("Trabalho em equipe");
  });

  test("a força a desenvolver é enquadrada como OPORTUNIDADE, não déficit", () => {
    const d = buildStrengthsDevolutiva(strengthsBase(), "coletivo");
    expect(d.blocks[3]!.title).toContain("Cultivar Gratidão");
    expect(d.blocks[3]!.title).toContain("oportunidade");
  });

  test("o aviso jamais permite ranking de pessoas / seleção (guardrail VIA-T)", () => {
    const note = buildStrengthsDevolutiva(strengthsBase(), "coletivo").honestyNote;
    expect(note).toContain("não é ranking de pessoas");
    expect(note).toContain("seleção");
  });

  test("individual → desenvolvimento sem comparação (Academia)", () => {
    const d = buildStrengthsDevolutiva(strengthsBase(), "individual");
    expect(d.blocks[3]!.cta?.route).toBe("/academia");
    expect(d.blocks[3]!.body).toContain("sem comparação");
  });
});
