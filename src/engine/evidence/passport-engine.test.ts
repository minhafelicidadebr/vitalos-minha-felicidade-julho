import { describe, expect, test } from "bun:test";
import {
  buildPassport,
  checkActivityBudget,
  resolveStudy,
  trustGate,
  validateEvidenceRegistry,
  validateMechanisms,
  type EvidenceRegistry,
  type EvidenceStudy,
  type MechanismRecord,
} from "./passport-engine";
// O engine é puro; o teste de consistência importa o registro REAL congelado
// (padrão journey-consistency: a fonte única é verificada por teste, não por fé).
import registryJson from "../../domain/evidence/evidence-registry.json";
import mechanismJson from "../../domain/evidence/mechanism-registry.json";

const REGISTRY = registryJson as unknown as EvidenceRegistry;
const MECHANISMS = mechanismJson.mechanisms as unknown as MechanismRecord[];

function makeStudy(overrides: Partial<EvidenceStudy> = {}): EvidenceStudy {
  return {
    study_id: "TST-001",
    aliases: [],
    canonical_citation: "Autora, A. (2020). Título do estudo de teste. Revista de Teste, 1(1), 1-10.",
    doi: "10.1000/teste",
    origin_driver: "Test",
    access_type: "abstract_and_metadata",
    verification_status: "B2",
    operational_status: "V1",
    evidence_grade: "E3",
    claim_alignment: "C1",
    transposability: "T2",
    legal_status: "L1",
    safe_claim:
      "Claim seguro de teste com comprimento suficiente para passar na validação de tamanho mínimo.",
    prohibited_claims: [],
    mechanisms: ["test_mechanism"],
    nascente_candidates: ["seguranca"],
    profiles: ["rh"],
    last_verified: "2026-07-14",
    ...overrides,
  };
}

// ─── validateEvidenceRegistry (o congelamento recusa lixo) ────────────────────

