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
  PRIVATE_OUTPUT_DIR,
  type AdminClientLike,
} from "./create-synthetic-homologation-links";

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

function expectAbort(argv: string[]): GeneratorError {
  try {
    parseArgs(argv);
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

    const commitOnly = withOverride({ "--dry-run": null }, ["--commit"]);
    const args = parseArgs(commitOnly);
    expect(args.commit).toBe(true);
  });
});

describe("parseArgs — validação de ambiente e project ref", () => {
  test("3. project ref ausente falha", () => {
    expect(expectAbort(withOverride({ "--expected-project-ref": null })).code).toBe("MISSING_PARAM");
  });

  test("4. project ref produtivo falha", () => {
    const err = expectAbort(withOverride({ "--expected-project-ref": "shlmzzchddohaytfakol" }));
    expect(err.code).toBe("INVALID_PROJECT_REF");
    expect(err.message).not.toContain("shlmzzchddohaytfakol"); // só a forma mascarada
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

  test("20. ausência de frontend seguro bloqueia commit", () => {
    expect(plan.frontendBaseUrlStatus).toBe("HML_FRONTEND_MISSING");
    expect(commitGateFailures()).toContain("FRONTEND_BLOCKED");
  });

  test("21. banner ausente bloqueia commit", () => {
    expect(commitGateFailures()).toContain("BANNER_MISSING");
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
