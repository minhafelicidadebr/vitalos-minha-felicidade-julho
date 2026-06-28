import { describe, expect, test } from "bun:test";
import {
  buildMeasurementCapsule,
  validateCapsule,
  assertCapsulePermission,
  groundFromCapsule,
  type CapsuleInput,
  type CapsuleDimensionInput,
} from "./measurement-capsule-engine";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const DOMAIN_B_DIMS: CapsuleDimensionInput[] = [
  { dimensionId: "demands_quant", label: "Demandas quantitativas", loadScore: 72, n: 403, visible: true, riskLevel: "alto", isOutcome: false },
  { dimensionId: "work_pace",     label: "Ritmo de trabalho",      loadScore: 68, n: 403, visible: true, riskLevel: "alto", isOutcome: false },
  { dimensionId: "influence",     label: "Influência",             loadScore: 35, n: 403, visible: true, riskLevel: "moderado", isOutcome: false },
  { dimensionId: "meaning",       label: "Sentido",                loadScore: 20, n: 403, visible: true, riskLevel: "baixo",    isOutcome: false },
  { dimensionId: "insecurity",    label: "Insegurança",            loadScore: 55, n: 403, visible: true, riskLevel: "moderado", isOutcome: false },
  // k-anon suprimida (n < 5 no segmento — chegaria com visible: false)
  { dimensionId: "community",     label: "Comunidade",             loadScore: 40, n: 3,   visible: false, riskLevel: "moderado", isOutcome: false },
  // Desfecho — NUNCA em topDriverIds
  { dimensionId: "burnout",       label: "Burnout",                loadScore: 61, n: 403, visible: true, riskLevel: "alto",    isOutcome: true },
];

const DOMAIN_A_DIMS: CapsuleDimensionInput[] = [
  { dimensionId: "perma_p", label: "Emoções positivas", loadScore: 22, n: 120, visible: true, isOutcome: false },
  { dimensionId: "perma_e", label: "Engajamento",       loadScore: 18, n: 120, visible: true, isOutcome: false },
  { dimensionId: "perma_r", label: "Relacionamentos",   loadScore: 35, n: 120, visible: true, isOutcome: false },
  { dimensionId: "perma_m", label: "Sentido",           loadScore: 15, n: 120, visible: true, isOutcome: false },
  { dimensionId: "perma_a", label: "Realização",        loadScore: 28, n: 120, visible: true, isOutcome: false },
];

function makeDomainB(overrides: Partial<CapsuleInput> = {}): CapsuleInput {
  return {
    capsuleId: "test-capsule-b",
    packId: "enterprise",
    waveId: "onda-2026-t1-copsoq",
    cohortId: "cohort-enterprise-2026-t1",
    closedOn: "2026-01-22",
    instrument: "COPSOQ II · NR-1",
    instrumentShort: "COPSOQ",
    domain: "B",
    participantCount: 403,
    kAnonymityMin: 5,
    dimensions: DOMAIN_B_DIMS,
    ...overrides,
  };
}

function makeDomainA(overrides: Partial<CapsuleInput> = {}): CapsuleInput {
  return {
    capsuleId: "test-capsule-a",
    packId: "enterprise",
    waveId: "onda-2026-t3-perma",
    cohortId: "cohort-enterprise-2026-t3",
    closedOn: "2026-06-22",
    instrument: "PERMA+V → IVO",
    instrumentShort: "PERMA+V / IVO",
    domain: "A",
    participantCount: 120,
    kAnonymityMin: 5,
    dimensions: DOMAIN_A_DIMS,
    ...overrides,
  };
}

// ─── buildMeasurementCapsule ──────────────────────────────────────────────────

describe("buildMeasurementCapsule — identidade e imutabilidade", () => {
  test("aceita capsuleId externo (determinismo para testes)", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(c.capsuleId).toBe("test-capsule-b");
  });

  test("gera capsuleId UUID quando não fornecido", () => {
    const c = buildMeasurementCapsule(makeDomainB({ capsuleId: undefined }));
    expect(c.capsuleId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  test("createdAt === sealedAt (imutabilidade garantida no build)", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(c.createdAt).toBe(c.sealedAt);
    expect(c.capsuleVersion).toBe("1.0");
  });

  test("preserva metadados de source", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(c.packId).toBe("enterprise");
    expect(c.waveId).toBe("onda-2026-t1-copsoq");
    expect(c.instrumentShort).toBe("COPSOQ");
    expect(c.domain).toBe("B");
    expect(c.participantCount).toBe(403);
    expect(c.kAnonymityMin).toBe(5);
  });
});

