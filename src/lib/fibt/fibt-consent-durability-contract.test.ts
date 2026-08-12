import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeSectorResponseConsentVersion,
  SECTOR_RESPONSE_CONSENT_VERSION,
  SECTOR_RESPONSE_CONSENT_VERSION_MAX_LENGTH,
} from "@/domain/survey/sector-response-consent";

const root = join(import.meta.dir, "..", "..", "..");
const migrationName = "20260807120000_sector_response_consent_durability.sql";
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
const migration = read(`supabase/migrations/${migrationName}`);

function functionBody(signature: string): string {
  const start = migration.indexOf(signature);
  expect(start).toBeGreaterThan(-1);
  const end = migration.indexOf("$function$;", start);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("Wave 2.1 — trace canônico do consentimento", () => {
  test("a versão apresentada nasce em configuração única e só entra no submit após aceite", () => {
    const route = read("src/routes/respond.s.$token.tsx");
    expect(SECTOR_RESPONSE_CONSENT_VERSION).toBe("2026.1");
    expect(route).toContain("setAcceptedConsentVersion(SECTOR_RESPONSE_CONSENT_VERSION)");
    expect(route).toContain("!acceptedConsentVersion");
    expect(route).toContain("consentVersion: acceptedConsentVersion");
    expect(route).not.toContain("O servidor valida e descarta o conteúdo");
    expect(route).toContain("Gestores acessam somente agregados com no mínimo 5 participantes");
  });

  test("API e servidor rejeitam versão vazia/longa e normalizam espaços", () => {
    const api = read("src/lib/api/sector-link.functions.ts");
    const server = read("src/lib/survey/sector-link.server.ts");
    expect(api).toContain("z.literal(SECTOR_RESPONSE_CONSENT_VERSION)");
    expect(server).toContain("normalizeSectorResponseConsentVersion(input.consentVersion)");
    expect(server).toContain("p_consent_version: consentVersion");

    expect(normalizeSectorResponseConsentVersion(undefined)).toBeNull();
    expect(normalizeSectorResponseConsentVersion("   ")).toBeNull();
    expect(normalizeSectorResponseConsentVersion("2025.9")).toBeNull();
    expect(normalizeSectorResponseConsentVersion("x".repeat(SECTOR_RESPONSE_CONSENT_VERSION_MAX_LENGTH + 1))).toBeNull();
    expect(normalizeSectorResponseConsentVersion(" 2026.1 ")).toBe("2026.1");
  });
});

describe("Wave 2.1 — contrato SQL durável e atômico", () => {
  const legacy = functionBody(
    "CREATE OR REPLACE FUNCTION public.submit_sector_response(\n  p_token_hash TEXT,\n  p_answers    JSONB",
  );
  const current = functionBody(
    "CREATE FUNCTION public.submit_sector_response(\n  p_token_hash      TEXT,\n  p_answers         JSONB,\n  p_consent_version TEXT",
  );

  test("migration é transacional, aditiva e preserva dados existentes", () => {
    expect(migration).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(migration).toContain("ADD COLUMN consent_version TEXT");
    expect(migration).toContain("ADD COLUMN consent_accepted_at TIMESTAMPTZ");
    expect(migration).not.toMatch(/\bUPDATE\s+public\.wave_responses\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\s+public\.wave_responses\b/i);
    expect(migration).not.toMatch(/\bTRUNCATE\b/i);
  });

  test("ausência de consentimento permanece fail-closed durante rollout", () => {
    expect(legacy).toContain("'invalid_consent_version'");
    expect(legacy).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(legacy).not.toContain("wave_responses");
    expect(current).toMatch(/p_consent_version IS NULL[\s\S]*BTRIM\(p_consent_version\) = ''/);
    expect(current).toContain("CHAR_LENGTH(BTRIM(p_consent_version)) > 20");
    expect(current).toContain("BTRIM(p_consent_version) <> '2026.1'");
  });

  test("versão, horário do banco e contexto da wave são persistidos juntos", () => {
    expect(current).toMatch(
      /INSERT INTO public\.wave_responses \([\s\S]*consent_version,[\s\S]*consent_accepted_at[\s\S]*\) VALUES \(/,
    );
    expect(current).toContain("BTRIM(p_consent_version)");
    expect(current).toContain("statement_timestamp()");
    expect(current).toContain("v_link.wave_id");
    expect(current).not.toContain("p_wave_id");
    expect(migration).toContain("wave_responses_consent_evidence_pair_chk");
  });

  test("RPC conserva SECURITY DEFINER/search_path e ACL anônima mínima", () => {
    expect(current).toContain("LANGUAGE plpgsql SECURITY DEFINER SET search_path = public");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.submit_sector_response(TEXT, JSONB, TEXT) FROM PUBLIC, authenticated",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.submit_sector_response(TEXT, JSONB, TEXT) TO anon, service_role",
    );
  });
});

describe("Wave 2.1 — fronteira de privacidade", () => {
  test("evidência não reintroduz identidade, convite ou FK proibida", () => {
    const current = functionBody(
      "CREATE FUNCTION public.submit_sector_response(\n  p_token_hash      TEXT,\n  p_answers         JSONB,\n  p_consent_version TEXT",
    );
    expect(current).not.toMatch(/\binvite_token\b|\bemail\b|\buser_id\b|\bprofile_id\b/);
    expect(migration).not.toMatch(/ADD\s+(?:COLUMN\s+)?invite_token/i);
    expect(migration).not.toMatch(/REFERENCES\s+public\.wave_invites/i);
    expect(migration).not.toMatch(/CREATE\s+TABLE/i);
  });

  test("tipos refletem somente evidência nullable e a nova assinatura", () => {
    const types = read("src/integrations/supabase/types.ts");
    const responses = types.slice(types.indexOf("wave_responses:"), types.indexOf("waves:", types.indexOf("wave_responses:")));
    expect(responses).toContain("consent_version: string | null");
    expect(responses).toContain("consent_accepted_at: string | null");
    expect(responses).not.toContain("invite_token");
    expect(types).toContain(
      "Args: { p_answers: Json; p_consent_version: string; p_token_hash: string }",
    );
  });

  test("caminho demo continua efêmero; somente cloud invoca a RPC", () => {
    const server = read("src/lib/survey/sector-link.server.ts");
    expect(server).toContain('"cloud_persisted"');
    expect(server).toContain('"ephemeral_demo"');
    expect(server.indexOf('admin.rpc("submit_sector_response"')).toBeGreaterThan(
      server.indexOf('if (boundary.state === "cloud")'),
    );
  });
});
