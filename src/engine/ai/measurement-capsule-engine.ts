// MeasurementContextCapsule — engine PURO.
//
// O ÚNICO contrato válido entre a camada de mensuração e a FlorescerIA.
// Nenhuma outra estrutura pode levar dados de survey para o LLM — essa é a
// "separação sagrada" do lado da IA (Fable 5 §5.4 + invariante #4).
//
// ARQUITETURA:
//   survey-to-exposure-pipeline → PipelineSuccess
//   crosswalk-engine → RankedDriver[]
//   reavaliacao-engine → DriverEvolution[] (opcional, habilita trend)
//         ↓
//   buildMeasurementCapsule() → MeasurementContextCapsule (SELADO)
//         ↓
//   copilot-engine / grounding-engine   ← lê o capsule, nunca os dados brutos
//
// O capsule é IMUTÁVEL após criação: sealedAt é definido no build e
// nenhuma função pública o modifica. A IA só pode afirmar o que o capsule
// declara permitido em `permissions`; as violações estão em `forbidden`.
//
// HONESTIDADE (Fable 5 §6):
//   - Dados de domínio B nunca carregam score individual.
//   - Dimensões suprimidas (n < k) chegam com visible: false e são excluídas
//     do topDriverIds — a IA não nomeia o que não pode ser revelado.
//   - Desfechos (burnout, comportamentos ofensivos) são medidos mas nunca
//     entram em topDriverIds: são efeito, não driver de intervenção.
//   - trend só é declarável com ≥ 2 ciclos de dados (canClaimTrend).
//
// Engine puro: sem React, sem I/O, sem imports de domain/.

import type { RiskLevel } from "../nr1/pgr-engine";

// ─── Tipos de entrada ──────────────────────────────────────────────────────────

/** Entrada para uma dimensão de medição (já normalizada: score = carga 0..100). */
export interface CapsuleDimensionInput {
  dimensionId: string;
  label: string;
  /** Carga psicossocial normalizada: 0 = sem risco/ótimo, 100 = máximo risco/piora. */
  loadScore: number;
  /** N de respondentes desta dimensão (pode diferir do total por recorte). */
  n: number;
  /** A dimensão é visível (n ≥ kAnonymityMin)? Falso → suprimida pelo k-anon. */
  visible: boolean;
  /** Nível de risco NR-1 (domain B) — NULO para domain A. Computado a montante. */
  riskLevel?: RiskLevel | null;
  /** Desfecho (burnout, comportamentos ofensivos)? Nunca entra em topDriverIds. */
  isOutcome?: boolean;
}

/** Ciclo anterior para cômputo de trend. */
export interface PriorCycleInput {
  cycleId: string;
  label: string;
  dimensions: Pick<CapsuleDimensionInput, "dimensionId" | "loadScore" | "visible">[];
}

export interface CapsuleInput {
  /** Opcional: aceita ID externo (testes deterministicos). Padrão: crypto.randomUUID(). */
  capsuleId?: string;
  packId: string;
  waveId: string;
  cohortId: string;
  /** ISO "YYYY-MM-DD" — quando a onda foi encerrada. */
  closedOn: string;
  instrument: string;
  instrumentShort: string;
  domain: "A" | "B";
  participantCount: number;
  kAnonymityMin: number;
  dimensions: CapsuleDimensionInput[];
  /** Ciclos anteriores, do mais antigo ao mais recente (sem incluir o ciclo atual). */
  priorCycles?: PriorCycleInput[];
}

// ─── Tipos do capsule selado ──────────────────────────────────────────────────

/** Dimensão selada dentro do capsule. */
export interface CapsuleDimension {
  dimensionId: string;
  label: string;
  loadScore: number;
  n: number;
  visible: boolean;
  riskLevel: RiskLevel | null;
  /** Tendência longitudinal. Null se < 2 ciclos disponíveis ou dimensão suprimida. */
  trend: "melhorando" | "estavel" | "piorando" | null;
  isOutcome: boolean;
}

/** O que a IA pode e não pode afirmar, derivado dos dados — imutável após seal. */
export interface CapsulePermissions {
  /** Há dimensões visíveis com dados k-anon garantidos. */
  canClaimExposure: boolean;
  /** Domain B + canClaimExposure → pode classificar risco NR-1. */
  canClaimRisk: boolean;
  /** Há ≥ 2 ciclos → pode afirmar tendência temporal. */
  canClaimTrend: boolean;
  /** Sempre true: sugestões de intervenção são educativas e não requerem diagnóstico. */
  canSuggestIntervention: true;
  /** Pode nomear os top drivers (dimensões mais críticas). */
  canNameTopDrivers: boolean;
  /** Lista explícita do que está PROIBIDO — a IA deve checar antes de formular resposta. */
  readonly forbidden: readonly string[];
}

