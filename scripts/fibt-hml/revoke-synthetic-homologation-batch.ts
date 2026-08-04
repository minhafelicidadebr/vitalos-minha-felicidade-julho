#!/usr/bin/env bun
/**
 * FIBT-HML-1D (Fase 13) — revogação operacional do lote sintético
 * FIBT-ISG-HML-01. Contrato completo, dry-run por padrão, nunca criado nem
 * autorizado a rodar --commit nesta rodada — igual ao gerador
 * (create-synthetic-homologation-links.ts), do qual reaproveita os mesmos
 * guardrails (requireStagingTarget, forbiddenRefs, batch_id exato).
 *
 * Revoga SOMENTE convites ainda não usados do lote sintético, marcando
 * `expires_at = NOW()` (mesmo mecanismo já documentado em
 * HML_RAW_TOKEN_STAGING_EXCEPTION — nunca DELETE, nunca em produção).
 *
 * Uso (dry-run, sem tocar nada):
 *   bun run scripts/fibt-hml/revoke-synthetic-homologation-batch.ts \
 *     --environment=staging \
 *     --expected-project-ref=<ref-staging> \
 *     --batch-id=FIBT-ISG-HML-01 \
 *     --confirm-revocation \
 *     --dry-run
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { forbiddenRefs, maskRef } from "../../src/lib/staging/staging-guard";
import { HML_BATCH_ID, HML_ORGANIZATION, HML_WAVE } from "../../src/lib/fibt-hml/hml-contract";
import { PRIVATE_OUTPUT_DIR } from "./create-synthetic-homologation-links";

function configuredStagingRef(env: Record<string, string | undefined>): string | undefined {
  return env.FIBT_HML_AUTHORIZED_STAGING_REF?.trim() || undefined;
}

export class RevokeError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "RevokeError";
  }
}

function fail(code: string, message: string): never {
  throw new RevokeError(code, message);
}

const RECOGNIZED_FLAGS = new Set([
  "--environment",
  "--expected-project-ref",
  "--batch-id",
  "--confirm-revocation",
  "--dry-run",
  "--commit",
]);

export interface RevokeParsedArgs {
  environment: string;
  expectedProjectRef: string;
  batchId: string;
  confirmed: true;
  commit: boolean;
}

/** Mesmas regras de recusa do gerador (Fase 1/12 lá): produção nunca aceita,
 *  ref desconhecido recusado quando o staging autorizado já foi declarado,
 *  batch_id precisa ser exatamente o desta campanha — nada é genérico. */
export function parseRevokeArgs(
  argv: string[],
  env: Record<string, string | undefined> = process.env,
): RevokeParsedArgs {
  const map = new Map<string, string | true>();
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const eq = raw.indexOf("=");
    if (eq === -1) map.set(raw, true);
    else map.set(raw.slice(0, eq), raw.slice(eq + 1));
  }

  for (const flag of map.keys()) {
    if (!RECOGNIZED_FLAGS.has(flag)) fail("UNEXPECTED_PARAM", `parâmetro não reconhecido: ${flag}`);
  }

  function required(flag: string): string {
    const v = map.get(flag);
    if (v === undefined) fail("MISSING_PARAM", `parâmetro obrigatório ausente: ${flag}`);
    if (v === true) fail("MISSING_PARAM", `parâmetro ${flag} precisa de um valor (--flag=valor)`);
    return v;
  }

  const environment = required("--environment");
  if (environment !== "staging") {
    fail("INVALID_ENVIRONMENT", `--environment deve ser exatamente "staging", recebido "${environment}"`);
  }

  const expectedProjectRef = required("--expected-project-ref");
  const forbidden = forbiddenRefs(env);
  if (forbidden.has(expectedProjectRef)) {
    fail(
      "INVALID_PROJECT_REF",
      `RECUSADO: --expected-project-ref (${maskRef(expectedProjectRef)}) coincide com produção. Nenhuma operação permitida.`,
    );
  }
  const stagingRef = configuredStagingRef(env);
  if (stagingRef && expectedProjectRef !== stagingRef) {
    fail(
      "INVALID_PROJECT_REF",
      `RECUSADO: --expected-project-ref (${maskRef(expectedProjectRef)}) não bate com FIBT_HML_AUTHORIZED_STAGING_REF (${maskRef(stagingRef)}).`,
    );
  }

  const batchId = required("--batch-id");
  if (batchId !== HML_BATCH_ID) {
    fail("INVALID_BATCH_ID", `este script só revoga a campanha ${HML_BATCH_ID} — "${batchId}" não é reconhecido.`);
  }

  if (map.get("--confirm-revocation") !== true) {
    fail("MISSING_CONFIRMATION", "--confirm-revocation é obrigatório e não aceita valor");
  }

  const commit = map.get("--commit") === true;
  const dryRunFlag = map.get("--dry-run") === true;
  if (commit && dryRunFlag) fail("CONFLICTING_MODE", "--dry-run e --commit são mutuamente exclusivos");

  return { environment, expectedProjectRef, batchId, confirmed: true, commit };
}

