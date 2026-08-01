#!/usr/bin/env bun
// Varredura de segredo em três superfícies, agora dentro do gate obrigatório.
//
// 1. ARTEFATO servido ao navegador (.output/public/) — o que de fato chega ao
//    usuário. É o alvo original desta varredura (Q1.1, item 5).
// 2. ARQUIVOS DE CONFIGURAÇÃO versionados — o achado P0 da onda de ambiente:
//    `.env` estava rastreado apontando para produção.
// 3. FONTES relevantes — credencial literal escrita direto no código.
//
// O artefato só existe depois de `bun run build`. Sem ele, as superfícies 2 e 3
// são varridas mesmo assim e o script avisa que a 1 foi pulada — assim `bun run
// gate` continua útil localmente sem exigir build. No CI, `--require-artifact`
// transforma essa ausência em falha, para que a superfície mais importante
// nunca seja pulada em silêncio justamente onde ninguém está olhando.
//
// Uso:
//   bun run scripts/build-secret-scan.ts
//   bun run scripts/build-secret-scan.ts --require-artifact   (CI, após build)
//
// Complementa (não substitui) src/lib/security/service-role-boundary.test.ts,
// que varre o código-fonte a cada `bun test src`.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const raiz = process.cwd();
const exigirArtefato = process.argv.includes("--require-artifact");

interface Regra {
  label: string;
  re: RegExp;
}

/** Regras do bundle do cliente: nada de service role pode atravessar. */
const REGRAS_ARTEFATO: Regra[] = [
  { label: "identificador da service role key", re: /SUPABASE_SERVICE_ROLE_KEY/ },
  { label: "identificador da secret key de staging", re: /STAGING_SUPABASE_SECRET_KEY/ },
  { label: "especificador do client admin", re: /integrations\/supabase\/client\.server/ },
  { label: "papel service_role citado no bundle do cliente", re: /\bservice_role\b/ },
  { label: "chave secreta Supabase (sb_secret_)", re: /\bsb_secret_[A-Za-z0-9_-]{6,}/ },
];

/**
 * Regras de configuração versionada: nenhum valor REAL, detectado por formato
 * e não por valor conhecido — escrever o ref de produção aqui para procurá-lo
 * o colocaria no repositório, que é o que se quer impedir.
 */
const REGRAS_CONFIG: Regra[] = [
  { label: "URL de projeto Supabase real", re: /https:\/\/[a-z0-9]{20}\.supabase\.co/i },
  { label: "project_ref de 20 caracteres", re: /\b[a-z]{20}\b/ },
  { label: "JWT real", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { label: "chave Supabase nova com corpo real", re: /\bsb_(publishable|secret)_[A-Za-z0-9_-]{10,}/ },
];

/** Regras de fonte: credencial literal, não menção a nome de variável. */
const REGRAS_FONTE: Regra[] = [
  { label: "JWT literal no código", re: /["'`]eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { label: "secret key literal no código", re: /["'`]sb_secret_[A-Za-z0-9_-]{6,}/ },
  { label: "publishable key literal no código", re: /["'`]sb_publishable_[A-Za-z0-9_-]{10,}/ },
  { label: "URL de projeto Supabase real no código", re: /https:\/\/[a-z0-9]{20}\.supabase\.co/i },
  {
    label: "secret de staging exposta com prefixo VITE_",
    re: /VITE_[A-Z_]*SECRET/,
  },
];

const ARQUIVOS_DE_CONFIG = [
  ".env.example",
  ".gitignore",
  ".lovable/project.json",
  ".github/workflows/gate.yml",
  "package.json",
  "vite.config.ts",
];

interface Achado {
  superficie: string;
  arquivo: string;
  label: string;
}

const achados: Achado[] = [];

function varrer(superficie: string, arquivo: string, conteudo: string, regras: Regra[]): void {
  for (const r of regras) {
    if (r.re.test(conteudo)) achados.push({ superficie, arquivo, label: r.label });
  }
}

// ─── Superfície 2: configuração versionada ───────────────────────────────────
let configVarridos = 0;
for (const rel of ARQUIVOS_DE_CONFIG) {
  const caminho = join(raiz, rel);
  if (!existsSync(caminho)) continue;
  configVarridos += 1;
  varrer("config", rel, readFileSync(caminho, "utf8"), REGRAS_CONFIG);
}

// ─── Superfície 3: fontes ────────────────────────────────────────────────────
//
// `src/integrations/**` é gerado pelo Lovable e legitimamente nomeia
// SUPABASE_SERVICE_ROLE_KEY (a variável, nunca o valor) — as regras de fonte
// procuram valor literal, então não há conflito. Testes ficam de fora: fixture
// com JWT sintético é uso legítimo.
const globFonte = new Glob("src/**/*.{ts,tsx}");
let fontesVarridas = 0;
for (const rel of globFonte.scanSync({ cwd: raiz })) {
  if (rel.includes(".test.")) continue;
  fontesVarridas += 1;
  varrer("fonte", rel, readFileSync(join(raiz, rel), "utf8"), REGRAS_FONTE);
}

const globScripts = new Glob("scripts/**/*.ts");
for (const rel of globScripts.scanSync({ cwd: raiz })) {
  fontesVarridas += 1;
  varrer("fonte", rel, readFileSync(join(raiz, rel), "utf8"), REGRAS_FONTE);
}

// ─── Superfície 1: artefato servido ao navegador ─────────────────────────────
const PUBLIC_DIR = join(raiz, ".output", "public");
let artefatoVarrido = 0;
const temArtefato = existsSync(PUBLIC_DIR);

if (temArtefato) {
  const glob = new Glob("**/*.{js,mjs,html,css,map}");
  for (const rel of glob.scanSync({ cwd: PUBLIC_DIR })) {
    artefatoVarrido += 1;
    varrer("artefato", rel, readFileSync(join(PUBLIC_DIR, rel), "utf8"), REGRAS_ARTEFATO);
  }
}

console.log(
  `Varredura: ${configVarridos} arquivo(s) de config · ${fontesVarridas} fonte(s) · ` +
    (temArtefato ? `${artefatoVarrido} arquivo(s) de artefato` : "artefato AUSENTE"),
);

if (!temArtefato && exigirArtefato) {
  console.error(
    `\n❌ --require-artifact: ${PUBLIC_DIR} não existe. Rode "bun run build" antes.`,
  );
  process.exit(1);
}

if (!temArtefato) {
  console.log('   (artefato pulado — rode "bun run build" para incluí-lo na varredura)');
}

if (achados.length > 0) {
  console.error("\n❌ Credencial ou identificador real encontrado:");
  for (const a of achados) console.error(`  - [${a.superficie}] ${a.arquivo}: ${a.label}`);
  process.exit(1);
}

console.log("✅ Nenhuma credencial nem identificador de projeto real encontrado.");
process.exit(0);
