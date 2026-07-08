import { describe, expect, test } from "bun:test";
import {
  recordPractice,
  appliedPracticeCountByDriver,
  buildPracticeAggregates,
  DEFAULT_JOURNAL_POLICY,
  type PracticeEntry,
} from "./practice-journal-engine";

const VALID = {
  id: "p-1",
  authorId: "u-marina-01",
  driverId: "energia",
  kind: "texto" as const,
  summary: "Apliquei a pausa de 5 minutos com a equipe antes da daily.",
  occurredOn: "2026-06-18",
};

describe("practice-journal-engine — recordPractice", () => {
  test("registro válido é aceito e o texto é preservado (trim)", () => {
    const result = recordPractice([], { ...VALID, summary: `  ${VALID.summary}  ` });
    expect(result.reason).toBe("recorded");
    expect(result.entry?.summary).toBe(VALID.summary);
    expect(result.entries.length).toBe(1);
  });

  test("privado por default: sem shareConsent explícito, o registro nasce não-consentido", () => {
    const result = recordPractice([], VALID);
    expect(result.entry?.shareConsent).toBe(false);
  });

  test("consentimento é POR REGISTRO e só quando explícito true", () => {
    const consented = recordPractice([], { ...VALID, shareConsent: true });
    expect(consented.entry?.shareConsent).toBe(true);
  });

  test("id duplicado é replay — não registra de novo", () => {
    const first = recordPractice([], VALID);
    const second = recordPractice(first.entries, VALID);
    expect(second.reason).toBe("duplicate");
    expect(second.entries.length).toBe(1);
  });

  test("campos vazios → invalid_request", () => {
    expect(recordPractice([], { ...VALID, summary: "   " }).reason).toBe("invalid_request");
    expect(recordPractice([], { ...VALID, driverId: "" }).reason).toBe("invalid_request");
    expect(recordPractice([], { ...VALID, authorId: "" }).reason).toBe("invalid_request");
  });

  test("tipo de evidência desabilitado pelo pack é recusado", () => {
    const result = recordPractice([], { ...VALID, kind: "foto" }, {
      ...DEFAULT_JOURNAL_POLICY,
      enabledKinds: ["texto", "reflexao"],
    });
    expect(result.reason).toBe("kind_not_enabled");
  });

  test("resumo além do limite é recusado (proteção de dado sensível longo)", () => {
    const result = recordPractice([], { ...VALID, summary: "x".repeat(281) });
    expect(result.reason).toBe("summary_too_long");
  });
});

describe("practice-journal-engine — saída 1: sinal do Diploma (fold individual)", () => {
  const entries: PracticeEntry[] = [
    { ...VALID, id: "p-1", shareConsent: false },
    { ...VALID, id: "p-2", driverId: "energia", shareConsent: false },
    { ...VALID, id: "p-3", driverId: "clareza", shareConsent: true },
    { ...VALID, id: "p-4", authorId: "u-outro", driverId: "energia", shareConsent: true },
  ];

  test("conta os registros da própria pessoa por driver", () => {
    const counts = appliedPracticeCountByDriver(entries, "u-marina-01");
    expect(counts).toEqual({ energia: 2, clareza: 1 });
  });

  test("nunca conta registros de outra pessoa", () => {
    const counts = appliedPracticeCountByDriver(entries, "u-outro");
    expect(counts).toEqual({ energia: 1 });
  });

  test("o fold individual conta TODOS os registros próprios, consentidos ou não (dado da pessoa)", () => {
    const counts = appliedPracticeCountByDriver(entries, "u-marina-01");
    expect(counts.energia).toBe(2); // ambos sem consentimento coletivo — mas são dela
  });
});

describe("practice-journal-engine — saída 2: agregado coletivo k≥5 só de consentidos", () => {
  function entriesFrom(authors: string[], driverId: string, consent: boolean): PracticeEntry[] {
    return authors.map((authorId, i) => ({
      ...VALID,
      id: `${driverId}-${authorId}-${i}`,
      authorId,
      driverId,
      shareConsent: consent,
    }));
  }

  test("registros sem consentimento NUNCA entram na contagem coletiva", () => {
    const aggregates = buildPracticeAggregates(entriesFrom(["a", "b", "c", "d", "e"], "energia", false));
    expect(aggregates).toEqual([]);
  });

  test("≥5 praticantes únicos consentidos → visível", () => {
    const aggregates = buildPracticeAggregates(entriesFrom(["a", "b", "c", "d", "e"], "energia", true));
    expect(aggregates).toEqual([
      { driverId: "energia", sharedCount: 5, uniquePractitioners: 5, visible: true },
    ]);
  });

  test("<5 praticantes únicos → protegido (visible false), mesmo com muitos registros", () => {
    const many = [
      ...entriesFrom(["a", "a", "a", "b", "b"], "clareza", true), // 5 registros, 2 pessoas
    ];
    const aggregates = buildPracticeAggregates(many);
    expect(aggregates[0].visible).toBe(false);
    expect(aggregates[0].uniquePractitioners).toBe(2);
  });

  test("determinístico e ordenado por driver", () => {
    const mixed = [
      ...entriesFrom(["a", "b", "c", "d", "e"], "zeta", true),
      ...entriesFrom(["a", "b", "c", "d", "e"], "alfa", true),
    ];
    const aggregates = buildPracticeAggregates(mixed);
    expect(aggregates.map((a) => a.driverId)).toEqual(["alfa", "zeta"]);
  });
});
