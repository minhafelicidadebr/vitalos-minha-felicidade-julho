import { describe, expect, test } from "bun:test";
import { retrieveChunks, type GroundingFacts } from "./copilot-engine";
import { buildPromptEnvelope } from "./copilot-prompt";
import { buildCopilotKnowledge } from "@/mocks/copilot-knowledge";
import healthPack from "@/domain/packs/health/health.pack.json";
import healthIndex from "@/domain/packs/health/ivs-framework.json";

const kb = buildCopilotKnowledge(healthPack as never, healthIndex as never);
const facts: GroundingFacts = {
  indexLabel: "IVS",
  score: 531,
  maturityName: "Instituição Saudável",
  momentumLabel: "Estável",
  slopePerCycle: 3,
  focusLensName: "PROFISSIONAL DE SAÚDE",
  focusLensQuestion: null,
  participationRate: 71,
  orgName: "Hospital Vida Plena",
};

describe("copilot prompt — envelope RAG-then-generate", () => {
  test("system carrega as regras invioláveis (não inventar, citar, nunca individual)", () => {
    const q = { question: "o que é o índice?", pov: "tecnico" as const };
    const env = buildPromptEnvelope(kb, facts, q, retrieveChunks(kb, q.question));
    expect(env.system).toContain("SOMENTE a partir do CONTEXTO");
    expect(env.system).toContain("Cite a fonte");
    expect(env.system.toLowerCase()).toContain("nunca");
  });

  test("context contém apenas as fontes recuperadas (grounding)", () => {
    const q = { question: "como protegem o anonimato?", pov: "tecnico" as const };
    const retrieved = retrieveChunks(kb, q.question);
    const env = buildPromptEnvelope(kb, facts, q, retrieved);
    expect(env.context).toContain("CONTEXTO RECUPERADO");
    expect(env.context).toContain(retrieved[0]!.chunk.source);
  });

  test("gestão vê métricas no envelope; participante não", () => {
    const q = { question: "como está o resultado?", pov: "tecnico" as const };
    const gestao = buildPromptEnvelope(
      kb,
      facts,
      { ...q, canSeeCollective: true },
      retrieveChunks(kb, q.question),
    );
    const part = buildPromptEnvelope(
      kb,
      facts,
      { ...q, canSeeCollective: false },
      retrieveChunks(kb, q.question),
    );
    expect(gestao.context).toContain("531");
    expect(part.context).not.toContain("531");
    expect(part.context.toLowerCase()).toContain("ocultas");
  });

  test("user carrega a pergunta e a instrução do POV", () => {
    const q = { question: "como melhorar?", pov: "inovador" as const };
    const env = buildPromptEnvelope(kb, facts, q, retrieveChunks(kb, q.question));
    expect(env.user).toContain("como melhorar?");
    expect(env.user.toLowerCase()).toContain("experimento");
  });
});
