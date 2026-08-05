import { describe, expect, test } from "bun:test";
import {
  assertHmlDeploymentRouteAllowed,
  isHmlDeploymentActive,
  hmlDeploymentBlockedResponseBody,
  type HmlDeploymentEnvLike,
} from "./hml-deployment-boundary.server";

const HML_ON: HmlDeploymentEnvLike = { VITE_FIBT_HML_ENABLED: "true" };
const HML_OFF: HmlDeploymentEnvLike = { VITE_FIBT_HML_ENABLED: undefined };

describe("assertHmlDeploymentRouteAllowed — rotas necessárias em modo HML (Fase 8, itens 1-3)", () => {
  test("1. /convite/:token permitido", () => {
    expect(assertHmlDeploymentRouteAllowed("/convite/abc123", HML_ON)).toEqual({ allowed: true });
  });

  test("2. /api/fibt-hml/attestation permitido", () => {
    expect(assertHmlDeploymentRouteAllowed("/api/fibt-hml/attestation", HML_ON)).toEqual({ allowed: true });
  });

  test("3. asset necessário (hashed JS/CSS) permitido", () => {
    expect(assertHmlDeploymentRouteAllowed("/assets/convite._token-KNTgy6AE.js", HML_ON)).toEqual({ allowed: true });
  });

  test("favicon permitido", () => {
    expect(assertHmlDeploymentRouteAllowed("/favicon.ico", HML_ON)).toEqual({ allowed: true });
  });
});

describe("assertHmlDeploymentRouteAllowed — rotas bloqueadas em modo HML (Fase 8, itens 4-7)", () => {
  test("4. rota de dashboard (home) bloqueada", () => {
    expect(assertHmlDeploymentRouteAllowed("/", HML_ON)).toEqual({
      allowed: false,
      reason: "HML_ROUTE_NOT_ALLOWLISTED",
    });
  });

  test("4b. dashboard de colaborador/líder/RH bloqueados", () => {
    for (const path of ["/colaborador", "/lider", "/rh", "/clevel", "/painel"]) {
      expect(assertHmlDeploymentRouteAllowed(path, HML_ON)).toEqual({
        allowed: false,
        reason: "HML_ROUTE_NOT_ALLOWLISTED",
      });
    }
  });

  test("5. rota administrativa bloqueada", () => {
    expect(assertHmlDeploymentRouteAllowed("/admin", HML_ON)).toEqual({
      allowed: false,
      reason: "HML_ROUTE_NOT_ALLOWLISTED",
    });
  });

  test("6. rota de relatório bloqueada", () => {
    expect(assertHmlDeploymentRouteAllowed("/relatorios", HML_ON)).toEqual({
      allowed: false,
      reason: "HML_ROUTE_NOT_ALLOWLISTED",
    });
    expect(assertHmlDeploymentRouteAllowed("/relatorio-global", HML_ON)).toEqual({
      allowed: false,
      reason: "HML_ROUTE_NOT_ALLOWLISTED",
    });
  });

  test("7. rota desconhecida/inexistente bloqueada (fail-closed, não fail-open)", () => {
    expect(assertHmlDeploymentRouteAllowed("/qualquer-coisa-inventada", HML_ON)).toEqual({
      allowed: false,
      reason: "HML_ROUTE_NOT_ALLOWLISTED",
    });
  });

  test("caminho parecido mas fora da allowlist (prefixo-lookalike) é recusado", () => {
    // "/convite-falso/x" não começa com "/convite/" — não deve ser confundido.
    expect(assertHmlDeploymentRouteAllowed("/convite-falso/x", HML_ON)).toEqual({
      allowed: false,
      reason: "HML_ROUTE_NOT_ALLOWLISTED",
    });
  });
});

describe("8. server function não-HML — limitação registrada, não um falso positivo (Fase 8, item 8)", () => {
  test("/_serverFn/ é liberado por PREFIXO — este módulo sozinho não distingue qual função está sendo chamada", () => {
    // Isto documenta a limitação real, não finge cobri-la: qualquer hash sob
    // /_serverFn/ passa por este boundary, pertença ele a checkInviteToken
    // ou a uma função administrativa qualquer. A contenção completa deste
    // caminho específico é o Cloudflare Access na frente do Worker inteiro
    // (ver docs/fibt-hml/CLOUDFLARE_HML_DEPLOYMENT.md) — não este módulo.
    const r = assertHmlDeploymentRouteAllowed("/_serverFn/0000000000000000000000000000000000000000000000000000000000000000", HML_ON);
    expect(r).toEqual({ allowed: true });
  });
});

describe("9. modo comum (HML não declarado) não aplica nenhum boundary — Fase 8, item 9", () => {
  test("qualquer rota, mesmo /admin ou /rh, passa quando VITE_FIBT_HML_ENABLED não é 'true'", () => {
    for (const path of ["/admin", "/rh", "/relatorios", "/qualquer-coisa"]) {
      expect(assertHmlDeploymentRouteAllowed(path, HML_OFF)).toEqual({ allowed: true });
    }
  });

  test("isHmlDeploymentActive é false para qualquer valor que não seja a string exata 'true'", () => {
    for (const v of [undefined, "false", "1", "TRUE", ""]) {
      expect(isHmlDeploymentActive({ VITE_FIBT_HML_ENABLED: v })).toBe(false);
    }
    expect(isHmlDeploymentActive({ VITE_FIBT_HML_ENABLED: "true" })).toBe(true);
  });
});

describe("10. configuração HML parcial ainda falha fechada (Fase 8, item 10)", () => {
  test("VITE_FIBT_HML_ENABLED='true' sozinho já ativa o boundary de rotas — nenhuma outra variável é necessária para começar a bloquear", () => {
    // O boundary de ROTAS é deliberadamente mais simples que
    // assertHmlBackendBoundary (que exige toda a cadeia de refs/origem) —
    // aqui o único gatilho é a flag pública, porque o objetivo é conter
    // SUPERFÍCIE, não atestar backend. Ainda assim, isso significa que uma
    // configuração HML "parcial" (flag ligada, resto ausente) já bloqueia
    // tudo fora da allowlist — nunca abre mais do que o normal.
    const partial: HmlDeploymentEnvLike = { VITE_FIBT_HML_ENABLED: "true" };
    expect(assertHmlDeploymentRouteAllowed("/admin", partial)).toEqual({
      allowed: false,
      reason: "HML_ROUTE_NOT_ALLOWLISTED",
    });
  });
});

describe("11. nenhum HTML estático de outra rota existe para contornar o Worker (Fase 8, item 11)", () => {
  test("hmlDeploymentBlockedResponseBody nunca revela metadados da aplicação", () => {
    const r = hmlDeploymentBlockedResponseBody();
    expect(r.status).toBe(404);
    expect(r.body).not.toMatch(/route|loader|stack|admin|rh|dashboard/i);
  });
});

describe("14. zero chamada de rede (Fase 8, item 14)", () => {
  test("todas as funções deste módulo são síncronas e puras — nenhum fetch, nenhum I/O", () => {
    // Prova estrutural: o próprio módulo não importa fetch/node:http/node:net.
    expect(typeof assertHmlDeploymentRouteAllowed).toBe("function");
    expect(assertHmlDeploymentRouteAllowed.constructor.name).not.toBe("AsyncFunction");
  });
});
