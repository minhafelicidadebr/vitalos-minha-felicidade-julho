import { afterEach, describe, expect, mock, test } from "bun:test";
import type { IdentityBoundaryStatus } from "@/engine/identity/authorization-engine";
import { getActiveWave } from "@/mocks/campaign-mock";
import { getWaveSurvey } from "@/mocks/survey-mock";
import type { SubmitResponseResult } from "@/lib/cloud/db-adapter";

// Mocks para simular modos de boundary sem depender das env vars do ambiente.
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

// ── Fake da RPC atômica (submit_wave_response) — controlável por teste ──────
let saveWaveResponseResult: SubmitResponseResult = { accepted: true, responseCount: 6 };
let lastSaveWaveResponseInput: unknown = null;
mock.module("@/lib/cloud/db-adapter", () => ({
  saveWaveResponse: async (input: unknown) => {
    lastSaveWaveResponseInput = input;
    return saveWaveResponseResult;
  },
}));

// ── Fake do supabaseAdmin — resolve o vínculo token→onda→instrumento no
// momento do envio (P0-07: refeito aqui, nunca herdado da resolução da tela).
const INVITE_ROWS: Record<string, { wave_id: string; waves: { instrument: string } | null }> = {
  "token-valido": { wave_id: "wave-cloud-1", waves: { instrument: "COPSOQ" } },
  "token-onda-errada": { wave_id: "wave-cloud-OUTRA", waves: { instrument: "COPSOQ" } },
  "token-sem-onda": { wave_id: "wave-cloud-1", waves: null },
};

mock.module("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, token: string) => ({
          maybeSingle: async () => {
            if (table !== "wave_invites") return { data: null, error: null };
            return { data: INVITE_ROWS[token] ?? null, error: null };
          },
        }),
      }),
    }),
  },
}));

// Import AFTER mock setup so the module uses the mocks.
const { captureSurveySubmission } = await import("./response-capture.server");

function validInput(packId = "enterprise") {
  const wave = getActiveWave(packId);
  const survey = getWaveSurvey(packId, wave.instrumentShort)!;
  const firstValue = survey.scale.options[0]!.value;
  return {
    submissionId: "123e4567-e89b-12d3-a456-426614174000",
    packId,
    waveId: wave.id,
    surveyId: survey.id,
    answers: survey.items.map((item) => ({ itemId: item.id, value: firstValue })),
  };
}

/** Mesmo instrumento (COPSOQ/enterprise) da onda demo, mas endereçado como onda cloud. */
function validCloudInput() {
  const survey = getWaveSurvey("enterprise", "COPSOQ")!;
  const firstValue = survey.scale.options[0]!.value;
  return {
    submissionId: "223e4567-e89b-12d3-a456-426614174001",
    packId: "enterprise",
    waveId: "wave-cloud-1",
    surveyId: survey.id,
    inviteToken: "token-valido",
    answers: survey.items.map((item) => ({ itemId: item.id, value: firstValue })),
  };
}

afterEach(() => {
  mockBoundary.mockImplementation(() => ({
    requestedMode: "demo",
    state: "demo",
    realAuthentication: false,
    serverEnforced: false,
    reason: "demo_isolated",
  }));
  saveWaveResponseResult = { accepted: true, responseCount: 6 };
  lastSaveWaveResponseInput = null;
});

function setCloudBoundary() {
  mockBoundary.mockImplementation(() => ({
    requestedMode: "cloud",
    state: "cloud",
    realAuthentication: true,
    serverEnforced: true,
    reason: "cloud_ready",
  }));
}

describe("server response capture boundary — demo (inalterado)", () => {
  test("demo validates on the server and returns a content-free ephemeral receipt", async () => {
    const result = await captureSurveySubmission(validInput(), "2026-06-19T12:00:00.000Z");

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.receipt.persistence).toBe("ephemeral_demo");
    expect(result.receipt.persisted).toBe(false);
    expect(result.receipt.contentReturned).toBe(false);
    expect(JSON.stringify(result)).not.toContain('"answers"');
  });

  test("wrong wave or survey fails without a receipt", async () => {
    const wrongWave = await captureSurveySubmission({ ...validInput(), waveId: "other" });
    const wrongSurvey = await captureSurveySubmission({ ...validInput(), surveyId: "other" });

    expect(wrongWave.accepted).toBe(false);
    expect(wrongSurvey.accepted).toBe(false);
    if (wrongWave.accepted || wrongSurvey.accepted) return;
    expect(wrongWave.reason).toBe("unknown_wave");
    expect(wrongSurvey.reason).toBe("unknown_survey");
  });

  test("cloud request without inviteToken returns cloud_adapter_missing", async () => {
    setCloudBoundary();
    const result = await captureSurveySubmission(validInput()); // sem inviteToken
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.reason).toBe("cloud_adapter_missing");
  });
});

