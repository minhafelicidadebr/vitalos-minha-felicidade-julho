#!/usr/bin/env bun
/**
 * FIBT-HML-1 — gerador do lote de homologação assistida sintética da ISG.
 *
 * Prepara (e, só com --commit, cria) UMA onda "FIB-T Pré-Teste Sintético 01"
 * numa organização sintética nova, com dois convites individuais de uso
 * único (LINK_INDIVIDUAL_SINGLE_USE) agrupados em duas coortes:
 *   Alfa — 6 convites (agregado visível quando n=6 ≥ k_min=5)
 *   Beta — 4 convites (agregado suprimido quando n=4 < k_min=5)
 *
 * Mecanismo reaproveitado do código canônico já existente:
 *   - contrato de convite individual: wave_invites (token bruto, DEFAULT
 *     encode(gen_random_bytes(24),'base64'), gerado PELO BANCO — nunca por
 *     este script) + RPC submit_wave_response (uso único via used_at) —
 *     ver src/lib/cloud/db-adapter.ts, src/routes/convite.$token.tsx.
 *   - coorte como entidade: wave_cohorts (migration
 *     20260730150000_generic_anonymous_submissions_expand.sql), k_min=5
 *     hardcoded em aggregate_cohort_responses.
 *   - guarda de ambiente: requireStagingTarget() de
 *     src/lib/staging/staging-guard.ts — MESMO mecanismo dos demais scripts
 *     de prova (fibt1-restore-invite-links.ts etc.), não reinventado aqui.
 *
 * createWaveWithAdmin (db-adapter.ts) NÃO suporta cohort_id no convite hoje —
 * por isso este é um script dedicado (prioridade 3 da autorização), não uma
 * chamada direta à função existente. Nenhuma tabela de aplicação é alterada.
 *
 * DRY-RUN é o padrão e NUNCA abre conexão remota: requireStagingTarget() (que
 * exige credenciais reais) só é chamado dentro do caminho --commit. Em
 * dry-run, o --expected-project-ref é validado por STRING PURA contra o ref
 * de produção (derivado de SUPABASE_URL, já público no .env versionado) —
 * zero I/O de rede.
 *
 * Uso (dry-run, sem tocar nada):
 *   bun run scripts/fibt-hml/create-synthetic-homologation-links.ts \
 *     --environment=staging \
 *     --expected-project-ref=<ref-staging> \
 *     --batch-id=FIBT-ISG-HML-01 \
 *     --alpha-count=6 --beta-count=4 --expires-in-days=7 \
 *     --confirm-synthetic-homologation \
 *     --dry-run
 */

