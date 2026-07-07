// Recibo Vivo — engine PURO (I-M2, Mensurar Vivo). "O fim que domina a memória"
// (Kahneman, pico-fim): o recibo pós-submissão evolui de "obrigado" genérico para a
// LINHA DO TEMPO DO DADO — o que acontece com a contribuição da pessoa, sempre
// agregado, nunca individual (captura cega, S3: zero campo de identidade).
//
// COMPOSIÇÃO: a jornada usa a MESMA máquina de estados real do S4
// (triggerCapsuleAggregation) — nunca inventa uma etapa nova. O resultado que já
// existe (`AggregationTriggerResult`, hoje descartado após o submit) vira a
// "frase de reciprocidade" (Gouldner, 1960): o primeiro ato de retribuição da
// instituição ao indivíduo é simplesmente dizer a verdade sobre o que aconteceu.
//
// HONESTIDADE (Fable 5 §8): a jornada NUNCA rastreia a contribuição individual —
// isso violaria a captura cega por arquitetura (S3). A frase de reciprocidade
// fala do estado AGREGADO da onda (quantas respostas, se a cápsula existe), nunca
// "sua resposta está aqui" — arquiteturalmente impossível de saber, e não deveria
// ser diferente.
//
// Engine ≠ Domínio: sem import de mocks, sem I/O. Determinístico.

export type JourneyStepId = "resposta" | "coletivo" | "capsula" | "devolutiva" | "plano";

export interface JourneyStep {
  id: JourneyStepId;
  label: string;
  /** true = esta etapa já é real neste momento (nunca promete o futuro como feito). */
  done: boolean;
}

/** k-anonimato mínimo de publicação — mesmo limiar de `count_wave_responses`/K_ANONYMITY_MIN em todo o app. */
export const RECEIPT_K_ANONYMITY_MIN = 5;

export type AggregationOutcome =
  | { triggered: true; participantCount: number }
  | { triggered: false; count: number };

export interface ReceiptJourneyInput {
  /** `null` quando o resultado da agregação ainda não é conhecido (chamada em andamento ou falhou — nunca inventa um número). */
  aggregation: AggregationOutcome | null;
}

export interface ReceiptJourney {
  steps: readonly JourneyStep[];
  /** Frase de reciprocidade — sempre sobre o agregado da onda, nunca sobre a contribuição individual. */
  reciprocityLine: string;
}

const STEP_ORDER: readonly JourneyStepId[] = ["resposta", "coletivo", "capsula", "devolutiva", "plano"];

const STEP_LABEL: Record<JourneyStepId, string> = {
  resposta: "Sua resposta",
  coletivo: "Soma ao coletivo",
  capsula: "Cápsula selada",
  devolutiva: "Devolutiva coletiva",
  plano: "Plano de ação",
};

function buildSteps(doneUpTo: JourneyStepId): JourneyStep[] {
  const doneIndex = STEP_ORDER.indexOf(doneUpTo);
  return STEP_ORDER.map((id, i) => ({ id, label: STEP_LABEL[id], done: i <= doneIndex }));
}

export function buildReceiptJourney(input: ReceiptJourneyInput): ReceiptJourney {
  const { aggregation } = input;

  if (aggregation?.triggered === true) {
    return {
      steps: buildSteps("capsula"),
      reciprocityLine:
        `Sua resposta faz parte de uma leitura coletiva de ${aggregation.participantCount} pessoas — ` +
        "os resultados já podem orientar decisões desta organização.",
    };
  }

  if (aggregation && !aggregation.triggered) {
    const remaining = Math.max(0, RECEIPT_K_ANONYMITY_MIN - aggregation.count);
    return {
      steps: buildSteps("coletivo"),
      reciprocityLine:
        remaining > 0
          ? `Sua resposta é uma das ${aggregation.count} já registradas nesta onda — faltam ` +
            `${remaining} para os resultados aparecerem (mínimo de ${RECEIPT_K_ANONYMITY_MIN}).`
          : "Sua resposta entrou no grupo — os resultados aparecem assim que a leitura for processada.",
    };
  }

  // aggregation === null: resultado ainda não conhecido — nunca inventa um número.
  return {
    steps: buildSteps("coletivo"),
    reciprocityLine:
      `Sua resposta foi registrada e já soma ao coletivo — os resultados aparecem quando ` +
      `${RECEIPT_K_ANONYMITY_MIN}+ pessoas responderem.`,
  };
}
