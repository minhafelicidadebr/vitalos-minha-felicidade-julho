import { describe, expect, test, mock } from "bun:test";
import type { IdentityBoundaryStatus } from "@/engine/identity/authorization-engine";

// Token demo real de src/mocks/sector-link-mock.ts (link ativo, dentro da janela).
const VALID_DEMO_TOKEN = "vL9k3mPqR7wXnAy2sZcBdEfGhJtUiOp";

const mockBoundary = mock<() => IdentityBoundaryStatus>(() => ({
  requestedMode: "demo",
  state: "demo",
  realAuthentication: false,
  serverEnforced: false,
  reason: "demo_isolated",
}));

mock.module("@/lib/identity/identity-boundary.server", () => ({
  readIdentityBoundaryStatus: mockBoundary,
}));

const { captureSectorLinkResponse } = await import("./sector-link.server");

function validAnswers() {
  // O link demo usa COPSOQ (mesmo instrumento dos outros testes de captura).
  return Array.from({ length: 41 }, (_, i) => ({
    itemId: `cop-${["dq", "wp", "de", "inf", "mng", "pred", "rc", "lq", "ss", "com", "ins", "burn", "off"][
      Math.min(i % 13, 12)
    ]}-${(i % 5) + 1}`,
    value: 3,
  }));
}

describe("captureSectorLinkResponse — honestidade em modo Cloud (P0-01)", () => {
  test("demo: continua validando e descartando (ephemeral_demo) — comportamento inalterado", () => {
    mockBoundary.mockImplementation(() => ({
      requestedMode: "demo",
      state: "demo",
      realAuthentication: false,
      serverEnforced: false,
      reason: "demo_isolated",
    }));

    const result = captureSectorLinkResponse({
      token: "token-desconhecido",
      answers: [],
      consentVersion: "2026.1",
    });

    // Token não existe no mock → unknown_wave (não cloud_adapter_missing) —
    // prova que o caminho demo segue rodando a lógica normal de resolução.
    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.reason).toBe("unknown_wave");
  });

  test("cloud: recusa explicitamente MESMO com um token válido — nunca finge ephemeral_demo", () => {
    mockBoundary.mockImplementation(() => ({
      requestedMode: "cloud",
      state: "cloud",
      realAuthentication: true,
      serverEnforced: true,
      reason: "cloud_ready",
    }));

    const result = captureSectorLinkResponse({
      token: VALID_DEMO_TOKEN,
      answers: validAnswers(),
      consentVersion: "2026.1",
    });

    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.reason).toBe("cloud_adapter_missing");
  });

  test("blocked: mesma recusa explícita — nunca cai para o caminho demo por acidente", () => {
    mockBoundary.mockImplementation(() => ({
      requestedMode: "cloud",
      state: "blocked",
      realAuthentication: false,
      serverEnforced: true,
      reason: "cloud_adapter_missing",
    }));

    const result = captureSectorLinkResponse({
      token: VALID_DEMO_TOKEN,
      answers: validAnswers(),
      consentVersion: "2026.1",
    });

    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.reason).toBe("cloud_adapter_missing");
  });
});