import { createHash, randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { forbiddenRefs, maskRef } from "../../src/lib/staging/staging-guard";
import { FORBIDDEN_HML_BASE_HOSTNAMES } from "../../src/lib/fibt-hml/hml-frontend-guard";

/**
 * Ref de staging autorizado para esta campanha, SE declarado — lido de env a
 * cada chamada de parseArgs (nunca capturado em módulo, para que testes
 * possam declarar/limpar a variável por caso sem reimportar o módulo).
 *
 * Deliberadamente NÃO um literal fixado no código: este repositório já
 * pagou o custo desse padrão uma vez (ver o comentário histórico em
 * scripts-guard-coverage.test.ts — dois scripts antigos tinham cada um seu
 * próprio prefixo de ref fixado, e um teste estático existe hoje só para
 * caçar exatamente isso). Staging "varia por pessoa e ambiente"
 * (AMBIENTES_E_DEPLOY.md) — por isso nunca é versionado, nem em `.env`, nem
 * aqui. Quando a variável não está definida, este script só recusa o ref
 * PROIBIDO (produção, via forbiddenRefs) — a identidade exata do staging
 * autorizado continua sendo conferida de verdade em --commit, por
 * requireStagingTarget(), que compara contra a URL real (STAGING_SUPABASE_URL),
 * nunca contra um valor fixado em código.
 */
function configuredStagingRef(env: Record<string, string | undefined>): string | undefined {
  return env.FIBT_HML_AUTHORIZED_STAGING_REF?.trim() || undefined;
}

// ============================================================================
// Definição fixa da campanha — esta é a ÚNICA campanha que este script cria.
// Não é um gerador genérico multi-campanha: o batch-id é uma confirmação
// explícita de que o operador quer ESTA campanha, não um parâmetro livre.
// ============================================================================

export const CAMPAIGN = {
  batchId: "FIBT-ISG-HML-01",
  organizationName: "ISG — Homologação Assistida FIB-T",
  organizationSlug: "isg-homologacao-assistida-fibt-hml-01",
  waveLabel: "FIB-T Pré-Teste Sintético 01",
  instrument: "FIB_T" as const,
  instrumentVersion: "fibt-1.0.0",
  expiresInDays: 7,
  cohorts: {
    alpha: { key: "ISG-HML-ALFA", label: "Coorte Alfa", count: 6, linkPrefix: "ALFA" },
    beta: { key: "ISG-HML-BETA", label: "Coorte Beta", count: 4, linkPrefix: "BETA" },
  },
  kMin: 5,
} as const;

export const EXPECTED_TEST_LINK_IDS = [
  "ALFA-01", "ALFA-02", "ALFA-03", "ALFA-04", "ALFA-05", "ALFA-06",
  "BETA-01", "BETA-02", "BETA-03", "BETA-04",
] as const;

const RECOGNIZED_FLAGS = new Set([
  "--environment",
  "--expected-project-ref",
  "--batch-id",
  "--alpha-count",
  "--beta-count",
  "--expires-in-days",
  "--confirm-synthetic-homologation",
  "--accept-staging-raw-token-contract",
  "--dry-run",
  "--commit",
]);

/**
 * Decisão formal (FIBT-HML-1B, Fase 1): `wave_invites.token` é armazenado
 * BRUTO pelo contrato pré-existente da tabela (DEFAULT
 * encode(gen_random_bytes(24),'base64')), não hash — não alterado nesta
 * onda, sem migration. A exceção só vale enquanto TODAS as condições abaixo
 * forem verdadeiras; qualquer uma falsa e o lote não deveria ser criado.
 */
export const HML_RAW_TOKEN_STAGING_EXCEPTION = {
  decision: "HML_RAW_TOKEN_STAGING_EXCEPTION",
  conditions: [
    "ambiente = staging",
    "dados exclusivamente sintéticos",
    "zero nome, e-mail, matrícula ou PII",
    "uso único (wave_invites.used_at)",
    "expiração máxima de sete dias",
    "revogação disponível (UPDATE wave_invites SET expires_at = NOW() -- fora de escopo desta onda)",
    "frontend em HTTPS",
    "token nunca impresso no terminal",
    "token nunca incluído no manifest técnico",
    "links completos somente no CSV privado fora do Git",
    "produção explicitamente bloqueada",
    "lote identificado como homologação",
    "coleta real proibida",
  ],
} as const;

export class GeneratorError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "GeneratorError";
  }
}

function fail(code: string, message: string): never {
  throw new GeneratorError(code, message);
}

// ─── Parsing e validação de argumentos ────────────────────────────────────

export interface ParsedArgs {
  environment: string;
  expectedProjectRef: string;
  batchId: string;
  alphaCount: number;
  betaCount: number;
  expiresInDays: number;
  confirmed: true;
  commit: boolean;
  acceptedRawTokenContract: boolean;
}

/** Nenhum e-mail, nome pessoal ou dado real é aceito por design: todo campo
 * de identidade da campanha é uma constante fixa (CAMPAIGN, acima) — não há
 * parâmetro de CLI para nome de organização, onda ou pessoa. Os únicos
 * parâmetros são contagens, ambiente, ref e confirmação. */
