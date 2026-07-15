// Resolução do CTA Registry + montagem do ResolvedFlorenciaContext.
//
// Engine puro: NÃO importa src/domain/florencia/cta-registry.json (Engine ≠
// Domínio). Quem lê o registry e monta `CtaResolution` é a camada de
// aplicação (src/features/florencia) — este módulo só sabe compor o que
// recebe por parâmetro, e recusa por construção qualquer entity_ref fora da
// allowlist da própria CTA resolvida.

import { resolveMode, type MeteMode } from "./mode-router";
import { resolveProfile, type FlorenciaProfile } from "./profile-router";
import type { NormalizedContextEnvelope, PrivacyScope, ProductStatus } from "./context-envelope";

/** O que o CTA Registry resolve para um cta_id — montado pelo caller a partir do JSON. */
export interface CtaResolution {
  ctaId: string;
  intent: string;
  label: string;
  icon: string;
  suggestedQuestions: string[];
  requestedClaimIds: string[];
  allowedEntityRefPrefixes: string[];
  candidateSkillIds: string[];
}

export interface ResolvedFlorenciaContext {
  ctaId: string;
  segment: string;
  role: string;
  route: string;
  section: string;
  tags: string[];
  /** Só os refs que passaram na allowlist da CTA — refs fora são descartados,
   * não silenciosamente aceitos (ver `rejectedEntityRefs`). */
  entityRefs: string[];
  rejectedEntityRefs: string[];
  privacyScope: PrivacyScope;
  productStatus: ProductStatus;
  intent: string;
  label: string;
  icon: string;
  suggestedQuestions: string[];
  requestedClaimIds: string[];
  candidateSkillIds: string[];
  /** Sempre derivado — nunca aceito como entrada (mesma regra do Context Envelope antigo). */
  mode: MeteMode | null;
  profile: FlorenciaProfile | null;
}

export interface CtaResolutionOutcome {
  ok: boolean;
  context: ResolvedFlorenciaContext | null;
  error: string | null;
}

/** Monta o ResolvedFlorenciaContext. Recusa (ok:false) se o cta_id do envelope
 * não bater com a resolução, ou se NENHUM entity_ref sobreviver à allowlist
 * quando o envelope declarou algum (silêncio total é suspeito, não é vazio legítimo). */
export function resolveFlorenciaContext(
  normalized: NormalizedContextEnvelope,
  cta: CtaResolution,
): CtaResolutionOutcome {
  if (normalized.ctaId !== cta.ctaId) {
    return {
      ok: false,
      context: null,
      error: `cta_id do envelope ("${normalized.ctaId}") não bate com a CTA resolvida ("${cta.ctaId}")`,
    };
  }

  const entityRefs: string[] = [];
  const rejectedEntityRefs: string[] = [];
  for (const ref of normalized.entityRefs) {
    const prefix = ref.split(":")[0];
    if (cta.allowedEntityRefPrefixes.includes(prefix)) entityRefs.push(ref);
    else rejectedEntityRefs.push(ref);
  }
  if (normalized.entityRefs.length > 0 && entityRefs.length === 0) {
    return {
      ok: false,
      context: null,
      error: `nenhum entity_ref passou na allowlist da CTA "${cta.ctaId}" (prefixos permitidos: ${cta.allowedEntityRefPrefixes.join(", ")})`,
    };
  }

  const context: ResolvedFlorenciaContext = {
    ctaId: normalized.ctaId,
    segment: normalized.segment,
    role: normalized.role,
    route: normalized.route,
    section: normalized.section,
    tags: normalized.tags,
    entityRefs,
    rejectedEntityRefs,
    privacyScope: normalized.privacyScope,
    productStatus: normalized.productStatus,
    intent: cta.intent,
    label: cta.label,
    icon: cta.icon,
    suggestedQuestions: cta.suggestedQuestions,
    requestedClaimIds: cta.requestedClaimIds,
    candidateSkillIds: cta.candidateSkillIds,
    mode: resolveMode(cta.intent),
    profile: resolveProfile(normalized.segment, normalized.role),
  };
  return { ok: true, context, error: null };
}
