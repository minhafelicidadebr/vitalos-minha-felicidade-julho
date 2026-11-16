import { describe, expect, test } from "bun:test";
import { getFactorContentById } from "@/domain/ivo/factor-content";
import { LOCAL_Q2_EDUCATION_ENV } from "@/test/fixtures/q2-learning";
import {
  isEducationContentAvailable,
  resolveEducationAvailability,
} from "./education-availability.server";
import type { GovernanceGateEnv } from "./ivo-governance-gate.server";

const approved = getFactorContentById("Q2-bem_estar-aprendizagem-equipe-001")!;

describe("escopo D10 local · leitura e escritas usam a mesma decisão", () => {
  test("aprovação canônica disponível em local completo, com TESTE desligado", () => {
    const available = resolveEducationAvailability({
      educationEnv: LOCAL_Q2_EDUCATION_ENV,
      testContent: false,
    });
    expect(available).toEqual({ local: true, testVisible: false });
    expect(isEducationContentAvailable(approved, available)).toBe(true);
    expect(
      isEducationContentAvailable(getFactorContentById("TESTE-bem_estar-001"), available),
    ).toBe(false);
  });

  const blocked: Array<[string, GovernanceGateEnv]> = [
    ["sem configuração", {}],
    ["runtime staging", { ...LOCAL_Q2_EDUCATION_ENV, VITALOS_RUNTIME_ENV: "staging" }],
    ["banco remoto declarado", { ...LOCAL_Q2_EDUCATION_ENV, VITALOS_DB_TARGET: "staging" }],
    [
      "endpoint servidor remoto",
      { ...LOCAL_Q2_EDUCATION_ENV, SUPABASE_URL: "https://example.invalid" },
    ],
    [
      "endpoint cliente remoto",
      { ...LOCAL_Q2_EDUCATION_ENV, VITE_SUPABASE_URL: "https://example.invalid" },
    ],
    ["endpoint ausente", { ...LOCAL_Q2_EDUCATION_ENV, SUPABASE_URL: undefined }],
    ["declaração HML no cliente", { ...LOCAL_Q2_EDUCATION_ENV, VITE_FIBT_HML_ENABLED: "true" }],
    [
      "declaração HML no servidor",
      { ...LOCAL_Q2_EDUCATION_ENV, FIBT_HML_DEPLOYMENT_ENABLED: "true" },
    ],
  ];
  test.each(blocked)("%s recusa aprovado mesmo com flag TESTE ligada", (_label, env) => {
    const available = resolveEducationAvailability({ educationEnv: env, testContent: true });
    expect(available.local).toBe(false);
    expect(isEducationContentAvailable(approved, available)).toBe(false);
  });

  test("proposta, ausente ou aprovação sem escopo não se tornam disponíveis", () => {
    const local = resolveEducationAvailability({ educationEnv: LOCAL_Q2_EDUCATION_ENV });
    expect(isEducationContentAvailable(undefined, local)).toBe(false);
    expect(isEducationContentAvailable({ ...approved, status: "PROPOSTO" }, local)).toBe(false);
    expect(
      isEducationContentAvailable(
        { ...approved, curation: { ...approved.curation!, approval: null } },
        local,
      ),
    ).toBe(false);
  });
});
