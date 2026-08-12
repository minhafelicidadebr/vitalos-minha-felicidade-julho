import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

const migrationPath =
  "supabase/migrations/20260811120000_fail_closed_sector_response_cohort_binding.sql";
const rollbackPath =
  "scripts/fibt-hml/rollback/20260811120000_fail_closed_sector_response_cohort_binding.rollback.sql";
const priorPath = "supabase/migrations/20260807120000_sector_response_consent_durability.sql";
const analyticsPath = "supabase/migrations/20260730155000_cohort_aggregate_privacy_hardening.sql";

const migration = read(migrationPath);
const rollback = read(rollbackPath);
const prior = read(priorPath);
const analytics = read(analyticsPath);

function canonicalFunction(
  sql: string,
  createPrefix: "CREATE FUNCTION" | "CREATE OR REPLACE FUNCTION",
) {
  const signature = `${createPrefix} public.submit_sector_response(\n  p_token_hash      TEXT,\n  p_answers         JSONB,\n  p_consent_version TEXT`;
  const start = sql.indexOf(signature);
  expect(start).toBeGreaterThan(-1);
  const end = sql.indexOf("$function$;", start);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end + "$function$;".length);
}

function functionBody(sql: string) {
  const start = sql.indexOf("DECLARE\n", sql.indexOf("p_consent_version TEXT"));
  const end = sql.indexOf("$function$;", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
}

function withoutStoredFunctionBody(sql: string) {
  return sql.replace(/\$function\$[\s\S]*?\$function\$/g, "$function$BODY$function$");
}

describe("sector response cohort-binding structural migration", () => {
  const rpc = canonicalFunction(migration, "CREATE OR REPLACE FUNCTION");

  test("is transactional and replaces only the canonical three-argument RPC", () => {
    expect(migration).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(
      migration.match(/CREATE OR REPLACE FUNCTION public\.submit_sector_response/g),
    ).toHaveLength(1);
    expect(migration).not.toMatch(/\bCREATE\s+TABLE\b|\bALTER\s+TABLE\b|\bDROP\s+TABLE\b/i);
    expect(migration).not.toMatch(/\bUPDATE\s+public\.|\bDELETE\s+FROM\s+public\.|\bTRUNCATE\b/i);
  });

  test("contains no HML fixture identity or synthetic cohort mutation", () => {
    expect(migration).not.toContain("TESTE-ISG-A");
    expect(migration).not.toContain("TESTE-ISG-B");
    expect(migration).not.toContain("VALIDACAO FIB-T");
    expect(migration).not.toContain("VALIDACAO CONTROLADA 2026");
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.wave_cohorts/i);
  });

  test("preserves signature, result, SECURITY DEFINER, search_path, owner and ACL", () => {
    expect(rpc).toContain("RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)");
    expect(rpc).toContain("LANGUAGE plpgsql SECURITY DEFINER SET search_path = public");
    expect(migration).toContain("fibt.cohort_binding_owner_before");
    expect(migration).toContain("fibt.cohort_binding_acl_before");
    expect(migration).toContain("canonical RPC owner changed");
    expect(migration).toContain("canonical RPC ACL changed");
    expect(migration).not.toMatch(/^\s*(GRANT|REVOKE)\b/im);
  });

  test("A/B share the same exact binding rule and persist its resolved cohort_id", () => {
    expect(rpc).toMatch(
      /SELECT c\.id INTO STRICT v_cohort_id[\s\S]*c\.wave_id = v_link\.wave_id[\s\S]*c\.org_id = v_link\.org_id[\s\S]*c\.key = v_link\.sector_label/,
    );
    expect(rpc).toMatch(
      /INSERT INTO public\.wave_responses \([\s\S]*cohort_id,[\s\S]*\) VALUES \([\s\S]*v_cohort_id,/,
    );
    expect(rpc.indexOf("INTO STRICT v_cohort_id")).toBeLessThan(
      rpc.indexOf("INSERT INTO public.wave_responses"),
    );
  });

  test("missing, ambiguous and unmatched sector labels fail before INSERT", () => {
    expect(rpc).toContain("WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN");
    expect(rpc).toContain("RETURN QUERY SELECT FALSE, 'cohort_binding_invalid'::TEXT, 0");
    expect(rpc.indexOf("cohort_binding_invalid")).toBeLessThan(
      rpc.indexOf("INSERT INTO public.wave_responses"),
    );
  });

  test("wave identity is bound to the sector-link organization and fails closed", () => {
    expect(rpc).toMatch(
      /FROM public\.waves[\s\S]*id = v_link\.wave_id[\s\S]*org_id = v_link\.org_id/,
    );
    expect(rpc).toContain("RETURN QUERY SELECT FALSE, 'wave_not_open'::TEXT, 0");
  });

  test("failed binding cannot increment count or return accepted=true", () => {
    const failure = rpc.indexOf("cohort_binding_invalid");
    const insert = rpc.indexOf("INSERT INTO public.wave_responses");
    const count = rpc.indexOf("SELECT COUNT(*) INTO v_count");
    const accepted = rpc.indexOf("RETURN QUERY SELECT TRUE");
    expect(failure).toBeGreaterThan(-1);
    expect(failure).toBeLessThan(insert);
    expect(insert).toBeLessThan(count);
    expect(count).toBeLessThan(accepted);
  });

  test("durable consent and anonymous persistence remain unchanged", () => {
    expect(rpc).toContain("BTRIM(p_consent_version) <> '2026.1'");
    expect(rpc).toContain("consent_version");
    expect(rpc).toContain("consent_accepted_at");
    expect(rpc).toContain("statement_timestamp()");
    expect(rpc).not.toMatch(/\binvite_token\b|\bemail\b|\buser_id\b|\bprofile_id\b/);
  });
});

describe("cohort analytics privacy contract", () => {
  test("aggregate and operational count include only exact wave/cohort matches", () => {
    expect(analytics.match(/WHERE wave_id = p_wave_id AND cohort_id = p_cohort_id/g)).toHaveLength(
      2,
    );
    expect(analytics).toMatch(/WHERE r\.wave_id = p_wave_id AND r\.cohort_id = p_cohort_id/);
  });

  test("historical cohort_id NULL stays excluded by SQL equality semantics", () => {
    expect(analytics).not.toMatch(/cohort_id\s+IS\s+NULL/i);
    expect(migration).not.toMatch(/\bUPDATE\s+public\.wave_responses\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\s+public\.wave_responses\b/i);
  });

  test("k_min=5 and individual-response suppression remain intact", () => {
    expect(analytics).toContain("v_k     CONSTANT INTEGER := 5");
    expect(analytics).toContain("IF v_n < v_k THEN");
    expect(analytics).toContain("NULL::JSONB, NULL::JSONB, NULL::JSONB");
    expect(analytics).toContain("'privacy_threshold'::TEXT");
  });
});

describe("cohort-binding rollback custody", () => {
  test("rollback is outside migrations, transactional and has no data mutation", () => {
    const appliedStatements = withoutStoredFunctionBody(rollback);
    expect(rollback).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(rollback.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(appliedStatements).not.toMatch(
      /\bUPDATE\s+public\.|\bDELETE\s+FROM\s+public\.|\bTRUNCATE\b|\bINSERT\s+INTO\b/i,
    );
  });

  test("rollback restores the prior executable function body exactly", () => {
    expect(functionBody(rollback)).toBe(functionBody(prior));
  });

  test("rollback refuses unexpected state and preserves owner/ACL", () => {
    expect(rollback).toContain("installed RPC is not the expected cohort-binding hardening");
    expect(rollback).toContain("fibt.cohort_binding_rollback_owner");
    expect(rollback).toContain("fibt.cohort_binding_rollback_acl");
    expect(rollback).not.toMatch(/^\s*(GRANT|REVOKE)\b/im);
  });
});
