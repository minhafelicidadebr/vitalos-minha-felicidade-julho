/**
 * Prompt envelope — a ponte determinística para a Fase 2 (RAG-then-generate).
 *
 * Hoje (Fase 1) o copiloto responde sem LLM (answerCopilot). Esta função monta o
 * MESMO aterramento no formato que um LLM real consumiria na Fase 2: um envelope
 * {system, context, user} onde `context` contém SOMENTE os chunks recuperados (com
 * fontes) e, quando permitido, as métricas computadas. É a garantia estrutural de
 * que o modelo da Fase 2 recebe grounding — não inventa. Puro e testável.
 */

import type {
  CopilotKnowledgeBase,
  CopilotQuery,
  GroundingFacts,
  ScoredChunk,
} from "./copilot-engine";

export interface PromptEnvelope {
  /** Instrução de sistema: persona + guardrails invioláveis. */
  system: string;
  /** Contexto recuperado (fontes citáveis) + métricas, quando permitido. */
  context: string;
  /** Mensagem do usuário, com o ponto de vista pedido. */
  user: string;
}

const POV_INSTRUCTION: Record<CopilotQuery["pov"], string> = {
  tecnico: "Responda do ponto de vista técnico: dados e método, citando as fontes.",
  criativo: "Responda do ponto de vista criativo: ângulos e possibilidades, sem inventar fatos.",
  empatico: "Responda do ponto de vista empático: as pessoas antes dos números.",
  inovador: "Responda do ponto de vista inovador: proponha um experimento mensurável.",
};

export function buildPromptEnvelope(
  kb: CopilotKnowledgeBase,
  facts: GroundingFacts,
  query: CopilotQuery,
  retrieved: ScoredChunk[],
): PromptEnvelope {
  const canSeeCollective = query.canSeeCollective !== false;

  const system = [
    `Você é uma copilota do VitalOS para o ${kb.indexFull} (${kb.indexLabel}).`,
    "REGRAS INVIOLÁVEIS:",
    "1. Responda SOMENTE a partir do CONTEXTO abaixo. Se não estiver no contexto, diga que não sabe.",
    "2. Cite a fonte de cada afirmação.",
    "3. Nunca revele dados individuais, nunca faça ranking de pessoas, nunca alimente avaliação de desempenho, promoção, punição ou credenciamento.",
    "4. Não faça diagnóstico clínico nem substitua profissional habilitado.",
    "Identifique dados sintéticos como demonstração. Para explicar efeito de uma ação, distinga execução, mudança observada e avaliação de efeito.",
    canSeeCollective
      ? "5. Você pode citar os números agregados do índice."
      : "5. NÃO revele os números do índice (interlocutor sem leitura coletiva); fale de forma geral.",
  ].join("\n");

  const sourceLines = retrieved.map((h) => `- [${h.chunk.source}] ${h.chunk.body}`);
  const metricLine = canSeeCollective
    ? `MÉTRICAS (${facts.origin === "demonstration" ? "exemplo sintético de demonstração" : "agregadas"}): ${facts.indexLabel}=${facts.score} (${facts.maturityName}); momentum=${facts.momentumLabel} (${facts.slopePerCycle >= 0 ? "+" : ""}${facts.slopePerCycle}/ciclo); participação=${facts.participationRate}%${
        facts.focusLensName ? `; foco=${facts.focusLensName}` : ""
      }.`
    : "MÉTRICAS: ocultas para este interlocutor (sem leitura coletiva).";

  const context = `CONTEXTO RECUPERADO (use apenas isto):\n${
    sourceLines.length ? sourceLines.join("\n") : "- (nenhuma fonte relevante encontrada)"
  }\n${metricLine}`;

  const user = `PERGUNTA: ${query.question}\n${POV_INSTRUCTION[query.pov]}`;

  return { system, context, user };
}