export interface RevokePlan {
  batchId: string;
  environment: string;
  projectRefMasked: string;
  organizationSlug: string;
  waveLabel: string;
}

export function planRevocation(args: RevokeParsedArgs): RevokePlan {
  return {
    batchId: args.batchId,
    environment: args.environment,
    projectRefMasked: maskRef(args.expectedProjectRef),
    organizationSlug: HML_ORGANIZATION.slug,
    waveLabel: HML_WAVE.label,
  };
}

// ─── Caminho --commit — testável via injeção, nunca invocado nesta rodada ──

export interface RevokeAdminClientLike {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): Promise<{ data: unknown; error: unknown }> };
    };
    update(values: unknown): {
      eq(column: string, value: string): {
        is(column: string, value: null): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
  };
}

export interface RevokeManifestRow {
  batch_id: string;
  organization_slug: string;
  wave_id: string;
  revoked_at: string;
  revoked_count: number;
}

export type RevokeOutcome =
  | { status: "ORGANIZATION_NOT_FOUND" }
  | { status: "REVOKED"; waveId: string; revokedCount: number; manifestRow: RevokeManifestRow };

/**
 * Revoga (expires_at = NOW()) somente convites AINDA NÃO USADOS
 * (used_at IS NULL) do lote sintético — nunca DELETE, nunca em resposta já
 * submetida, nunca em organização/onda/coorte (essas nunca são apagadas).
 * NÃO EXECUTADO NESTA AUTORIZAÇÃO.
 */
export async function runRevoke(plan: RevokePlan, admin: RevokeAdminClientLike): Promise<RevokeOutcome> {
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", plan.organizationSlug)
    .maybeSingle();
  if (!org) return { status: "ORGANIZATION_NOT_FOUND" };

  const organizationId = (org as { id: string }).id;
  const { data: wave } = await admin
    .from("waves")
    .select("id")
    .eq("org_id", organizationId)
    .maybeSingle();
  if (!wave) return { status: "ORGANIZATION_NOT_FOUND" };

  const waveId = (wave as { id: string }).id;
  const nowIso = new Date().toISOString();

  const { data: updated, error } = await admin
    .from("wave_invites")
    .update({ expires_at: nowIso })
    .eq("wave_id", waveId)
    .is("used_at", null);

  if (error) throw new Error(`falha ao revogar convites: ${error.message}`);

  const revokedCount = updated?.length ?? 0;
  return {
    status: "REVOKED",
    waveId,
    revokedCount,
    manifestRow: {
      batch_id: plan.batchId,
      organization_slug: plan.organizationSlug,
      wave_id: waveId,
      revoked_at: nowIso,
      revoked_count: revokedCount,
    },
  };
}

export function writeRevocationManifest(row: RevokeManifestRow): { manifestPath: string } {
  mkdirSync(PRIVATE_OUTPUT_DIR, { recursive: true });
  const manifestPath = join(PRIVATE_OUTPUT_DIR, `${row.batch_id.toLowerCase()}-revocation-manifest.json`);
  writeFileSync(manifestPath, JSON.stringify(row, null, 2), "utf8");
  return { manifestPath };
}

// ============================================================================
// Casca CLI
// ============================================================================
if (import.meta.main) {
  let args: RevokeParsedArgs;
  try {
    args = parseRevokeArgs(process.argv.slice(2));
  } catch (e) {
    if (e instanceof RevokeError) {
      console.error(`REVOKE_ABORTED (${e.code}): ${e.message}`);
      process.exit(1);
    }
    throw e;
  }

  const plan = planRevocation(args);
  console.log("=== FIBT-HML-1D — plano de revogação (nenhum convite alterado ainda) ===");
  console.log(JSON.stringify(plan, null, 2));

  if (!args.commit) {
    console.log("\n--- DRY RUN: nenhuma conexão remota foi aberta, nenhum convite foi alterado. ---");
    process.exit(0);
  }

  const { requireStagingTarget } = await import("../../src/lib/staging/staging-guard");
  const target = requireStagingTarget();
  if (target.projectRef !== args.expectedProjectRef) {
    console.error(
      `REVOKE_ABORTED (INVALID_PROJECT_REF): staging resolvido (${target.maskedRef}) diverge de --expected-project-ref.`,
    );
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(target.url, target.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const outcome = await runRevoke(plan, admin as unknown as RevokeAdminClientLike);
  if (outcome.status === "ORGANIZATION_NOT_FOUND") {
    console.log("ORGANIZATION_NOT_FOUND — nada para revogar.");
    process.exit(0);
  }

  const written = writeRevocationManifest(outcome.manifestRow);
  console.log(`\nREVOKED — ${outcome.revokedCount} convite(s) não usados marcados como expirados.`);
  console.log(`  manifest: ${written.manifestPath}`);
}
