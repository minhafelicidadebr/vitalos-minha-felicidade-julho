// VIA-T v1 exploratório — engine puro, agnóstico de domínio.
// Recebe a definição do instrumento como parâmetro; nunca importa de domain/.
// Produz scores de forças, virtudes, Top 5, ICUFT e diagnóstico VIA×ICUFT.
// Instrumento autoral para autodesenvolvimento — não é a Pesquisa VIA oficial.

export type ViatClassification = "baixa" | "moderada" | "alta" | "assinatura";
export type IcuftClassification = "desfavoravel" | "intermediario" | "favoravel";
export type ViatIcuftDiagnosis =
  | "florescer"
  | "potencial_subutilizado"
  | "desenvolver"
  | "prioridade_total";

// ─── Definição do instrumento (vem do mock/domínio, nunca hardcoded no engine) ─

export interface ViatStrengthDef {
  id: string;
  name: string;
  virtueId: string;
  itemIds: string[]; // 1 (curto) ou 2 (recomendado) items por força
}

export interface ViatVirtueDef {
  id: string;
  name: string;
  strengthIds: string[];
}

export interface ViatIcuftItemDef {
  id: string;
  text: string;
}

export interface ViatInstrumentDef {
  strengths: ViatStrengthDef[];
  virtues: ViatVirtueDef[];
  icuftItems: ViatIcuftItemDef[];
}

export interface ViatItemResponse {
  itemId: string;
  value: number; // 0–10 (contínuo)
}

// ─── Outputs individuais ──────────────────────────────────────────────────────

export interface StrengthScore {
  id: string;
  name: string;
  virtueId: string;
  virtueName: string;
  score: number; // 0–10, 1 decimal
  classification: ViatClassification;
  isTop5: boolean;
}

export interface VirtueScore {
  id: string;
  name: string;
  score: number; // média das forças da virtude, 1 decimal
  strengths: StrengthScore[];
}

export interface IcuftResult {
  score: number; // 0–10, 1 decimal
  classification: IcuftClassification;
  items: Array<{ itemId: string; value: number }>;
}

export interface ViatResult {
  strengths: StrengthScore[];
  virtues: VirtueScore[];
  top5: StrengthScore[]; // top 5 por score decrescente
  global: number; // média das 24 forças, 1 decimal
  icuft: IcuftResult;
  icuftDiagnosis: ViatIcuftDiagnosis;
}

// ─── Outputs de grupo ─────────────────────────────────────────────────────────

export interface ViatGroupStrength {
  id: string;
  name: string;
  virtueId: string;
  avgScore: number;
  classification: ViatClassification;
  visible: boolean; // false = oculto por k-anonimato (n < minN)
}

export interface ViatGroupVirtue {
  id: string;
  name: string;
  avgScore: number | null; // null se todas as forças ocultas
  visible: boolean;
}

export interface ViatGroupAlert {
  id: string;
  severity: "info" | "aviso" | "critico";
  message: string;
  action: string;
}

export interface ViatGroupResult {
  n: number;
  minN: number;
  strengths: ViatGroupStrength[];
  virtues: ViatGroupVirtue[];
  top10: ViatGroupStrength[]; // top 10 visíveis, por avgScore
  globalAvg: number | null; // null se n < minN
  icuftAvg: number | null;
  icuftClassification: IcuftClassification | null;
  icuftDiagnosis: ViatIcuftDiagnosis | null;
  alerts: ViatGroupAlert[];
  hiddenStrengthCount: number;
}

// ─── Classificação ────────────────────────────────────────────────────────────

export function classifyStrength(score: number): ViatClassification {
  if (score >= 8.5) return "assinatura";
  if (score >= 7.0) return "alta";
  if (score >= 4.0) return "moderada";
  return "baixa";
}

export function classifyIcuft(score: number): IcuftClassification {
  if (score >= 7.5) return "favoravel";
  if (score >= 5.0) return "intermediario";
  return "desfavoravel";
}

