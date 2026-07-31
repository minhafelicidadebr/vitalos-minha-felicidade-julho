// FIB-T — Felicidade Interna Bruta do Trabalhador (Furtado, C. A., 2020).
// Engine puro e agnóstico: a estrutura do instrumento (3 Fatores, 9 Domínios,
// 32 itens, escala 0–4) chega como parâmetro; nunca importa de domain/.
//
// O QUE ESTE MOTOR CALCULA — e só isso, porque só isso está documentado:
//   subíndice de Fator = soma das respostas do Fator ÷ nº de itens do Fator (0–4)
//   escore bruto FIB-T = soma das médias dos três Fatores (0–12)
//
// O QUE FOI REMOVIDO NA ONDA FIBT-0 (não existe no documento de Furtado):
//   · índice normalizado 0–1000
//   · classificação em faixas (frágil / em desenvolvimento / saudável / florescente)
//   · imputação de resposta ausente como 0
// A imputação era a mais silenciosa das três: `?? 0` transformava quem não
// respondeu em quem "discorda totalmente". Agora resposta incompleta não
// produz escore — ver FibtIncompleteResponseError.
//
// A média por Domínio permanece, mas como LEITURA DESCRITIVA: o documento
// agrupa itens por domínio (codificação por cor) sem definir fórmula de
// subíndice. Nunca apresentar como escore autorizado do instrumento.

// ─── Definição do instrumento (injetada pela camada de domínio) ───────────────

export interface FibtItemDef {
  id: string; // "q1".."q32"
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

/** Leitura descritiva por Domínio. NÃO é escore autorizado do instrumento. */
export interface FibtDomainReading {
  id: string;
  name: string;
  mean: number; // 0–4, 1 decimal
  itemCount: number;
}

export interface FibtFactorScore {
  id: string;
  name: string;
  /** Subíndice do Fator: média dos itens do Fator (0–4). Documentado. */
  mean: number;
  domains: FibtDomainReading[];
}

export interface FibtResult {
  factors: FibtFactorScore[];
  domains: FibtDomainReading[];
  /** Soma das médias dos 3 Fatores (0–12). Documentado. */
  escoreBruto: number;
}

export interface FibtGroupResult {
  n: number;
  minN: number;
  visible: boolean; // n >= minN
  result: FibtResult | null; // null se oculto por k-anonimato
}

export const FIBT_SCALE_MIN = 0;
export const FIBT_SCALE_MAX = 4;
export const FIBT_K_MIN = 5;

/** Resposta ausente ou fora da escala — o documento não define imputação. */
export class FibtIncompleteResponseError extends Error {
  readonly missingItemIds: string[];
  readonly invalidItemIds: string[];

  constructor(missingItemIds: string[], invalidItemIds: string[]) {
    const parts: string[] = [];
    if (missingItemIds.length > 0) parts.push(`ausentes: ${missingItemIds.join(", ")}`);
    if (invalidItemIds.length > 0) parts.push(`fora da escala 0-4: ${invalidItemIds.join(", ")}`);
    super(
      `[fibt-engine] respostas inválidas para escore (${parts.join(" | ")}). ` +
        "O instrumento não define regra de missing data — imputar atribuiria à pessoa " +
        "uma resposta que ela não deu.",
    );
    this.name = "FibtIncompleteResponseError";
    this.missingItemIds = missingItemIds;
    this.invalidItemIds = invalidItemIds;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

export interface FibtResponseValidation {
  complete: boolean;
  missingItemIds: string[];
  invalidItemIds: string[];
}

/**
 * Confere se um conjunto de respostas cobre TODOS os itens do instrumento com
 * valores dentro da escala. Exposto para a UI checar antes de pontuar, em vez
 * de descobrir por exceção.
 */
export function validateFibtResponses(
  responses: FibtItemResponse[],
  def: FibtInstrumentDef,
): FibtResponseValidation {
  const byId = new Map(responses.map((r) => [r.itemId, r.value]));
  const missingItemIds: string[] = [];
  const invalidItemIds: string[] = [];

  for (const item of def.items) {
    const v = byId.get(item.id);
    if (v === undefined || v === null || Number.isNaN(v)) {
      missingItemIds.push(item.id);
    } else if (v < FIBT_SCALE_MIN || v > FIBT_SCALE_MAX) {
      invalidItemIds.push(item.id);
    }
  }

  return {
    complete: missingItemIds.length === 0 && invalidItemIds.length === 0,
    missingItemIds,
    invalidItemIds,
  };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Pontua um conjunto COMPLETO de respostas (0–4 em cada um dos itens).
 * Lança FibtIncompleteResponseError se faltar item ou houver valor fora da
 * escala — nunca imputa.
 */
export function scoreFibt(responses: FibtItemResponse[], def: FibtInstrumentDef): FibtResult {
  const check = validateFibtResponses(responses, def);
  if (!check.complete) {
    throw new FibtIncompleteResponseError(check.missingItemIds, check.invalidItemIds);
  }

  const byId = new Map(responses.map((r) => [r.itemId, r.value]));
  const itemsByDomain = new Map<string, number[]>();
  const itemsByFactor = new Map<string, number[]>();

  for (const item of def.items) {
    const v = byId.get(item.id)!;
    if (!itemsByDomain.has(item.domainId)) itemsByDomain.set(item.domainId, []);
    if (!itemsByFactor.has(item.factorId)) itemsByFactor.set(item.factorId, []);
    itemsByDomain.get(item.domainId)!.push(v);
    itemsByFactor.get(item.factorId)!.push(v);
  }

  const domains: FibtDomainReading[] = def.domains.map((d) => {
    const vals = itemsByDomain.get(d.id) ?? [];
    return { id: d.id, name: d.name, mean: round1(mean(vals)), itemCount: vals.length };
  });

  const factors: FibtFactorScore[] = def.factors.map((f) => {
    const vals = itemsByFactor.get(f.id) ?? [];
    return {
      id: f.id,
      name: f.name,
      mean: round1(mean(vals)),
      domains: domains.filter((d) => f.domainIds.includes(d.id)),
    };
  });

  // Escore bruto = soma das médias dos Fatores (Furtado 2020, seção de cálculo).
  const escoreBruto = round1(factors.reduce((s, f) => s + f.mean, 0));

  return { factors, domains, escoreBruto };
}

// ─── Agregação de grupo (k-anonimato) ─────────────────────────────────────────

/**
 * Agrega respostas de várias pessoas. Cada pessoa precisa ter respondido o
 * instrumento inteiro — respostas parciais são recusadas, não completadas com
 * zero. Abaixo de minN o resultado é suprimido por privacidade.
 */
export function aggregateFibt(
  responsesPerPerson: FibtItemResponse[][],
  def: FibtInstrumentDef,
  minN: number = FIBT_K_MIN,
): FibtGroupResult {
  const n = responsesPerPerson.length;
  if (n < minN) return { n, minN, visible: false, result: null };

  for (const person of responsesPerPerson) {
    const check = validateFibtResponses(person, def);
    if (!check.complete) {
      throw new FibtIncompleteResponseError(check.missingItemIds, check.invalidItemIds);
    }
  }

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
    const s = sums.get(item.id)!;
    return { itemId: item.id, value: s.total / s.count };
  });

  return { n, minN, visible: true, result: scoreFibt(avgResponses, def) };
}
