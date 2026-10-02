import { describe, expect, test } from "bun:test";
import { CANONICAL_JOURNEY } from "@/domain/journey";
import { REGISTERED_PACK_IDS } from "@/domain/packs/registry";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { FIBT_LENS_ROUTE, ivoDimensionsForPack, ivoLensCatalog } from "./lens-catalog";
import {
  getDimensionMappings,
  validateDimensionMappings,
} from "./dimension-mappings";

const validEntry = {
  id: "map-1",
  version: "1.0.0",
  lens: "fibt",
  source_construct_id: "bem_estar",
  dimension: "eu",
  status: "PROPOSTO",
  rationale: "fixture",
  owner: null,
  scientific_evidence: [],
  approved_at: null,
};

describe("catálogo de lentes IVO", () => {
  test("4 lentes, uma por estação da jornada, na mesma ordem", () => {
    const catalog = ivoLensCatalog();
    expect(catalog.map((l) => l.id)).toEqual(["copsoq", "fibt", "perma_v", "via_t"]);
    expect(catalog.map((l) => l.quarter)).toEqual(["Q1", "Q2", "Q3", "Q4"]);
    expect(catalog).toHaveLength(CANONICAL_JOURNEY.length);
  });

  test("somente a FIB-T é funcional, com versão do manifesto e rota do painel protegido", () => {
    const catalog = ivoLensCatalog();
    const fibt = catalog.find((l) => l.id === "fibt")!;
    expect(fibt.availability).toBe("functional");
    expect(fibt.instrumentVersion).toBe(getFibtManifest().instrument_version);
    expect(fibt.route).toBe(FIBT_LENS_ROUTE);
    for (const lens of catalog.filter((l) => l.id !== "fibt")) {
      expect(lens.availability).toBe("planned");
      expect(lens.instrumentVersion).toBeNull();
      expect(lens.route).toBeNull();
    }
  });

  test("nenhum rótulo de lente apresenta o IVO como saída de uma lente (C2)", () => {
    for (const lens of ivoLensCatalog()) expect(lens.label).not.toContain("IVO");
  });

  test("todo pack registrado fornece as 4 dimensões com vocabulário próprio", () => {
    for (const packId of REGISTERED_PACK_IDS) {
      const dims = ivoDimensionsForPack(packId);
      expect(dims.map((d) => d.id)).toEqual(["eu", "nos", "lideranca", "organizacao"]);
      expect(dims.every((d) => d.label.trim().length > 0)).toBe(true);
    }
    expect(ivoDimensionsForPack("enterprise")[0]!.label).toContain("EU");
  });
});

describe("registro de mapeamentos lente → dimensão", () => {
  test("nenhum mapeamento está aprovado hoje", () => {
    expect(getDimensionMappings().filter((m) => m.status === "APROVADO")).toEqual([]);
  });

  test("aceita PROPOSTO bem formado", () => {
    expect(validateDimensionMappings({ registry_version: "1", mappings: [validEntry] })).toHaveLength(1);
  });

  test("APROVADO sem responsável, evidência e data é recusado", () => {
    expect(() =>
      validateDimensionMappings({ registry_version: "1", mappings: [{ ...validEntry, status: "APROVADO" }] }),
    ).toThrow(/APROVADO exige/);
  });

  test("construto inexistente na FIB-T é recusado", () => {
    expect(() =>
      validateDimensionMappings({
        registry_version: "1",
        mappings: [{ ...validEntry, source_construct_id: "inventado" }],
      }),
    ).toThrow(/não existe/);
  });

  test("lente planejada não pode receber mapeamento", () => {
    expect(() =>
      validateDimensionMappings({ registry_version: "1", mappings: [{ ...validEntry, lens: "via_t" }] }),
    ).toThrow(/construtos versionados/);
  });

  test("id duplicado é recusado", () => {
    expect(() =>
      validateDimensionMappings({ registry_version: "1", mappings: [validEntry, validEntry] }),
    ).toThrow(/duplicado/);
  });
});
