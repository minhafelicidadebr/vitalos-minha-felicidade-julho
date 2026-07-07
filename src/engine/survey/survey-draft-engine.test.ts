import { describe, expect, test } from "bun:test";
import {
  draftStorageKey,
  instrumentSignatureFor,
  buildDraftPayload,
  validateDraft,
  estimateRemainingLabel,
  DEFAULT_DRAFT_TTL_MS,
  type DraftPayload,
} from "./survey-draft-engine";

describe("survey-draft-engine — draftStorageKey", () => {
  test("nunca guarda o token em claro na chave", () => {
    const key = draftStorageKey("token-super-secreto-123");
    expect(key).not.toContain("token-super-secreto-123");
    expect(key).toMatch(/^vitalos-draft-[0-9a-f]+$/);
  });

  test("determinístico: mesmo token → mesma chave sempre", () => {
    expect(draftStorageKey("abc")).toBe(draftStorageKey("abc"));
  });

  test("tokens diferentes produzem chaves diferentes", () => {
    expect(draftStorageKey("abc")).not.toBe(draftStorageKey("abd"));
  });
});

describe("survey-draft-engine — instrumentSignatureFor", () => {
  test("mesma lista de itens → mesma assinatura", () => {
    expect(instrumentSignatureFor(["a", "b", "c"])).toBe(instrumentSignatureFor(["a", "b", "c"]));
  });

  test("item adicionado muda a assinatura", () => {
    expect(instrumentSignatureFor(["a", "b"])).not.toBe(instrumentSignatureFor(["a", "b", "c"]));
  });

  test("reordenação muda a assinatura (ordem importa)", () => {
    expect(instrumentSignatureFor(["a", "b"])).not.toBe(instrumentSignatureFor(["b", "a"]));
  });
});

describe("survey-draft-engine — validateDraft (nunca reaplica rascunho fora de contexto)", () => {
  const sig = instrumentSignatureFor(["a", "b", "c"]);

  test("sem rascunho nenhum → missing", () => {
    expect(validateDraft(null, sig, Date.now())).toBe("missing");
  });

  test("rascunho válido dentro do TTL e mesmo instrumento → valid", () => {
    const payload = buildDraftPayload({ a: 3 }, sig, Date.now() - 1000);
    expect(validateDraft(payload, sig, Date.now())).toBe("valid");
  });

  test("rascunho de um instrumento diferente (itens mudaram) → instrument_changed", () => {
    const payload = buildDraftPayload({ a: 3 }, instrumentSignatureFor(["a", "b"]), Date.now());
    expect(validateDraft(payload, sig, Date.now())).toBe("instrument_changed");
  });

  test("rascunho além do TTL → expired", () => {
    const savedAt = Date.now() - (DEFAULT_DRAFT_TTL_MS + 1000);
    const payload = buildDraftPayload({ a: 3 }, sig, savedAt);
    expect(validateDraft(payload, sig, Date.now())).toBe("expired");
  });

  test("exatamente no limite do TTL ainda é válido (limite inclusivo)", () => {
    const savedAt = Date.now() - DEFAULT_DRAFT_TTL_MS;
    const payload = buildDraftPayload({ a: 3 }, sig, savedAt);
    expect(validateDraft(payload, sig, Date.now())).toBe("valid");
  });

  test("TTL customizado é respeitado", () => {
    const payload = buildDraftPayload({ a: 3 }, sig, Date.now() - 5000);
    expect(validateDraft(payload, sig, Date.now(), 1000)).toBe("expired");
    expect(validateDraft(payload, sig, Date.now(), 10000)).toBe("valid");
  });
});

describe("survey-draft-engine — buildDraftPayload", () => {
  test("carrega respostas, assinatura e timestamp exatamente como recebidos", () => {
    const payload = buildDraftPayload({ x: 5 }, "sig-1", 123);
    expect(payload).toEqual({ instrumentSignature: "sig-1", savedAt: 123, responses: { x: 5 } });
  });
});

describe("survey-draft-engine — estimateRemainingLabel (honestidade: nunca finge precisão)", () => {
  const itemIds = ["a", "b", "c", "d", "e"];

  test("todos os itens já respondidos → 'quase lá'", () => {
    expect(estimateRemainingLabel({ itemIds, answeredCount: 5, medianDeltaMsByItem: null, overallMedianDeltaMs: null })).toBe(
      "quase lá",
    );
  });

  test("sem telemetria real (Lupa ainda sem dado) → fallback genérico rotulado como estimativa", () => {
    const label = estimateRemainingLabel({ itemIds, answeredCount: 1, medianDeltaMsByItem: null, overallMedianDeltaMs: null });
    expect(label).toMatch(/estimativa|menos de 1 minuto/);
  });

  test("poucos itens restantes sem telemetria → 'menos de 1 minuto'", () => {
    const label = estimateRemainingLabel({ itemIds, answeredCount: 4, medianDeltaMsByItem: null, overallMedianDeltaMs: null });
    expect(label).toBe("menos de 1 minuto");
  });

  test("com telemetria real da Lupa, soma os deltas medianos dos itens restantes", () => {
    const medianDeltaMsByItem = { c: 30000, d: 30000, e: 60000 }; // 30s, 30s, 60s restantes
    const label = estimateRemainingLabel({ itemIds, answeredCount: 2, medianDeltaMsByItem, overallMedianDeltaMs: 30000 });
    // total = 120000ms = 2min
    expect(label).toBe("~2 min (estimativa)");
  });

  test("item sem mediana própria usa a mediana geral como fallback", () => {
    const medianDeltaMsByItem = { c: 60000 }; // "d" e "e" não têm entrada própria
    const label = estimateRemainingLabel({ itemIds, answeredCount: 2, medianDeltaMsByItem, overallMedianDeltaMs: 30000 });
    // total = 60000 + 30000 + 30000 = 120000ms = 2min
    expect(label).toBe("~2 min (estimativa)");
  });

  test("nunca soma tempo de itens já respondidos", () => {
    // a/b têm deltas enormes mas já foram respondidos — não podem entrar na soma.
    // Restantes (c,d,e) somam só 30s → "menos de 1 minuto", nunca os minutos de a/b.
    const medianDeltaMsByItem = { a: 999999, b: 999999, c: 10000, d: 10000, e: 10000 };
    const label = estimateRemainingLabel({ itemIds, answeredCount: 2, medianDeltaMsByItem, overallMedianDeltaMs: 10000 });
    expect(label).toBe("menos de 1 minuto");
  });
});
