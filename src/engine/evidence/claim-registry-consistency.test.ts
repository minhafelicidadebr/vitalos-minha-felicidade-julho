// Teste cruzado Claim Registry × Evidence Registry (Onda 3.5).
// Cobre exatamente os casos exigidos: todo claim referencia estudo canônico
// existente; V0/B0 bloqueia; C3 exige caveat; C4-C7 bloqueia; papel, segmento,
// uso e contexto incompatíveis bloqueiam — cada um isoladamente.

import { describe, expect, test } from "bun:test";
import {
  resolveCanonicalStudy,
  trustGate,
  validateClaimRegistry,
  validateEvidenceRegistry,
  type ClaimRecord,
  type ClaimRegistry,
  type EvidenceRegistry,
  type RequestContext,
} from "./passport-engine";
import evidenceRegistryJson from "../../domain/evidence/evidence-registry.json";
import claimRegistryJson from "../../domain/evidence/claim-registry.json";

const EVIDENCE = evidenceRegistryJson as unknown as EvidenceRegistry;
const CLAIMS = claimRegistryJson as unknown as ClaimRegistry;

function makeClaim(overrides: Partial<ClaimRecord> = {}): ClaimRecord {
  return {
    claim_id: "CLAIM-TEST-001",
    study_id: "EDMONDSON-1999",
    intended_use: "explain_mechanism",
    role: ["lider"],
    segment: ["enterprise"],
    target_context: "evidencia-passaporte",
    claim_alignment: "C1",
    safe_claim: "Claim de teste com comprimento suficiente para passar na validação mínima exigida.",
    prohibited_claims: [],
    ...overrides,
  };
}

const MATCHING_CONTEXT: RequestContext = {
  intendedUse: "explain_mechanism",
  role: "lider",
  segment: "enterprise",
  targetContext: "evidencia-passaporte",
};

describe("claim-registry × evidence-registry — congelado real", () => {
  test("evidence registry real ainda válido (sanity)", () => {
    expect(validateEvidenceRegistry(EVIDENCE).errors).toEqual([]);
  });

  test("claim registry real é válido", () => {
    expect(validateClaimRegistry(EVIDENCE, CLAIMS).errors).toEqual([]);
  });

  test("claim registry v1.0.0 está congelado — e o validador recusa registro descongelado", () => {
    expect(CLAIMS.frozen).toBe(true);
    const thawed: ClaimRegistry = { ...CLAIMS, frozen: false };
    const result = validateClaimRegistry(EVIDENCE, thawed);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("não está congelado");
  });

  test("congelamento registrado na proveniência com data e regra de descongelamento", () => {
    expect(claimRegistryJson.provenance.frozen_on).toContain("2026-07-18");
    expect(claimRegistryJson.provenance.frozen_on).toContain("descongelamento formal");
  });

  // v1.1.0 — expansão mecânica para o corpus: todo estudo do Evidence Registry
  // tem EXATAMENTE UM claim de passaporte (explain_mechanism × evidencia-passaporte),
  // com texto VERBATIM dos campos legacy do registro congelado. Se um estudo novo
  // entrar no Evidence Registry sem claim (ou um claim divergir do legacy), quebra aqui.
  test("v1.1.0: cobertura 1:1 do corpus no passaporte, verbatim do legacy, todos passando no gate", () => {
    const passportClaims = CLAIMS.claims.filter(
      (c) => c.intended_use === "explain_mechanism" && c.target_context === "evidencia-passaporte",
    );
    const coveredCanonical = new Map<string, number>();
    for (const claim of passportClaims) {
      const study = resolveCanonicalStudy(EVIDENCE, claim.study_id)!;
      coveredCanonical.set(study.study_id, (coveredCanonical.get(study.study_id) ?? 0) + 1);
      expect(trustGate(study, claim).trusted).toBe(true);
      // Verbatim SÓ nos claims da derivação mecânica (-PASSPORT-001): o claim nunca
      // diz mais (nem diferente) do que o registro congelado. Os claims do corte
      // Voz Segura (VOICE-*) foram registrados deliberadamente e podem carregar
      // caveat adicional (mais fraco é permitido; mais forte, nunca).
      if (claim.claim_id.endsWith("-PASSPORT-001")) {
        expect(claim.safe_claim).toBe(study.safe_claim);
        expect(claim.prohibited_claims).toEqual(study.prohibited_claims);
        expect(claim.claim_alignment).toBe(study.claim_alignment);
        expect(claim.caveat).toBe(study.caveat);
      }
    }
    expect(coveredCanonical.size).toBe(EVIDENCE.studies.length); // 46 estudos, todos cobertos
    expect([...coveredCanonical.values()].every((n) => n === 1)).toBe(true); // exatamente um cada
    expect(CLAIMS.claims).toHaveLength(50); // 6 Voz Segura + 44 passaporte
    expect(CLAIMS.version).toBe("1.1.0");
  });

  test("EDMONDSON-1999 resolve para o nó canônico TRU-006 sem tocar o JSON congelado", () => {
    const study = resolveCanonicalStudy(EVIDENCE, "EDMONDSON-1999");
    expect(study?.study_id).toBe("TRU-006");
    expect(study?.aliases).toEqual(["LDR-013", "VOI-005"]);
  });

  test("todo claim_id do registro real é único e referencia estudo existente", () => {
    const ids = new Set<string>();
    for (const claim of CLAIMS.claims) {
      expect(ids.has(claim.claim_id)).toBe(false);
      ids.add(claim.claim_id);
      expect(resolveCanonicalStudy(EVIDENCE, claim.study_id)).not.toBeNull();
    }
  });
});

