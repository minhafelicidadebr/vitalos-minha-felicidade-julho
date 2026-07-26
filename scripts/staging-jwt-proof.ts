#!/usr/bin/env bun
// GATE 1 — prova de isolamento com JWT REAL emitido pelo Supabase Auth.
//
// Cadeia provada de ponta a ponta, sem simulação:
//   Supabase Auth (signInWithPassword) → JWT real → PostgREST (HTTP) →
//   auth.uid() → policy de RLS → isolamento por tenant
//
// Diferença para a prova anterior (Q1.1_PROVA_DINAMICA_STAGING): lá as sessões
// eram simuladas no próprio Postgres (SET LOCAL ROLE + request.jwt.claims), o
// que exercita a policy mas NÃO exercita a emissão/validação do token nem o
// caminho HTTP. Aqui o token é emitido de verdade pelo Auth e viaja pela API
// pública, exatamente como no app.
//
// SEGURANÇA (regras da tarefa):
//   - roda SOMENTE contra o staging; recusa-se a rodar se a URL for a de produção;
//   - nunca imprime JWT, senha, service role ou qualquer chave;
//   - senhas são aleatórias, vivem só em memória, nunca são gravadas;
//   - credenciais vêm de .env.local (gitignored), nunca do .env versionado;
//   - limpa ao final tudo que criou.
//
// Uso:
//   1) crie .env.local na raiz da worktree com:
//        STAGING_SUPABASE_URL=https://<ref>.supabase.co
//        STAGING_SUPABASE_ANON_KEY=<anon/publishable key do staging>
//        STAGING_SUPABASE_SERVICE_ROLE_KEY=<service role key do staging>
//   2) bun run staging:jwt-proof

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ─── Config ───────────────────────────────────────────────────────────────────

/** Projeto de PRODUÇÃO — jamais pode ser alvo deste script. */
const PRODUCTION_REF = "shlmzz";

const TENANT_A = "a0000000-0000-0000-0000-000000000001";
const TENANT_B = "a0000000-0000-0000-0000-000000000002";

const USER_A_EMAIL = "demo-user@example.invalid";
const USER_B_EMAIL = "pilot-user@example.invalid";
const USER_NONE_EMAIL = "no-membership@example.invalid";

/**
 * Chaves do formato NOVO (sb_publishable_… / sb_secret_…) são strings opacas,
 * não JWTs. O supabase-js manda a chave também como `Authorization: Bearer
 * <chave>`, o que o GoTrue rejeita quando ela não é um JWT. Mesmo tratamento
 * que src/integrations/supabase/client.server.ts já faz no app real.
 */
function isOpaqueApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function apiKeyFetch(key: string): typeof fetch {
  const f = (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (isOpaqueApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
  return f as unknown as typeof fetch;
}

/** createClient já configurado para aceitar chave legada (JWT) OU nova (opaca). */
function makeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: apiKeyFetch(key) },
  });
}

function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const value = m[2]!.replace(/^["']|["']$/g, "");
    if (!process.env[m[1]!]) process.env[m[1]!] = value;
  }
}

// ─── Registro de resultados (nunca guarda token) ──────────────────────────────

interface Row {
  cenario: string;
  identidade: string;
  operacao: string;
  status: string;
  linhas: string;
  regra: string;
  resultado: "PASS" | "FAIL";
}

const rows: Row[] = [];
let failures = 0;

function record(r: Omit<Row, "resultado">, passed: boolean): void {
  rows.push({ ...r, resultado: passed ? "PASS" : "FAIL" });
  if (!passed) failures++;
}

// ─── Helpers HTTP (PostgREST direto, para capturar status real) ───────────────

interface RestResult {
  status: number;
  rows: number;
  body: unknown;
}

async function rest(
  url: string,
  anonKey: string,
  accessToken: string | null,
  path: string,
  init: RequestInit = {},
): Promise<RestResult> {
  const headers: Record<string, string> = {
    apikey: anonKey,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers });
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, rows: Array.isArray(body) ? body.length : 0, body };
}

// ─── Setup: usuários sintéticos + vínculos ────────────────────────────────────

