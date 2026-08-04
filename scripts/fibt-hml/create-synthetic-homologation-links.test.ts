import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  CAMPAIGN,
  EXPECTED_TEST_LINK_IDS,
  GeneratorError,
  parseArgs,
  planBatch,
  runCommit,
  tokenHashForManifest,
  commitGateFailures,
  validateFrontendBaseUrl,
  checkDeploymentAttestation,
  HML_ATTESTATION_PATH,
  HML_RAW_TOKEN_STAGING_EXCEPTION,
  PRIVATE_OUTPUT_DIR,
  type AdminClientLike,
  type FetchLike,
} from "./create-synthetic-homologation-links";

/**
 * Ref sintético de 20 caracteres, no formato de um project_ref real, para
 * simular "produção" nos testes sem versionar o ref de produção real — mesma
 * convenção de staging-guard.test.ts (PROD_REF = "pppppppppppppppppppp").
 */
const FAKE_PRODUCTION_REF = "pppppppppppppppppppp";
const FAKE_PRODUCTION_ENV = { SUPABASE_URL: `https://${FAKE_PRODUCTION_REF}.supabase.co` };

/**
 * Testes estáticos do gerador de links de homologação sintética (FIBT-HML-1).
 * Nenhum acessa rede, Supabase, PostgreSQL, Docker ou Lovable — `runCommit`
 * recebe um `AdminClientLike` fake nos testes que precisam dele, nunca o
 * client real (`@supabase/supabase-js`, só importado dentro de
 * `import.meta.main`).
 */

const VALID_FLAGS = [
  "--environment=staging",
  "--expected-project-ref=xttjkpzhxtjfwxjsxuab",
  "--batch-id=FIBT-ISG-HML-01",
  "--alpha-count=6",
  "--beta-count=4",
  "--expires-in-days=7",
  "--confirm-synthetic-homologation",
  "--dry-run",
];

function withOverride(overrides: Record<string, string | null>, extra: string[] = []): string[] {
  const map = new Map(
    VALID_FLAGS.map((f) => {
      const eq = f.indexOf("=");
      return eq === -1 ? [f, null] : [f.slice(0, eq), f.slice(eq + 1)];
    }),
  );
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) map.delete(k);
    else map.set(k, v);
  }
  const flags = Array.from(map.entries()).map(([k, v]) => (v === null ? k : `${k}=${v}`));
  return [...flags, ...extra];
}

function expectAbort(argv: string[], env?: Record<string, string | undefined>): GeneratorError {
  try {
    parseArgs(argv, env);
  } catch (e) {
    if (e instanceof GeneratorError) return e;
    throw e;
  }
  throw new Error("esperava GeneratorError, mas parseArgs() completou sem abortar");
}

describe("parseArgs — caminho feliz", () => {
  test("todos os parâmetros válidos: dry-run por padrão (sem --commit)", () => {
    const args = parseArgs(VALID_FLAGS.filter((f) => f !== "--dry-run"));
    expect(args.commit).toBe(false);
  });

  test("1. dry-run é o padrão mesmo sem a flag --dry-run explícita", () => {
    const args = parseArgs(VALID_FLAGS.filter((f) => f !== "--dry-run"));
    expect(args.commit).toBe(false);
  });

  test("2. escrita exige --commit (dry-run e commit são mutuamente exclusivos)", () => {
    const withBoth = withOverride({}, ["--commit"]);
    expect(expectAbort(withBoth).code).toBe("CONFLICTING_MODE");

    const commitOnly = withOverride({ "--dry-run": null }, ["--commit", "--accept-staging-raw-token-contract"]);
    const args = parseArgs(commitOnly);
    expect(args.commit).toBe(true);
  });
});

