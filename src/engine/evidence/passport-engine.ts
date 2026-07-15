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
  claim_alignment: ClaimAlignment;
  transposability: Transposability;
  legal_status: LegalStatus;
  safe_claim: string;
  prohibited_claims: string[];
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

/** Decide se um estudo pode ser usado sem nova pesquisa. C3/V2 passam SÓ com caveat junto. */
export function trustGate(study: EvidenceStudy): TrustDecision {
  const reasons: string[] = [];
  if (study.verification_status !== "B2") reasons.push("verificação independente ausente");
  if (!["L0", "L1"].includes(study.legal_status)) reasons.push("situação legal não liberada");
  const needsCaveat = study.claim_alignment === "C3" || study.operational_status === "V2";
  if (needsCaveat && !study.caveat) reasons.push("exige ressalva e não há caveat registrado");
  return {
    trusted: reasons.length === 0,
    requiredCaveat: needsCaveat ? (study.caveat ?? null) : null,
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

/** Constrói o passaporte para um nível de leitura. Toda string sai dos códigos do registro. */
export function buildPassport(study: EvidenceStudy, level: PassportLevel): EvidencePassport {
  const gate = trustGate(study);
  const lines: { label: string; value: string }[] = [];

  if (level === "humano") {
    lines.push({ label: "Confiança", value: HUMAN_CONFIDENCE[study.evidence_grade] });
    lines.push({ label: "Fonte", value: study.canonical_citation });
  } else {
    lines.push({ label: "Fonte", value: study.canonical_citation });
    if (study.doi) lines.push({ label: "DOI", value: study.doi });
    lines.push({ label: "Desenho", value: DESIGN_LABEL[study.evidence_grade] });
    lines.push({ label: "Alinhamento", value: ALIGNMENT_LABEL[study.claim_alignment] });
    lines.push({ label: "Acesso na verificação", value: ACCESS_LABEL[study.access_type] });
  }

  if (level === "auditoria") {
    lines.push({
      label: "Códigos",
      value: [
        study.verification_status,
        study.operational_status,
        study.evidence_grade,
        study.claim_alignment,
        study.transposability,
        study.legal_status,
      ].join(" · "),
    });
    lines.push({ label: "Última verificação", value: study.last_verified });
    if (study.aliases.length > 0)
      lines.push({ label: "Ocorrências consolidadas", value: study.aliases.join(", ") });
    if (study.notes) lines.push({ label: "Notas", value: study.notes });
  }

  return {
    studyId: study.study_id,
    level,
    claim: study.safe_claim,
    caveat: gate.requiredCaveat,
    lines,
    trusted: gate.trusted,
  };
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

/** Todo study_id citado por um mecanismo existe no registro e passa no gate. */
export function validateMechanisms(
  registry: EvidenceRegistry,
  mechanisms: MechanismRecord[],
): RegistryValidation {
  const errors: string[] = [];
  for (const m of mechanisms) {
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
