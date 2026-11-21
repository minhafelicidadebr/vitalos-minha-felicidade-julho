// Protocolo de eficácia das ações (C8) — engine PURO.
//
// Spec: docs/vitalos/specs/efficacy-protocol-c8.md. Status: PROPOSTA implementada
// como motor de software; parâmetros metodológicos (D9) seguem sem aprovação.
//
// Invariantes:
//  · o estado da avaliação é função de (protocolo, observações, parecer); o estado
//    da ação NÃO é entrada — concluir uma ação nunca cria nem altera avaliação;
//  · nada aqui lê, compõe ou altera índice IVO;
//  · valor ausente/suprimido nunca vira zero: a comparação fica `nao_comparavel`;
//  · valores de leituras publicadas não são persistidos: o protocolo guarda só a
//    REFERÊNCIA; quem avalia resolve o valor no momento da leitura (A4).

import type { LensPublicationState } from "./lens-contract";

export const EFFICACY_PROTOCOL_CONTRACT = "ivo-efficacy-protocol/1" as const;

export type EfficacyState =
  | "sem_protocolo"
  | "aguardando_observacao"
  | "em_avaliacao"
  | "meta_atingida"
  | "meta_nao_atingida"
  | "inconclusiva";

export type IndicatorKind = "execucao" | "resultado";
export type IndicatorOrigin = "leitura_publicada" | "medida_da_organizacao";
export type IndicatorDirection = "aumentar" | "diminuir";
export type ClaimScope = IndicatorKind;
export type EvidenceGrade = "descritiva" | "pre_pos" | "comparacao_referencia" | "desenho_causal";
export type ObservedChange = "melhorou" | "piorou" | "sem_mudanca" | "nao_comparavel";
export type AttributionStatus = "nao_avaliada" | "nao_sustentada" | "sustentada_por_desenho";
export type EfficacyVerdict = "meta_atingida" | "meta_nao_atingida" | "inconclusiva";

export const EFFICACY_STATE_LABEL: Record<EfficacyState, string> = {
  sem_protocolo: "Sem protocolo de avaliação",
  aguardando_observacao: "Aguardando observação",
  em_avaliacao: "Em avaliação",
  meta_atingida: "Meta atingida",
  meta_nao_atingida: "Meta não atingida",
  inconclusiva: "Avaliação inconclusiva",
};

/** Texto fixo da interface: separa execução, eficácia e índice. */
export const EFFICACY_INVARIANT_NOTE =
  "Concluir a ação registra a execução. Isso não comprova melhora do indicador, não atribui causa e não altera o IVO.";

/** Referência a uma leitura publicada (nunca carrega valor). */
export interface PublicationRef {
  cohortKey: string;
  cycleKey: string;
  instrumentVersion: string;
  calculationVersion: string;
  publicationState: LensPublicationState;
}

export interface ComparisonRule {
  sameCohort: boolean;
  sameInstrumentVersion: boolean;
  sameCalculationVersion: boolean;
  /** Sempre true: k≥5 e sem supressão (não configurável). */
  requirePublished: true;
}

export interface EfficacyProtocol {
  contractVersion: typeof EFFICACY_PROTOCOL_CONTRACT;
  revision: number;
  objective: string;
  indicator: {
    label: string;
    kind: IndicatorKind;
    origin: IndicatorOrigin;
    unit: string;
    direction: IndicatorDirection | null;
  };
  baseline: null | {
    observedOn: string;
    population: string;
    source: string;
    /** Só em `medida_da_organizacao`. Em `leitura_publicada` é sempre null. */
    value: number | null;
    /** Só em `leitura_publicada`. */
    ref: PublicationRef | null;
  };
  target: { kind: "numerico"; value: number } | { kind: "qualitativo"; criterion: string } | null;
  /** Definida pelo protocolo; sem default global. Ausente ⇒ mudança apenas descritiva. */
  meaningfulDifference: number | null;
  window: { start: string; end: string };
  source: string;
  comparisonRule: ComparisonRule;
  responsibleRole: string;
  reviewerRole: string;
  limitations: readonly string[];
}

