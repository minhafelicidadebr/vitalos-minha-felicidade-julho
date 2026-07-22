// Evidence Passport Engine — a regra de ouro em código.
//
// "Nenhuma superfície exibe mais certeza do que o registro canônico autoriza."
//
// Este engine é a ÚNICA fonte de texto de status científico do app. O bug
// RECOG-2020 (protótipo declarava "PubMed e DOI verificados" para um estudo
// V0) fica impossível por construção: toda string de confiança é DERIVADA
// dos códigos do registro (B/V/E/C/L/T) — nunca digitada à mão em conteúdo.
//
// Regra "trust once, reuse many": estudo B2 + C1/C2 + L0/L1 sem retratação é
// confiável sem re-pesquisa. C3 e V2 circulam SOMENTE acompanhados do caveat.
// C4–C7, V0 e B0/B1 não existem neste registro — o validador recusa o arquivo.
//
// Engine puro: sem React, sem I/O, sem import de src/domain (o registro entra
// por parâmetro; quem importa o JSON é a rota/mock — invariante Engine ≠ Domínio).

// ─── Tipos do registro congelado ─────────────────────────────────────────────

export type OperationalStatus = "V1" | "V2";
export type EvidenceGrade = "E1" | "E2" | "E3" | "E4" | "E5";
export type ClaimAlignment = "C1" | "C2" | "C3";
export type Transposability = "T0" | "T1" | "T2" | "T3" | "T4";
export type LegalStatus = "L0" | "L1";
export type AccessType = "abstract_and_metadata" | "metadata_only" | "full_text";

/**
 * @deprecated claim_alignment/safe_claim/prohibited_claims/caveat neste tipo são
 * LEGACY (Onda 3.5) — mantidos só para compatibilidade com callers antigos
 * (trustGate/buildPassport de 1-2 argumentos). Código NOVO nunca lê estes campos
 * direto de um EvidenceStudy — usa ClaimRecord via src/domain/evidence/claim-registry.json.
 */
export interface EvidenceStudy {
  study_id: string;
  aliases: string[];
  canonical_citation: string;
  doi: string | null;
  origin_driver: string;
  access_type: AccessType;
  verification_status: "B2";
  operational_status: OperationalStatus;
  evidence_grade: EvidenceGrade;
  /** @deprecated legacy — use ClaimRecord.claim_alignment */
  claim_alignment: ClaimAlignment;
  transposability: Transposability;
  legal_status: LegalStatus;
  /** @deprecated legacy — use ClaimRecord.safe_claim */
  safe_claim: string;
  /** @deprecated legacy — use ClaimRecord.prohibited_claims */
  prohibited_claims: string[];
  /** @deprecated legacy — use ClaimRecord.caveat */
  caveat?: string;
  mechanisms: string[];
  nascente_candidates: string[];
  context_class?: string;
  profiles: string[];
  notes?: string;
  last_verified: string;
}

export interface EvidenceRegistry {
  registry: string;
  version: string;
  frozen: boolean;
  global_prohibited_claims: string[];
  excluded: { study_id: string; reason: string }[];
  studies: EvidenceStudy[];
}

// ─── Claim Registry (Onda 3.5 — fonte oficial de claims) ────────────────────
//
// Um claim é estudo × uso pretendido × papel × segmento × contexto-alvo. O
// mesmo estudo pode ter claims diferentes para usos diferentes — por isso
// claims vivem separados de estudos, não embutidos neles.

export type IntendedUse =
  | "explain_mechanism"
  | "prepare_conversation"
  | "create_team_mission"
  | "suggest_observation"
  | "organize_evidence";

export interface ClaimRecord {
  claim_id: string;
  /** Nome canônico legível (ex.: EDMONDSON-1999) — resolvido via resolveCanonicalStudy. */
  study_id: string;
  intended_use: IntendedUse;
  role: string[];
  segment: string[];
  target_context: string;
  claim_alignment: ClaimAlignment;
  safe_claim: string;
  prohibited_claims: string[];
  caveat?: string;
}

export interface ClaimRegistry {
  registry: string;
  version: string;
  /** Congelado desde v1.0.0 (2026-07-18) — validador recusa registro descongelado. */
  frozen: boolean;
  claims: ClaimRecord[];
}

