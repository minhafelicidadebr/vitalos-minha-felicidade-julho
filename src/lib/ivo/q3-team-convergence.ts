// Q3 · régua do IVO — correlação entre MÉDIAS DE EQUIPE (onda 2), NÃO LIGADA.
//
// Implementa a análise do plano registrado
// (docs/vitalos/decisions/PLANO_REGISTRADO_Q3_CONVERGENCIA_IVO_2026-11-19.md).
// Função pura: recebe só agregados por equipe (nunca resposta individual), descarta equipes
// com menos de 5 respondentes em qualquer instrumento e devolve apenas r, nº de equipes e
// veredito. Os critérios (mínimo de equipes, limiar) vêm do plano — não há default aqui.
// Nenhum endpoint a importa até a F5 (teste de importadores).

export const Q3_TEAM_K_MIN = 5;

export interface TeamAggregate {
  teamId: string;
  permaMean: number;
  permaN: number;
  ivoMean: number;
  ivoN: number;
}

export interface ConvergenceCriteria {
  /** N_eq do plano: mínimo de equipes válidas para a análise valer. */
  minTeams: number;
  /** Limiar convergente C do plano. */
  threshold: number;
  method: "spearman" | "pearson";
}

export type ConvergenceResult =
  | { verdict: "insufficient"; teams: number; reason: "few_teams" | "no_variance" }
  | { verdict: "supports" | "does_not_support"; teams: number; r: number };

export class ConvergenceInputError extends Error {}

function pearson(x: readonly number[], y: readonly number[]): number | null {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx;
    const dy = y[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

/** Postos médios (empates recebem a média dos postos). */
function ranks(v: readonly number[]): number[] {
  const order = v.map((value, i) => ({ value, i })).sort((a, b) => a.value - b.value);
  const out = new Array<number>(v.length);
  for (let s = 0; s < order.length; ) {
    let e = s;
    while (e + 1 < order.length && order[e + 1]!.value === order[s]!.value) e++;
    for (let k = s; k <= e; k++) out[order[k]!.i] = (s + e) / 2 + 1;
    s = e + 1;
  }
  return out;
}

export function correlate(x: readonly number[], y: readonly number[], method: ConvergenceCriteria["method"]): number | null {
  return method === "spearman" ? pearson(ranks(x), ranks(y)) : pearson(x, y);
}

function validate(teams: readonly TeamAggregate[], c: ConvergenceCriteria): void {
  if (!Number.isInteger(c.minTeams) || c.minTeams < 3) throw new ConvergenceInputError("minTeams precisa ser inteiro ≥ 3 (fixado no plano)");
  if (!(c.threshold > 0 && c.threshold < 1)) throw new ConvergenceInputError("threshold precisa estar em (0, 1) (fixado no plano)");
  const ids = new Set<string>();
  for (const t of teams) {
    if (ids.has(t.teamId)) throw new ConvergenceInputError(`equipe duplicada: ${t.teamId}`);
    ids.add(t.teamId);
    if (![t.permaMean, t.ivoMean, t.permaN, t.ivoN].every(Number.isFinite)) throw new ConvergenceInputError(`valor não finito: ${t.teamId}`);
  }
}

/** Só equipes com ≥ 5 respondentes nos DOIS instrumentos entram. */
export function eligibleTeams(teams: readonly TeamAggregate[]): TeamAggregate[] {
  return teams.filter((t) => t.permaN >= Q3_TEAM_K_MIN && t.ivoN >= Q3_TEAM_K_MIN);
}

function decide(teams: readonly TeamAggregate[], criteria: ConvergenceCriteria, pass: (r: number) => boolean): ConvergenceResult {
  const valid = eligibleTeams(teams);
  if (valid.length < criteria.minTeams) return { verdict: "insufficient", teams: valid.length, reason: "few_teams" };
  const r = correlate(valid.map((t) => t.permaMean), valid.map((t) => t.ivoMean), criteria.method);
  if (r === null) return { verdict: "insufficient", teams: valid.length, reason: "no_variance" };
  return { verdict: pass(r) ? "supports" : "does_not_support", teams: valid.length, r };
}

/** Hipótese convergente: sustenta se r ≥ limiar com N_eq equipes válidas. */
export function testConvergent(teams: readonly TeamAggregate[], criteria: ConvergenceCriteria): ConvergenceResult {
  validate(teams, criteria);
  return decide(teams, criteria, (r) => r >= criteria.threshold);
}

/** Hipótese discriminante: |r| do par discriminante < r do convergente. Só decide se o convergente decidiu. */
export function testDiscriminant(
  convergent: ConvergenceResult,
  discriminantTeams: readonly TeamAggregate[],
  criteria: ConvergenceCriteria,
): ConvergenceResult {
  validate(discriminantTeams, criteria);
  if (convergent.verdict === "insufficient") return { verdict: "insufficient", teams: eligibleTeams(discriminantTeams).length, reason: "few_teams" };
  return decide(discriminantTeams, criteria, (r) => Math.abs(r) < convergent.r);
}
