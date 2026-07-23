// Testes do Orientation Rationale Engine (SAFE-VOICE-BRIDGE §5, Fatia A).
//
// Duas famílias de teste: (1) fixtures sintéticas isoladas, uma por cenário
// de fail-closed do contrato; (2) um teste de integração contra os
// registries reais (EVIDENCE_REGISTRY/CLAIM_REGISTRY/MECHANISM_REGISTRY/
// resolveSkillStatusMap), provando que a única cadeia canônica hoje
// (prepare-safe-conversation-v1) resolve de ponta a ponta sem mock nenhum.

import { describe, expect, test } from "bun:test";
import {
  resolveOrientationRationale,
  type OrientationRationaleSources,
} from "./orientation-rationale-engine";
import type {
  ClaimRegistry,
  ClaimRecord,
  EvidenceRegistry,
  EvidenceStudy,
  MechanismRecord,
  RequestContext,
} from "@/engine/evidence/passport-engine";
import { EVIDENCE_REGISTRY, CLAIM_REGISTRY, MECHANISM_REGISTRY } from "@/domain/evidence/registries";
import { resolveSkillStatusMap } from "@/domain/florencia/skill-status-projection";

// ─── Fixtures sintéticas — mesma anatomia da suíte do EvidenceExplorerCard ──

function study(overrides: Partial<EvidenceStudy> & Pick<EvidenceStudy, "study_id">): EvidenceStudy {
  return {
    aliases: [],
    canonical_citation: "Autor, A. (2020). Estudo de teste.",
    doi: "10.1000/teste",
    origin_driver: "Learning",
    access_type: "full_text",
    verification_status: "B2",
    operational_status: "V1",
    evidence_grade: "E3",
    claim_alignment: "C1",
    transposability: "T2",
    legal_status: "L0",
    safe_claim: "Claim seguro com pelo menos quarenta caracteres de comprimento útil.",
    prohibited_claims: [],
    mechanisms: ["mecanismo-teste"],
    nascente_candidates: ["nascente-teste"],
    profiles: [],
    last_verified: "2026-01-01",
    ...overrides,
  };
}

function claim(overrides: Partial<ClaimRecord> & Pick<ClaimRecord, "claim_id" | "study_id">): ClaimRecord {
  return {
    intended_use: "prepare_conversation",
    role: ["lider"],
    segment: ["enterprise"],
    target_context: "preparar-conversa",
    claim_alignment: "C1",
    safe_claim: "Claim seguro sintético com pelo menos quarenta caracteres de comprimento útil.",
    prohibited_claims: [],
    ...overrides,
  };
}

function mechanism(overrides: Partial<MechanismRecord> & Pick<MechanismRecord, "mechanism_id">): MechanismRecord {
  return {
    name: "Mecanismo de teste",
    nascente: "teste",
    safe_explanation: "Explicação segura de teste.",
    study_ids: ["STUDY-TEST-001"],
    primary_study_id: "STUDY-TEST-001",
    allowed_profiles: ["lider"],
    known_limit: "Limite conhecido de teste.",
    practical_application: "Aplicação prática de teste.",
    risks: ["risco de teste"],
    ...overrides,
  };
}

function registryWith(studies: EvidenceStudy[]): EvidenceRegistry {
  return {
    registry: "teste",
    version: "1.0.0-teste",
    frozen: true,
    global_prohibited_claims: [],
    excluded: [],
    studies,
  };
}

function claimsWith(claims: ClaimRecord[]): ClaimRegistry {
  return { registry: "teste", version: "1.0.0-teste", frozen: true, claims };
}

const CONTEXT: RequestContext = {
  intendedUse: "prepare_conversation",
  role: "lider",
  segment: "enterprise",
  targetContext: "preparar-conversa",
};

const VALID_TEMPLATE_ID = "prepare-safe-conversation-v1"; // anchors reais: MECH-VOICE-001 / CLAIM-EDMONDSON1999-VOICE-002

