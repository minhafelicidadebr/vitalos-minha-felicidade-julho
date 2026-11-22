import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scoreFactors } from "../src/lib/ivo/q3-factor-scorer";
import { comparePermaVSource, loadPermaVReference, permaVSourceReferenceSchema, scoringRulesFromReference, type PermaVManifestCandidate } from "./check-perma-v-source";

// Ficha SINTÉTICA de teste: ids e hashes inventados, nenhum conteúdo de instrumento real.
const h = (c: string) => c.repeat(64);
const decision = "docs/vitalos/decisions/TESTE_SINTETICO.md";
const ref = {
  status: "test" as const,
  decisionRecord: decision,
  instrument: { name: "Instrumento sintético", edition: "t1", form: "curta", locale: "pt-BR" as const, plusV: "none" as const },
  artifactSha256: h("a"),
  sourceLocator: "fixture sintética",
  usagePermission: { granted: true as const, decisionRecord: decision },
  factors: [{ id: "f1" }, { id: "f2" }],
  items: [
    { sourceId: "s1", id: "i1", factorId: "f1", reverse: false, textSha256: h("1"), optionsSha256: h("9") },
    { sourceId: "s2", id: "i2", factorId: "f2", reverse: true, textSha256: h("2"), optionsSha256: h("9") },
  ],
  missingRule: { maxMissingPerFactor: 0, rulesLocator: "fixture" },
  scoring: {
    rulesLocator: "fixture",
    scale: { min: 0, max: 10 },
    aggregation: "mean" as const,
    cases: [
      { id: "c1", responses: [[1, 2]], expected: { f1: { mean: 1, n: 1 }, f2: { mean: 8, n: 1 } } },
      { id: "c2", responses: [[null, 2]], expected: { f2: { mean: 8, n: 1 } } },
      { id: "c3", responses: [[null, null]], expected: null },
    ],
  },
};
const candidate: PermaVManifestCandidate = {
  version: "t1", locale: "pt-BR", factors: [{ id: "f1" }, { id: "f2" }],
  items: ref.items.map(({ id, factorId, reverse, textSha256, optionsSha256 }) => ({ id, factorId, reverse, textSha256, optionsSha256 })),
};
const scorer = (rows: (number | null)[][]) => scoreFactors(rows, scoringRulesFromReference(permaVSourceReferenceSchema.parse(ref)));

describe("verificador de fonte Q3 (fail-closed)", () => {
  test("sem ficha registrada: recusa citando Q3-01/02/03", () => {
    expect(loadPermaVReference(join(tmpdir(), "nao-existe-q3.json"))).toEqual({ ok: false, pending: expect.stringMatching(/Q3-01\/Q3-02\/Q3-03 pendentes/) });
  });

  test("ficha de teste só vale quando o teste permite explicitamente", () => {
    const dir = mkdtempSync(join(tmpdir(), "q3src-"));
    const p = join(dir, "ref.json");
    writeFileSync(p, JSON.stringify(ref));
    expect(loadPermaVReference(p)).toMatchObject({ ok: false, pending: expect.stringMatching(/teste/) });
    expect(loadPermaVReference(p, true)).toMatchObject({ ok: true });
  });

  test("schema exige decisão registrada para +V e permissão, e coerência item/fator/caso", () => {
    expect(permaVSourceReferenceSchema.safeParse(ref).success).toBe(true);
    expect(permaVSourceReferenceSchema.safeParse({ ...ref, instrument: { ...ref.instrument, plusV: { meaning: "x" } } }).success).toBe(false);
    expect(permaVSourceReferenceSchema.safeParse({ ...ref, usagePermission: { granted: false, decisionRecord: decision } }).success).toBe(false);
    expect(permaVSourceReferenceSchema.safeParse({ ...ref, items: [ref.items[0]] }).success).toBe(false); // fator f2 sem item + linha com 2 colunas
    expect(permaVSourceReferenceSchema.safeParse({ ...ref, decisionRecord: "qualquer.md" }).success).toBe(false);
    expect(permaVSourceReferenceSchema.safeParse({ ...ref, scoring: { ...ref.scoring, scale: { min: 10, max: 0 } } }).success).toBe(false);
    expect(permaVSourceReferenceSchema.safeParse({ ...ref, scoring: { ...ref.scoring, cases: [...ref.scoring.cases, { id: "c9", responses: [[11, 0]], expected: null }] } }).success).toBe(false);
  });

  test("manifesto idêntico e motor parametrizado pela ficha não geram achados", () => {
    expect(comparePermaVSource(permaVSourceReferenceSchema.parse(ref), candidate, scorer)).toEqual([]);
  });

  test("divergências de ordem, polaridade, texto e cálculo são apontadas", () => {
    const r = permaVSourceReferenceSchema.parse(ref);
    const bad: PermaVManifestCandidate = { ...candidate, items: [{ ...candidate.items[0]!, reverse: true, textSha256: h("f") }, candidate.items[1]!] };
    const checks = comparePermaVSource(r, bad, () => ({ f1: { mean: 0, n: 1 }, f2: { mean: 2, n: 1 } })).map((f) => f.check);
    expect(checks).toEqual(expect.arrayContaining(["polaridade", "texto", "caso esperado"]));
    expect(comparePermaVSource(r, candidate).map((f) => f.check)).toContain("cálculo não fornecido (F3)");
  });
});
