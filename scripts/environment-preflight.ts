#!/usr/bin/env bun
// Preflight de ambiente — roda ANTES de dev, build e preview.
//
// Motivo de existir: o modo de falha desta base nunca foi "faltou variável" —
// foi "havia uma variável, e ela apontava para o lugar errado em silêncio".
// Um default que funciona é pior que um erro: ninguém investiga o que não
// reclama. Este script transforma o silêncio em recusa.
//
// Ele NÃO faz I/O de rede: só lê variáveis e compara strings. Um preflight que
// consultasse o banco para "confirmar" o alvo já teria feito exatamente o que
// deveria impedir.
//
// Uso: bun run scripts/environment-preflight.ts
// Sai 0 quando o ambiente é coerente; 1 (com explicação) quando não é.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateEnvironment } from "../src/lib/env/environment-contract";

/**
 * Precedência igual à do Vite: process.env real vence .env.local, que vence
 * .env. Replicada aqui porque um script bun avulso não carrega dotenv sozinho
 * — e divergir dessa ordem faria o preflight validar um ambiente diferente do
 * que a ferramenta seguinte usaria, que é o pior resultado possível.
 */
function carregarArquivo(nome: string, destino: Record<string, string>): void {
  const caminho = join(process.cwd(), nome);
  if (!existsSync(caminho)) return;
  for (const linha of readFileSync(caminho, "utf8").split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(linha);
    if (!m) continue;
    const chave = m[1]!;
    if (chave in destino) continue; // primeiro a definir vence
    destino[chave] = m[2]!.replace(/^["']|["']$/g, "");
  }
}

function ambienteEfetivo(): Record<string, string | undefined> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) out[k] = v;
  carregarArquivo(".env.local", out);
  carregarArquivo(".env", out);
  return out;
}

const env = ambienteEfetivo();
const veredito = validateEnvironment({
  VITALOS_RUNTIME_ENV: env.VITALOS_RUNTIME_ENV,
  VITALOS_DB_TARGET: env.VITALOS_DB_TARGET,
  SUPABASE_URL: env.SUPABASE_URL,
  VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
});

if (!veredito.ok) {
  console.error("\n[preflight] AMBIENTE RECUSADO\n");
  for (const e of veredito.erros) console.error(`  - ${e}`);
  console.error(
    "\n  Configure as variáveis em .env.local (não versionado). " +
      "Consulte docs/AMBIENTES_E_DEPLOY.md e .env.example.\n",
  );
  process.exit(1);
}

// Saída deliberadamente pobre: ambiente, alvo e ref mascarado. Nada de URL
// completa, nenhuma chave, nenhum token — log de build é lido por muita gente
// e guardado por muito tempo.
console.log(
  `[preflight] OK — runtime=${veredito.runtime} banco=${veredito.dbTarget} projeto=${veredito.maskedRef}`,
);
process.exit(0);
