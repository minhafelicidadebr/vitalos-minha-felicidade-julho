// Fronteira server-only do dossiê GRO/PGR. Monta o documento auditável de um setor
// a partir da MESMA fonte única que as telas /matriz, /plano-nr1 e /evolucao-nr1
// consomem (getSectorExposure) — o dossiê NÃO PODE divergir do que o gestor vê.
//
// COMPOSIÇÃO ponta a ponta:
//   getSectorExposure/PgrMeasures (fonte única) → buildPgrPlan  (inventário+medidas)
//   getCapsuleHistory             → buildLongitudinalReading    (reavaliação)
//   buildPgrDocument              → dossiê estruturado
//   serializePgrDocumentMarkdown  → Markdown portável (base do export PDF)
//
// Em produção (Fase 2): exposição e capsules vêm do Cloud com RLS por org_id. A
// interface permanece idêntica. O documento traz só agregados (k-anon a montante).

import { buildPgrPlan } from "@/engine/nr1/pgr-engine";
import {
  buildPgrDocument,
  serializePgrDocumentMarkdown,
  type PgrDocument,
  type PgrDocumentMeta,
} from "@/engine/nr1/pgr-document-engine";
import {
  buildLongitudinalReading,
  type LongitudinalReading,
} from "@/engine/ai/capsule-longitudinal-engine";
import { NR1_CROSSWALK } from "@/mocks/nr1-crosswalk-mock";
import { getSectorExposure, getSectorPgrMeasures } from "@/mocks/nr1-sector-exposure";
import { getCapsuleHistory } from "@/mocks/capsule-history-mock";
import { getSectorData } from "@/mocks/sector-data";

// Mesmos parâmetros do plano nas telas (fonte única — não divergir).
const PLAN_CURRENT_WEEK = 6;
const PLAN_HORIZON_WEEKS = 13;
const PLAN_TOP_RISKS = 5;

/** Resultado seguro para o cliente: o documento + o Markdown serializado. */
export interface PgrDocumentResult {
  document: PgrDocument;
  markdown: string;
  /** True quando a reavaliação longitudinal foi anexada (havia ≥2 ciclos). */
  hasReavaliacao: boolean;
}

/** Monta a leitura longitudinal do pack para o instrumento de risco (COPSOQ). */
function resolveReavaliacao(packId: string): LongitudinalReading | undefined {
  const history = getCapsuleHistory(packId, "COPSOQ");
  if (history.length < 2) return undefined;
  const result = buildLongitudinalReading({ capsules: history });
  return result.ok ? result.reading : undefined;
}

/**
 * Monta o dossiê GRO/PGR de um setor. `sectorLabel` é o rótulo legível (texto),
 * nunca um ID interno. Determinístico para a mesma entrada.
 */
export function buildSectorPgrDocument(
  packId: string,
  sectorLabel: string,
): PgrDocumentResult {
  const exposure = getSectorExposure(packId);
  const measures = getSectorPgrMeasures(packId);

  const plan = buildPgrPlan({
    registry: NR1_CROSSWALK,
    exposures: exposure,
    measures,
    generatedAt: NR1_CROSSWALK.updatedAt,
    currentWeek: PLAN_CURRENT_WEEK,
    horizonWeeks: PLAN_HORIZON_WEEKS,
    topRisks: PLAN_TOP_RISKS,
  });

  const org = getSectorData(packId).org;
  const meta: PgrDocumentMeta = {
    orgName: org.name,
    sectorLabel,
    periodLabel: "T3 2026 · ciclo COPSOQ/NR-1",
    responsibleRole: "SESMT / Profissional legalmente habilitado",
    documentId: `PGR-PSI-${packId.toUpperCase()}-${NR1_CROSSWALK.updatedAt}`,
  };

  const reavaliacao = resolveReavaliacao(packId);
  const document = buildPgrDocument(plan, meta, reavaliacao);

  return {
    document,
    markdown: serializePgrDocumentMarkdown(document),
    hasReavaliacao: document.hasReavaliacao,
  };
}
