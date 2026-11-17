import {
  CommercialClaimResolutionError,
  resolveCommercialClaim,
} from "@/domain/commercial-claims/commercial-claims-resolver";
import { COMMERCIAL_SURFACE_IDS as S } from "@/domain/commercial-claims/commercial-surface-ids";
import type { PresentationMetric } from "@/features/presentation/types";

export function presentationStatistics(
  group: "context" | "benefits",
  resolve: typeof resolveCommercialClaim = resolveCommercialClaim,
): PresentationMetric[] {
  const claimId =
    group === "context" ? "CLAIM-COM-PRESENTATION-WHO-001" : "CLAIM-COM-PRESENTATION-BENEFITS-001";
  const surfaceId = group === "context" ? S.PRESENTATION_CONTEXT : S.PRESENTATION_BUSINESS_EVIDENCE;
  const value = (variant: string) => {
    const n = Number(resolve({ claimId, surfaceId, variant }).text);
    if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid approved presentation statistic");
    return n;
  };
  try {
    // Resolve the complete statement too: the rendered units/context below accompany its values.
    resolve({ claimId, surfaceId, variant: "default" });
    return group === "context"
      ? [
          {
            value: value("cost"),
            prefix: "US$ ",
            suffix: " tri/ano",
            label: "Produtividade perdida",
            context: "Depressão e ansiedade · estimativa global da OMS",
          },
          {
            value: value("days"),
            suffix: " bi dias/ano",
            label: "Dias de trabalho perdidos",
            context: "Mesma carga global, expressa em dias · OMS",
          },
        ]
      : [
          {
            value: value("burnout"),
            suffix: "× menor",
            label: "Probabilidade de sentir burnout",
            context: "Pessoas prosperando em quatro ou mais elementos de bem-estar · Gallup, 2019",
          },
          {
            value: value("turnover"),
            prefix: "−",
            suffix: "%",
            label: "Rotatividade em unidades engajadas",
            context: "Organizações de baixa rotatividade · Gallup, 2017",
          },
        ];
  } catch (error) {
    if (error instanceof CommercialClaimResolutionError) return [];
    throw error;
  }
}
