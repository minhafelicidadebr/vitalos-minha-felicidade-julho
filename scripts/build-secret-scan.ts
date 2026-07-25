#!/usr/bin/env bun
// Busca automatizada de segredo no artefato de build (Q1.1, escopo item 5).
// Uso:
//   bun run build && bun run scripts/build-secret-scan.ts
//
// Alvo: .output/public/ — é o diretório REALMENTE servido ao navegador neste
// projeto (Nitro/Cloudflare Workers, ver vite.config.ts). .output/server/ é
// o worker que roda no servidor (Cloudflare), não o navegador — pode
// legitimamente conter o client.server.ts compilado; não é escaneado aqui.
//
// Este script complementa (não substitui) o teste estático
// src/lib/security/service-role-boundary.test.ts, que varre o CÓDIGO-FONTE
// (roda em todo `bun test src`, sem precisar de build). Este script varre o
// ARTEFATO gerado, exigido explicitamente pelo prompt operacional Q1.1.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const PUBLIC_DIR = join(process.cwd(), ".output", "public");
const FORBIDDEN: Array<{ label: string; pattern: RegExp }> = [
  { label: "identificador da service role key", pattern: /SUPABASE_SERVICE_ROLE_KEY/ },
  { label: "especificador do client admin", pattern: /integrations\/supabase\/client\.server/ },
  { label: "papel service_role citado no bundle do cliente", pattern: /\bservice_role\b/ },
];

if (!existsSync(PUBLIC_DIR)) {
  console.error(
    `❌ ${PUBLIC_DIR} não existe. Rode "bun run build" antes de "bun run scripts/build-secret-scan.ts".`,
  );
  process.exit(1);
}

const glob = new Glob("**/*.{js,mjs,html,css,map}");
const findings: Array<{ file: string; label: string }> = [];
let filesScanned = 0;

for (const rel of glob.scanSync({ cwd: PUBLIC_DIR })) {
  filesScanned++;
  const content = readFileSync(join(PUBLIC_DIR, rel), "utf8");
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(content)) {
      findings.push({ file: rel, label: rule.label });
    }
  }
}

console.log(`Arquivos escaneados em .output/public/: ${filesScanned}`);

if (findings.length > 0) {
  console.error("\n❌ Segredo/limite de service role encontrado no bundle do cliente:");
  for (const f of findings) {
    console.error(`  - ${f.file}: ${f.label}`);
  }
  process.exit(1);
}

console.log("✅ Nenhum identificador de service role encontrado em .output/public/ (bundle do cliente).");
process.exit(0);
