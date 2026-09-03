// Contrato canônico e único da campanha de homologação assistida sintética da
// ISG (FIBT-HML-1D). Toda identidade do lote — versão, ambiente, batch,
// organização, onda, coortes — vive AQUI, uma vez só. hml-frontend-guard.ts,
// hml-backend-boundary.server.ts e o gerador (scripts/fibt-hml/) importam
// destas constantes em vez de declarar cada um sua própria cópia — a
// revisão FIBT-HML-1C observou que declarações independentes do mesmo valor
// (ex.: "FIBT-ISG-HML-01" solto em dois arquivos) são um risco de divergência
// silenciosa, não uma garantia de consistência.
//
// Puro: zero import de env, zero I/O, zero leitura de import.meta/process.env.

export const HML_CONTRACT_VERSION = "FIBT-HML-1";
export const HML_ENVIRONMENT = "staging";
export const HML_BATCH_ID = "FIBT-ISG-HML-01";

export const HML_ORGANIZATION = {
  slug: "isg-homologacao-assistida-fibt-hml-01",
  name: "ISG — Homologação Assistida FIB-T",
} as const;

export const HML_WAVE = {
  label: "FIB-T Pré-Teste Sintético 01",
  instrument: "FIB_T",
  instrumentVersion: "fibt-1.0.0",
} as const;

export const HML_COHORTS = {
  alpha: { key: "ISG-HML-ALFA", label: "Coorte Alfa", count: 6, linkPrefix: "ALFA" },
  beta: { key: "ISG-HML-BETA", label: "Coorte Beta", count: 4, linkPrefix: "BETA" },
} as const;

export const HML_COHORT_KEYS = [HML_COHORTS.alpha.key, HML_COHORTS.beta.key] as const;
export type HmlCohortKey = (typeof HML_COHORT_KEYS)[number];

export const HML_K_MIN = 5;
export const HML_EXPIRES_IN_DAYS = 7;

// ─── Smoke sintético por sector link (ISG Fast Track / Wave 2.2) ───────────
//
// Este é um lote diferente da campanha de convites acima. A identidade fica
// explícita e é conferida no servidor depois de resolver o hash do token, tanto
// no loader quanto novamente antes da RPC de submissão. Assim, abrir a rota no
// deployment HML não transforma todo sector link válido de STAGING em link HML.
export const HML_SECTOR_SMOKE = {
  organizationName: "ISG — VALIDAÇÃO FIB-T",
  waveLabel: "FIB-T ISG — VALIDAÇÃO CONTROLADA 2026",
  instrument: "FIB_T",
  instrumentVersion: "1.0.0",
  sectorLabels: ["TESTE-ISG-A", "TESTE-ISG-B"],
} as const;

export interface HmlSectorSmokeBindingRow {
  linkOrganizationId: string | null | undefined;
  waveOrganizationId: string | null | undefined;
  organizationName: string | null | undefined;
  waveLabel: string | null | undefined;
  instrument: string | null | undefined;
  instrumentVersion: string | null | undefined;
  sectorLabel: string | null | undefined;
}

export type HmlSectorSmokeBindingResult =
  | { ok: true }
  | { ok: false; code: "HML_SECTOR_LINK_OUTSIDE_AUTHORIZED_SMOKE" };

/** Vínculo exato link→onda→organização do único smoke por setor autorizado. */
export function assertSectorLinkWithinAuthorizedHmlSmoke(
  row: HmlSectorSmokeBindingRow,
): HmlSectorSmokeBindingResult {
  const belongsToSmoke =
    !!row.linkOrganizationId &&
    row.linkOrganizationId === row.waveOrganizationId &&
    row.organizationName === HML_SECTOR_SMOKE.organizationName &&
    row.waveLabel === HML_SECTOR_SMOKE.waveLabel &&
    row.instrument === HML_SECTOR_SMOKE.instrument &&
    row.instrumentVersion === HML_SECTOR_SMOKE.instrumentVersion &&
    !!row.sectorLabel &&
    (HML_SECTOR_SMOKE.sectorLabels as readonly string[]).includes(row.sectorLabel);

  return belongsToSmoke
    ? { ok: true }
    : { ok: false, code: "HML_SECTOR_LINK_OUTSIDE_AUTHORIZED_SMOKE" };
}

// ─── Origem de frontend — allowlist por igualdade exata (Fase 12) ─────────
//
// Hostnames de produção nunca são aceitos como origem de homologação, mesmo
// que toda a checagem de igualdade abaixo esteja correta — defesa em
// profundidade independente da comparação principal.
export const FORBIDDEN_HML_BASE_HOSTNAMES = [
  "vitalos.com.br",
  "www.vitalos.com.br",
  "app.vitalos.com.br",
] as const;

export type HmlOriginFailure =
  | "HML_FRONTEND_ORIGIN_MISSING"
  | "HML_FRONTEND_ORIGIN_UNPARSEABLE"
  | "HML_FRONTEND_ORIGIN_NOT_HTTPS"
  | "HML_FRONTEND_ORIGIN_HAS_CREDENTIALS"
  | "HML_FRONTEND_ORIGIN_HAS_QUERY"
  | "HML_FRONTEND_ORIGIN_HAS_FRAGMENT"
  | "HML_FRONTEND_ORIGIN_FORBIDDEN_HOSTNAME"
  | "HML_FRONTEND_ORIGIN_MISMATCH";