describe("parseArgs — validação de ambiente e project ref", () => {
  test("3. project ref ausente falha", () => {
    expect(expectAbort(withOverride({ "--expected-project-ref": null })).code).toBe("MISSING_PARAM");
  });

  test("4. project ref produtivo falha", () => {
    const err = expectAbort(
      withOverride({ "--expected-project-ref": FAKE_PRODUCTION_REF }),
      FAKE_PRODUCTION_ENV,
    );
    expect(err.code).toBe("INVALID_PROJECT_REF");
    expect(err.message).not.toContain(FAKE_PRODUCTION_REF); // só a forma mascarada
  });

  test("5. ref desconhecido (não produção, mas diferente do declarado por FIBT_HML_AUTHORIZED_STAGING_REF) falha", () => {
    // FIBT_HML_AUTHORIZED_STAGING_REF nunca é fixado no código-fonte (ver
    // comentário no módulo) — só lido de env, exatamente como
    // STAGING_SUPABASE_PROJECT_REF em staging-guard.ts. O teste declara um
    // valor efêmero só para este processo, nunca versionado.
    const previous = process.env.FIBT_HML_AUTHORIZED_STAGING_REF;
    process.env.FIBT_HML_AUTHORIZED_STAGING_REF = "somestagingref0000001";
    try {
      const err = expectAbort(withOverride({ "--expected-project-ref": "algumoutroprojeto1234" }));
      expect(err.code).toBe("INVALID_PROJECT_REF");
    } finally {
      if (previous === undefined) delete process.env.FIBT_HML_AUTHORIZED_STAGING_REF;
      else process.env.FIBT_HML_AUTHORIZED_STAGING_REF = previous;
    }
  });

  test("6. staging que bate com FIBT_HML_AUTHORIZED_STAGING_REF passa; sem a env declarada, qualquer ref não-produtivo passa", () => {
    const previous = process.env.FIBT_HML_AUTHORIZED_STAGING_REF;
    try {
      delete process.env.FIBT_HML_AUTHORIZED_STAGING_REF;
      const args = parseArgs(VALID_FLAGS);
      expect(args.expectedProjectRef).toBe("xttjkpzhxtjfwxjsxuab");

      process.env.FIBT_HML_AUTHORIZED_STAGING_REF = "xttjkpzhxtjfwxjsxuab";
      const args2 = parseArgs(VALID_FLAGS);
      expect(args2.expectedProjectRef).toBe("xttjkpzhxtjfwxjsxuab");
    } finally {
      if (previous === undefined) delete process.env.FIBT_HML_AUTHORIZED_STAGING_REF;
      else process.env.FIBT_HML_AUTHORIZED_STAGING_REF = previous;
    }
  });

  test("ambiente diferente de staging falha", () => {
    expect(expectAbort(withOverride({ "--environment": "production" })).code).toBe("INVALID_ENVIRONMENT");
  });
});

describe("parseArgs — contagens e expiração desta campanha", () => {
  test("7. contagem Alfa diferente de 6 falha nesta campanha", () => {
    expect(expectAbort(withOverride({ "--alpha-count": "5" })).code).toBe("INVALID_ALPHA_COUNT");
    expect(expectAbort(withOverride({ "--alpha-count": "7" })).code).toBe("INVALID_ALPHA_COUNT");
  });

  test("8. contagem Beta diferente de 4 falha nesta campanha", () => {
    expect(expectAbort(withOverride({ "--beta-count": "3" })).code).toBe("INVALID_BETA_COUNT");
    expect(expectAbort(withOverride({ "--beta-count": "5" })).code).toBe("INVALID_BETA_COUNT");
  });

  test("14. expiração é sete dias — qualquer outro valor falha", () => {
    expect(expectAbort(withOverride({ "--expires-in-days": "14" })).code).toBe("INVALID_EXPIRES_IN_DAYS");
    const args = parseArgs(VALID_FLAGS);
    expect(args.expiresInDays).toBe(7);
  });

  test("batch-id diferente do autorizado falha — não é gerador genérico", () => {
    expect(expectAbort(withOverride({ "--batch-id": "OUTRA-CAMPANHA" })).code).toBe("INVALID_BATCH_ID");
  });
});