describe("buildMeasurementCapsule — k-anonimato", () => {
  test("kAnonymityGuaranteed = true quando n >= kMin", () => {
    const c = buildMeasurementCapsule(makeDomainB({ participantCount: 5 }));
    expect(c.kAnonymityGuaranteed).toBe(true);
  });

  test("kAnonymityGuaranteed = false quando n < kMin", () => {
    const c = buildMeasurementCapsule(makeDomainB({ participantCount: 4 }));
    expect(c.kAnonymityGuaranteed).toBe(false);
  });

  test("dimensão com visible: false permanece suprimida no capsule", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const community = c.dimensions.find((d) => d.dimensionId === "community");
    expect(community?.visible).toBe(false);
  });

  test("dimensão suprimida não aparece em topDriverIds", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(c.topDriverIds).not.toContain("community");
  });

  test("quando n < kMin, todas as dimensões ficam suprimidas (visible: false)", () => {
    const c = buildMeasurementCapsule(makeDomainB({ participantCount: 3 }));
    for (const dim of c.dimensions) {
      expect(dim.visible).toBe(false);
    }
  });
});

describe("buildMeasurementCapsule — topDriverIds: desfechos excluídos", () => {
  test("burnout NÃO aparece em topDriverIds (desfecho, não driver)", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(c.topDriverIds).not.toContain("burnout");
  });

  test("topDriverIds ordenados por loadScore desc (mais crítico primeiro)", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const scores = c.topDriverIds.map(
      (id) => c.dimensions.find((d) => d.dimensionId === id)!.loadScore,
    );
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]!).toBeGreaterThanOrEqual(scores[i + 1]!);
    }
  });

  test("demands_quant (loadScore 72) é o primeiro driver (mais crítico)", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(c.topDriverIds[0]).toBe("demands_quant");
  });
});

describe("buildMeasurementCapsule — domain B: risco NR-1", () => {
  test("dimensões domain B têm riskLevel preservado", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const dq = c.dimensions.find((d) => d.dimensionId === "demands_quant")!;
    expect(dq.riskLevel).toBe("alto");
    const meaning = c.dimensions.find((d) => d.dimensionId === "meaning")!;
    expect(meaning.riskLevel).toBe("baixo");
  });

  test("loadScore é clamped a [0, 100]", () => {
    const c = buildMeasurementCapsule(
      makeDomainB({
        dimensions: [
          { dimensionId: "d1", label: "D1", loadScore: 150, n: 10, visible: true, riskLevel: "alto" },
          { dimensionId: "d2", label: "D2", loadScore: -10, n: 10, visible: true, riskLevel: "baixo" },
        ],
      }),
    );
    expect(c.dimensions[0]!.loadScore).toBe(100);
    expect(c.dimensions[1]!.loadScore).toBe(0);
  });
});

describe("buildMeasurementCapsule — domain A: sem riskLevel", () => {
  test("dimensões domain A NUNCA têm riskLevel (null)", () => {
    const c = buildMeasurementCapsule(makeDomainA());
    for (const dim of c.dimensions) {
      expect(dim.riskLevel).toBeNull();
    }
  });

  test("topDriverIds domain A: dimensões com maior loadScore primeiro", () => {
    const c = buildMeasurementCapsule(makeDomainA());
    expect(c.topDriverIds[0]).toBe("perma_r"); // loadScore: 35 — maior carga = mais precisa atenção
  });
});

// ─── Permissions ──────────────────────────────────────────────────────────────

describe("buildMeasurementCapsule — permissions", () => {
  test("canClaimExposure = true com dados k-anon garantidos", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(c.permissions.canClaimExposure).toBe(true);
  });

  test("canClaimExposure = false quando n < kMin", () => {
    const c = buildMeasurementCapsule(makeDomainB({ participantCount: 4 }));
    expect(c.permissions.canClaimExposure).toBe(false);
  });

  test("canClaimRisk = true para domain B com exposição válida", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(c.permissions.canClaimRisk).toBe(true);
  });

  test("canClaimRisk = false para domain A (florescimento, não risco NR-1)", () => {
    const c = buildMeasurementCapsule(makeDomainA());
    expect(c.permissions.canClaimRisk).toBe(false);
  });

  test("canClaimTrend = false sem ciclos anteriores", () => {
    const c = buildMeasurementCapsule(makeDomainB({ priorCycles: [] }));
    expect(c.permissions.canClaimTrend).toBe(false);
  });

  test("canClaimTrend = true com pelo menos 1 ciclo anterior", () => {
    const c = buildMeasurementCapsule(
      makeDomainB({
        priorCycles: [
          {
            cycleId: "2025-t1",
            label: "2025-T1",
            dimensions: [
              { dimensionId: "demands_quant", loadScore: 80, visible: true },
              { dimensionId: "work_pace",     loadScore: 74, visible: true },
            ],
          },
        ],
      }),
    );
    expect(c.permissions.canClaimTrend).toBe(true);
  });

  test("canSuggestIntervention é sempre true (invariante)", () => {
    const b = buildMeasurementCapsule(makeDomainB({ participantCount: 2 }));
    const a = buildMeasurementCapsule(makeDomainA({ participantCount: 2 }));
    expect(b.permissions.canSuggestIntervention).toBe(true);
    expect(a.permissions.canSuggestIntervention).toBe(true);
  });

  test("forbidden contém a proibição de dado individual (invariante)", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(c.permissions.forbidden.some((f) => f.includes("individual"))).toBe(true);
  });

  test("forbidden domain B inclui proibição de substituir GRO/PGR", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(c.permissions.forbidden.some((f) => f.includes("GRO") || f.includes("PGR"))).toBe(true);
  });
});

