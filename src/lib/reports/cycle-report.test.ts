import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SYNTHETIC_CYCLE, projectRecord, renderCycleReportHtml, validateCycle, type CycleRecord } from "./cycle-report";

const root = join(import.meta.dir, "..", "..", "..");
const assets = { vitalosLogo: "v.png", institutoLogo: "i.png" };

describe("Relatório Global · ciclo sintético rastreável", () => {
  test("ciclo coerente e Q2 percorre as seis etapas", () => {
    expect(validateCycle(SYNTHETIC_CYCLE)).toEqual([]);
    const steps = new Set(SYNTHETIC_CYCLE.records.filter((r) => r.lens === "Q2").map((r) => r.step));
    for (const s of ["Leitura agregada", "Atividade aprovada", "Plano", "Execução", "Aprendizagem", "Devolutiva coletiva"]) expect(steps.has(s)).toBe(true);
  });

  test("ausência, supressão e ausência de mudança são estados distintos", () => {
    const states = new Set(SYNTHETIC_CYCLE.records.map((r) => r.data));
    for (const s of ["absent", "suppressed", "no_change", "present"]) expect(states.has(s as CycleRecord["data"])).toBe(true);
  });

  test("registro suprimido não carrega origem, texto nem ESG", () => {
    const p = projectRecord(SYNTHETIC_CYCLE.records.find((r) => r.data === "suppressed")!);
    expect(p.origin).toBe("Não exibida");
    expect(p.esg).toBe("—");
    expect(p.finding).toContain("menos de 5");
  });

  test("validador recusa impacto sem avaliação, ESG aprovado, afirmação sem dado e modo real", () => {
    const base = SYNTHETIC_CYCLE.records[0]!;
    expect(validateCycle({ mode: "synthetic", records: [{ ...base, claim: "evaluated_impact" }] }).length).toBeGreaterThan(0);
    expect(validateCycle({ mode: "synthetic", records: [{ ...base, esg: { axis: "S", state: "approved", note: "x" } }] }).length).toBeGreaterThan(0);
    expect(validateCycle({ mode: "synthetic", records: [{ ...base, data: "absent", claim: "execution" }] }).length).toBeGreaterThan(0);
    expect(validateCycle({ mode: "institutional", records: [] })).toContain("modo não sintético recusado");
  });

  test("lentes sem dado não ganham resultado; referências de estado existem", () => {
    for (const r of SYNTHETIC_CYCLE.records.filter((x) => x.lens !== "Q2" && x.data !== "present")) expect(r.claim).toBe("none");
    for (const l of SYNTHETIC_CYCLE.lenses) if (!l.ref.startsWith("branch")) expect(existsSync(join(root, l.ref))).toBe(true);
    for (const r of SYNTHETIC_CYCLE.records) if (r.evidence.startsWith("docs/") || r.evidence.startsWith("src/")) expect(existsSync(join(root, r.evidence))).toBe(true);
  });

  test("HTML marca o exemplo como sintético, sem impacto avaliado nem nota ESG", () => {
    const html = renderCycleReportHtml(SYNTHETIC_CYCLE, assets);
    expect(html).toContain("EXEMPLO SINTÉTICO");
    expect(html).toContain("Resumo executivo");
    expect(html).toContain("Anexo · rastreabilidade");
    expect(html.replace(/<style>[\s\S]*<\/style>/, "")).not.toMatch(/\d+ ?%/);
    expect(html).not.toContain("vínculo aprovado:");
  });
});