export function parseArgs(
  argv: string[],
  env: Record<string, string | undefined> = process.env,
): ParsedArgs {
  const map = new Map<string, string | true>();
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const eq = raw.indexOf("=");
    if (eq === -1) {
      map.set(raw, true);
    } else {
      map.set(raw.slice(0, eq), raw.slice(eq + 1));
    }
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
      `RECUSADO: --expected-project-ref (${maskRef(expectedProjectRef)}) coincide com o projeto ` +
        "apontado pelas variáveis padrão do ambiente (produção). Nenhuma operação permitida.",
    );
  }
  const stagingRef = configuredStagingRef(env);
  if (stagingRef && expectedProjectRef !== stagingRef) {
    fail(
      "INVALID_PROJECT_REF",
      `RECUSADO: --expected-project-ref (${maskRef(expectedProjectRef)}) não bate com ` +
        `FIBT_HML_AUTHORIZED_STAGING_REF (${maskRef(stagingRef)}). Ref desconhecido, ` +
        "mesmo não sendo produção, é recusado quando o operador declarou qual staging esperar.",
    );
  }

  const batchId = required("--batch-id");
  if (batchId !== CAMPAIGN.batchId) {
    fail(
      "INVALID_BATCH_ID",
      `este script só cria a campanha ${CAMPAIGN.batchId} — "${batchId}" não é reconhecido. ` +
        "Não é um gerador genérico multi-campanha.",
    );
  }

  const alphaCount = Number(required("--alpha-count"));
  if (alphaCount !== CAMPAIGN.cohorts.alpha.count) {
    fail(
      "INVALID_ALPHA_COUNT",
      `--alpha-count deve ser exatamente ${CAMPAIGN.cohorts.alpha.count} para ${CAMPAIGN.batchId}, recebido ${alphaCount}`,
    );
  }

  const betaCount = Number(required("--beta-count"));
  if (betaCount !== CAMPAIGN.cohorts.beta.count) {
    fail(
      "INVALID_BETA_COUNT",
      `--beta-count deve ser exatamente ${CAMPAIGN.cohorts.beta.count} para ${CAMPAIGN.batchId}, recebido ${betaCount}`,
    );
  }

  const expiresInDays = Number(required("--expires-in-days"));
  if (expiresInDays !== CAMPAIGN.expiresInDays) {
    fail(
      "INVALID_EXPIRES_IN_DAYS",
      `--expires-in-days deve ser exatamente ${CAMPAIGN.expiresInDays}, recebido ${expiresInDays}`,
    );
  }

  if (map.get("--confirm-synthetic-homologation") !== true) {
    fail("MISSING_CONFIRMATION", "--confirm-synthetic-homologation é obrigatório e não aceita valor");
  }

  const commit = map.get("--commit") === true;
  const dryRunFlag = map.get("--dry-run") === true;
  if (commit && dryRunFlag) fail("CONFLICTING_MODE", "--dry-run e --commit são mutuamente exclusivos");
  // dry-run é o padrão: ausência de --commit é sempre dry-run, com ou sem a
  // flag --dry-run explícita.

  const acceptedRawTokenContract = map.get("--accept-staging-raw-token-contract") === true;
  // Só exigido em --commit (Fase 1) — dry-run nunca toca o banco, então a
  // exceção de contrato de token bruto não se aplica a ele. O parâmetro
  // NUNCA libera produção nem ref desconhecido: os dois já foram recusados
  // acima, antes desta linha, independentemente dele.
  if (commit && !acceptedRawTokenContract) {
    fail(
      "RAW_TOKEN_CONTRACT_NOT_ACKNOWLEDGED",
      "--commit exige --accept-staging-raw-token-contract — wave_invites.token é armazenado bruto " +
        "(contrato pré-existente da tabela); a exceção precisa ser reconhecida explicitamente. Ver HML_RAW_TOKEN_STAGING_EXCEPTION.",
    );
  }

  return {
    environment,
    expectedProjectRef,
    batchId,
    alphaCount,
    betaCount,
    expiresInDays,
    confirmed: true,
    commit,
    acceptedRawTokenContract,
  };
}

// ─── Plano estrutural — puro, determinístico, sem I/O ─────────────────────

export interface PlannedInvite {
  testLinkId: string;
  cohortKey: string;
  cohortLabel: string;
  relativePath: string; // "/convite/<placeholder>" — sem base URL (ver frontendBaseUrlStatus)
}

export interface BatchPlan {
  batchId: string;
  environment: string;
  projectRefMasked: string;
  organizationName: string;
  organizationSlug: string;
  waveLabel: string;
  instrument: string;
  instrumentVersion: string;
  expiresInDays: number;
  kMin: number;
  cohorts: { key: string; label: string; count: number }[];
  invites: PlannedInvite[];
  frontendBaseUrlStatus: "HML_FRONTEND_MISSING" | "HML_FRONTEND_READY";
}

