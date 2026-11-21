// Prova HTTP/Auth/PostgREST local. Login interativo é registrado separadamente.
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { institutionalEnv, institutionalWorkdir, institutionalSql } from "./institutional-local";
import { requireInstitutionalLocalTarget } from "../src/lib/env/institutional-local-target";

const env = await institutionalEnv();
requireInstitutionalLocalTarget(env.SUPABASE_URL, env.INSTITUTIONAL_DB_URL, "supabase_db_vitalos-institutional-first-admin");
Object.assign(process.env, env);
const { issueFirstAdmin, acceptFirstAdmin, revokeFirstAdmin, listFirstAdmin } = await import("../src/lib/identity/first-admin.server");
const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const results: Array<{ name: string; pass: boolean }> = [];
function check(name: string, pass: boolean) { results.push({ name, pass }); console.log(`${pass ? "PASS" : "FAIL"} ${name}`); if (!pass) throw new Error("Prova interrompida: " + name); }
async function login(email: string) {
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: "Synthetic-local-only-2026!" });
  if (error || !data.session) throw new Error("Login sintético local falhou.");
  return { client, session: data.session, user: data.user! };
}
const platform = await login("platform@institutional.test");
const beta = await login("beta@institutional.test");
const wrong = await login("wrong@institutional.test");
const inventory = await listFirstAdmin(platform.session.access_token);
if (!inventory.ok) throw new Error("Inventário da plataforma indisponível: " + inventory.reason);
const betaOrg = inventory.value.organizations.find((o) => o.slug === "institutional-beta")!;
check("alvo local e duas empresas identificadas", !!betaOrg && inventory.value.organizations.some((o) => o.slug === "institutional-alfa"));
function input(organizationId: string, email: string) { return { accessToken: platform.session.access_token, organizationId, email, requestId: randomUUID(), token: randomBytes(32).toString("hex") }; }

// Rodar em base nova: Beta demonstra concorrência, Alfa fica para o navegador.
const first = input(betaOrg.id, beta.user.email!);
for (const pending of inventory.value.invites.filter((i) => i.organizationId === betaOrg.id && !i.acceptedAt && !i.revokedAt)) {
  check("recuperação: revogação pelo fluxo de convite anterior incompleto", (await revokeFirstAdmin({ accessToken: platform.session.access_token, inviteId: pending.id })).ok);
}
const [issueA, issueB] = await Promise.all([issueFirstAdmin(first), issueFirstAdmin(first)]);
check("emissão concorrente retorna o mesmo convite", issueA.ok && issueB.ok && issueA.value.id === issueB.value.id);
check("pedido alterado conflita", (await issueFirstAdmin({ ...first, email: wrong.user.email! })).ok === false);
check("identidade errada recusada", (await acceptFirstAdmin({ accessToken: wrong.session.access_token, token: first.token }, true)).ok === false);
check("autoridade institucional não equivale a plataforma", (await issueFirstAdmin({ ...first, accessToken: beta.session.access_token })).ok === false);
const [acceptA, acceptB] = await Promise.all([
  acceptFirstAdmin({ accessToken: beta.session.access_token, token: first.token }, true),
  acceptFirstAdmin({ accessToken: beta.session.access_token, token: first.token }, true),
]);
check("aceite concorrente e retry sem duplicar", acceptA.ok && acceptB.ok);
check("perfil correto e único", await institutionalSql(`SELECT count(*)=1 FROM public.profiles WHERE id='${beta.user.id}' AND org_id='${betaOrg.id}' AND role='RH_ADMIN'`) === "t");
check("RH_ADMIN não emite convite de plataforma", (await listFirstAdmin(beta.session.access_token)).ok === false);
check("segundo primeiro-admin recusado", (await issueFirstAdmin(input(betaOrg.id, wrong.user.email!))).ok === false);

