// Preflight final, SOMENTE LEITURA, antes da aplicacao manual da Migration B.
// Nao cria, nao altera e nao apaga nada. Qualquer FAIL bloqueia a aplicacao.

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { requireStagingTarget } from "../src/lib/staging/staging-guard";

const target = requireStagingTarget();
const admin = createClient(target.url, target.secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ORGS = [
  "a0000000-0000-0000-0000-000000000001",
  "a0000000-0000-0000-0000-000000000002",
];
const SNAPSHOT =
  "C:\\Users\\FIB2030\\Documents\\VitalOS-private-snapshots\\fibt1-invite-links-2026-07-31.json";
const SNAPSHOT_SHA = "6f15f5741ff9d2fe92e2dcf4a3ad6a9f08b9ec079ec8109731cd0d58896daf2b";
const MIGRATION_B = "supabase/migrations/20260730160000_drop_response_invite_link_contract.sql";

let falhas = 0;
function checar(n: number, nome: string, passou: boolean, obtido = "") {
  if (!passou) falhas += 1;
  const marca = passou ? "PASS" : "FAIL";
  console.log(`| ${String(n).padStart(2)} | ${marca} | ${nome.padEnd(58)} | ${obtido} |`);
}

console.log(`Alvo: ${target.maskedRef}  (somente leitura)\n`);
console.log("| #  | ---- | Verificacao                                                | Obtido |");
console.log("|----|------|------------------------------------------------------------|--------|");

// --- Estado dos dados -------------------------------------------------------
const { data: resp } = await admin
  .from("wave_responses")
  .select("id, wave_id, invite_token, cohort_id");
const linhas = resp ?? [];
const comToken = linhas.filter((r) => (r as { invite_token: string | null }).invite_token !== null);
const semTokenComCoorte = linhas.filter(
  (r) =>
    (r as { invite_token: string | null }).invite_token === null &&
    (r as { cohort_id: string | null }).cohort_id !== null,
);
const conflito = linhas.filter(
  (r) =>
    (r as { invite_token: string | null }).invite_token !== null &&
    (r as { cohort_id: string | null }).cohort_id !== null,
);

checar(1, "exatamente 16 respostas com invite_token nao nulo", comToken.length === 16, `${comToken.length}`);
checar(2, "exatamente 10 com invite_token nulo E cohort_id preenchido", semTokenComCoorte.length === 10, `${semTokenComCoorte.length}`);
checar(3, "zero com cohort_id preenchido E invite_token nao nulo", conflito.length === 0, `${conflito.length}`);

const { data: waves } = await admin.from("waves").select("id, org_id");
const orgDaOnda = new Map((waves ?? []).map((w) => [(w as { id: string }).id, (w as { org_id: string }).org_id]));
const respFora = comToken.filter((r) => !ORGS.includes(orgDaOnda.get((r as { wave_id: string }).wave_id) ?? ""));
const ondasAfetadas = [...new Set(comToken.map((r) => (r as { wave_id: string }).wave_id))];
const ondasFora = ondasAfetadas.filter((id) => !ORGS.includes(orgDaOnda.get(id) ?? ""));

checar(4, "zero respostas afetadas fora das 2 orgs autorizadas", respFora.length === 0, `${respFora.length}`);
checar(5, "zero ondas afetadas fora das 2 orgs autorizadas", ondasFora.length === 0, `${ondasFora.length} de ${ondasAfetadas.length}`);

const { data: convites } = await admin.from("wave_invites").select("email");
const emailsReais = (convites ?? []).filter((i) => {
  const e = (i as { email: string | null }).email;
  return e !== null && !e.endsWith("@example.invalid") && !e.endsWith("@example.com");
});
checar(6, "zero e-mails fora de example.invalid / example.com", emailsReais.length === 0, `${emailsReais.length}`);

// --- Estado do schema -------------------------------------------------------
async function tabelaExiste(t: string): Promise<boolean> {
  const { error } = await admin.from(t).select("*").limit(1);
  return !error || !/Could not find the table|does not exist/i.test(error.message);
}
async function rpcExiste(nome: string, args: Record<string, unknown>): Promise<boolean> {
  const { error } = await admin.rpc(nome, args);
  return !error || !/Could not find the function|does not exist/i.test(error.message);
}

const umaOnda = ondasAfetadas[0]!;
checar(7, "Migration A presente (wave_cohorts)", await tabelaExiste("wave_cohorts"));
checar(8, "privacy hardening presente (contrato novo)",
  await (async () => {
    const { data } = await admin.rpc("aggregate_cohort_responses", { p_wave_id: umaOnda, p_cohort_id: null });
    const row = (data as Record<string, unknown>[])?.[0];
    return row !== undefined && "response_count_label" in row;
  })());
checar(9, "count_cohort_participation presente",
  await rpcExiste("count_cohort_participation", { p_wave_id: umaOnda, p_cohort_id: null }));

// invite_token ainda tem que existir ANTES da Migration B.
const { error: errToken } = await admin.from("wave_responses").select("invite_token").limit(1);
checar(10, "invite_token AINDA presente (pre-Migration B)", !errToken, errToken ? "ausente" : "presente");

// --- Dependencias da coluna -------------------------------------------------
// Sem SQL arbitrario disponivel, a checagem de policies/funcoes e estatica
// sobre o repositorio; a Migration B repete a checagem dinamica no banco
// (preconditions 1.6) e aborta sozinha se algo escapar.
const sqlB = readFileSync(MIGRATION_B, "utf8");
const migrationsDir = "supabase/migrations";
const { Glob } = await import("bun");
const arquivos = [...new Glob("*.sql").scanSync({ cwd: migrationsDir })].sort();
const policyViva = arquivos.some((f) => {
  const sql = readFileSync(`${migrationsDir}/${f}`, "utf8");
  return /CREATE POLICY "response_submit"/.test(sql) && !arquivos
    .filter((g) => g > f)
    .some((g) => /DROP POLICY IF EXISTS "response_submit"/.test(readFileSync(`${migrationsDir}/${g}`, "utf8")));
});
checar(11, "nenhuma policy dependente sobrevive ate a Migration B", !policyViva);
checar(12, "so submit_sector_response depende da coluna, e B a substitui",
  sqlB.includes("FUNCTION public.submit_sector_response") && sqlB.includes("p.prosrc ILIKE"));

const posFuncao = sqlB.indexOf("FUNCTION public.submit_sector_response");
const posDrop = sqlB.search(/DROP\s+COLUMN\s+IF\s+EXISTS\s+invite_token/i);
checar(13, "submit_sector_response substituido ANTES do DROP no arquivo",
  posFuncao > -1 && posDrop > -1 && posFuncao < posDrop, `${posFuncao} < ${posDrop}`);

// --- Snapshot ---------------------------------------------------------------
let bytes: Buffer | null = null;
try {
  bytes = readFileSync(SNAPSHOT);
} catch {
  bytes = null;
}
checar(14, "snapshot presente no caminho registrado", bytes !== null, bytes ? "sim" : "AUSENTE");
checar(15, "snapshot com 4097 bytes", bytes !== null && statSync(SNAPSHOT).size === 4097,
  bytes ? `${statSync(SNAPSHOT).size}` : "-");
const sha = bytes ? createHash("sha256").update(bytes).digest("hex") : "";
checar(16, "SHA-256 do snapshot confere", sha === SNAPSHOT_SHA, sha.slice(0, 12) + "...");
const snap = bytes ? (JSON.parse(bytes.toString("utf8")) as { projectRef: string; rows: unknown[] }) : null;
checar(17, "snapshot com 16 registros", snap?.rows.length === 16, `${snap?.rows.length}`);
checar(18, "project_ref do snapshot bate com o alvo", snap?.projectRef === target.maskedRef, `${snap?.projectRef}`);

console.log("");
if (falhas === 0) {
  console.log("=== 18/18 PASS -- aplicacao manual da Migration B LIBERADA ===");
} else {
  console.log(`=== ${falhas} FAIL -- aplicacao da Migration B BLOQUEADA ===`);
  process.exit(1);
}
