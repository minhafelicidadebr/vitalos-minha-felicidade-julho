// Certification engine — puro. Computa a elegibilidade ao Selo Empresa Viva a
// partir do ARCO inteiro (IVO, evidência, consentimento, NR-1), não de um badge
// hardcoded. Princípio Fable 5: o selo não se compra — exige PROVA real. O
// critério-âncora é "transformação comprovada" (um experimento que funcionou):
// é o que faz o auditor/investidor/candidato confiarem. Nunca importa de domain/.

export type CriterionStatus = "cumprido" | "parcial" | "nao_cumprido";

export type SealTier = "nao_elegivel" | "em_jornada" | "empresa_viva" | "referencia";

export interface CertificationInput {
  ivoScore: number;
  previousIvoScore: number; // ciclo anterior (para "sustentado em 2 temporadas")
  participationPct: number;
  experimentsConfirmed: number; // do evidence-engine (confirmado/superou)
  domainBReady: boolean; // trilha GRO/NR-1 com evidências
  consentCoveragePct: number; // adesão do Trust Ledger
  kAnonRespected: boolean;
}

export interface CertConfig {
  maturityMin: number; // faixa mínima para o selo (ex.: 650 "Sustentável")
  minParticipation: number;
  minExperiments: number;
  minConsentCoverage: number;
}

export const DEFAULT_CERT_CONFIG: CertConfig = {
  maturityMin: 650,
  minParticipation: 70,
  minExperiments: 1,
  minConsentCoverage: 80,
};

export interface CriterionResult {
  id: string;
  label: string;
  essential: boolean;
  status: CriterionStatus;
  value: string; // o que foi medido
  target: string; // o alvo
  note: string;
}

export interface CertificationResult {
  tier: SealTier;
  tierLabel: string;
  granted: boolean; // o selo está concedido?
  criteria: CriterionResult[];
  essentialMet: number;
  essentialTotal: number;
  gaps: string[]; // o que falta para conquistar/elevar o selo
}

const TIER_LABEL: Record<SealTier, string> = {
  nao_elegivel: "Ainda não elegível",
  em_jornada: "Em jornada",
  empresa_viva: "Empresa Viva",
  referencia: "Empresa Viva · Referência",
};

export function certify(
  input: CertificationInput,
  config: CertConfig = DEFAULT_CERT_CONFIG,
): CertificationResult {
  const criteria: CriterionResult[] = [];

  // C1 — Medição viva (essencial): mede em ≥2 ciclos + participação.
  const measured = input.ivoScore > 0 && input.previousIvoScore > 0;
  const c1: CriterionStatus = !measured
    ? "nao_cumprido"
    : input.participationPct >= config.minParticipation
      ? "cumprido"
      : "parcial";
  criteria.push({
    id: "medicao_viva",
    label: "Medição viva em 2 ciclos",
    essential: true,
    status: c1,
    value: `${measured ? "2 ciclos" : "1 ciclo"} · participação ${input.participationPct}%`,
    target: `≥ 2 ciclos · participação ≥ ${config.minParticipation}%`,
    note:
      c1 === "cumprido"
        ? "A vitalidade é medida com continuidade e adesão suficiente."
        : "Medir em ciclos consecutivos com participação alta sustenta a comparação.",
  });

  // C2 — Maturidade sustentada (essencial): IVO na faixa em 2 temporadas.
  const bothInRange =
    input.ivoScore >= config.maturityMin && input.previousIvoScore >= config.maturityMin;
  const c2: CriterionStatus = bothInRange
    ? "cumprido"
    : input.ivoScore >= config.maturityMin || input.ivoScore >= config.maturityMin - 50
      ? "parcial"
      : "nao_cumprido";
  criteria.push({
    id: "maturidade",
    label: `IVO ≥ ${config.maturityMin} sustentado`,
    essential: true,
    status: c2,
    value: `IVO ${input.ivoScore} (anterior ${input.previousIvoScore})`,
    target: `≥ ${config.maturityMin} por 2 temporadas`,
    note: bothInRange
      ? "Maturidade na faixa, sustentada entre temporadas."
      : input.ivoScore >= config.maturityMin
        ? "1ª temporada na faixa — falta sustentar no próximo ciclo."
        : `Faltam ${Math.max(0, config.maturityMin - input.ivoScore)} pts para entrar na faixa.`,
  });

  // C3 — Transformação comprovada (essencial, âncora): experimento com efeito.
  const c3: CriterionStatus =
    input.experimentsConfirmed >= config.minExperiments ? "cumprido" : "nao_cumprido";
  criteria.push({
    id: "transformacao",
    label: "Transformação comprovada",
    essential: true,
    status: c3,
    value: `${input.experimentsConfirmed} experimento(s) com efeito medido`,
    target: `≥ ${config.minExperiments} confirmado no Culture Lab`,
    note:
      c3 === "cumprido"
        ? "Pelo menos uma intervenção funcionou nesta cultura, com efeito medido — não discurso."
        : "O selo exige prova: um experimento concluído com efeito confirmado.",
  });

  // C4 — Risco psicossocial endereçado (NR-1/GRO) — eleva ao tier Referência.
  const c4: CriterionStatus = input.domainBReady ? "cumprido" : "nao_cumprido";
  criteria.push({
    id: "risco_nr1",
    label: "Risco psicossocial endereçado (NR-1)",
    essential: false,
    status: c4,
    value: input.domainBReady ? "Trilha GRO com evidências" : "Trilha GRO pendente",
    target: "GRO/PGR com evidências organizadas",
    note: input.domainBReady
      ? "Domínio B preparado, com rastro auditável para o profissional habilitado."
      : "Organizar a trilha GRO eleva o selo ao nível Referência.",
  });

  // C5 — Confiança e consentimento — eleva ao tier Referência.
  const c5: CriterionStatus = !input.kAnonRespected
    ? "nao_cumprido"
    : input.consentCoveragePct >= config.minConsentCoverage
      ? "cumprido"
      : "parcial";
  criteria.push({
    id: "confianca",
    label: "Confiança e consentimento ativos",
    essential: false,
    status: c5,
    value: `consentimento ${input.consentCoveragePct}% · k-anonimato ${input.kAnonRespected ? "ok" : "violado"}`,
    target: `consentimento ≥ ${config.minConsentCoverage}% · k-anon sempre`,
    note:
      c5 === "cumprido"
        ? "Trust Ledger ativo e privacidade preservada por arquitetura."
        : "Ampliar a adesão ao consentimento fortalece a confiança e o selo.",
  });

  const essentials = criteria.filter((c) => c.essential);
  const essentialMet = essentials.filter((c) => c.status === "cumprido").length;
  const allEssentialMet = essentialMet === essentials.length;
  const allMet = criteria.every((c) => c.status === "cumprido");

  let tier: SealTier;
  if (allMet) tier = "referencia";
  else if (allEssentialMet) tier = "empresa_viva";
  else if (c1 !== "nao_cumprido") tier = "em_jornada";
  else tier = "nao_elegivel";

  const granted = tier === "empresa_viva" || tier === "referencia";

  const gaps = criteria
    .filter((c) => c.status !== "cumprido")
    .map((c) => `${c.essential ? "[essencial] " : ""}${c.label}: ${c.note}`);

  return {
    tier,
    tierLabel: TIER_LABEL[tier],
    granted,
    criteria,
    essentialMet,
    essentialTotal: essentials.length,
    gaps,
  };
}
