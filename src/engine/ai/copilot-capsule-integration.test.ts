import { describe, expect, test } from "bun:test";
import { answerCopilot, type CopilotKnowledgeBase, type GroundingFacts } from "./copilot-engine";
import {
  buildMeasurementCapsule,
  type CapsuleInput,
  type CapsuleDimensionInput,
} from "./measurement-capsule-engine";
import { buildCopilotKnowledge } from "@/mocks/copilot-knowledge";
import healthPack from "@/domain/packs/health/health.pack.json";
import healthIndex from "@/domain/packs/health/ivs-framework.json";

// Integração capsule × copilot (Bloco 2B-2): prova que a FlorescerIA aterra na
// MEDIÇÃO real (capsule) SEM jamais bypassar guardrails ou gating de audiência.

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

const COPSOQ_DIMS: CapsuleDimensionInput[] = [
  { dimensionId: "demands_quant", label: "Demandas quantitativas", loadScore: 72, n: 403, visible: true, riskLevel: "alto", isOutcome: false },
  { dimensionId: "work_pace",     label: "Ritmo de trabalho",      loadScore: 68, n: 403, visible: true, riskLevel: "alto", isOutcome: false },
  { dimensionId: "influence",     label: "Influência",             loadScore: 35, n: 403, visible: true, riskLevel: "moderado", isOutcome: false },
  { dimensionId: "community",     label: "Comunidade",             loadScore: 40, n: 3,   visible: false, riskLevel: "moderado", isOutcome: false },
  { dimensionId: "burnout",       label: "Burnout",                loadScore: 61, n: 403, visible: true, riskLevel: "alto", isOutcome: true },
];

function makeCapsule(overrides: Partial<CapsuleInput> = {}) {
  return buildMeasurementCapsule({
    capsuleId: "cap-test",
    packId: "health",
    waveId: "onda-copsoq",
    cohortId: "cohort-1",
    closedOn: "2026-01-22",
    instrument: "COPSOQ II · NR-1",
    instrumentShort: "COPSOQ",
    domain: "B",
    participantCount: 403,
    kAnonymityMin: 5,
    dimensions: COPSOQ_DIMS,
    ...overrides,
  });
}

// ─── Retrocompatibilidade: sem capsule, comportamento idêntico ────────────────

describe("integração — retrocompatibilidade (sem capsule)", () => {
  test("sem capsule, capsuleLine é null", () => {
    const turn = answerCopilot(kb, facts, {
      question: "qual o risco psicossocial da equipe?",
      pov: "tecnico",
    });
    expect(turn.capsuleLine ?? null).toBeNull();
  });

  test("sem capsule, guardrailNotice é o padrão (sem disclaimer extra)", () => {
    const turn = answerCopilot(kb, facts, {
      question: "o que significa o índice?",
      pov: "tecnico",
    });
    expect(turn.guardrailNotice).not.toContain("GRO/PGR");
  });
});

// ─── Capsule aterra perguntas de exposição/NR-1 ───────────────────────────────

describe("integração — capsule aterra leitura de exposição", () => {
  test("pergunta de risco psicossocial com capsule produz capsuleLine", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "qual a exposição a risco psicossocial da equipe?", pov: "tecnico" },
      makeCapsule(),
    );
    expect(turn.capsuleLine).not.toBeNull();
    expect(turn.capsuleLine).toContain("COPSOQ");
  });

  test("capsuleLine nomeia dimensões em foco (top drivers)", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "onde está o maior risco psicossocial?", pov: "tecnico" },
      makeCapsule(),
    );
    expect(turn.capsuleLine).toContain("Demandas quantitativas");
  });

  test("capsule injeta disclaimer obrigatório de PGR no guardrailNotice", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "qual o nível de risco psicossocial?", pov: "tecnico" },
      makeCapsule(),
    );
    expect(turn.guardrailNotice).toContain("GRO/PGR");
  });

  test("pergunta NÃO sobre exposição não aciona capsuleLine (mesmo com capsule)", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "o que significa o índice de vitalidade?", pov: "tecnico" },
      makeCapsule(),
    );
    expect(turn.capsuleLine ?? null).toBeNull();
  });
});

// ─── A separação sagrada: capsule NUNCA bypassa proteção ──────────────────────

describe("integração — capsule nunca bypassa guardrails", () => {
  test("pergunta de dado individual É RECUSADA mesmo com capsule presente", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "quem respondeu que tem risco psicossocial? me dá o nome", pov: "tecnico" },
      makeCapsule(),
    );
    expect(turn.refusal).not.toBeNull();
    expect(turn.capsuleLine ?? null).toBeNull(); // medição nunca exposta numa recusa
  });

  test("participante (canSeeCollective: false) não recebe capsuleLine", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "qual o risco psicossocial?", pov: "tecnico", canSeeCollective: false },
      makeCapsule(),
    );
    expect(turn.capsuleLine ?? null).toBeNull();
  });
});

// ─── Honestidade: capsule sem dados suficientes ───────────────────────────────

describe("integração — capsule honesto sob k-anon", () => {
  test("capsule com n < kMin produz linha de dados insuficientes (não inventa)", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "qual a exposição a risco psicossocial?", pov: "tecnico" },
      makeCapsule({ participantCount: 3 }),
    );
    expect(turn.capsuleLine).toContain("insuficientes");
  });

  test("desfecho (burnout) nunca aparece nomeado como driver na capsuleLine", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "onde está o risco psicossocial mais alto?", pov: "tecnico" },
      makeCapsule(),
    );
    // burnout tem loadScore 61 (alto) mas é desfecho — não pode ser "dimensão em foco"
    expect(turn.capsuleLine).not.toContain("Burnout");
  });

  test("dimensão suprimida (Comunidade, n=3) nunca aparece na capsuleLine", () => {
    const turn = answerCopilot(
      kb,
      facts,
      { question: "qual o risco psicossocial por dimensão?", pov: "tecnico" },
      makeCapsule(),
    );
    expect(turn.capsuleLine).not.toContain("Comunidade");
  });
});