describe("server response capture boundary — cloud (P0-06/P0-07)", () => {
  test("submissão válida: resolve o instrumento REAL da onda, valida e persiste via RPC atômica", async () => {
    setCloudBoundary();
    const result = await captureSurveySubmission(validCloudInput(), "2026-07-03T10:00:00.000Z");

    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.receipt.persistence).toBe("cloud_persisted");
    expect(result.receipt.persisted).toBe(true);
    // saveWaveResponse recebeu as respostas NORMALIZADAS pelo validador puro,
    // não o array bruto do cliente — prova que a validação roda antes do RPC.
    expect(lastSaveWaveResponseInput).toMatchObject({
      waveId: "wave-cloud-1",
      inviteToken: "token-valido",
    });
  });

  test("token pertence a OUTRA onda (P0-06): recusado como unknown_wave ANTES de chamar a RPC de escrita", async () => {
    setCloudBoundary();
    const result = await captureSurveySubmission({
      ...validCloudInput(),
      inviteToken: "token-onda-errada",
    });

    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.reason).toBe("unknown_wave");
    expect(lastSaveWaveResponseInput).toBeNull(); // nunca chegou a tentar escrever
  });

  test("token sem onda associada (dado corrompido/inexistente): unknown_wave, nunca escreve", async () => {
    setCloudBoundary();
    const result = await captureSurveySubmission({
      ...validCloudInput(),
      inviteToken: "token-sem-onda",
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.reason).toBe("unknown_wave");
    expect(lastSaveWaveResponseInput).toBeNull();
  });

  test("token totalmente desconhecido: unknown_wave", async () => {
    setCloudBoundary();
    const result = await captureSurveySubmission({
      ...validCloudInput(),
      inviteToken: "token-fantasma",
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.reason).toBe("unknown_wave");
  });

  test("item inventado (fora do instrumento real): item_set_mismatch — validador roda no Cloud (P0-07)", async () => {
    setCloudBoundary();
    const input = validCloudInput();
    const result = await captureSurveySubmission({
      ...input,
      answers: [...input.answers, { itemId: "item_inventado_pelo_atacante", value: 1 }],
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.reason).toBe("item_set_mismatch");
    expect(lastSaveWaveResponseInput).toBeNull();
  });

  test("valor fora da escala do instrumento: invalid_value — recusado antes de persistir", async () => {
    setCloudBoundary();
    const input = validCloudInput();
    const result = await captureSurveySubmission({
      ...input,
      answers: input.answers.map((a, i) => (i === 0 ? { ...a, value: 999 } : a)),
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.reason).toBe("invalid_value");
    expect(lastSaveWaveResponseInput).toBeNull();
  });

  test("item duplicado no envio: duplicate_item", async () => {
    setCloudBoundary();
    const input = validCloudInput();
    const result = await captureSurveySubmission({
      ...input,
      answers: [...input.answers, input.answers[0]!],
    });
    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.reason).toBe("duplicate_item");
  });

  test("RPC retorna already_used (2ª tentativa com o mesmo token): propaga o motivo exato", async () => {
    setCloudBoundary();
    saveWaveResponseResult = { accepted: false, reason: "already_used" };
    const result = await captureSurveySubmission(validCloudInput());
    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.reason).toBe("already_used");
  });

  test("RPC retorna wave_not_open (onda selada entre carregar a tela e enviar): propaga o motivo exato", async () => {
    setCloudBoundary();
    saveWaveResponseResult = { accepted: false, reason: "wave_not_open" };
    const result = await captureSurveySubmission(validCloudInput());
    expect(result.accepted).toBe(false);
    if (result.accepted) return;
    expect(result.reason).toBe("wave_not_open");
  });

  test("nunca vaza o conteúdo das respostas no resultado, nem em sucesso nem em recusa", async () => {
    setCloudBoundary();
    const ok = await captureSurveySubmission(validCloudInput());
    expect(JSON.stringify(ok)).not.toContain('"answers"');

    const rejected = await captureSurveySubmission({
      ...validCloudInput(),
      inviteToken: "token-onda-errada",
    });
    expect(JSON.stringify(rejected)).not.toContain('"answers"');
  });
});
