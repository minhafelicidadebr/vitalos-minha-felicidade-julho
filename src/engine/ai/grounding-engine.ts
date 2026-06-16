// Grounding engine — puro. A prova de que a FlorescerIA "não inventa, lê os
// motores": recebe os números JÁ computados (IVO, trend, early-warning, priority)
// e os transforma numa resposta ESTRUTURADA E CITADA — cada afirmação ancorada a
// uma fonte navegável. Não chama modelo de linguagem, não fabrica fato: é
// composição honesta. Anti-alucinação por arquitetura. Nunca importa de domain/.

export interface GroundedPoint {
  claim: string; // o que a IA afirma
  evidence: string; // o número que sustenta (agregado, k≥5)
  sourceLabel: string; // fonte legível
  sourceRoute: string; // para onde o usuário confere
}

export interface GroundedAnswer {
  headline: string;
  points: GroundedPoint[];
  recommendation: { text: string; sourceRoute: string } | null;
  disclaimer: string;
}

export interface GroundingInput {
  ivoLabel: string;
  ivoScore: number;
  maturityName: string;
  momentumLabel: string;
  slopePerCycle: number;
  worstLens: { name: string; delta: number } | null;
  topAlert: { title: string; evidence: string } | null;
  topMove: { label: string; lift: number } | null;
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function buildGroundedAnswer(input: GroundingInput): GroundedAnswer {
  const points: GroundedPoint[] = [];

  points.push({
    claim: `A vitalidade agregada está em "${input.maturityName}".`,
    evidence: `${input.ivoLabel} ${input.ivoScore}/1000.`,
    sourceLabel: "IVO",
    sourceRoute: "/ivo",
  });

  points.push({
    claim: `A trajetória está ${input.momentumLabel}.`,
    evidence: `${signed(input.slopePerCycle)} pts/ciclo na curva longitudinal.`,
    sourceLabel: "Evolução",
    sourceRoute: "/evolucao",
  });

  if (input.worstLens && input.worstLens.delta < 0) {
    points.push({
      claim: `${input.worstLens.name} é a lente com a pior trajetória.`,
      evidence: `${signed(input.worstLens.delta)} pts no período.`,
      sourceLabel: "IVO · lentes",
      sourceRoute: "/ivo",
    });
  }

  if (input.topAlert) {
    points.push({
      claim: input.topAlert.title,
      evidence: input.topAlert.evidence,
      sourceLabel: "Vigilância",
      sourceRoute: "/copiloto",
    });
  }

  const recommendation = input.topMove
    ? {
        text: `Concentrar em "${input.topMove.label}" (+${input.topMove.lift} pts esperados).`,
        sourceRoute: "/prioridades",
      }
    : null;

  return {
    headline: "Lendo os motores, eis o que vejo neste ciclo — com a fonte de cada afirmação:",
    points,
    recommendation,
    disclaimer:
      "Resposta composta de dados agregados (k≥5). A FlorescerIA lê os motores e cita as fontes — " +
      "não inventa, não promete, e não substitui o seu julgamento.",
  };
}
