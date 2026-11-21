import { describe, expect, test } from "bun:test";
import { CAPABILITY_REGISTRY } from "./registry";
import { resolveServerCapability, type LocalFixtureEnv } from "./local-fixture-capabilities.server";

const LOCAL: LocalFixtureEnv = {
  VITALOS_RUNTIME_ENV: "local",
  VITALOS_DB_TARGET: "local",
  SUPABASE_URL: "http://127.0.0.1:55421",
  VITE_SUPABASE_URL: "http://127.0.0.1:55421",
  VITALOS_LOCAL_FIXTURE_CAPABILITIES: "ACTION_PLAN",
};

describe("capabilities em fixture local controlada", () => {
  test("o registro global continua com ACTION_PLAN desligado", () => {
    expect(CAPABILITY_REGISTRY.ACTION_PLAN.enabled).toBe(false);
    expect(resolveServerCapability("ACTION_PLAN", {})).toEqual({ enabled: false, reason: "registry_disabled" });
  });

  test("liga ACTION_PLAN só com runtime local, banco local loopback e pedido explícito", () => {
    expect(resolveServerCapability("ACTION_PLAN", LOCAL)).toEqual({ enabled: true, source: "local_fixture" });
  });

  test("qualquer condição ausente mantém desligado", () => {
    const cases: Array<[Partial<LocalFixtureEnv>, string]> = [
      [{ VITALOS_LOCAL_FIXTURE_CAPABILITIES: undefined }, "registry_disabled"],
      [{ VITALOS_RUNTIME_ENV: "preview" }, "not_local_runtime"],
      [{ VITALOS_DB_TARGET: "staging" }, "not_local_runtime"],
      [{ SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co" }, "non_loopback_database"],
      [{ VITE_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co" }, "non_loopback_database"],
      [{ SUPABASE_URL: undefined }, "non_loopback_database"],
      [{ VITE_FIBT_HML_ENABLED: "true" }, "hml_declared"],
      [{ FIBT_HML_DEPLOYMENT_ENABLED: "true" }, "hml_declared"],
    ];
    for (const [override, reason] of cases) {
      expect(resolveServerCapability("ACTION_PLAN", { ...LOCAL, ...override })).toEqual({
        enabled: false,
        reason: reason as never,
      });
    }
  });

  test("só a lista fechada pode virar fixture: SURVEY_TELEMETRY nunca", () => {
    expect(
      resolveServerCapability("SURVEY_TELEMETRY", { ...LOCAL, VITALOS_LOCAL_FIXTURE_CAPABILITIES: "SURVEY_TELEMETRY" }),
    ).toEqual({ enabled: false, reason: "not_fixture_capability" });
  });
});