export function diagnosisViaXIcuft(globalScore: number, icuftScore: number): ViatIcuftDiagnosis {
  const viaHigh = globalScore >= 7.0;
  const icuftHigh = icuftScore >= 5.0;
  if (viaHigh && icuftHigh) return "florescer";
  if (viaHigh && !icuftHigh) return "potencial_subutilizado";
  if (!viaHigh && icuftHigh) return "desenvolver";
  return "prioridade_total";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return round1(nums.reduce((s, v) => s + v, 0) / nums.length);
}

// ─── Scoring individual ───────────────────────────────────────────────────────

export function scoreViat(responses: ViatItemResponse[], def: ViatInstrumentDef): ViatResult {
  const responseMap = new Map(responses.map((r) => [r.itemId, r.value]));
  const virtueMap = new Map(def.virtues.map((v) => [v.id, v.name]));

  // Score por força (média dos itens)
  const rawStrengths = def.strengths.map((s) => {
    const vals = s.itemIds.map((id) => responseMap.get(id) ?? 0);
    return { def: s, score: avg(vals) };
  });

  // Top 5: maiores scores (sort estável — desempate por ordem no instrumento)
  const sortedIdx = rawStrengths
    .map((_, i) => i)
    .sort((a, b) => rawStrengths[b]!.score - rawStrengths[a]!.score);
  const top5Ids = new Set(sortedIdx.slice(0, 5).map((i) => rawStrengths[i]!.def.id));

  const strengths: StrengthScore[] = rawStrengths.map(({ def: s, score }) => ({
    id: s.id,
    name: s.name,
    virtueId: s.virtueId,
    virtueName: virtueMap.get(s.virtueId) ?? s.virtueId,
    score,
    classification: classifyStrength(score),
    isTop5: top5Ids.has(s.id),
  }));

  // Score por virtude (média das forças da virtude)
  const virtues: VirtueScore[] = def.virtues.map((v) => {
    const vStrengths = strengths.filter((s) => s.virtueId === v.id);
    return {
      id: v.id,
      name: v.name,
      score: avg(vStrengths.map((s) => s.score)),
      strengths: vStrengths,
    };
  });

  const global = avg(strengths.map((s) => s.score));
  const top5 = strengths.filter((s) => s.isTop5).sort((a, b) => b.score - a.score);

  // ICUFT
  const icuftItems = def.icuftItems.map((item) => ({
    itemId: item.id,
    value: responseMap.get(item.id) ?? 0,
  }));
  const icuftScore = avg(icuftItems.map((i) => i.value));
  const icuft: IcuftResult = {
    score: icuftScore,
    classification: classifyIcuft(icuftScore),
    items: icuftItems,
  };

  return {
    strengths,
    virtues,
    top5,
    global,
    icuft,
    icuftDiagnosis: diagnosisViaXIcuft(global, icuftScore),
  };
}

// ─── Agregação de grupo ───────────────────────────────────────────────────────

export function aggregateViat(
  results: ViatResult[],
  def: ViatInstrumentDef,
  minN: number = 5,
): ViatGroupResult {
  const n = results.length;

  // Acumula scores por força
  const strengthAccum = new Map<string, number[]>();
  for (const s of def.strengths) strengthAccum.set(s.id, []);
  for (const r of results) {
    for (const s of r.strengths) strengthAccum.get(s.id)?.push(s.score);
  }

  const strengths: ViatGroupStrength[] = def.strengths.map((s) => {
    const scores = strengthAccum.get(s.id) ?? [];
    const avgScore = avg(scores);
    return {
      id: s.id,
      name: s.name,
      virtueId: s.virtueId,
      avgScore,
      classification: classifyStrength(avgScore),
      visible: n >= minN,
    };
  });

  const hiddenStrengthCount = strengths.filter((s) => !s.visible).length;

  // Virtudes (média das forças visíveis)
  const virtues: ViatGroupVirtue[] = def.virtues.map((v) => {
    const vStrengths = strengths.filter((s) => s.virtueId === v.id && s.visible);
    const visible = vStrengths.length > 0;
    return {
      id: v.id,
      name: v.name,
      avgScore: visible ? avg(vStrengths.map((s) => s.avgScore)) : null,
      visible,
    };
  });

  const top10 = strengths
    .filter((s) => s.visible)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  const globalAvg = n >= minN ? avg(results.map((r) => r.global)) : null;
  const icuftAvg = n >= minN ? avg(results.map((r) => r.icuft.score)) : null;
  const icuftClassification = icuftAvg !== null ? classifyIcuft(icuftAvg) : null;
  const icuftDiagnosis =
    globalAvg !== null && icuftAvg !== null ? diagnosisViaXIcuft(globalAvg, icuftAvg) : null;

  return {
    n,
    minN,
    strengths,
    virtues,
    top10,
    globalAvg,
    icuftAvg,
    icuftClassification,
    icuftDiagnosis,
    alerts: buildAlerts(strengths, virtues, icuftAvg, n, minN),
    hiddenStrengthCount,
  };
}

