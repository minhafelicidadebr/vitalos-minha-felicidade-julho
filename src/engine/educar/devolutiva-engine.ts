// Devolutiva engine — puro. O eixo EDUCAR do M.E.T.E.: quando a onda fecha, ela
// não devolve só um número — devolve APRENDIZAGEM. Compõe o resultado já computado
// (índice + lente que brilha + lente-foco + próximo movimento) numa narrativa de
// quatro tempos (Medimos → Aprendemos → O que significa → Próximo passo), variando
// por audiência. Honestidade: só agregado publicado (n≥k); nunca expõe indivíduo,
// nunca promete. Nunca importa de domain/.

export type DevolutivaAudience = "coletivo" | "individual";

export interface DevolutivaLens {
  name: string;
  score: number;
  question?: string;
}

export interface DevolutivaInput {
  instrumentLabel: string;
  instrumentShort: string;
  season: string;
  indexLabel: string; // "IVO" / "IEV"
  indexScore: number;
  maturityName: string;
  momentumLabel: string; // "subindo" / "estável" / …
  highlightLens: DevolutivaLens | null; // a lente que mais brilha (celebrar)
  focusLens: DevolutivaLens | null; // a lente de menor score (agir)
  topMove: { label: string; lift: number } | null;
  /** Rota de aprendizagem (Academia) ligada ao instrumento. */
  learningRoute: string;
}

export interface DevolutivaBlock {
  kicker: string;
  title: string;
  body: string;
  cta?: { label: string; route: string };
}

export interface Devolutiva {
  audience: DevolutivaAudience;
  headline: string;
  blocks: DevolutivaBlock[];
  honestyNote: string;
}

const HONESTY_NOTE =
  "Leitura de dados agregados (n≥5) desta onda. Indicador mostra caminhos, não culpados; " +
  "tendência, não promessa. Sua resposta individual permanece invisível.";

export function buildDevolutiva(input: DevolutivaInput, audience: DevolutivaAudience): Devolutiva {
  const individual = audience === "individual";

  const blocks: DevolutivaBlock[] = [];

  // 1) Medimos — o instrumento da estação
  blocks.push({
    kicker: "Medimos",
    title: `${input.instrumentLabel} · estação ${input.season}`,
    body: individual
      ? "Sua voz entrou no agregado da comunidade e ajudou a formar a leitura abaixo."
      : `A onda aplicou ${input.instrumentShort} à comunidade e consolidou o ${input.indexLabel}.`,
  });

  // 2) Aprendemos — o número honesto
  blocks.push({
    kicker: "Aprendemos",
    title: `${input.indexLabel} ${input.indexScore} · ${input.maturityName}`,
    body: `A trajetória está ${input.momentumLabel}. Este é o retrato coletivo do ciclo — base para o que vem.`,
  });

  // 3) O que significa — onde brilha e onde focar
  const shine = input.highlightLens
    ? `${input.highlightLens.name} é onde a comunidade mais brilha (${input.highlightLens.score}).`
    : "";
  const focus = input.focusLens
    ? `${input.focusLens.name} é a lente mais aberta hoje${
        input.focusLens.question ? ` — “${input.focusLens.question}”` : ""
      }.`
    : "";
  blocks.push({
    kicker: "O que significa",
    title: "O que celebrar e o que cuidar",
    body: [shine, focus].filter(Boolean).join(" ") || "A leitura está equilibrada entre as lentes.",
  });

  // 4) Próximo passo — diverge por audiência (Transformar para a gestão; Aprender para a pessoa)
  if (individual) {
    blocks.push({
      kicker: "Próximo passo",
      title: "Leve para a sua prática",
      body: "Uma trilha curta ligada a esta lente ajuda a transformar o dado em hábito — no seu ritmo.",
      cta: { label: "Abrir a Academia", route: input.learningRoute },
    });
  } else {
    blocks.push({
      kicker: "Próximo passo",
      title: input.topMove
        ? `Ativar “${input.topMove.label}” (+${input.topMove.lift} pts esperados)`
        : "Definir a primeira intervenção",
      body: "A devolutiva vira ação: a maior alavancagem entra na fila de prioridades e no Culture Lab.",
      cta: { label: "Ir para Prioridades", route: "/prioridades" },
    });
  }

  const headline = individual
    ? "Obrigado por participar — eis o que a comunidade aprendeu com a sua ajuda."
    : "A onda fechou. Eis a leitura coletiva e o que ela pede a seguir.";

  return { audience, headline, blocks, honestyNote: HONESTY_NOTE };
}