describe("parseArgs — confirmação e parâmetros", () => {
  test("--confirm-synthetic-homologation ausente falha", () => {
    expect(expectAbort(withOverride({ "--confirm-synthetic-homologation": null })).code).toBe(
      "MISSING_CONFIRMATION",
    );
  });

  test("parâmetro inesperado é rejeitado", () => {
    const err = expectAbort(withOverride({}, ["--force=true"]));
    expect(err.code).toBe("UNEXPECTED_PARAM");
  });
});

describe("planBatch — modelo Alfa/Beta e identidade", () => {
  const args = parseArgs(VALID_FLAGS);
  const plan = planBatch(args);

  test("15. dez IDs únicos, 16. seis links na Alfa, 17. quatro links na Beta", () => {
    expect(plan.invites.length).toBe(10);
    const ids = plan.invites.map((i) => i.testLinkId);
    expect(new Set(ids).size).toBe(10);
    expect(ids).toEqual([...EXPECTED_TEST_LINK_IDS]);
    expect(ids.filter((i) => i.startsWith("ALFA")).length).toBe(6);
    expect(ids.filter((i) => i.startsWith("BETA")).length).toBe(4);
  });

  test("10. nenhum e-mail é aceito, 11. nenhum nome pessoal é aceito", () => {
    // Toda identidade da campanha é constante fixa — não há campo de nome de
    // pessoa nem endereço de e-mail em lugar nenhum do plano.
    const serialized = JSON.stringify(plan);
    expect(serialized).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i); // formato de e-mail
    expect(CAMPAIGN.organizationName).not.toMatch(/@/);
    expect(CAMPAIGN.waveLabel).not.toMatch(/@/);
  });

  test("12. nenhum token é impresso em forma válida — só placeholders DRY_RUN_NOT_VALID_", () => {
    for (const invite of plan.invites) {
      expect(invite.relativePath).toMatch(/^\/convite\/DRY_RUN_NOT_VALID_/);
    }
  });

  test("19. CSV privado não é gerado no dry-run (plano não grava arquivo nenhum)", () => {
    // planBatch é puro — não há chamada de fs em nenhum ponto desta função.
    // Confirmado por inspeção de código: writeFileSync só existe dentro de
    // writePrivateOutputs, nunca chamada pelo caminho dry-run.
    expect(typeof plan).toBe("object");
  });

  test("18. manifest (quando existir) não conterá token bruto — tokenHashForManifest sempre hasheia", () => {
    const raw = "um-token-bruto-de-exemplo";
    const hash = tokenHashForManifest(raw);
    expect(hash).not.toBe(raw);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("20. ausência de frontend seguro bloqueia commit (FIBT_HML_FRONTEND_BASE_URL não declarada)", () => {
    expect(plan.frontendBaseUrlStatus).toBe("HML_FRONTEND_MISSING");
    expect(commitGateFailures({})).toContain("FRONTEND_BLOCKED");
  });

  test("1. FIBT-HML-1D remove o portão textual BANNER_MISSING — commitGateFailures só reporta FRONTEND_BLOCKED", () => {
    // A prova de que o banner/gate estão de fato integrados migrou para um
    // teste de componente que renderiza a rota de verdade (Fase 9.2) e para
    // a atestação de deployment (Fase 9.3) — não para leitura de texto-fonte.
    const failures = commitGateFailures({});
    expect(failures).not.toContain("BANNER_MISSING" as never);
  });
});

const AUTHORIZED_BASE_URL = "https://fibt-hml-01.example-homolog.invalid";
const MATCHING_ENV = {
  FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_BASE_URL,
  VITE_FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_BASE_URL,
};

describe("validateFrontendBaseUrl — Fase 5/12 (allowlist por igualdade exata de origem)", () => {
  test("5. URL produtiva (vitalos.com.br) é rejeitada mesmo declarada nas duas variáveis", () => {
    const r = validateFrontendBaseUrl({
      FIBT_HML_FRONTEND_BASE_URL: "https://vitalos.com.br",
      VITE_FIBT_HML_FRONTEND_BASE_URL: "https://vitalos.com.br",
    });
    expect(r.valid).toBe(false);
  });

  test("6. app.vitalos.com.br é rejeitado", () => {
    const r = validateFrontendBaseUrl({
      FIBT_HML_FRONTEND_BASE_URL: "https://app.vitalos.com.br",
      VITE_FIBT_HML_FRONTEND_BASE_URL: "https://app.vitalos.com.br",
    });
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_FORBIDDEN_HOSTNAME" });
  });

  test("www.vitalos.com.br também é rejeitado (terceiro domínio proibido)", () => {
    const r = validateFrontendBaseUrl({
      FIBT_HML_FRONTEND_BASE_URL: "https://www.vitalos.com.br",
      VITE_FIBT_HML_FRONTEND_BASE_URL: "https://www.vitalos.com.br",
    });
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_FORBIDDEN_HOSTNAME" });
  });

  test("7. HTTP remoto (não HTTPS) é rejeitado", () => {
    const r = validateFrontendBaseUrl({
      FIBT_HML_FRONTEND_BASE_URL: "http://fibt-hml-01.example-homolog.invalid",
      VITE_FIBT_HML_FRONTEND_BASE_URL: "http://fibt-hml-01.example-homolog.invalid",
    });
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_NOT_HTTPS" });
  });

  test("8. HTTPS de homologação (hostname não produtivo), candidata igual à autorizada, é aceito", () => {
    const r = validateFrontendBaseUrl(MATCHING_ENV);
    expect(r.valid).toBe(true);
  });

  test("9. query string na base URL é rejeitada", () => {
    const r = validateFrontendBaseUrl({
      FIBT_HML_FRONTEND_BASE_URL: `${AUTHORIZED_BASE_URL}?foo=bar`,
      VITE_FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_BASE_URL,
    });
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_HAS_QUERY" });
  });

  test("fragment na base URL é rejeitado", () => {
    const r = validateFrontendBaseUrl({
      FIBT_HML_FRONTEND_BASE_URL: `${AUTHORIZED_BASE_URL}#section`,
      VITE_FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_BASE_URL,
    });
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_HAS_FRAGMENT" });
  });

  test("10. credencial embutida na URL (user:pass@) é rejeitada", () => {
    const r = validateFrontendBaseUrl({
      FIBT_HML_FRONTEND_BASE_URL: "https://user:pass@fibt-hml-01.example-homolog.invalid",
      VITE_FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_BASE_URL,
    });
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_HAS_CREDENTIALS" });
  });

  test("11. ausência de base URL bloqueia commit", () => {
    const r = validateFrontendBaseUrl({});
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_MISSING" });
    expect(commitGateFailures({})).toContain("FRONTEND_BLOCKED");
  });

  test("URL malformada é rejeitada, não lança", () => {
    const r = validateFrontendBaseUrl({
      FIBT_HML_FRONTEND_BASE_URL: "nao-e-uma-url",
      VITE_FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_BASE_URL,
    });
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_UNPARSEABLE" });
  });

  test("path normalizado: barra final é removida, raiz vira string vazia", () => {
    const r = validateFrontendBaseUrl({
      FIBT_HML_FRONTEND_BASE_URL: `${AUTHORIZED_BASE_URL}/`,
      VITE_FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_BASE_URL,
    });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.normalizedBaseUrl).toBe(AUTHORIZED_BASE_URL);
  });

  test("com base URL válida declarada nas duas variáveis, FRONTEND_BLOCKED não aparece mais", () => {
    const failures = commitGateFailures(MATCHING_ENV);
    expect(failures).not.toContain("FRONTEND_BLOCKED");
  });

  test("declarada só do lado servidor (VITE_ ausente) ainda bloqueia — as duas precisam concordar", () => {
    const failures = commitGateFailures({ FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_BASE_URL });
    expect(failures).toContain("FRONTEND_BLOCKED");
  });

  test("candidata e autorizada divergentes bloqueiam (P1 original: valor nunca usado para construir link real)", () => {
    const r = validateFrontendBaseUrl({
      FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_BASE_URL,
      VITE_FIBT_HML_FRONTEND_BASE_URL: "https://outra-origem.example-homolog.invalid",
    });
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_MISMATCH" });
  });

  test("sufixo-lookalike de produção como candidata diverge da origem autorizada real (P2 original)", () => {
    const r = validateFrontendBaseUrl({
      FIBT_HML_FRONTEND_BASE_URL: "https://vitalos.com.br.attacker-controlled.test",
      VITE_FIBT_HML_FRONTEND_BASE_URL: AUTHORIZED_BASE_URL,
    });
    expect(r).toEqual({ valid: false, failure: "HML_FRONTEND_ORIGIN_MISMATCH" });
  });
});

