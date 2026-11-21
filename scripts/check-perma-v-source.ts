// Q3 · PERMA+V — verificador de fonte, FAIL-CLOSED (fatia F1).
//
// Espelha scripts/check-copsoq-source.ts: a ficha de referência guarda só HASHES (nenhum
// texto de item, opção ou escala entra no repositório) e um comparador puro confere um
// manifesto candidato contra ela. Enquanto não houver ficha APROVADA registrada, o CLI sai
// com erro citando as pendências Q3-01/02/03. Ficha "test" é recusada fora dos testes.
//
//   bun run scripts/check-perma-v-source.ts [caminho-da-ficha]
//
// Não define instrumento, itens, fatores, escala nem cálculo: tudo vem da decisão registrada.
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

export const DEFAULT_REFERENCE_PATH = "docs/vitalos/sources/q3-perma-v-reference.json";

const id = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/i);
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const decisionRecord = z.string().regex(/^docs\/vitalos\/decisions\/[\w.-]+\.md$/);

const itemSchema = z
  .object({ sourceId: id, id, factorId: id, reverse: z.boolean(), textSha256: sha256, optionsSha256: sha256 })
  .strict();

const caseSchema = z
  .object({
    id,
    /** Uma linha por respondente; uma coluna por item, na ordem da ficha. `null` = ausência. */
    responses: z.array(z.array(z.number().finite().nullable()).min(1)).min(1),
    /** Média e n esperados por fator; `null` = o caso deve ser suprimido/inválido. */
    expected: z.record(id, z.object({ mean: z.number().finite(), n: z.number().int().positive() }).strict()).nullable(),
  })
  .strict();

export const permaVSourceReferenceSchema = z
  .object({
    status: z.enum(["approved", "test"]),
    /** Q3-01/02: registro da decisão que aprova instrumento, fonte e permissão. */
    decisionRecord,
    instrument: z
      .object({
        name: z.string().trim().min(1),
        edition: id,
        form: id,
        locale: z.literal("pt-BR"),
        /** Q3-01: o que é o "+V" e onde foi decidido (ou `none` se a lente não tiver +V). */
        plusV: z.union([z.literal("none"), z.object({ meaning: z.string().trim().min(1), decisionRecord }).strict()]),
      })
      .strict(),
    artifactSha256: sha256,
    sourceLocator: z.string().trim().min(1),
    usagePermission: z.object({ granted: z.literal(true), decisionRecord }).strict(),
    factors: z.array(z.object({ id }).strict()).min(1),
    items: z.array(itemSchema).min(1),
    missingRule: z.object({ maxMissingPerFactor: z.number().int().nonnegative(), rulesLocator: z.string().trim().min(1) }).strict(),
    scoring: z
      .object({
        rulesLocator: z.string().trim().min(1),
        /** Faixa de resposta e forma de agregar, conforme o manual citado em `rulesLocator`. */
        scale: z.object({ min: z.number().int(), max: z.number().int() }).strict(),
        aggregation: z.enum(["mean", "sum"]),
        cases: z.array(caseSchema).min(2),
      })
      .strict(),
  })
  .strict()
  .superRefine((ref, ctx) => {
    const factorIds = new Set(ref.factors.map((f) => f.id));
    if (factorIds.size !== ref.factors.length) ctx.addIssue({ code: "custom", message: "fator duplicado" });
    if (new Set(ref.items.map((i) => i.id)).size !== ref.items.length) ctx.addIssue({ code: "custom", message: "item duplicado" });
    if (new Set(ref.items.map((i) => i.sourceId)).size !== ref.items.length) ctx.addIssue({ code: "custom", message: "sourceId duplicado" });
    for (const i of ref.items) if (!factorIds.has(i.factorId)) ctx.addIssue({ code: "custom", message: `item ${i.id} em fator inexistente` });
    for (const f of factorIds) if (!ref.items.some((i) => i.factorId === f)) ctx.addIssue({ code: "custom", message: `fator ${f} sem item` });
    if (new Set(ref.scoring.cases.map((c) => c.id)).size !== ref.scoring.cases.length) ctx.addIssue({ code: "custom", message: "caso duplicado" });
    const { min, max } = ref.scoring.scale;
    if (min >= max) ctx.addIssue({ code: "custom", message: "escala: min precisa ser menor que max" });
    for (const c of ref.scoring.cases)
      for (const row of c.responses) {
        if (row.length !== ref.items.length) ctx.addIssue({ code: "custom", message: `caso ${c.id}: linha com ${row.length} de ${ref.items.length} itens` });
        if (row.some((v) => v !== null && (!Number.isInteger(v) || v < min || v > max)))
          ctx.addIssue({ code: "custom", message: `caso ${c.id}: resposta fora da escala` });
      }
  });