export interface RequestContext {
  intendedUse: string;
  role: string;
  segment: string;
  targetContext: string;
}

/**
 * Nomes canônicos legíveis usados pelo Claim Registry → id do nó no Evidence
 * Registry congelado. O evidence-registry.json do checkpoint NÃO é reescrito
 * (zero byte alterado) — esta tabela vive só em código.
 */
const CANONICAL_STUDY_NAMES: Record<string, string> = {
  "EDMONDSON-1999": "TRU-006",
};

/** Resolve um nome canônico legível (ex.: EDMONDSON-1999) para o EvidenceStudy. */
export function resolveCanonicalStudy(
  registry: EvidenceRegistry,
  canonicalName: string,
): EvidenceStudy | null {
  const mappedId = CANONICAL_STUDY_NAMES[canonicalName] ?? canonicalName;
  return resolveStudy(registry, mappedId);
}

export interface MechanismRecord {
  mechanism_id: string;
  name: string;
  nascente: string;
  safe_explanation: string;
  study_ids: string[];
  primary_study_id: string;
  allowed_profiles: string[];
  known_limit: string;
  practical_application: string;
  risks: string[];
}

// ─── Validação do registro (recusa o arquivo, não a tela) ───────────────────

export interface RegistryValidation {
  valid: boolean;
  errors: string[];
}

/** Invariantes que o congelamento garante — qualquer violação recusa o registro inteiro. */
export function validateEvidenceRegistry(registry: EvidenceRegistry): RegistryValidation {
  const errors: string[] = [];
  if (!registry.frozen) errors.push("registro não está congelado (frozen !== true)");

  const ids = new Set<string>();
  const allIds = new Set<string>();
  for (const s of registry.studies) {
    if (ids.has(s.study_id)) errors.push(`${s.study_id}: study_id duplicado`);
    ids.add(s.study_id);
    allIds.add(s.study_id);
    for (const a of s.aliases) {
      if (allIds.has(a)) errors.push(`${s.study_id}: alias ${a} colide com outro nó/alias`);
      allIds.add(a);
    }
    if (s.verification_status !== "B2")
      errors.push(`${s.study_id}: verification_status ${s.verification_status} — só B2 entra no registro`);
    if (s.operational_status !== "V1" && s.operational_status !== "V2")
      errors.push(`${s.study_id}: operational_status inválido (V0 nunca entra)`);
    if (!["C1", "C2", "C3"].includes(s.claim_alignment))
      errors.push(`${s.study_id}: claim_alignment ${s.claim_alignment} — C4+ é bloqueado`);
    if (s.claim_alignment === "C3" && !s.caveat)
      errors.push(`${s.study_id}: C3 sem caveat — ressalva é obrigatória`);
    if (s.operational_status === "V2" && !s.caveat)
      errors.push(`${s.study_id}: V2 sem caveat — ressalva é obrigatória`);
    if (!s.safe_claim || s.safe_claim.trim().length < 40)
      errors.push(`${s.study_id}: safe_claim ausente ou curto demais`);
    if (s.mechanisms.length === 0) errors.push(`${s.study_id}: sem mecanismo`);
    if (s.nascente_candidates.length === 0 && !s.context_class)
      errors.push(`${s.study_id}: sem nascente e sem context_class — estudo órfão`);
  }
  return { valid: errors.length === 0, errors };
}

// ─── Trust gate (trust once, reuse many) ─────────────────────────────────────

export interface TrustDecision {
  trusted: boolean;
  /** Ressalva que DEVE acompanhar o claim em qualquer superfície (C3/V2). */
  requiredCaveat: string | null;
  reasons: string[];
}

/**
 * Decide se um estudo (e, opcionalmente, um claim específico) pode ser usado
 * sem nova pesquisa. C3/V2 passam SÓ com caveat junto.
 *
 * - `trustGate(study)` — caminho LEGACY (Onda ≤3), lê claim_alignment/caveat
 *   direto do EvidenceStudy. Mantido inalterado para callers existentes.
 * - `trustGate(study, claim, requestContext)` — caminho NOVO (Onda 3.5):
 *   valida estudo + claim (C1-C3 com caveat obrigatório em C3, C4+ nunca
 *   passa) + compatibilidade de intendedUse/role/segment/targetContext do
 *   requestContext contra o claim. Qualquer incompatibilidade bloqueia.
 */
