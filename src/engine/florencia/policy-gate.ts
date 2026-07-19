// Policy Gate — o único lugar que decide o que uma CTA resolvida pode
// efetivamente mostrar. Recebe o ResolvedFlorenciaContext (nunca confia em
// allowedClaimIds vindo de fora — isso só existe como SAÍDA daqui) e resolve
// cada requestedClaimId contra o trustGate (Onda 3.5) + uma restrição
// semântica de privacy_scope específica da rota chamadora.
//
// Engine puro: claims/evidenceRegistry/skillStatus entram por parâmetro —
// este módulo não importa claim-registry.json nem skill-registry.json
// (Engine ≠ Domínio).

import {
  resolveCanonicalStudy,
  trustGate,
  type ClaimRecord,
  type EvidenceRegistry,
  type RequestContext,
} from "@/engine/evidence/passport-engine";
import { isSkillAvailable, type SkillLifecycleStatus } from "./skill-status";
import type { PrivacyScope } from "./context-envelope";
import type { ResolvedFlorenciaContext } from "./cta-resolution";

export interface PolicyGateResult {
  allowed: boolean;
  allowedClaimIds: string[];
  deniedClaimIds: string[];
  allowedSkillIds: string[];
  restrictions: string[];
  requiresHumanReview: boolean;
  reason: string | null;
}

export interface PolicyGateOptions {
  /** Restrição semântica da rota chamadora — o schema aceita 4 valores,
   * mas cada rota decide quais realmente usa. Ex.: /voz-segura só aceita
   * "aggregate_only". */
  allowedPrivacyScopes: PrivacyScope[];
  /**
   * Mapa canônico de status de Skill — OBRIGATÓRIO (Truth Layer, Onda 5).
   * Omitir nunca foi um "deixa passar tudo" válido; agora é impossível por
   * construção (o tipo exige o parâmetro). Fail-closed: skill ausente do
   * mapa, com status desconhecido, ou ROADMAP nunca é permitida — só
   * REAL/PARCIAL passam, via o único predicado isSkillAvailable(). Fonte
   * real de produção: src/domain/florencia/skill-status-projection.ts
   * (espelho curado e paritário do skill-registry.json documental).
   */
  skillStatus: Readonly<Record<string, SkillLifecycleStatus>>;
}

const INTENTS_REQUIRING_HUMAN_REVIEW = new Set(["organize_evidence"]);

export function evaluatePolicyGate(
  context: ResolvedFlorenciaContext,
  claims: ClaimRecord[],
  evidenceRegistry: EvidenceRegistry,
  options: PolicyGateOptions,
): PolicyGateResult {
  const restrictions: string[] = [];

  if (!options.allowedPrivacyScopes.includes(context.privacyScope)) {
    return {
      allowed: false,
      allowedClaimIds: [],
      deniedClaimIds: [...context.requestedClaimIds],
      allowedSkillIds: [],
      restrictions: [
        `privacy_scope "${context.privacyScope}" não autorizado nesta rota (permitido: ${options.allowedPrivacyScopes.join(", ")})`,
      ],
      requiresHumanReview: false,
      reason: "privacy_scope bloqueado pela rota",
    };
  }

  const claimsById = new Map(claims.map((c) => [c.claim_id, c]));
  const allowedClaimIds: string[] = [];
  const deniedClaimIds: string[] = [];
  let anyCaveat = false;

  for (const claimId of context.requestedClaimIds) {
    const claim = claimsById.get(claimId);
    if (!claim) {
      deniedClaimIds.push(claimId);
      restrictions.push(`claim "${claimId}" não encontrado no Claim Registry`);
      continue;
    }
    const study = resolveCanonicalStudy(evidenceRegistry, claim.study_id);
    if (!study) {
      deniedClaimIds.push(claimId);
      restrictions.push(`claim "${claimId}": estudo canônico "${claim.study_id}" não existe no registro`);
      continue;
    }
    const requestContext: RequestContext = {
      intendedUse: context.intent,
      role: context.role,
      segment: context.segment,
      targetContext: context.section,
    };
    const gate = trustGate(study, claim, requestContext);
    if (gate.trusted) {
      allowedClaimIds.push(claimId);
      if (gate.requiredCaveat) {
        anyCaveat = true;
        restrictions.push(`claim "${claimId}" exige ressalva: ${gate.requiredCaveat}`);
      }
    } else {
      deniedClaimIds.push(claimId);
      restrictions.push(`claim "${claimId}" bloqueado: ${gate.reasons.join("; ")}`);
    }
  }

  const allowedSkillIds = context.candidateSkillIds.filter((id) =>
    isSkillAvailable(options.skillStatus[id]),
  );

  const requiresHumanReview = anyCaveat || INTENTS_REQUIRING_HUMAN_REVIEW.has(context.intent);

  const allowed =
    context.requestedClaimIds.length === 0 || allowedClaimIds.length > 0;

  return {
    allowed,
    allowedClaimIds,
    deniedClaimIds,
    allowedSkillIds,
    restrictions,
    requiresHumanReview,
    reason: allowed ? null : "nenhum claim solicitado passou no trust gate",
  };
}