/** Placeholder de token para dry-run — NUNCA aceito pelo backend real: o
 * prefixo não corresponde ao formato base64 de 24 bytes gerado pelo banco,
 * e nenhuma linha é inserida em wave_invites para ele existir de verdade. */
function dryRunPlaceholderToken(testLinkId: string): string {
  return `DRY_RUN_NOT_VALID_${testLinkId}_${randomBytes(6).toString("hex")}`;
}

export function planBatch(args: ParsedArgs): BatchPlan {
  const invites: PlannedInvite[] = [];
  for (let i = 1; i <= CAMPAIGN.cohorts.alpha.count; i++) {
    const testLinkId = `${CAMPAIGN.cohorts.alpha.linkPrefix}-${String(i).padStart(2, "0")}`;
    invites.push({
      testLinkId,
      cohortKey: CAMPAIGN.cohorts.alpha.key,
      cohortLabel: CAMPAIGN.cohorts.alpha.label,
      relativePath: `/convite/${dryRunPlaceholderToken(testLinkId)}`,
    });
  }
  for (let i = 1; i <= CAMPAIGN.cohorts.beta.count; i++) {
    const testLinkId = `${CAMPAIGN.cohorts.beta.linkPrefix}-${String(i).padStart(2, "0")}`;
    invites.push({
      testLinkId,
      cohortKey: CAMPAIGN.cohorts.beta.key,
      cohortLabel: CAMPAIGN.cohorts.beta.label,
      relativePath: `/convite/${dryRunPlaceholderToken(testLinkId)}`,
    });
  }

  return {
    batchId: args.batchId,
    environment: args.environment,
    projectRefMasked: maskRef(args.expectedProjectRef),
    organizationName: CAMPAIGN.organizationName,
    organizationSlug: CAMPAIGN.organizationSlug,
    waveLabel: CAMPAIGN.waveLabel,
    instrument: CAMPAIGN.instrument,
    instrumentVersion: CAMPAIGN.instrumentVersion,
    expiresInDays: args.expiresInDays,
    kMin: CAMPAIGN.kMin,
    cohorts: [
      { key: CAMPAIGN.cohorts.alpha.key, label: CAMPAIGN.cohorts.alpha.label, count: CAMPAIGN.cohorts.alpha.count },
      { key: CAMPAIGN.cohorts.beta.key, label: CAMPAIGN.cohorts.beta.label, count: CAMPAIGN.cohorts.beta.count },
    ],
    invites,
    // Nenhuma URL de frontend segura e verificável foi confirmada nesta
    // rodada (ver ENTREGA da autorização) — o plano nunca calcula URL final.
    frontendBaseUrlStatus: "HML_FRONTEND_MISSING",
  };
}

// ─── Fase 5 — validação da base URL de frontend de homologação ────────────

export type BaseUrlValidationFailure =
  | "HML_FRONTEND_BASE_URL_NOT_READY_MISSING"
  | "HML_FRONTEND_BASE_URL_NOT_READY_NOT_HTTPS"
  | "HML_FRONTEND_BASE_URL_NOT_READY_FORBIDDEN_HOSTNAME"
  | "HML_FRONTEND_BASE_URL_NOT_READY_HAS_QUERY"
  | "HML_FRONTEND_BASE_URL_NOT_READY_HAS_FRAGMENT"
  | "HML_FRONTEND_BASE_URL_NOT_READY_HAS_CREDENTIALS"
  | "HML_FRONTEND_BASE_URL_NOT_READY_UNPARSEABLE";

export type BaseUrlValidation =
  | { valid: true; normalizedBaseUrl: string }
  | { valid: false; failure: BaseUrlValidationFailure };

/**
 * Valida FIBT_HML_FRONTEND_BASE_URL (Fase 5): HTTPS, hostname não produtivo,
 * sem query/fragment/credenciais embutidas, path normalizado (raiz). Pura —
 * não faz I/O, não resolve DNS, não confirma que a URL está de fato no ar.
 */
