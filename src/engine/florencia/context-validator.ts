// Validação em duas camadas, espelhando as duas fronteiras reais do fluxo:
//
// 1. validateRawContextEnvelope — forma estrutural, contra o MESMO contrato
//    de docs/ai/florencia-skills/schemas/context-envelope.schema.json (via a
//    cópia sincronizada em src/domain/florencia/contracts/). additionalProperties
//    fechado; role NÃO tem enum aqui (o schema oficial só exige string) — a
//    validade semântica de role é responsabilidade da Camada 2, via
//    resolveProfile retornando null.
//
// 2. validateResolvedContext — coerência pós-resolução: re-deriva profile/mode
//    e recusa qualquer divergência (defesa em profundidade contra adulteração
//    depois do builder), confere requestedClaimIds bem formados e que
//    suggestedQuestions não está vazio.
//
// Engine puro: sem import de src/domain.

import { resolveMode } from "./mode-router";
import { resolveProfile } from "./profile-router";
import type { RawContextEnvelope } from "./context-envelope";
import type { ResolvedFlorenciaContext } from "./cta-resolution";

export interface EnvelopeValidation {
  valid: boolean;
  errors: string[];
}

const ALLOWED_SEGMENTS = ["enterprise", "school", "government", "condominium", "health"];
const ALLOWED_PRIVACY_SCOPES = ["self_private", "aggregate_only", "tenant_authorized", "public_content"];
const ALLOWED_PRODUCT_STATUSES = ["REAL", "PARCIAL", "DEMO", "ROADMAP"];
const CTA_ID_PATTERN = /^CTA-[A-Z0-9-]+$/;
const ROUTE_PATTERN = /^\//;
const SECTION_PATTERN = /^[a-z0-9-]+$/;
const TAG_PATTERN = /^[a-z0-9-]+$/;
const ENTITY_REF_PATTERN = /^(mechanism|study|claim|cycle|driver|project):[A-Za-z0-9._-]+$/;
const CLAIM_ID_PATTERN = /^CLAIM-[A-Z0-9-]+$/;

const RAW_KNOWN_KEYS = new Set<keyof RawContextEnvelope>([
  "cta_id",
  "segment",
  "role",
  "route",
  "section",
  "tags",
  "entity_refs",
  "privacy_scope",
  "product_status",
]);

/** Camada 1 — forma estrutural, mesmo contrato do schema oficial. */
export function validateRawContextEnvelope(raw: RawContextEnvelope): EnvelopeValidation {
  const errors: string[] = [];

  const extra = Object.keys(raw).filter((k) => !RAW_KNOWN_KEYS.has(k as keyof RawContextEnvelope));
  errors.push(...extra.map((k) => `campo não permitido no envelope: "${k}"`));

  if (!CTA_ID_PATTERN.test(raw.cta_id)) errors.push(`cta_id fora do padrão: "${raw.cta_id}"`);
  if (!ALLOWED_SEGMENTS.includes(raw.segment)) errors.push(`segment inválido: "${raw.segment}"`);
  if (!raw.role || typeof raw.role !== "string") errors.push("role ausente");
  if (!ROUTE_PATTERN.test(raw.route)) errors.push(`route fora do padrão: "${raw.route}"`);
  if (!SECTION_PATTERN.test(raw.section)) errors.push(`section fora do padrão kebab-case: "${raw.section}"`);
  if (!ALLOWED_PRIVACY_SCOPES.includes(raw.privacy_scope))
    errors.push(`privacy_scope inválido: "${raw.privacy_scope}"`);
  if (!ALLOWED_PRODUCT_STATUSES.includes(raw.product_status))
    errors.push(`product_status inválido: "${raw.product_status}"`);

  const tags = raw.tags ?? [];
  if (tags.length > 12) errors.push("tags excede o máximo de 12");
  for (const tag of tags) if (!TAG_PATTERN.test(tag)) errors.push(`tag fora do padrão kebab-case: "${tag}"`);

  const entityRefs = raw.entity_refs ?? [];
  if (entityRefs.length > 12) errors.push("entity_refs excede o máximo de 12");
  for (const ref of entityRefs)
    if (!ENTITY_REF_PATTERN.test(ref)) errors.push(`entity_ref fora do padrão: "${ref}"`);

  return { valid: errors.length === 0, errors };
}

/** Camada 2 — coerência pós-resolução (profile/mode nunca divergem do que a
 * combinação segment+role / intent realmente deriva). */
export function validateResolvedContext(context: ResolvedFlorenciaContext): EnvelopeValidation {
  const errors: string[] = [];

  const expectedMode = resolveMode(context.intent);
  if (context.mode !== expectedMode)
    errors.push(`mode diverge do esperado para intent "${context.intent}": esperado "${expectedMode}", veio "${context.mode}"`);

  const expectedProfile = resolveProfile(context.segment, context.role);
  if (context.profile !== expectedProfile)
    errors.push(`profile diverge do esperado para segment/role: esperado "${expectedProfile}", veio "${context.profile}"`);

  if (context.profile === null) errors.push(`role/segment não resolve a um perfil conhecido: "${context.role}"/"${context.segment}"`);
  if (context.mode === null) errors.push(`intent desconhecida, não resolve a um modo M.E.T.E.: "${context.intent}"`);

  if (context.suggestedQuestions.length === 0)
    errors.push("suggestedQuestions vazio — perguntas sugeridas devem vir do CTA Registry");

  for (const claimId of context.requestedClaimIds)
    if (!CLAIM_ID_PATTERN.test(claimId)) errors.push(`requestedClaimId mal formado: "${claimId}"`);

  return { valid: errors.length === 0, errors };
}