function validSources(): OrientationRationaleSources {
  return {
    evidenceRegistry: registryWith([study({ study_id: "STUDY-TEST-001" })]),
    claimRegistry: claimsWith([
      claim({ claim_id: "CLAIM-EDMONDSON1999-VOICE-002", study_id: "STUDY-TEST-001" }),
    ]),
    mechanisms: [mechanism({ mechanism_id: "MECH-VOICE-001" })],
    skillStatusMap: { "SKILL-CONVERSATION-FACILITATOR": "PARCIAL" },
  };
}

const VALID_INPUT = {
  templateId: VALID_TEMPLATE_ID,
  requestContext: CONTEXT,
  candidateSkillIds: ["SKILL-CONVERSATION-FACILITATOR", "SKILL-EVIDENCE-CLAIM-GUARDIAN"],
};

describe("resolveOrientationRationale — caminho válido (fixtures sintéticas)", () => {
  test("resolve a cadeia completa quando todos os elos estão íntegros", () => {
    const result = resolveOrientationRationale(VALID_INPUT, validSources());
    expect(result).not.toBeNull();
    expect(result!.templateId).toBe(VALID_TEMPLATE_ID);
    expect(result!.mechanism.mechanismId).toBe("MECH-VOICE-001");
    expect(result!.mechanism.nascente).toBe("teste");
    expect(result!.claim.claimId).toBe("CLAIM-EDMONDSON1999-VOICE-002");
    expect(result!.claim.studyId).toBe("STUDY-TEST-001");
    expect(result!.skill.skillId).toBe("SKILL-CONVERSATION-FACILITATOR");
    expect(result!.skill.status).toBe("PARCIAL");
  });
});