/** Disclaimers obrigatórios — a IA deve incluir pelo menos um em toda resposta. */
export type RequiredDisclaimer =
  | "individual_data_forbidden"
  | "causality_forbidden"
  | "pgr_requires_professional"
  | "exploratory_not_clinical"
  | "trend_correlational_only";

export interface MeasurementContextCapsule {
  capsuleId: string;
  capsuleVersion: "1.0";
  createdAt: string;
  /** Idêntico a createdAt — marca imutabilidade: permissions não mudam após este instante. */
  sealedAt: string;
  packId: string;
  waveId: string;
  cohortId: string;
  closedOn: string;
  instrument: string;
  instrumentShort: string;
  domain: "A" | "B";
  participantCount: number;
  kAnonymityMin: number;
  kAnonymityGuaranteed: boolean;
  dimensions: readonly CapsuleDimension[];
  /** IDs das dimensões VISÍVEIS, NON-OUTCOME, ordenadas por loadScore desc (mais crítica primeiro). */
  topDriverIds: readonly string[];
  permissions: CapsulePermissions;
  requiredDisclaimers: readonly RequiredDisclaimer[];
}

// ─── Validação do capsule ─────────────────────────────────────────────────────

export type CapsuleViolation =
  | "no_instrument"
  | "negative_participants"
  | "k_anon_below_min"
  | "outcome_in_top_drivers"
  | "suppressed_in_top_drivers"
  | "risk_level_on_domain_a"
  | "trend_claimed_without_cycles"
  | "missing_disclaimers"
  | "sealed_at_mismatch";

export interface CapsuleValidation {
  valid: boolean;
  violations: CapsuleViolation[];
}

// ─── Resultado para a IA ─────────────────────────────────────────────────────

/** Resumo estruturado que o copilot/grounding engine usa para formular resposta. */
export interface GroundedCapsuleSummary {
  /** Ex.: "3 dimensões com risco alto ou crítico em COPSOQ (n=403, k≥5 garantido)" */
  headline: string;
  /** Claims afirmáveis — cada um citável com dimensionId e loadScore. */
  claims: GroundedClaim[];
  /** Texto pronto do contexto permitido para o prompt do LLM. */
  allowedContext: string;
  /** Texto pronto do que está proibido — inserir no system prompt. */
  forbiddenContext: string;
  /** Disclaimer obrigatório para a resposta ao usuário. */
  requiredDisclaimer: string;
}