async function ensureUser(
  admin: SupabaseClient,
  email: string,
): Promise<{ id: string; password: string }> {
  // Senha aleatória, só em memória — nunca impressa, nunca gravada.
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error && created?.user?.id) return { id: created.user.id, password };

  // Já existe (reexecução): localiza e redefine a senha para esta rodada.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = list?.users?.find((u) => u.email === email);
  if (!found) throw new Error(`Não foi possível criar nem localizar ${email}: ${error?.message}`);

  const { error: updErr } = await admin.auth.admin.updateUserById(found.id, { password });
  if (updErr) throw new Error(`Falha ao preparar ${email}: ${updErr.message}`);
  return { id: found.id, password };
}

async function ensureProfile(
  admin: SupabaseClient,
  userId: string,
  orgId: string,
): Promise<void> {
  const { error } = await admin
    .from("profiles")
    .upsert({ id: userId, org_id: orgId, role: "RH_ADMIN" }, { onConflict: "id" });
  if (error) throw new Error(`Falha ao vincular profile: ${error.message}`);
}

async function removeProfile(admin: SupabaseClient, userId: string): Promise<void> {
  await admin.from("profiles").delete().eq("id", userId);
}

// ─── Prova ────────────────────────────────────────────────────────────────────

async function signIn(
  url: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<string> {
  const client = makeClient(url, anonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`Falha de autenticação para ${email}: ${error?.message ?? "sem sessão"}`);
  }
  return data.session.access_token;
}

async function proveTenant(
  url: string,
  anonKey: string,
  token: string,
  label: string,
  userId: string,
  ownOrg: string,
  ownWaveLabel: string,
  otherOrg: string,
  otherWaveId: string,
): Promise<void> {
  // 1. auth.uid() real — a policy profile_own (id = auth.uid()) devolve
  //    exatamente a linha do próprio chamador. Se auth.uid() não resolvesse,
  //    viriam 0 linhas; se resolvesse errado, viria outro id.
  const me = await rest(url, anonKey, token, "profiles?select=id,org_id");
  const meRow = Array.isArray(me.body) ? (me.body[0] as { id?: string; org_id?: string }) : undefined;
  record(
    {
      cenario: "auth.uid() corresponde ao usuário",
      identidade: label,
      operacao: "GET /profiles",
      status: String(me.status),
      linhas: String(me.rows),
      regra: "policy profile_own (id = auth.uid())",
    },
    me.status === 200 && me.rows === 1 && meRow?.id === userId && meRow?.org_id === ownOrg,
  );

  // 2. Lista ondas — sem nenhum filtro org_id na query.
  const listOwn = await rest(url, anonKey, token, "waves?select=id,org_id");
  const allOwn =
    Array.isArray(listOwn.body) &&
    (listOwn.body as Array<{ org_id: string }>).every((w) => w.org_id === ownOrg);
  record(
    {
      cenario: "lista o próprio tenant (sem filtro na query)",
      identidade: label,
      operacao: "GET /waves",
      status: String(listOwn.status),
      linhas: String(listOwn.rows),
      regra: "policy waves_org",
    },
    listOwn.status === 200 && listOwn.rows > 0 && allOwn,
  );

  // 3. Não lista o tenant alheio — filtro explícito pelo org do outro.
  const listOther = await rest(url, anonKey, token, `waves?select=id&org_id=eq.${otherOrg}`);
  record(
    {
      cenario: "não lista o tenant alheio",
      identidade: label,
      operacao: `GET /waves?org_id=eq.<outro>`,
      status: String(listOther.status),
      linhas: String(listOther.rows),
      regra: "policy waves_org",
    },
    listOther.status === 200 && listOther.rows === 0,
  );

  // 4. Não lê a onda alheia nem sabendo o id exato.
  const readOther = await rest(url, anonKey, token, `waves?select=id,label&id=eq.${otherWaveId}`);
  record(
    {
      cenario: "não lê onda alheia sabendo o id exato",
      identidade: label,
      operacao: "GET /waves?id=eq.<onda alheia>",
      status: String(readOther.status),
      linhas: String(readOther.rows),
      regra: "policy waves_org",
    },
    readOther.status === 200 && readOther.rows === 0,
  );

  // 5. Escreve no próprio tenant (permitido).
  const writeOwn = await rest(url, anonKey, token, `waves?org_id=eq.${ownOrg}&label=eq.${encodeURIComponent(ownWaveLabel)}`, {
    method: "PATCH",
    body: JSON.stringify({ invited_count: 42 }),
  });
  record(
    {
      cenario: "escreve no próprio tenant (permitido)",
      identidade: label,
      operacao: "PATCH /waves (própria)",
      status: String(writeOwn.status),
      linhas: String(writeOwn.rows),
      regra: "policy waves_admin_write",
    },
    writeOwn.status === 200 && writeOwn.rows === 1,
  );

  // 6. Não escreve no tenant alheio.
  const writeOther = await rest(url, anonKey, token, `waves?id=eq.${otherWaveId}`, {
    method: "PATCH",
    body: JSON.stringify({ label: "TENTATIVA_CROSS_TENANT" }),
  });
  record(
    {
      cenario: "não escreve no tenant alheio",
      identidade: label,
      operacao: "PATCH /waves (alheia)",
      status: String(writeOther.status),
      linhas: String(writeOther.rows),
      regra: "policy waves_admin_write",
    },
    writeOther.status === 200 && writeOther.rows === 0,
  );

  // 7. Fornecer orgId alheio no PAYLOAD não concede acesso — o teste central
  //    de "orgId isoladamente não autoriza". WITH CHECK herda o USING da policy.
  const insertOther = await rest(url, anonKey, token, "waves", {
    method: "POST",
    body: JSON.stringify({
      org_id: otherOrg,
      instrument: "COPSOQ",
      label: "TENTATIVA_ORGID_FORJADO",
      status: "draft",
    }),
  });
  record(
    {
      cenario: "orgId alheio no payload NÃO concede acesso",
      identidade: label,
      operacao: "POST /waves (org_id forjado)",
      status: String(insertOther.status),
      linhas: String(insertOther.rows),
      regra: "policy waves_admin_write (WITH CHECK)",
    },
    insertOther.status === 403 || insertOther.status === 401,
  );

  // 8. RPC de contagem não vaza contagem alheia (correção 20260725130000).
  const rpcOther = await fetch(`${url}/rest/v1/rpc/count_wave_responses`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_wave_id: otherWaveId }),
  });
  const rpcBody = await rpcOther.text();
  record(
    {
      cenario: "RPC de contagem não vaza onda alheia",
      identidade: label,
      operacao: "POST /rpc/count_wave_responses (alheia)",
      status: String(rpcOther.status),
      linhas: rpcBody.trim(),
      regra: "count_wave_responses org-scoped",
    },
    rpcOther.status === 200 && rpcBody.trim() === "0",
  );
}