function buildAlerts(
  strengths: ViatGroupStrength[],
  virtues: ViatGroupVirtue[],
  icuftAvg: number | null,
  n: number,
  minN: number,
): ViatGroupAlert[] {
  if (n < minN) return [];
  const alerts: ViatGroupAlert[] = [];

  const s = (id: string) => strengths.find((x) => x.id === id);
  const v = (id: string) => virtues.find((x) => x.id === id);

  const humanidade = v("humanidade");
  const coragem = v("coragem");
  const esperanca = s("esperanca");
  const entusiasmo = s("entusiasmo");
  const trabalhoEquipe = s("trabalho_equipe");
  const lideranca = s("lideranca");
  const gratidao = s("gratidao");
  const apreciacao = s("apreciacao");

  if (icuftAvg !== null && icuftAvg < 5.0 && humanidade?.avgScore !== null) {
    if ((humanidade?.avgScore ?? 10) < 6.0) {
      alerts.push({
        id: "icuft_humanidade_baixos",
        severity: "critico",
        message: "ICUFT baixo e Humanidade abaixo de 6,0 — possível cultura pouco apoiadora.",
        action: "Intervenção em cultura organizacional e suporte entre pares.",
      });
    }
  }

  if (icuftAvg !== null && icuftAvg < 5.0 && (coragem?.avgScore ?? 0) >= 7.0) {
    alerts.push({
      id: "icuft_baixo_coragem_alta",
      severity: "aviso",
      message: "Coragem alta num contexto adverso (ICUFT baixo) — potencial represado.",
      action: "Intervir nas condições estruturais e estilo de liderança.",
    });
  }

  if (
    trabalhoEquipe?.visible &&
    trabalhoEquipe.avgScore < 6.0 &&
    lideranca?.visible &&
    lideranca.avgScore < 6.0
  ) {
    alerts.push({
      id: "equipe_lideranca_baixos",
      severity: "aviso",
      message: "Trabalho em equipe e Liderança abaixo de 6,0.",
      action: "Intervenção em coordenação coletiva e desenvolvimento de liderança.",
    });
  }

  if (
    esperanca?.visible &&
    esperanca.avgScore < 6.0 &&
    entusiasmo?.visible &&
    entusiasmo.avgScore < 6.0
  ) {
    alerts.push({
      id: "esperanca_entusiasmo_baixos",
      severity: "critico",
      message: "Esperança e Entusiasmo coletivos em queda.",
      action: "Atenção urgente: rituais de propósito, reconhecimento e recarga de energia.",
    });
  }

  if (
    gratidao?.visible &&
    gratidao.avgScore < 6.0 &&
    apreciacao?.visible &&
    apreciacao.avgScore < 6.0
  ) {
    alerts.push({
      id: "gratidao_apreciacao_baixos",
      severity: "aviso",
      message: "Gratidão e Apreciação baixas — cultura com déficit em reconhecimento.",
      action: "Rituais de reconhecimento específico e apreciação de excelência.",
    });
  }

  return alerts;
}
