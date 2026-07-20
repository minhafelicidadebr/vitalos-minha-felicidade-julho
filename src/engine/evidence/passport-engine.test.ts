import { describe, expect, test } from "bun:test";
import {
  buildPassport,
  checkActivityBudget,
  findClaimForContext,
  findClaimForStudy,
  resolveStudy,
  trustGate,
  validateEvidenceRegistry,
  validateMechanisms,
  type ClaimRegistry,
  type EvidenceRegistry,
  type EvidenceStudy,
  type MechanismRecord,
} from "./passport-engine";
// O engine é puro; o teste de consistência importa o registro REAL congelado
// (padrão journey-consistency: a fonte única é verificada por teste, não por fé).
import registryJson from "../../domain/evidence/evidence-registry.json";
import claimRegistryJson from "../../domain/evidence/claim-registry.json";
import mechanismJson from "../../domain/evidence/mechanism-registry.json";

const REGISTRY = registryJson as unknown as EvidenceRegistry;
const CLAIM_REGISTRY = claimRegistryJson as unknown as ClaimRegistry;
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

// ─── findClaimForStudy (passaporte × Claim Registry oficial) ─────────────────

describe("findClaimForStudy", () => {
  const edmondson = resolveStudy(REGISTRY, "TRU-006")!;
  const ldr007 = resolveStudy(REGISTRY, "LDR-007")!;

  test("acha o claim oficial de passaporte para TRU-006 (via nome canônico EDMONDSON-1999)", () => {
    const claim = findClaimForStudy(REGISTRY, CLAIM_REGISTRY, edmondson, "explain_mechanism");
    expect(claim?.claim_id).toBe("CLAIM-EDMONDSON1999-VOICE-001");
  });

  test("estudo resolvido por alias aponta para o mesmo claim (nó canônico decide)", () => {
    const viaAlias = resolveStudy(REGISTRY, "VOI-005")!;
    const claim = findClaimForStudy(REGISTRY, CLAIM_REGISTRY, viaAlias, "explain_mechanism");
    expect(claim?.claim_id).toBe("CLAIM-EDMONDSON1999-VOICE-001");
  });

  test("LDR-007 tem claim próprio de passaporte — e cada uso resolve para o SEU claim, nunca o de outro contexto", () => {
    expect(findClaimForStudy(REGISTRY, CLAIM_REGISTRY, ldr007, "explain_mechanism")?.claim_id).toBe(
      "CLAIM-LDR007-VOICE-003",
    );
    expect(findClaimForStudy(REGISTRY, CLAIM_REGISTRY, ldr007, "create_team_mission")?.claim_id).toBe(
      "CLAIM-LDR007-VOICE-001",
    );
  });

  test("lacuna do registro = null por USO — v1.1.0 cobre todo estudo no passaporte, mas usos específicos seguem exigindo registro deliberado", () => {
    const foraDoVozSegura = REGISTRY.studies.find(
      (s) => s.study_id !== "TRU-006" && s.study_id !== "LDR-007",
    )!;
    // Passaporte: coberto para o corpus inteiro desde v1.1.0.
    expect(
      findClaimForStudy(REGISTRY, CLAIM_REGISTRY, foraDoVozSegura, "explain_mechanism")?.claim_id,
    ).toBe(`CLAIM-${foraDoVozSegura.study_id}-PASSPORT-001`);
    // Uso específico (ex.: preparar conversa): NUNCA herdado do claim de passaporte.
    expect(
      findClaimForStudy(REGISTRY, CLAIM_REGISTRY, foraDoVozSegura, "prepare_conversation"),
    ).toBeNull();
  });

  test("claim C2 de LDR-007 não dispara ressalva no passaporte (caveat obrigatório é só C3/V2)", () => {
    const claim = findClaimForStudy(REGISTRY, CLAIM_REGISTRY, ldr007, "explain_mechanism")!;
    const p = buildPassport(ldr007, "humano", claim);
    expect(p.claim).toBe(ldr007.safe_claim); // texto idêntico ao legacy — sem mudança visível
    expect(p.caveat).toBeNull();
    expect(p.trusted).toBe(true);
  });

  test("buildPassport com o claim oficial: texto idêntico ao legacy (registro semeado dele) e claim_id na auditoria", () => {
    const claim = findClaimForStudy(REGISTRY, CLAIM_REGISTRY, edmondson, "explain_mechanism")!;
    const withClaim = buildPassport(edmondson, "auditoria", claim);
    const legacy = buildPassport(edmondson, "auditoria");
    expect(withClaim.claim).toBe(legacy.claim); // convergência sem mudança visível
    expect(withClaim.trusted).toBe(true);
    expect(withClaim.lines.find((l) => l.label === "Claim")?.value).toBe(
      "CLAIM-EDMONDSON1999-VOICE-001",
    );
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

// ─── findClaimForContext (bloqueador 2 pré-§5 — seleção com contexto completo) ─

describe("findClaimForContext", () => {
  const edmondson = resolveStudy(REGISTRY, "TRU-006")!;
  const PASSPORT_CONTEXT = {
    intendedUse: "explain_mechanism",
    role: "lider",
    segment: "enterprise",
    targetContext: "evidencia-passaporte",
  };

  test("contexto totalmente compatível seleciona o claim oficial", () => {
    const claim = findClaimForContext(REGISTRY, CLAIM_REGISTRY, edmondson, PASSPORT_CONTEXT);
    expect(claim?.claim_id).toBe("CLAIM-EDMONDSON1999-VOICE-001");
  });

  test("estudo resolvido por alias seleciona o mesmo claim (nó canônico decide)", () => {
    const viaAlias = resolveStudy(REGISTRY, "VOI-005")!;
    const claim = findClaimForContext(REGISTRY, CLAIM_REGISTRY, viaAlias, PASSPORT_CONTEXT);
    expect(claim?.claim_id).toBe("CLAIM-EDMONDSON1999-VOICE-001");
  });

  test("papel fora do claim → null já na SELEÇÃO (não só no trustGate depois)", () => {
    expect(
      findClaimForContext(REGISTRY, CLAIM_REGISTRY, edmondson, {
        ...PASSPORT_CONTEXT,
        role: "colaborador",
      }),
    ).toBeNull();
  });

  test("segmento fora do claim → null já na seleção", () => {
    expect(
      findClaimForContext(REGISTRY, CLAIM_REGISTRY, edmondson, {
        ...PASSPORT_CONTEXT,
        segment: "school",
      }),
    ).toBeNull();
  });

  test("contexto-alvo divergente → null já na seleção (nunca empresta claim de outro contexto)", () => {
    expect(
      findClaimForContext(REGISTRY, CLAIM_REGISTRY, edmondson, {
        ...PASSPORT_CONTEXT,
        targetContext: "missao-equipe",
      }),
    ).toBeNull();
  });

  test("uso pretendido divergente → null já na seleção", () => {
    expect(
      findClaimForContext(REGISTRY, CLAIM_REGISTRY, edmondson, {
        ...PASSPORT_CONTEXT,
        intendedUse: "create_team_mission",
      }),
    ).toBeNull();
  });

  test("claim dimensionalmente certo mas não confiável fica fora (trustGate embutido na seleção)", () => {
    // Registro sintético: claim C3 SEM caveat — dimensões todas compatíveis,
    // mas o trustGate recusa → a seleção devolve null (fail-closed).
    const syntheticRegistry: ClaimRegistry = {
      registry: "sintético",
      version: "0.0.1",
      frozen: true,
      claims: [
        {
          claim_id: "CLAIM-SINTETICO-C3-SEM-CAVEAT",
          study_id: "TRU-006",
          intended_use: "explain_mechanism",
          role: ["lider"],
          segment: ["enterprise"],
          target_context: "evidencia-passaporte",
          claim_alignment: "C3",
          safe_claim:
            "Claim sintético de teste com comprimento suficiente para a validação mínima do registro.",
          prohibited_claims: [],
        },
      ],
    };
    expect(
      findClaimForContext(REGISTRY, syntheticRegistry, edmondson, PASSPORT_CONTEXT),
    ).toBeNull();
  });

  test("paridade com o deprecated findClaimForStudy no caminho feliz da trilha real", () => {
    // Para as combinações reais da trilha, a seleção nova e a antiga apontam
    // para o MESMO claim — o contexto completo restringe, nunca troca.
    const porUso = findClaimForStudy(REGISTRY, CLAIM_REGISTRY, edmondson, "explain_mechanism");
    const porContexto = findClaimForContext(REGISTRY, CLAIM_REGISTRY, edmondson, PASSPORT_CONTEXT);
    expect(porContexto?.claim_id).toBe(porUso?.claim_id ?? "");
  });
});
