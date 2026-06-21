// Contrato de edge function do Copiloto (ponte para a Fase 2).
//
// Hoje é um handler DETERMINÍSTICO (sem LLM): compõe registry → KB → métricas →
// answerCopilot e também monta o promptEnvelope que a Fase 2 enviaria a um modelo
// real (RAG-then-generate). O contrato {request, response} já é o definitivo: na
// Fase 2, troca-se apenas o "miolo" (gerar a partir do envelope) por uma chamada
// ao LLM via proxy seguro no servidor — sem expor chaves no cliente.

import { resolvePackBundle } from "@/domain/packs/registry";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { buildTrend, type TrendPoint } from "@/engine/trend/trend-engine";
import {
  answerCopilot,
  retrieveChunks,
  type CopilotPov,
  type CopilotTurn,
  type GroundingFacts,
} from "@/engine/ai/copilot-engine";
import { buildPromptEnvelope, type PromptEnvelope } from "@/engine/ai/copilot-prompt";
import { buildCopilotKnowledge } from "@/mocks/copilot-knowledge";
import { canSeeCollective } from "@/mocks/sector-audience";
import { getSectorData } from "@/mocks/sector-data";
import { MOMENTUM_COPY } from "@/mocks/trend-mock";

export interface CopilotRequest {
  packId: string;
  roleId: string;
  question: string;
  pov: CopilotPov;
}

export interface CopilotResponse {
  turn: CopilotTurn;
  /** Envelope que a Fase 2 enviaria ao LLM (prova de grounding). */
  envelope: PromptEnvelope;
  /** True quando a resposta tem fonte ou é uma recusa honesta — nunca "inventada". */
  grounded: boolean;
}

/** Computa as métricas agregadas do setor (o "mostre a conta"). */
function computeFacts(
  packId: string,
  index: Parameters<typeof calculateIVO>[1] | null,
): GroundingFacts {
  const sector = getSectorData(packId);
  const indexLabel = "índice";
  if (!index) {
    return {
      indexLabel,
      score: 0,
      maturityName: "—",
      momentumLabel: "—",
      slopePerCycle: 0,
      focusLensName: null,
      focusLensQuestion: null,
      participationRate: sector.org.participationRate,
      orgName: sector.org.name,
    };
  }
  const current = calculateIVO(sector.currentCycle, index);
  const points: TrendPoint[] = sector.trendCycles.map((c) => {
    const r = calculateIVO(c, index);
    return {
      cycleId: r.cycleId,
      label: r.cycleId,
      ivo: r.ivoScore,
      lenses: r.lenses.map((l) => ({ id: l.lensId, name: l.lensName, score: l.score })),
    };
  });
  const trend = buildTrend(points);
  const focus = [...current.lenses].sort((a, b) => a.score - b.score)[0] ?? null;
  return {
    indexLabel,
    score: current.ivoScore,
    maturityName: current.maturityLevel.name,
    momentumLabel: MOMENTUM_COPY[trend.momentum]?.label ?? "—",
    slopePerCycle: trend.slopePerCycle,
    focusLensName: focus ? (focus.lensName.split(" — ")[0] ?? focus.lensName) : null,
    focusLensQuestion: null,
    participationRate: sector.org.participationRate,
    orgName: sector.org.name,
  };
}

/**
 * Handler do turno do copiloto. Determinístico hoje; o contrato já é o da Fase 2.
 * Engine ≠ Domínio preservado: o KB é montado do pack resolvido e injetado.
 */
export function handleCopilotTurn(req: CopilotRequest): CopilotResponse {
  const bundle = resolvePackBundle(req.packId);
  const index = bundle.index ?? null;
  const kb = buildCopilotKnowledge(bundle.pack as never, index as never);
  const facts = { ...computeFacts(req.packId, index as never), indexLabel: kb.indexLabel };
  const canSee = canSeeCollective(req.packId, req.roleId);

  const query = { question: req.question, pov: req.pov, canSeeCollective: canSee };
  const turn = answerCopilot(kb, facts, query);
  const envelope = buildPromptEnvelope(kb, facts, query, retrieveChunks(kb, req.question));

  return {
    turn,
    envelope,
    grounded: turn.sources.length > 0 || turn.refusal !== null,
  };
}
