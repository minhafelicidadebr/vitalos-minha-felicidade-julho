// Panorama engine — puro. Não computa métricas novas: SINTETIZA as saídas já
// produzidas pelos demais motores (IVO, priority, forecast, P&L, ESG, evidence,
// season) numa leitura executiva pronta para diretoria. Decide o tom, a métrica-
// herói, os pontos de prova e a única próxima ação. Nunca importa de domain/.
// É a Assinatura "compor, não acumular" levada ao nível de síntese.

export type PanoramaTone = "avancando" | "estavel" | "atencao" | "risco";

export interface PanoramaInput {
  // medir
  ivoScore: number;
  ivoDelta: number; // ciclo atual − anterior
  maturityName: string;
  respondents: number;
  participationPct: number;
  // agir
  topPriorityLabel: string | null;
  topPriorityOwner: string | null; // embaixadoria
  topPriorityLift: number;
  // projetar
  projectedIvo: number;
  projectedDelta: number; // projeção − atual
  avoidedCostLabel: string; // já formatado em R$ (locale fica na rota)
  // ESG
  esgNow: number | null;
  esgNext: number | null;
  // provar
  experimentsConcluded: number;
  experimentsConfirmed: number; // confirmado + superou
  // ritmo
  seasonName: string;
  phaseLabel: string;
}

export interface PanoramaMetric {
  id: string;
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "flat";
}

export interface PanoramaArcStep {
  id: "medir" | "agir" | "projetar" | "provar";
  label: string;
  headline: string;
  detail: string;
}

export interface ExecutivePanorama {
  tone: PanoramaTone;
  toneLabel: string;
  headline: string;
  heroMetrics: PanoramaMetric[];
  arc: PanoramaArcStep[];
  nextAction: string;
  proofLine: string;
  narrative: string;
}

const TONE_LABEL: Record<PanoramaTone, string> = {
  avancando: "Avançando",
  estavel: "Estável",
  atencao: "Atenção",
  risco: "Em risco",
};

function toneFor(input: PanoramaInput): PanoramaTone {
  if (input.ivoScore < 350) return "risco"; // abaixo de "Colaborativa"
  if (input.ivoDelta < 0) return "atencao"; // em queda
  if (input.ivoDelta >= 0 && input.projectedDelta > 0) return "avancando";
  return "estavel";
}

