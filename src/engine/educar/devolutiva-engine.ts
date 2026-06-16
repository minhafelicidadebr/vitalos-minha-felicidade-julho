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
