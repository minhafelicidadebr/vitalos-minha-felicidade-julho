// FIB-T — Felicidade Interna Bruta do Trabalhador (Furtado, C. A., 2020).
// Engine puro e agnóstico: a estrutura do instrumento (3 Fatores, 9 Domínios,
// 32 itens, escala 0–4) chega como parâmetro; nunca importa de domain/.
// Escore bruto = soma das médias dos Fatores (cada Fator pesa igual — método de
// Furtado). É a lente de ECOSSISTEMA: bem-estar + território + bem-comum, a peça
// que faltava entre o IVO (percepção) e o ESG (prova).

export type FibtClassification = "fragil" | "em_desenvolvimento" | "saudavel" | "florescente";

// ─── Definição do instrumento (vem do mock — Furtado 2020) ────────────────────

export interface FibtItemDef {
  id: string; // ex.: "q1".."q32"
  text: string;
  factorId: string;
  domainId: string;
}

export interface FibtDomainDef {
  id: string;
  name: string;
}

export interface FibtFactorDef {
  id: string;
  name: string;
  domainIds: string[];
}

export interface FibtInstrumentDef {
  factors: FibtFactorDef[];
  domains: FibtDomainDef[];
  items: FibtItemDef[]; // escala 0–4
}

export interface FibtItemResponse {
  itemId: string;
  value: number; // 0–4
}

// ─── Saídas ───────────────────────────────────────────────────────────────────

export interface FibtDomainScore {
  id: string;
  name: string;
  mean: number; // 0–4, 1 decimal
  normalized: number; // 0–100
  itemCount: number;
}

export interface FibtFactorScore {
  id: string;
  name: string;
  mean: number; // 0–4 (subíndice do Fator = média dos itens do Fator)
  normalized: number; // 0–100
  domains: FibtDomainScore[];
}

export interface FibtResult {
  factors: FibtFactorScore[];
  domains: FibtDomainScore[];
  escoreBruto: number; // soma das médias dos 3 Fatores (0–12) — método Furtado
  index: number; // normalizado 0–1000 (alinhado ao IVO)
  classification: FibtClassification;
}

export interface FibtGroupResult {
  n: number;
  minN: number;
  visible: boolean; // n >= minN
  result: FibtResult | null; // null se oculto por k-anonimato
}

export const FIBT_SCALE_MAX = 4;
export const FIBT_K_MIN = 5;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

export function classifyFibt(normalized: number): FibtClassification {
  if (normalized >= 80) return "florescente";
  if (normalized >= 60) return "saudavel";
  if (normalized >= 40) return "em_desenvolvimento";
  return "fragil";
}

const norm100 = (m: number) => Math.round((m / FIBT_SCALE_MAX) * 100);

// ─── Scoring individual / de uma média ────────────────────────────────────────

export function scoreFibt(responses: FibtItemResponse[], def: FibtInstrumentDef): FibtResult {
  const byId = new Map(responses.map((r) => [r.itemId, r.value]));
  const itemsByDomain = new Map<string, number[]>();
  const itemsByFactor = new Map<string, number[]>();

  for (const item of def.items) {
    const v = byId.get(item.id) ?? 0;
    if (!itemsByDomain.has(item.domainId)) itemsByDomain.set(item.domainId, []);
    if (!itemsByFactor.has(item.factorId)) itemsByFactor.set(item.factorId, []);
    itemsByDomain.get(item.domainId)!.push(v);
    itemsByFactor.get(item.factorId)!.push(v);
  }

  const domains: FibtDomainScore[] = def.domains.map((d) => {
    const vals = itemsByDomain.get(d.id) ?? [];
    const m = round1(mean(vals));
    return { id: d.id, name: d.name, mean: m, normalized: norm100(m), itemCount: vals.length };
  });

  const factors: FibtFactorScore[] = def.factors.map((f) => {
    const vals = itemsByFactor.get(f.id) ?? [];
    const m = round1(mean(vals));
    return {
      id: f.id,
      name: f.name,
      mean: m,
      normalized: norm100(m),
      domains: domains.filter((d) => f.domainIds.includes(d.id)),
    };
  });

  // Escore bruto = soma das médias dos Fatores (Furtado: cada Fator pesa igual).
  const escoreBruto = round1(factors.reduce((s, f) => s + f.mean, 0));
  const maxBruto = def.factors.length * FIBT_SCALE_MAX;
  const index = maxBruto > 0 ? Math.round((escoreBruto / maxBruto) * 1000) : 0;

  return {
    factors,
    domains,
    escoreBruto,
    index,
    classification: classifyFibt(norm100(escoreBruto / def.factors.length)),
  };
}

// ─── Agregação de grupo (k-anonimato) ─────────────────────────────────────────

export function aggregateFibt(
  responsesPerPerson: FibtItemResponse[][],
  def: FibtInstrumentDef,
  minN: number = FIBT_K_MIN,
): FibtGroupResult {
  const n = responsesPerPerson.length;
  if (n < minN) return { n, minN, visible: false, result: null };

  // Média por item entre respondentes → pontua o "respondente médio".
  const sums = new Map<string, { total: number; count: number }>();
  for (const person of responsesPerPerson) {
    for (const r of person) {
      const cur = sums.get(r.itemId) ?? { total: 0, count: 0 };
      cur.total += r.value;
      cur.count += 1;
      sums.set(r.itemId, cur);
    }
  }
  const avgResponses: FibtItemResponse[] = def.items.map((item) => {
    const s = sums.get(item.id);
    return { itemId: item.id, value: s ? s.total / s.count : 0 };
  });

  return { n, minN, visible: true, result: scoreFibt(avgResponses, def) };
}
