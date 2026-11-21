import { describe, expect, test } from "bun:test";
import fixture from "./copsoq-ii-br-short-2021.cases.json";
import ref from "./copsoq-ii-br-short-2021.reference.json";

// Calculadora de referência independente do runtime (o app ainda não implementa a II-Br).
const PENDING = "pendente_ficha_oficial";
const OFFENSIVE = "offensive_behaviours";
const dims = ref.domains.flatMap((d) => d.dimensions);
const max = fixture.itemMax as Record<string, number>;
type Resp = Record<string, number | null>;

function score(resp: Resp): Record<string, number | string> | "recusado" {
  for (const [id, v] of Object.entries(resp)) if (v !== null && (!Number.isInteger(v) || v < 0 || v > max[id]!)) return "recusado";
  const code = (id: string) => (ref.scoring.reversedItems.includes(id) ? max[id]! - resp[id]! : resp[id]!);
  return Object.fromEntries(
    dims.map((d) => [d.id, d.id === OFFENSIVE || d.items.some((i) => resp[i] === null) ? PENDING : d.items.reduce((a, i) => a + code(i), 0)]),
  );
}

describe("Q1 · casos sintéticos COPSOQ II-Br curta (soma por dimensão)", () => {
  test("cada caso cobre as 40 questões da referência", () => {
    const items = dims.flatMap((d) => d.items).sort();
    for (const c of fixture.cases) expect(Object.keys(c.responses).sort()).toEqual(items);
  });

  test("codificação por item: 0–4, 13 em 0–3, 20–23 em 0–1", () => {
    expect(max["13"]).toBe(3);
    for (const i of ["20", "21", "22", "23"]) expect(max[i]).toBe(1);
    expect(Object.entries(max).filter(([i]) => !["13", "20", "21", "22", "23"].includes(i)).every(([, m]) => m === 4)).toBe(true);
  });

  test("1B invertido: mínimo soma 4 em exigências, máximo perde 4", () => {
    const [min, maxCase] = fixture.cases;
    expect((score(min!.responses as Resp) as Record<string, number>).demands_at_work).toBe(4);
    expect((score(maxCase!.responses as Resp) as Record<string, number>).demands_at_work).toBe(20);
  });

  for (const c of fixture.cases)
    test(`resultado esperado: ${c.id}`, () => {
      expect(score(c.responses as Resp)).toEqual(c.expected as never);
    });

  test("ofensivos e respostas em branco ficam pendentes, nunca zero", () => {
    for (const c of fixture.cases.filter((x) => typeof x.expected === "object")) expect((c.expected as Record<string, unknown>)[OFFENSIVE]).toBe(PENDING);
  });
});