export function trustGate(
  study: EvidenceStudy,
  claim?: ClaimRecord,
  requestContext?: RequestContext,
): TrustDecision {
  const reasons: string[] = [];
  if (study.verification_status !== "B2") reasons.push("verificação independente ausente");
  if (!["L0", "L1"].includes(study.legal_status)) reasons.push("situação legal não liberada");

  if (!claim) {
    const needsCaveat = study.claim_alignment === "C3" || study.operational_status === "V2";
    if (needsCaveat && !study.caveat) reasons.push("exige ressalva e não há caveat registrado");
    return {
      trusted: reasons.length === 0,
      requiredCaveat: needsCaveat ? (study.caveat ?? null) : null,
      reasons,
    };
  }

  if (study.operational_status === "V2" && !claim.caveat)
    reasons.push("estudo V2 exige ressalva e o claim não tem caveat registrado");
  if (claim.claim_alignment === "C3" && !claim.caveat)
    reasons.push("claim C3 exige ressalva e não há caveat registrado");

  if (requestContext) {
    if (requestContext.intendedUse !== claim.intended_use)
      reasons.push(`uso pretendido incompatível: pedido "${requestContext.intendedUse}", claim autoriza "${claim.intended_use}"`);
    if (!claim.role.includes(requestContext.role))
      reasons.push(`papel incompatível: "${requestContext.role}" não está em [${claim.role.join(", ")}]`);
    if (!claim.segment.includes(requestContext.segment))
      reasons.push(`segmento incompatível: "${requestContext.segment}" não está em [${claim.segment.join(", ")}]`);
    if (requestContext.targetContext !== claim.target_context)
      reasons.push(`contexto-alvo incompatível: pedido "${requestContext.targetContext}", claim autoriza "${claim.target_context}"`);
  }

  const needsCaveat = claim.claim_alignment === "C3" || study.operational_status === "V2";
  return {
    trusted: reasons.length === 0,
    requiredCaveat: needsCaveat ? (claim.caveat ?? null) : null,
    reasons,
  };
}

/** Resolve um id de ocorrência (ex.: VOI-005) para o nó canônico (TRU-006). */
export function resolveStudy(registry: EvidenceRegistry, id: string): EvidenceStudy | null {
  return (
    registry.studies.find((s) => s.study_id === id) ??
    registry.studies.find((s) => s.aliases.includes(id)) ??
    null
  );
}

/**
 * @deprecated (bloqueador 2 pré-§5 do SAFE-VOICE-BRIDGE) — seleciona só por
 * estudo × uso pretendido, deixando papel/segmento/contexto-alvo para
 * validação POSTERIOR no trustGate. Código novo usa findClaimForContext,
 * que exige o contexto completo já na SELEÇÃO. Mantido para compatibilidade
 * de testes existentes; nenhum call site de produção resta.
 */
export function findClaimForStudy(
  evidenceRegistry: EvidenceRegistry,
  claimRegistry: ClaimRegistry,
  study: EvidenceStudy,
  intendedUse: IntendedUse,
): ClaimRecord | null {
  return (
    claimRegistry.claims.find(
      (c) =>
        c.intended_use === intendedUse &&
        resolveCanonicalStudy(evidenceRegistry, c.study_id)?.study_id === study.study_id,
    ) ?? null
  );
}

/**
 * Claim OFICIAL para estudo × CONTEXTO COMPLETO (uso pretendido + papel +
 * segmento + contexto-alvo) — a seleção já exige as quatro dimensões, não
 * as valida só depois. null quando nenhuma combinação é totalmente
 * compatível E confiável (o trustGate roda com o mesmo contexto: um claim
 * dimensionalmente certo mas C3/V2 sem caveat continua fora — fail-closed).
 * Nunca reaproveita claim de outro contexto para preencher lacuna.
 */
export function findClaimForContext(
  evidenceRegistry: EvidenceRegistry,
  claimRegistry: ClaimRegistry,
  study: EvidenceStudy,
  requestContext: RequestContext,
): ClaimRecord | null {
  return (
    claimRegistry.claims.find((c) => {
      if (c.intended_use !== requestContext.intendedUse) return false;
      if (!c.role.includes(requestContext.role)) return false;
      if (!c.segment.includes(requestContext.segment)) return false;
      if (c.target_context !== requestContext.targetContext) return false;
      if (resolveCanonicalStudy(evidenceRegistry, c.study_id)?.study_id !== study.study_id)
        return false;
      return trustGate(study, c, requestContext).trusted;
    }) ?? null
  );
}

