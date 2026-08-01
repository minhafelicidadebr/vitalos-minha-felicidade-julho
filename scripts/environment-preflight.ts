#!/usr/bin/env bun
// Preflight de ambiente — roda ANTES de dev, build e preview.
//
// Motivo de existir: o modo de falha desta base nunca foi "faltou variável" —
// foi "havia uma variável, e ela apontava para o lugar errado em silêncio".
// Um default que funciona é pior que um erro: ninguém investiga o que não
// reclama.
//
// O `.env` é versionado (requisito do Lovable: VITE_* precisa estar lá para o
// build embutir no bundle). Então o que impede o incidente não é esconder o
// arquivo — é o `.env` NÃO conter VITALOS_RUNTIME_ENV nem VITALOS_DB_TARGET.
// Sem default versionado para "onde roda" e "que banco toca", nenhum comando
// resolve produção por omissão: quem declara é o comando, explicitamente.
//
// O runtime vem por argumento (`--runtime=production`), definido no
// package.json. O alvo de banco vem por argumento quando é fixo para aquele
// comando (`--db=test`), ou do ambiente quando é escolha da máquina (`dev`
// aceita local ou staging, e cada pessoa declara no seu .env.local).
//
// Argumento em vez de variável de shell inline (`VAR=x cmd`) porque essa
// sintaxe não funciona no shell padrão do Windows, onde este projeto roda.
//
// Ele NÃO faz I/O de rede: só lê variáveis e compara strings. Um preflight que
// consultasse o banco para "confirmar" o alvo já teria feito exatamente o que
// deveria impedir.
//
// Uso:
//   bun run scripts/environment-preflight.ts --runtime=local
//   bun run scripts/environment-preflight.ts --runtime=ci --db=test
//   bun run scripts/environment-preflight.ts --runtime=local --allow-db=local,staging

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  validateEnvironment,
  type DbTarget,
  isDbTarget,
} from "../src/lib/env/environment-contract";

function arg(nome: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return p?.slice(nome.length + 3).trim() || undefined;
}

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

// O runtime é sempre do comando: é ele que sabe o que está executando.
const runtime = arg("runtime") ?? env.VITALOS_RUNTIME_ENV;

// O alvo de banco pode ser fixo (--db) ou escolha da máquina (VITALOS_DB_TARGET
// no .env.local). Quando é escolha, --allow-db restringe o que aquele comando
// tolera — assim `dev` nunca aceita `production` mesmo que alguém o escreva.
const dbFixo = arg("db");
const dbTarget = dbFixo ?? env.VITALOS_DB_TARGET;

const permitidos = arg("allow-db")
  ?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const erros: string[] = [];

if (permitidos && dbTarget && isDbTarget(dbTarget) && !permitidos.includes(dbTarget)) {
  erros.push(
    `Este comando aceita VITALOS_DB_TARGET em [${permitidos.join(", ")}], ` +
      `mas o ambiente declara "${dbTarget}".`,
  );
}

if (!dbFixo && !env.VITALOS_DB_TARGET) {
  erros.push(
    "VITALOS_DB_TARGET ausente. Este comando exige que a máquina declare o alvo " +
      "em .env.local — não existe default versionado, de propósito. " +
      `Valores aceitos aqui: ${(permitidos ?? []).join(", ") || "ver docs/AMBIENTES_E_DEPLOY.md"}.`,
  );
}

const veredito =
  erros.length > 0
    ? { ok: false as const, erros }
    : validateEnvironment({
        VITALOS_RUNTIME_ENV: runtime,
        VITALOS_DB_TARGET: dbTarget,
        SUPABASE_URL: env.SUPABASE_URL,
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
        VITALOS_PRODUCTION_PROJECT_REF: env.VITALOS_PRODUCTION_PROJECT_REF,
        VITALOS_STAGING_PROJECT_REF: env.VITALOS_STAGING_PROJECT_REF,
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

// Referência de tipo mantida para o leitor: os valores aceitos vivem no
// contrato, não aqui.
export type { DbTarget };