export type HmlOriginValidation =
  | { valid: true; origin: string }
  | { valid: false; failure: HmlOriginFailure };

function parseHmlOriginCandidate(raw: string | undefined): { url: URL } | { error: HmlOriginFailure } {
  if (!raw || raw.trim() === "") return { error: "HML_FRONTEND_ORIGIN_MISSING" };

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { error: "HML_FRONTEND_ORIGIN_UNPARSEABLE" };
  }

  if (url.protocol !== "https:") return { error: "HML_FRONTEND_ORIGIN_NOT_HTTPS" };
  if (url.username !== "" || url.password !== "") return { error: "HML_FRONTEND_ORIGIN_HAS_CREDENTIALS" };
  if (url.search !== "") return { error: "HML_FRONTEND_ORIGIN_HAS_QUERY" };
  if (url.hash !== "") return { error: "HML_FRONTEND_ORIGIN_HAS_FRAGMENT" };
  if ((FORBIDDEN_HML_BASE_HOSTNAMES as readonly string[]).includes(url.hostname.toLowerCase())) {
    return { error: "HML_FRONTEND_ORIGIN_FORBIDDEN_HOSTNAME" };
  }

  return { url };
}

/**
 * Compara uma origem candidata contra a origem autorizada por IGUALDADE
 * EXATA depois de canonicalizar as duas com `URL` nativo — nunca por
 * blocklist de hostname. `URL.origin` normaliza host (minúsculas, punycode)
 * e porta; um sufixo-lookalike (`vitalos.com.br.attacker.test`) ou um
 * homóglifo Unicode produzem um `.origin` diferente do autorizado e por
 * isso falham por DIVERGÊNCIA — não por escapar de uma lista negativa
 * (o bug real da FIBT-HML-1C: a lista negativa só rejeita os 3 hostnames
 * literais que ela conhece, nunca um domínio novo que apenas se pareça).
 *
 * Ambos os lados passam pela mesma validação de forma (HTTPS, sem
 * credenciais/query/fragment, hostname não produtivo) antes da comparação.
 */
export function validateHmlOrigin(
  candidateRaw: string | undefined,
  authorizedRaw: string | undefined,
): HmlOriginValidation {
  const candidate = parseHmlOriginCandidate(candidateRaw);
  if ("error" in candidate) return { valid: false, failure: candidate.error };

  const authorized = parseHmlOriginCandidate(authorizedRaw);
  if ("error" in authorized) return { valid: false, failure: authorized.error };

  if (candidate.url.origin !== authorized.url.origin) {
    return { valid: false, failure: "HML_FRONTEND_ORIGIN_MISMATCH" };
  }

  return { valid: true, origin: candidate.url.origin };
}

// ─── Vínculo convite → coorte → onda → organização (Fase 6) ───────────────
//
// wave_cohorts EXISTE no schema real (migration
// 20260730150000_generic_anonymous_submissions_expand.sql), com FK composta
// wave_invites.cohort_id → wave_cohorts(id, wave_id) e
// wave_cohorts.wave_id/org_id → waves/organizations — a cadeia
// invite→cohort→wave→organization É verificável sem nenhuma migration nova.
//
// `waves` não tem uma coluna dedicada de "código de onda": o campo mais
// próximo disponível é `label` (texto livre), que o gerador grava como
// HML_WAVE.label. É o proxy real usado aqui — não um campo inventado.

export type HmlInviteBindingFailure = "HML_INVITE_OUTSIDE_AUTHORIZED_BATCH" | "HML_INVITE_EXPIRED";

export interface HmlInviteBindingRow {
  organizationSlug: string | null | undefined;
  waveLabel: string | null | undefined;
  cohortKey: string | null | undefined;
  expiresAt: string | null | undefined;
}

export type HmlInviteBindingResult = { ok: true } | { ok: false; code: HmlInviteBindingFailure };

/**
 * Confirma que um convite já resolvido (linha de `wave_invites` com o join
 * cohort/wave/organization já feito pela query) pertence de fato ao lote
 * sintético autorizado — nunca aceita convite comum nem convite de outro
 * lote só porque o backend já passou pela fronteira de projeto (Fase 3).
 * Chamado de novo antes da submissão (Fase 6: "essa validação deve existir
 * novamente antes da submissão").
 */
export function assertInviteWithinAuthorizedHmlBatch(
  row: HmlInviteBindingRow,
  now: Date = new Date(),
): HmlInviteBindingResult {
  const cohortKey = row.cohortKey;
  const belongsToBatch =
    row.organizationSlug === HML_ORGANIZATION.slug &&
    row.waveLabel === HML_WAVE.label &&
    !!cohortKey &&
    (HML_COHORT_KEYS as readonly string[]).includes(cohortKey);

  if (!belongsToBatch) {
    return { ok: false, code: "HML_INVITE_OUTSIDE_AUTHORIZED_BATCH" };
  }

  if (row.expiresAt && new Date(row.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, code: "HML_INVITE_EXPIRED" };
  }

  return { ok: true };
}