export interface GroundedClaim {
  dimensionId: string;
  label: string;
  claim: string;
  evidence: string;
  sourceRoute: string;
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Constrói e sela um MeasurementContextCapsule a partir dos dados de pipeline.
 * Após retornado, o capsule é imutável — não modifique seus campos.
 */
export function buildMeasurementCapsule(input: CapsuleInput): MeasurementContextCapsule {
  const now = new Date().toISOString();
  const capsuleId = input.capsuleId ?? crypto.randomUUID();

  const kGuaranteed = input.participantCount >= input.kAnonymityMin;

  // ── Processar dimensões ──────────────────────────────────────────────────────
  const priorByDim = buildPriorMap(input.priorCycles ?? []);
  const hasTrend = (input.priorCycles?.length ?? 0) >= 1; // ciclo atual + ≥1 anterior

  const dimensions: CapsuleDimension[] = input.dimensions.map((d) => ({
    dimensionId: d.dimensionId,
    label: d.label,
    loadScore: clamp(d.loadScore, 0, 100),
    n: d.n,
    visible: d.visible && kGuaranteed,
    riskLevel: input.domain === "B" ? (d.riskLevel ?? null) : null,
    trend: computeTrend(d, priorByDim, hasTrend),
    isOutcome: d.isOutcome ?? false,
  }));

  // ── topDriverIds: visíveis, não-desfecho, por loadScore desc ────────────────
  const topDriverIds = dimensions
    .filter((d) => d.visible && !d.isOutcome)
    .sort((a, b) => b.loadScore - a.loadScore)
    .map((d) => d.dimensionId);

  // ── Permissions ──────────────────────────────────────────────────────────────
  const canClaimExposure = kGuaranteed && topDriverIds.length > 0;
  const canClaimRisk = input.domain === "B" && canClaimExposure;
  const canClaimTrend = hasTrend && canClaimExposure;
  const canNameTopDrivers = canClaimExposure && topDriverIds.length > 0;

  const permissions: CapsulePermissions = {
    canClaimExposure,
    canClaimRisk,
    canClaimTrend,
    canSuggestIntervention: true,
    canNameTopDrivers,
    forbidden: buildForbiddenList(input.domain),
  };

  // ── Disclaimers obrigatórios ──────────────────────────────────────────────────
  const requiredDisclaimers = buildDisclaimers(input.domain, canClaimTrend);

  return {
    capsuleId,
    capsuleVersion: "1.0",
    createdAt: now,
    sealedAt: now,
    packId: input.packId,
    waveId: input.waveId,
    cohortId: input.cohortId,
    closedOn: input.closedOn,
    instrument: input.instrument,
    instrumentShort: input.instrumentShort,
    domain: input.domain,
    participantCount: input.participantCount,
    kAnonymityMin: input.kAnonymityMin,
    kAnonymityGuaranteed: kGuaranteed,
    dimensions,
    topDriverIds,
    permissions,
    requiredDisclaimers,
  };
}

// ─── Validação ────────────────────────────────────────────────────────────────

/** Valida a integridade de um capsule já construído. Retorna lista de violações. */
export function validateCapsule(capsule: MeasurementContextCapsule): CapsuleValidation {
  const violations: CapsuleViolation[] = [];

  if (!capsule.instrument || !capsule.instrumentShort) violations.push("no_instrument");
  if (capsule.participantCount < 0) violations.push("negative_participants");
  if (capsule.kAnonymityGuaranteed && capsule.participantCount < capsule.kAnonymityMin)
    violations.push("k_anon_below_min");

  for (const id of capsule.topDriverIds) {
    const dim = capsule.dimensions.find((d) => d.dimensionId === id);
    if (dim?.isOutcome) violations.push("outcome_in_top_drivers");
    if (dim && !dim.visible) violations.push("suppressed_in_top_drivers");
  }

  for (const dim of capsule.dimensions) {
    if (capsule.domain === "A" && dim.riskLevel !== null)
      violations.push("risk_level_on_domain_a");
  }

  // Coerência de trend: se o capsule alega poder afirmar tendência, ao menos uma
  // dimensão visível precisa carregar um trend computado (≥2 ciclos houve de fato).
  if (capsule.permissions.canClaimTrend) {
    const hasAnyTrend = capsule.dimensions.some((d) => d.visible && d.trend !== null);
    if (!hasAnyTrend) violations.push("trend_claimed_without_cycles");
  }

  if (capsule.requiredDisclaimers.length === 0) violations.push("missing_disclaimers");
  if (capsule.createdAt !== capsule.sealedAt) violations.push("sealed_at_mismatch");

  return { valid: violations.length === 0, violations };
}

// ─── Asserção de permissão ────────────────────────────────────────────────────

/**
 * Lança erro se a permissão não está concedida.
 * O copilot usa esta função antes de formular qualquer claim.
 */
export function assertCapsulePermission(
  capsule: MeasurementContextCapsule,
  perm: "canClaimExposure" | "canClaimRisk" | "canClaimTrend" | "canNameTopDrivers",
): void {
  if (!capsule.permissions[perm]) {
    throw new Error(
      `[MeasurementCapsule] Permissão negada: ${perm}. ` +
        `instrument=${capsule.instrumentShort}, domain=${capsule.domain}, ` +
        `n=${capsule.participantCount}, kMin=${capsule.kAnonymityMin}.`,
    );
  }
}

// ─── Grounding para a IA ─────────────────────────────────────────────────────

/**
 * Constrói o contexto estruturado que o copilot/LLM pode usar.
 * Não gera texto livre — monta os blocos pré-aprovados que o engine do copiloto concatena.
 */
export function groundFromCapsule(capsule: MeasurementContextCapsule): GroundedCapsuleSummary {
  const { permissions, dimensions, topDriverIds, instrument, participantCount } = capsule;

  // ── Headline ─────────────────────────────────────────────────────────────────
  const criticalCount = dimensions.filter(
    (d) => d.visible && !d.isOutcome && (d.riskLevel === "critico" || d.riskLevel === "alto"),
  ).length;
  const visibleCount = dimensions.filter((d) => d.visible && !d.isOutcome).length;

  let headline: string;
  if (!permissions.canClaimExposure) {
    headline = `Dados insuficientes para análise (n < ${capsule.kAnonymityMin} ou sem dimensões visíveis).`;
  } else if (capsule.domain === "B" && criticalCount > 0) {
    headline = `${criticalCount} de ${visibleCount} dimensões com exposição alta/crítica em ${instrument} (n=${participantCount}, k≥${capsule.kAnonymityMin} garantido).`;
  } else {
    headline = `${visibleCount} dimensões mensuradas em ${instrument} (n=${participantCount}, k≥${capsule.kAnonymityMin} garantido).`;
  }

  // ── Claims por top driver ────────────────────────────────────────────────────
  const claims: GroundedClaim[] = topDriverIds.slice(0, 5).map((id) => {
    const dim = dimensions.find((d) => d.dimensionId === id)!;
    const riskText =
      capsule.domain === "B" && dim.riskLevel
        ? ` — risco ${dim.riskLevel}`
        : ` — carga ${dim.loadScore}%`;
    const trendText = dim.trend ? ` (tendência: ${dim.trend})` : "";
    return {
      dimensionId: id,
      label: dim.label,
      claim: `${dim.label}${riskText}${trendText}.`,
      evidence: `loadScore=${dim.loadScore}/100, n=${dim.n}`,
      sourceRoute: capsule.domain === "B" ? "/matriz" : "/ivo",
    };
  });

  // ── Contexto para o LLM ───────────────────────────────────────────────────────
  const allowed: string[] = [
    `Instrumento: ${instrument} (${capsule.domain === "B" ? "Domínio B — risco psicossocial" : "Domínio A — florescimento"}).`,
    `Participantes: n=${participantCount} (k-anonimato ≥${capsule.kAnonymityMin} garantido).`,
  ];
  if (permissions.canClaimExposure && topDriverIds.length > 0) {
    allowed.push(`Dimensões mais críticas: ${topDriverIds.slice(0, 3).join(", ")}.`);
  }
  if (permissions.canClaimTrend) {
    allowed.push("Tendência longitudinal disponível: pode comparar ciclos.");
  }

  const forbidden = [
    "Nunca mencionar dado de indivíduo identificável.",
    "Nunca afirmar causalidade (apenas correlação orientativa).",
    capsule.domain === "B"
      ? "Nunca substituir PGR/GRO por recomendação da IA."
      : "Nunca usar dados de florescimento para decisão de desempenho.",
    "Nunca nomear dimensão suprimida (n < k).",
    "Nunca misturar dados de Domínio A e B na mesma afirmação.",
  ];

  const disclaimerTexts: Record<RequiredDisclaimer, string> = {
    individual_data_forbidden: "Dados individuais nunca são revelados.",
    causality_forbidden: "Associação orientativa — não implica causalidade.",
    pgr_requires_professional: "Conclusão de GRO/PGR exige versão licenciada e profissional habilitado (NR-1).",
    exploratory_not_clinical: "Resultado coletivo educativo — não substitui avaliação clínica.",
    trend_correlational_only: "Tendência longitudinal é correlacional — não prova eficácia causal das intervenções.",
  };

  const requiredDisclaimer = capsule.requiredDisclaimers
    .map((d) => disclaimerTexts[d])
    .join(" ");

  return {
    headline,
    claims,
    allowedContext: allowed.join(" "),
    forbiddenContext: forbidden.join(" "),
    requiredDisclaimer,
  };
}

// ─── Utilitários internos ─────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function buildPriorMap(
  priorCycles: PriorCycleInput[],
): Map<string, { loadScore: number; visible: boolean }[]> {
  const map = new Map<string, { loadScore: number; visible: boolean }[]>();
  for (const cycle of priorCycles) {
    for (const dim of cycle.dimensions) {
      if (!map.has(dim.dimensionId)) map.set(dim.dimensionId, []);
      map.get(dim.dimensionId)!.push({ loadScore: dim.loadScore, visible: dim.visible });
    }
  }
  return map;
}

