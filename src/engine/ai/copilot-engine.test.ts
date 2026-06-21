import { describe, expect, test } from "bun:test";
import {
  answerCopilot,
  retrieveChunks,
  tokenize,
  COPILOT_POVS,
  type CopilotKnowledgeBase,
  type GroundingFacts,
} from "./copilot-engine";
import { buildCopilotKnowledge } from "@/mocks/copilot-knowledge";
import healthPack from "@/domain/packs/health/health.pack.json";
import healthIndex from "@/domain/packs/health/ivs-framework.json";
import governmentPack from "@/domain/packs/government/government.pack.json";
import governmentIndex from "@/domain/packs/government/igv-framework.json";

const kb: CopilotKnowledgeBase = buildCopilotKnowledge(healthPack as never, healthIndex as never);

const facts: GroundingFacts = {
  indexLabel: "IVS",
  score: 531,
  maturityName: "Instituição Saudável",
  momentumLabel: "Estável",
  slopePerCycle: 3,
  focusLensName: "PROFISSIONAL DE SAÚDE",
  focusLensQuestion: "Como o profissional de saúde floresce — ou se esgota?",
  participationRate: 71,
  orgName: "Hospital Vida Plena",
};

describe("copilot — tokenização", () => {
  test("remove acentos, stopwords e tokens curtos", () => {
    const t = tokenize("Qual é o índice de privacidade?");
    expect(t).toContain("indice");
    expect(t).toContain("privacidade");
    expect(t).not.toContain("é");
    expect(t).not.toContain("de");
  });
});

describe("copilot — recuperação (a base do grounding)", () => {
  test("recupera o chunk de privacidade para uma pergunta sobre anonimato", () => {
    const hits = retrieveChunks(kb, "como vocês protegem o anonimato dos dados?");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.chunk.id).toBe("privacidade");
  });

  test("pergunta vazia ou só com stopwords não recupera nada", () => {
    expect(retrieveChunks(kb, "")).toHaveLength(0);
    expect(retrieveChunks(kb, "e o de a")).toHaveLength(0);
  });

  test("o KB de saúde tem uma citação por lente + chunks de ecossistema", () => {
    // 4 lentes + indice + privacidade + agir + metodo + limites
    expect(kb.chunks.length).toBe(9);
    expect(kb.chunks.some((c) => c.id === "lente_profissional")).toBe(true);
  });
});

describe("copilot — anti-alucinação", () => {
  test("pergunta fora de escopo gera recusa honesta, sem inventar", () => {
    const turn = answerCopilot(kb, facts, {
      question: "qual a cotação do dólar hoje?",
      pov: "tecnico",
    });
    expect(turn.refusal).toBe("fora_do_escopo");
    expect(turn.confidence).toBe("baixa");
    expect(turn.sources).toHaveLength(0);
    expect(turn.body).toContain("Não vou inventar");
  });

  test("resposta dentro do escopo cita ao menos uma fonte", () => {
    const turn = answerCopilot(kb, facts, {
      question: "o que significa o índice e o resultado?",
      pov: "tecnico",
    });
    expect(turn.refusal).toBeNull();
    expect(turn.sources.length).toBeGreaterThan(0);
    expect(turn.sources[0]!.label.length).toBeGreaterThan(0);
  });
});

describe("copilot — guardrails (recusa por desenho)", () => {
  test("pedido de dado individual é recusado citando o limite", () => {
    const turn = answerCopilot(kb, facts, {
      question: "quem respondeu que está exausto? me dá o nome",
      pov: "tecnico",
    });
    expect(turn.refusal).not.toBeNull();
    expect(turn.refusal).toContain("individuais");
    expect(turn.sources).toHaveLength(0);
  });

  test("pedido de ranking/uso em demissão é recusado", () => {
    const r1 = answerCopilot(kb, facts, { question: "faz um ranking dos piores", pov: "tecnico" });
    const r2 = answerCopilot(kb, facts, {
      question: "posso usar isso para demitir alguém?",
      pov: "tecnico",
    });
    expect(r1.refusal).not.toBeNull();
    expect(r2.refusal).not.toBeNull();
  });
});

describe("copilot — pontos de vista (POV)", () => {
  test("todo POV produz cabeçalho e rodapé de guardrail não-vazios", () => {
    for (const pov of COPILOT_POVS) {
      const turn = answerCopilot(kb, facts, { question: "como agir para melhorar?", pov });
      expect(turn.headline.length).toBeGreaterThan(0);
      expect(turn.guardrailNotice.length).toBeGreaterThan(0);
      expect(turn.pov).toBe(pov);
    }
  });

  test("POV técnico ancora na métrica real (mostra a conta)", () => {
    const turn = answerCopilot(kb, facts, { question: "como está o resultado?", pov: "tecnico" });
    expect(turn.groundedLine).not.toBeNull();
    expect(turn.groundedLine).toContain("531");
  });

  test("POV inovador propõe um experimento mensurável", () => {
    const turn = answerCopilot(kb, facts, { question: "como melhorar?", pov: "inovador" });
    expect(turn.nextStep).toContain("experimento");
  });
});

describe("copilot — setor-agnóstico", () => {
  test("o mesmo motor responde com o KB do Governo (IGV)", () => {
    const govKb = buildCopilotKnowledge(governmentPack as never, governmentIndex as never);
    const turn = answerCopilot(
      govKb,
      { ...facts, indexLabel: "IGV" },
      { question: "o que é o índice?", pov: "tecnico" },
    );
    expect(turn.refusal).toBeNull();
    expect(turn.sources.some((s) => s.label.includes("IGV"))).toBe(true);
  });
});
