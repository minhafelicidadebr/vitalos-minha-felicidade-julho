import {
  aggregateFibt,
  FIBT_K_MIN,
  type FibtItemResponse,
  type FibtResult,
} from "@/engine/fibt/fibt-engine";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { fibtInstrumentDef } from "./fibt-cohort-report";

export type ManagerAnalytics =
  | {
      state: "available";
      countLabel: string;
      n: number;
      result: FibtResult;
    }
  | {
      state: "suppressed";
      countLabel: string;
      kMin: number;
      message: string;
    }
  | {
      state: "no_data";
      countLabel: "0";
      message: string;
    }
  | {
      state: "error";
      countLabel: "Indisponível";
      message: string;
    };

export interface ManagerAggregateResponse {
  answers: Record<string, unknown>;
  instrumentVersion?: string | null;
}

export interface ManagerFactorComparison {
  cohortId: string;
  cohortLabel: string;
  factors: Array<{ id: string; name: string; mean: number }>;
}

function toCanonicalAnswers(answers: Record<string, unknown>): FibtItemResponse[] {
  return Object.entries(answers).map(([itemId, rawValue]) => ({
    itemId,
    value: typeof rawValue === "number" ? rawValue : Number(rawValue),
  }));
}

/**
 * Produz somente estados publicaveis. Respostas individuais entram como
 * dependencia server-side e nunca fazem parte do retorno serializavel.
 */
export function buildManagerAnalytics(
  responses: readonly ManagerAggregateResponse[],
  waveInstrumentVersion?: string | null,
): ManagerAnalytics {
  const manifest = getFibtManifest();

  if (!waveInstrumentVersion || waveInstrumentVersion !== manifest.instrument_version) {
    return {
      state: "error",
      countLabel: "Indisponível",
      message: "A versão da onda não corresponde ao manifesto FIB-T carregado.",
    };
  }

  if (responses.length === 0) {
    return {
      state: "no_data",
      countLabel: "0",
      message: "Nenhuma participação válida foi registrada neste recorte.",
    };
  }

  if (responses.length < FIBT_K_MIN) {
    return {
      state: "suppressed",
      countLabel: `<${FIBT_K_MIN}`,
      kMin: FIBT_K_MIN,
      message: `Dado ainda não publicável - mínimo de ${FIBT_K_MIN} participações válidas.`,
    };
  }

  if (
    responses.some(
      (response) =>
        !!response.instrumentVersion && response.instrumentVersion !== waveInstrumentVersion,
    )
  ) {
    return {
      state: "error",
      countLabel: "Indisponível",
      message: "Há respostas vinculadas a uma versão diferente do instrumento.",
    };
  }

  try {
    const aggregate = aggregateFibt(
      responses.map((response) => toCanonicalAnswers(response.answers)),
      fibtInstrumentDef(),
      FIBT_K_MIN,
    );

    if (!aggregate.visible || !aggregate.result) {
      return {
        state: "suppressed",
        countLabel: `<${FIBT_K_MIN}`,
        kMin: FIBT_K_MIN,
        message: `Dado ainda não publicável - mínimo de ${FIBT_K_MIN} participações válidas.`,
      };
    }

    return {
      state: "available",
      countLabel: String(aggregate.n),
      n: aggregate.n,
      result: aggregate.result,
    };
  } catch {
    return {
      state: "error",
      countLabel: "Indisponível",
      message:
        "O agregado não cobre os 32 itens com valores válidos. Nenhum valor ausente foi convertido em zero.",
    };
  }
}

export function buildFactorComparison(
  cohorts: ReadonlyArray<{ id: string; label: string; analytics: ManagerAnalytics }>,
): ManagerFactorComparison[] {
  return cohorts.flatMap((cohort) =>
    cohort.analytics.state === "available"
      ? [
          {
            cohortId: cohort.id,
            cohortLabel: cohort.label,
            factors: cohort.analytics.result.factors.map((factor) => ({
              id: factor.id,
              name: factor.name,
              mean: factor.mean,
            })),
          },
        ]
      : [],
  );
}
