// Fronteira server-only do Selo EARNED — a certificação GANHA, não comprada.
//
// Hoje a /selo alimenta `domainBReady` com uma CONSTANTE hardcoded (DOMAIN_B_READY).
// Aqui, esse critério e a contagem de experimentos confirmados FLUEM da Prova de
// Ciclo real: o selo só reconhece o Domínio B quando há evidência de eficácia medida.
// "Empresa Viva" deixa de ser declarada e passa a ser COMPUTADA do arco.
//
// COMPOSIÇÃO (Fable 5 §5.1):
//   cycle-proof.server (buildCycleProof) → evidência NR-1 real        [composto]
//   certification-engine.certify         → elegibilidade do selo       [reuso]
//   IVO + participação + consentimento (mesmas fontes da /selo)        [fonte única]
//
// Server-only: retorna só o resultado do selo + a proveniência (como foi ganho).
// Determinístico. Em produção (Fase 2): dados do Cloud com RLS por org.

import {
  certify,
  DEFAULT_CERT_CONFIG,
  type CertificationResult,
} from "@/engine/certification/certification-engine";
import { buildCycleProof, type CycleProofVerdict } from "./cycle-proof.server";
import { resolvePackBundle } from "@/domain/packs/registry";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { ivoCurrentCycle, ivoPreviousCycle } from "@/mocks/ivo-mock";
import { PARTICIPATION } from "@/mocks/rh-mock";
import { CONSENT_CHANNELS } from "@/mocks/consent-mock";

export interface EarnedSeal {
  packId: string;
  seal: CertificationResult;
  // ── Proveniência: como o Domínio B foi GANHO (rastreável à Prova de Ciclo) ──
  cycleVerdict: CycleProofVerdict;
  domainBReady: boolean;
  interventionsWithEffect: number;
  attributableReductionPts: number;
  avoidedCostYear: number | null;
  /** Frase auditável de como o critério de Domínio B foi conquistado (ou não). */
  provenanceNote: string;
}

/**
 * Deriva o estado de prontidão do Domínio B da Prova de Ciclo. Ganho quando o ciclo
 * é "comprovado" ou "parcial" COM redução atribuível positiva — nunca por constante.
 */
function domainBEarnedFromProof(
  verdict: CycleProofVerdict,
  attributableReductionPts: number,
): boolean {
  if (verdict === "comprovado") return true;
  if (verdict === "parcial" && attributableReductionPts > 0) return true;
  return false;
}

/**
 * Monta o Selo Empresa Viva GANHO de um pack: compõe a Prova de Ciclo (Domínio B real)
 * com o IVO (Domínio A) e os critérios de confiança, e computa a elegibilidade.
 */
export function buildEarnedSeal(packId: string): EarnedSeal {
  const proof = buildCycleProof(packId);
  const domainBReady = domainBEarnedFromProof(proof.verdict, proof.attributableReductionPts);

  const index = resolvePackBundle(packId).index ?? null;
  const current = index ? calculateIVO(ivoCurrentCycle, index) : null;
  const previous = index ? calculateIVO(ivoPreviousCycle, index) : null;

  // Cobertura de consentimento ≈ canal de percepção (pulses), o Trust Ledger ativo.
  const consentCoveragePct = CONSENT_CHANNELS.find((c) => c.id === "pulses")?.orgConsentPct ?? 0;

  const seal = certify(
    {
      ivoScore: current?.ivoScore ?? 0,
      previousIvoScore: previous?.ivoScore ?? 0,
      participationPct: PARTICIPATION.overallPct,
      // Os dois critérios GANHOS da Prova de Ciclo (antes hardcoded):
      experimentsConfirmed: proof.interventionsWithEffect,
      domainBReady,
      consentCoveragePct,
      kAnonRespected: true, // invariante de arquitetura
    },
    DEFAULT_CERT_CONFIG,
  );

  return {
    packId,
    seal,
    cycleVerdict: proof.verdict,
    domainBReady,
    interventionsWithEffect: proof.interventionsWithEffect,
    attributableReductionPts: proof.attributableReductionPts,
    avoidedCostYear: proof.preventionRoi?.avoidedCostYear ?? null,
    provenanceNote: buildProvenanceNote(proof.verdict, domainBReady, proof.interventionsWithEffect),
  };
}

function buildProvenanceNote(
  verdict: CycleProofVerdict,
  domainBReady: boolean,
  withEffect: number,
): string {
  if (domainBReady) {
    return `Domínio B GANHO: Prova de Ciclo "${verdict}" com ${withEffect} intervenção(ões) de efeito atribuível medido. O selo reconhece evidência, não declaração.`;
  }
  if (verdict === "sem_dados") {
    return "Domínio B pendente: sem ≥2 ciclos medidos para provar eficácia. O selo aguarda evidência longitudinal.";
  }
  return "Domínio B pendente: nenhuma intervenção mostrou efeito atribuível além do drift. O selo não reconhece atividade sem prova.";
}
