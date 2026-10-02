#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════
// PROVISIONAMENTO IDEMPOTENTE DAS ORGANIZAÇÕES FICTÍCIAS IVO (Alfa / Beta)
// ═══════════════════════════════════════════════════════════════════════════
//
// Usa SÓ os mecanismos do produto, na ordem em que um operador real os usaria:
//   1. usuário de teste (Auth admin, e-mail confirmado);
//   2. organização + admin: convite de organização (createOrgInvite) →
//      provision_organization_from_invite (createOrgAndAdmin) — o caminho de
//      /ativar/:token, sem depender de um "primeiro admin" já existente;
//   3. membro sem papel administrativo: createMemberInvite → acceptMemberInvite;
//   4. onda FIB-T setorial: createWaveAsAdmin (gates de plano preservados);
//   5. setores: createWaveSectorAsAdmin; links: issueWaveSectorLinkAsAdmin;
//   6. respostas sintéticas: captureSectorLinkResponse (validação pura +
//      submit_sector_response, consentimento versionado);
//   7. publicação: aggregate_cohort_responses chamado com o JWT do ADMIN
//      (mecanismo canônico — service_role não publica).
//
// Idempotente: cada passo procura o que já existe (e-mail, slug, rótulo da
// onda, chave do setor, contagem de respostas) e só cria o que falta.
// Estado parcial inesperado (ex.: setor com menos respostas que o previsto)
// ABORTA em vez de completar por cima.
//
// MODOS
//   (padrão) plan   — valida o ambiente (só NOMES de variáveis) e imprime o
//                     plano. Nenhuma rede, nenhuma escrita.
//   --apply         — executa. Exige --target-ref=<ref> igual ao projeto de
//                     SUPABASE_URL, e produção declarada e diferente; ou
//                     --local com URLs loopback.
//
// Segredos: nunca impressos. Senhas de teste geradas vão só para
// --secrets-out (arquivo privado FORA do repositório em staging).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { isLocalUrl, projectRefFromUrl } from "../src/lib/env/environment-contract";

export interface FixtureCohort {
  key: string;
  label: string;
  responses: number;
  publish: boolean;
}

export interface FixtureOrg {
  key: "alfa" | "beta";
  name: string;
  slug: string;
  waveLabel: string;
  adminEmail: string;
  memberEmail?: string;
  cohorts: FixtureCohort[];
}

/**
 * Partição deliberada (k_min = 5):
 *  Alfa — Operações 9 (publicada), Atendimento 6 (lote pendente: o publicador
 *  não é chamado), Logística 3 e Financeiro 2 (abaixo do limiar; DOIS ocultos ⇒
 *  sem supressão complementar), Comercial 0 (em coleta).
 *  Beta — Produção 8 e Qualidade 3: um único oculto ⇒ supressão complementar
 *  retém as duas (prova de que a regra continua valendo).
 */
export function fixtureOrgs(emails: { alfaAdmin: string; alfaMember: string; betaAdmin: string }): FixtureOrg[] {
  return [
    {
      key: "alfa",
      name: "Organização Fictícia Alfa",
      slug: "org-ficticia-alfa",
      waveLabel: "FIB-T Alfa · ciclo de demonstração",
      adminEmail: emails.alfaAdmin,
      memberEmail: emails.alfaMember,
      cohorts: [
        { key: "operacoes", label: "Operações", responses: 9, publish: true },
        { key: "atendimento", label: "Atendimento", responses: 6, publish: false },
        { key: "logistica", label: "Logística", responses: 3, publish: false },
        { key: "financeiro", label: "Financeiro", responses: 2, publish: false },
        { key: "comercial", label: "Comercial", responses: 0, publish: false },
      ],
    },
    {
      key: "beta",
      name: "Organização Fictícia Beta",
      slug: "org-ficticia-beta",
      waveLabel: "FIB-T Beta · ciclo de demonstração",
      adminEmail: emails.betaAdmin,
      cohorts: [
        { key: "producao", label: "Produção", responses: 8, publish: true },
        { key: "qualidade", label: "Qualidade", responses: 3, publish: false },
      ],
    },
  ];
}

export const LOCAL_FIXTURE_EMAILS = {
  alfaAdmin: "gestora.alfa@alfa.ficticia.test",
  alfaMember: "membro.alfa@alfa.ficticia.test",
  betaAdmin: "gestor.beta@beta.ficticia.test",
};