// ─── Disclaimers ─────────────────────────────────────────────────────────────

describe("buildMeasurementCapsule — requiredDisclaimers", () => {
  test("domain B sempre inclui individual_data_forbidden e pgr_requires_professional", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(c.requiredDisclaimers).toContain("individual_data_forbidden");
    expect(c.requiredDisclaimers).toContain("pgr_requires_professional");
  });

  test("domain A inclui exploratory_not_clinical (nunca diagnóstico)", () => {
    const c = buildMeasurementCapsule(makeDomainA());
    expect(c.requiredDisclaimers).toContain("exploratory_not_clinical");
  });

  test("domain A nunca inclui pgr_requires_professional", () => {
    const c = buildMeasurementCapsule(makeDomainA());
    expect(c.requiredDisclaimers).not.toContain("pgr_requires_professional");
  });

  test("trend_correlational_only só aparece quando canClaimTrend = true", () => {
    const sem = buildMeasurementCapsule(makeDomainB());
    expect(sem.requiredDisclaimers).not.toContain("trend_correlational_only");

    const com = buildMeasurementCapsule(
      makeDomainB({
        priorCycles: [
          { cycleId: "2025-t1", label: "2025-T1", dimensions: [
            { dimensionId: "demands_quant", loadScore: 80, visible: true },
          ]},
        ],
      }),
    );
    expect(com.requiredDisclaimers).toContain("trend_correlational_only");
  });

  test("disclaimers nunca estão vazios (invariante de segurança)", () => {
    const b = buildMeasurementCapsule(makeDomainB({ participantCount: 1 }));
    const a = buildMeasurementCapsule(makeDomainA({ participantCount: 1 }));
    expect(b.requiredDisclaimers.length).toBeGreaterThan(0);
    expect(a.requiredDisclaimers.length).toBeGreaterThan(0);
  });
});

// ─── Trend longitudinal ───────────────────────────────────────────────────────

describe("buildMeasurementCapsule — trend longitudinal", () => {
  const withTrend = buildMeasurementCapsule(
    makeDomainB({
      priorCycles: [
        {
          cycleId: "2025-t1",
          label: "2025-T1",
          dimensions: [
            { dimensionId: "demands_quant", loadScore: 80, visible: true }, // 80 → 72: melhorando
            { dimensionId: "work_pace",     loadScore: 64, visible: true }, // 64 → 68: piorando
            { dimensionId: "influence",     loadScore: 36, visible: true }, // 36 → 35: estável
          ],
        },
      ],
    }),
  );

  test("load caindo = melhorando (exigência diminuiu)", () => {
    const dq = withTrend.dimensions.find((d) => d.dimensionId === "demands_quant")!;
    expect(dq.trend).toBe("melhorando");
  });

  test("load subindo = piorando (exigência aumentou)", () => {
    const wp = withTrend.dimensions.find((d) => d.dimensionId === "work_pace")!;
    expect(wp.trend).toBe("piorando");
  });

  test("delta < 3 pts = estável (dentro da margem de erro)", () => {
    const inf = withTrend.dimensions.find((d) => d.dimensionId === "influence")!;
    expect(inf.trend).toBe("estavel");
  });

  test("dimensão sem dado no ciclo anterior tem trend = null", () => {
    const c = withTrend.dimensions.find((d) => d.dimensionId === "insecurity")!;
    expect(c.trend).toBeNull();
  });

  test("dimensão suprimida (visible: false) tem trend = null", () => {
    const c = withTrend.dimensions.find((d) => d.dimensionId === "community")!;
    expect(c.trend).toBeNull();
  });
});

// ─── validateCapsule ──────────────────────────────────────────────────────────

