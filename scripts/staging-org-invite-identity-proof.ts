#!/usr/bin/env bun
// P0-SEC — prova dinâmica de identidade em provision_organization_from_invite.
//
// PERGUNTA: com um convite genérico (email NULL), um usuário autenticado
// consegue chamar a RPC pelo endpoint REST passando o UUID de OUTRA pessoa e
// provisionar uma organização vinculada a ela, sem consentimento?
//
// A função valida o e-mail do p_user_id contra o convite — mas SÓ quando
// `v_invite.email IS NOT NULL`. E nunca compara p_user_id com auth.uid().
// org_invites.email é nullable, e o app cria convites sem e-mail de propósito
// (src/lib/api/org-invite.server.ts:88, fluxo de link genérico).
//
// O caminho do APP é seguro: onboarding.functions.ts resolve o userId da
// sessão (resolveAuthenticatedUserId) e chama via service role. A exposição
// é o caminho REST direto, que ignora o app — possível porque a função tem
// GRANT EXECUTE TO authenticated.
//
// SEGURANÇA: só staging (aborta se a URL for de produção); nunca imprime JWT,
// senha ou chave; dados 100% sintéticos; limpa tudo ao final.
//
// Uso: bun run staging:org-invite-proof

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PRODUCTION_REF = "shlm";
const USER_A = "p0-user-a@example.invalid";
const USER_B = "p0-user-b@example.invalid";

function loadEnvLocal(): void {
  const p = join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
}

function isOpaque(k: string): boolean {
  return k.startsWith("sb_publishable_") || k.startsWith("sb_secret_");
}

function apiKeyFetch(key: string): typeof fetch {
  const f = (input: RequestInfo | URL, init?: RequestInit) => {
    const h = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => h.set(k, v));
    if (isOpaque(key) && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
    h.set("apikey", key);
    return fetch(input, { ...init, headers: h });
  };
  return f as unknown as typeof fetch;
}

function makeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: apiKeyFetch(key) },
  });
}

interface Row {
  cenario: string;
  chamador: string;
  p_user_id: string;
  http: string;
  resultado_rpc: string;
  org_criada: string;
  escrita_zero: string;
  veredito: "ESPERADO" | "VULNERAVEL" | "FALHA";
}
const rows: Row[] = [];

/** Fotografia do estado que uma recusa NÃO pode alterar. */
interface Snapshot {
  orgs: number;
  profiles: number;
  conviteUsado: boolean;
}

async function snapshot(
  admin: SupabaseClient,
  token: string,
  uids: string[],
): Promise<Snapshot> {
  const { count: orgs } = await admin
    .from("organizations")
    .select("id", { count: "exact", head: true });
  const { count: profiles } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("id", uids);
  const { data: inv } = await admin
    .from("org_invites")
    .select("used_at")
    .eq("token", token)
    .maybeSingle();
  return {
    orgs: orgs ?? -1,
    profiles: profiles ?? -1,
    conviteUsado: (inv as { used_at?: string | null } | null)?.used_at != null,
  };
}

function semEscrita(antes: Snapshot, depois: Snapshot): boolean {
  return (
    antes.orgs === depois.orgs &&
    antes.profiles === depois.profiles &&
    antes.conviteUsado === depois.conviteUsado
  );
}

async function callRpc(
  url: string,
  apiKey: string,
  token: string | null,
  token_convite: string,
  pUserId: string,
  slug: string,
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {
    apikey: apiKey,
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${url}/rest/v1/rpc/provision_organization_from_invite`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      p_invite_token: token_convite,
      p_user_id: pUserId,
      p_org_name: `P0 Proof ${slug}`,
      p_org_slug: slug,
      p_pack_id: "enterprise",
      p_role: "RH_ADMIN",
      p_cnpj: "00000000000000",
      p_team_size_band: "1-10",
      p_phone: "0000000000",
      p_address: null,
      p_segment: null,
    }),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch { /* mantém texto */ }
  return { status: res.status, body };
}

function rpcOutcome(body: unknown): { org: string | null; error: string | null } {
  const r = Array.isArray(body) ? (body[0] as Record<string, unknown> | undefined) : undefined;
  if (!r) return { org: null, error: typeof body === "object" ? JSON.stringify(body).slice(0, 60) : String(body).slice(0, 60) };
  return {
    org: (r.org_id as string | null) ?? null,
    error: (r.error as string | null) ?? null,
  };
}

async function ensureUser(admin: SupabaseClient, email: string): Promise<{ id: string; pw: string }> {
  const pw = `${randomBytes(24).toString("base64url")}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true });
  if (!error && data?.user?.id) return { id: data.user.id, pw };
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = list?.users?.find((u) => u.email === email);
  if (!found) throw new Error(`nao foi possivel preparar ${email}`);
  await admin.auth.admin.updateUserById(found.id, { password: pw });
  return { id: found.id, pw };
}