/** Variáveis de e-mail para staging: caixas reais controladas pelo operador. */
export const STAGING_EMAIL_VARS = {
  alfaAdmin: "IVO_STAGING_ALFA_ADMIN_EMAIL",
  alfaMember: "IVO_STAGING_ALFA_MEMBER_EMAIL",
  betaAdmin: "IVO_STAGING_BETA_ADMIN_EMAIL",
} as const;

export interface ProvisionManifest {
  target: "local" | "staging";
  projectRef: string | null;
  orgs: Record<
    "alfa" | "beta",
    {
      orgId: string;
      name: string;
      waveId: string;
      adminEmail: string;
      memberEmail: string | null;
      cohorts: Record<string, { cohortId: string; label: string; responses: number; published: boolean }>;
    }
  >;
}

type Log = (line: string) => void;

/** Respostas determinísticas 0–4 por item — sintéticas, sem dado real. */
function syntheticAnswers(itemIds: readonly string[], seed: number) {
  let x = (seed * 2654435761) >>> 0;
  return itemIds.map((itemId) => {
    x = (x * 1103515245 + 12345) >>> 0;
    return { itemId, value: (x >>> 16) % 5 };
  });
}

function fail(message: string): never {
  throw new Error(message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findUserByEmail(admin: any, email: string): Promise<string | null> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail("listagem de usuários do Auth falhou");
    const users = (data?.users ?? []) as Array<{ id: string; email?: string }>;
    const hit = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (users.length < 200) return null;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureUser(admin: any, email: string, password: string): Promise<string> {
  const existing = await findUserByEmail(admin, email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing, { password, email_confirm: true });
    if (error) fail(`não foi possível atualizar o usuário de teste (${email})`);
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data?.user?.id) fail(`criação do usuário de teste falhou (${email})`);
  return String(data.user.id);
}

async function signIn(apiUrl: string, publishableKey: string, email: string, password: string): Promise<string> {
  const res = await fetch(`${apiUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) fail(`login do usuário de teste falhou (HTTP ${res.status})`);
  return String(((await res.json()) as { access_token: string }).access_token);
}

export interface ProvisionOptions {
  target: "local" | "staging";
  apiUrl: string;
  publishableKey: string;
  emails: { alfaAdmin: string; alfaMember: string; betaAdmin: string };
  passwords: Record<string, string>;
  log?: Log;
}

/**
 * Executa o provisionamento. `process.env` precisa já apontar para o alvo
 * (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY,
 * VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY e VITE_FIBT_PILOT_ENABLED=true).
 */
export async function provisionFictitiousIvoOrgs(opts: ProvisionOptions): Promise<ProvisionManifest> {
  const log = opts.log ?? ((line: string) => console.log(line));
  const { supabaseAdmin } = await import("../src/integrations/supabase/client.server");
  const { createOrgInvite } = await import("../src/lib/api/org-invite.server");
  const { createOrgAndAdmin } = await import("../src/lib/api/onboarding.server");
  const { createMemberInvite, acceptMemberInvite } = await import("../src/lib/api/member-invite.server");
  const { createWaveAsAdmin } = await import("../src/lib/api/wave-admin.server");
  const { createWaveSectorAsAdmin, issueWaveSectorLinkAsAdmin, revokeWaveSectorLinkAsAdmin } = await import(
    "../src/lib/survey/sector-operations-admin.server"
  );
  const { captureSectorLinkResponse } = await import("../src/lib/survey/sector-link.server");
  const { getWaveSurvey } = await import("../src/mocks/survey-mock");
  const { SECTOR_RESPONSE_CONSENT_VERSION } = await import("../src/domain/survey/sector-response-consent");
  const { resolvePackBundle } = await import("../src/domain/packs/registry");
  const { invitableRoles } = await import("../src/domain/packs/pack-routes");
  const { orgAdminRoles } = await import("../src/lib/auth/authorize.server");
  const { normalizeSectorKey } = await import("../src/lib/survey/sector-operations");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabaseAdmin as any;

  const survey = getWaveSurvey("enterprise", "FIB-T");
  if (!survey || survey.items.length !== 32) fail("catálogo FIB-T não tem 32 itens — metodologia divergente, abortado");
  const itemIds = survey.items.map((i: { id: string }) => i.id);

  const manifest: ProvisionManifest = {
    target: opts.target,
    projectRef: opts.target === "staging" ? projectRefFromUrl(opts.apiUrl) : null,
    orgs: {} as ProvisionManifest["orgs"],
  };
  let seed = 1;

  for (const org of fixtureOrgs(opts.emails)) {
    log(`\n▸ ${org.name}`);
    const adminPassword = opts.passwords[org.adminEmail]!;
    const adminId = await ensureUser(admin, org.adminEmail, adminPassword);

    // ── Organização + admin pelo convite de organização ─────────────────────
    const { data: existingOrg } = await admin.from("organizations").select("id").eq("slug", org.slug).maybeSingle();
    let orgId: string;
    if (existingOrg) {
      orgId = String(existingOrg.id);
      const { data: prof } = await admin.from("profiles").select("org_id").eq("id", adminId).maybeSingle();
      if (prof?.org_id !== orgId) fail(`organização ${org.slug} existe mas o admin de teste não pertence a ela — estado inconsistente, abortado`);
      log(`  ok   organização já existe (reutilizada)`);
    } else {
      const { data: prof } = await admin.from("profiles").select("org_id").eq("id", adminId).maybeSingle();
      if (prof?.org_id) fail(`o usuário admin de ${org.slug} já pertence a outra organização — abortado`);
      // Convite emitido sob service_role pelo próprio script (não há sessão de
      // admin de plataforma num ambiente sintético novo — quebra a
      // circularidade do "primeiro admin" sem atalho no banco).
      const invite = await createOrgInvite(adminId, org.adminEmail, "growth");
      if ("error" in invite) fail(`convite de organização falhou: ${invite.error}`);
      const created = await createOrgAndAdmin({
        inviteToken: invite.token,
        userId: adminId,
        orgName: org.name,
        orgSlug: org.slug,
        packId: "enterprise",
        cnpj: "",
        teamSizeBand: "1-49",
        phone: "",
      });
      if ("error" in created) fail(`provisionamento da organização falhou: ${created.error}`);
      orgId = created.orgId;
      log(`  ok   organização + admin provisionados (convite → provision_organization_from_invite)`);
    }

    // ── Membro sem papel administrativo ─────────────────────────────────────
    let memberEmail: string | null = null;
    if (org.memberEmail) {
      memberEmail = org.memberEmail;
      const memberId = await ensureUser(admin, org.memberEmail, opts.passwords[org.memberEmail]!);
      const { data: memberProfile } = await admin.from("profiles").select("org_id, role").eq("id", memberId).maybeSingle();
      if (memberProfile) {
        if (memberProfile.org_id !== orgId) fail("membro de teste pertence a outra organização — abortado");
        log(`  ok   membro já vinculado (papel ${memberProfile.role})`);
      } else {
        const pack = resolvePackBundle("enterprise").pack as unknown as { roles: Array<{ id: string; scope: string }>; orgAdminRole?: string };
        // Papel convidável que NÃO tem autoridade administrativa em nenhum pack
        // (orgAdminRoles é a mesma fonte do requireOrgAdmin) — prova "papel insuficiente".
        const adminRoles = orgAdminRoles();
        const role = invitableRoles(pack as never).find((r: { id: string }) => !adminRoles.has(r.id));
        if (!role) fail("pack sem papel convidável não administrativo");
        const mi = await createMemberInvite(orgId, adminId, org.memberEmail, role.id);
        if ("error" in mi) fail(`convite de membro falhou: ${mi.error}`);
        const accepted = await acceptMemberInvite(mi.token, memberId);
        if ("error" in accepted) fail(`aceite do convite de membro falhou: ${accepted.error}`);
        log(`  ok   membro vinculado pelo convite (papel ${accepted.role})`);
      }
    }

    // ── Onda FIB-T setorial ──────────────────────────────────────────────────
    const { data: existingWave } = await admin
      .from("waves")
      .select("id, instrument_version")
      .eq("org_id", orgId)
      .eq("label", org.waveLabel)
      .eq("instrument", "FIB_T")
      .maybeSingle();
    let waveId: string;
    if (existingWave) {
      waveId = String(existingWave.id);
      log(`  ok   onda já existe (versão ${existingWave.instrument_version ?? "ausente"})`);
    } else {
      const total = org.cohorts.reduce((s, c) => s + c.responses, 0);
      const created = await createWaveAsAdmin({
        orgId,
        instrument: "FIB_T",
        label: org.waveLabel,
        inviteCount: Math.max(total, 1),
        distributionMode: "sector",
      });
      if ("error" in created) fail(`criação da onda falhou: ${created.error}`);
      waveId = created.waveId;
      log(`  ok   onda FIB-T criada (createWaveAsAdmin)`);
    }

    const cohortsOut: ProvisionManifest["orgs"]["alfa"]["cohorts"] = {};
    for (const cohort of org.cohorts) {
      const sector = await createWaveSectorAsAdmin(orgId, waveId, { key: cohort.key, label: cohort.label });
      if (!sector.created && !/Ja existe um setor/.test(sector.error)) fail(`setor ${cohort.key}: ${sector.error}`);
      const sectorKey = normalizeSectorKey(cohort.key);
      const { data: row } = await admin
        .from("wave_cohorts")
        .select("id")
        .eq("wave_id", waveId)
        .eq("key", sectorKey)
        .maybeSingle();
      if (!row) fail(`setor ${cohort.key} não encontrado após criação`);
      const cohortId = String(row.id);

      const { count } = await admin
        .from("wave_responses")
        .select("id", { count: "exact", head: true })
        .eq("wave_id", waveId)
        .eq("cohort_id", cohortId);
      const existing = count ?? 0;
      if (existing !== 0 && existing !== cohort.responses) {
        fail(`setor ${cohort.key} tem ${existing === 0 ? 0 : "contagem parcial"} — estado inesperado, abortado sem completar por cima`);
      }

      if (existing === 0) {
        // Link ativo antigo não devolve o token (só o hash existe): revoga e reemite.
        const { data: active } = await admin
          .from("sector_links")
          .select("id")
          .eq("wave_id", waveId)
          .eq("sector_label", sectorKey)
          .eq("status", "active");
        for (const link of (active ?? []) as Array<{ id: string }>) {
          const r = await revokeWaveSectorLinkAsAdmin(orgId, waveId, link.id);
          if (!r.revoked) fail(`revogação do link anterior de ${cohort.key} falhou`);
        }
        const issued = await issueWaveSectorLinkAsAdmin(orgId, waveId, { cohortKey: sectorKey, expiresInDays: 30 });
        if (!issued.created) fail(`link de ${cohort.key}: ${issued.error}`);
        for (let i = 0; i < cohort.responses; i++) {
          const result = await captureSectorLinkResponse({
            token: issued.token,
            answers: syntheticAnswers(itemIds, seed++),
            consentVersion: SECTOR_RESPONSE_CONSENT_VERSION,
          });
          if (!result.accepted) fail(`resposta sintética recusada em ${cohort.key} (${result.reason})`);
        }
      }
      cohortsOut[cohort.key] = { cohortId, label: cohort.label, responses: cohort.responses, published: false };
      log(`  ok   setor ${cohort.label}: ${existing === 0 ? `${cohort.responses} resposta(s) sintética(s)` : "respostas já presentes"}`);
    }

    // ── Publicação canônica (JWT do admin) ───────────────────────────────────
    const token = await signIn(opts.apiUrl, opts.publishableKey, org.adminEmail, adminPassword);
    for (const cohort of org.cohorts.filter((c) => c.publish)) {
      const res = await fetch(`${opts.apiUrl}/rest/v1/rpc/aggregate_cohort_responses`, {
        method: "POST",
        headers: { apikey: opts.publishableKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_wave_id: waveId, p_cohort_id: cohortsOut[cohort.key]!.cohortId }),
      });
      const rows = (await res.json()) as Array<{ visible: boolean; suppression_reason: string | null }>;
      const row = Array.isArray(rows) ? rows[0] : undefined;
      cohortsOut[cohort.key]!.published = !!row?.visible;
      log(`  ok   publicação canônica — ${cohort.label}: ${row?.visible ? "publicada" : `retida (${row?.suppression_reason ?? `HTTP ${res.status}`})`}`);
    }

    manifest.orgs[org.key] = { orgId, name: org.name, waveId, adminEmail: org.adminEmail, memberEmail, cohorts: cohortsOut };
  }
  return manifest;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function cli(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const local = process.argv.includes("--local");
  const targetRef = arg("target-ref")?.trim().toLowerCase();
  const out = arg("out");
  const secretsOut = arg("secrets-out");
  const env = process.env;

  const problems: string[] = [];
  const required = ["SUPABASE_URL", "VITE_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"];
  for (const name of required) if (!env[name]?.trim()) problems.push(`${name} ausente`);
  if (env.VITE_FIBT_PILOT_ENABLED !== "true") problems.push("VITE_FIBT_PILOT_ENABLED precisa ser exatamente true");
  if (env.FIBT_HML_DEPLOYMENT_ENABLED !== undefined || env.VITE_FIBT_HML_ENABLED !== undefined) problems.push("declaração HML presente — este script não roda no perfil HML");

  const serverUrl = env.SUPABASE_URL ?? "";
  if (local) {
    if (!isLocalUrl(serverUrl) || !isLocalUrl(env.VITE_SUPABASE_URL ?? "")) problems.push("--local exige SUPABASE_URL/VITE_SUPABASE_URL loopback");
  } else {
    const ref = projectRefFromUrl(serverUrl);
    const production = env.VITALOS_PRODUCTION_PROJECT_REF?.trim().toLowerCase();
    if (!targetRef) problems.push("--target-ref=<ref> obrigatório fora de --local");
    if (!ref || ref !== targetRef || projectRefFromUrl(env.VITE_SUPABASE_URL ?? "") !== targetRef) problems.push("SUPABASE_URL/VITE_SUPABASE_URL não apontam para --target-ref");
    if (!production) problems.push("VITALOS_PRODUCTION_PROJECT_REF ausente");
    if (production && production === targetRef) problems.push("alvo é o projeto de PRODUÇÃO — recusado");
    for (const name of Object.values(STAGING_EMAIL_VARS)) if (!env[name]?.includes("@")) problems.push(`${name} ausente (caixa real controlada pelo operador)`);
    if (!out) problems.push("--out=<arquivo do manifesto> obrigatório");
    if (!secretsOut) problems.push("--secrets-out=<arquivo privado FORA do repositório> obrigatório");
    if (secretsOut && secretsOut.replace(/\\/g, "/").includes(process.cwd().replace(/\\/g, "/"))) problems.push("--secrets-out não pode ficar dentro do repositório");
  }

  console.log(`PROVISIONAMENTO IVO — modo=${apply ? "apply" : "plan"} · alvo=${local ? "local" : targetRef ?? "(não informado)"}`);
  console.log("Passos: usuário de teste → convite de organização → provision_organization_from_invite → convite de membro → createWaveAsAdmin(FIB_T, setorial) → setores → links → captureSectorLinkResponse → aggregate_cohort_responses (JWT do admin)");
  if (problems.length > 0) {
    console.error("\nAMBIENTE RECUSADO:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  if (!apply) {
    console.log("\nPlano válido. Nada foi executado (use --apply).");
    return;
  }

  const emails = local
    ? LOCAL_FIXTURE_EMAILS
    : {
      alfaAdmin: env[STAGING_EMAIL_VARS.alfaAdmin]!.trim(),
      alfaMember: env[STAGING_EMAIL_VARS.alfaMember]!.trim(),
      betaAdmin: env[STAGING_EMAIL_VARS.betaAdmin]!.trim(),
    };
  const previous: Record<string, string> = secretsOut && existsSync(secretsOut) ? JSON.parse(readFileSync(secretsOut, "utf8")) : {};
  const passwords: Record<string, string> = {};
  for (const email of Object.values(emails)) passwords[email] = previous[email] ?? randomBytes(18).toString("base64url");

  const manifest = await provisionFictitiousIvoOrgs({
    target: local ? "local" : "staging",
    apiUrl: serverUrl.replace(/\/$/, ""),
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY!,
    emails,
    passwords,
  });
  if (secretsOut) writeFileSync(secretsOut, JSON.stringify(passwords, null, 2), { mode: 0o600 });
  if (out) writeFileSync(out, JSON.stringify(manifest, null, 2));
  console.log(`\nIDs para VITALOS_IVO_AUTHORIZED_ORG_IDS: ${manifest.orgs.alfa.orgId},${manifest.orgs.beta.orgId}`);
}

if (import.meta.main) {
  try {
    await cli();
  } catch (error) {
    console.error(`\n❌ ${(error as Error).message}`);
    process.exit(1);
  }
}