// ─── Evidence Passport — 3 níveis progressivos ───────────────────────────────

export type PassportLevel = "humano" | "profissional" | "auditoria";

/** Vocabulário humano DERIVADO dos códigos — o nível humano nunca vê jargão S/B/V/E/C. */
const HUMAN_CONFIDENCE: Record<EvidenceGrade, string> = {
  E1: "Evidência inicial",
  E2: "Evidência promissora",
  E3: "Evidência consistente",
  E4: "Evidência forte (síntese de vários estudos)",
  E5: "Evidência muito forte",
};

const DESIGN_LABEL: Record<EvidenceGrade, string> = {
  E1: "estudo exploratório",
  E2: "evidência emergente",
  E3: "estudo consistente (correlacional/intervenção única)",
  E4: "meta-análise ou revisão sistemática",
  E5: "múltiplas meta-análises convergentes",
};

const ALIGNMENT_LABEL: Record<ClaimAlignment, string> = {
  C1: "correspondência forte entre o claim e o achado",
  C2: "correspondência adequada — claim conservador",
  C3: "correspondência parcial — uso somente com a ressalva registrada",
};

const ACCESS_LABEL: Record<AccessType, string> = {
  abstract_and_metadata: "resumo e metadados públicos conferidos (texto integral não lido)",
  metadata_only: "somente metadados conferidos",
  full_text: "texto integral lido",
};

export interface EvidencePassport {
  studyId: string;
  level: PassportLevel;
  /** O único claim autorizado — vai textual para a superfície. */
  claim: string;
  /** Ressalva obrigatória (C3/V2) ou null. */
  caveat: string | null;
  /** Linhas de confiança derivadas — variam por nível. */
  lines: { label: string; value: string }[];
  trusted: boolean;
}

/**
 * Constrói o passaporte para um nível de leitura. Toda string sai dos códigos
 * do registro. Aceita opcionalmente um `claim` do Claim Registry (Onda 3.5) —
 * quando presente, `claim`/`alignment` exibidos vêm dele, não do EvidenceStudy
 * legacy. Sem `claim`, comportamento idêntico ao de antes (compatibilidade).
 */
export function buildPassport(
  study: EvidenceStudy,
  level: PassportLevel,
  claim?: ClaimRecord,
): EvidencePassport {
  const gate = trustGate(study, claim);
  const alignment = claim?.claim_alignment ?? study.claim_alignment;
  const displayClaim = claim?.safe_claim ?? study.safe_claim;
  const lines: { label: string; value: string }[] = [];

  if (level === "humano") {
    lines.push({ label: "Confiança", value: HUMAN_CONFIDENCE[study.evidence_grade] });
    lines.push({ label: "Fonte", value: study.canonical_citation });
  } else {
    lines.push({ label: "Fonte", value: study.canonical_citation });
    if (study.doi) lines.push({ label: "DOI", value: study.doi });
    lines.push({ label: "Desenho", value: DESIGN_LABEL[study.evidence_grade] });
    lines.push({ label: "Alinhamento", value: ALIGNMENT_LABEL[alignment] });
    lines.push({ label: "Acesso na verificação", value: ACCESS_LABEL[study.access_type] });
  }

  if (level === "auditoria") {
    lines.push({
      label: "Códigos",
      value: [
        study.verification_status,
        study.operational_status,
        study.evidence_grade,
        alignment,
        study.transposability,
        study.legal_status,
      ].join(" · "),
    });
    lines.push({ label: "Última verificação", value: study.last_verified });
    if (study.aliases.length > 0)
      lines.push({ label: "Ocorrências consolidadas", value: study.aliases.join(", ") });
    if (study.notes) lines.push({ label: "Notas", value: study.notes });
    if (claim) lines.push({ label: "Claim", value: claim.claim_id });
  }

  return {
    studyId: study.study_id,
    level,
    claim: displayClaim,
    caveat: gate.requiredCaveat,
    lines,
    trusted: gate.trusted,
  };
}

// ─── Validação do Claim Registry (Onda 3.5) ──────────────────────────────────