export type PermaVSourceReference = z.infer<typeof permaVSourceReferenceSchema>;

/** Manifesto candidato (F3) no formato comparável: os textos já viram hash antes daqui. */
export interface PermaVManifestCandidate {
  version: string;
  locale: string;
  factors: readonly { id: string }[];
  items: readonly { id: string; factorId: string; reverse: boolean; textSha256: string; optionsSha256: string }[];
}

/** Cálculo por fator do motor (F3), injetado: o verificador não implementa pontuação. */
export type PermaVScorer = (responses: (number | null)[][]) => Record<string, { mean: number; n: number }> | null;

export interface Finding {
  check: string;
  id?: string;
}

export function comparePermaVSource(
  reference: PermaVSourceReference,
  candidate: PermaVManifestCandidate,
  scorer?: PermaVScorer,
): Finding[] {
  const findings: Finding[] = [];
  if (candidate.locale !== reference.instrument.locale) findings.push({ check: "locale" });
  const refFactors = reference.factors.map((f) => f.id).join("|");
  if (candidate.factors.map((f) => f.id).join("|") !== refFactors) findings.push({ check: "fatores (ids/ordem)" });
  if (candidate.items.length !== reference.items.length) findings.push({ check: "contagem de itens" });
  reference.items.forEach((r, i) => {
    const c = candidate.items[i];
    if (!c || c.id !== r.id) return findings.push({ check: "ordem/id do item", id: r.id });
    if (c.factorId !== r.factorId) findings.push({ check: "fator do item", id: r.id });
    if (c.reverse !== r.reverse) findings.push({ check: "polaridade", id: r.id });
    if (c.textSha256 !== r.textSha256) findings.push({ check: "texto", id: r.id });
    if (c.optionsSha256 !== r.optionsSha256) findings.push({ check: "opções", id: r.id });
  });
  if (!scorer) findings.push({ check: "cálculo não fornecido (F3)" });
  else
    for (const example of reference.scoring.cases) {
      const got = scorer(example.responses);
      const ok =
        example.expected === null
          ? got === null
          : got !== null &&
            Object.keys(example.expected).length === Object.keys(got).length &&
            Object.entries(example.expected).every(([f, e]) => got[f] && Math.abs(got[f].mean - e.mean) < 1e-9 && got[f].n === e.n);
      if (!ok) findings.push({ check: "caso esperado", id: example.id });
    }
  return findings;
}

/** Regras de cálculo da ficha no formato do motor (src/lib/ivo/q3-factor-scorer.ts). */
export function scoringRulesFromReference(ref: PermaVSourceReference) {
  return {
    scale: ref.scoring.scale,
    aggregation: ref.scoring.aggregation,
    maxMissingPerFactor: ref.missingRule.maxMissingPerFactor,
    items: ref.items.map(({ factorId, reverse }) => ({ factorId, reverse })),
  };
}

/** Carrega a ficha. Fail-closed: ausente, inválida ou de teste → pendência citada. */
export function loadPermaVReference(path: string, allowTest = false): { ok: true; reference: PermaVSourceReference } | { ok: false; pending: string } {
  if (!existsSync(path)) return { ok: false, pending: "Q3-01/Q3-02/Q3-03 pendentes: nenhuma ficha de fonte aprovada registrada." };
  const parsed = permaVSourceReferenceSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) return { ok: false, pending: "Ficha de fonte inválida: " + parsed.error.issues.map((i) => i.message).join("; ") };
  if (parsed.data.status === "test" && !allowTest) return { ok: false, pending: "Ficha marcada como teste: não vale como fonte aprovada." };
  return { ok: true, reference: parsed.data };
}

if (import.meta.main) {
  const path = process.argv[2] ?? DEFAULT_REFERENCE_PATH;
  const loaded = loadPermaVReference(path);
  if (!loaded.ok) {
    console.error(`[q3-fonte] RECUSADO — ${loaded.pending}`);
    process.exit(1);
  }
  // Até a F3 não existe manifesto; a ficha aprovada sozinha não habilita a lente.
  console.error("[q3-fonte] Ficha aprovada carregada, mas não há manifesto PERMA+V (F3) para comparar.");
  process.exit(1);
}
