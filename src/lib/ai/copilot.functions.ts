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
import {
  buildLongitudinalReading,
  type LongitudinalReading,
} from "@/engine/ai/capsule-longitudinal-engine";
import type { MeasurementContextCapsule } from "@/engine/ai/measurement-capsule-engine";
import { buildCopilotKnowledge } from "@/mocks/copilot-knowledge";
import { canSeeCollective } from "@/mocks/sector-audience";
import { getSectorData } from "@/mocks/sector-data";
import { MOMENTUM_COPY } from "@/mocks/trend-mock";
import {
  getCapsuleHistory,
  getLatestCapsule,
  getInstrumentsWithHistory,
} from "@/mocks/capsule-history-mock";

/**
 * Compõe o contexto de MEDIÇÃO de um pack para o copiloto: o capsule mais recente
 * (estado corrente) e a leitura longitudinal (evolução), do instrumento de risco
 * (Domínio B) quando há histórico. Server-side: o capsule bruto NUNCA vai ao
 * cliente — só as linhas já redigidas no CopilotTurn. Em produção, lê do Cloud.
 */
function resolvePackMeasurement(packId: string): {
  capsule: MeasurementContextCapsule | undefined;
  longitudinal: LongitudinalReading | undefined;
} {
  // Prioriza o instrumento de risco (COPSOQ) se houver; senão, o primeiro disponível.
  const instruments = getInstrumentsWithHistory(packId);
  const instrument = instruments.includes("COPSOQ") ? "COPSOQ" : instruments[0];
  if (!instrument) return { capsule: undefined, longitudinal: undefined };

  const capsule = getLatestCapsule(packId, instrument) ?? undefined;
  const history = getCapsuleHistory(packId, instrument);
  let longitudinal: LongitudinalReading | undefined;
  if (history.length >= 2) {
    const result = buildLongitudinalReading({ capsules: history });
    if (result.ok) longitudinal = result.reading;
  }
  return { capsule, longitudinal };
}

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
  const facts = { ...computeFacts(req.packId, index as never), indexLabel: kb.indexLabel, origin: "demonstration" as const };
  const canSee = canSeeCollective(req.packId, req.roleId);

  const query = { question: req.question, pov: req.pov, canSeeCollective: canSee };
  const { capsule, longitudinal } = resolvePackMeasurement(req.packId);
  const turn = answerCopilot(kb, facts, query, capsule, longitudinal);
  const envelope = buildPromptEnvelope(kb, facts, query, retrieveChunks(kb, req.question));

  return {
    turn,
    envelope,
    // Aterrada se cita fonte do KB, recusa honestamente, OU ancora na medição real.
    grounded:
      turn.sources.length > 0 ||
      turn.refusal !== null ||
      !!turn.capsuleLine ||
      !!turn.longitudinalLine,
  };
}