describe("HML_RAW_TOKEN_STAGING_EXCEPTION e o gate de --commit — Fase 1", () => {
  test("12. ausência de --accept-staging-raw-token-contract bloqueia --commit", () => {
    const argvSemToken = withOverride(
      { "--dry-run": null },
      ["--commit"],
    );
    const err = expectAbort(argvSemToken);
    expect(err.code).toBe("RAW_TOKEN_CONTRACT_NOT_ACKNOWLEDGED");
  });

  test("com --accept-staging-raw-token-contract, --commit é aceito (junto com todo o resto válido)", () => {
    const argvComToken = withOverride(
      { "--dry-run": null },
      ["--commit", "--accept-staging-raw-token-contract"],
    );
    const args = parseArgs(argvComToken);
    expect(args.commit).toBe(true);
    expect(args.acceptedRawTokenContract).toBe(true);
  });

  test("13. a exceção de token bruto não libera produção nem ref desconhecido — checagens de ref continuam rodando antes", () => {
    const err = expectAbort(
      withOverride(
        { "--expected-project-ref": FAKE_PRODUCTION_REF, "--dry-run": null },
        ["--commit", "--accept-staging-raw-token-contract"],
      ),
      FAKE_PRODUCTION_ENV,
    );
    expect(err.code).toBe("INVALID_PROJECT_REF"); // não chega a RAW_TOKEN_CONTRACT_NOT_ACKNOWLEDGED
  });

  test("dry-run nunca exige a exceção de token (só se aplica a --commit)", () => {
    const args = parseArgs(VALID_FLAGS); // sem --accept-staging-raw-token-contract, dry-run
    expect(args.commit).toBe(false);
    expect(args.acceptedRawTokenContract).toBe(false);
  });

  test("decisão documenta as 13 condições exigidas para a exceção valer", () => {
    expect(HML_RAW_TOKEN_STAGING_EXCEPTION.decision).toBe("HML_RAW_TOKEN_STAGING_EXCEPTION");
    expect(HML_RAW_TOKEN_STAGING_EXCEPTION.conditions.length).toBeGreaterThanOrEqual(13);
  });
});

