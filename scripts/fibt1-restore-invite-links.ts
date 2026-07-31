// Restauracao dos valores de invite_token destruidos pela Migration B.
//
// PREPARADO, NAO EXECUTADO. Por padrao roda em --dry-run: imprime o SQL e nao
// toca o banco. Aplicar exige --apply explicito.
//
// So faz sentido depois de recriar a coluna (secao 10a do runbook da
// Migration B). Sem o snapshot, nao existe restauracao: os valores nao estao
// em nenhum outro lugar.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { requireStagingTarget } from "./staging-guard";

const SNAPSHOT =
  process.env.FIBT1_SNAPSHOT ??
  "C:\\Users\\FIB2030\\Documents\\VitalOS-private-snapshots\\fibt1-invite-links-2026-07-31.json";

/** SHA-256 registrado no runbook. Divergencia = arquivo trocado ou corrompido. */
const SHA_ESPERADO = "6f15f5741ff9d2fe92e2dcf4a3ad6a9f08b9ec079ec8109731cd0d58896daf2b";

const aplicar = process.argv.includes("--apply");
const target = requireStagingTarget();

const bruto = readFileSync(SNAPSHOT);
const sha = createHash("sha256").update(bruto).digest("hex");

console.log(`Snapshot: ${SNAPSHOT}`);
console.log(`  SHA-256 lido:     ${sha}`);
console.log(`  SHA-256 esperado: ${SHA_ESPERADO}`);

if (sha !== SHA_ESPERADO) {
  throw new Error(
    "RECUSADO: o SHA-256 do snapshot nao confere com o registrado no runbook. " +
      "Restaurar a partir de um arquivo nao verificado escreveria dados de origem desconhecida.",
  );
}

const snap = JSON.parse(bruto.toString("utf8")) as {
  projectRef: string;
  rows: { id: string; wave_id: string; invite_token: string | null; submitted_at: string }[];
};

if (snap.projectRef !== target.maskedRef) {
  throw new Error(
    `RECUSADO: snapshot e do projeto ${snap.projectRef}, o alvo e ${target.maskedRef}. ` +
      "Restaurar entre projetos diferentes misturaria ambientes.",
  );
}

const linhas = snap.rows.filter((r) => r.invite_token !== null);
console.log(`  registros restauraveis: ${linhas.length}\n`);

const sql = linhas
  .map(
    (r) =>
      `update public.wave_responses set invite_token = ${quote(r.invite_token!)} where id = ${quote(r.id)};`,
  )
  .join("\n");

function quote(v: string): string {
  return `'${v.replace(/'/g, "''")}'`;
}

if (!aplicar) {
  console.log("--- DRY RUN: nenhum comando foi executado ---\n");
  console.log(sql);
  console.log("\nPara aplicar de verdade: --apply (exige a coluna invite_token recriada).");
} else {
  const admin = createClient(target.url, target.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let feitas = 0;
  for (const r of linhas) {
    const { error } = await admin
      .from("wave_responses")
      .update({ invite_token: r.invite_token } as never)
      .eq("id", r.id);
    if (error) throw new Error(`falha ao restaurar ${r.id}: ${error.message}`);
    feitas += 1;
  }
  console.log(`Restauradas ${feitas} linha(s) em ${target.maskedRef}.`);
}
