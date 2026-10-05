import { describe, expect, test } from "bun:test";
import {
  EXPERIMENTAL_MARK,
  ExperimentalIndexRefused,
  computeExperimentalIvo,
  runExperimentalSensitivity,
  type ExperimentalInput,
  type ExperimentalMethodParams,
} from "./ivo-experimental-index";

// Parâmetros e dados SINTÉTICOS identificados. Nada aqui é método aprovado nem mede organização real.
const PARAMS: ExperimentalMethodParams = {
  methodId: "synthetic-test-equal-arith-v0",
  status: "TEST_ONLY_NOT_APPROVED",
  aggregation: "media_aritmetica_ponderada",
  dimensions: {
    eu: { weight: 0.25, constructs: [
      { id: "synthetic_eu_a", weight: 0.5, min: 0, max: 4, direction: "maior_melhor" },
      { id: "synthetic_eu_b", weight: 0.5, min: 1, max: 5, direction: "maior_melhor" },
    ] },
    nos: { weight: 0.25, constructs: [
      { id: "synthetic_nos_a", weight: 0.5, min: 0, max: 4, direction: "maior_melhor" },
      { id: "synthetic_nos_b", weight: 0.5, min: 0, max: 4, direction: "menor_melhor" },
    ] },
    lideranca: { weight: 0.25, constructs: [
      { id: "synthetic_lid_a", weight: 0.5, min: 0, max: 4, direction: "maior_melhor" },
      { id: "synthetic_lid_b", weight: 0.5, min: 0, max: 4, direction: "maior_melhor" },
    ] },
    organizacao: { weight: 0.25, constructs: [
      { id: "synthetic_org_a", weight: 0.5, min: 1, max: 5, direction: "maior_melhor" },
      { id: "synthetic_org_b", weight: 0.5, min: 1, max: 5, direction: "maior_melhor" },
    ] },
  },
};

const INPUT: ExperimentalInput = {
  synthetic: true,
  cohortKey: "synthetic-coorte-a",
  published: true,
  constructs: {
    synthetic_eu_a: 3, // 75
    synthetic_eu_b: 4, // 75  → EU 75
    synthetic_nos_a: 2, // 50
    synthetic_nos_b: 1, // invertido: 75 → NÓS 62,5
    synthetic_lid_a: 4, // 100
    synthetic_lid_b: 0, // 0   → LIDERANÇA 50
    synthetic_org_a: 5, // 100
    synthetic_org_b: 3, // 50  → ORGANIZAÇÃO 75
  },
};