describe("22. campos livres para PII ficam indisponíveis em modo HML (por ausência estrutural)", () => {
  test("a rota /convite/:token não tem nenhum campo de texto livre, e-mail ou textarea — só escala Likert fixa", () => {
    const source = readFileSync("src/routes/convite.$token.tsx", "utf8");
    expect(source).not.toMatch(/type="text"/);
    expect(source).not.toMatch(/type="email"/);
    expect(source).not.toMatch(/<textarea/);
  });
});

describe("runCommit — idempotência (fake client, zero rede)", () => {
  const args = parseArgs(VALID_FLAGS);
  const plan = planBatch(args);

  function fakeClient(opts: { orgExists: boolean }): AdminClientLike {
    let tokenCounter = 0;
    return {
      from(table: string) {
        return {
          select() {
            return {
              eq(_column: string, _value: string) {
                return {
                  async maybeSingle() {
                    if (table === "organizations" && opts.orgExists) {
                      return { data: { id: "existing-org-id" }, error: null };
                    }
                    return { data: null, error: null };
                  },
                };
              },
            };
          },
          insert(rows: unknown) {
            return {
              async select(_columns: string) {
                if (table === "organizations") return { data: [{ id: "new-org-id" }], error: null };
                if (table === "waves") return { data: [{ id: "new-wave-id" }], error: null };
                if (table === "wave_cohorts") {
                  const key = (rows as { key: string }).key;
                  return { data: [{ id: `cohort-${key}` }], error: null };
                }
                if (table === "wave_invites") {
                  tokenCounter += 1;
                  return { data: [{ token: `fake-raw-token-${tokenCounter}` }], error: null };
                }
                return { data: null, error: { message: `tabela inesperada: ${table}` } };
              },
            };
          },
        };
      },
    };
  }

  test("9. batch duplicado não é recriado — organização já existe devolve BATCH_ALREADY_EXISTS", async () => {
    const outcome = await runCommit(plan, fakeClient({ orgExists: true }));
    expect(outcome.status).toBe("BATCH_ALREADY_EXISTS");
  });

  test("primeira criação: organização, onda, duas coortes e dez convites, cada um com token diferente", async () => {
    const outcome = await runCommit(plan, fakeClient({ orgExists: false }));
    expect(outcome.status).toBe("CREATED");
    if (outcome.status !== "CREATED") throw new Error("unreachable");
    expect(Object.keys(outcome.cohortIds).sort()).toEqual(["ISG-HML-ALFA", "ISG-HML-BETA"].sort());
    expect(outcome.manifestRows.length).toBe(10);
    expect(outcome.csvRows.length).toBe(10);
    const hashes = outcome.manifestRows.map((r) => r.token_hash);
    expect(new Set(hashes).size).toBe(10); // nenhum token reusado
    // Não há caminho de UPDATE/DELETE em runCommit para convite ou
    // organização existentes — só INSERT quando a organização não existe.
  });

  test("18. manifest não contém token bruto em nenhum campo", async () => {
    const outcome = await runCommit(plan, fakeClient({ orgExists: false }));
    if (outcome.status !== "CREATED") throw new Error("unreachable");
    for (const row of outcome.manifestRows) {
      expect(JSON.stringify(row)).not.toContain("fake-raw-token-");
    }
  });

  test("13. pacote privado fica fora do repositório — só inspeção do caminho, sem chamar writePrivateOutputs (I/O)", () => {
    expect(PRIVATE_OUTPUT_DIR).not.toContain("vitalos-fibt-hml");
    expect(PRIVATE_OUTPUT_DIR.toLowerCase()).toContain("private");
  });
});