describe("resolveOrientationRationale — fail-closed", () => {
  test("template inexistente → null (cobre também 'vínculo ausente': por construção do checkpoint A, nenhum template ativo existe sem mechanismId/requiredClaimId)", () => {
    const result = resolveOrientationRationale(
      { ...VALID_INPUT, templateId: "template-que-nao-existe" },
      validSources(),
    );
    expect(result).toBeNull();
  });

  test("mecanismo órfão — mechanismId do template não existe no registry dado", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, { ...sources, mechanisms: [] });
    expect(result).toBeNull();
  });

  test("nenhum study_id do mecanismo resolve (estudo-âncora ausente)", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, {
      ...sources,
      mechanisms: [
        mechanism({
          mechanism_id: "MECH-VOICE-001",
          study_ids: ["STUDY-INEXISTENTE"],
          primary_study_id: "STUDY-INEXISTENTE",
        }),
      ],
    });
    expect(result).toBeNull();
  });

  test("mecanismo com múltiplos study_ids: claim exigido vive num estudo complementar, não no primário — ainda resolve", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, {
      ...sources,
      evidenceRegistry: registryWith([
        study({ study_id: "STUDY-PRIMARIO" }),
        study({ study_id: "STUDY-TEST-001" }), // é aqui que o claim exigido vive
      ]),
      mechanisms: [
        mechanism({
          mechanism_id: "MECH-VOICE-001",
          study_ids: ["STUDY-PRIMARIO", "STUDY-TEST-001"],
          primary_study_id: "STUDY-PRIMARIO",
        }),
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.claim.studyId).toBe("STUDY-TEST-001");
  });

  test("claim órfão — nenhum claim no registry para o contexto/estudo dados", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, { ...sources, claimRegistry: claimsWith([]) });
    expect(result).toBeNull();
  });

  test("contexto incompatível — claim existe mas papel não bate com requestContext", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, {
      ...sources,
      claimRegistry: claimsWith([
        claim({ claim_id: "CLAIM-EDMONDSON1999-VOICE-002", study_id: "STUDY-TEST-001", role: ["chro"] }),
      ]),
    });
    expect(result).toBeNull();
  });

  test("contexto incompatível — target_context não bate", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, {
      ...sources,
      claimRegistry: claimsWith([
        claim({
          claim_id: "CLAIM-EDMONDSON1999-VOICE-002",
          study_id: "STUDY-TEST-001",
          target_context: "outro-contexto",
        }),
      ]),
    });
    expect(result).toBeNull();
  });

  test("claim C3 sem caveat — não confiável (trustGate embutido em findClaimForContext)", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, {
      ...sources,
      claimRegistry: claimsWith([
        claim({
          claim_id: "CLAIM-EDMONDSON1999-VOICE-002",
          study_id: "STUDY-TEST-001",
          claim_alignment: "C3",
        }),
      ]),
    });
    expect(result).toBeNull();
  });

  test("ambiguidade — um claim compatível existe, mas não é o claim que o template exige", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, {
      ...sources,
      claimRegistry: claimsWith([
        // Compatível com o MESMO contexto/estudo, mas com outro claim_id —
        // o template exige CLAIM-EDMONDSON1999-VOICE-002 especificamente.
        claim({ claim_id: "CLAIM-OUTRO-CONTEXTO-001", study_id: "STUDY-TEST-001" }),
      ]),
    });
    expect(result).toBeNull();
  });

  test("Skill ausente (candidateSkillIds vazio)", () => {
    const sources = validSources();
    const result = resolveOrientationRationale({ ...VALID_INPUT, candidateSkillIds: [] }, sources);
    expect(result).toBeNull();
  });

  test("Skill desconhecida (não está no skillStatusMap)", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, { ...sources, skillStatusMap: {} });
    expect(result).toBeNull();
  });

  test("Skill em ROADMAP — nunca autoriza (mesmo predicado isSkillAvailable de toda a Truth Layer)", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, {
      ...sources,
      skillStatusMap: { "SKILL-CONVERSATION-FACILITATOR": "ROADMAP" },
    });
    expect(result).toBeNull();
  });

  // Fatia B, checkpoint: candidateSkillIds[0] é a Skill principal canônica —
  // índices posteriores NUNCA são fallback automático. Sem este teste, uma
  // futura refatoração poderia "otimizar" a checagem para tentar o próximo
  // índice disponível, degradando silenciosamente qual Skill governa a
  // orientação exibida.
  test("candidateSkillIds[1+] NUNCA vira fallback — Skill principal indisponível bloqueia mesmo com uma auxiliar disponível", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(
      { ...VALID_INPUT, candidateSkillIds: ["SKILL-PRINCIPAL-INDISPONIVEL", "SKILL-CONVERSATION-FACILITATOR"] },
      {
        ...sources,
        skillStatusMap: {
          "SKILL-PRINCIPAL-INDISPONIVEL": "ROADMAP",
          "SKILL-CONVERSATION-FACILITATOR": "PARCIAL", // disponível, mas no índice 1 — não conta
        },
      },
    );
    expect(result).toBeNull();
  });

  test("IDs duplicados — mechanism_id repetido no registry torna a entrada não confiável", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, {
      ...sources,
      mechanisms: [
        mechanism({ mechanism_id: "MECH-VOICE-001" }),
        mechanism({ mechanism_id: "MECH-VOICE-001", name: "Duplicata" }),
      ],
    });
    expect(result).toBeNull();
  });

  test("nunca devolve objeto parcial — todo cenário acima devolve exatamente null, nunca um objeto com campos ausentes", () => {
    const sources = validSources();
    const result = resolveOrientationRationale(VALID_INPUT, { ...sources, mechanisms: [] });
    expect(result).toBeNull();
    expect(result).not.toEqual({});
  });
});

