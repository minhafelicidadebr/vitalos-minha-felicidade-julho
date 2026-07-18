// Response Templates — a única fonte de texto que o drawer da FlorêncIA pode
// mostrar. Determinístico: mesma entrada sempre produz a mesma saída
// estrutural (sem LLM, sem relógio, sem random, sem I/O). Reutiliza os tipos
// canônicos de context-envelope/cta-resolution/policy-gate — nenhum tipo de
// classificação, bloqueio, contexto ou CTA é duplicado aqui.
//
// Templates ativos (tabela TEMPLATES, um por intent; intent sem entrada na
// tabela bloqueia com unsupported_intent — nunca cai num texto genérico):
// - prepare_conversation (capacidade canônica prepare_safe_conversation,
//   ver docs/ai/florencia/CAPABILITY-MAP.md)
// - suggest_observation (momento Evoluir da trilha — o que observar no
//   piloto; claim CLAIM-LDR007-VOICE-002, contexto observar-evoluir)
// Escopo de ambos: Empresa × Liderança × Voz Segura.

import type { ResolvedFlorenciaContext, CtaResolution } from "./cta-resolution";
import type { PolicyGateResult } from "./policy-gate";
import type { ProductStatus } from "./context-envelope";

export interface FlorenciaResponseTemplateInput {
  context: ResolvedFlorenciaContext;
  cta: CtaResolution;
  policyGate: PolicyGateResult;
}

export type FlorenciaBlockReason =
  | "unsupported_intent"
  | "route_not_allowed"
  | "segment_not_allowed"
  | "profile_not_allowed"
  | "privacy_scope_not_aggregate"
  | "incomplete_contract"
  | "required_entity_missing"
  | "k_anonymity_not_satisfied"
  | "policy_gate_denied"
  | "claim_not_allowed";

export type FlorenciaTemplateId = "prepare-safe-conversation-v1" | "suggest-observation-v1";

export interface FlorenciaResponseAllowed {
  status: "allowed";
  templateId: FlorenciaTemplateId;
  title: string;
  summary: string;
  guidance: readonly string[];
  limitations: readonly string[];
  nextActionLabel: string;
  usedClaimIds: readonly string[];
  classification: ProductStatus;
}

export interface FlorenciaResponseBlocked {
  status: "blocked";
  reasonCode: FlorenciaBlockReason;
  safeMessage: string;
  usedClaimIds: readonly [];
}

export type FlorenciaResponseTemplateResult = FlorenciaResponseAllowed | FlorenciaResponseBlocked;

const REQUIRED_ROUTE = "/voz-segura";
const REQUIRED_SEGMENT = "enterprise";
const REQUIRED_PROFILE = "LEADERSHIP_FACILITATOR";
const REQUIRED_ENTITY_REF = "mechanism:MECH-VOICE-001";
const SAFE_ENTITY_REF_PATTERN = /^(mechanism|study):/;

// Não revela detalhes internos da política nem sugere contorno — mesma
// mensagem para qualquer motivo de bloqueio; o reasonCode carrega o detalhe
// para telemetria/depuração, nunca para a superfície.
const SAFE_BLOCK_MESSAGE = "Esta orientação não está disponível neste contexto.";

function blocked(reasonCode: FlorenciaBlockReason): FlorenciaResponseBlocked {
  return { status: "blocked", reasonCode, safeMessage: SAFE_BLOCK_MESSAGE, usedClaimIds: [] };
}

/**
 * Nunca inventa nem eleva — só repassa a classificação canônica já presente
 * no contexto resolvido (RawContextEnvelope.product_status, definida pelo
 * caller). Qualquer valor fora de REAL/PARCIAL/DEMO cai no fallback seguro
 * DEMO. O template nunca decide sozinho que uma capacidade é REAL.
 */
function resolveResponseClassification(context: ResolvedFlorenciaContext): ProductStatus {
  if (
    context.productStatus === "REAL" ||
    context.productStatus === "PARCIAL" ||
    context.productStatus === "DEMO"
  ) {
    return context.productStatus;
  }
  return "DEMO";
}

/**
 * Defesa em profundidade: nenhum entityRef pode referenciar granularidade
 * individual — só mechanism:/study: são agregados/institucionais por
 * desenho (mesma allowlist de cta-resolution.ts, re-verificada aqui). Este
 * template nunca exibe contagem de grupo — a checagem é sobre a FORMA do
 * contexto recebido, não sobre um número de participantes.
 */
function checkKAnonymitySafe(context: ResolvedFlorenciaContext): boolean {
  return context.entityRefs.every((ref) => SAFE_ENTITY_REF_PATTERN.test(ref));
}

interface TemplateSpec {
  templateId: FlorenciaTemplateId;
  /** Claim que DEVE sobreviver ao Policy Gate para o template renderizar. */
  requiredClaimId: string;
  summary: string;
  guidance: readonly string[];
  limitations: readonly string[];
  nextActionLabel: string;
}