function trendFor(delta: number): "up" | "down" | "flat" {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function buildPanorama(input: PanoramaInput): ExecutivePanorama {
  const tone = toneFor(input);

  const headline = buildHeadline(tone, input);

  const heroMetrics: PanoramaMetric[] = [
    {
      id: "ivo",
      label: "IVO atual",
      value: String(input.ivoScore),
      sub: `${input.maturityName} · ${signed(input.ivoDelta)} vs. ciclo anterior`,
      trend: trendFor(input.ivoDelta),
    },
    {
      id: "projecao",
      label: "IVO projetado (1 ano)",
      value: String(input.projectedIvo),
      sub: `${signed(input.projectedDelta)} com o plano priorizado`,
      trend: trendFor(input.projectedDelta),
    },
    {
      id: "custo",
      label: "Custo evitável / ano",
      value: input.avoidedCostLabel,
      sub: "derivado do Δ IVO projetado",
    },
    {
      id: "esg",
      label: "Prontidão ESG (social)",
      value: input.esgNext !== null ? String(input.esgNext) : "—",
      sub:
        input.esgNow !== null && input.esgNext !== null
          ? `${signed(input.esgNext - input.esgNow)} vs. hoje`
          : "ESRS · ODS · GRI · FIB",
      trend:
        input.esgNow !== null && input.esgNext !== null
          ? trendFor(input.esgNext - input.esgNow)
          : "flat",
    },
  ];

  const arc: PanoramaArcStep[] = [
    {
      id: "medir",
      label: "Medir",
      headline: `IVO ${input.ivoScore}`,
      detail: `${input.respondents} respondentes · ${input.participationPct}% de participação · ${input.maturityName}`,
    },
    {
      id: "agir",
      label: "Agir",
      headline: input.topPriorityLabel ?? "Sem prioridade ativa",
      detail: input.topPriorityOwner
        ? `${input.topPriorityOwner} · +${input.topPriorityLift} pts de alavancagem`
        : `+${input.topPriorityLift} pts de alavancagem`,
    },
    {
      id: "projetar",
      label: "Projetar",
      headline: `${input.projectedIvo} em 1 ano`,
      detail: `${signed(input.projectedDelta)} pts · ${input.avoidedCostLabel} evitáveis/ano`,
    },
    {
      id: "provar",
      label: "Provar",
      headline: `${input.experimentsConfirmed}/${input.experimentsConcluded} confirmados`,
      detail:
        input.experimentsConcluded > 0
          ? "efeito medido por diferença-em-diferenças"
          : "primeiros experimentos a iniciar",
    },
  ];

  const nextAction = input.topPriorityLabel
    ? `Ativar “${input.topPriorityLabel}”${
        input.topPriorityOwner ? ` com ${input.topPriorityOwner}` : ""
      } — maior retorno por esforço neste momento.`
    : "Definir a primeira prioridade a partir do diagnóstico do IVO.";

  const proofLine =
    input.experimentsConcluded > 0
      ? `${input.experimentsConfirmed} de ${input.experimentsConcluded} experimentos confirmaram ou superaram a hipótese.`
      : "Nenhum experimento concluído ainda — a base de evidência começa agora.";

  const narrative = buildNarrative(input);

  return {
    tone,
    toneLabel: TONE_LABEL[tone],
    headline,
    heroMetrics,
    arc,
    nextAction,
    proofLine,
    narrative,
  };
}

function buildHeadline(tone: PanoramaTone, input: PanoramaInput): string {
  switch (tone) {
    case "avancando":
      return `A vitalidade avança: IVO ${input.ivoScore} (${signed(input.ivoDelta)}) e projeção de ${input.projectedIvo} com o plano em curso.`;
    case "estavel":
      return `Vitalidade estável em ${input.ivoScore} (${input.maturityName}); o plano priorizado abre espaço para ${input.projectedIvo}.`;
    case "atencao":
      return `Sinal de atenção: IVO recuou ${input.ivoDelta} no ciclo. A prioridade certa pode reverter para ${input.projectedIvo}.`;
    case "risco":
      return `Vitalidade em risco (IVO ${input.ivoScore}). Ação estruturada é urgente; o plano projeta ${input.projectedIvo}.`;
  }
}

function buildNarrative(input: PanoramaInput): string {
  const deltaPhrase =
    input.ivoDelta > 0
      ? `em alta de ${input.ivoDelta} pts`
      : input.ivoDelta < 0
        ? `em queda de ${Math.abs(input.ivoDelta)} pts`
        : "estável";

  const esgPhrase = input.esgNext !== null ? ` e uma prontidão ESG de ${input.esgNext}` : "";

  const proof =
    input.experimentsConcluded > 0
      ? ` ${input.experimentsConfirmed} de ${input.experimentsConcluded} experimentos já confirmaram efeito — a cultura está virando evidência auditável.`
      : " Os primeiros experimentos começam a transformar diagnóstico em prova.";

  return (
    `A ${input.seasonName}, na fase ${input.phaseLabel}, sustenta um IVO de ${input.ivoScore} ` +
    `(${input.maturityName}), ${deltaPhrase} frente ao ciclo anterior, com ${input.respondents} ` +
    `respondentes (${input.participationPct}% de participação). Com o plano priorizado, a projeção ` +
    `é de ${input.projectedIvo} em um ano, associada a ${input.avoidedCostLabel} de custo evitável` +
    `${esgPhrase}.${proof}`
  );
}
