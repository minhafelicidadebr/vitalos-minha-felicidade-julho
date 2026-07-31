// Inventário SOMENTE LEITURA do projeto de staging, antes da FIBT-1.
// Não cria, não altera e não apaga nada. Serve para a confirmação
// pré-migration: o que existe hoje e o que poderia ser afetado.

import { createClient } from "@supabase/supabase-js";
import { requireStagingTarget } from "./staging-guard";

const target = requireStagingTarget();
const admin = createClient(target.url, target.secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABELAS = [
  "organizations", "profiles", "waves", "wave_invites", "wave_responses", "wave_capsules",
  "org_invites", "member_invites", "sector_links", "ops_events", "action_log", "action_plans",
  "action_items", "evidence_records", "org_cycle_registry", "esg_report_snapshots",
  "personal_assessments", "participation_events", "practice_entries", "leads",
  "devolutiva_sessions", "circle_sessions", "pair_directory_entries", "pair_invites",
  "pair_records", "sm2_card_state", "item_funnel_events", "seed_events", "victory_records",
];

// Tabelas que a FIBT-1 pretende introduzir — confirmar que ainda NÃO existem.
const NOVAS = ["instrument_submissions", "instrument_distributions"];

console.log(`Alvo de staging: ${target.maskedRef}  (guarda de produção: ativa)\n`);

/**
 * Sondagem de existência. NÃO usar `head: true`: para tabela inexistente o
 * PostgREST devolve 204 sem erro, indistinguível de tabela vazia — o que
 * produziu falso "existe" na primeira versão deste inventário. Um select
 * comum devolve 404 com mensagem explícita.
 */
async function existe(tabela: string): Promise<boolean> {
  const { error } = await admin.from(tabela).select("*").limit(1);
  if (!error) return true;
  if (/Could not find the table|does not exist/i.test(error.message)) return false;
  throw new Error(`sondagem de ${tabela} falhou: ${error.message}`);
}

async function linhas(tabela: string): Promise<number> {
  const { count, error } = await admin.from(tabela).select("*", { count: "exact", head: true });
  if (error) throw new Error(`contagem de ${tabela} falhou: ${error.message}`);
  return count ?? 0;
}

// Controle negativo: se ESTA tabela "existir", a sondagem está quebrada.
const CONTROLE = "tabela_de_controle_que_nunca_existe_fibt1";
if (await existe(CONTROLE)) throw new Error("sondagem de existência inválida — controle negativo passou");
console.log(`Controle negativo ("${CONTROLE}"): ausente, como esperado — sondagem confiável.\n`);

console.log("TABELA                          EXISTE   LINHAS");
console.log("-".repeat(52));

let total = 0;
for (const t of [...TABELAS].sort()) {
  if (!(await existe(t))) {
    console.log(`${t.padEnd(30)}  nao      -`);
    continue;
  }
  const n = await linhas(t);
  total += n;
  console.log(`${t.padEnd(30)}  sim      ${n}`);
}

console.log("-".repeat(52));
console.log(`Total de linhas nas tabelas existentes: ${total}\n`);

console.log("Tabelas que a FIBT-1 introduziria (devem estar ausentes):");
for (const t of NOVAS) {
  console.log(`  ${t.padEnd(28)} ${(await existe(t)) ? "JA EXISTE — revisar antes de aplicar" : "ausente (ok)"}`);
}

// Resíduo de ondas anteriores: o que uma limpeza descuidada poderia atingir.
console.log("\nDados de testes anteriores (nao serao tocados sem inventario):");
const { data: orgs } = await admin.from("organizations").select("id, name, created_at").order("created_at");
for (const o of orgs ?? []) {
  const { count: waves } = await admin
    .from("waves").select("*", { count: "exact", head: true }).eq("org_id", (o as { id: string }).id);
  const org = o as { name: string; created_at: string };
  console.log(`  "${org.name}"  ondas=${waves ?? 0}  criada=${org.created_at?.slice(0, 10)}`);
}