// Todo texto abaixo é processo/procedimento — nunca afirma efeito além do
// safe_claim do claim requerido (usar textualmente ou mais fraco, nunca mais
// forte). Intent sem entrada aqui bloqueia com unsupported_intent.
const TEMPLATES: Record<string, TemplateSpec> = {
  prepare_conversation: {
    templateId: "prepare-safe-conversation-v1",
    requiredClaimId: "CLAIM-EDMONDSON1999-VOICE-002",
    summary:
      "Como preparar uma conversa para acolher o relato de um erro, risco ou preocupação, descrevendo fatos observáveis e evitando atribuição antecipada de culpa ou intenção.",
    guidance: [
      "Escolher um momento adequado e um ambiente com privacidade compatível com a conversa.",
      "Descrever o fato observável, sem atribuir intenção, culpa ou traço pessoal.",
      "Fazer uma pergunta aberta e oferecer tempo suficiente para a resposta.",
      "Confirmar o entendimento antes de responder, corrigir ou propor uma ação.",
      "Encerrar com um próximo passo claro, proporcional e acordado quando isso for possível.",
    ],
    limitations: [
      "Não substitui RH, SST, ouvidoria, canal de ética ou suporte especializado quando o caso exigir.",
      "Situações envolvendo assédio, violência, discriminação, risco relevante ou obrigação formal devem seguir os canais e protocolos competentes.",
      "A evidência científica utilizada é correlacional e não garante mudança de comportamento ou resultado organizacional.",
      "O roteiro não pode ser usado para avaliação de desempenho, promoção, punição, disciplina, seleção ou classificação individual.",
      "Este template não realiza diagnóstico clínico, jurídico ou individual.",
      "Nenhuma orientação pode revelar ou tentar inferir quem respondeu a uma pesquisa.",
    ],
    nextActionLabel: "Revisar o roteiro da conversa",
  },
  suggest_observation: {
    templateId: "suggest-observation-v1",
    requiredClaimId: "CLAIM-LDR007-VOICE-002",
    summary:
      "O que observar durante o piloto de rodadas: continuidade do ritual e indicadores de processo — sinais de funcionamento, sinais de alerta e o momento de parar.",
    guidance: [
      "Observar a continuidade do ritual (rodadas acontecendo semana após semana), não só a primeira ocorrência.",
      "Acompanhar apenas os indicadores de processo já registrados: rodadas realizadas, participação média, riscos levantados e decisões geradas.",
      "Tratar queda de participação como sinal para revisar o desenho com o time — nunca como falha de uma pessoa.",
      "Comparar o observado com a stop rule registrada no projeto e interrompê-lo quando ela for atingida.",
      "Levar a decisão de continuar, ajustar ou interromper para o registro do ciclo — a decisão é humana, nunca automática.",
    ],
    limitations: [
      "Indicadores de processo não medem saúde nem bem-estar — nenhuma conclusão clínica ou de adoecimento pode ser derivada deles.",
      "O efeito de intervenções de apoio do líder depende de adesão e contexto de implementação — observar adesão é extrapolação prudente do estudo original, não um indicador validado.",
      "Ausência de adesão não prova que a prática não funciona — é sinal de revisão do desenho, não veredito.",
      "Números de grupos pequenos não podem ser usados para identificar quem participou ou deixou de participar.",
      "Os indicadores nunca alimentam avaliação de desempenho, promoção, punição ou remuneração.",
      "Este template não realiza diagnóstico clínico, jurídico ou individual.",
    ],
    nextActionLabel: "Rever os indicadores desta seção",
  },
};

/**
 * Ordem dos guards é a ordem de checagem — cada um cobre exatamente um dos
 * cenários de bloqueio mapeados no contrato. Guards de rota/segmento/perfil/
 * privacidade/k-anon são comuns a todos os templates; claim requerido e
 * textos vêm da entrada do intent na tabela.
 */
export function buildResponseTemplate(
  input: FlorenciaResponseTemplateInput,
): FlorenciaResponseTemplateResult {
  const { context, cta, policyGate } = input;

  const spec = TEMPLATES[context.intent];
  if (!spec || cta.intent !== context.intent) {
    return blocked("unsupported_intent");
  }
  if (context.route !== REQUIRED_ROUTE) return blocked("route_not_allowed");
  if (context.segment !== REQUIRED_SEGMENT) return blocked("segment_not_allowed");
  if (context.profile !== REQUIRED_PROFILE) return blocked("profile_not_allowed");
  if (context.privacyScope !== "aggregate_only") return blocked("privacy_scope_not_aggregate");
  if (cta.requestedClaimIds.length === 0 || context.suggestedQuestions.length === 0) {
    return blocked("incomplete_contract");
  }
  if (!context.entityRefs.includes(REQUIRED_ENTITY_REF)) return blocked("required_entity_missing");
  if (!checkKAnonymitySafe(context)) return blocked("k_anonymity_not_satisfied");
  if (!policyGate.allowed) return blocked("policy_gate_denied");

  const usedClaimIds = cta.requestedClaimIds.filter((id) => policyGate.allowedClaimIds.includes(id));
  if (!usedClaimIds.includes(spec.requiredClaimId)) return blocked("claim_not_allowed");

  return {
    status: "allowed",
    templateId: spec.templateId,
    title: cta.label,
    summary: spec.summary,
    guidance: spec.guidance,
    limitations: spec.limitations,
    nextActionLabel: spec.nextActionLabel,
    usedClaimIds,
    classification: resolveResponseClassification(context),
  };
}