export interface EfficacyObservation {
  id: string;
  observedOn: string;
  /** Só em `medida_da_organizacao`; em `leitura_publicada` é null (valor resolvido na leitura). */
  value: number | null;
  ref: PublicationRef | null;
}

export type ProtocolValidation =
  | { ok: true; protocol: EfficacyProtocol }
  | { ok: false; errors: readonly string[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

const text = (value: unknown, min: number): boolean => typeof value === "string" && value.trim().length >= min;

/** Valida o protocolo ANTES de qualquer avaliação. Devolve códigos estáveis de erro. */
export function validateEfficacyProtocol(protocol: EfficacyProtocol): ProtocolValidation {
  const e: string[] = [];
  if (protocol.contractVersion !== EFFICACY_PROTOCOL_CONTRACT) e.push("contrato_desconhecido");
  if (!Number.isInteger(protocol.revision) || protocol.revision < 1) e.push("revisao_invalida");
  if (!text(protocol.objective, 10)) e.push("objetivo_curto");
  const { indicator, baseline, target, window: win } = protocol;
  if (!text(indicator.label, 3)) e.push("indicador_sem_nome");
  if (!text(indicator.unit, 1)) e.push("indicador_sem_unidade");
  if (!text(protocol.source, 3)) e.push("fonte_ausente");
  if (!text(protocol.responsibleRole, 2) || !text(protocol.reviewerRole, 2)) e.push("papel_ausente");
  else if (protocol.responsibleRole.trim().toLowerCase() === protocol.reviewerRole.trim().toLowerCase()) {
    e.push("revisor_igual_ao_responsavel");
  }
  if (protocol.meaningfulDifference !== null && !(Number.isFinite(protocol.meaningfulDifference) && protocol.meaningfulDifference >= 0)) {
    e.push("diferenca_minima_invalida");
  }
  if (protocol.comparisonRule.requirePublished !== true) e.push("exige_leitura_publicada");

  const windowOk = isIsoDate(win.start) && isIsoDate(win.end) && win.start < win.end;
  if (!windowOk) e.push("janela_invalida");

  if (indicator.kind === "resultado") {
    if (indicator.direction !== "aumentar" && indicator.direction !== "diminuir") e.push("direcao_obrigatoria");
    if (!baseline) e.push("baseline_obrigatorio");
    if (!target) e.push("meta_obrigatoria");
  }
  if (indicator.origin === "leitura_publicada" && indicator.kind !== "resultado") e.push("leitura_publicada_exige_resultado");

  if (target) {
    if (target.kind === "numerico" && !Number.isFinite(target.value)) e.push("meta_numerica_invalida");
    if (target.kind === "qualitativo" && !text(target.criterion, 10)) e.push("criterio_qualitativo_curto");
  }

  if (baseline) {
    if (!isIsoDate(baseline.observedOn)) e.push("baseline_sem_data");
    else if (windowOk && baseline.observedOn > win.start) e.push("baseline_posterior_a_janela");
    if (!text(baseline.population, 3)) e.push("baseline_sem_populacao");
    if (!text(baseline.source, 3)) e.push("baseline_sem_fonte");
    if (indicator.origin === "leitura_publicada") {
      if (!baseline.ref) e.push("baseline_sem_referencia");
      if (baseline.value !== null) e.push("baseline_com_valor_de_leitura_publicada");
    } else {
      if (baseline.value === null || !Number.isFinite(baseline.value)) e.push("baseline_sem_valor");
      if (baseline.ref) e.push("baseline_referencia_so_para_leitura_publicada");
    }
  }

  if (indicator.origin === "leitura_publicada") {
    const r = protocol.comparisonRule;
    // Comparar valor nativo entre versões, recortes ou cálculos diferentes não é evolução da mesma medida.
    if (!(r.sameCohort && r.sameInstrumentVersion && r.sameCalculationVersion)) e.push("regra_de_comparacao_insuficiente");
  }

  return e.length === 0 ? { ok: true, protocol } : { ok: false, errors: e };
}

export interface ComparabilityResult {
  comparable: boolean;
  reasons: readonly string[];
}

/** Compara as REFERÊNCIAS de duas leituras publicadas segundo a regra do protocolo. */
export function checkComparability(
  baseline: PublicationRef | null,
  observed: PublicationRef | null,
  rule: ComparisonRule,
): ComparabilityResult {
  const reasons: string[] = [];
  if (!baseline) reasons.push("baseline_sem_referencia");
  if (!observed) reasons.push("observacao_sem_referencia");
  if (baseline && observed) {
    if (rule.requirePublished) {
      if (baseline.publicationState !== "published") reasons.push("baseline_nao_publicado");
      if (observed.publicationState !== "published") reasons.push("observacao_nao_publicada");
    }
    if (rule.sameCohort && baseline.cohortKey !== observed.cohortKey) reasons.push("recorte_diferente");
    if (rule.sameInstrumentVersion && baseline.instrumentVersion !== observed.instrumentVersion) reasons.push("versao_do_instrumento_diferente");
    if (rule.sameCalculationVersion && baseline.calculationVersion !== observed.calculationVersion) reasons.push("versao_do_calculo_diferente");
    if (baseline.cycleKey === observed.cycleKey) reasons.push("mesmo_ciclo");
  }
  return { comparable: reasons.length === 0, reasons };
}

export interface Assessment {
  claimScope: ClaimScope;
  inWindow: boolean;
  comparability: ComparabilityResult;
  observedChange: ObservedChange;
  delta: number | null;
  /** true quando o protocolo não define diferença mínima: a mudança é só descritiva. */
  changeIsDescriptiveOnly: boolean;
  /** null = não calculável (qualitativo, ausente, não comparável). */
  targetReached: boolean | null;
  reasons: readonly string[];
}

export interface AssessmentInput {
  protocol: EfficacyProtocol;
  observation: EfficacyObservation;
  /** Valor da linha de base já resolvido pelo chamador (leitura protegida ou valor do protocolo). */
  baselineValue: number | null;
  /** Valor observado já resolvido pelo chamador. */
  observedValue: number | null;
}

const finite = (v: number | null): v is number => typeof v === "number" && Number.isFinite(v);

/** Calcula mudança observada e alcance da meta. NÃO emite parecer e NÃO atribui causa. */
export function assessObservation(input: AssessmentInput): Assessment {
  const { protocol, observation, baselineValue, observedValue } = input;
  const reasons: string[] = [];
  const claimScope = protocol.indicator.kind;
  const inWindow = observation.observedOn >= protocol.window.start && observation.observedOn <= protocol.window.end;
  if (!inWindow) reasons.push("fora_da_janela");

  let comparability: ComparabilityResult = { comparable: true, reasons: [] };
  if (protocol.indicator.origin === "leitura_publicada") {
    comparability = checkComparability(protocol.baseline?.ref ?? null, observation.ref, protocol.comparisonRule);
  }
  if (!comparability.comparable) reasons.push(...comparability.reasons);

  const hasBaseline = protocol.baseline !== null;
  if (!hasBaseline) reasons.push("sem_baseline");
  if (hasBaseline && !finite(baselineValue)) reasons.push("baseline_sem_valor_resolvido");
  if (!finite(observedValue)) reasons.push("valor_observado_ausente");

  const canCompare = inWindow && comparability.comparable && hasBaseline && finite(baselineValue) && finite(observedValue);
  const delta = canCompare ? (observedValue as number) - (baselineValue as number) : null;

  let observedChange: ObservedChange = "nao_comparavel";
  const threshold = protocol.meaningfulDifference ?? 0;
  if (delta !== null && protocol.indicator.direction) {
    const signed = protocol.indicator.direction === "aumentar" ? delta : -delta;
    observedChange = signed > threshold ? "melhorou" : signed < -threshold ? "piorou" : "sem_mudanca";
  }

  let targetReached: boolean | null = null;
  const target = protocol.target;
  if (target?.kind === "numerico" && inWindow && comparability.comparable && finite(observedValue)) {
    const decrease = protocol.indicator.direction === "diminuir";
    targetReached = decrease ? observedValue <= target.value : observedValue >= target.value;
  }

  return {
    claimScope,
    inWindow,
    comparability,
    observedChange,
    delta,
    changeIsDescriptiveOnly: protocol.meaningfulDifference === null,
    targetReached,
    reasons,
  };
}

export interface VerdictInput {
  protocolRevision: number;
  verdict: EfficacyVerdict;
  evidenceGrade: EvidenceGrade;
  observedChange: ObservedChange;
  targetReached: boolean | null;
  attribution: { status: AttributionStatus; design?: string };
  reason: string;
  reviewerRole: string;
  limitations: readonly string[];
}

/** Confere o parecer do revisor contra o protocolo e o cálculo. Devolve códigos de erro. */
export function validateVerdict(protocol: EfficacyProtocol, assessment: Assessment | null, v: VerdictInput): readonly string[] {
  const e: string[] = [];
  if (v.protocolRevision !== protocol.revision) e.push("revisao_divergente");
  if (v.reviewerRole.trim().toLowerCase() !== protocol.reviewerRole.trim().toLowerCase()) e.push("revisor_diferente_do_protocolo");

  const { attribution } = v;
  if (attribution.status === "sustentada_por_desenho") {
    if (!text(attribution.design, 10)) e.push("desenho_obrigatorio_para_atribuicao");
    if (v.evidenceGrade !== "desenho_causal") e.push("atribuicao_exige_desenho_causal");
  }
  if (v.evidenceGrade === "desenho_causal" && !text(attribution.design, 10)) e.push("desenho_causal_sem_descricao");
  if (protocol.indicator.kind === "execucao" && v.evidenceGrade !== "descritiva") e.push("execucao_so_grau_descritivo");

  if (v.verdict === "inconclusiva") {
    if (!text(v.reason, 10)) e.push("motivo_obrigatorio");
    return e;
  }

  if (!assessment) {
    e.push("sem_observacao");
    return e;
  }
  if (!assessment.inWindow) e.push("observacao_fora_da_janela");
  if (!assessment.comparability.comparable) e.push("nao_comparavel");
  if (protocol.indicator.kind === "resultado" && assessment.observedChange === "nao_comparavel") e.push("sem_mudanca_calculavel");
  if (v.observedChange !== assessment.observedChange) e.push("mudanca_divergente_do_calculo");
  if (v.evidenceGrade === "pre_pos" && !protocol.baseline) e.push("pre_pos_exige_baseline");

  if (protocol.target?.kind === "numerico") {
    if (assessment.targetReached === null) e.push("meta_nao_calculavel");
    else if (v.targetReached !== assessment.targetReached) e.push("meta_divergente_do_calculo");
  } else if (v.targetReached === null) {
    e.push("revisor_deve_declarar_meta_qualitativa");
  }
  if (v.verdict === "meta_atingida" && v.targetReached !== true) e.push("parecer_incoerente_com_meta");
  if (v.verdict === "meta_nao_atingida" && v.targetReached !== false) e.push("parecer_incoerente_com_meta");
  return e;
}

export interface StateInput {
  protocol: EfficacyProtocol | null;
  observations: readonly Pick<EfficacyObservation, "observedOn">[];
  /** Último parecer registrado; vale só para a mesma revisão do protocolo. */
  verdict: { verdict: EfficacyVerdict; protocolRevision: number } | null;
  // Deliberadamente SEM estado da ação: concluir ação não altera a avaliação.
}

/** Estado derivado da avaliação. */
export function deriveEfficacyState(input: StateInput): EfficacyState {
  const { protocol, observations, verdict } = input;
  if (!protocol) return "sem_protocolo";
  if (verdict && verdict.protocolRevision === protocol.revision) return verdict.verdict;
  const inWindow = observations.some((o) => o.observedOn >= protocol.window.start && o.observedOn <= protocol.window.end);
  return inWindow ? "em_avaliacao" : "aguardando_observacao";
}

export type WindowStatus = "nao_iniciada" | "aberta" | "encerrada";

/** Situação da janela de observação em uma data civil (AAAA-MM-DD). */
export function windowStatus(protocol: EfficacyProtocol, today: string): WindowStatus {
  if (today < protocol.window.start) return "nao_iniciada";
  if (today > protocol.window.end) return "encerrada";
  return "aberta";
}