describe("validateClaimRegistry — bloqueios", () => {
  test("estudo canônico inexistente bloqueia", () => {
    const bad: ClaimRegistry = { ...CLAIMS, claims: [makeClaim({ study_id: "NAO-EXISTE-0000" })] };
    const result = validateClaimRegistry(EVIDENCE, bad);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("não existe no registro");
  });

  test("C3 sem caveat bloqueia", () => {
    const bad: ClaimRegistry = {
      ...CLAIMS,
      claims: [makeClaim({ claim_alignment: "C3", caveat: undefined })],
    };
    expect(validateClaimRegistry(EVIDENCE, bad).valid).toBe(false);
  });

  test("C4+ (fora do enum) bloqueia", () => {
    const bad: ClaimRegistry = {
      ...CLAIMS,
      claims: [makeClaim({ claim_alignment: "C4" as never })],
    };
    expect(validateClaimRegistry(EVIDENCE, bad).valid).toBe(false);
  });

  test("claim_id duplicado bloqueia", () => {
    const bad: ClaimRegistry = { ...CLAIMS, claims: [makeClaim(), makeClaim()] };
    expect(validateClaimRegistry(EVIDENCE, bad).valid).toBe(false);
  });
});

describe("trustGate(study, claim, requestContext) — V0/B0 e compatibilidade", () => {
  const study = resolveCanonicalStudy(EVIDENCE, "EDMONDSON-1999")!;

  test("contexto totalmente compatível → confiável", () => {
    const gate = trustGate(study, makeClaim(), MATCHING_CONTEXT);
    expect(gate.trusted).toBe(true);
    expect(gate.reasons).toEqual([]);
  });

  test("V0/B0: estudo com verification_status != B2 bloqueia mesmo com claim ok", () => {
    const v0Study = { ...study, verification_status: "B0" as never };
    const gate = trustGate(v0Study, makeClaim(), MATCHING_CONTEXT);
    expect(gate.trusted).toBe(false);
    expect(gate.reasons.join(" ")).toContain("verificação independente ausente");
  });

  test("C3 sem caveat no claim bloqueia", () => {
    const gate = trustGate(study, makeClaim({ claim_alignment: "C3", caveat: undefined }), MATCHING_CONTEXT);
    expect(gate.trusted).toBe(false);
  });

  test("C3 COM caveat passa (com ressalva obrigatória no resultado)", () => {
    const gate = trustGate(
      study,
      makeClaim({ claim_alignment: "C3", caveat: "Ressalva registrada obrigatória." }),
      MATCHING_CONTEXT,
    );
    expect(gate.trusted).toBe(true);
    expect(gate.requiredCaveat).toBe("Ressalva registrada obrigatória.");
  });

  test("papel incompatível bloqueia isoladamente", () => {
    const gate = trustGate(study, makeClaim({ role: ["rh"] }), MATCHING_CONTEXT);
    expect(gate.trusted).toBe(false);
    expect(gate.reasons.join(" ")).toContain("papel incompatível");
  });

  test("segmento incompatível bloqueia isoladamente", () => {
    const gate = trustGate(study, makeClaim({ segment: ["school"] }), MATCHING_CONTEXT);
    expect(gate.trusted).toBe(false);
    expect(gate.reasons.join(" ")).toContain("segmento incompatível");
  });

  test("uso pretendido incompatível bloqueia isoladamente", () => {
    const gate = trustGate(study, makeClaim({ intended_use: "organize_evidence" }), MATCHING_CONTEXT);
    expect(gate.trusted).toBe(false);
    expect(gate.reasons.join(" ")).toContain("uso pretendido incompatível");
  });

  test("contexto-alvo incompatível bloqueia isoladamente", () => {
    const gate = trustGate(study, makeClaim({ target_context: "organizar-esg" }), MATCHING_CONTEXT);
    expect(gate.trusted).toBe(false);
    expect(gate.reasons.join(" ")).toContain("contexto-alvo incompatível");
  });

  test("sem requestContext: valida só estudo+claim, não compatibilidade", () => {
    const gate = trustGate(study, makeClaim({ role: ["rh"] }));
    expect(gate.trusted).toBe(true);
  });

  test("caminho legacy trustGate(study) inalterado", () => {
    const gate = trustGate(study);
    expect(gate.trusted).toBe(true);
    expect(gate.requiredCaveat).toBeNull();
  });
});
