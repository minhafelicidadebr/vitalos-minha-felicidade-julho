import { describe, expect, test } from "bun:test";
import {
  isAllowedOfferCategory,
  defineOffer,
  computeEligiblePool,
  runCiranda,
  summarizeMirroredImpact,
  type EligibilityEvent,
  type InstitutionalOffer,
} from "./vitrine-offer-engine";

describe("vitrine-offer-engine — categorias permitidas (redline F3.2)", () => {
  test("as 4 categorias do catálogo são permitidas", () => {
    expect(isAllowedOfferCategory("cultural")).toBe(true);
    expect(isAllowedOfferCategory("educacional")).toBe(true);
    expect(isAllowedOfferCategory("entretenimento")).toBe(true);
    expect(isAllowedOfferCategory("comunitario")).toBe(true);
  });

  test("saúde mental NUNCA é uma categoria do catálogo — vive em PortaAbertaResource", () => {
    expect(isAllowedOfferCategory("saude_mental")).toBe(false);
    expect(isAllowedOfferCategory("terapia")).toBe(false);
    expect(isAllowedOfferCategory("")).toBe(false);
  });
});

describe("vitrine-offer-engine — defineOffer (F3.4: toda oferta espelha o coletivo)", () => {
  const base = {
    id: "off-1",
    category: "cultural" as const,
    title: "Ingressos de museu",
    description: "2 ingressos por ciclo",
    provider: "institution" as const,
    accessMode: "lottery" as const,
    mirroredPledge: "A cada resgate, a instituição doa 1 ingresso ao Bosque do Bem-Comum",
  };

  test("oferta válida é aceita e ecoa os campos exatamente", () => {
    const result = defineOffer(base);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.offer).toEqual(base);
    }
  });

  test("rejeita oferta sem mirroredPledge — nunca oferta individual sem contrapartida", () => {
    const result = defineOffer({ ...base, mirroredPledge: "" });
    expect(result).toEqual({ ok: false, reason: "missing_mirrored_pledge" });
  });

  test("rejeita oferta sem título", () => {
    const result = defineOffer({ ...base, title: "  " });
    expect(result).toEqual({ ok: false, reason: "missing_title" });
  });

  test("rejeita capacity <= 0", () => {
    const result = defineOffer({ ...base, capacity: 0 });
    expect(result).toEqual({ ok: false, reason: "invalid_capacity" });
  });

  test("rejeita categoria fora da lista permitida (defesa contra pack malformado)", () => {
    const result = defineOffer({ ...base, category: "saude_mental" });
    expect(result).toEqual({ ok: false, reason: "category_not_allowed" });
  });
});

describe("vitrine-offer-engine — computeEligiblePool (F3.1: booleana, nunca mérito)", () => {
  test("inclui só quem participou, deduplicado", () => {
    const events: EligibilityEvent[] = [
      { userId: "u1", participatedInCycle: true },
      { userId: "u2", participatedInCycle: false },
      { userId: "u1", participatedInCycle: true },
      { userId: "u3", participatedInCycle: true },
    ];
    expect(computeEligiblePool(events)).toEqual(["u1", "u3"]);
  });

  test("pool vazio quando ninguém participou", () => {
    expect(computeEligiblePool([{ userId: "u1", participatedInCycle: false }])).toEqual([]);
  });

  test("ordem é sempre alfabética — nunca por ordem de mérito ou intensidade", () => {
    const events: EligibilityEvent[] = [
      { userId: "zeta", participatedInCycle: true },
      { userId: "alfa", participatedInCycle: true },
    ];
    expect(computeEligiblePool(events)).toEqual(["alfa", "zeta"]);
  });
});