describe("resolveOrientationRationale — invariantes de engenharia", () => {
  test("imutabilidade — o resultado e seus objetos aninhados são frozen", () => {
    const result = resolveOrientationRationale(VALID_INPUT, validSources());
    expect(result).not.toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result!.mechanism)).toBe(true);
    expect(Object.isFrozen(result!.claim)).toBe(true);
    expect(Object.isFrozen(result!.skill)).toBe(true);
  });

  test("determinismo — mesma entrada produz saída estruturalmente idêntica em chamadas repetidas", () => {
    const sources = validSources();
    const first = resolveOrientationRationale(VALID_INPUT, sources);
    const second = resolveOrientationRationale(VALID_INPUT, sources);
    expect(first).toEqual(second);
  });

  test("ausência de efeitos colaterais — sources não é mutado pela resolução", () => {
    const sources = validSources();
    const snapshot = JSON.parse(JSON.stringify(sources));
    resolveOrientationRationale(VALID_INPUT, sources);
    expect(JSON.parse(JSON.stringify(sources))).toEqual(snapshot);
  });
});

describe("resolveOrientationRationale — paridade com os registries reais", () => {
  test("a única cadeia canônica hoje (prepare-safe-conversation-v1) resolve de ponta a ponta contra EVIDENCE_REGISTRY/CLAIM_REGISTRY/MECHANISM_REGISTRY/skill-status-projection reais", () => {
    const result = resolveOrientationRationale(
      {
        templateId: "prepare-safe-conversation-v1",
        requestContext: {
          intendedUse: "prepare_conversation",
          role: "lider",
          segment: "enterprise",
          targetContext: "preparar-conversa",
        },
        candidateSkillIds: ["SKILL-CONVERSATION-FACILITATOR", "SKILL-EVIDENCE-CLAIM-GUARDIAN", "SKILL-PRIVACY-SAFETY-GUARDIAN"],
      },
      {
        evidenceRegistry: EVIDENCE_REGISTRY,
        claimRegistry: CLAIM_REGISTRY,
        mechanisms: MECHANISM_REGISTRY,
        skillStatusMap: resolveSkillStatusMap(),
      },
    );
    expect(result).not.toBeNull();
    expect(result!.mechanism.mechanismId).toBe("MECH-VOICE-001");
    expect(result!.mechanism.name).toBe("Redução do medo interpessoal");
    expect(result!.claim.claimId).toBe("CLAIM-EDMONDSON1999-VOICE-002");
    expect(result!.skill.skillId).toBe("SKILL-CONVERSATION-FACILITATOR");
    expect(result!.skill.status).toBe("PARCIAL");
  });

  test("as outras 3 templates reais também resolvem (mesmo mecanismo, claims distintos)", () => {
    const cases: Array<{ templateId: string; intendedUse: string; targetContext: string; claimId: string }> = [
      {
        templateId: "suggest-observation-v1",
        intendedUse: "suggest_observation",
        targetContext: "observar-evoluir",
        claimId: "CLAIM-LDR007-VOICE-002",
      },
      {
        templateId: "create-team-mission-v1",
        intendedUse: "create_team_mission",
        targetContext: "missao-equipe",
        claimId: "CLAIM-LDR007-VOICE-001",
      },
      {
        templateId: "organize-evidence-v1",
        intendedUse: "organize_evidence",
        targetContext: "organizar-esg",
        claimId: "CLAIM-EDMONDSON1999-VOICE-003",
      },
    ];
    for (const c of cases) {
      const result = resolveOrientationRationale(
        {
          templateId: c.templateId,
          requestContext: {
            intendedUse: c.intendedUse,
            role: "lider",
            segment: "enterprise",
            targetContext: c.targetContext,
          },
          candidateSkillIds: ["SKILL-CONVERSATION-FACILITATOR", "SKILL-EVIDENCE-CLAIM-GUARDIAN", "SKILL-PRIVACY-SAFETY-GUARDIAN"],
        },
        {
          evidenceRegistry: EVIDENCE_REGISTRY,
          claimRegistry: CLAIM_REGISTRY,
          mechanisms: MECHANISM_REGISTRY,
          skillStatusMap: resolveSkillStatusMap(),
        },
      );
      expect(result, `templateId ${c.templateId} deveria resolver`).not.toBeNull();
      expect(result!.mechanism.mechanismId).toBe("MECH-VOICE-001");
      expect(result!.claim.claimId).toBe(c.claimId);
    }
  });
});
