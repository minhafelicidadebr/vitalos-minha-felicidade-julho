// Teste estrutural do cta-registry.json — camada de domínio, não de engine
// (Engine ≠ Domínio: src/engine/florencia nunca importa este JSON, então a
// cobertura de contrato do registry vive aqui, ao lado do arquivo).
//
// Cobre a reconciliação da capacidade prepare_safe_conversation: só o label
// de CTA-PREPARE-CONVERSATION muda; os outros 4 CTAs (e todo o resto de
// CTA-PREPARE-CONVERSATION) ficam bit-a-bit preservados.

import { describe, expect, test } from "bun:test";
import ctaRegistryJson from "./cta-registry.json";

interface CtaEntry {
  cta_id: string;
  intent: string;
  label: string;
  icon: string;
  entityRefs: string[];
  allowedEntityRefPrefixes: string[];
  requestedClaimIds: string[];
  candidateSkillIds: string[];
  suggestedQuestions: string[];
}

interface CtaRegistry {
  registry: string;
  version: string;
  description: string;
  ctas: CtaEntry[];
}

const REGISTRY = ctaRegistryJson as unknown as CtaRegistry;

// Capacidades PLANNED do CAPABILITY-MAP.md — nunca podem aparecer como intent
// operacional no registry real enquanto não viram ACTIVE.
const PLANNED_CAPABILITY_IDS = [
  "interpret_aggregated_results",
  "transform_findings_into_action",
  "create_educational_activity",
  "register_next_step",
];

// Snapshot dos 4 CTAs que NÃO fazem parte desta reconciliação — preservados
// bit-a-bit (nenhum campo, inclusive suggestedQuestions, pode divergir).
const UNCHANGED_CTA_IDS = [
  "CTA-EXPLAIN-MECHANISM",
  "CTA-CREATE-TEAM-MISSION",
  "CTA-SUGGEST-OBSERVATION",
  "CTA-ORGANIZE-EVIDENCE",
];

describe("cta-registry.json — estrutura", () => {
  test("é um objeto válido com a forma esperada", () => {
    expect(REGISTRY.registry).toBe("FlorêncIA CTA Registry");
    expect(Array.isArray(REGISTRY.ctas)).toBe(true);
    expect(REGISTRY.ctas.length).toBe(5);
  });

  test("versão é 1.1.1", () => {
    expect(REGISTRY.version).toBe("1.1.1");
  });

  test("todo cta_id é único", () => {
    const ids = REGISTRY.ctas.map((c) => c.cta_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("todo intent é não vazio", () => {
    for (const cta of REGISTRY.ctas) {
      expect(cta.intent.trim().length).toBeGreaterThan(0);
    }
  });

  test("nenhuma capacidade PLANNED aparece como intent no registry operacional", () => {
    const intents = REGISTRY.ctas.map((c) => c.intent);
    for (const plannedId of PLANNED_CAPABILITY_IDS) {
      expect(intents).not.toContain(plannedId);
    }
  });
});

describe("CTA-PREPARE-CONVERSATION — reconciliação prepare_safe_conversation", () => {
  const cta = REGISTRY.ctas.find((c) => c.cta_id === "CTA-PREPARE-CONVERSATION");

  test("existe no registry", () => {
    expect(cta).toBeDefined();
  });

  test("intent permanece prepare_conversation", () => {
    expect(cta?.intent).toBe("prepare_conversation");
  });

  test("label foi atualizado para o texto aprovado", () => {
    expect(cta?.label).toBe("Preparar uma conversa segura");
  });

  test("requestedClaimIds preservado", () => {
    expect(cta?.requestedClaimIds).toEqual(["CLAIM-EDMONDSON1999-VOICE-002"]);
  });

  test("entityRefs, allowedEntityRefPrefixes e candidateSkillIds preservados", () => {
    expect(cta?.entityRefs).toEqual(["mechanism:MECH-VOICE-001", "study:EDMONDSON-1999"]);
    expect(cta?.allowedEntityRefPrefixes).toEqual(["mechanism", "study"]);
    expect(cta?.candidateSkillIds).toEqual([
      "SKILL-CONVERSATION-FACILITATOR",
      "SKILL-EVIDENCE-CLAIM-GUARDIAN",
      "SKILL-PRIVACY-SAFETY-GUARDIAN",
    ]);
  });
});

describe("os outros 4 CTAs — nenhuma alteração ou remoção", () => {
  test("todos os 4 continuam presentes", () => {
    const ids = REGISTRY.ctas.map((c) => c.cta_id);
    for (const id of UNCHANGED_CTA_IDS) {
      expect(ids).toContain(id);
    }
  });

  test("explain_mechanism não foi removido do conjunto governado", () => {
    const cta = REGISTRY.ctas.find((c) => c.cta_id === "CTA-EXPLAIN-MECHANISM");
    expect(cta?.intent).toBe("explain_mechanism");
    expect(cta?.label).toBe("Explique por que isso importa");
  });

  test("create_team_mission mantém intent e claim originais (não virou transform_findings_into_action)", () => {
    const cta = REGISTRY.ctas.find((c) => c.cta_id === "CTA-CREATE-TEAM-MISSION");
    expect(cta?.intent).toBe("create_team_mission");
    expect(cta?.requestedClaimIds).toEqual(["CLAIM-LDR007-VOICE-001"]);
  });

  test("suggest_observation mantém intent original (não virou interpret_aggregated_results)", () => {
    const cta = REGISTRY.ctas.find((c) => c.cta_id === "CTA-SUGGEST-OBSERVATION");
    expect(cta?.intent).toBe("suggest_observation");
    expect(cta?.requestedClaimIds).toEqual(["CLAIM-LDR007-VOICE-002"]);
  });

  test("organize_evidence mantém intent original (não virou register_next_step)", () => {
    const cta = REGISTRY.ctas.find((c) => c.cta_id === "CTA-ORGANIZE-EVIDENCE");
    expect(cta?.intent).toBe("organize_evidence");
    expect(cta?.requestedClaimIds).toEqual(["CLAIM-EDMONDSON1999-VOICE-003"]);
  });
});
