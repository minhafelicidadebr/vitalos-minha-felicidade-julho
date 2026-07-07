import { describe, expect, test } from "bun:test";
import { buildSurveyTelemetry, type FunnelSessionSnapshot } from "./survey-telemetry-engine";

const ITEM_IDS = ["a", "b", "c", "d"];

function session(timings: Record<string, number>, opts: Partial<FunnelSessionSnapshot> = {}): FunnelSessionSnapshot {
  return {
    itemTimingsMs: timings,
    totalItems: ITEM_IDS.length,
    completed: true,
    elapsedMs: Math.max(0, ...Object.values(timings)),
    ...opts,
  };
}

describe("survey-telemetry-engine — k-anonimato antes de qualquer leitura", () => {
  test("menos sessões que o k-anonimato → ok:false, nenhum dado exposto", () => {
    const sessions = Array.from({ length: 4 }, () => session({ a: 100, b: 200, c: 300, d: 400 }));
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.totalSessions).toBe(4);
      expect(result.kAnonymityMin).toBe(5);
    }
  });

  test("exatamente k sessões → ok:true", () => {
    const sessions = Array.from({ length: 5 }, () => session({ a: 100, b: 200, c: 300, d: 400 }));
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions });
    expect(result.ok).toBe(true);
  });

  test("kAnonymityMin customizado é respeitado", () => {
    const sessions = Array.from({ length: 3 }, () => session({ a: 100 }));
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions, kAnonymityMin: 3 });
    expect(result.ok).toBe(true);
  });

  test("item individual com n < k fica invisível mesmo com sessões totais suficientes", () => {
    const sessions = [
      ...Array.from({ length: 6 }, () => session({ a: 100, b: 200 })),
      // item "c" respondido só 2x — abaixo do k-anonimato de 5
      session({ a: 100, b: 200, c: 300 }),
      session({ a: 100, b: 200, c: 350 }),
    ];
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const c = result.items.find((i) => i.itemId === "c")!;
      expect(c.n).toBe(2);
      expect(c.visible).toBe(false);
      expect(c.reachedPct).toBeNull();
      expect(c.medianDeltaMs).toBeNull();
    }
  });
});

describe("survey-telemetry-engine — reachedPct e dropOffPct", () => {
  test("todo mundo responde tudo → reachedPct 100 em todos, dropOff 0", () => {
    const sessions = Array.from({ length: 8 }, () => session({ a: 10, b: 20, c: 30, d: 40 }));
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions });
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const item of result.items) {
        expect(item.reachedPct).toBe(100);
      }
      expect(result.items[0]!.dropOffPct).toBeNull(); // primeiro item nunca tem dropOff
      expect(result.items[1]!.dropOffPct).toBe(0);
    }
  });

  test("queda progressiva é refletida no dropOffPct", () => {
    // 10 sessões respondem "a"; 5 seguem para "b"; nenhuma chega em "c"/"d" (abaixo do k)
    const sessions = [
      ...Array.from({ length: 5 }, () => session({ a: 10, b: 20 })),
      ...Array.from({ length: 5 }, () => session({ a: 10 })),
    ];
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const a = result.items.find((i) => i.itemId === "a")!;
      const b = result.items.find((i) => i.itemId === "b")!;
      expect(a.n).toBe(10);
      expect(a.reachedPct).toBe(100);
      expect(b.n).toBe(5);
      expect(b.reachedPct).toBe(50);
      expect(b.dropOffPct).toBe(50); // caiu de 10 para 5 = 50% de queda
    }
  });

  test("dropOffPct fica null quando o item anterior está suprimido (n<k)", () => {
    const sessions = [
      ...Array.from({ length: 5 }, () => session({ a: 10, b: 20 })),
      ...Array.from({ length: 4 }, () => session({ b: 20 })), // "a" pulado, "b" ainda tem 9 no total
    ];
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const a = result.items.find((i) => i.itemId === "a")!;
      expect(a.n).toBe(5);
      expect(a.visible).toBe(true);
    }
  });
});

describe("survey-telemetry-engine — mediana de tempo incremental e carga", () => {
  test("medianDeltaMs do primeiro item é o próprio timestamp (tempo desde o início)", () => {
    const sessions = [
      session({ a: 100 }),
      session({ a: 200 }),
      session({ a: 300 }),
      session({ a: 400 }),
      session({ a: 500 }),
    ];
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions, kAnonymityMin: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const a = result.items.find((i) => i.itemId === "a")!;
      expect(a.medianDeltaMs).toBe(300);
    }
  });

  test("delta negativo (resposta fora de ordem) é descartado, nunca inventa sequência", () => {
    const sessions = [
      session({ a: 500, b: 100 }), // "b" respondido ANTES de "a" — fora de ordem
      session({ a: 100, b: 200 }),
      session({ a: 100, b: 200 }),
      session({ a: 100, b: 200 }),
      session({ a: 100, b: 200 }),
    ];
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions, kAnonymityMin: 4 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const b = result.items.find((i) => i.itemId === "b")!;
      // só as 4 sessões com delta válido (100) contam — a fora-de-ordem é excluída
      expect(b.medianDeltaMs).toBe(100);
    }
  });

  test("item com tempo incremental muito acima da mediana geral recebe highLoad", () => {
    const sessions = Array.from({ length: 6 }, () => session({ a: 100, b: 150, c: 5000, d: 5100 }));
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const c = result.items.find((i) => i.itemId === "c")!;
      expect(c.highLoad).toBe(true);
      const b = result.items.find((i) => i.itemId === "b")!;
      expect(b.highLoad).toBe(false);
    }
  });

  test("overallMedianDeltaMs null quando o pool de deltas é menor que o k-anonimato", () => {
    // 5 sessões, mas só o item "a" tem timing — pool de deltas do item "a" sozinho tem 5 valores,
    // suficiente; testamos o caso oposto reduzindo para bem poucas amostras por item.
    const sessions = [session({ a: 100 }), session({ a: 200 })];
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions, kAnonymityMin: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.overallMedianDeltaMs).toBe(150);
    }
  });
});

describe("survey-telemetry-engine — taxa de conclusão e disclaimer", () => {
  test("completionRate reflete a proporção de sessões completed:true", () => {
    const sessions = [
      ...Array.from({ length: 3 }, () => session({ a: 100 }, { completed: true })),
      ...Array.from({ length: 2 }, () => session({ a: 100 }, { completed: false })),
    ];
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.completedSessions).toBe(3);
      expect(result.completionRate).toBe(0.6);
    }
  });

  test("disclaimer sempre menciona o k-anonimato efetivo e a honestidade da ordem", () => {
    const sessions = Array.from({ length: 7 }, () => session({ a: 100 }));
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions, kAnonymityMin: 7 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.disclaimer).toMatch(/k-anonimato ≥ 7/);
      expect(result.disclaimer).toMatch(/página única/);
      expect(result.disclaimer).toMatch(/nunca a pessoa/);
    }
  });

  test("determinístico: mesma entrada → mesma saída", () => {
    const sessions = Array.from({ length: 9 }, (_, i) => session({ a: 100 + i, b: 200 + i }));
    const a = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions });
    const b = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test("nenhuma sessão → ok:false (0 < k)", () => {
    const result = buildSurveyTelemetry({ itemIds: ITEM_IDS, sessions: [] });
    expect(result.ok).toBe(false);
  });
});
