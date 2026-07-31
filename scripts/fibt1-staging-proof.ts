// FIBT-1 -- harness de prova dinamica no staging isolado.
//
// Modos:
//   snapshot  grava, FORA do repositorio, os valores de invite_token que a
//             Migration B destroi. Sem isso a Migration B nao e reversivel.
//   seed      cria organizacao, 2 coortes, onda FIB-T, 10 convites e submete
//             6 respostas na coorte Alfa e 4 na Beta.
//   proof     executa os cenarios de prova e imprime o veredito de cada um.
//   cleanup   remove SOMENTE o que tem o prefixo sintetico desta onda.
//
// Todo identificador passa por assertSynthetic(): a limpeza nao consegue
// tocar dado de outra onda nem que alguem troque um id a mao.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { requireStagingTarget, assertSynthetic, SYNTHETIC_PREFIX } from "./staging-guard";
import { getFibtManifest } from "../src/domain/instruments/fibt/fibt-instrument";

const target = requireStagingTarget();
const admin: SupabaseClient = createClient(target.url, target.secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const manifest = getFibtManifest();

// --- Identificadores sinteticos (todos com o prefixo controlado) ------------
const ORG_NAME = `${SYNTHETIC_PREFIX}org`;
const ORG_OUTRO = `${SYNTHETIC_PREFIX}org-outro-tenant`;
const COORTE_ALFA = `${SYNTHETIC_PREFIX}coorte-alfa`;
const COORTE_BETA = `${SYNTHETIC_PREFIX}coorte-beta`;
const WAVE_LABEL = `${SYNTHETIC_PREFIX}onda-fibt`;
const K_MIN = 5;

/** Respostas determinísticas: mesma semente, mesmo resultado, sempre. */
function respostasSinteticas(semente: number): Record<string, number> {
  let x = semente * 2654435761;
  const out: Record<string, number> = {};
  for (const item of manifest.items) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out[item.id] = x % 5; // 0..4, dentro da escala do instrumento
  }
  return out;
}

/**
 * aggregate_cohort_responses faz escopo por auth.uid(). Chamada com a chave
 * service_role, auth.uid() e NULL e a funcao devolve n=0 -- fail-closed
 * correto, mas inutil como prova: n=0 "suprimido" nao demonstra que n=4 foi
 * suprimido por k-anon. A prova exige JWT de um usuario REAL da organizacao.
 */
async function usuarioComJwt(email: string, orgId: string): Promise<{ id: string; token: string }> {
  const password = `${randomBytes(24).toString("base64url")}Aa1!`; // so em memoria

  const { data: criado, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });

  let userId = criado?.user?.id;
  if (error || !userId) {
    const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const achado = lista?.users?.find((u) => u.email === email);
    if (!achado) throw new Error(`nao criou nem achou ${email}: ${error?.message}`);
    userId = achado.id;
    const { error: upd } = await admin.auth.admin.updateUserById(userId, { password });
    if (upd) throw new Error(`nao preparou ${email}: ${upd.message}`);
  }

  const { error: perr } = await admin
    .from("profiles")
    .upsert({ id: userId, org_id: orgId, role: "RH_ADMIN" }, { onConflict: "id" });
  if (perr) throw new Error(`profile: ${perr.message}`);

  const cliente = createClient(target.url, target.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sess, error: serr } = await cliente.auth.signInWithPassword({ email, password });
  if (serr || !sess.session?.access_token) throw new Error(`login ${email}: ${serr?.message}`);

  return { id: userId, token: sess.session.access_token };
}

