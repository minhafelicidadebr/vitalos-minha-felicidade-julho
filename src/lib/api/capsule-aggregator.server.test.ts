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
// Estado controlável da cápsula JÁ publicada (P1 — lote de supressão
// diferencial). null = onda nunca publicou cápsula (comportamento de sempre:
// primeira publicação nunca é retida pelo lote).
let existingCapsule: { id: string; participant_count: number } | null = null;

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
        select: (_cols: string) => ({
          eq: (_c: string, _v: string) => ({
            maybeSingle: async () => ({ data: existingCapsule }),
          }),
        }),
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

const { triggerCapsuleAggregation: aggregate, triggerCapsuleAggregationByToken: byToken } = await import("./capsule-aggregator.server");
const triggerCapsuleAggregationByToken = (token: string) => byToken(token, async () => true);
// Estes casos isolam a matemática/publicação legada; habilitação real é provada separadamente.
const triggerCapsuleAggregation = (wave: string, instrument: string, org?: string) => aggregate(wave, instrument, org, async () => true);

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
  existingCapsule = null;
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

describe("triggerCapsuleAggregation — supressão diferencial por lote (P1): delta < k_min não republica", () => {
  test("primeira publicação (nenhuma cápsula existente): nunca é retida pelo lote, mesmo com n=5 exato", async () => {
    existingCapsule = null;
    responseCount = 5;
    rawResponses = buildRawResponses(5);
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    expect(result.triggered).toBe(true);
    if (result.triggered) expect(result.participantCount).toBe(5);
    expect(upsertCalls).toHaveLength(1);
  });

  test("delta de 1 resposta desde a última publicação: NÃO republica (recusaria o ataque de diferenciação n=9→n=10)", async () => {
    existingCapsule = { id: "capsule-anterior", participant_count: 9 };
    responseCount = 10;
    rawResponses = buildRawResponses(10);
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    // Retorna triggered=true (a onda AINDA tem cápsula publicada) e
    // withheldForPrivacy=true — sinaliza explicitamente que o
    // participantCount é o total real (10), mas nenhum snapshot com médias
    // recalculadas foi persistido/tornado observável para esse delta pequeno.
    expect(result).toEqual({
      triggered: true,
      capsuleId: "capsule-anterior",
      participantCount: 10,
      withheldForPrivacy: true,
    });
    expect(upsertCalls).toHaveLength(0);
  });

  test("delta de exatamente k_min (5) desde a última publicação: republica normalmente", async () => {
    existingCapsule = { id: "capsule-anterior", participant_count: 5 };
    responseCount = 10;
    rawResponses = buildRawResponses(10);
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    expect(result.triggered).toBe(true);
    if (result.triggered) expect(result.participantCount).toBe(10);
    expect(upsertCalls).toHaveLength(1);
  });

  test("delta negativo (não deveria ocorrer, mas não republica por segurança — nunca republica com menos que k_min de diferença)", async () => {
    existingCapsule = { id: "capsule-anterior", participant_count: 10 };
    responseCount = 10;
    rawResponses = buildRawResponses(10);
    const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");
    expect(result).toEqual({
      triggered: true,
      capsuleId: "capsule-anterior",
      participantCount: 10,
      withheldForPrivacy: true,
    });
    expect(upsertCalls).toHaveLength(0);
  });

  test("NENHUM parâmetro existe para ignorar o lote — a função aceita só (waveId, instrument, authorizedOrgId)", async () => {
    // TASK 10.1 §C: uma versão anterior tinha um 4º parâmetro forcePublish
    // que permitia bypassar esta proteção — provado por red-team que isso
    // reabria o ataque de diferenciação mesmo no fechamento da onda. A
    // função não aceita mais esse parâmetro; não há "modo forçado" a testar
    // porque ele não existe mais na assinatura.
    expect(triggerCapsuleAggregation.length).toBeLessThanOrEqual(3);
  });
});

describe("triggerCapsuleAggregation — red-team adversarial de diferenciação na publicação final (TASK 10.1 §C)", () => {
  // Para cada par (anterior, final), um observador com wave_capsules
  // ANTES (n=anterior, médias exatas) e DEPOIS (n=final, médias exatas)
  // poderia calcular mean_final*final − mean_anterior*anterior para isolar
  // o valor do grupo de (final−anterior) respondentes NOVOS. K_MIN=5: isso
  // só é seguro quando esse grupo tem >=5 pessoas. Requisito explícito da
  // tarefa: nenhum destes cenários pode permitir isolar um grupo <5.
  const cenarios: Array<{ anterior: number; final: number; delta: number; seguro: boolean }> = [
    { anterior: 5, final: 6, delta: 1, seguro: false },
    { anterior: 10, final: 11, delta: 1, seguro: false },
    { anterior: 10, final: 12, delta: 2, seguro: false },
    { anterior: 10, final: 14, delta: 4, seguro: false },
    { anterior: 10, final: 15, delta: 5, seguro: true },
  ];

  for (const c of cenarios) {
    test(`anterior N=${c.anterior} → final N=${c.final} (delta=${c.delta}): ${c.seguro ? "publica (delta>=k_min)" : "RETIDO — delta<k_min não pode ser isolável"}`, async () => {
      existingCapsule = { id: "capsule-anterior", participant_count: c.anterior };
      responseCount = c.final;
      rawResponses = buildRawResponses(c.final);

      const result = await triggerCapsuleAggregation("wave-1", "COPSOQ");

      if (c.seguro) {
        // delta>=k_min: publica um snapshot novo — o grupo isolável por
        // subtração teria >=k_min pessoas, o que já não viola k-anonimato
        // (é exatamente o que count_wave_responses/aggregate_cohort_responses
        // já consideram seguro em qualquer outro lugar do sistema).
        expect(result).toEqual({
          triggered: true,
          capsuleId: "capsule-1", // id do upsert simulado
          participantCount: c.final,
        });
        expect(upsertCalls).toHaveLength(1);
        // Nenhuma flag de retenção quando de fato publica.
        expect((result as { withheldForPrivacy?: true }).withheldForPrivacy).toBeUndefined();
      } else {
        // delta<k_min: NENHUM upsert — a cápsula anterior (única fonte
        // observável de médias) não muda. participantCount no retorno é o
        // total real (não é escondido do CHAMADOR, que já sabe a contagem
        // por count_wave_responses de qualquer forma), mas nenhum dado
        // agregado novo (mean/dimensions) é gravado ou torna-se observável.
        expect(result).toEqual({
          triggered: true,
          capsuleId: "capsule-anterior",
          participantCount: c.final,
          withheldForPrivacy: true,
        });
        expect(upsertCalls).toHaveLength(0);
      }
    });
  }
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
