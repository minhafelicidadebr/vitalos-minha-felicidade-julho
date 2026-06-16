import { describe, expect, test } from "bun:test";
import { buildDevolutiva, type DevolutivaInput } from "./devolutiva-engine";

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
