import { describe, expect, test } from "bun:test";
import { answerCopilot, type CopilotKnowledgeBase, type GroundingFacts } from "./copilot-engine";
import {
  buildMeasurementCapsule,
  type CapsuleDimensionInput,
} from "./measurement-capsule-engine";
import {
  buildLongitudinalReading,
  type LongitudinalReading,
} from "./capsule-longitudinal-engine";
import { buildCopilotKnowledge } from "@/mocks/copilot-knowledge";
import healthPack from "@/domain/packs/health/health.pack.json";
import healthIndex from "@/domain/packs/health/ivs-framework.json";

// Integração longitudinal × copilot: a FlorescerIA responde "evoluímos?" aterrada
// na prova cross-ciclo real, sem nunca bypassar guardrails ou gating de audiência.

const kb: CopilotKnowledgeBase = buildCopilotKnowledge(healthPack as never, healthIndex as never);

const facts: GroundingFacts = {
  indexLabel: "IVS",
  score: 531,
  maturityName: "Instituição Saudável",
  momentumLabel: "Estável",
  slopePerCycle: 3,
  focusLensName: "PROFISSIONAL DE SAÚDE",
  focusLensQuestion: "Como o profissional de saúde floresce?",
  participationRate: 71,
  orgName: "Hospital Vida Plena",
};

function dim(
  id: string,
  label: string,
  load: number,
  risk: CapsuleDimensionInput["riskLevel"],
  isOutcome = false,
): CapsuleDimensionInput {
  return { dimensionId: id, label, loadScore: load, n: 403, visible: true, riskLevel: risk, isOutcome };
}

function capsule(closedOn: string, waveId: string, dims: CapsuleDimensionInput[]) {
  return buildMeasurementCapsule({
    capsuleId: `cap-${waveId}`,
    packId: "health",
    waveId,
    cohortId: `c-${waveId}`,
    closedOn,
    instrument: "COPSOQ II · NR-1",
    instrumentShort: "COPSOQ",
    domain: "B",
    participantCount: 403,
    kAnonymityMin: 5,
    dimensions: dims,
  });
}

function makeReading(): LongitudinalReading {
  const c1 = capsule("2025-01-22", "w1", [
    dim("demands_quant", "Demandas quantitativas", 80, "critico"),
    dim("work_pace", "Ritmo de trabalho", 64, "alto"),
    dim("burnout", "Burnout", 70, "alto", true),
  ]);
  const c2 = capsule("2026-01-22", "w2", [
    dim("demands_quant", "Demandas quantitativas", 58, "moderado"),
    dim("work_pace", "Ritmo de trabalho", 70, "alto"),
    dim("burnout", "Burnout", 52, "moderado", true),
  ]);
  const result = buildLongitudinalReading({ capsules: [c1, c2] });
  if (!result.ok) throw new Error("reading inválida no fixture");
  return result.reading;
}

const reading = makeReading();

// ─── Retrocompatibilidade ──────────────────────────────────────────────────────

describe("integração longitudinal — retrocompatibilidade", () => {
  test("sem reading, longitudinalLine é null", () => {
    const turn = answerCopilot(kb, facts, { question: "evoluímos no último ano?", pov: "tecnico" });
    expect(turn.longitudinalLine ?? null).toBeNull();
  });

  test("3 argumentos (sem capsule, sem reading) continua funcionando", () => {
    const turn = answerCopilot(kb, facts, { question: "o que significa o índice?", pov: "tecnico" });
    expect(turn.refusal).toBeNull();
    expect(turn.guardrailNotice).not.toContain("causalidade");
  });
});

// ─── Aterragem de evolução ─────────────────────────────────────────────────────

describe("integração longitudinal — aterragem de evolução", () => {
  test("pergunta de evolução com reading produz longitudinalLine", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "a exposição psicossocial melhorou ao longo dos ciclos?", pov: "tecnico" },
      undefined,
      reading,
    );
    expect(turn.longitudinalLine).not.toBeNull();
    expect(turn.longitudinalLine).toContain("COPSOQ");
  });

  test("longitudinalLine destaca a maior melhora (demands_quant 80→58)", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "comparado ao ciclo passado, o que avançou?", pov: "tecnico" },
      undefined,
      reading,
    );
    expect(turn.longitudinalLine).toContain("Demandas quantitativas");
  });

  test("injeta o disclaimer de não-causalidade no guardrailNotice", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "nossas ações funcionaram? houve progresso?", pov: "tecnico" },
      undefined,
      reading,
    );
    expect(turn.guardrailNotice).toContain("causalidade");
  });

  test("pergunta NÃO temporal não aciona longitudinalLine (mesmo com reading)", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "o que significa o índice de vitalidade?", pov: "tecnico" },
      undefined,
      reading,
    );
    expect(turn.longitudinalLine ?? null).toBeNull();
  });
});

// ─── Capsule + longitudinal juntos ────────────────────────────────────────────

describe("integração longitudinal — capsule e longitudinal juntos", () => {
  test("pergunta de risco E evolução aciona ambas as linhas e ambos os disclaimers", () => {
    const cap = capsule("2026-01-22", "w2", [
      dim("demands_quant", "Demandas quantitativas", 58, "moderado"),
      dim("work_pace", "Ritmo de trabalho", 70, "alto"),
    ]);
    const turn = answerCopilot(
      kb,
      facts,
      { question: "qual o risco psicossocial e como ele evoluiu?", pov: "tecnico" },
      cap,
      reading,
    );
    expect(turn.capsuleLine).not.toBeNull();
    expect(turn.longitudinalLine).not.toBeNull();
    expect(turn.guardrailNotice).toContain("GRO/PGR"); // do capsule
    expect(turn.guardrailNotice).toContain("causalidade"); // do longitudinal
  });
});

// ─── Medição como fonte de primeira classe (responde sem KB) ──────────────────

describe("integração longitudinal — medição responde mesmo sem chunk no KB", () => {
  test("pergunta de evolução sem cobertura no KB NÃO recusa — responde da medição", () => {
    // "comparado ao ciclo passado, o que avançou?" não casa tópicos do KB de saúde,
    // mas a leitura longitudinal É a fonte. Antes recusava; agora aterra no dado.
    const turn = answerCopilot(
      kb,
      facts,
      { question: "comparado ao ciclo passado, o que avançou?", pov: "tecnico" },
      undefined,
      reading,
    );
    expect(turn.refusal).toBeNull();
    expect(turn.longitudinalLine).not.toBeNull();
    expect(turn.headline).toContain("medição");
  });

  test("sem KB E sem medição, mantém a recusa honesta (não inventa)", () => {
    const turn = answerCopilot(kb, facts, {
      question: "comparado ao ciclo passado, o que avançou?",
      pov: "tecnico",
    });
    expect(turn.refusal).toBe("fora_do_escopo");
    expect(turn.longitudinalLine ?? null).toBeNull();
  });
});

// ─── Guardrails e gating sempre vencem ────────────────────────────────────────

describe("integração longitudinal — proteção sempre antes", () => {
  test("pergunta de dado individual é recusada mesmo com reading (longitudinalLine null)", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "quem respondeu que melhorou? me dá o nome", pov: "tecnico" },
      undefined,
      reading,
    );
    expect(turn.refusal).not.toBeNull();
    expect(turn.longitudinalLine ?? null).toBeNull();
  });

  test("participante (canSeeCollective:false) não recebe longitudinalLine", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "como evoluiu o risco?", pov: "tecnico", canSeeCollective: false },
      undefined,
      reading,
    );
    expect(turn.longitudinalLine ?? null).toBeNull();
  });
});