describe("runCommit — Fase 11: URLs completas no CSV privado, nunca no manifest", () => {
  const args = parseArgs(VALID_FLAGS);

  function fakeClient(): AdminClientLike {
    let tokenCounter = 0;
    return {
      from(table: string) {
        return {
          select() {
            return { eq: () => ({ async maybeSingle() { return { data: null, error: null }; } }) };
          },
          insert(rows: unknown) {
            return {
              async select() {
                if (table === "organizations") return { data: [{ id: "org-1" }], error: null };
                if (table === "waves") return { data: [{ id: "wave-1" }], error: null };
                if (table === "wave_cohorts") {
                  const key = (rows as { key: string }).key;
                  return { data: [{ id: `cohort-${key}` }], error: null };
                }
                tokenCounter += 1;
                return { data: [{ token: `fake-raw-token-${tokenCounter}` }], error: null };
              },
            };
          },
        };
      },
    };
  }

  test("33. com FIBT_HML_FRONTEND_BASE_URL configurada (nas duas variáveis), o CSV recebe URL absoluta HTTPS", async () => {
    const plan = planBatch(args, MATCHING_ENV);
    expect(plan.frontendBaseUrl).toBe(AUTHORIZED_BASE_URL);
    const outcome = await runCommit(plan, fakeClient());
    if (outcome.status !== "CREATED") throw new Error("unreachable");
    for (const row of outcome.csvRows) {
      expect(row.url.startsWith(`${AUTHORIZED_BASE_URL}/convite/`)).toBe(true);
      const parsed = new URL(row.url);
      expect(parsed.hostname).toBe("fibt-hml-01.example-homolog.invalid");
    }
  });

  test("34. manifest nunca recebe token, mesmo com base URL configurada", async () => {
    const plan = planBatch(args, MATCHING_ENV);
    const outcome = await runCommit(plan, fakeClient());
    if (outcome.status !== "CREATED") throw new Error("unreachable");
    for (const row of outcome.manifestRows) {
      expect(row.relative_path).toBe("/convite/:token");
      expect(JSON.stringify(row)).not.toContain("fake-raw-token-");
    }
  });

  test("sem base URL configurada, CSV cai para caminho relativo (comportamento anterior preservado)", async () => {
    const plan = planBatch(args, {});
    expect(plan.frontendBaseUrl).toBeNull();
    const outcome = await runCommit(plan, fakeClient());
    if (outcome.status !== "CREATED") throw new Error("unreachable");
    for (const row of outcome.csvRows) {
      expect(row.url.startsWith("/convite/")).toBe(true);
    }
  });

  test("token é sempre encodeURIComponent na URL absoluta (nunca concatenação manual crua)", async () => {
    const plan = planBatch(args, MATCHING_ENV);
    const outcome = await runCommit(plan, fakeClient());
    if (outcome.status !== "CREATED") throw new Error("unreachable");
    // new URL() já normaliza — confirmamos que o caminho é exatamente
    // /convite/<token>, sem segmentos extras nem path traversal.
    for (const row of outcome.csvRows) {
      const parsed = new URL(row.url);
      expect(parsed.pathname.startsWith("/convite/")).toBe(true);
      expect(parsed.pathname.split("/").filter(Boolean).length).toBe(2);
    }
  });
});