async function signIn(url: string, anonKey: string, email: string, pw: string): Promise<string> {
  const c = makeClient(url, anonKey);
  const { data, error } = await c.auth.signInWithPassword({ email, password: pw });
  if (error || !data.session?.access_token) throw new Error(`auth falhou para ${email}`);
  return data.session.access_token;
}

async function newInvite(admin: SupabaseClient, email: string | null, creator: string): Promise<string> {
  const { data, error } = await admin
    .from("org_invites")
    .insert({ created_by: creator, email })
    .select("token")
    .single();
  if (error) throw new Error(`falha ao criar convite: ${error.message}`);
  return (data as { token: string }).token;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const url = process.env.STAGING_SUPABASE_URL?.trim();
  const anonKey = (process.env.STAGING_SUPABASE_PUBLISHABLE_KEY ?? process.env.STAGING_SUPABASE_ANON_KEY)?.trim();
  const secretKey = (process.env.STAGING_SUPABASE_SECRET_KEY ?? process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY)?.trim();

  if (!url || !anonKey || !secretKey) {
    console.error("❌ Credenciais de staging ausentes em .env.local.");
    process.exit(2);
  }
  if (url.includes(PRODUCTION_REF)) {
    console.error("❌ ABORTADO: URL aponta para PRODUÇÃO. Este script só roda em staging.");
    process.exit(3);
  }
  console.log(`Alvo: ${url.replace(/https:\/\/([a-z0-9]{6})[a-z0-9]*/i, "https://$1***")}\n`);

  const admin = makeClient(url, secretKey);
  const a = await ensureUser(admin, USER_A);
  const b = await ensureUser(admin, USER_B);
  const tokenA = await signIn(url, anonKey, USER_A, a.pw);

  const slugs: string[] = [];
  const orgsCriadas: string[] = [];

  async function cenario(
    nome: string,
    chamador: string,
    jwt: string | null,
    conviteEmail: string | null,
    pUserId: string,
    rotulo: string,
    esperaSucesso: boolean,
    reuseToken?: string,
    /** apikey a usar — default é a publishable (papel anon/authenticated). */
    chaveApi: string = anonKey!,
    /** true = usa supabase-js com a secret key, igual onboarding.server.ts. */
    viaServiceRole = false,
  ): Promise<string> {
    const slug = `p0-${randomBytes(4).toString("hex")}`;
    slugs.push(slug);
    // Isola o cenário: sem isso, o profile criado por um cenário anterior faz
    // o seguinte falhar com 23505 (unique violation em profiles.id) — o que
    // pareceria uma recusa de autorização sem ser uma. Cada cenário precisa
    // provar o que diz provar.
    for (const uid of [a.id, b.id]) {
      const { data: prof } = await admin.from("profiles").select("org_id").eq("id", uid).maybeSingle();
      await admin.from("profiles").delete().eq("id", uid);
      const orgId = (prof as { org_id?: string } | null)?.org_id;
      if (orgId) await admin.from("organizations").delete().eq("id", orgId);
    }
    const convite = reuseToken ?? (await newInvite(admin, conviteEmail, a.id));

    // Estado ANTES — para provar que uma recusa não escreve nada.
    const antes = await snapshot(admin, convite, [a.id, b.id]);

    let status: number;
    let body: unknown;
    if (viaServiceRole) {
      // Caminho REAL do app: supabase-js com a secret key. O cliente monta
      // apikey + Authorization corretamente e o PostgREST resolve o papel
      // como service_role. Passar a chave só em `apikey` (como uma versão
      // anterior deste script fazia) resolvia para `anon` e testava outra
      // coisa — foi o que mascarou este cenário na rodada anterior.
      const { data, error: rpcErr } = await admin.rpc("provision_organization_from_invite", {
        p_invite_token: convite,
        p_user_id: pUserId,
        p_org_name: `P0 Proof ${slug}`,
        p_org_slug: slug,
        p_pack_id: "enterprise",
        p_role: "RH_ADMIN",
        p_cnpj: "00000000000000",
        p_team_size_band: "1-10",
        p_phone: "0000000000",
        p_address: null,
        p_segment: null,
      });
      status = rpcErr ? 500 : 200;
      body = rpcErr ? { message: rpcErr.message } : data;
    } else {
      ({ status, body } = await callRpc(url, chaveApi, jwt, convite, pUserId, slug));
    }

    const { org, error } = rpcOutcome(body);
    const depois = await snapshot(admin, convite, [a.id, b.id]);

    if (org) orgsCriadas.push(org);
    const criou = org !== null;
    // Só faz sentido exigir escrita-zero quando o cenário deveria ser recusado.
    const escritaZero = criou ? "n/a" : semEscrita(antes, depois) ? "SIM" : "NAO";

    let veredito: Row["veredito"];
    if (esperaSucesso) veredito = criou ? "ESPERADO" : "FALHA";
    else if (criou) veredito = "VULNERAVEL";
    else veredito = escritaZero === "SIM" ? "ESPERADO" : "FALHA";

    rows.push({
      cenario: nome,
      chamador,
      p_user_id: rotulo,
      http: String(status),
      resultado_rpc: error ?? (criou ? "org criada" : "sem org, sem erro"),
      org_criada: criou ? "SIM" : "nao",
      escrita_zero: escritaZero,
      veredito,
    });
    return convite;
  }

  try {
    // 1. Cliente autenticado chamando direto a RPC. Após a correção, a ACL
    //    barra antes mesmo de a função rodar (EXECUTE revogado de
    //    authenticated) — nenhum caminho de cliente deve alcançar esta RPC.
    //    O provisionamento legítimo acontece via service role (cenário 7).
    await cenario("cliente autenticado chama a RPC direto", "usuário A", tokenA, null, a.id, "A (próprio)", false);

    // 2. O ataque: usuário A, convite genérico, p_user_id FORJADO de B.
    await cenario("convite genérico + p_user_id de OUTRA pessoa", "usuário A", tokenA, null, b.id, "B (forjado)", false);

    // 3. Convite com e-mail vinculado a A, mas p_user_id de B → email_mismatch esperado.
    await cenario("convite com e-mail (A) + p_user_id de B", "usuário A", tokenA, USER_A, b.id, "B (forjado)", false);

    // 4. Sem autenticação (só apikey anon).
    await cenario("sem autenticação", "anon (sem JWT)", null, null, b.id, "B (forjado)", false);

    // 5. Sessão inválida (JWT forjado).
    await cenario(
      "sessão inválida (JWT forjado)",
      "token forjado",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalido.assinatura",
      null,
      a.id,
      "A (próprio)",
      false,
    );

    // 6. Reutilização de convite já consumido.
    //    Consome o convite pelo caminho legítimo (service role) e tenta
    //    reutilizá-lo pelo mesmo caminho — prova que o uso único sobrevive.
    const usado = await newInvite(admin, null, a.id);
    await cenario("1o uso do convite (service role)", "service_role", null, null, a.id, "A", true, usado, anonKey, true);
    await cenario("reutilização do MESMO convite", "service_role", null, null, a.id, "A", false, usado, anonKey, true);

    // 7. Caminho administrativo REAL do app: service role, sem JWT de usuário.
    //    onboarding.functions.ts já autenticou a sessão e resolveu o userId;
    //    onboarding.server.ts chama por service role, onde auth.uid() é NULL.
    //    Este cenário prova que o bypass administrativo continua funcionando —
    //    se falhasse, a correção teria quebrado o onboarding real.
    await cenario(
      "service role (caminho do app)",
      "service_role",
      null,
      null,
      b.id,
      "B (resolvido no servidor)",
      true,
      undefined,
      anonKey,
      true,
    );
  } finally {
    // Limpeza: profiles → organizations → convites.
    for (const org of orgsCriadas) {
      await admin.from("profiles").delete().eq("org_id", org);
      await admin.from("organizations").delete().eq("id", org);
    }
    await admin.from("organizations").delete().in("slug", slugs);
    await admin.from("org_invites").delete().eq("created_by", a.id);
  }

  const pad = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n));
  console.log(
    `${pad("CENÁRIO", 40)} ${pad("CHAMADOR", 15)} ${pad("p_user_id", 13)} ${pad("HTTP", 5)} ${pad("RESULTADO RPC", 20)} ${pad("ORG?", 5)} ${pad("ESCRITA-0", 10)} VEREDITO`,
  );
  for (const r of rows) {
    console.log(
      `${pad(r.cenario, 40)} ${pad(r.chamador, 15)} ${pad(r.p_user_id, 13)} ${pad(r.http, 5)} ${pad(r.resultado_rpc, 20)} ${pad(r.org_criada, 5)} ${pad(r.escrita_zero, 10)} ${r.veredito}`,
    );
  }

  const vuln = rows.filter((r) => r.veredito === "VULNERAVEL");
  const falhas = rows.filter((r) => r.veredito === "FALHA");
  console.log("");
  if (vuln.length > 0) {
    console.log(`🔴 VULNERABILITY_REPRODUCED — ${vuln.length} cenário(s) permitiram o que deveriam recusar:`);
    vuln.forEach((v) => console.log(`   - ${v.cenario} (chamador ${v.chamador}, p_user_id ${v.p_user_id})`));
    process.exit(1);
  }
  if (falhas.length > 0) {
    console.log(`⚠️ ${falhas.length} cenário(s) legítimos falharam — investigar antes de concluir.`);
    falhas.forEach((f) => console.log(`   - ${f.cenario}: ${f.resultado_rpc}`));
    process.exit(1);
  }
  console.log("✅ STATIC_RISK_NOT_REPRODUCED — nenhum cenário de impersonação passou.");
  process.exit(0);
}

main().catch((e) => {
  console.error(`❌ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