/** Cliente PostgREST autenticado como um usuario real (nao service_role). */
function comoUsuario(token: string): SupabaseClient {
  return createClient(target.url, target.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

const ok = (b: boolean) => (b ? "PASS" : "FALHOU");
let falhas = 0;
function checar(nome: string, passou: boolean, detalhe = "") {
  if (!passou) falhas += 1;
  console.log(`  [${ok(passou)}] ${nome}${detalhe ? ` -- ${detalhe}` : ""}`);
}

// ===========================================================================
// snapshot
// ===========================================================================
async function snapshot() {
  const { data, error } = await admin
    .from("wave_responses")
    .select("id, wave_id, invite_token, submitted_at")
    .not("invite_token", "is", null);
  if (error) throw new Error(`snapshot falhou: ${error.message}`);

  const dir = join(tmpdir(), "fibt1-snapshots");
  mkdirSync(dir, { recursive: true });
  const arquivo = join(dir, `invite-links-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(arquivo, JSON.stringify({ projectRef: target.maskedRef, rows: data }, null, 2));

  console.log(`Snapshot de ${data?.length ?? 0} vinculo(s) gravado FORA do repositorio:`);
  console.log(`  ${arquivo}`);
  console.log("Sem este arquivo, a Migration B NAO e reversivel em dados.");
}

// ===========================================================================
// seed
// ===========================================================================
async function seed() {
  assertSynthetic("organizacao", ORG_NAME);

  // organizations.slug e NOT NULL UNIQUE -- deriva do nome sintetico.
  const { data: org, error: e1 } = await admin
    .from("organizations").insert({ name: ORG_NAME, slug: ORG_NAME }).select("id").single();
  if (e1) throw new Error(`org: ${e1.message}`);

  const { data: orgB, error: e1b } = await admin
    .from("organizations").insert({ name: ORG_OUTRO, slug: ORG_OUTRO }).select("id").single();
  if (e1b) throw new Error(`org B: ${e1b.message}`);

  const { data: wave, error: e2 } = await admin
    .from("waves")
    .insert({
      org_id: org.id,
      instrument: "FIB-T",
      instrument_version: manifest.instrument_version,
      label: WAVE_LABEL,
      status: "open",
    })
    .select("id").single();
  if (e2) throw new Error(`onda: ${e2.message}`);

  const { data: coortes, error: e3 } = await admin
    .from("wave_cohorts")
    .insert([
      { org_id: org.id, wave_id: wave.id, key: COORTE_ALFA, label: "Coorte Alfa (sintetica)" },
      { org_id: org.id, wave_id: wave.id, key: COORTE_BETA, label: "Coorte Beta (sintetica)" },
    ])
    .select("id, key");
  if (e3) throw new Error(`coortes: ${e3.message}`);

  const alfa = coortes!.find((c) => c.key === COORTE_ALFA)!;
  const beta = coortes!.find((c) => c.key === COORTE_BETA)!;

  // 6 convites para Alfa, 4 para Beta. Emails em example.invalid (TLD
  // reservado por RFC 2606: impossivel de entregar, nem por acidente).
  const convites: { token: string; wave_id: string; cohort_id: string; email: string }[] = [];
  for (let i = 1; i <= 6; i += 1) {
    convites.push({ token: `${SYNTHETIC_PREFIX}tok-alfa-${i}`, wave_id: wave.id, cohort_id: alfa.id, email: `${SYNTHETIC_PREFIX}alfa-${i}@example.invalid` });
  }
  for (let i = 1; i <= 4; i += 1) {
    convites.push({ token: `${SYNTHETIC_PREFIX}tok-beta-${i}`, wave_id: wave.id, cohort_id: beta.id, email: `${SYNTHETIC_PREFIX}beta-${i}@example.invalid` });
  }
  // Convite expirado, para provar a recusa por expiracao.
  convites.push({
    token: `${SYNTHETIC_PREFIX}tok-expirado`, wave_id: wave.id, cohort_id: beta.id,
    email: `${SYNTHETIC_PREFIX}expirado@example.invalid`,
  });

  const { error: e4 } = await admin.from("wave_invites").insert(
    convites.map((c, i) =>
      c.token.endsWith("expirado")
        ? { ...c, expires_at: new Date(Date.now() - 86_400_000).toISOString() }
        : { ...c, expires_at: new Date(Date.now() + 86_400_000).toISOString() },
    ) as never,
  );
  if (e4) throw new Error(`convites: ${e4.message}`);

  // Submissao pelo fluxo REAL: RPC submit_wave_response, nao INSERT direto.
  let submetidas = 0;
  for (const [i, c] of convites.entries()) {
    if (c.token.endsWith("expirado")) continue;
    const { data, error } = await admin.rpc("submit_wave_response", {
      p_wave_id: wave.id, p_invite_token: c.token, p_answers: respostasSinteticas(i + 1),
    });
    if (error) throw new Error(`submissao ${c.token}: ${error.message}`);
    const r = (data as { accepted: boolean; reason: string }[])[0];
    if (!r?.accepted) throw new Error(`submissao recusada (${c.token}): ${r?.reason}`);
    submetidas += 1;
  }

  console.log(`Seed OK -- org=${ORG_NAME} onda=${wave.id}`);
  console.log(`  coorte Alfa=${alfa.id} (6 convites)  Beta=${beta.id} (4 convites + 1 expirado)`);
  console.log(`  submissoes aceitas: ${submetidas}`);
  writeFileSync(join(tmpdir(), "fibt1-ids.json"), JSON.stringify({ orgId: org.id, orgOutroId: orgB.id, waveId: wave.id, alfaId: alfa.id, betaId: beta.id }));
}

// ===========================================================================
// proof
// ===========================================================================
async function proof() {
  const ids = JSON.parse(await Bun.file(join(tmpdir(), "fibt1-ids.json")).text()) as {
    orgId: string; orgOutroId: string; waveId: string; alfaId: string; betaId: string;
  };

  console.log("\n--- Contagem por coorte ---");
  const { data: alfaRows } = await admin.from("wave_responses").select("id").eq("wave_id", ids.waveId).eq("cohort_id", ids.alfaId);
  const { data: betaRows } = await admin.from("wave_responses").select("id").eq("wave_id", ids.waveId).eq("cohort_id", ids.betaId);
  checar("coorte Alfa tem 6 respostas", alfaRows?.length === 6, `n=${alfaRows?.length}`);
  checar("coorte Beta tem 4 respostas", betaRows?.length === 4, `n=${betaRows?.length}`);

  console.log("\n--- Privacy gate k_min=5 (aplicado no banco, com JWT real) ---");
  const dono = await usuarioComJwt(`${SYNTHETIC_PREFIX}admin@example.invalid`, ids.orgId);
  const comoDono = comoUsuario(dono.token);

  type Agg = {
    visible: boolean;
    response_count: number | null;
    response_count_label: string | null;
    k_min: number;
    item_means: Record<string, number> | null;
    factor_scores: unknown;
    domain_means: unknown;
    suppression_reason: string | null;
  };

  const { data: aggAlfa } = await comoDono.rpc("aggregate_cohort_responses", { p_wave_id: ids.waveId, p_cohort_id: ids.alfaId });
  const { data: aggBeta } = await comoDono.rpc("aggregate_cohort_responses", { p_wave_id: ids.waveId, p_cohort_id: ids.betaId });
  const a = (aggAlfa as Agg[])?.[0];
  const b = (aggBeta as Agg[])?.[0];

  console.log("  payload Alfa:", JSON.stringify({ ...a, item_means: a?.item_means ? `{${Object.keys(a.item_means).length} itens}` : null }));
  console.log("  payload Beta:", JSON.stringify(b));

  checar("Alfa: visible=true", a?.visible === true);
  checar("Alfa: response_count=6", a?.response_count === 6, `${a?.response_count}`);
  checar("Alfa: response_count_label='6'", a?.response_count_label === "6", `${a?.response_count_label}`);
  checar("Alfa: item_means presentes (32 itens)", Object.keys(a?.item_means ?? {}).length === 32);
  checar("Alfa: sem suppression_reason", a?.suppression_reason === null);

  checar("Beta: visible=false", b?.visible === false);
  checar("Beta: response_count = NULL (numero exato NAO sai)", b?.response_count === null, `${b?.response_count}`);
  checar("Beta: response_count_label='<5'", b?.response_count_label === "<5", `${b?.response_count_label}`);
  checar("Beta: item_means = NULL", b?.item_means === null);
  checar("Beta: factor_scores = NULL", b?.factor_scores === null);
  checar("Beta: domain_means = NULL", b?.domain_means === null);
  checar("Beta: suppression_reason='privacy_threshold'", b?.suppression_reason === "privacy_threshold", `${b?.suppression_reason}`);
  // O numero 4 nao pode aparecer em NENHUM lugar do payload organizacional.
  checar("Beta: o numero exato 4 nao aparece no payload", !/4/.test(JSON.stringify(b)), JSON.stringify(b).slice(0, 60));

  console.log("\n--- count_cohort_participation (finalidade operacional separada) ---");
  const { data: cntDono, error: errDono } = await comoDono.rpc("count_cohort_participation", { p_wave_id: ids.waveId, p_cohort_id: ids.betaId });
  checar("RH_ADMIN da org obtem a contagem exata", cntDono === 4, `${cntDono}${errDono ? " err=" + errDono.message : ""}`);
  checar("a funcao devolve so um numero, sem conteudo de resposta", typeof cntDono === "number");

  const anonCli = createClient(target.url, target.publishableKey, { auth: { persistSession: false } });
  const { error: errAnon } = await anonCli.rpc("count_cohort_participation", { p_wave_id: ids.waveId, p_cohort_id: ids.betaId });
  checar("anon e NEGADO por permissao", !!errAnon, errAnon ? errAnon.message.slice(0, 45) : "SEM ERRO -- falha");

  console.log("\n--- Escopo por identidade (a RPC nega quem nao e da org) ---");
  const { data: semIdent } = await admin.rpc("aggregate_cohort_responses", { p_wave_id: ids.waveId, p_cohort_id: ids.alfaId });
  const si = (semIdent as Agg[])?.[0];
  checar("service_role sem auth.uid() nao recebe conteudo",
    si?.visible === false && si?.item_means === null && si?.response_count === null,
    `${si?.suppression_reason}`);

  const intruso = await usuarioComJwt(`${SYNTHETIC_PREFIX}intruso@example.invalid`, ids.orgOutroId);
  const { data: aggIntruso } = await comoUsuario(intruso.token)
    .rpc("aggregate_cohort_responses", { p_wave_id: ids.waveId, p_cohort_id: ids.alfaId });
  const ai = (aggIntruso as Agg[])?.[0];
  checar("usuario de OUTRO tenant nao le a coorte alheia",
    ai?.visible === false && ai?.item_means === null && ai?.suppression_reason === "not_authorized",
    `${ai?.suppression_reason}`);

  const { data: cntIntruso } = await comoUsuario(intruso.token)
    .rpc("count_cohort_participation", { p_wave_id: ids.waveId, p_cohort_id: ids.betaId });
  checar("outro tenant nao obtem nem a contagem", cntIntruso === null, `${cntIntruso}`);

  console.log("\n--- Admin da org nao alcanca resposta individual ---");
  const brutas = await comoDono.from("wave_responses").select("id, answers").eq("wave_id", ids.waveId);
  checar("SELECT direto em wave_responses nao devolve linha",
    (brutas.data?.length ?? 0) === 0, brutas.error ? brutas.error.message.slice(0, 40) : `${brutas.data?.length} linhas`);

  console.log("\n--- Convite de uso unico ---");
  const replay = await admin.rpc("submit_wave_response", {
    p_wave_id: ids.waveId, p_invite_token: `${SYNTHETIC_PREFIX}tok-alfa-1`, p_answers: respostasSinteticas(99),
  });
  const rr = (replay.data as { accepted: boolean; reason: string }[])?.[0];
  checar("replay do mesmo token e recusado", rr?.accepted === false && rr?.reason === "already_used", rr?.reason);

  const invalido = await admin.rpc("submit_wave_response", {
    p_wave_id: ids.waveId, p_invite_token: `${SYNTHETIC_PREFIX}tok-inexistente`, p_answers: respostasSinteticas(98),
  });
  const ri = (invalido.data as { accepted: boolean; reason: string }[])?.[0];
  checar("token inexistente e recusado", ri?.accepted === false && ri?.reason === "invalid_token", ri?.reason);

  const expirado = await admin.rpc("submit_wave_response", {
    p_wave_id: ids.waveId, p_invite_token: `${SYNTHETIC_PREFIX}tok-expirado`, p_answers: respostasSinteticas(97),
  });
  const re = (expirado.data as { accepted: boolean; reason: string }[])?.[0];
  checar("token expirado e recusado", re?.accepted === false && re?.reason === "expired_token", re?.reason);

  console.log("\n--- Desvinculacao convite <-> resposta ---");
  const { data: novas } = await admin.from("wave_responses").select("id, cohort_id, instrument, instrument_version").eq("wave_id", ids.waveId);
  checar("toda resposta nova carrega coorte", (novas ?? []).every((r) => r.cohort_id !== null), `${novas?.length} linhas`);
  checar("toda resposta nova carrega instrumento e versao",
    (novas ?? []).every((r) => r.instrument === "FIB-T" && r.instrument_version === manifest.instrument_version));

  // Antes da Migration B a coluna ainda existe: prova-se que o fluxo novo
  // NAO a preenche. Depois da B a coluna some e o select falha -- as duas
  // situacoes sao aceitas, por motivos diferentes.
  const comToken = await admin.from("wave_responses").select("id, invite_token").eq("wave_id", ids.waveId);
  if (comToken.error && /invite_token/.test(comToken.error.message)) {
    checar("coluna invite_token nao existe mais (pos-Migration B)", true);
  } else {
    const todosNulos = (comToken.data ?? []).every((r) => (r as { invite_token: string | null }).invite_token === null);
    checar("fluxo novo grava invite_token NULL (pre-Migration B)", todosNulos);
  }

  console.log("\n--- Isolamento entre tenants ---");
  const { data: coortesOutro } = await admin.from("wave_cohorts").select("id").eq("org_id", ids.orgOutroId);
  checar("outro tenant nao possui coortes desta onda", (coortesOutro ?? []).length === 0);

  console.log("\n--- Scoring pelo manifesto canonico ---");
  if (a?.visible && a.item_means) {
    const means = a.item_means as Record<string, number>;
    checar("agregado cobre os 32 itens", Object.keys(means).length === 32, `${Object.keys(means).length} itens`);
    checar("toda media esta na escala 0-4", Object.values(means).every((v) => v >= 0 && v <= 4));
  }

  console.log(`\n=== ${falhas === 0 ? "TODOS OS CENARIOS PASSARAM" : `${falhas} CENARIO(S) FALHARAM`} ===`);
  if (falhas > 0) process.exit(1);
}

// ===========================================================================
// cleanup
// ===========================================================================
async function cleanup() {
  const { data: orgs } = await admin.from("organizations").select("id, name").like("name", `${SYNTHETIC_PREFIX}%`);
  if (!orgs?.length) return console.log("Nada sintetico desta onda para remover.");

  // Usuarios sinteticos criados para a prova de JWT.
  const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of lista?.users ?? []) {
    if (!u.email?.startsWith(SYNTHETIC_PREFIX)) continue;
    assertSynthetic("usuario a remover", u.email);
    await admin.from("profiles").delete().eq("id", u.id);
    await admin.auth.admin.deleteUser(u.id);
    console.log(`  removido usuario: ${u.email}`);
  }

  for (const org of orgs) {
    assertSynthetic("organizacao a remover", org.name);
    const { data: waves } = await admin.from("waves").select("id").eq("org_id", org.id);
    for (const w of waves ?? []) {
      await admin.from("wave_responses").delete().eq("wave_id", w.id);
      await admin.from("wave_invites").delete().eq("wave_id", w.id);
      await admin.from("wave_cohorts").delete().eq("wave_id", w.id);
      await admin.from("waves").delete().eq("id", w.id);
    }
    await admin.from("organizations").delete().eq("id", org.id);
    console.log(`  removido: ${org.name}`);
  }
  console.log("Limpeza concluida -- somente dados com o prefixo sintetico foram tocados.");
}

const modo = process.argv[2];
console.log(`Alvo: ${target.maskedRef} | modo: ${modo}\n`);
if (modo === "snapshot") await snapshot();
else if (modo === "seed") await seed();
else if (modo === "proof") await proof();
else if (modo === "cleanup") await cleanup();
else {
  console.error("Uso: bun run scripts/fibt1-staging-proof.ts <snapshot|seed|proof|cleanup>");
  process.exit(1);
}