export function validateFrontendBaseUrl(raw: string | undefined): BaseUrlValidation {
  if (!raw || raw.trim() === "") return { valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_MISSING" };

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_UNPARSEABLE" };
  }

  if (url.protocol !== "https:") return { valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_NOT_HTTPS" };
  if ((FORBIDDEN_HML_BASE_HOSTNAMES as readonly string[]).includes(url.hostname.toLowerCase())) {
    return { valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_FORBIDDEN_HOSTNAME" };
  }
  if (url.search !== "") return { valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_HAS_QUERY" };
  if (url.hash !== "") return { valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_HAS_FRAGMENT" };
  if (url.username !== "" || url.password !== "") {
    return { valid: false, failure: "HML_FRONTEND_BASE_URL_NOT_READY_HAS_CREDENTIALS" };
  }

  const normalizedPath = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return { valid: true, normalizedBaseUrl: `${url.protocol}//${url.host}${normalizedPath}` };
}

// ─── Gates obrigatórios antes de qualquer escrita real ─────────────────────

export type CommitGateFailure = "FRONTEND_BLOCKED" | "BANNER_MISSING";

const CONVITE_ROUTE_PATH = join("src", "routes", "convite.$token.tsx");

/**
 * Portões reais e testáveis (Fase 6) — nada hardcoded. `BANNER_MISSING` lê o
 * código-fonte real da rota /convite/:token (mesmo repositório, sem rede) e
 * confirma que o banner e a confirmação de persona estão de fato integrados.
 * `FRONTEND_BLOCKED` valida FIBT_HML_FRONTEND_BASE_URL (Fase 5). Nenhum dos
 * dois confirma que uma instância REAL está no ar — isso exigiria acesso de
 * rede, fora de escopo; ambos confirmam o que é observável localmente: que o
 * código suporta o modo e que uma base URL válida foi declarada.
 */
export function commitGateFailures(
  env: Record<string, string | undefined> = process.env,
  routeSourcePath: string = CONVITE_ROUTE_PATH,
): CommitGateFailure[] {
  const failures: CommitGateFailure[] = [];

  const baseUrl = validateFrontendBaseUrl(env.FIBT_HML_FRONTEND_BASE_URL);
  if (!baseUrl.valid) failures.push("FRONTEND_BLOCKED");

  let routeSource = "";
  try {
    routeSource = readFileSync(routeSourcePath, "utf8");
  } catch {
    failures.push("BANNER_MISSING"); // rota nem existe mais — fail-closed
  }
  if (routeSource) {
    const hasBanner = routeSource.includes("HmlHomologationBanner");
    const hasConfirmationGate = routeSource.includes("HmlPersonaConfirmationGate");
    if (!hasBanner || !hasConfirmationGate) failures.push("BANNER_MISSING");
  }

  return failures;
}

// ─── Caminho --commit — testável via injeção, nunca invocado nesta rodada ──
//
// Estrutura mínima de client que este módulo precisa do Supabase admin —
// injetável em teste com um fake, sem tocar rede. O client real
// (@supabase/supabase-js) satisfaz esta forma estruturalmente.
export interface AdminClientLike {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): { maybeSingle(): Promise<{ data: unknown; error: unknown }> };
    };
    insert(rows: unknown): {
      select(columns: string): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
}

export interface CsvRow {
  test_link_id: string;
  cohort_code: string;
  synthetic_persona_id: string;
  url: string;
  expires_at: string;
  status: string;
  instructions_code: string;
}

export type CommitOutcome =
  | { status: "BATCH_ALREADY_EXISTS"; organizationId: string }
  | {
      status: "CREATED";
      organizationId: string;
      waveId: string;
      cohortIds: Record<string, string>;
      manifestRows: ManifestRow[];
      csvRows: CsvRow[];
    };

/**
 * Orquestra organização → onda → coortes → convites. Idempotente: se a
 * organização (por slug determinístico) já existe, devolve
 * BATCH_ALREADY_EXISTS sem tocar em nada. Nunca reativa convite revogado,
 * nunca apaga registro, nunca reusa token (cada INSERT em wave_invites
 * recebe um token novo do DEFAULT do banco).
 *
 * NÃO EXECUTADO NESTA AUTORIZAÇÃO — só o dry-run foi pedido. Implementado
 * por completo (não como placeholder) para que uma autorização futura de
 * --commit não dependa de escrever esta lógica sob pressão, e para que a
 * idempotência seja testável agora, sem esperar essa autorização.
 */
export async function runCommit(plan: BatchPlan, admin: AdminClientLike): Promise<CommitOutcome> {
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", plan.organizationSlug)
    .maybeSingle();

  if (existingOrg) {
    return { status: "BATCH_ALREADY_EXISTS", organizationId: (existingOrg as { id: string }).id };
  }

  const { data: orgRows, error: orgErr } = await admin.from("organizations").insert({
    slug: plan.organizationSlug,
    name: plan.organizationName,
    pack_id: "enterprise",
    plan: "pilot",
  }).select("id");
  if (orgErr || !orgRows?.[0]) throw new Error(`falha ao criar organização: ${orgErr?.message ?? "resposta vazia"}`);
  const organizationId = (orgRows[0] as { id: string }).id;

  const expiresAt = new Date(Date.now() + plan.expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: waveRows, error: waveErr } = await admin.from("waves").insert({
    org_id: organizationId,
    instrument: plan.instrument,
    instrument_version: plan.instrumentVersion,
    label: plan.waveLabel,
    status: "collecting",
    invited_count: plan.invites.length,
  }).select("id");
  if (waveErr || !waveRows?.[0]) throw new Error(`falha ao criar onda: ${waveErr?.message ?? "resposta vazia"}`);
  const waveId = (waveRows[0] as { id: string }).id;

  const cohortIds: Record<string, string> = {};
  for (const cohort of plan.cohorts) {
    const { data: cohortRows, error: cohortErr } = await admin.from("wave_cohorts").insert({
      org_id: organizationId,
      wave_id: waveId,
      key: cohort.key,
      label: cohort.label,
    }).select("id");
    if (cohortErr || !cohortRows?.[0]) throw new Error(`falha ao criar coorte ${cohort.key}: ${cohortErr?.message ?? "resposta vazia"}`);
    cohortIds[cohort.key] = (cohortRows[0] as { id: string }).id;
  }

  const manifestRows: ManifestRow[] = [];
  const csvRows: CsvRow[] = [];
  const nowIso = new Date().toISOString();

  for (const invite of plan.invites) {
    const { data: inviteRows, error: inviteErr } = await admin.from("wave_invites").insert({
      wave_id: waveId,
      cohort_id: cohortIds[invite.cohortKey],
      expires_at: expiresAt,
    }).select("token");
    if (inviteErr || !inviteRows?.[0]) throw new Error(`falha ao criar convite ${invite.testLinkId}: ${inviteErr?.message ?? "resposta vazia"}`);
    const rawToken = (inviteRows[0] as { token: string }).token;

    manifestRows.push({
      batch_id: plan.batchId,
      environment: plan.environment,
      project_ref: plan.projectRefMasked,
      organization_id: organizationId,
      organization_name: plan.organizationName,
      wave_id: waveId,
      wave_name: plan.waveLabel,
      cohort_id: cohortIds[invite.cohortKey]!,
      cohort_code: invite.cohortKey,
      test_link_id: invite.testLinkId,
      token_hash: tokenHashForManifest(rawToken),
      expires_at: expiresAt,
      status: "active",
      created_at: nowIso,
      // Template da rota, NUNCA o caminho resolvido: o manifesto não pode
      // conter o token bruto em campo algum. O caminho resolvido de verdade
      // (com o token) só existe no CSV privado (campo `url`, abaixo).
      relative_path: "/convite/:token",
      frontend_base_url_status: plan.frontendBaseUrlStatus,
    });
    csvRows.push({
      test_link_id: invite.testLinkId,
      cohort_code: invite.cohortKey,
      synthetic_persona_id: `PERSONA-${invite.testLinkId}`,
      url: `/convite/${rawToken}`,
      expires_at: expiresAt,
      status: "active",
      instructions_code: "SEE_PERSONAS_MD",
    });
  }

  return { status: "CREATED", organizationId, waveId, cohortIds, manifestRows, csvRows };
}

// ─── Saída privada (só --commit) ───────────────────────────────────────────

export const PRIVATE_OUTPUT_DIR = "C:\\Users\\FIB2030\\Documents\\VitalOS-private-hml";

export interface ManifestRow {
  batch_id: string;
  environment: string;
  project_ref: string; // mascarado
  organization_id: string;
  organization_name: string;
  wave_id: string;
  wave_name: string;
  cohort_id: string;
  cohort_code: string;
  test_link_id: string;
  token_hash: string; // SHA-256 do token bruto — nunca o token em si
  expires_at: string;
  status: string;
  created_at: string;
  relative_path: string;
  frontend_base_url_status: string;
}

export function tokenHashForManifest(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Grava manifest + CSV fora do repositório. Só chamado em --commit, depois
 * que os registros reais existem. Nunca inclui o token bruto no manifest;
 * o CSV com os links completos fica só no arquivo, nunca no terminal. */
export function writePrivateOutputs(
  batchId: string,
  manifestRows: ManifestRow[],
  csvRows: CsvRow[],
): { manifestPath: string; csvPath: string; csvSha256: string; linkCount: number } {
  mkdirSync(PRIVATE_OUTPUT_DIR, { recursive: true });

  const manifestPath = join(PRIVATE_OUTPUT_DIR, `${batchId.toLowerCase()}-manifest.json`);
  writeFileSync(manifestPath, JSON.stringify(manifestRows, null, 2), "utf8");

  const csvHeader = "test_link_id,cohort_code,synthetic_persona_id,url,expires_at,status,instructions_code";
  const csvBody = csvRows
    .map((r) =>
      [r.test_link_id, r.cohort_code, r.synthetic_persona_id, r.url, r.expires_at, r.status, r.instructions_code]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  const csv = `${csvHeader}\n${csvBody}\n`;
  const csvPath = join(PRIVATE_OUTPUT_DIR, `${batchId.toLowerCase()}-links.csv`);
  writeFileSync(csvPath, csv, "utf8");

  return {
    manifestPath,
    csvPath,
    csvSha256: createHash("sha256").update(csv, "utf8").digest("hex"),
    linkCount: csvRows.length,
  };
}

// ============================================================================
// Casca CLI
// ============================================================================
if (import.meta.main) {
  let args: ParsedArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    if (e instanceof GeneratorError) {
      console.error(`GENERATOR_ABORTED (${e.code}): ${e.message}`);
      process.exit(1);
    }
    throw e;
  }

  const plan = planBatch(args);

  console.log("=== FIBT-HML-1 — plano da campanha (nenhum registro criado ainda) ===");
  console.log(JSON.stringify(plan, null, 2));

  if (!args.commit) {
    console.log("\n--- DRY RUN: nenhuma conexão remota foi aberta, nenhum token válido foi gerado. ---");
    console.log("Para escrever de verdade: --commit (exige credenciais reais de staging e todos os portões abertos).");
    process.exit(0);
  }

  // --- Caminho --commit — não executado nesta rodada. ----------------------
  const gateFailures = commitGateFailures();
  if (gateFailures.length > 0) {
    console.error(`GENERATOR_ABORTED (COMMIT_GATE_CLOSED): ${gateFailures.join(", ")}`);
    process.exit(1);
  }

  // Só chega aqui com os portões abertos. requireStagingTarget() exige
  // credenciais reais (STAGING_SUPABASE_*) e nunca é chamado em dry-run.
  const { requireStagingTarget } = await import("../../src/lib/staging/staging-guard");
  const target = requireStagingTarget();
  if (target.projectRef !== args.expectedProjectRef) {
    console.error(
      `GENERATOR_ABORTED (INVALID_PROJECT_REF): staging resolvido (${target.maskedRef}) ` +
        `diverge de --expected-project-ref (${maskRef(args.expectedProjectRef)}).`,
    );
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(target.url, target.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const outcome = await runCommit(plan, admin as unknown as AdminClientLike);

  if (outcome.status === "BATCH_ALREADY_EXISTS") {
    console.log(`BATCH_ALREADY_EXISTS — organização já existe (id ${outcome.organizationId}). Nada foi alterado.`);
    process.exit(0);
  }

  const written = writePrivateOutputs(plan.batchId, outcome.manifestRows, outcome.csvRows);
  console.log(`\nBATCH_CREATED em ${target.maskedRef}.`);
  console.log(`  manifest: ${written.manifestPath}`);
  console.log(`  pacote privado: ${written.csvPath}`);
  console.log(`  links no pacote: ${written.linkCount}`);
  console.log(`  SHA-256 do pacote: ${written.csvSha256}`);
  console.log(`  expira em: ${plan.expiresInDays} dia(s)`);
  console.log("  (URLs completas nunca impressas no terminal — só no arquivo privado, fora do repositório)");
}
