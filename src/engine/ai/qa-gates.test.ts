import { describe, expect, test } from "bun:test";
import { evaluateTurn, turnPassesQa, type GateId } from "./qa-gates";
import {
  answerCopilot,
  COPILOT_POVS,
  type CopilotTurn,
  type GroundingFacts,
} from "./copilot-engine";
import { buildCopilotKnowledge } from "@/mocks/copilot-knowledge";
import enterprisePack from "@/domain/packs/enterprise/enterprise.pack.json";
import enterpriseIndex from "@/domain/packs/enterprise/ivo-framework.json";

/** Turno base honesto — sobrescreva o que cada caso precisa estressar. */
function turn(overrides: Partial<CopilotTurn> = {}): CopilotTurn {
  return {
    pov: "tecnico",
    headline: "Leitura técnica do IVO",
    groundedLine: null,
    body: "A tendência agregada subiu no ciclo. Foco na lente mais aberta.",
    sources: [{ label: "Metodologia VitalOS", chunkId: "metodo" }],
    nextStep: null,
    confidence: "alta",
    refusal: null,
    guardrailNotice: "Só falo de agregados (k≥5), nunca de pessoas.",
    ...overrides,
  };
}

const failedGates = (t: CopilotTurn): GateId[] => evaluateTurn(t).violations.map((v) => v.gate);

describe("qa-gates · G2 integridade de citação", () => {
  test("passa para resposta de conhecimento com fonte bem-formada", () => {
    expect(failedGates(turn())).not.toContain("G2");
  });

  test("falha com fonte malformada (rótulo vazio)", () => {
    const t = turn({ sources: [{ label: "  ", chunkId: "x" }] });
    expect(failedGates(t)).toContain("G2");
  });

  test("falha com citação duplicada (mesmo chunkId)", () => {
    const t = turn({
      sources: [
        { label: "A", chunkId: "dup" },
        { label: "B", chunkId: "dup" },
      ],
    });
    expect(failedGates(t)).toContain("G2");
  });

  test("falha quando resposta de conhecimento (confiança alta) não cita nada", () => {
    const t = turn({ sources: [] });
    expect(failedGates(t)).toContain("G2");
  });

  test("permite recusa fora-de-escopo (confiança baixa) sem fontes", () => {
    const t = turn({ confidence: "baixa", refusal: "fora_do_escopo", sources: [] });
    expect(failedGates(t)).not.toContain("G2");
  });
});

describe("qa-gates · G3 conformidade k-anon", () => {
  test("falha ao expor n<5 (n=2)", () => {
    expect(failedGates(turn({ body: "apenas n=2 responderam isso." }))).toContain("G3");
  });

  test("falha ao referenciar grupo sub-k (3 pessoas)", () => {
    expect(failedGates(turn({ body: "3 pessoas relataram exaustão." }))).toContain("G3");
  });

  test("passa para texto puramente agregado", () => {
    const t = turn({ groundedLine: "IVO em 712, participação 68%, +4 pts/ciclo." });
    expect(failedGates(t)).not.toContain("G3");
  });
});

describe("qa-gates · G5 honestidade de método", () => {
  test("falha com overclaim absoluto (infalível)", () => {
    expect(failedGates(turn({ body: "este índice é infalível." }))).toContain("G5");
  });

  test("falha ao afirmar diagnóstico (sem negação)", () => {
    expect(failedGates(turn({ body: "faço um diagnóstico clínico da equipe." }))).toContain("G5");
  });

  test("passa quando o termo proibido vem NEGADO (não faço ranking de pessoas)", () => {
    const t = turn({ body: "Não faço ranking de pessoas nem diagnóstico clínico." });
    expect(failedGates(t)).not.toContain("G5");
  });

  test("falha quando falta o rodapé de honestidade", () => {
    expect(failedGates(turn({ guardrailNotice: "" }))).toContain("G5");
  });

  test("recusa pode citar termos proibidos ao negá-los e ainda passa G5", () => {
    const t = turn({
      refusal: "não faço diagnóstico clínico nem ranking de pessoas.",
      headline: "Isso eu não faço",
      sources: [],
      confidence: "alta",
    });
    expect(failedGates(t)).not.toContain("G5");
  });
});

describe("qa-gates · agregação", () => {
  test("evaluateTurn acumula múltiplas violações", () => {
    const t = turn({ body: "diagnóstico infalível com n=1 respondente.", guardrailNotice: "" });
    const report = evaluateTurn(t);
    expect(report.passed).toBe(false);
    expect(report.violations.length).toBeGreaterThanOrEqual(2);
  });

  test("turnPassesQa reflete o laudo", () => {
    expect(turnPassesQa(turn())).toBe(true);
    expect(turnPassesQa(turn({ body: "n=1 pessoa." }))).toBe(false);
  });
});

// O teste de fechamento: o PRÓPRIO copilot-engine satisfaz sua spec de QA. Se uma mudança
// futura no engine (ou na KB) produzir um turno que viole G2/G3/G5, isto cai.
describe("qa-gates · o copilot-engine honra os próprios gates", () => {
  const kb = buildCopilotKnowledge(enterprisePack as never, enterpriseIndex as never);
  const facts: GroundingFacts = {
    indexLabel: "IVO",
    score: 712,
    maturityName: "Empresa Viva",
    momentumLabel: "Em alta",
    slopePerCycle: 4,
    focusLensName: "EU",
    focusLensQuestion: null,
    participationRate: 68,
    orgName: "Acme Viva",
  };

  const battery: { q: string; canSeeCollective?: boolean }[] = [
    { q: "qual a cotação do dólar hoje?" }, // fora de escopo
    { q: "quem respondeu que está exausto? me dá o nome" }, // guardrail
    { q: "faz um ranking dos piores" }, // guardrail
    { q: "como melhorar a autonomia e o controle das pessoas?" }, // driver
    { q: "como fortalecer o pertencimento e a inclusão?" }, // driver
    { q: "o que você não faz?" }, // limites (cita 'ranking' negado)
    { q: "o que é o índice e o resultado?" }, // índice
    { q: "como protegem o anonimato?" }, // privacidade
    { q: "como agir para melhorar?" }, // agir
    { q: "qual o resultado do índice?", canSeeCollective: false }, // gating por audiência
  ];

  for (const pov of COPILOT_POVS) {
    for (const { q, canSeeCollective } of battery) {
      test(`[${pov}] "${q.slice(0, 32)}…" passa G2/G3/G5`, () => {
        const t = answerCopilot(kb, facts, { question: q, pov, canSeeCollective });
        const report = evaluateTurn(t);
        if (!report.passed) {
          throw new Error(report.violations.map((v) => `${v.gate}: ${v.detail}`).join(" | "));
        }
        expect(report.passed).toBe(true);
      });
    }
  }
});