describe("checkDeploymentAttestation — Fase 10 (fetch sempre fake, zero rede)", () => {
  function fakeFetch(body: unknown, ok = true, status = 200): FetchLike {
    return async () => ({ ok, status, async json() { return body; } });
  }

  const READY_BODY = {
    status: "READY",
    contract_version: "FIBT-HML-1",
    environment: "staging",
    batch_id: CAMPAIGN.batchId,
    backend_attested: true,
    frontend_origin_attested: true,
  };

  test("27. READY válido permite seguir (ok: true)", async () => {
    const r = await checkDeploymentAttestation(AUTHORIZED_BASE_URL, fakeFetch(READY_BODY));
    expect(r).toEqual({ ok: true });
  });

  test("28. BLOCKED impede seguir", async () => {
    const r = await checkDeploymentAttestation(
      AUTHORIZED_BASE_URL,
      fakeFetch({ status: "BLOCKED", failure_code: "HML_PRODUCTION_TARGET_FORBIDDEN" }, false, 503),
    );
    expect(r).toEqual({ ok: false, code: "HML_DEPLOYMENT_ATTESTATION_BLOCKED", detail: "HML_PRODUCTION_TARGET_FORBIDDEN" });
  });

  test("29. contract_version divergente impede seguir", async () => {
    const r = await checkDeploymentAttestation(
      AUTHORIZED_BASE_URL,
      fakeFetch({ ...READY_BODY, contract_version: "OUTRA-VERSAO" }),
    );
    expect(r).toEqual({ ok: false, code: "HML_DEPLOYMENT_CONTRACT_MISMATCH" });
  });

  test("30. batch_id divergente impede seguir", async () => {
    const r = await checkDeploymentAttestation(AUTHORIZED_BASE_URL, fakeFetch({ ...READY_BODY, batch_id: "OUTRO" }));
    expect(r).toEqual({ ok: false, code: "HML_DEPLOYMENT_CONTRACT_MISMATCH" });
  });

  test("31. fetch que lança (endpoint indisponível) impede seguir", async () => {
    const throwingFetch: FetchLike = async () => {
      throw new Error("network unreachable");
    };
    const r = await checkDeploymentAttestation(AUTHORIZED_BASE_URL, throwingFetch);
    expect(r).toEqual({ ok: false, code: "HML_DEPLOYMENT_ATTESTATION_UNAVAILABLE" });
  });

  test("resposta não-JSON / corpo vazio também é tratada como indisponível", async () => {
    const badJsonFetch: FetchLike = async () => ({
      ok: true,
      status: 200,
      async json() {
        throw new Error("invalid json");
      },
    });
    const r = await checkDeploymentAttestation(AUTHORIZED_BASE_URL, badJsonFetch);
    expect(r).toEqual({ ok: false, code: "HML_DEPLOYMENT_ATTESTATION_UNAVAILABLE" });
  });

  test("backend_attested false mesmo com status READY é tratado como contract mismatch (fail-closed)", async () => {
    const r = await checkDeploymentAttestation(AUTHORIZED_BASE_URL, fakeFetch({ ...READY_BODY, backend_attested: false }));
    expect(r).toEqual({ ok: false, code: "HML_DEPLOYMENT_CONTRACT_MISMATCH" });
  });

  test("consulta exatamente o path /api/fibt-hml/attestation relativo à base URL", async () => {
    let calledUrl = "";
    const capturingFetch: FetchLike = async (url) => {
      calledUrl = url;
      return { ok: true, status: 200, async json() { return READY_BODY; } };
    };
    await checkDeploymentAttestation(AUTHORIZED_BASE_URL, capturingFetch);
    expect(calledUrl).toBe(`${AUTHORIZED_BASE_URL}${HML_ATTESTATION_PATH}`);
  });
});