// ─── Devolutiva de FORÇAS (VIA-T) — positiva, jamais diagnóstico/ranking ──────

export interface StrengthsDevolutivaInput {
  instrumentLabel: string;
  season: string;
  /** Força mais expressa na cultura (não "a melhor pessoa" — a força coletiva). */
  signatureStrength: { name: string; score: number } | null;
  topStrengths: Array<{ name: string; score: number }>;
  /** Força a CULTIVAR — enquadrada como oportunidade de crescimento, não déficit. */
  emergingStrength: { name: string; score: number } | null;
  developmentRoute: string;
}

// Guardrail VIA-T (verbatim do espírito do instrumento): exploratório, agregado,
// autodesenvolvimento — nunca diagnóstico, ranking de pessoas, seleção ou avaliação.
const STRENGTHS_HONESTY_NOTE =
  "VIA-T v1 exploratório — forças percebidas no trabalho, agregadas (n≥5) para " +
  "autodesenvolvimento e cultura. Não é diagnóstico, não é ranking de pessoas e não se usa " +
  "para seleção, promoção, remuneração ou desligamento.";

export function buildStrengthsDevolutiva(
  input: StrengthsDevolutivaInput,
  audience: DevolutivaAudience,
): Devolutiva {
  const individual = audience === "individual";
  const blocks: DevolutivaBlock[] = [];

  blocks.push({
    kicker: "Medimos",
    title: `${input.instrumentLabel} · estação ${input.season}`,
    body: individual
      ? "Sua percepção de forças entrou no mapa coletivo da cultura — sempre no agregado."
      : "A onda mapeou as forças de caráter percebidas no trabalho, de forma agregada.",
  });

  blocks.push({
    kicker: "Aprendemos",
    title: input.signatureStrength
      ? `Força assinatura da cultura: ${input.signatureStrength.name}`
      : "As forças que a cultura mais expressa",
    body: "É a força que a comunidade mais reconhece no dia a dia — um ativo para apoiar mudanças.",
  });

  const top = input.topStrengths
    .slice(0, 3)
    .map((s) => s.name)
    .join(", ");
  blocks.push({
    kicker: "O que significa",
    title: "Forças sobre as quais construir",
    body: top
      ? `A cultura se apoia em ${top}. Mudanças pegam mais rápido quando partem destas forças.`
      : "A cultura tem forças distribuídas — boa base para experimentar.",
  });

  blocks.push({
    kicker: "Próximo passo",
    title: input.emergingStrength
      ? `Cultivar ${input.emergingStrength.name} — a oportunidade de crescimento`
      : "Aplicar as forças em um projeto concreto",
    body: individual
      ? "Explore as suas forças e como exercê-las mais no trabalho — no seu ritmo, sem comparação."
      : "Desenhar uma ação que use as forças assinatura para desenvolver a força emergente.",
    cta: individual
      ? { label: "Explorar forças", route: input.developmentRoute }
      : { label: "Levar ao Culture Lab", route: "/lab" },
  });

  const headline = individual
    ? "Suas forças importam — veja o que a cultura reconhece e como crescer."
    : "O mapa de forças fechou. Eis sobre o que construir — e o que cultivar.";

  return { audience, headline, blocks, honestyNote: STRENGTHS_HONESTY_NOTE };
}
