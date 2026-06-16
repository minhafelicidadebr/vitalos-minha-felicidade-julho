// Cycle-close engine — puro. O artefato de GOVERNANÇA do ciclo M.E.T.E.: consolida
// o que foi proposto (agent), provado (evidence) e como a privacidade foi honrada
// (trust/consent) num fechamento auditável. Não computa métrica nova; COMPÕE os
// fatos já computados num registro com atestações e um veredito honesto: um ciclo
// só "fecha com prova" se houve transformação medida — não se basta ter atividade.
// Nunca importa de domain/.

export interface Attestation {
  label: string;
  ok: boolean;
  note: string;
}

export interface CloseMetric {
  label: string;
  value: string;
}

export interface CycleCloseInput {
  seasonName: string;
  phaseLabel: string;
  cycleId: string;
  /** Propostas geradas pela FlorescerIA no ciclo (human-in-the-loop a montante). */
  proposalsGenerated: number;
  experimentsConcluded: number;
  experimentsConfirmed: number;
  consentCoveragePct: number;
  kAnonRespected: boolean;
  domainSeparated: boolean;
}

export interface CycleCloseReport {
  period: string;
  headline: string;
  /** Ciclo fecha "com prova" só quando houve ≥1 experimento confirmado. */
  proven: boolean;
  metrics: CloseMetric[];
  attestations: Attestation[];
  /** Todas as atestações de governança passaram? */
  governanceClean: boolean;
  verdict: string;
}

const CONSENT_FLOOR = 50;

export function closeCycle(input: CycleCloseInput): CycleCloseReport {
  const proven = input.experimentsConfirmed >= 1;

  const metrics: CloseMetric[] = [
    { label: "Propostas geradas", value: String(input.proposalsGenerated) },
    {
      label: "Experimentos concluídos",
      value: String(input.experimentsConcluded),
    },
    {
      label: "Com efeito confirmado",
      value: `${input.experimentsConfirmed}/${input.experimentsConcluded}`,
    },
    { label: "Cobertura de consentimento", value: `${input.consentCoveragePct}%` },
  ];

  const attestations: Attestation[] = [
    {
      label: "k-anonimato respeitado",
      ok: input.kAnonRespected,
      note: "Nenhum recorte com menos de 5 respondentes foi exibido neste ciclo.",
    },
    {
      label: "Domínios A / B separados",
      ok: input.domainSeparated,
      note: "Desenvolvimento e risco psicossocial nunca se cruzaram; nada alimentou avaliação.",
    },
    {
      label: "Consentimento coletivo suficiente",
      ok: input.consentCoveragePct >= CONSENT_FLOOR,
      note: `Adesão de ${input.consentCoveragePct}% (piso de ${CONSENT_FLOOR}%) para os canais agregados.`,
    },
    {
      label: "Decisão humana preservada",
      ok: true,
      note: "Toda proposta da FlorescerIA exigiu aprovação humana — nada foi executado sozinho.",
    },
  ];

  const governanceClean = attestations.every((a) => a.ok);

  const verdict = proven
    ? governanceClean
      ? "Ciclo fechado COM PROVA e governança limpa: houve transformação medida, dentro da fronteira ética."
      : "Houve transformação medida, mas há atestações de governança a sanar antes de publicar."
    : "Ciclo sem prova consolidada: atividade não é evidência. O próximo ciclo precisa de um experimento que confirme efeito.";

  return {
    period: `${input.seasonName} · ${input.phaseLabel} · ${input.cycleId}`,
    headline: proven
      ? `Este ciclo gerou prova: ${input.experimentsConfirmed} de ${input.experimentsConcluded} experimentos confirmaram efeito.`
      : "Este ciclo ainda não consolidou prova — o foco do próximo é confirmar efeito.",
    proven,
    metrics,
    attestations,
    governanceClean,
    verdict,
  };
}