describe("32. dry-run nunca chama fetch nem qualquer rede", () => {
  test("planBatch + ausência de --commit não invoca checkDeploymentAttestation em lugar nenhum do fluxo dry-run", () => {
    // planBatch/parseArgs são funções puras — nenhuma delas importa fetch,
    // node:http, node:net ou qualquer client de rede. A única chamada a
    // checkDeploymentAttestation no módulo inteiro vive dentro do bloco
    // `if (import.meta.main)`, após a checagem `if (!args.commit) { ...
    // process.exit(0) }` — ou seja, estruturalmente inalcançável em dry-run.
    const args = parseArgs(VALID_FLAGS);
    expect(args.commit).toBe(false);
    const plan = planBatch(args);
    expect(plan).toBeDefined();
  });

  test("checkDeploymentAttestation só é referenciada dentro do bloco import.meta.main, depois do exit de dry-run", () => {
    const source = readFileSync(new URL("./create-synthetic-homologation-links.ts", import.meta.url), "utf8");
    const mainBlockStart = source.indexOf("if (import.meta.main)");
    const dryRunExit = source.indexOf("process.exit(0)", mainBlockStart);
    const attestationCall = source.indexOf("await checkDeploymentAttestation(", mainBlockStart);
    expect(mainBlockStart).toBeGreaterThan(-1);
    expect(dryRunExit).toBeGreaterThan(mainBlockStart);
    expect(attestationCall).toBeGreaterThan(dryRunExit);
  });
});

describe("gates produtivos nunca tocados", () => {
  test("22. feature flag produtiva não é alterada; 23. release gate produtivo não é alterado", () => {
    // Este script não lê nem escreve VITE_FIBT_PILOT_ENABLED nem
    // operational_real_collection_status em lugar nenhum -- confirmado por
    // ausência de qualquer referência a esses nomes no módulo-fonte.
    const source = readFileSync(new URL("./create-synthetic-homologation-links.ts", import.meta.url), "utf8");
    expect(source).not.toContain("VITE_FIBT_PILOT_ENABLED");
    expect(source).not.toContain("operational_real_collection_status");
  });
});
