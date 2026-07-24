// Testes do resolver público (fechamento H2.1B §4) — prova que ele resolve
// contra a projeção estática, é fail-closed, e — o ponto central do
// fechamento — NUNCA usa relógio: nenhum new Date(), resultado idêntico
// não importa quando/onde rode.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolvePublicCommercialClaim,
  PublicCommercialClaimNotFoundError,
} from "./commercial-claims-public-resolver";
import { PUBLIC_COMMERCIAL_BINDINGS } from "./commercial-claims-public-bindings";

describe("resolvePublicCommercialClaim — caminho feliz", () => {
  test("resolve cada um dos 7 bindings públicos reais", () => {
    for (const binding of Object.values(PUBLIC_COMMERCIAL_BINDINGS)) {
      const result = resolvePublicCommercialClaim(binding);
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.claimId).toBe(binding.claimId);
    }
  });
});

describe("resolvePublicCommercialClaim — fail-closed", () => {
  test("combinação ausente da projeção lança PublicCommercialClaimNotFoundError", () => {
    expect(() =>
      resolvePublicCommercialClaim({
        claimId: "CLAIM-COM-NAO-EXISTE",
        variant: "default",
        surfaceId: "marketing.test.nao-autorizada",
      }),
    ).toThrow(PublicCommercialClaimNotFoundError);
  });

  test("claim real com surfaceId errado (não bindado) também lança — nunca cai para outro texto", () => {
    expect(() =>
      resolvePublicCommercialClaim({
        claimId: PUBLIC_COMMERCIAL_BINDINGS.viatWhy.claimId,
        variant: PUBLIC_COMMERCIAL_BINDINGS.viatWhy.variant,
        surfaceId: "marketing.home.economic-baseline",
      }),
    ).toThrow(PublicCommercialClaimNotFoundError);
  });

  test("CLAIM-COM-REGULATORY-SCOPE-001 (sem binding público) não resolve por aqui", () => {
    expect(() =>
      resolvePublicCommercialClaim({
        claimId: "CLAIM-COM-REGULATORY-SCOPE-001",
        variant: "default",
        surfaceId: "marketing.nr1.regulatory-scope",
      }),
    ).toThrow(PublicCommercialClaimNotFoundError);
  });
});

describe("resolvePublicCommercialClaim — determinismo, imutabilidade, ausência de I/O", () => {
  test("resultado é readonly (Object.isFrozen)", () => {
    const result = resolvePublicCommercialClaim(PUBLIC_COMMERCIAL_BINDINGS.viatWhy);
    expect(Object.isFrozen(result)).toBe(true);
  });

  test("chamar 2x com o mesmo input devolve exatamente o mesmo resultado", () => {
    const a = resolvePublicCommercialClaim(PUBLIC_COMMERCIAL_BINDINGS.sanctionsBody);
    const b = resolvePublicCommercialClaim(PUBLIC_COMMERCIAL_BINDINGS.sanctionsBody);
    expect(a).toEqual(b);
  });

  test("nenhuma chamada de rede ao resolver", () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = (() => {
      called = true;
      throw new Error("fetch não deveria ser chamado");
    }) as unknown as typeof fetch;
    try {
      resolvePublicCommercialClaim(PUBLIC_COMMERCIAL_BINDINGS.economicBaseline);
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("resolvePublicCommercialClaim — expiração é gate-time, NUNCA runtime (fechamento §4)", () => {
  const SOURCE_PATH = join(import.meta.dir, "commercial-claims-public-resolver.ts");
  const source = readFileSync(SOURCE_PATH, "utf-8");
  // Só código executável — comentários deste arquivo citam "new Date()" ao
  // EXPLICAR a regra (contraste com o script de geração), o que é diferente
  // de conter a construção de verdade no código.
  const codeOnly = source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
    .join("\n");

  test("o código executável do resolver público não contém 'new Date'", () => {
    expect(codeOnly).not.toContain("new Date");
  });

  test("o código executável do resolver público não importa o registry completo nem isClaimExpired", () => {
    expect(codeOnly).not.toContain("commercial-claims-registry\"");
    expect(codeOnly).not.toContain("isClaimExpired");
  });

  test("resultado é idêntico sob relógios de sistema diferentes (mock de Date.now)", () => {
    const originalNow = Date.now;
    try {
      Date.now = () => new Date("2020-01-01").getTime();
      const past = resolvePublicCommercialClaim(PUBLIC_COMMERCIAL_BINDINGS.viatWhy);

      Date.now = () => new Date("2099-12-31").getTime();
      const future = resolvePublicCommercialClaim(PUBLIC_COMMERCIAL_BINDINGS.viatWhy);

      expect(past).toEqual(future);
    } finally {
      Date.now = originalNow;
    }
  });
});
