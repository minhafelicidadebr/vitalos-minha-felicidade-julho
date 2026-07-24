// Testes do resolver puro (§9, §14 "Resolver"). Para exercitar draft/
// retired/expired — estados que NÃO existem no registry real (todos os 8
// claims do MVP são approved) — este arquivo injeta fixtures via o segundo
// parâmetro (deps) do resolver, em vez de mock.module no singleton do
// registry (mock.module é global ao processo de teste e já vazou entre
// arquivos neste repo quando dois testes registravam fakes diferentes para
// o mesmo módulo — ver lição documentada em pair-invite-adapter.test.ts).

import { describe, expect, test } from "bun:test";
import {
  resolveCommercialClaim,
  CommercialClaimResolutionError,
  type ResolveCommercialClaimDeps,
} from "./commercial-claims-resolver";
import type { CommercialClaimEntry } from "./commercial-claim-types";

function claimFixture(overrides: Partial<CommercialClaimEntry> = {}): CommercialClaimEntry {
  return {
    claim_id: "CLAIM-COM-TEST-001",
    category: "instrument_identity",
    status: "approved",
    variants: { default: "Texto aprovado de teste.", short: "Curto." },
    source_refs: ["FIXTURE-SOURCE"],
    limitations: ["Limitação de teste."],
    allowed_surface_ids: ["marketing.test.authorized-surface"],
    owner_role: "scientific-governance",
    reviewed_at: "2026-07-23",
    review_due_at: "2099-01-01",
    ...overrides,
  };
}

function depsWith(claim: CommercialClaimEntry): ResolveCommercialClaimDeps {
  return {
    findClaim: (id) => (id === claim.claim_id ? claim : undefined),
    isExpired: (c, now = new Date()) => Date.parse(c.review_due_at) < now.getTime(),
  };
}

describe("resolveCommercialClaim — caminho feliz", () => {
  test("claim approved + surface autorizada + variant existente resolve", () => {
    const claim = claimFixture();
    const result = resolveCommercialClaim(
      { claimId: "CLAIM-COM-TEST-001", variant: "default", surfaceId: "marketing.test.authorized-surface" },
      depsWith(claim),
    );
    expect(result).toEqual({
      claimId: "CLAIM-COM-TEST-001",
      variant: "default",
      surfaceId: "marketing.test.authorized-surface",
      text: "Texto aprovado de teste.",
      category: "instrument_identity",
      limitations: ["Limitação de teste."],
      sourceRefs: ["FIXTURE-SOURCE"],
    });
  });

  test("outra variant do mesmo claim resolve independentemente", () => {
    const claim = claimFixture();
    const result = resolveCommercialClaim(
      { claimId: "CLAIM-COM-TEST-001", variant: "short", surfaceId: "marketing.test.authorized-surface" },
      depsWith(claim),
    );
    expect(result.text).toBe("Curto.");
  });

  test("sem 2º argumento, usa o registry real (singleton) — claim de verdade resolve", () => {
    const result = resolveCommercialClaim({
      claimId: "CLAIM-COM-ECONOMIC-BASELINE-001",
      variant: "default",
      surfaceId: "marketing.home.economic-baseline",
    });
    expect(result.claimId).toBe("CLAIM-COM-ECONOMIC-BASELINE-001");
    expect(result.text.length).toBeGreaterThan(0);
  });
});

