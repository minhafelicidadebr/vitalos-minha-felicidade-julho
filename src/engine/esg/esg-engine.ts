// ESG engine — pure, setor-agnóstico. Traduz os scores de vitalidade (IVO,
// escala 0–1000) em prontidão para frameworks de mercado (ESRS S1, ODS/Agenda
// 2030, GRI, FIB/GNH). NUNCA importa de domain/: todo o mapeamento
// (qual pilar alimenta qual indicador) chega como parâmetro `mapping`.
//
// Princípio do comitê: ESG é "prova, não promessa". Cada datapoint declara
// quais pilares o sustentam e sua cobertura é derivada, nunca afirmada.

export type EsgBand = "em_formacao" | "em_progresso" | "consolidando" | "maduro";

/** Faixas de prontidão sobre a escala 0–1000 do IVO. */
export const ESG_BANDS: Array<{ band: EsgBand; min: number; label: string }> = [
  { band: "em_formacao", min: 0, label: "Em formação" },
  { band: "em_progresso", min: 350, label: "Em progresso" },
  { band: "consolidando", min: 650, label: "Consolidando" },
  { band: "maduro", min: 800, label: "Maduro" },
];

export function bandFor(score: number): { band: EsgBand; label: string } {
  let chosen = ESG_BANDS[0]!;
  for (const b of ESG_BANDS) if (score >= b.min) chosen = b;
  return { band: chosen.band, label: chosen.label };
}

// ─── Config de mapeamento (vinda do mock/domínio, nunca hardcoded no engine) ──

export interface FrameworkDatapointDef {
  /** Código oficial do indicador, ex.: "ESRS S1-14", "GRI 403", "ODS 3.4". */
  code: string;
  label: string;
  /** IDs de pilares do IVO que sustentam este datapoint. */
  pillars: string[];
  /** Nota explicativa de por que estes pilares evidenciam o indicador. */
  rationale?: string;
}

export interface FrameworkDef {
  id: string;
  name: string;
  /** Família: relatório regulatório (ESRS), voluntário (GRI/ODS) ou índice (FIB). */
  kind: "esrs" | "ods" | "gri" | "fib";
  color: string;
  datapoints: FrameworkDatapointDef[];
}

export interface EsgMapping {
  frameworks: FrameworkDef[];
}

// ─── Saídas ───────────────────────────────────────────────────────────────────

export interface DatapointCoverage {
  code: string;
  label: string;
  rationale?: string;
  /** Pilares que cobrem o datapoint, já resolvidos (apenas os visíveis). */
  coveredPillars: Array<{ pillarId: string; name: string; score: number }>;
  /** Pilares pedidos pelo datapoint mas ocultos por k-anonimato (n<5). */
  hiddenPillarIds: string[];
  /** Score derivado = média dos pilares visíveis, 0–1000. null se nenhum visível. */
  score: number | null;
  band: EsgBand | null;
  bandLabel: string | null;
}

export interface FrameworkCoverage {
  id: string;
  name: string;
  kind: FrameworkDef["kind"];
  color: string;
  datapoints: DatapointCoverage[];
  /** Média dos datapoints com score; null se nenhum mensurável. */
  score: number | null;
  band: EsgBand | null;
  bandLabel: string | null;
  /** datapoints mensuráveis / total. */
  coverageRatio: number;
}

export interface EsgReadiness {
  frameworks: FrameworkCoverage[];
  /** Prontidão social agregada = média ponderada dos frameworks mensuráveis. */
  overallScore: number | null;
  overallBand: EsgBand | null;
  overallBandLabel: string | null;
  /** Quantos datapoints, no total, estão mensuráveis vs. solicitados. */
  measurableDatapoints: number;
  totalDatapoints: number;
}

/** Pilar do IVO já resolvido (vem do resultado do ivo-engine). */
export interface PillarScore {
  pillarId: string;
  name: string;
  score: number;
  visible: boolean;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

/**
 * Deriva a prontidão ESG a partir dos pilares do IVO e do mapeamento.
 * Respeita k-anonimato: pilares não-visíveis (n<5) não entram no cálculo e
 * são reportados como `hiddenPillarIds` para transparência.
 */
export function deriveEsgReadiness(pillars: PillarScore[], mapping: EsgMapping): EsgReadiness {
  const pillarMap = new Map(pillars.map((p) => [p.pillarId, p]));

  let totalDatapoints = 0;
  let measurableDatapoints = 0;

  const frameworks: FrameworkCoverage[] = mapping.frameworks.map((fw) => {
    const datapoints: DatapointCoverage[] = fw.datapoints.map((dp) => {
      totalDatapoints += 1;
      const covered: DatapointCoverage["coveredPillars"] = [];
      const hidden: string[] = [];

      for (const pid of dp.pillars) {
        const p = pillarMap.get(pid);
        if (!p) continue;
        if (p.visible) covered.push({ pillarId: p.pillarId, name: p.name, score: p.score });
        else hidden.push(pid);
      }

      const score = avg(covered.map((c) => c.score));
      if (score !== null) measurableDatapoints += 1;
      const b = score !== null ? bandFor(score) : null;

      return {
        code: dp.code,
        label: dp.label,
        rationale: dp.rationale,
        coveredPillars: covered,
        hiddenPillarIds: hidden,
        score,
        band: b?.band ?? null,
        bandLabel: b?.label ?? null,
      };
    });

    const fwScores = datapoints.map((d) => d.score).filter((s): s is number => s !== null);
    const fwScore = avg(fwScores);
    const fwBand = fwScore !== null ? bandFor(fwScore) : null;
    const measurable = datapoints.filter((d) => d.score !== null).length;

    return {
      id: fw.id,
      name: fw.name,
      kind: fw.kind,
      color: fw.color,
      datapoints,
      score: fwScore,
      band: fwBand?.band ?? null,
      bandLabel: fwBand?.label ?? null,
      coverageRatio: datapoints.length > 0 ? measurable / datapoints.length : 0,
    };
  });

  const overallScores = frameworks.map((f) => f.score).filter((s): s is number => s !== null);
  const overallScore = avg(overallScores);
  const overallBand = overallScore !== null ? bandFor(overallScore) : null;

  return {
    frameworks,
    overallScore,
    overallBand: overallBand?.band ?? null,
    overallBandLabel: overallBand?.label ?? null,
    measurableDatapoints,
    totalDatapoints,
  };
}