describe("validateEvidenceRegistry", () => {
  test("registro real congelado é válido", () => {
    const result = validateEvidenceRegistry(REGISTRY);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  test("C3 sem caveat é recusado (bug RECOG-2020 impossível por construção)", () => {
    const bad: EvidenceRegistry = {
      ...REGISTRY,
      studies: [makeStudy({ claim_alignment: "C3", caveat: undefined })],
    };
    const result = validateEvidenceRegistry(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("C3 sem caveat");
  });

  test("V0 nunca entra", () => {
    const bad: EvidenceRegistry = {
      ...REGISTRY,
      studies: [makeStudy({ operational_status: "V0" as never })],
    };
    expect(validateEvidenceRegistry(bad).valid).toBe(false);
  });

  test("safe_claim curto/ausente é recusado", () => {
    const bad: EvidenceRegistry = { ...REGISTRY, studies: [makeStudy({ safe_claim: "curto" })] };
    expect(validateEvidenceRegistry(bad).valid).toBe(false);
  });

  test("alias colidindo com outro nó é recusado", () => {
    const bad: EvidenceRegistry = {
      ...REGISTRY,
      studies: [makeStudy(), makeStudy({ study_id: "TST-002", aliases: ["TST-001"] })],
    };
    expect(validateEvidenceRegistry(bad).valid).toBe(false);
  });
});

// ─── trustGate (trust once, reuse many) ───────────────────────────────────────

describe("trustGate", () => {
  test("B2 + C1 + L1 sem retratação → confiável, sem caveat", () => {
    const gate = trustGate(makeStudy());
    expect(gate.trusted).toBe(true);
    expect(gate.requiredCaveat).toBeNull();
  });

  test("C3 com caveat → confiável, mas o caveat é obrigatório na superfície", () => {
    const gate = trustGate(makeStudy({ claim_alignment: "C3", caveat: "Ressalva registrada obrigatória." }));
    expect(gate.trusted).toBe(true);
    expect(gate.requiredCaveat).toBe("Ressalva registrada obrigatória.");
  });

  test("V2 sem caveat → não confiável", () => {
    const gate = trustGate(makeStudy({ operational_status: "V2", caveat: undefined }));
    expect(gate.trusted).toBe(false);
  });
});

// ─── resolveStudy (aliases da dedup Fase 1a) ─────────────────────────────────

describe("resolveStudy", () => {
  test("VOI-005 e LDR-013 resolvem para o nó canônico TRU-006 (Edmondson 1999)", () => {
    expect(resolveStudy(REGISTRY, "VOI-005")?.study_id).toBe("TRU-006");
    expect(resolveStudy(REGISTRY, "LDR-013")?.study_id).toBe("TRU-006");
    expect(resolveStudy(REGISTRY, "TRU-006")?.doi).toBe("10.2307/2666999");
  });

  test("id inexistente → null (nunca inventa estudo)", () => {
    expect(resolveStudy(REGISTRY, "XXX-999")).toBeNull();
  });
});

// ─── buildPassport (3 níveis, tudo derivado de códigos) ──────────────────────

describe("buildPassport", () => {
  const edmondson = resolveStudy(REGISTRY, "TRU-006")!;

  test("nível humano: sem jargão de código, claim = safe_claim textual", () => {
    const p = buildPassport(edmondson, "humano");
    expect(p.claim).toBe(edmondson.safe_claim);
    const text = p.lines.map((l) => `${l.label}: ${l.value}`).join(" | ");
    expect(text).not.toMatch(/\bB2\b|\bV1\b|\bE3\b|\bC1\b/); // zero jargão no nível humano
    expect(text).toContain("Evidência consistente");
  });

  test("nível profissional: expõe desenho, alinhamento e acesso honesto", () => {
    const p = buildPassport(edmondson, "profissional");
    const labels = p.lines.map((l) => l.label);
    expect(labels).toContain("Desenho");
    expect(labels).toContain("Acesso na verificação");
    expect(p.lines.find((l) => l.label === "Acesso na verificação")?.value).toContain(
      "texto integral não lido",
    );
  });

  test("nível auditoria: códigos completos + ocorrências consolidadas", () => {
    const p = buildPassport(edmondson, "auditoria");
    expect(p.lines.find((l) => l.label === "Códigos")?.value).toBe("B2 · V1 · E3 · C1 · T3 · L1");
    expect(p.lines.find((l) => l.label === "Ocorrências consolidadas")?.value).toBe(
      "LDR-013, VOI-005",
    );
  });

  test("estudo C3 carrega o caveat no passaporte em qualquer nível", () => {
    const c3 = REGISTRY.studies.find((s) => s.claim_alignment === "C3")!;
    expect(buildPassport(c3, "humano").caveat).toBeTruthy();
  });
});

// ─── checkActivityBudget (orçamento de evidência) ────────────────────────────

describe("checkActivityBudget", () => {
  test("1 mecanismo + 1 principal + ≤2 complementares → ok", () => {
    expect(
      checkActivityBudget({
        mechanismIds: ["MECH-VOICE-001"],
        primaryStudyId: "TRU-006",
        complementaryStudyIds: ["LDR-007"],
      }).valid,
    ).toBe(true);
  });

  test("3 complementares → recusado (tela-bibliografia não passa)", () => {
    expect(
      checkActivityBudget({
        mechanismIds: ["MECH-VOICE-001"],
        primaryStudyId: "TRU-006",
        complementaryStudyIds: ["A-1", "B-2", "C-3"],
      }).valid,
    ).toBe(false);
  });
});

// ─── Consistência: registro real × mecanismos reais ──────────────────────────

describe("consistência do domínio congelado", () => {
  test("todo mecanismo real referencia só estudos existentes e confiáveis", () => {
    const result = validateMechanisms(REGISTRY, MECHANISMS);
    expect(result.errors).toEqual([]);
  });

  test("mecanismo citando estudo inexistente é recusado", () => {
    const fake: MechanismRecord = {
      ...MECHANISMS[0],
      mechanism_id: "MECH-FAKE-001",
      study_ids: ["ZZZ-001"],
      primary_study_id: "ZZZ-001",
    };
    expect(validateMechanisms(REGISTRY, [fake]).valid).toBe(false);
  });

  test("registro congelado: reconciliação = 46 estudos únicos; APP-004 segue excluído", () => {
    expect(REGISTRY.studies.length).toBe(46);
    expect(resolveStudy(REGISTRY, "APP-004")).toBeNull();
    expect(REGISTRY.excluded.some((e) => e.study_id === "APP-004")).toBe(true);
  });
});
