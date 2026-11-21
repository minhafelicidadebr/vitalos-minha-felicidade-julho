// D10 é uma revisão humana por artefato/versão; existência de estudo não autoriza novo uso.
import { CLAIM_REGISTRY, EVIDENCE_REGISTRY } from "@/domain/evidence/registries";
import {
  resolveCanonicalStudy,
  trustGate,
  type ClaimRegistry,
  type EvidenceRegistry,
  type RequestContext,
} from "@/engine/evidence/passport-engine";

export interface Q2LearningCuration {
  decision: "D10";
  reviewRef: string;
  evidenceRegistryVersion: string;
  claimRegistryVersion: string;
  context: RequestContext;
  approval: null | {
    version: string;
    responsible: string;
    reviewer: string;
    approvedOn: string;
    decisionRef: string;
    scope: "local_descartavel";
  };
}

export interface LearningRegistries {
  evidence: EvidenceRegistry;
  claims: ClaimRegistry;
}

export const Q2_LEARNING_REGISTRIES: LearningRegistries = {
  evidence: EVIDENCE_REGISTRY,
  claims: CLAIM_REGISTRY,
};

export function validateQ2LearningCuration(
  artifact: {
    status: "PROPOSTO" | "APROVADO";
    version: string;
    evidenceCodes: readonly string[];
    safeClaimIds: readonly string[];
    curation?: Q2LearningCuration | null;
  },
  registries: LearningRegistries = Q2_LEARNING_REGISTRIES,
): Q2LearningCuration {
  function fail(reason: string): never {
    throw new Error(`[q2-curation] ${reason}`);
  }
  const nonEmpty = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  const c = artifact.curation;
  if (!c || c.decision !== "D10" || !nonEmpty(c.reviewRef)) fail("revisão D10 ausente");
  if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(artifact.version)) fail("versão inválida");
  if (
    !registries.evidence.frozen ||
    !registries.claims.frozen ||
    c.evidenceRegistryVersion !== registries.evidence.version ||
    c.claimRegistryVersion !== registries.claims.version
  )
    fail("versão dos registros incompatível");
  if (
    c.context?.intendedUse !== "explain_mechanism" ||
    c.context.role !== "rh" ||
    c.context.segment !== "enterprise" ||
    c.context.targetContext !== "q2-educacao"
  )
    fail("escopo educativo Q2 incompatível");
  if (!artifact.evidenceCodes.length || !artifact.safeClaimIds.length)
    fail("evidência e safe_claim obrigatórios");
  const studies = artifact.evidenceCodes.map((code) => {
    const study = resolveCanonicalStudy(registries.evidence, code);
    if (!study) fail(`código ${code} não existe no registro de evidências`);
    return study;
  });
  if (new Set(studies.map((s) => s.study_id)).size !== studies.length || studies.length > 3)
    fail("orçamento de evidência inválido");
  if (new Set(artifact.safeClaimIds).size !== artifact.safeClaimIds.length)
    fail("safe_claim duplicado");
  for (const id of artifact.safeClaimIds) {
    const claim = registries.claims.claims.find((entry) => entry.claim_id === id);
    if (!claim) fail(`safe_claim ${id} inexistente`);
    const study = resolveCanonicalStudy(registries.evidence, claim.study_id);
    if (!study || !studies.some((s) => s.study_id === study.study_id))
      fail("claim não corresponde à evidência");
    if (
      artifact.status === "APROVADO" &&
      (!["C1", "C2", "C3"].includes(claim.claim_alignment) ||
        !trustGate(study, claim, c.context).trusted)
    )
      fail("safe_claim não autorizado para este contexto");
  }
  if (artifact.status === "APROVADO") {
    const a = c.approval;
    if (
      !a ||
      a.version !== artifact.version ||
      !nonEmpty(a.responsible) ||
      !nonEmpty(a.reviewer) ||
      !nonEmpty(a.decisionRef)
    )
      fail("aprovação explícita da versão ausente");
    if (a.responsible.trim().toLowerCase() === a.reviewer.trim().toLowerCase())
      fail("revisor deve ser distinto do responsável");
    if (a.scope !== "local_descartavel") fail("escopo de disponibilidade não autorizado");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(a.approvedOn) ||
      !Number.isFinite(Date.parse(`${a.approvedOn}T00:00:00Z`)) ||
      new Date(`${a.approvedOn}T00:00:00Z`).toISOString().slice(0, 10) !== a.approvedOn
    )
      fail("data de aprovação inválida");
  } else if (c.approval !== null) fail("proposta não carrega aprovação");
  return Object.freeze({
    ...c,
    context: Object.freeze({ ...c.context }),
    approval: c.approval ? Object.freeze({ ...c.approval }) : null,
  });
}
