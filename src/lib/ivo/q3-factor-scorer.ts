// Q3 · cálculo por fator PARAMETRIZADO PELA FICHA DA FONTE (onda 3), NÃO LIGADO.
//
// Nenhuma regra metodológica nasce aqui: escala, inversão, limite de ausências e forma de
// agregar vêm da ficha aprovada (scripts/check-perma-v-source.ts), que por sua vez cita o
// manual dos autores. O verificador da F1 confere este cálculo contra os casos esperados
// da própria ficha antes de qualquer uso. Sem itens, sem textos.
//
// Escore do respondente no fator: itens invertidos viram (min + max − x); com mais ausências
// do que o permitido o escore é nulo; senão, agrega os presentes (média ou soma, conforme ficha).
// Resultado do grupo: média dos escores válidos e quantos respondentes tiveram escore válido.

export interface FactorScoringRules {
  scale: { min: number; max: number };
  aggregation: "mean" | "sum";
  maxMissingPerFactor: number;
  /** Na ordem das colunas de resposta. */
  items: readonly { factorId: string; reverse: boolean }[];
}

export type FactorScores = Record<string, { mean: number; n: number }>;

export class FactorScoringError extends Error {}

function respondentScore(row: readonly (number | null)[], columns: readonly number[], rules: FactorScoringRules): number | null {
  const present: number[] = [];
  for (const c of columns) {
    const v = row[c];
    if (v === null || v === undefined) continue;
    present.push(rules.items[c]!.reverse ? rules.scale.min + rules.scale.max - v : v);
  }
  if (columns.length - present.length > rules.maxMissingPerFactor || present.length === 0) return null;
  const sum = present.reduce((a, b) => a + b, 0);
  return rules.aggregation === "sum" ? sum : sum / present.length;
}

/** Devolve só fatores com ao menos um escore válido; `null` se nenhum fator tiver. */
export function scoreFactors(responses: readonly (readonly (number | null)[])[], rules: FactorScoringRules): FactorScores | null {
  const { min, max } = rules.scale;
  if (!(Number.isInteger(min) && Number.isInteger(max) && min < max)) throw new FactorScoringError("escala inválida na ficha");
  const columnsByFactor = new Map<string, number[]>();
  rules.items.forEach((item, i) => columnsByFactor.set(item.factorId, [...(columnsByFactor.get(item.factorId) ?? []), i]));

  for (const row of responses) {
    if (row.length !== rules.items.length) throw new FactorScoringError(`linha com ${row.length} de ${rules.items.length} itens`);
    for (const v of row)
      if (v !== null && !(Number.isInteger(v) && v >= min && v <= max)) throw new FactorScoringError(`resposta fora da escala ${min}–${max}`);
  }

  const out: FactorScores = {};
  for (const [factorId, columns] of columnsByFactor) {
    const scores = responses.map((row) => respondentScore(row, columns, rules)).filter((s): s is number => s !== null);
    if (scores.length > 0) out[factorId] = { mean: scores.reduce((a, b) => a + b, 0) / scores.length, n: scores.length };
  }
  return Object.keys(out).length > 0 ? out : null;
}
