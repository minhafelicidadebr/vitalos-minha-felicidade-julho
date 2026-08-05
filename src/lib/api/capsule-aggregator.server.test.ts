import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { getWaveSurvey } from "@/mocks/survey-mock";

// ── Fake supabaseAdmin — estado controlável, registra toda chamada de escrita
// para provar o que NUNCA deveria acontecer (P0-08: agregação não sela onda).
const survey = getWaveSurvey("enterprise", "COPSOQ")!;

function buildRawResponses(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `resp-${i}`,
    answers: Object.fromEntries(survey.items.map((item) => [item.id, 3])),
  }));
}

let responseCount = 5;
let rawResponses = buildRawResponses(5);
let waveOrgId = "org-real";
// pack_id da organização dona da onda — null = coluna vazia (fallback enterprise);
// "missing" = onda inexistente (waves retorna null).
let orgPackId: string | null = null;
let waveExists = true;
const upsertCalls: unknown[] = [];
const wavesUpdateCalls: unknown[] = [];

// ── wave_invites fake — só usado pelos testes de triggerCapsuleAggregationByToken ──
let inviteRow: Record<string, unknown> | null = { wave_id: "wave-1", waves: { instrument: "COPSOQ", org_id: "org-real" } };

const fakeAdmin = {
  rpc: async (name: string) => {
    if (name === "count_wave_responses") return { data: responseCount };
    return { data: null };
  },
  from: (table: string) => {
    if (table === "waves") {
      return {
        select: (_cols: string) => ({
          eq: (_c: string, _v: string) => ({
            maybeSingle: async () => ({
              data: waveExists
                ? { org_id: waveOrgId, instrument: "COPSOQ", organizations: { pack_id: orgPackId } }
                : null,
            }),
            single: async () => ({
              data: waveExists
                ? { org_id: waveOrgId, instrument: "COPSOQ", organizations: { pack_id: orgPackId } }
                : null,
            }),
          }),
        }),
        update: (payload: unknown) => {
          wavesUpdateCalls.push(payload);
          return { eq: async () => ({ data: null, error: null }) };
        },
      };
    }
    if (table === "wave_responses") {
      return {
        select: (_cols: string) => ({
          eq: async (_c: string, _v: string) => ({ data: rawResponses, error: null }),
        }),
      };
    }
    if (table === "wave_capsules") {
      return {
        upsert: (payload: unknown, _opts: unknown) => {
          upsertCalls.push(payload);
          return {
            select: (_c: string) => ({
              single: async () => ({ data: { id: "capsule-1" }, error: null }),
            }),
          };
        },
      };
    }
    if (table === "wave_invites") {
      return {
        select: (_cols: string) => ({
          eq: (_c: string, _v: string) => ({
            maybeSingle: async () => ({ data: inviteRow }),
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
  },
};

mock.module("@/integrations/supabase/client.server", () => ({ supabaseAdmin: fakeAdmin }));

const { triggerCapsuleAggregation, triggerCapsuleAggregationByToken } = await import("./capsule-aggregator.server");

const HML_ENV_KEYS = [
  "VITE_FIBT_HML_ENABLED",
  "VITE_FIBT_HML_ENVIRONMENT",
  "VITE_FIBT_HML_BATCH_ID",
  "FIBT_HML_AUTHORIZED_STAGING_REF",
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "VITALOS_PRODUCTION_PROJECT_REF",
  "FIBT_HML_FRONTEND_BASE_URL",
  "VITE_FIBT_HML_FRONTEND_BASE_URL",
] as const;
const originalHmlEnv: Record<string, string | undefined> = {};

function setHmlEnv(overrides: Partial<Record<(typeof HML_ENV_KEYS)[number], string>>) {
  for (const key of HML_ENV_KEYS) {
    originalHmlEnv[key] = process.env[key];
    const value = overrides[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function restoreHmlEnv() {
  for (const key of HML_ENV_KEYS) {
    const original = originalHmlEnv[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
}

const STAGING_REF = "xttjkpzhxtjfwxjsxuab";
const HML_DECLARED_BUT_NOT_ATTESTED = {
  VITE_FIBT_HML_ENABLED: "true",
  // demais variáveis ausentes de propósito — hmlDeclared=true, attested=false
};
const HML_FULLY_ATTESTED = {
  VITE_FIBT_HML_ENABLED: "true",
  VITE_FIBT_HML_ENVIRONMENT: "staging",
  VITE_FIBT_HML_BATCH_ID: "FIBT-ISG-HML-01",
  FIBT_HML_AUTHORIZED_STAGING_REF: STAGING_REF,
  SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
  VITE_SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
  VITALOS_PRODUCTION_PROJECT_REF: "pppppppppppppppppppp",
  FIBT_HML_FRONTEND_BASE_URL: "https://fibt-hml-01.lovable.app",
  VITE_FIBT_HML_FRONTEND_BASE_URL: "https://fibt-hml-01.lovable.app",
};

beforeEach(() => {
  responseCount = 5;
  rawResponses = buildRawResponses(5);
  waveOrgId = "org-real";
  orgPackId = null;
  waveExists = true;
  upsertCalls.length = 0;
  wavesUpdateCalls.length = 0;
  inviteRow = { wave_id: "wave-1", waves: { instrument: "COPSOQ", org_id: "org-real" } };
});

describe("triggerCapsuleAggregation — k-anon publica, NUNCA sela a onda (P0-08)", () => {
  test("n < 5: recusa por below_k_anonymity e não escreve nada", async () => {
    responseCount = 3;
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    expect(result).toEqual({ triggered: false, count: 3, reason: "below_k_anonymity" });
    expect(upsertCalls).toHaveLength(0);
  });

  test("n >= 5: agrega e faz UPSERT em wave_capsules — nunca UPDATE em waves", async () => {
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    expect(result.triggered).toBe(true);
    expect(upsertCalls).toHaveLength(1);
    // A prova central do P0-08: agregação bem-sucedida NUNCA toca a tabela waves.
    expect(wavesUpdateCalls).toHaveLength(0);
  });

  test("chamar de novo com MAIS respostas atualiza a cápsula (upsert), não recusa como 'already_aggregated'", async () => {
    await triggerCapsuleAggregation("wave-1", "COPSOQ");
    responseCount = 12;
    rawResponses = buildRawResponses(12);

    const second = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    expect(second.triggered).toBe(true);
    if (second.triggered) expect(second.participantCount).toBe(12);
    expect(upsertCalls).toHaveLength(2); // duas chamadas, nenhuma recusada
    expect(wavesUpdateCalls).toHaveLength(0); // onda continua intocada
  });

  test("cada upsert usa onConflict wave_id — uma cápsula por onda, sempre atualizada", async () => {
    await triggerCapsuleAggregation("wave-1", "COPSOQ");
    // A chamada de upsert precisa carregar o wave_id para o onConflict funcionar.
    expect(upsertCalls[0]).toMatchObject({ wave_id: "wave-1" });
  });

  test("authorizedOrgId divergente do dono real da onda: nega ANTES de ler qualquer resposta (P0-04)", async () => {
    waveOrgId = "org-real";
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ", "org-atacante");
    expect(result).toEqual({ triggered: false, count: 0, reason: "cross_tenant_denied" });
    expect(upsertCalls).toHaveLength(0);
  });

  test("authorizedOrgId correto: prossegue normalmente", async () => {
    waveOrgId = "org-real";
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ", "org-real");
    expect(result.triggered).toBe(true);
  });
});

describe("triggerCapsuleAggregation — pack resolvido da ORG dona da onda, nunca do chamador", () => {
  test("onda inexistente: wave_not_found, nada é lido nem escrito", async () => {
    waveExists = false;
    const result = await triggerCapsuleAggregation("wave-fantasma", "COPSOQ");
    expect(result).toEqual({ triggered: false, count: 0, reason: "wave_not_found" });
    expect(upsertCalls).toHaveLength(0);
  });

  test("organizations.pack_id vazio: fallback honesto para enterprise, agrega normalmente", async () => {
    orgPackId = null;
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    expect(result.triggered).toBe(true);
  });

  test("org de pack sem survey COPSOQ: unknown_instrument — prova que NÃO caiu silenciosamente no enterprise", async () => {
    // Se o código ainda usasse "enterprise" fixo, esta agregação teria sucesso —
    // o erro aqui é a prova de que o pack da org é quem manda.
    orgPackId = "pack-sem-copsoq";
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    expect(result).toEqual({ triggered: false, count: 5, reason: "unknown_instrument" });
    expect(upsertCalls).toHaveLength(0);
  });
});

describe("FIBT-HML-2E (P0) — assertHmlBackendBoundary protege triggerCapsuleAggregation/triggerCapsuleAggregationByToken", () => {
  afterEach(restoreHmlEnv);

  test("triggerCapsuleAggregation: backend HML declarado mas não atestado bloqueia ANTES de qualquer I/O", async () => {
    setHmlEnv(HML_DECLARED_BUT_NOT_ATTESTED);
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    expect(result).toEqual({ triggered: false, count: 0, reason: "hml_backend_not_attested" });
    expect(upsertCalls).toHaveLength(0);
  });

  test("triggerCapsuleAggregation: backend HML totalmente atestado prossegue normalmente", async () => {
    setHmlEnv(HML_FULLY_ATTESTED);
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    expect(result.triggered).toBe(true);
  });

  test("triggerCapsuleAggregation: HML não declarado (produção comum) nunca é afetado", async () => {
    setHmlEnv({});
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    expect(result.triggered).toBe(true);
  });

  test("triggerCapsuleAggregationByToken: backend HML declarado mas não atestado bloqueia ANTES da própria query de wave_invites", async () => {
    setHmlEnv(HML_DECLARED_BUT_NOT_ATTESTED);
    const result = await triggerCapsuleAggregationByToken("tok-123");
    expect(result).toEqual({ triggered: false, count: 0, reason: "hml_backend_not_attested" });
    expect(upsertCalls).toHaveLength(0);
  });

  test("triggerCapsuleAggregationByToken: backend atestado + convite fora do lote sintético (organização diferente) é recusado como invalid_token", async () => {
    setHmlEnv(HML_FULLY_ATTESTED);
    inviteRow = {
      wave_id: "wave-1",
      expires_at: null,
      waves: { instrument: "COPSOQ", org_id: "org-real", label: "Outra onda qualquer", organizations: { slug: "outra-org" } },
      wave_cohorts: { key: "ISG-HML-ALFA" },
    };
    const result = await triggerCapsuleAggregationByToken("tok-123");
    expect(result).toEqual({ triggered: false, count: 0, reason: "invalid_token" });
    expect(upsertCalls).toHaveLength(0);
  });

  test("triggerCapsuleAggregationByToken: backend atestado + convite dentro do lote sintético prossegue normalmente", async () => {
    setHmlEnv(HML_FULLY_ATTESTED);
    inviteRow = {
      wave_id: "wave-1",
      expires_at: null,
      waves: {
        instrument: "COPSOQ",
        org_id: "org-real",
        label: "FIB-T Pré-Teste Sintético 01",
        organizations: { slug: "isg-homologacao-assistida-fibt-hml-01" },
      },
      wave_cohorts: { key: "ISG-HML-ALFA" },
    };
    const result = await triggerCapsuleAggregationByToken("tok-123");
    expect(result.triggered).toBe(true);
  });
});
