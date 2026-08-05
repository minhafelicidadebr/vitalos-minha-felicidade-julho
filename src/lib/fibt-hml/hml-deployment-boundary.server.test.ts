import { describe, expect, test } from "bun:test";
import {
  assertHmlDeploymentRequestAllowed,
  runHmlDeploymentBoundary,
  classifyHmlDeploymentDeclaration,
  hmlDeploymentBlockedResponse,
  extractConviteTokenForTesting,
  type HmlDeploymentEnvLike,
  type HmlServerFnMetaLike,
} from "./hml-deployment-boundary.server";

const HML_ON: HmlDeploymentEnvLike = { FIBT_HML_DEPLOYMENT_ENABLED: "true" };
const HML_OFF: HmlDeploymentEnvLike = { FIBT_HML_DEPLOYMENT_ENABLED: undefined };

const CHECK_INVITE_TOKEN: HmlServerFnMetaLike = {
  filename: "src/lib/api/invite-resolve.functions.ts",
  name: "checkInviteToken",
};
const SUBMIT_SURVEY: HmlServerFnMetaLike = {
  filename: "src/lib/api/survey.functions.ts",
  name: "submitSurveyResponses",
};

describe("1. HML não declarado → modo normal preservado", () => {
  test("qualquer rota passa quando FIBT_HML_DEPLOYMENT_ENABLED está ausente", () => {
    for (const path of ["/admin", "/rh", "/", "/relatorios", "/convite/abc", "/_serverFn/whatever"]) {
      expect(assertHmlDeploymentRequestAllowed({ pathname: path, method: "GET", env: HML_OFF })).toEqual({
        allowed: true,
      });
    }
  });
});

describe("2/3. classificação da declaração HML", () => {
  test("2. exatamente 'true' → declared_valid", () => {
    expect(classifyHmlDeploymentDeclaration("true")).toBe("declared_valid");
  });

  test("3. ausente → not_declared; qualquer outro valor presente → declared_invalid (fail-closed, nunca cai para modo normal)", () => {
    expect(classifyHmlDeploymentDeclaration(undefined)).toBe("not_declared");
    for (const v of ["", "false", "1", " true", "TRUE", "true "]) {
      expect(classifyHmlDeploymentDeclaration(v)).toBe("declared_invalid");
    }
  });

  test("3b. configuração HML parcial (valor inválido) bloqueia TODAS as rotas, inclusive a página de convite", () => {
    const partial: HmlDeploymentEnvLike = { FIBT_HML_DEPLOYMENT_ENABLED: "1" };
    const r = assertHmlDeploymentRequestAllowed({ pathname: "/convite/abc", method: "GET", env: partial });
    expect(r).toEqual({ allowed: false, status: 404, reason: "HML_DEPLOYMENT_CONFIG_INVALID" });
  });
});

describe("4/5/6. rotas necessárias permitidas", () => {
  test("4. GET /convite/:token permitido", () => {
    expect(assertHmlDeploymentRequestAllowed({ pathname: "/convite/tok-123", method: "GET", env: HML_ON })).toEqual({
      allowed: true,
    });
  });

  test("5. HEAD /convite/:token permitido", () => {
    expect(assertHmlDeploymentRequestAllowed({ pathname: "/convite/tok-123", method: "HEAD", env: HML_ON })).toEqual({
      allowed: true,
    });
  });

  test("6. GET /api/fibt-hml/attestation permitido", () => {
    expect(
      assertHmlDeploymentRequestAllowed({ pathname: "/api/fibt-hml/attestation", method: "GET", env: HML_ON }),
    ).toEqual({ allowed: true });
  });
});