describe("resolveCommercialClaim — fail-closed", () => {
  test("claim desconhecido lança CommercialClaimResolutionError", () => {
    const claim = claimFixture();
    expect(() =>
      resolveCommercialClaim(
        { claimId: "CLAIM-COM-NAO-EXISTE", variant: "default", surfaceId: "marketing.test.authorized-surface" },
        depsWith(claim),
      ),
    ).toThrow(CommercialClaimResolutionError);
  });

  test("claim draft não pode ser resolvido", () => {
    const claim = claimFixture({ status: "draft" });
    expect(() =>
      resolveCommercialClaim(
        { claimId: "CLAIM-COM-TEST-001", variant: "default", surfaceId: "marketing.test.authorized-surface" },
        depsWith(claim),
      ),
    ).toThrow(/está "draft"/);
  });

  test("claim retired não pode ser resolvido", () => {
    const claim = claimFixture({ status: "retired" });
    expect(() =>
      resolveCommercialClaim(
        { claimId: "CLAIM-COM-TEST-001", variant: "default", surfaceId: "marketing.test.authorized-surface" },
        depsWith(claim),
      ),
    ).toThrow(/está "retired"/);
  });

  test("claim expired (status expired) não pode ser resolvido", () => {
    const claim = claimFixture({ status: "expired" });
    expect(() =>
      resolveCommercialClaim(
        { claimId: "CLAIM-COM-TEST-001", variant: "default", surfaceId: "marketing.test.authorized-surface" },
        depsWith(claim),
      ),
    ).toThrow(/está "expired"/);
  });

  test("claim approved mas com review_due_at vencida não pode ser resolvido", () => {
    const claim = claimFixture({ review_due_at: "2020-01-01" });
    expect(() =>
      resolveCommercialClaim(
        { claimId: "CLAIM-COM-TEST-001", variant: "default", surfaceId: "marketing.test.authorized-surface" },
        depsWith(claim),
      ),
    ).toThrow(/vencido/);
  });

  test("surface não autorizada lança, mesmo com claim approved e variant existente", () => {
    const claim = claimFixture();
    expect(() =>
      resolveCommercialClaim(
        { claimId: "CLAIM-COM-TEST-001", variant: "default", surfaceId: "marketing.test.surface-nao-listada" },
        depsWith(claim),
      ),
    ).toThrow(/não está autorizada/);
  });

  test("variant inexistente lança, mesmo com claim approved e surface autorizada", () => {
    const claim = claimFixture();
    expect(() =>
      resolveCommercialClaim(
        { claimId: "CLAIM-COM-TEST-001", variant: "inexistente", surfaceId: "marketing.test.authorized-surface" },
        depsWith(claim),
      ),
    ).toThrow(/variant "inexistente" não existe/);
  });

  test("nunca devolve string vazia, placeholder ou fallback — sempre lança", () => {
    const claim = claimFixture();
    try {
      resolveCommercialClaim(
        { claimId: "CLAIM-COM-NAO-EXISTE", variant: "default", surfaceId: "marketing.test.authorized-surface" },
        depsWith(claim),
      );
      throw new Error("deveria ter lançado");
    } catch (e) {
      expect(e).toBeInstanceOf(CommercialClaimResolutionError);
    }
  });
});

describe("resolveCommercialClaim — pureza e imutabilidade", () => {
  test("o resultado é readonly (Object.isFrozen)", () => {
    const claim = claimFixture();
    const result = resolveCommercialClaim(
      { claimId: "CLAIM-COM-TEST-001", variant: "default", surfaceId: "marketing.test.authorized-surface" },
      depsWith(claim),
    );
    expect(Object.isFrozen(result)).toBe(true);
  });

  test("chamar duas vezes com o mesmo input devolve o mesmo texto (determinístico)", () => {
    const claim = claimFixture();
    const input = { claimId: "CLAIM-COM-TEST-001", variant: "default", surfaceId: "marketing.test.authorized-surface" };
    const a = resolveCommercialClaim(input, depsWith(claim));
    const b = resolveCommercialClaim(input, depsWith(claim));
    expect(a).toEqual(b);
  });

  test("resolver não muta o claim de entrada", () => {
    const claim = claimFixture();
    const before = JSON.stringify(claim);
    resolveCommercialClaim(
      { claimId: "CLAIM-COM-TEST-001", variant: "default", surfaceId: "marketing.test.authorized-surface" },
      depsWith(claim),
    );
    expect(JSON.stringify(claim)).toBe(before);
  });

  test("nenhuma chamada de rede ao resolver", () => {
    const claim = claimFixture();
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = (() => {
      called = true;
      throw new Error("fetch não deveria ser chamado");
    }) as unknown as typeof fetch;
    try {
      resolveCommercialClaim(
        { claimId: "CLAIM-COM-TEST-001", variant: "default", surfaceId: "marketing.test.authorized-surface" },
        depsWith(claim),
      );
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
