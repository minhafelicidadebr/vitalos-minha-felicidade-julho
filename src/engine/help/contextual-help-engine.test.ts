import { describe, expect, test } from "bun:test";
import {
  createHelpEvidenceResolver,
  helpRoleFromPersona,
  resolveHelp,
  validateHelpEntry,
  type ContextualHelpEntry,
} from "./contextual-help-engine";
import type { ClaimRegistry, EvidenceRegistry } from "@/engine/evidence/passport-engine";

const ENTRY: ContextualHelpEntry = {
  id: "help.test",
  version: "0.0.1",
  route: "/teste",
  anchor: "titulo",
  question: "Como funciona o teste?",
  summary: "Resumo.",
  roles: {
    geral: { example: "Exemplo geral.", nextStep: "Passo geral." },
    lideranca: { example: "Exemplo da liderança.", nextStep: "Passo da liderança." },
  },
  states: { one: { label: "Um ciclo", meaning: "Falta base comparável." } },
  limits: ["Não avalia pessoas."],
  sources: [{ nature: "produto", title: "Regra", supports: "Regra do produto." }],
  evidence: { studyId: "TRU-006", intendedUse: "explain_mechanism", targetContext: "ctx-ajuda", segment: "enterprise" },
  review: { status: "proposta_editorial", reviewer: null, date: "2026-11-21" },
};

const STUDY = {
  study_id: "TRU-006",
  aliases: ["VOI-005"],
  canonical_citation: "Edmondson (1999).",
  doi: "10.2307/2666999",
  verification_status: "B2",
  operational_status: "V1",
  evidence_grade: "E3",
  claim_alignment: "C1",
  transposability: "T3",
  legal_status: "L1",
  safe_claim: "Claim do estudo.",
  prohibited_claims: [],
  last_verified: "2026-07-14",
};

function registries(targetContext: string) {
  const evidence = { studies: [STUDY] } as unknown as EvidenceRegistry;
  const claims = {
    claims: [
      {
        claim_id: "CLAIM-T",
        study_id: "TRU-006",
        intended_use: "explain_mechanism",
        role: ["lider"],
        segment: ["enterprise"],
        target_context: targetContext,
        claim_alignment: "C1",
        safe_claim: "Claim aprovado para o contexto.",
        prohibited_claims: [],
      },
    ],
  } as unknown as ClaimRegistry;
  return { evidence, claims };
}

describe("contextual help engine", () => {
  test("persona demonstrativa vira papel de leitura; desconhecida cai em colaborador", () => {
    expect(helpRoleFromPersona("LIDER_EQUIPE")).toBe("lideranca");
    expect(helpRoleFromPersona("CHRO")).toBe("rh");
    expect(helpRoleFromPersona("SST_PROFISSIONAL")).toBe("sst");
    expect(helpRoleFromPersona("PAPEL_NOVO")).toBe("colaborador");
  });

  test("papel sem variação própria recebe a variação geral e é marcado assim", () => {
    const r = resolveHelp(ENTRY, "rh");
    expect(r.variant.example).toBe("Exemplo geral.");
    expect(r.roleSpecific).toBe(false);
    expect(resolveHelp(ENTRY, "lideranca").roleSpecific).toBe(true);
  });

  test("estado declarado é resolvido; estado desconhecido não inventa leitura", () => {
    expect(resolveHelp(ENTRY, "rh", { stateKey: "one" }).state?.label).toBe("Um ciclo");
    expect(resolveHelp(ENTRY, "rh", { stateKey: "dois" }).state).toBeNull();
  });

  test("estudo só aparece com claim do contexto exato e papel compatível", () => {
    const ok = registries("ctx-ajuda");
    const resolver = createHelpEvidenceResolver(ok.evidence, ok.claims);
    const lider = resolveHelp(ENTRY, "lideranca", { resolveEvidence: resolver });
    expect(lider.evidence?.claimId).toBe("CLAIM-T");
    expect(lider.evidence?.href).toBe("https://doi.org/10.2307/2666999");
    // mesmo claim, papel fora da lista → sem estudo
    expect(resolveHelp(ENTRY, "colaborador", { resolveEvidence: resolver }).evidence).toBeNull();
    // SST não tem papel no Claim Registry → sem estudo
    expect(resolveHelp(ENTRY, "sst", { resolveEvidence: resolver }).evidence).toBeNull();
  });

  test("claim de outra superfície não é reaproveitado (fail-closed)", () => {
    const other = registries("evidencia-passaporte");
    const resolver = createHelpEvidenceResolver(other.evidence, other.claims);
    expect(resolveHelp(ENTRY, "lideranca", { resolveEvidence: resolver }).evidence).toBeNull();
  });

  test("validação recusa estudo fixo, termo de promessa e falta de fonte de produto", () => {
    expect(validateHelpEntry(ENTRY)).toEqual([]);
    const bad: ContextualHelpEntry = {
      ...ENTRY,
      summary: "Esta prática garante resultado.",
      sources: [{ nature: "estudo", title: "X", supports: "Y" }],
    };
    const problems = validateHelpEntry(bad);
    expect(problems.some((p) => p.includes("garante"))).toBe(true);
    expect(problems.some((p) => p.includes("resolveEvidence"))).toBe(true);
    expect(problems.some((p) => p.includes("Como funciona no VitalOS"))).toBe(true);
  });
});
