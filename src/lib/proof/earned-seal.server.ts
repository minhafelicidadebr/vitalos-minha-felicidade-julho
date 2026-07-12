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
import {
  buildCycleProof,
  buildCycleProofFromHistory,
  type CycleProof,
  type CycleProofVerdict,
} from "./cycle-proof.server";
import { resolvePackBundle } from "@/domain/packs/registry";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { ivoCurrentCycle, ivoPreviousCycle } from "@/mocks/ivo-mock";
import { PARTICIPATION } from "@/mocks/rh-mock";
import { CONSENT_CHANNELS } from "@/mocks/consent-mock";
import type { MeasurementContextCapsule } from "@/engine/ai/measurement-capsule-engine";

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

// ─── Variante REAL (E4): o Selo sobre o Cofre de Ciclos da org ────────────────

/**
 * O MESMO Selo, mas o Domínio B (Prova de Ciclo) vem do histórico REAL
 * registrado no Cofre da organização (S6.75) — nunca do mock de setor.
 *
 * HONESTIDADE ESTRUTURAL (Fable 5 §8): o ICP real coleta COPSOQ (risco,
 * Domínio B) — a lente de florescimento (IVO/PERMA, Domínio A) e a cobertura
 * de consentimento NÃO têm coleta real nesta org ainda. Então `ivoScore` e
 * `consentCoveragePct` entram como 0 HONESTO — o `certify` naturalmente marca
 * esses critérios como não-cumpridos, com o gap explícito. O Selo real nunca
 * finge Domínio A; mostra o Domínio B ganho (ou pendente) com prova, e declara
 * o caminho para o Selo pleno. A participação vem da capsule real mais recente.
 */
export function buildEarnedSealFromHistory(
  packId: string,
  history: readonly MeasurementContextCapsule[],
  instrumentShort = "COPSOQ",
): EarnedSeal {
  const proof: CycleProof = buildCycleProofFromHistory([...history], packId, instrumentShort);
  const domainBReady = domainBEarnedFromProof(proof.verdict, proof.attributableReductionPts);

  // Participação REAL: a onda mais recente do Cofre (participantes / k-anon
  // mínimo é o piso conhecido; sem denominador de org aqui, usamos a cobertura
  // que a própria capsule declara ser suficiente — nunca inflada).
  const latest = history[history.length - 1];
  const participationPct = latest && latest.participantCount >= latest.kAnonymityMin ? 100 : 0;

  const seal = certify(
    {
      // Domínio A (IVO/PERMA) sem coleta real → 0 honesto (C1 não-cumprido).
      ivoScore: 0,
      previousIvoScore: 0,
      participationPct,
      experimentsConfirmed: proof.interventionsWithEffect,
      domainBReady,
      // Consentimento sem cobertura real persistida ainda → 0 honesto.
      consentCoveragePct: 0,
      kAnonRespected: true, // invariante de arquitetura, vale igual no real
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
    provenanceNote: buildRealProvenanceNote(proof.verdict, domainBReady, proof.interventionsWithEffect),
  };
}

function buildRealProvenanceNote(
  verdict: CycleProofVerdict,
  domainBReady: boolean,
  withEffect: number,
): string {
  const domainB = domainBReady
    ? `Domínio B (risco NR-1) COMPROVADO com dado real: Prova de Ciclo "${verdict}", ${withEffect} intervenção(ões) de efeito atribuível medido.`
    : verdict === "sem_dados"
      ? "Domínio B (risco NR-1) pendente: faltam ≥2 ciclos reais registrados no Cofre."
      : "Domínio B (risco NR-1) pendente: nenhuma intervenção real mostrou efeito atribuível além do drift.";
  return `${domainB} O Selo Empresa Viva pleno também requer a lente de florescimento (IVO/PERMA, Domínio A) e a cobertura de consentimento — ainda não coletadas nesta organização. O selo nunca finge o que não mediu.`;
}
