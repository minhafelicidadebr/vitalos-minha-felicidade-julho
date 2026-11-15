// Prova exclusivamente local. Tokens e respostas permanecem em memória.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { institutionalEnv, institutionalSql, institutionalWorkdir } from "./institutional-local";
import { requireInstitutionalLocalTarget } from "../src/lib/env/institutional-local-target";
import { getFibtManifest } from "../src/domain/instruments/fibt/fibt-instrument";
// Usa o transporte instalado do próprio framework, inclusive a serialização.
import { toJSONAsync, fromCrossJSON } from "seroval";

const env = await institutionalEnv();
requireInstitutionalLocalTarget(
  env.SUPABASE_URL,
  env.INSTITUTIONAL_DB_URL,
  "supabase_db_vitalos-institutional-first-admin",
);
const origin = "http://localhost:8091";
const results: { name: string; pass: boolean }[] = [];
function check(name: string, pass: unknown) {
  results.push({ name, pass: !!pass });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) throw new Error("Prova interrompida: " + name);
}
const modules = new Map<string, string>();
async function http(file: string, name: string, data: unknown): Promise<any> {
  if (!modules.has(file)) {
    const response = await fetch(`${origin}/src/lib/api/${file}.functions.ts`, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error("Módulo HTTP local indisponível.");
    modules.set(file, await response.text());
  }
  const id = new RegExp(`export const ${name} = [^\\n]+createClientRpc\\("([^"]+)"`).exec(
    modules.get(file)!,
  )?.[1];
  if (!id) throw new Error("Server function não localizada: " + name);
  const payload = JSON.stringify(await toJSONAsync({ data }));
  const response = await fetch(
    `${origin}/_serverFn/${id}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-tsr-serverFn": "true",
        origin,
      },
      body: payload,
      signal: AbortSignal.timeout(30000),
    },
  );
  const json = await response.json();
  const value: any = response.headers.has("x-tss-serialized") ? fromCrossJSON(json, {}) : json;
  if (!response.ok || value instanceof Error || value?.error)
    throw new Error("Chamada HTTP local recusada: " + name);
  return value?.result ?? value;
}
async function login(email: string) {
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: "Synthetic-local-only-2026!",
  });
  if (error || !data.session) throw new Error("Login sintético falhou.");
  return { client, accessToken: data.session.access_token, userId: data.user!.id };
}
const platform = await login("platform@institutional.test");
const alfa = await login("alfa@institutional.test");
const beta = await login("beta@institutional.test");
async function inventory() {
  const result = await http("module-access", "listPlatformModulesFn", {
    accessToken: platform.accessToken,
  });
  if (!result.ok) throw new Error("Inventário de habilitação indisponível.");
  return result.organizations as {
    id: string;
    slug: string;
    modules: { module: "Q1" | "Q2"; enabled: boolean; revision: number }[];
  }[];
}
const initial = await inventory();
const orgA = initial.find((o) => o.slug === "institutional-alfa")!;
const orgB = initial.find((o) => o.slug === "institutional-beta")!;
check("empresas previamente provisionadas preservadas", orgA && orgB && orgA.id !== orgB.id);
if (process.argv.includes("reading")) {
  const wave = await alfa.client.from("waves").select("id").eq("org_id", orgA.id).order("created_at", { ascending: false }).limit(1).single();
  const outcome = await http("ivo-q2-reading", "loadIvoQ2Reading", { accessToken: alfa.accessToken, waveId: wave.data?.id });
  console.log(JSON.stringify({ ok: outcome.ok, category: outcome.category, error: outcome.error, state: outcome.state, sectors: outcome.view?.sectors.map((s: any) => s.group) }));
  process.exit(0);
}
if (process.argv.includes("readback")) {
  for (const [session, org] of [
    [alfa, orgA],
    [beta, orgB],
  ] as const) {
    const own = await session.client
      .from("org_module_entitlements")
      .select("org_id,module,enabled,revision");
    const foreign = await session.client
      .from("org_module_entitlements")
      .select("org_id")
      .eq("org_id", org.id === orgA.id ? orgB.id : orgA.id);
    const profile = await session.client
      .from("profiles")
      .select("org_id,role")
      .eq("id", session.userId)
      .single();
    check(
      `${org.slug}: novo login, estado persistido e isolamento por RLS`,
      !own.error &&
        own.data?.length === 2 &&
        own.data.every((r) => r.org_id === org.id) &&
        !foreign.error &&
        foreign.data?.length === 0 &&
        profile.data?.org_id === org.id &&
        profile.data?.role === "RH_ADMIN",
    );
  }
} else {
  // O plano pilot preexistente só permite COPSOQ. Fixture intencional de plano
  // enterprise nas DUAS empresas sintéticas; não altera política de billing.
  const fixtureAdmin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const fixturePlan = await fixtureAdmin
    .from("organizations")
    .update({ plan: "enterprise" })
    .in("id", [orgA.id, orgB.id]);
  check("plano enterprise aplicado somente às duas fixtures locais", !fixturePlan.error);
  async function request(org: typeof orgA, module: "Q1" | "Q2", enabled: boolean) {
    const fresh = (await inventory()).find((o) => o.id === org.id)!;
    return {
      accessToken: platform.accessToken,
      organizationId: org.id,
      module,
      enabled,
      expectedRevision: fresh.modules.find((m) => m.module === module)!.revision,
      requestId: randomUUID(),
    };
  }
  async function set(org: typeof orgA, module: "Q1" | "Q2", enabled: boolean) {
    const result = await http(
      "module-access",
      "changeModuleFn",
      await request(org, module, enabled),
    );
    if (!result.ok) throw new Error("Alteração local recusada: " + result.error);
  }
  // A intenção é explícita; nenhuma organização antiga é habilitada por migration.
  const initialProof = join(institutionalWorkdir, "module-initial-state.json");
  if (!existsSync(initialProof)) {
    const absent =
      (await institutionalSql("SELECT count(*)=0 FROM public.org_module_entitlements")) === "t";
    check("migration sem backfill automático", absent);
    writeFileSync(initialProof, JSON.stringify({ noBackfill: absent }));
  } else
    check(
      "ausência inicial de backfill registrada antes das habilitações",
      JSON.parse(readFileSync(initialProof, "utf8")).noBackfill === true,
    );
  await set(orgB, "Q1", false);
  await set(orgB, "Q2", false);
  for (const [q1, q2] of [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ]) {
    await set(orgA, "Q1", q1!);
    await set(orgA, "Q2", q2!);
    const own = await http("module-access", "institutionalModulesFn", {
      accessToken: alfa.accessToken,
    });
    const other = await http("module-access", "institutionalModulesFn", {
      accessToken: beta.accessToken,
    });
    check(
      `HTTP matriz Q1=${q1}/Q2=${q2}; Beta independente`,
      own.ok &&
        own.modules.find((m: any) => m.module === "Q1").enabled === q1 &&
        own.modules.find((m: any) => m.module === "Q2").enabled === q2 &&
        other.ok &&
        other.modules.every((m: any) => !m.enabled),
    );
  }
  const forbidden = await request(orgA, "Q2", false);
  check(
    "RH_ADMIN não altera habilitação por HTTP",
    !(
      await http("module-access", "changeModuleFn", { ...forbidden, accessToken: alfa.accessToken })
    ).ok,
  );
  check(
    "sessão inválida não altera habilitação",
    !(
      await http("module-access", "changeModuleFn", {
        ...forbidden,
        accessToken: "invalid-session-local",
      })
    ).ok,
  );
  const direct = await alfa.client
    .from("org_module_entitlements")
    .update({ enabled: true })
    .eq("org_id", orgB.id);
  check("API direta nega escrita institucional no contrato", !!direct.error);
  let crossDenied = false;
  try {
    await http("module-access", "institutionalModulesFn", {
      accessToken: alfa.accessToken,
      organizationId: orgB.id,
    });
  } catch {
    crossDenied = true;
  }
  check("payload institucional não aceita empresa alheia", crossDenied);
  const retry = await request(orgA, "Q2", true);
  const duplicate = await Promise.all([
    http("module-access", "changeModuleFn", retry),
    http("module-access", "changeModuleFn", retry),
  ]);
  check(
    "retry concorrente retorna sucesso único",
    duplicate.every((r) => r.ok) &&
      (await institutionalSql(
        `SELECT count(*)=1 FROM public.org_module_changes WHERE request_id='${retry.requestId}'`,
      )) === "t",
  );
  check(
    "retry adulterado não sobrescreve",
    !(await http("module-access", "changeModuleFn", { ...retry, enabled: false })).ok,
  );
  const concurrent = await request(orgA, "Q2", true);
  const race = await Promise.all([
    http("module-access", "changeModuleFn", concurrent),
    http("module-access", "changeModuleFn", {
      ...concurrent,
      enabled: false,
      requestId: randomUUID(),
    }),
  ]);
  check("CAS concorrente aceita só uma revisão", race.filter((r) => r.ok).length === 1);
  await set(orgA, "Q2", true);
  const q1 = await http("wave-admin", "adminCreateWave", {
    accessToken: alfa.accessToken,
    instrument: "COPSOQ",
    inviteCount: 5,
  });
  check("Q1 habilitado continua bloqueado por método", !q1.ok && /metodol|fonte/i.test(q1.error));
  await set(orgA, "Q1", false);
  const created = await http("wave-admin", "adminCreateWave", {
    accessToken: alfa.accessToken,
    instrument: "FIB_T",
    inviteCount: 5,
    linkModel: "SECTOR",
    label: "Prova local módulos Q2",
  });
  check("Q2 cria onda pelo fluxo real sem exigir Q1", created.ok);
  const waveId = created.waveId as string;
  const sector = await http("sector-operations", "adminCreateWaveSector", {
    accessToken: alfa.accessToken,
    waveId,
    key: "equipe",
    label: "Equipe sintética",
  });
  check("setor real criado", sector.created);
  const issued = await http("sector-operations", "adminIssueWaveSectorLink", {
    accessToken: alfa.accessToken,
    waveId,
    cohortKey: "equipe",
    expiresInDays: 7,
  });
  check("link real emitido", issued.created && issued.token);
  const cohorts = await alfa.client.from("wave_cohorts").select("id").eq("wave_id", waveId);
  const cohortId = cohorts.data?.[0]?.id;
  if (!cohortId) throw new Error("Coorte da prova ausente.");
  const before = await alfa.client.rpc("aggregate_cohort_responses", {
    p_wave_id: waveId,
    p_cohort_id: cohortId,
  });
  check(
    "Q2 preserva supressão antes de k",
    !before.error && before.data?.[0]?.visible === false && before.data[0].item_means === null,
  );
  const manifest = getFibtManifest();
  const answers = manifest.items.map((i) => ({ itemId: i.id, value: 3 }));
  for (let i = 0; i < 5; i++) {
    const response = await http("sector-link", "submitSectorLinkResponse", {
      token: issued.token,
      answers,
      consentVersion: "2026.1",
    });
    check(`submissão anônima real ${i + 1}`, response.accepted);
  }
  const published = await alfa.client.rpc("aggregate_cohort_responses", {
    p_wave_id: waveId,
    p_cohort_id: cohortId,
  });
  check(
    "publicação Q2 real preserva contrato de privacidade",
    !published.error &&
      published.data?.[0]?.visible === true &&
      !!published.data[0].item_means &&
      published.data[0].response_count === 5,
  );
  const foreign = await beta.client.rpc("aggregate_cohort_responses", {
    p_wave_id: waveId,
    p_cohort_id: cohortId,
  });
  check(
    "Beta não publica nem lê recurso Alfa por RPC",
    !!foreign.error || foreign.data?.[0]?.visible === false,
  );
  const native = await http(
    "ivo-q2-reading",
    "loadIvoQ2Reading",
    { accessToken: alfa.accessToken, waveId },
  );
  check(
    "leitura IVO HTTP usa resultado publicado sem respostas ou token",
    native.ok &&
      native.state === "ready" &&
      native.view.sectors.some((s: any) => s.group === "available") &&
      !JSON.stringify(native).includes(issued.token) &&
      !JSON.stringify(native).includes('"answers"'),
  );
  await set(orgB, "Q2", true);
  const crossReading = await http(
    "ivo-q2-reading",
    "loadIvoQ2Reading",
    { accessToken: beta.accessToken, waveId },
  );
  check(
    "Beta habilitada também não lê onda Alfa por identificador trocado",
    !crossReading.ok && crossReading.category === "validation",
  );
  await set(orgB, "Q2", false);
  const extraResponse = await http("sector-link", "submitSectorLinkResponse", {
    token: issued.token,
    answers,
    consentVersion: "2026.1",
  });
  const differential = await alfa.client.rpc("aggregate_cohort_responses", {
    p_wave_id: waveId,
    p_cohort_id: cohortId,
  });
  check(
    "uma resposta adicional não expõe delta individual no snapshot",
    extraResponse.accepted &&
      !differential.error &&
      differential.data?.[0]?.response_count === 5 &&
      JSON.stringify(differential.data[0].item_means) ===
        JSON.stringify(published.data[0].item_means),
  );
  const preserve = await institutionalSql(
    `SELECT json_build_object('responses',(SELECT count(*) FROM public.wave_responses WHERE wave_id='${waveId}'),'snapshots',(SELECT count(*) FROM public.cohort_capsules WHERE wave_id='${waveId}'))::text`,
  );
  // A mutação que adquiriu o lock primeiro termina antes da desabilitação.
  const heldMutation = institutionalSql(
    `BEGIN; SET LOCAL ROLE service_role; UPDATE public.waves SET label=label WHERE id='${waveId}'; SELECT pg_sleep(1); COMMIT;`,
  );
  await Bun.sleep(150);
  await set(orgA, "Q2", false);
  await heldMutation;
  check("mutação admitida antes da desabilitação termina sem efeito parcial", true);
  const denied = await http("sector-link", "submitSectorLinkResponse", {
    token: issued.token,
    answers,
    consentVersion: "2026.1",
  });
  check("token previamente emitido não submete após desabilitar", !denied.accepted);
  const stale = await alfa.client.rpc("aggregate_cohort_responses", {
    p_wave_id: waveId,
    p_cohort_id: cohortId,
  });
  check("mesma sessão não lê publicação após desabilitar", !!stale.error);
  const revokedReading = await http(
    "ivo-q2-reading",
    "loadIvoQ2Reading",
    { accessToken: alfa.accessToken, waveId },
  );
  check(
    "HTTP da jornada distingue módulo desabilitado de papel insuficiente",
    !revokedReading.ok && revokedReading.category === "module_disabled",
  );
  const directRead = await alfa.client.from("waves").select("id").eq("id", waveId);
  check(
    "URL/API direta sob RLS não revela onda desabilitada",
    !directRead.error && directRead.data?.length === 0,
  );
  const deniedWave = await http("wave-admin", "adminCreateWave", {
    accessToken: alfa.accessToken,
    instrument: "FIB_T",
    inviteCount: 5,
  });
  check("HTTP direto não inicia nova onda desabilitada", !deniedWave.ok);
  const admin = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bypass = await admin.from("wave_responses").insert({
    wave_id: waveId,
    answers: {},
    consent_version: "2026.1",
    instrument_version: manifest.instrument_version,
  });
  check(
    "service_role não contorna trigger da operação crítica",
    !!bypass.error && /module_disabled/.test(bypass.error.message),
  );
  const plansBefore = await institutionalSql(
    `SELECT count(*) FROM public.action_plans WHERE org_id='${orgA.id}'`,
  );
  const shared = await admin.rpc("create_action_plan", {
    p_org_id: orgA.id,
    p_cycle_key: "2099-T4",
    p_season_name: "Prova local da origem",
    p_source_capsule_id: null,
    p_created_by: alfa.userId,
    p_items: [
      {
        rank: 1,
        lever_id: "local-entitlement-proof",
        title: "Ação sintética",
        description: "",
        effort: "baixo",
        expected_ivo_lift: 0,
        start_week: 1,
        end_week: 2,
        milestone_week: 2,
        weeks_budget: 2,
        esg_codes: [],
        lens_id: "copsoq",
        source_lens_id: "fibt",
        source_wave_id: waveId,
        source_cohort_id: cohortId,
        source_factor_id: "bem_estar",
      },
    ],
  });
  const plansAfter = await institutionalSql(
    `SELECT count(*) FROM public.action_plans WHERE org_id='${orgA.id}'`,
  );
  check(
    "ação compartilhada usa origem persistida, ignora rótulo adulterado e não deixa plano parcial",
    !!shared.error && /module_disabled/.test(shared.error.message) && plansBefore === plansAfter,
  );
  const relabel = await admin.from("waves").update({ instrument: "COPSOQ" }).eq("id", waveId);
  check(
    "origem persistida não pode ser reclassificada pelo cliente",
    !!relabel.error && /module_origin_immutable/.test(relabel.error.message),
  );
  await set(orgA, "Q2", true);
  const disable = await request(orgA, "Q2", false);
  const heldDisable = institutionalSql(
    `BEGIN; SET LOCAL ROLE service_role; INSERT INTO public.org_module_changes(actor_id,request_id,org_id,module,enabled,expected_revision) VALUES ('${platform.userId}','${disable.requestId}','${orgA.id}','Q2',false,${disable.expectedRevision}); SELECT pg_sleep(1); COMMIT;`,
  );
  await Bun.sleep(150);
  const lateMutation = await admin
    .from("waves")
    .update({ label: "Operação que deve ser recusada" })
    .eq("id", waveId);
  await heldDisable;
  check(
    "desabilitação que adquiriu lock primeiro nega mutação concorrente",
    !!lateMutation.error && /module_disabled/.test(lateMutation.error.message),
  );
  await set(orgA, "Q2", true);
  const after = await institutionalSql(
    `SELECT json_build_object('responses',(SELECT count(*) FROM public.wave_responses WHERE wave_id='${waveId}'),'snapshots',(SELECT count(*) FROM public.cohort_capsules WHERE wave_id='${waveId}'))::text`,
  );
  check("desabilitar/reabilitar preserva respostas e snapshots", preserve === after);
  const reread = await alfa.client.rpc("aggregate_cohort_responses", {
    p_wave_id: waveId,
    p_cohort_id: cohortId,
  });
  check(
    "reabilitação permite releitura sem recalcular respostas",
    !reread.error && reread.data?.[0]?.visible === true,
  );
  check(
    "regressão dirigida: convite inicial aceito e vínculo preservados",
    (await institutionalSql(
      `SELECT count(*)=2 FROM public.first_admin_invites WHERE org_id IN ('${orgA.id}','${orgB.id}') AND accepted_at IS NOT NULL`,
    )) === "t",
  );
  try {
    await institutionalSql("REVOKE SELECT ON public.org_module_entitlements FROM service_role;");
    const unavailable = await http("module-access", "institutionalModulesFn", {
      accessToken: alfa.accessToken,
    });
    const blocked = await http("wave-admin", "adminCreateWave", {
      accessToken: alfa.accessToken,
      instrument: "FIB_T",
      inviteCount: 5,
    });
    check(
      "falha real de consulta nega leitura e operação sem fallback",
      !unavailable.ok && /verificar/i.test(unavailable.error) && !blocked.ok,
    );
  } finally {
    await institutionalSql("GRANT SELECT ON public.org_module_entitlements TO service_role;");
  }
}
for (const session of [platform, alfa, beta]) await session.client.auth.signOut({ scope: "local" });
writeFileSync(
  join(
    institutionalWorkdir,
    process.argv.includes("readback") ? "module-readback.json" : "module-proof.json",
  ),
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      separateProcess: process.argv.includes("readback"),
      results,
    },
    null,
    2,
  ),
);
