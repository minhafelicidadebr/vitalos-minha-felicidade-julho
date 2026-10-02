// Ciclo trimestral — representação interna única + conversor explícito.
//
// O repositório tem formatos de ciclo coexistindo (inventário em
// docs/vitalos/constitution/domain-model.md):
//   · `T1-2026`   — cycleId da jornada canônica (src/domain/journey.ts);
//   · `2026-t1`   — org_cycle_registry / victory_records (texto livre, minúsculo);
//   · `2026-T1`   — comentário da migration do registro de ciclos e specs IVO;
//   · slug de temporada (`fundacao-segura`) — action_plans criados por /plano-acao.
//
// Decisão: a representação INTERNA é `{ year, quarter }`; a forma CANÔNICA
// gravada pelos fluxos novos é `YYYY-Tn` (ex.: `2026-T2`). Os três primeiros
// formatos são convertidos explicitamente; o slug de temporada não carrega
// ano nem trimestre e é tratado como LEGADO (não interpretável) — nunca
// adivinhado. Nenhum dado gravado é reescrito: a conversão acontece na leitura.

export type CycleQuarter = 1 | 2 | 3 | 4;

export interface CycleRef {
  year: number;
  quarter: CycleQuarter;
}

export type CycleKeyFormat = "canonical" | "registry_lowercase" | "journey";

export interface ParsedCycleKey {
  cycle: CycleRef;
  format: CycleKeyFormat;
}

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

const PATTERNS: ReadonlyArray<{ format: CycleKeyFormat; re: RegExp; year: number; quarter: number }> = [
  { format: "canonical", re: /^(\d{4})-T([1-4])$/, year: 1, quarter: 2 },
  { format: "registry_lowercase", re: /^(\d{4})-t([1-4])$/, year: 1, quarter: 2 },
  { format: "journey", re: /^[Tt]([1-4])-(\d{4})$/, year: 2, quarter: 1 },
];

/** Interpreta um cycle_key existente. `null` = formato legado/desconhecido. */
export function parseCycleKey(raw: string | null | undefined): ParsedCycleKey | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  for (const pattern of PATTERNS) {
    const match = pattern.re.exec(value);
    if (!match) continue;
    const year = Number(match[pattern.year]);
    const quarter = Number(match[pattern.quarter]) as CycleQuarter;
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return null;
    return { cycle: { year, quarter }, format: pattern.format };
  }
  return null;
}

/** Forma canônica gravada pelos fluxos novos: `YYYY-Tn`. */
export function formatCycleKey(cycle: CycleRef): string {
  assertCycle(cycle);
  return `${cycle.year}-T${cycle.quarter}`;
}

/** Forma usada pela jornada canônica (`T2-2026`). */
export function toJourneyCycleId(cycle: CycleRef): string {
  assertCycle(cycle);
  return `T${cycle.quarter}-${cycle.year}`;
}

/** Converte qualquer formato reconhecido para o canônico; `null` se legado. */
export function normalizeCycleKey(raw: string | null | undefined): string | null {
  const parsed = parseCycleKey(raw);
  return parsed ? formatCycleKey(parsed.cycle) : null;
}

/**
 * Dois cycle_keys designam o mesmo ciclo? Só é verdadeiro quando AMBOS são
 * interpretáveis; chaves legadas só são iguais a si mesmas (comparação exata),
 * porque não há como saber a que trimestre um slug de temporada pertence.
 */
export function sameCycle(a: string, b: string): boolean {
  const pa = parseCycleKey(a);
  const pb = parseCycleKey(b);
  if (pa && pb) return pa.cycle.year === pb.cycle.year && pa.cycle.quarter === pb.cycle.quarter;
  return a.trim() === b.trim();
}

/**
 * Trimestre civil de um instante, no fuso declarado (padrão: America/Sao_Paulo,
 * o fuso operacional do produto). Regra operacional — não metodológica: o
 * ciclo de uma onda é o trimestre civil da sua abertura.
 */
export function cycleOfInstant(iso: string, timeZone = "America/Sao_Paulo"): CycleRef {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error("[cycle-key] instante inválido");
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const cycle: CycleRef = { year, quarter: (Math.floor((month - 1) / 3) + 1) as CycleQuarter };
  assertCycle(cycle);
  return cycle;
}

function assertCycle(cycle: CycleRef): void {
  if (
    !Number.isInteger(cycle.year) ||
    cycle.year < MIN_YEAR ||
    cycle.year > MAX_YEAR ||
    ![1, 2, 3, 4].includes(cycle.quarter)
  ) {
    throw new Error("[cycle-key] ciclo inválido");
  }
}