function computeTrend(
  d: CapsuleDimensionInput,
  priorMap: Map<string, { loadScore: number; visible: boolean }[]>,
  hasTrend: boolean,
): "melhorando" | "estavel" | "piorando" | null {
  if (!hasTrend || !d.visible) return null;
  const priors = priorMap.get(d.dimensionId);
  if (!priors || priors.length === 0) return null;
  const lastPrior = priors[priors.length - 1]!;
  if (!lastPrior.visible) return null;
  const delta = d.loadScore - lastPrior.loadScore;
  if (Math.abs(delta) < 3) return "estavel";  // < 3 pts = estável (margem de erro)
  return delta < 0 ? "melhorando" : "piorando"; // load cai → melhora; sobe → piora
}

function buildForbiddenList(domain: "A" | "B"): readonly string[] {
  const base = [
    "dado individual identificável",
    "diagnóstico clínico ou psicológico",
    "ranking de pessoas por score",
    "afirmação de causalidade direta",
    "decisão de desempenho, promoção ou remuneração",
    "dados de dimensão suprimida (n < k)",
    "mistura de Domínio A e Domínio B na mesma afirmação",
  ];
  if (domain === "B") {
    return [...base, "substituir GRO/PGR por recomendação da IA", "nomear indivíduo como risco"];
  }
  return base;
}

function buildDisclaimers(
  domain: "A" | "B",
  canClaimTrend: boolean,
): readonly RequiredDisclaimer[] {
  const base: RequiredDisclaimer[] = ["individual_data_forbidden", "causality_forbidden"];
  if (domain === "B") base.push("pgr_requires_professional");
  if (domain === "A") base.push("exploratory_not_clinical");
  if (canClaimTrend) base.push("trend_correlational_only");
  return base;
}
