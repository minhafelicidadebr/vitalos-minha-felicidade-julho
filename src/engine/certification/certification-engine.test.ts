import { describe, expect, test } from "bun:test";
import { certify, DEFAULT_CERT_CONFIG, type CertificationInput } from "./certification-engine";

// Estado que cumpre TODOS os critérios (Referência).
function fullInput(over: Partial<CertificationInput> = {}): CertificationInput {
  return {
    ivoScore: 700,
    previousIvoScore: 680,
    participationPct: 78,
    experimentsConfirmed: 2,
    domainBReady: true,
    consentCoveragePct: 88,
    kAnonRespected: true,
    ...over,
  };
}

// ─── Concessão e tiers ────────────────────────────────────────────────────────

describe("certify — tiers", () => {
  test("todos os critérios cumpridos → Referência, selo concedido", () => {
    const r = certify(fullInput());
    expect(r.tier).toBe("referencia");
    expect(r.granted).toBe(true);
  });

  test("essenciais cumpridos, não-essenciais não → Empresa Viva", () => {
    const r = certify(fullInput({ domainBReady: false }));
    expect(r.tier).toBe("empresa_viva");
    expect(r.granted).toBe(true);
  });

  test("medindo, mas sem maturidade sustentada → Em jornada (sem selo)", () => {
    const r = certify(fullInput({ ivoScore: 600, previousIvoScore: 580 }));
    expect(r.tier).toBe("em_jornada");
    expect(r.granted).toBe(false);
  });

  test("sem medição contínua → Não elegível", () => {
    const r = certify(fullInput({ previousIvoScore: 0, ivoScore: 400, participationPct: 40 }));
    expect(r.tier).toBe("nao_elegivel");
    expect(r.granted).toBe(false);
  });
});

// ─── O critério-âncora: transformação comprovada ─────────────────────────────

describe("certify — transformação comprovada é inegociável", () => {
  test("sem experimento confirmado, o selo NUNCA é concedido (mesmo com tudo o resto)", () => {
    const r = certify(fullInput({ experimentsConfirmed: 0 }));
    const c3 = r.criteria.find((c) => c.id === "transformacao")!;
    expect(c3.status).toBe("nao_cumprido");
    expect(r.granted).toBe(false);
    expect(r.tier).toBe("em_jornada");
  });

  test("transformação não tem meio-termo (binária)", () => {
    const r = certify(fullInput({ experimentsConfirmed: 1 }));
    expect(r.criteria.find((c) => c.id === "transformacao")!.status).toBe("cumprido");
  });
});

// ─── Maturidade sustentada ───────────────────────────────────────────────────

describe("certify — maturidade", () => {
  test("ambas as temporadas na faixa → cumprido", () => {
    const r = certify(fullInput({ ivoScore: 700, previousIvoScore: 660 }));
    expect(r.criteria.find((c) => c.id === "maturidade")!.status).toBe("cumprido");
  });

  test("só a temporada atual na faixa → parcial", () => {
    const r = certify(fullInput({ ivoScore: 660, previousIvoScore: 600 }));
    expect(r.criteria.find((c) => c.id === "maturidade")!.status).toBe("parcial");
  });

  test("aproximando da faixa (até 50 pts abaixo) → parcial", () => {
    const r = certify(fullInput({ ivoScore: 619, previousIvoScore: 600 }));
    expect(r.criteria.find((c) => c.id === "maturidade")!.status).toBe("parcial");
  });

  test("longe da faixa → não cumprido com pts faltantes na nota", () => {
    const c = certify(fullInput({ ivoScore: 500, previousIvoScore: 480 })).criteria.find(
      (x) => x.id === "maturidade",
    )!;
    expect(c.status).toBe("nao_cumprido");
    expect(c.note).toContain("150"); // 650 − 500
  });
});

// ─── Confiança e k-anon ──────────────────────────────────────────────────────

describe("certify — confiança", () => {
  test("k-anonimato violado → confiança não cumprida", () => {
    const c = certify(fullInput({ kAnonRespected: false })).criteria.find(
      (x) => x.id === "confianca",
    )!;
    expect(c.status).toBe("nao_cumprido");
  });

  test("k-anon ok mas baixa adesão → parcial", () => {
    const c = certify(fullInput({ consentCoveragePct: 50 })).criteria.find(
      (x) => x.id === "confianca",
    )!;
    expect(c.status).toBe("parcial");
  });
});

// ─── Lacunas e metadados ─────────────────────────────────────────────────────

describe("certify — lacunas", () => {
  test("gaps listam o que falta, marcando os essenciais", () => {
    const r = certify(fullInput({ experimentsConfirmed: 0, domainBReady: false }));
    expect(r.gaps.some((g) => g.startsWith("[essencial]"))).toBe(true);
    expect(r.gaps.length).toBeGreaterThanOrEqual(2);
  });

  test("conta os essenciais cumpridos", () => {
    const r = certify(fullInput());
    expect(r.essentialTotal).toBe(3);
    expect(r.essentialMet).toBe(3);
  });

  test("config padrão exige IVO 650 e 1 experimento", () => {
    expect(DEFAULT_CERT_CONFIG.maturityMin).toBe(650);
    expect(DEFAULT_CERT_CONFIG.minExperiments).toBe(1);
  });
});
