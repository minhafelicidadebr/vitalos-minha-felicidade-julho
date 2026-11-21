// Adaptador FIB-T → leitura normalizada IVO (spec fibt-q2-integration.md).
//
// Fonte única: o snapshot PROTEGIDO do painel FIB-T. O adaptador não
// recalcula nada, não lê resposta e não normaliza escala: fatores (0–4) e
// escore bruto (0–12) saem exatamente como publicados; qualquer estado
// protegido sai como estado, sem número.

import {
  IVO_LENS_READING_CONTRACT,
  assertNormalizedLensReading,
  type CohortLensReading,
  type LensConstruct,
  type LensPublicationState,
  type NormalizedLensReading,
} from "@/engine/ivo/lens-contract";
import { FIBT_RAW_SCORE_MAX, FIBT_SCALE_MAX, FIBT_SCALE_MIN } from "@/domain/instruments/fibt/fibt-instrument-types";
import type { ManagerAnalytics } from "./fibt-manager-control-center";
import type { FibtManagerSnapshot } from "./fibt-manager-control-center.server";

export const FIBT_RAW_SCORE_CONSTRUCT_ID = "escore_bruto";

export interface FibtLensReadingContext {
  organizationId: string;
  cycleKey: string;
  generatedAt?: string;
}

function cohortReading(
  key: string,
  label: string,
  analytics: ManagerAnalytics,
  waveCollecting: boolean,
): CohortLensReading {
  if (analytics.state === "available") {
    const constructs: LensConstruct[] = [
      ...analytics.result.factors.map((factor) => ({
        id: factor.id,
        label: factor.name,
        value: factor.mean,
        scaleMin: FIBT_SCALE_MIN,
        scaleMax: FIBT_SCALE_MAX,
      })),
      {
        id: FIBT_RAW_SCORE_CONSTRUCT_ID,
        label: "Escore bruto",
        value: analytics.result.escoreBruto,
        scaleMin: 0,
        scaleMax: FIBT_RAW_SCORE_MAX,
      },
    ];
    return { cohortKey: key, cohortLabel: label, publication: "published", countLabel: analytics.countLabel, constructs, protectionReason: null };
  }

  if (analytics.state === "no_data") {
    return {
      cohortKey: key,
      cohortLabel: label,
      publication: waveCollecting ? "collecting" : "concluded",
      countLabel: analytics.countLabel,
      constructs: null,
      protectionReason: null,
    };
  }

  // Estados protegidos e de bloqueio: o rótulo já vem protegido do leitor.
  return {
    cohortKey: key,
    cohortLabel: label,
    publication: "protected",
    countLabel: analytics.countLabel,
    constructs: null,
    protectionReason: analytics.message,
  };
}

function overallState(cohorts: readonly CohortLensReading[], waveCollecting: boolean): LensPublicationState {
  if (cohorts.some((c) => c.publication === "published")) return "published";
  if (cohorts.some((c) => c.publication === "protected")) return "protected";
  return waveCollecting ? "collecting" : "concluded";
}

export function toFibtLensReading(
  snapshot: FibtManagerSnapshot,
  context: FibtLensReadingContext,
): NormalizedLensReading {
  if (snapshot.campaign.instrument !== "FIB_T") {
    throw new Error("[fibt-lens-adapter] snapshot não é de uma onda FIB-T");
  }
  const waveCollecting = snapshot.campaign.status === "collecting";
  const cohorts = snapshot.sectors.map((sector) =>
    cohortReading(sector.key, sector.label, sector.analytics, waveCollecting),
  );

  const reading: NormalizedLensReading = {
    contractVersion: IVO_LENS_READING_CONTRACT,
    organizationId: context.organizationId,
    cycleKey: context.cycleKey,
    quarter: "Q2",
    lens: "fibt",
    instrumentVersion: snapshot.campaign.instrumentVersion,
    calculationVersion: `fibt-manifest/${snapshot.campaign.instrumentVersion}`,
    cohortScope: "cohort",
    privacyStatus: cohorts.length > 0 && cohorts.every((c) => c.publication === "published") ? "published" : "protected",
    kMin: snapshot.privacy.kMin,
    publicationStatus: overallState(cohorts, waveCollecting),
    cohorts,
    evidenceReferences: [`wave:${snapshot.campaign.waveId}`],
    generatedAt: context.generatedAt ?? new Date().toISOString(),
  };

  return assertNormalizedLensReading(reading);
}
