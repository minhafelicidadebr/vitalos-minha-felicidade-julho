// Fronteira server-only do BOARD BRIEF — o arco inteiro lido pelos cinco céticos.
//
// Arquitetura narrativa (Fable 5 §5.6) feita literal: cada cético fundador tem sua
// dúvida, e cada dúvida é respondida por um NÚMERO REAL do arco (Prova de Ciclo +
// Selo ganho). Não há frase de marketing — só evidência lastreada.
//
// COMPOSIÇÃO (Fable 5 §5.1 — compor, não acumular; capstone dos capstones):
//   cycle-proof.server (buildCycleProof) → medir/provar/custo   [composto]
//   earned-seal.server (buildEarnedSeal) → certificação ganha    [composto]
//   → BoardBrief: a leitura única que o /panorama renderiza
//
// Server-only, determinístico. Em produção (Fase 2): dados do Cloud com RLS por org.

import { buildCycleProof } from "./cycle-proof.server";
import { buildEarnedSeal } from "./earned-seal.server";

export type SkepticId = "chro" | "cfo" | "auditor" | "colaborador" | "investidor";

export interface SkepticVerdict {
  id: SkepticId;
  persona: string;
  /** A dúvida que esse cético precisa ver respondida. */
  doubt: string;
  /** A resposta, ancorada no dado. */
  answer: string;
  /** O número/fato concreto que sustenta a resposta. */
  metric: string;
  /** A evidência existe? (false = ainda em jornada, honesto). */
  satisfied: boolean;
}

export interface BoardBrief {
  packId: string;
  headline: string;
  cycleVerdict: string;
  sealTier: string;
  sealTierLabel: string;
  skeptics: SkepticVerdict[];
  /** Quantos dos 5 céticos têm a evidência satisfeita. */
  satisfiedCount: number;
  disclaimer: string;
}

const DISCLAIMER =
  "Síntese de board: associações orientativas (indicativas), não causalidade; custos são " +
  "estimativas com fórmula visível, não promessas; agregados protegidos (k-anonimato).";

/**
 * Monta o Board Brief de um pack: compõe a Prova de Ciclo e o Selo ganho numa
 * leitura por cético, cada veredicto lastreado num número real.
 */
export function buildBoardBrief(packId: string): BoardBrief {
  const proof = buildCycleProof(packId);
  const earned = buildEarnedSeal(packId);

  const measured = proof.cycleCount >= 2;
  const hasRoi = (proof.preventionRoi?.avoidedCostYear ?? 0) > 0;
  const sealEarned = earned.seal.tier !== "nao_elegivel";

  const skeptics: SkepticVerdict[] = [
    {
      id: "chro",
      persona: "CHRO",
      doubt: "Isso mede algo real, ou é mais uma pesquisa de clima?",
      answer: measured
        ? `Medição viva em ${proof.cycleCount} ciclos: ${proof.improvedDimensions} dimensões melhoraram, ${proof.worsenedDimensions} pioraram — sem maquiar.`
        : "Ainda não há ciclos suficientes para uma leitura longitudinal.",
      metric: measured
        ? `${proof.cycleLabels.join(" → ")} · direção ${proof.overallDirection ?? "—"}`
        : "0 ciclos comparáveis",
      satisfied: measured,
    },
    {
      id: "cfo",
      persona: "CFO",
      doubt: "Qual o custo disso para o negócio?",
      answer: hasRoi
        ? `Redução de exposição atribuível evita custo de prevenção estimado — com a conta visível, cenário médio.`
        : "Sem redução atribuível medida, não há custo evitado a declarar (honesto).",
      metric: hasRoi
        ? `R$ ${proof.preventionRoi!.avoidedCostYear.toLocaleString("pt-BR")}/ano evitado`
        : "R$ 0 (sem efeito atribuível)",
      satisfied: hasRoi,
    },
    {
      id: "auditor",
      persona: "Auditor NR-1",
      doubt: "Isso sustenta uma auditoria de risco psicossocial?",
      answer: earned.domainBReady
        ? `Domínio B com evidência de eficácia medida; dossiê GRO/PGR montado da mesma fonte das telas.`
        : "Domínio B ainda sem eficácia comprovada — o sistema não declara o que não provou.",
      metric: `${proof.interventionsWithEffect} intervenção(ões) com efeito atribuível`,
      satisfied: earned.domainBReady,
    },
    {
      id: "colaborador",
      persona: "Colaborador",
      doubt: "Minha resposta me expõe?",
      answer:
        "Nunca. Agregados protegidos por k-anonimato (≥5); identidade invisível por desenho; recorte pequeno é suprimido, não mostrado.",
      metric: "k-anonimato ≥ 5 imposto no servidor",
      satisfied: true, // invariante de arquitetura
    },
    {
      id: "investidor",
      persona: "Investidor",
      doubt: "Há categoria nova com moat defensável?",
      answer: sealEarned
        ? `Selo "${earned.seal.tierLabel}" — computado do arco, não comprado. O moat é a prova longitudinal de eficácia.`
        : "Selo ainda não elegível — a certificação é ganha, e a evidência segue em construção.",
      metric: `Selo: ${earned.seal.tierLabel}`,
      satisfied: sealEarned,
    },
  ];

  const satisfiedCount = skeptics.filter((s) => s.satisfied).length;

  return {
    packId,
    headline: buildHeadline(satisfiedCount, proof.cycleCount, earned.seal.tierLabel),
    cycleVerdict: proof.verdict,
    sealTier: earned.seal.tier,
    sealTierLabel: earned.seal.tierLabel,
    skeptics,
    satisfiedCount,
    disclaimer: DISCLAIMER,
  };
}

function buildHeadline(satisfied: number, cycleCount: number, sealLabel: string): string {
  if (cycleCount < 2) {
    return "Arco em construção: faltam ciclos para a prova longitudinal de board.";
  }
  return `${satisfied}/5 céticos com evidência satisfeita · Selo "${sealLabel}". O arco medir→provar→custo→selo, lastreado em dado real.`;
}