async function target(suffix: string) {
  const { data, error } = await admin.from("organizations").insert({ name: `Empresa Fictícia ${suffix}`, slug: `institutional-${suffix.toLowerCase()}-${Date.now()}`, pack_id: "enterprise", plan: "pilot" }).select("id").single();
  if (error || !data) throw new Error("Fixture empresarial falhou.");
  return data.id as string;
}
const conflictOrg = await target("Conflito");
const conflict = input(conflictOrg, beta.user.email!);
check("convite para testar vínculo preexistente emitido", (await issueFirstAdmin(conflict)).ok);
const conflictResult = await acceptFirstAdmin({ accessToken: beta.session.access_token, token: conflict.token }, true);
check("vínculo incompatível preservado", !conflictResult.ok && conflictResult.reason === "profile_conflict");
const stillBeta = await beta.client.from("profiles").select("org_id,role").eq("id", beta.user.id).single();
check("releitura autenticada mantém empresa Beta", stillBeta.data?.org_id === betaOrg.id && stillBeta.data?.role === "RH_ADMIN");
const revokedOrg = await target("Revogado");
const revoked = input(revokedOrg, wrong.user.email!);
const emitted = await issueFirstAdmin(revoked);
if (!emitted.ok) throw new Error(emitted.reason);
check("revogação legítima", (await revokeFirstAdmin({ accessToken: platform.session.access_token, inviteId: emitted.value.id })).ok);
const refused = await acceptFirstAdmin({ accessToken: wrong.session.access_token, token: revoked.token }, true);
check("convite revogado recusado", !refused.ok && refused.reason === "revoked");

// Fixture temporal criada já expirada, sem editar convite vivo ou desativar trigger.
const expiredOrg = await target("Expirado");
const expiredToken = randomBytes(32).toString("hex");
const { createHash } = await import("node:crypto");
const now = Date.now();
const expired = await admin.from("first_admin_invites").insert({ org_id: expiredOrg, recipient_email: wrong.user.email, token_hash: createHash("sha256").update(expiredToken).digest("hex"), request_id: randomUUID(), issued_by: platform.user.id, created_at: new Date(now - 8 * 86400000).toISOString(), expires_at: new Date(now - 86400000).toISOString() });
check("fixture expirada respeita constraints", !expired.error);
const refusedExpired = await acceptFirstAdmin({ accessToken: wrong.session.access_token, token: expiredToken }, true);
check("convite expirado recusado", !refusedExpired.ok && refusedExpired.reason === "expired");

const alfaOrg = inventory.value.organizations.find((o) => o.slug === "institutional-alfa")!;
const readOther = await beta.client.from("organizations").select("id").eq("id", alfaOrg.id);
check("Beta não lê Alfa via PostgREST autenticado", !readOther.error && readOther.data?.length === 0);
const writeOther = await beta.client.from("organizations").update({ name: "Tentativa sintética" }).eq("id", alfaOrg.id).select("id");
check("Beta não altera Alfa via PostgREST autenticado", !!writeOther.error || writeOther.data?.length === 0);
const directInvite = await beta.client.from("first_admin_invites").insert({ org_id: alfaOrg.id, recipient_email: beta.user.email, token_hash: "b".repeat(64), request_id: randomUUID(), issued_by: beta.user.id });
check("authenticated não emite diretamente no banco", !!directInvite.error);
const invitesRead = await beta.client.from("first_admin_invites").select("id");
check("authenticated não lê inventário de convites", !!invitesRead.error || invitesRead.data?.length === 0);
await beta.client.auth.signOut();
const independent = await login("beta@institutional.test");
const reloaded = await independent.client.from("profiles").select("org_id,role").eq("id", independent.user.id).single();
check("novo login recupera vínculo correto", reloaded.data?.org_id === betaOrg.id && reloaded.data?.role === "RH_ADMIN");
writeFileSync(join(institutionalWorkdir, "proof.json"), JSON.stringify({ recordedAt: new Date().toISOString(), target: "local:57621/57622", results, interactiveBrowser: "separate evidence required" }, null, 2));
console.log(`Prova concluída: ${results.length} verificações; nenhum token salvo nas evidências.`);