describe("índice experimental (SOMENTE TESTE)", () => {
  test("normalização, direção e agregação aritmética conferem com o cálculo manual", () => {
    const r = computeExperimentalIvo(PARAMS, INPUT);
    expect(r.mark).toBe(EXPERIMENTAL_MARK);
    expect(r.dimensions.eu.value).toBeCloseTo(75, 10);
    expect(r.dimensions.nos.value).toBeCloseTo(62.5, 10);
    expect(r.dimensions.lideranca.value).toBeCloseTo(50, 10);
    expect(r.dimensions.organizacao.value).toBeCloseTo(75, 10);
    expect(r.value).toBeCloseTo(65.625, 10);
    expect(r.reason).toBeNull();
  });

  test("agregação geométrica penaliza a dimensão baixa (variante de sensibilidade)", () => {
    const geometric = { ...PARAMS, methodId: "synthetic-test-equal-geo-v0", aggregation: "media_geometrica_ponderada" as const };
    const r = computeExperimentalIvo(geometric, INPUT);
    expect(r.value).toBeCloseTo(Math.pow(75 * 62.5 * 50 * 75, 1 / 4), 8);
    expect(r.value!).toBeLessThan(65.625);
  });

  test("ausência nunca vira zero e os pesos NÃO são redistribuídos", () => {
    const r = computeExperimentalIvo(PARAMS, { ...INPUT, constructs: { ...INPUT.constructs, synthetic_lid_b: null } });
    expect(r.value).toBeNull();
    expect(r.reason).toBe("dimensao_indisponivel:lideranca");
    expect(r.dimensions.lideranca).toEqual({ value: null, reason: "entrada_ausente:synthetic_lid_b" });
    // As demais dimensões continuam exatamente como antes (sem absorver o peso da ausente).
    expect(r.dimensions.eu.value).toBeCloseTo(75, 10);
    const missingEntirely = { ...INPUT, constructs: { ...INPUT.constructs } };
    delete (missingEntirely.constructs as Record<string, unknown>).synthetic_eu_a;
    expect(computeExperimentalIvo(PARAMS, missingEntirely).dimensions.eu.reason).toBe("entrada_ausente:synthetic_eu_a");
  });

  test("valor fora da escala declarada é recusado como nulo, não truncado", () => {
    const r = computeExperimentalIvo(PARAMS, { ...INPUT, constructs: { ...INPUT.constructs, synthetic_eu_a: 9 } });
    expect(r.dimensions.eu.reason).toBe("fora_da_escala:synthetic_eu_a");
    expect(r.value).toBeNull();
  });

  test("coorte não publicada (protegida) não produz valor nenhum", () => {
    const r = computeExperimentalIvo(PARAMS, { ...INPUT, published: false });
    expect(r.value).toBeNull();
    expect(r.reason).toBe("coorte_nao_publicada");
    expect(Object.values(r.dimensions).every((d) => d.value === null)).toBe(true);
  });

  test("recusa construto real da FIB-T, método sem prefixo e coorte não sintética", () => {
    const real = { ...PARAMS, dimensions: { ...PARAMS.dimensions, eu: { weight: 0.25, constructs: [{ id: "bem_estar", weight: 1, min: 0, max: 4, direction: "maior_melhor" as const }] } } };
    expect(() => computeExperimentalIvo(real, INPUT)).toThrow(ExperimentalIndexRefused);
    expect(() => computeExperimentalIvo({ ...PARAMS, methodId: "ivo-piloto-v0.1" }, INPUT)).toThrow(ExperimentalIndexRefused);
    expect(() => computeExperimentalIvo(PARAMS, { ...INPUT, cohortKey: "Operações" })).toThrow(ExperimentalIndexRefused);
    expect(() => computeExperimentalIvo({ ...PARAMS, status: "APROVADO" as unknown as "TEST_ONLY_NOT_APPROVED" }, INPUT)).toThrow(ExperimentalIndexRefused);
  });

  test("pesos que não somam 1 são recusados", () => {
    const bad = { ...PARAMS, dimensions: { ...PARAMS.dimensions, eu: { ...PARAMS.dimensions.eu, weight: 0.4 } } };
    expect(() => computeExperimentalIvo(bad, INPUT)).toThrow(/pesos das dimensões/);
  });

  test("só roda em NODE_ENV=test", () => {
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      expect(() => computeExperimentalIvo(PARAMS, INPUT)).toThrow(/ambiente de teste/);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  test("sensibilidade: mesma entrada, pesos e agregação diferentes, amplitude explícita", () => {
    const weighted = { ...PARAMS, methodId: "synthetic-test-framework-weights-v0", dimensions: {
      eu: { ...PARAMS.dimensions.eu, weight: 0.27 }, nos: { ...PARAMS.dimensions.nos, weight: 0.25 },
      lideranca: { ...PARAMS.dimensions.lideranca, weight: 0.24 }, organizacao: { ...PARAMS.dimensions.organizacao, weight: 0.24 },
    } };
    const geo = { ...PARAMS, methodId: "synthetic-test-equal-geo-v0", aggregation: "media_geometrica_ponderada" as const };
    const report = runExperimentalSensitivity(INPUT, [
      { label: "pesos iguais, aritmética", params: PARAMS },
      { label: "pesos 27/25/24/24, aritmética", params: weighted },
      { label: "pesos iguais, geométrica", params: geo },
    ]);
    expect(report.rows.map((r) => r.value !== null)).toEqual([true, true, true]);
    expect(report.spread).toBeGreaterThan(0);
    const broken = runExperimentalSensitivity({ ...INPUT, published: false }, [{ label: "x", params: PARAMS }]);
    expect(broken.spread).toBeNull();
  });
});

describe("guarda: o índice experimental não escapa do ambiente de teste", () => {
  function gitGrep(pattern: string, paths: string[]): string[] {
    const r = Bun.spawnSync(["git", "grep", "--untracked", "-l", "-F", pattern, "--", ...paths], { cwd: process.cwd() });
    return new TextDecoder().decode(r.stdout).split("\n").map((l) => l.trim()).filter(Boolean);
  }
  const isTestOrExperimental = (file: string) => /\.test\.(ts|tsx)$/.test(file) || file.startsWith("src/engine/ivo/experimental/");

  test("nenhum arquivo fora dos testes e da própria pasta importa o módulo experimental", () => {
    expect(gitGrep("ivo-experimental-index", ["src", "scripts"]).filter((f) => !isTestOrExperimental(f))).toEqual([]);
  });

  test("rotas, servidor e componentes não citam o cálculo experimental", () => {
    const hits = gitGrep("computeExperimentalIvo", ["src/routes", "src/lib", "src/components", "src/app"]);
    expect(hits.filter((f) => !isTestOrExperimental(f))).toEqual([]);
  });
});