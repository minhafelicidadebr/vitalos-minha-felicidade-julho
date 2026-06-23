import { describe, expect, it } from "bun:test";
import {
  buildDriverMentorChunks,
  driverLabel,
  scopeKnowledgeToDriver,
} from "./driver-mentor-knowledge";
import { buildCopilotKnowledge } from "./copilot-knowledge";
import { answerCopilot, retrieveChunks, type GroundingFacts } from "@/engine/ai/copilot-engine";
import { evaluateTurn } from "@/engine/ai/qa-gates";
import enterprisePack from "@/domain/packs/enterprise/enterprise.pack.json";
import enterpriseIndex from "@/domain/packs/enterprise/ivo-framework.json";

const base = buildCopilotKnowledge(enterprisePack as never, enterpriseIndex as never);
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

describe("driver-mentor-knowledge · montagem dos chunks", () => {
  it("monta chunks do driver com visão geral, intersecções e ação — todos com fonte", () => {
    const chunks = buildDriverMentorChunks("carga");
    expect(chunks.length).toBeGreaterThan(4);
    expect(chunks.some((c) => c.id === "driver_carga")).toBe(true);
    expect(chunks.some((c) => c.id === "acoes_camadas")).toBe(true);
    expect(chunks.every((c) => c.source.trim().length > 0)).toBe(true);
  });

  it("driver inexistente → sem chunks; driverLabel → null", () => {
    expect(buildDriverMentorChunks("inexistente")).toEqual([]);
    expect(driverLabel("inexistente")).toBeNull();
    expect(driverLabel("carga")).toBe("Carga & Recuperação");
  });
});

describe("driver-mentor-knowledge · KB escopada", () => {
  it("coloca os chunks do driver à frente e preserva a base do pack", () => {
    const kb = scopeKnowledgeToDriver(base, "carga");
    expect(kb.chunks.length).toBe(buildDriverMentorChunks("carga").length + base.chunks.length);
    expect(kb.chunks[0]!.id).toBe("driver_carga");
    expect(kb.chunks.some((c) => c.id === "privacidade")).toBe(true);
  });

  it("driver inexistente → base intacta (fallback honesto)", () => {
    expect(scopeKnowledgeToDriver(base, "inexistente")).toEqual(base);
  });

  it("recupera a intersecção certa para uma pergunta sobre o driver", () => {
    const kb = scopeKnowledgeToDriver(base, "carga");
    const hits = retrieveChunks(kb, "como reduzir a sobrecarga e o ritmo de trabalho?");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.chunk.id.startsWith("int_") || h.chunk.id === "acoes_camadas")).toBe(true);
  });
});

describe("driver-mentor-knowledge · o mentor honra os QA Gates", () => {
  const kb = scopeKnowledgeToDriver(base, "carga");
  const probes = [
    "como agir sobre a carga de trabalho?",
    "o que a evidência diz sobre exigências quantitativas?",
    "como melhorar a recuperação da equipe?",
  ];
  for (const q of probes) {
    it(`"${q.slice(0, 30)}…" responde aterrado e passa G2/G3/G5`, () => {
      const turn = answerCopilot(kb, facts, { question: q, pov: "tecnico" });
      const report = evaluateTurn(turn);
      if (!report.passed) throw new Error(report.violations.map((v) => `${v.gate}: ${v.detail}`).join(" | "));
      expect(report.passed).toBe(true);
      expect(turn.sources.length).toBeGreaterThan(0);
    });
  }
});