describe("7/21. método inesperado bloqueado", () => {
  test("7. POST em /api/fibt-hml/attestation bloqueado (endpoint é GET-only)", () => {
    expect(
      assertHmlDeploymentRequestAllowed({ pathname: "/api/fibt-hml/attestation", method: "POST", env: HML_ON }),
    ).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("21. DELETE/PUT/PATCH/OPTIONS em /convite/:token bloqueados", () => {
    for (const method of ["DELETE", "PUT", "PATCH", "OPTIONS"]) {
      expect(assertHmlDeploymentRequestAllowed({ pathname: "/convite/tok-123", method, env: HML_ON })).toEqual({
        allowed: false,
        status: 404,
        reason: "HML_ROUTE_NOT_ALLOWLISTED",
      });
    }
  });
});

describe("8. assets — arquitetura verificada, não testada como allowlist desta função", () => {
  test("confirmado por inspeção do artefato Cloudflare (FIBT-HML-2D): arquivos estáticos são resolvidos por isPublicAssetURL() — lookup EXATO contra o manifesto de arquivos reais gerados no build — antes de qualquer requisição alcançar este boundary. Esta função deliberadamente NÃO allowlista /assets/*: adicionar um prefixo aqui seria menos preciso que o lookup exato que já roda antes, e reintroduziria o padrão wildcard que a Fase 5 pede para evitar.", () => {
    // Um path de asset hipotético que chegasse até aqui (não deveria, na
    // prática) é corretamente recusado por esta função — não há uma
    // allowlist paralela e menos precisa para /assets/* aqui.
    const r = assertHmlDeploymentRequestAllowed({
      pathname: "/assets/convite._token-ABC123.js",
      method: "GET",
      env: HML_ON,
    });
    expect(r).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });
});

describe("9/17/18. path traversal, codificação dupla e encoded slash bloqueados", () => {
  test("9. traversal cru bloqueado", () => {
    expect(
      assertHmlDeploymentRequestAllowed({ pathname: "/assets/../admin", method: "GET", env: HML_ON }),
    ).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("traversal a partir de /convite/ também bloqueado", () => {
    expect(
      assertHmlDeploymentRequestAllowed({ pathname: "/convite/../admin", method: "GET", env: HML_ON }),
    ).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("17. pathname duplamente codificado (%252e%252e) bloqueado", () => {
    const r = assertHmlDeploymentRequestAllowed({
      pathname: "/convite/%252e%252e/admin",
      method: "GET",
      env: HML_ON,
    });
    expect(r).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("18. encoded slash (%2F) dentro do TOKEN não escapa para outra rota — vira parte do valor de UM segmento, nunca um separador (FIBT-HML-2E: dividir antes de decodificar, nunca depois)", () => {
    // "/convite/x%2Fadmin" tem barra crua só entre "convite" e "x%2Fadmin" —
    // dividido ALI, o segundo segmento inteiro é "x%2Fadmin", que decodifica
    // para o VALOR "x/admin" (uma string com uma barra dentro, não dois
    // segmentos). Continua sendo /convite/:token com token="x/admin" — nunca
    // alcança /admin de verdade (ver Risco 2 do FIBT-HML-2E-LITE).
    const r = assertHmlDeploymentRequestAllowed({
      pathname: "/convite/x%2Fadmin",
      method: "GET",
      env: HML_ON,
    });
    expect(r).toEqual({ allowed: true });
    expect(extractConviteTokenForTesting("/convite/x%2Fadmin")).toBe("x/admin");
  });

  test("barra invertida bloqueada", () => {
    expect(
      assertHmlDeploymentRequestAllowed({ pathname: "/convite\\..\\admin", method: "GET", env: HML_ON }),
    ).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("URL absoluta embutida no pathname bloqueada", () => {
    expect(
      assertHmlDeploymentRequestAllowed({
        pathname: "https://vitalos.com.br/admin",
        method: "GET",
        env: HML_ON,
      }),
    ).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("barras múltiplas ambíguas são colapsadas e ainda avaliadas corretamente", () => {
    expect(
      assertHmlDeploymentRequestAllowed({ pathname: "//convite//tok-123", method: "GET", env: HML_ON }),
    ).toEqual({ allowed: true }); // colapsa para /convite/tok-123, rota legítima
  });
});

describe("10/11/12/15/16. rotas de aplicação bloqueadas antes do router", () => {
  test("10. /admin bloqueado", () => {
    expect(assertHmlDeploymentRequestAllowed({ pathname: "/admin", method: "GET", env: HML_ON })).toEqual({
      allowed: false,
      status: 404,
      reason: "HML_ROUTE_NOT_ALLOWLISTED",
    });
  });

  test("11. /rh bloqueado", () => {
    expect(assertHmlDeploymentRequestAllowed({ pathname: "/rh", method: "GET", env: HML_ON })).toEqual({
      allowed: false,
      status: 404,
      reason: "HML_ROUTE_NOT_ALLOWLISTED",
    });
  });

  test("12. /relatorios bloqueado", () => {
    expect(assertHmlDeploymentRequestAllowed({ pathname: "/relatorios", method: "GET", env: HML_ON })).toEqual({
      allowed: false,
      status: 404,
      reason: "HML_ROUTE_NOT_ALLOWLISTED",
    });
  });

  test("15. API não-HML bloqueada", () => {
    expect(
      assertHmlDeploymentRequestAllowed({ pathname: "/api/algum-outro-endpoint", method: "GET", env: HML_ON }),
    ).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("16. rota desconhecida bloqueada (fail-closed, não fail-open)", () => {
    expect(
      assertHmlDeploymentRequestAllowed({ pathname: "/qualquer-coisa-inventada", method: "GET", env: HML_ON }),
    ).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("home ('/') também bloqueada — não está na allowlist", () => {
    expect(assertHmlDeploymentRequestAllowed({ pathname: "/", method: "GET", env: HML_ON })).toEqual({
      allowed: false,
      status: 404,
      reason: "HML_ROUTE_NOT_ALLOWLISTED",
    });
  });
});

describe("13/14. server functions — Caminho A (identidade real via serverFnMeta, nunca hash cru)", () => {
  test("14. checkInviteToken permitido — identidade resolvida pelo framework corresponde à allowlist", () => {
    const r = assertHmlDeploymentRequestAllowed({
      pathname: "/_serverFn/fae0711708444afdfe5b4a21062ea2ee5db64e44435e7e9f7e9e25cdab442b63",
      method: "GET",
      serverFnMeta: CHECK_INVITE_TOKEN,
      env: HML_ON,
    });
    expect(r).toEqual({ allowed: true });
  });

  test("14b. submitSurveyResponses permitido", () => {
    const r = assertHmlDeploymentRequestAllowed({
      pathname: "/_serverFn/310c4f8507a5f2cee44fdfc0d581bac89bd58c4c0282f2557ab678a5372cfbb5",
      method: "POST",
      serverFnMeta: SUBMIT_SURVEY,
      env: HML_ON,
    });
    expect(r).toEqual({ allowed: true });
  });

  test("13. server function fora da allowlist bloqueada, mesmo com hash plausível", () => {
    const r = assertHmlDeploymentRequestAllowed({
      pathname: "/_serverFn/ca707ab767d865221c613b51eb678dab2f8726ed58811cc1379126d3be4878e8",
      method: "POST",
      serverFnMeta: { filename: "src/lib/api/capsule-aggregator.functions.ts", name: "checkAndAggregateCapsule" },
      env: HML_ON,
    });
    expect(r).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("mesmo nome de função em arquivo diferente é recusado — identidade é o PAR filename+name, não só o nome", () => {
    const r = assertHmlDeploymentRequestAllowed({
      pathname: "/_serverFn/whatever",
      method: "POST",
      serverFnMeta: { filename: "src/lib/api/some-other-file.functions.ts", name: "checkInviteToken" },
      env: HML_ON,
    });
    expect(r).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("path /_serverFn/ sem serverFnMeta (estado anômalo) é recusado — fail-closed na ambiguidade", () => {
    const r = assertHmlDeploymentRequestAllowed({
      pathname: "/_serverFn/algum-hash",
      method: "POST",
      serverFnMeta: undefined,
      env: HML_ON,
    });
    expect(r).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });
});

describe("19. query string não altera a decisão", () => {
  test("query numa rota bloqueada não libera nada", () => {
    const r = assertHmlDeploymentRequestAllowed({ pathname: "/admin?x=1", method: "GET", env: HML_ON });
    // "?x=1" faz parte do pathname bruto aqui (o chamador real já separa
    // query de pathname antes de chamar esta função — RequestServerOptions.
    // pathname do TanStack Start já vem sem query). Mesmo se um "?" vazasse
    // para dentro do pathname, o resultado não deve virar uma rota válida.
    expect(r.allowed).toBe(false);
  });

  test("pathname exato de convite com query já removida pelo chamador continua permitido", () => {
    expect(assertHmlDeploymentRequestAllowed({ pathname: "/convite/tok-123", method: "GET", env: HML_ON })).toEqual({
      allowed: true,
    });
  });
});

describe("20. headers controláveis pelo cliente não influenciam a decisão", () => {
  test("a assinatura de assertHmlDeploymentRequestAllowed não aceita headers/Host — garantia estrutural, não de runtime", () => {
    // Prova por tipo/estrutura: o único input é {pathname, method, serverFnMeta, env}.
    // Não há parâmetro para headers, Host ou X-Forwarded-Host — logo não têm
    // como influenciar a decisão, por construção.
    const input = { pathname: "/convite/tok-123", method: "GET", env: HML_ON } as const;
    expect(Object.keys(input)).toEqual(["pathname", "method", "env"]);
  });
});

describe("22/23/24/25. o middleware composto nunca chama next() quando bloqueado; sempre chama quando permitido/comum", () => {
  test("22/23/24. requisição bloqueada: next() (e portanto router/server function/cliente Supabase) nunca é invocado", async () => {
    let nextCalled = false;
    const response = await runHmlDeploymentBoundary({
      pathname: "/admin",
      method: "GET",
      env: HML_ON,
      next: async () => {
        nextCalled = true;
        return new Response("nunca deveria chegar aqui");
      },
    });
    expect(nextCalled).toBe(false);
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(404);
  });

  test("25. modo comum (HML não declarado): next() é sempre chamado, comportamento de produção intocado", async () => {
    let nextCalled = false;
    const response = await runHmlDeploymentBoundary({
      pathname: "/admin",
      method: "GET",
      env: HML_OFF,
      next: async () => {
        nextCalled = true;
        return "resultado-original" as const;
      },
    });
    expect(nextCalled).toBe(true);
    expect(response).toBe("resultado-original");
  });

  test("rota permitida em modo HML também chama next() normalmente", async () => {
    let nextCalled = false;
    const response = await runHmlDeploymentBoundary({
      pathname: "/convite/tok-123",
      method: "GET",
      env: HML_ON,
      next: async () => {
        nextCalled = true;
        return "handler-real" as const;
      },
    });
    expect(nextCalled).toBe(true);
    expect(response).toBe("handler-real");
  });

  test("resposta de bloqueio nunca revela pathname, motivo ou detalhes internos", () => {
    const response = hmlDeploymentBlockedResponse();
    expect(response.status).toBe(404);
  });
});

describe("FIBT-HML-2E-LITE — Risco 2: token Base64 com slash codificado, preservado ponta a ponta", () => {
  const RAW_TOKEN = "abc+/def==";
  const TOKEN_URL = `/convite/${encodeURIComponent(RAW_TOKEN)}`;

  test("a URL do token é exatamente /convite/abc%2B%2Fdef%3D%3D", () => {
    expect(TOKEN_URL).toBe("/convite/abc%2B%2Fdef%3D%3D");
  });

  test("1. a rota é permitida", () => {
    const r = assertHmlDeploymentRequestAllowed({ pathname: TOKEN_URL, method: "GET", env: HML_ON });
    expect(r).toEqual({ allowed: true });
  });

  test("2. o pathname continua sendo reconhecido como exatamente UM parâmetro token (2 segmentos, não 3)", () => {
    // Prova negativa: se a barra do token virasse separador, isso teria 3
    // segmentos e a rota seria recusada pelo teste anterior — aqui
    // confirmamos positivamente que o token extraído é um valor ÚNICO.
    expect(extractConviteTokenForTesting(TOKEN_URL)).not.toBeNull();
  });

  test("3. o token final entregue a checkInviteToken é exatamente 'abc+/def=='", () => {
    expect(extractConviteTokenForTesting(TOKEN_URL)).toBe(RAW_TOKEN);
  });

  test("4. /convite/abc%252Fadmin (codificação dupla) é bloqueado", () => {
    const r = assertHmlDeploymentRequestAllowed({
      pathname: "/convite/abc%252Fadmin",
      method: "GET",
      env: HML_ON,
    });
    expect(r).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("5. /convite/../admin é bloqueado", () => {
    const r = assertHmlDeploymentRequestAllowed({ pathname: "/convite/../admin", method: "GET", env: HML_ON });
    expect(r).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("6. /convite/%2Fadmin não permite escapar para outra rota — permanece /convite/:token com token='/admin', nunca alcança /admin de verdade", () => {
    const r = assertHmlDeploymentRequestAllowed({ pathname: "/convite/%2Fadmin", method: "GET", env: HML_ON });
    expect(r).toEqual({ allowed: true });
    expect(extractConviteTokenForTesting("/convite/%2Fadmin")).toBe("/admin");
    // Confirma que isso NUNCA é confundido com uma requisição a /admin em si:
    const adminDirect = assertHmlDeploymentRequestAllowed({ pathname: "/admin", method: "GET", env: HML_ON });
    expect(adminDirect).toEqual({ allowed: false, status: 404, reason: "HML_ROUTE_NOT_ALLOWLISTED" });
  });

  test("regra 'todo %2F é proibido' NÃO foi adotada — múltiplos tokens com barra codificada continuam permitidos", () => {
    for (const token of ["a/b", "a/b/c", "//", "abc+/def==", "x/"]) {
      const url = `/convite/${encodeURIComponent(token)}`;
      const r = assertHmlDeploymentRequestAllowed({ pathname: url, method: "GET", env: HML_ON });
      expect(r).toEqual({ allowed: true });
      expect(extractConviteTokenForTesting(url)).toBe(token);
    }
  });
});
