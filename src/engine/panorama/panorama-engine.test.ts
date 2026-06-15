import { describe, expect, test } from "bun:test";
import { buildPanorama, type PanoramaInput } from "./panorama-engine";

function input(over: Partial<PanoramaInput> = {}): PanoramaInput {
  return {
    ivoScore: 620,
    ivoDelta: 14,
    maturityName: "Organização Saudável",
    respondents: 480,
    participationPct: 72,
    topPriorityLabel: "Segurança psicológica e voz",
    topPriorityOwner: "Guardiões da Voz Segura",
    topPriorityLift: 22,
    projectedIvo: 690,
    projectedDelta: 70,
    avoidedCostLabel: "R$ 1,2 mi",
    esgNow: 540,
    esgNext: 600,
    experimentsConcluded: 3,
    experimentsConfirmed: 2,
    seasonName: "Primavera da Vitalidade",
    phaseLabel: "Transformar",
    ...over,
  };
}

// ─── Tom ──────────────────────────────────────────────────────────────────────

describe("buildPanorama — tom", () => {
  test("alta + projeção positiva → avancando", () => {
    expect(buildPanorama(input({ ivoDelta: 14, projectedDelta: 70 })).tone).toBe("avancando");
  });

  test("queda no ciclo → atencao", () => {
    expect(buildPanorama(input({ ivoDelta: -8 })).tone).toBe("atencao");
  });

  test("IVO abaixo de 350 → risco (precedência sobre queda)", () => {
    expect(buildPanorama(input({ ivoScore: 300, ivoDelta: -5 })).tone).toBe("risco");
  });

  test("estável sem ganho projetado → estavel", () => {
    expect(buildPanorama(input({ ivoDelta: 0, projectedDelta: 0 })).tone).toBe("estavel");
  });

  test("toneLabel acompanha o tom", () => {
    expect(buildPanorama(input()).toneLabel).toBe("Avançando");
  });
});

// ─── Métricas-herói ───────────────────────────────────────────────────────────

describe("buildPanorama — métricas-herói", () => {
  test("expõe 4 métricas: IVO, projeção, custo, ESG", () => {
    const p = buildPanorama(input());
    expect(p.heroMetrics.map((m) => m.id)).toEqual(["ivo", "projecao", "custo", "esg"]);
  });

  test("tendência do IVO reflete o sinal do delta", () => {
    expect(buildPanorama(input({ ivoDelta: 14 })).heroMetrics[0]!.trend).toBe("up");
    expect(buildPanorama(input({ ivoDelta: -3 })).heroMetrics[0]!.trend).toBe("down");
  });

  test("custo evitável usa o label pré-formatado", () => {
    const p = buildPanorama(input({ avoidedCostLabel: "R$ 980 mil" }));
    expect(p.heroMetrics.find((m) => m.id === "custo")!.value).toBe("R$ 980 mil");
  });

  test("ESG ausente → valor '—' e tendência flat", () => {
    const p = buildPanorama(input({ esgNow: null, esgNext: null }));
    const esg = p.heroMetrics.find((m) => m.id === "esg")!;
    expect(esg.value).toBe("—");
    expect(esg.trend).toBe("flat");
  });
});

// ─── Arco medir→agir→projetar→provar ─────────────────────────────────────────

describe("buildPanorama — arco", () => {
  test("os 4 passos na ordem do ciclo", () => {
    expect(buildPanorama(input()).arc.map((s) => s.id)).toEqual([
      "medir",
      "agir",
      "projetar",
      "provar",
    ]);
  });

  test("passo Agir reflete a prioridade e o dono", () => {
    const agir = buildPanorama(input()).arc.find((s) => s.id === "agir")!;
    expect(agir.headline).toBe("Segurança psicológica e voz");
    expect(agir.detail).toContain("Guardiões da Voz Segura");
  });

  test("passo Provar mostra confirmados/concluídos", () => {
    const provar = buildPanorama(
      input({ experimentsConcluded: 3, experimentsConfirmed: 2 }),
    ).arc.find((s) => s.id === "provar")!;
    expect(provar.headline).toBe("2/3 confirmados");
  });
});

// ─── Próxima ação e prova ────────────────────────────────────────────────────

describe("buildPanorama — ação e prova", () => {
  test("próxima ação cita a prioridade #1 e o dono", () => {
    const p = buildPanorama(input());
    expect(p.nextAction).toContain("Segurança psicológica e voz");
    expect(p.nextAction).toContain("Guardiões da Voz Segura");
  });

  test("sem prioridade → ação de definir a primeira", () => {
    const p = buildPanorama(input({ topPriorityLabel: null }));
    expect(p.nextAction).toContain("Definir a primeira prioridade");
  });

  test("proofLine conta os experimentos confirmados", () => {
    expect(buildPanorama(input()).proofLine).toContain("2 de 3");
  });

  test("sem experimentos concluídos → fala da base que começa", () => {
    const p = buildPanorama(input({ experimentsConcluded: 0, experimentsConfirmed: 0 }));
    expect(p.proofLine).toContain("começa agora");
    expect(p.arc.find((s) => s.id === "provar")!.detail).toContain("a iniciar");
  });
});

// ─── Narrativa ────────────────────────────────────────────────────────────────

describe("buildPanorama — narrativa", () => {
  test("narrativa cita temporada, IVO, projeção e custo", () => {
    const n = buildPanorama(input()).narrative;
    expect(n).toContain("Primavera da Vitalidade");
    expect(n).toContain("620");
    expect(n).toContain("690");
    expect(n).toContain("R$ 1,2 mi");
  });

  test("headline muda conforme o tom", () => {
    expect(buildPanorama(input({ ivoScore: 300, ivoDelta: -5 })).headline).toContain("risco");
  });
});