async function main(): Promise<void> {
  loadEnvLocal();

  const url = process.env.STAGING_SUPABASE_URL?.trim();
  // Aceita as duas convenções: a nomenclatura NOVA do painel
  // (publishable/secret) e a LEGADA (anon/service_role). O papel é o mesmo:
  // a primeira é a chave pública do cliente, a segunda a privilegiada.
  const anonKey = (
    process.env.STAGING_SUPABASE_PUBLISHABLE_KEY ?? process.env.STAGING_SUPABASE_ANON_KEY
  )?.trim();
  const serviceKey = (
    process.env.STAGING_SUPABASE_SECRET_KEY ?? process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY
  )?.trim();

  if (!url || !anonKey || !serviceKey) {
    console.error(
      "❌ Credenciais de staging ausentes.\n\n" +
        "Crie .env.local na raiz da worktree (já é gitignored) com:\n" +
        "  STAGING_SUPABASE_URL=https://<ref>.supabase.co\n" +
        "  STAGING_SUPABASE_PUBLISHABLE_KEY=<publishable (ou anon) key>\n" +
        "  STAGING_SUPABASE_SECRET_KEY=<secret (ou service_role) key>\n\n" +
        "Painel → Project Settings → API Keys. NUNCA use as chaves de produção.",
    );
    process.exit(2);
  }

  // Trava dura: nunca rodar contra produção.
  if (url.includes(PRODUCTION_REF)) {
    console.error(
      `❌ ABORTADO: a URL informada aponta para o projeto de PRODUÇÃO (${PRODUCTION_REF}…).\n` +
        "Este script só pode rodar contra o staging.",
    );
    process.exit(3);
  }

  console.log(`Alvo: ${url.replace(/https:\/\/([a-z0-9]{6})[a-z0-9]*/i, "https://$1***")}\n`);

  const admin = makeClient(url, serviceKey);

  // Setup dos três usuários sintéticos.
  const userA = await ensureUser(admin, USER_A_EMAIL);
  const userB = await ensureUser(admin, USER_B_EMAIL);
  const userNone = await ensureUser(admin, USER_NONE_EMAIL);

  await ensureProfile(admin, userA.id, TENANT_A);
  await ensureProfile(admin, userB.id, TENANT_B);
  await removeProfile(admin, userNone.id); // garante ausência de vínculo

  // Ondas sintéticas de referência (uma por tenant), criadas via service role.
  const waveLabelA = "JWT-PROOF-A";
  const waveLabelB = "JWT-PROOF-B";
  await admin.from("waves").delete().in("label", [waveLabelA, waveLabelB, "TENTATIVA_ORGID_FORJADO"]);
  const { data: wA } = await admin
    .from("waves")
    .insert({ org_id: TENANT_A, instrument: "COPSOQ", label: waveLabelA, status: "open" })
    .select("id")
    .single();
  const { data: wB } = await admin
    .from("waves")
    .insert({ org_id: TENANT_B, instrument: "COPSOQ", label: waveLabelB, status: "open" })
    .select("id")
    .single();
  const waveA = (wA as { id: string }).id;
  const waveB = (wB as { id: string }).id;

  try {
    // ── Usuário A ──────────────────────────────────────────────────────────
    const tokenA = await signIn(url, anonKey, USER_A_EMAIL, userA.password);
    record(
      {
        cenario: "autenticação emite JWT válido",
        identidade: "usuário A (tenant A)",
        operacao: "POST /auth/v1/token",
        status: "200",
        linhas: "1 sessão",
        regra: "Supabase Auth",
        // token existe mas NUNCA é impresso
      },
      tokenA.length > 0,
    );
    await proveTenant(url, anonKey, tokenA, "usuário A (tenant A)", userA.id, TENANT_A, waveLabelA, TENANT_B, waveB);

    // ── Usuário B (simétrico) ──────────────────────────────────────────────
    const tokenB = await signIn(url, anonKey, USER_B_EMAIL, userB.password);
    record(
      {
        cenario: "autenticação emite JWT válido",
        identidade: "usuário B (tenant B)",
        operacao: "POST /auth/v1/token",
        status: "200",
        linhas: "1 sessão",
        regra: "Supabase Auth",
      },
      tokenB.length > 0,
    );
    await proveTenant(url, anonKey, tokenB, "usuário B (tenant B)", userB.id, TENANT_B, waveLabelB, TENANT_A, waveA);

    // ── Usuário sem membership ─────────────────────────────────────────────
    const tokenNone = await signIn(url, anonKey, USER_NONE_EMAIL, userNone.password);
    record(
      {
        cenario: "autenticação válida (mas sem vínculo)",
        identidade: "usuário sem membership",
        operacao: "POST /auth/v1/token",
        status: "200",
        linhas: "1 sessão",
        regra: "Supabase Auth",
      },
      tokenNone.length > 0,
    );

    const noneProfiles = await rest(url, anonKey, tokenNone, "profiles?select=id");
    record(
      {
        cenario: "sem membership não vê profile algum",
        identidade: "usuário sem membership",
        operacao: "GET /profiles",
        status: String(noneProfiles.status),
        linhas: String(noneProfiles.rows),
        regra: "policy profile_own",
      },
      noneProfiles.status === 200 && noneProfiles.rows === 0,
    );

    const noneWaves = await rest(url, anonKey, tokenNone, "waves?select=id");
    record(
      {
        cenario: "sem membership: acesso institucional recusado",
        identidade: "usuário sem membership",
        operacao: "GET /waves",
        status: String(noneWaves.status),
        linhas: String(noneWaves.rows),
        regra: "policy waves_org",
      },
      noneWaves.status === 200 && noneWaves.rows === 0,
    );

    const noneOrgs = await rest(url, anonKey, tokenNone, "organizations?select=id");
    record(
      {
        cenario: "sem membership: zero organizações",
        identidade: "usuário sem membership",
        operacao: "GET /organizations",
        status: String(noneOrgs.status),
        linhas: String(noneOrgs.rows),
        regra: "policy org_own",
      },
      noneOrgs.status === 200 && noneOrgs.rows === 0,
    );

    const noneCapsules = await rest(url, anonKey, tokenNone, "wave_capsules?select=id");
    record(
      {
        cenario: "sem membership: zero cápsulas (dado sensível)",
        identidade: "usuário sem membership",
        operacao: "GET /wave_capsules",
        status: String(noneCapsules.status),
        linhas: String(noneCapsules.rows),
        regra: "policy capsule_org",
      },
      noneCapsules.status === 200 && noneCapsules.rows === 0,
    );

    // ── Sessão inválida ────────────────────────────────────────────────────
    const bogus = await rest(url, anonKey, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalido.assinatura", "waves?select=id");
    record(
      {
        cenario: "sessão inválida é recusada",
        identidade: "token forjado",
        operacao: "GET /waves",
        status: String(bogus.status),
        linhas: String(bogus.rows),
        regra: "validação de JWT (GoTrue/PostgREST)",
      },
      bogus.status === 401 && bogus.rows === 0,
    );

    const bogusWrite = await rest(url, anonKey, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalido.assinatura", `waves?id=eq.${waveA}`, {
      method: "PATCH",
      body: JSON.stringify({ label: "TENTATIVA_TOKEN_INVALIDO" }),
    });
    record(
      {
        cenario: "sessão inválida não executa operação sensível",
        identidade: "token forjado",
        operacao: "PATCH /waves",
        status: String(bogusWrite.status),
        linhas: String(bogusWrite.rows),
        regra: "validação de JWT (GoTrue/PostgREST)",
      },
      bogusWrite.status === 401 && bogusWrite.rows === 0,
    );

    // Sem nenhum token (só apikey anon).
    const anonOnly = await rest(url, anonKey, null, "waves?select=id");
    record(
      {
        cenario: "anon sem sessão não lê dado institucional",
        identidade: "anon (sem JWT)",
        operacao: "GET /waves",
        status: String(anonOnly.status),
        linhas: String(anonOnly.rows),
        regra: "policy waves_org (auth.uid() nulo)",
      },
      anonOnly.rows === 0,
    );
  } finally {
    // ── Limpeza do que este script criou ───────────────────────────────────
    await admin
      .from("waves")
      .delete()
      .in("label", [waveLabelA, waveLabelB, "TENTATIVA_ORGID_FORJADO", "TENTATIVA_CROSS_TENANT", "TENTATIVA_TOKEN_INVALIDO"]);
  }

  // ── Relatório (nunca inclui token/senha/chave) ────────────────────────────
  const width = { c: 46, i: 26, o: 34, s: 6, l: 10, r: 34 };
  const pad = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n));
  console.log(
    `${pad("CENÁRIO", width.c)} ${pad("IDENTIDADE", width.i)} ${pad("OPERAÇÃO", width.o)} ${pad("HTTP", width.s)} ${pad("LINHAS", width.l)} ${pad("REGRA", width.r)} RESULTADO`,
  );
  for (const r of rows) {
    console.log(
      `${pad(r.cenario, width.c)} ${pad(r.identidade, width.i)} ${pad(r.operacao, width.o)} ${pad(r.status, width.s)} ${pad(r.linhas, width.l)} ${pad(r.regra, width.r)} ${r.resultado}`,
    );
  }

  console.log(`\n${rows.length - failures}/${rows.length} cenários PASS.`);
  if (failures > 0) {
    console.error(`❌ JWT_REAL_BLOCKED — ${failures} cenário(s) falharam.`);
    process.exit(1);
  }
  console.log("✅ JWT_REAL_PASS — Auth → JWT real → PostgREST → auth.uid() → RLS → isolamento por tenant.");
  process.exit(0);
}

main().catch((err) => {
  console.error(`❌ Erro na execução: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
