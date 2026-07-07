import { describe, expect, test } from "bun:test";
import { buildReceiptJourney, RECEIPT_K_ANONYMITY_MIN } from "./receipt-journey-engine";

describe("receipt-journey-engine — honestidade (nunca rastreia a contribuição individual)", () => {
  test("agregação null (ainda não conhecida) só cita o limiar fixo, nunca uma contagem inventada", () => {
    const journey = buildReceiptJourney({ aggregation: null });
    // o único número permitido é o limiar de k-anonimato (constante, nunca uma contagem desta sessão)
    const numbers = journey.reciprocityLine.match(/\d+/g) ?? [];
    expect(numbers).toEqual([String(RECEIPT_K_ANONYMITY_MIN)]);
  });

  test("a frase de reciprocidade nunca afirma 'sua resposta está em' — só fala do agregado", () => {
    const journey = buildReceiptJourney({ aggregation: { triggered: true, participantCount: 8 } });
    expect(journey.reciprocityLine).not.toMatch(/está em|localizada|identificad/i);
    expect(journey.reciprocityLine).toMatch(/leitura coletiva/);
  });
});

describe("receipt-journey-engine — etapas da jornada (verbatim do blueprint)", () => {
  test("5 etapas na ordem canônica: resposta → coletivo → cápsula → devolutiva → plano", () => {
    const journey = buildReceiptJourney({ aggregation: null });
    expect(journey.steps.map((s) => s.id)).toEqual(["resposta", "coletivo", "capsula", "devolutiva", "plano"]);
  });

  test("sem agregação conhecida: resposta e coletivo feitos, o resto pendente", () => {
    const journey = buildReceiptJourney({ aggregation: null });
    expect(journey.steps.find((s) => s.id === "resposta")!.done).toBe(true);
    expect(journey.steps.find((s) => s.id === "coletivo")!.done).toBe(true);
    expect(journey.steps.find((s) => s.id === "capsula")!.done).toBe(false);
    expect(journey.steps.find((s) => s.id === "devolutiva")!.done).toBe(false);
    expect(journey.steps.find((s) => s.id === "plano")!.done).toBe(false);
  });

  test("agregação abaixo do k-anonimato: mesmo estágio de 'coletivo', cápsula ainda não", () => {
    const journey = buildReceiptJourney({ aggregation: { triggered: false, count: 3 } });
    expect(journey.steps.find((s) => s.id === "coletivo")!.done).toBe(true);
    expect(journey.steps.find((s) => s.id === "capsula")!.done).toBe(false);
  });

  test("cápsula selada (triggered:true): etapa 'cápsula' passa a done, devolutiva/plano continuam pendentes", () => {
    const journey = buildReceiptJourney({ aggregation: { triggered: true, participantCount: 12 } });
    expect(journey.steps.find((s) => s.id === "capsula")!.done).toBe(true);
    expect(journey.steps.find((s) => s.id === "devolutiva")!.done).toBe(false);
    expect(journey.steps.find((s) => s.id === "plano")!.done).toBe(false);
  });
});

describe("receipt-journey-engine — frase de reciprocidade por cenário", () => {
  test("triggered:true cita o participantCount real e fala em orientar decisões", () => {
    const journey = buildReceiptJourney({ aggregation: { triggered: true, participantCount: 15 } });
    expect(journey.reciprocityLine).toMatch(/15 pessoas/);
    expect(journey.reciprocityLine).toMatch(/orientar decisões/);
  });

  test("triggered:false com count abaixo do mínimo informa quantas faltam", () => {
    const journey = buildReceiptJourney({ aggregation: { triggered: false, count: 2 } });
    expect(journey.reciprocityLine).toMatch(/2 já registradas/);
    expect(journey.reciprocityLine).toMatch(/faltam 3/);
  });

  test("triggered:false com count já no mínimo (processamento pendente) não promete um número negativo", () => {
    const journey = buildReceiptJourney({ aggregation: { triggered: false, count: 5 } });
    expect(journey.reciprocityLine).not.toMatch(/faltam -/);
    expect(journey.reciprocityLine).toMatch(/entrou no grupo/);
  });

  test("determinístico: mesma entrada → mesma saída", () => {
    const input = { aggregation: { triggered: true, participantCount: 7 } } as const;
    const a = buildReceiptJourney(input);
    const b = buildReceiptJourney(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