describe("vitrine-offer-engine — runCiranda (F2.2: sorteio determinístico auditável)", () => {
  const pool = ["ana", "bia", "caio", "duda", "eva", "fabio"];

  test("determinístico: mesma seed + mesmo pool → mesmos vencedores e mesmo hash", () => {
    const a = runCiranda({ eligibleUserIds: pool, winnerCount: 2, seed: "ciclo-2026-07" });
    const b = runCiranda({ eligibleUserIds: pool, winnerCount: 2, seed: "ciclo-2026-07" });
    expect(a.winners).toEqual(b.winners);
    expect(a.resultHash).toBe(b.resultHash);
  });

  test("seeds diferentes tendem a produzir sorteios diferentes (mesmo pool)", () => {
    const a = runCiranda({ eligibleUserIds: pool, winnerCount: 2, seed: "seed-a" });
    const b = runCiranda({ eligibleUserIds: pool, winnerCount: 2, seed: "seed-b" });
    expect(a.resultHash).not.toBe(b.resultHash);
  });

  test("vencedores são sempre um subconjunto do pool elegível, sem repetição", () => {
    const result = runCiranda({ eligibleUserIds: pool, winnerCount: 3, seed: "s1" });
    expect(result.winners.length).toBe(3);
    expect(new Set(result.winners).size).toBe(3);
    for (const w of result.winners) expect(pool).toContain(w);
  });

  test("winnerCount maior que o pool: todo mundo elegível ganha (nunca inventa gente)", () => {
    const result = runCiranda({ eligibleUserIds: ["a", "b"], winnerCount: 10, seed: "s1" });
    expect(result.winners.sort()).toEqual(["a", "b"]);
  });

  test("pool vazio → sem vencedores, mas hash ainda é determinístico", () => {
    const a = runCiranda({ eligibleUserIds: [], winnerCount: 5, seed: "s1" });
    const b = runCiranda({ eligibleUserIds: [], winnerCount: 5, seed: "s1" });
    expect(a.winners).toEqual([]);
    expect(a.resultHash).toBe(b.resultHash);
  });

  test("winnerCount negativo é tratado como zero", () => {
    const result = runCiranda({ eligibleUserIds: pool, winnerCount: -3, seed: "s1" });
    expect(result.winners).toEqual([]);
  });

  test("duplicatas no pool elegível não inflam a chance (dedup antes do sorteio)", () => {
    const withDupes = ["ana", "ana", "ana", "bia"];
    const withoutDupes = ["ana", "bia"];
    const a = runCiranda({ eligibleUserIds: withDupes, winnerCount: 1, seed: "s1" });
    const b = runCiranda({ eligibleUserIds: withoutDupes, winnerCount: 1, seed: "s1" });
    expect(a.winners).toEqual(b.winners);
    expect(a.resultHash).toBe(b.resultHash);
  });

  test("pool diferente com a mesma seed produz hash diferente (auditoria detecta troca de lista)", () => {
    const a = runCiranda({ eligibleUserIds: pool, winnerCount: 2, seed: "s1" });
    const b = runCiranda({ eligibleUserIds: [...pool, "gil"], winnerCount: 2, seed: "s1" });
    expect(a.resultHash).not.toBe(b.resultHash);
  });
});

describe("vitrine-offer-engine — summarizeMirroredImpact (F2.3, honestidade)", () => {
  const offers: InstitutionalOffer[] = [
    {
      id: "off-1",
      category: "cultural",
      title: "Museu",
      description: "",
      provider: "institution",
      accessMode: "lottery",
      mirroredPledge: "1 ingresso ao Bosque por resgate",
    },
    {
      id: "off-2",
      category: "comunitario",
      title: "Horta",
      description: "",
      provider: "partner",
      accessMode: "collective",
      mirroredPledge: "1 muda plantada por resgate",
    },
  ];

  test("ecoa a contrapartida declarada de cada oferta, sem inventar valores", () => {
    const summary = summarizeMirroredImpact(offers, { "off-1": 3 });
    expect(summary).toEqual([
      { offerId: "off-1", mirroredPledge: "1 ingresso ao Bosque por resgate", timesFulfilled: 3 },
      { offerId: "off-2", mirroredPledge: "1 muda plantada por resgate", timesFulfilled: 0 },
    ]);
  });
});