describe("validateCapsule", () => {
  test("capsule válido passa sem violações", () => {
    const result = validateCapsule(buildMeasurementCapsule(makeDomainB()));
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  test("detecta missing_disclaimers em capsule adulterado", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    // Simula adulteração forçada via cast
    const tampered = { ...c, requiredDisclaimers: [] as const };
    const result = validateCapsule(tampered);
    expect(result.violations).toContain("missing_disclaimers");
  });

  test("detecta sealed_at_mismatch em capsule adulterado", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const tampered = { ...c, sealedAt: "2020-01-01T00:00:00.000Z" };
    const result = validateCapsule(tampered);
    expect(result.violations).toContain("sealed_at_mismatch");
  });

  test("detecta negative_participants", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const tampered = { ...c, participantCount: -1 };
    const result = validateCapsule(tampered);
    expect(result.violations).toContain("negative_participants");
  });
});

// ─── assertCapsulePermission ──────────────────────────────────────────────────

describe("assertCapsulePermission", () => {
  test("não lança quando permissão está concedida", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(() => assertCapsulePermission(c, "canClaimExposure")).not.toThrow();
    expect(() => assertCapsulePermission(c, "canClaimRisk")).not.toThrow();
  });

  test("lança quando permissão negada (domain A tentando canClaimRisk)", () => {
    const c = buildMeasurementCapsule(makeDomainA());
    expect(() => assertCapsulePermission(c, "canClaimRisk")).toThrow(
      /Permissão negada: canClaimRisk/,
    );
  });

  test("lança quando canClaimExposure = false (n < kMin)", () => {
    const c = buildMeasurementCapsule(makeDomainB({ participantCount: 3 }));
    expect(() => assertCapsulePermission(c, "canClaimExposure")).toThrow(
      /Permissão negada: canClaimExposure/,
    );
  });

  test("lança quando canClaimTrend = false (sem ciclos)", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    expect(() => assertCapsulePermission(c, "canClaimTrend")).toThrow(
      /Permissão negada: canClaimTrend/,
    );
  });
});

// ─── groundFromCapsule ────────────────────────────────────────────────────────

describe("groundFromCapsule", () => {
  test("headline menciona n, instrumento e garantia k-anon", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const g = groundFromCapsule(c);
    expect(g.headline).toContain("403");
    expect(g.headline).toContain("k≥5");
  });

  test("headline de domain B com dimensões críticas menciona contagem de risco", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const g = groundFromCapsule(c);
    // demands_quant (alto) + work_pace (alto) = 2 dimensões alto/crítico
    expect(g.headline).toMatch(/\d+ de \d+ dimensões/);
  });

  test("claims só referenciam dimensões do topDriverIds (sem desfechos)", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const g = groundFromCapsule(c);
    for (const claim of g.claims) {
      expect(c.topDriverIds).toContain(claim.dimensionId);
      expect(claim.dimensionId).not.toBe("burnout");
    }
  });

  test("claims têm no máximo 5 itens (foco cognitivo)", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const g = groundFromCapsule(c);
    expect(g.claims.length).toBeLessThanOrEqual(5);
  });

  test("allowedContext menciona o instrumento e participantes", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const g = groundFromCapsule(c);
    expect(g.allowedContext).toContain("COPSOQ");
    expect(g.allowedContext).toContain("n=403");
  });

  test("forbiddenContext menciona proibição de dado individual", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const g = groundFromCapsule(c);
    expect(g.forbiddenContext).toContain("indivíduo");
  });

  test("requiredDisclaimer inclui texto de PGR para domain B", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const g = groundFromCapsule(c);
    expect(g.requiredDisclaimer).toContain("GRO/PGR");
  });

  test("requiredDisclaimer inclui texto educativo para domain A", () => {
    const c = buildMeasurementCapsule(makeDomainA());
    const g = groundFromCapsule(c);
    expect(g.requiredDisclaimer).toContain("educativo");
  });

  test("headline de n < kMin avisa sobre dados insuficientes", () => {
    const c = buildMeasurementCapsule(makeDomainB({ participantCount: 3 }));
    const g = groundFromCapsule(c);
    expect(g.headline).toContain("insuficientes");
  });

  test("sourceRoute domain B aponta para /matriz", () => {
    const c = buildMeasurementCapsule(makeDomainB());
    const g = groundFromCapsule(c);
    if (g.claims.length > 0) {
      expect(g.claims[0]!.sourceRoute).toBe("/matriz");
    }
  });

  test("sourceRoute domain A aponta para /ivo", () => {
    const c = buildMeasurementCapsule(makeDomainA());
    const g = groundFromCapsule(c);
    if (g.claims.length > 0) {
      expect(g.claims[0]!.sourceRoute).toBe("/ivo");
    }
  });
});