/** Espelha validateEvidenceRegistry: registro congelado; todo claim referencia estudo
 * canônico existente; C3 exige caveat; V0/B0/C4-C7 nunca passam (herdado da validação
 * do estudo). */
export function validateClaimRegistry(
  evidenceRegistry: EvidenceRegistry,
  claimRegistry: ClaimRegistry,
): RegistryValidation {
  const errors: string[] = [];
  if (!claimRegistry.frozen)
    errors.push("claim registry não está congelado (frozen !== true) — v1.0.0 é congelada");
  const ids = new Set<string>();
  for (const claim of claimRegistry.claims) {
    if (ids.has(claim.claim_id)) errors.push(`${claim.claim_id}: claim_id duplicado`);
    ids.add(claim.claim_id);

    const study = resolveCanonicalStudy(evidenceRegistry, claim.study_id);
    if (!study) {
      errors.push(`${claim.claim_id}: estudo canônico "${claim.study_id}" não existe no registro`);
      continue;
    }
    if (study.operational_status !== "V1" && study.operational_status !== "V2")
      errors.push(`${claim.claim_id}: estudo ${claim.study_id} não é V1/V2 — V0 nunca é referenciável`);
    if (!["C1", "C2", "C3"].includes(claim.claim_alignment))
      errors.push(`${claim.claim_id}: claim_alignment ${claim.claim_alignment} — C4+ é bloqueado`);
    if (claim.claim_alignment === "C3" && !claim.caveat)
      errors.push(`${claim.claim_id}: C3 sem caveat — ressalva é obrigatória`);
    if (!claim.safe_claim || claim.safe_claim.trim().length < 40)
      errors.push(`${claim.claim_id}: safe_claim ausente ou curto demais`);
    if (claim.role.length === 0) errors.push(`${claim.claim_id}: sem papel autorizado`);
    if (claim.segment.length === 0) errors.push(`${claim.claim_id}: sem segmento autorizado`);
  }
  return { valid: errors.length === 0, errors };
}

// ─── Orçamento de evidência (contrato dos learning patterns) ─────────────────

export interface ActivityEvidenceBudget {
  mechanismIds: readonly string[];
  primaryStudyId: string;
  complementaryStudyIds: readonly string[];
}

/** 1 mecanismo, 1 estudo principal, ≤2 complementares — recusa telas-bibliografia. */
export function checkActivityBudget(budget: ActivityEvidenceBudget): RegistryValidation {
  const errors: string[] = [];
  if (budget.mechanismIds.length !== 1) errors.push("atividade exige exatamente 1 mecanismo");
  if (!budget.primaryStudyId) errors.push("atividade exige 1 estudo principal");
  if (budget.complementaryStudyIds.length > 2)
    errors.push("máximo de 2 estudos complementares por atividade");
  if (budget.complementaryStudyIds.includes(budget.primaryStudyId))
    errors.push("estudo principal repetido como complementar");
  return { valid: errors.length === 0, errors };
}

// ─── Consistência mecanismo × registro ───────────────────────────────────────

/**
 * Todo study_id citado por um mecanismo existe no registro e passa no gate.
 * Também recusa mechanism_id duplicado (SAFE-VOICE-BRIDGE §5, Fatia A):
 * um id repetido tornaria ambíguo qualquer vínculo templateId → mechanismId
 * — nenhuma ocorrência de um id duplicado é confiável.
 */
export function validateMechanisms(
  registry: EvidenceRegistry,
  mechanisms: MechanismRecord[],
): RegistryValidation {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  for (const m of mechanisms) {
    if (seenIds.has(m.mechanism_id)) errors.push(`${m.mechanism_id}: mechanism_id duplicado`);
    seenIds.add(m.mechanism_id);
    if (!m.study_ids.includes(m.primary_study_id))
      errors.push(`${m.mechanism_id}: primary_study_id fora de study_ids`);
    for (const id of m.study_ids) {
      const study = resolveStudy(registry, id);
      if (!study) {
        errors.push(`${m.mechanism_id}: estudo ${id} não existe no registro congelado`);
        continue;
      }
      const gate = trustGate(study);
      if (!gate.trusted) errors.push(`${m.mechanism_id}: estudo ${id} não passa no trust gate`);
    }
  }
  return { valid: errors.length === 0, errors };
}
