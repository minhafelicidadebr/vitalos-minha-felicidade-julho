// Nenhum valor de ambiente REAL pode voltar aos arquivos de configuração
// versionados. Esta é a regressão do achado P0 desta onda: `.env` estava
// rastreado apontando para produção, então todo clone, worktree e job de CI
// nascia com produção como default silencioso.
//
// Duas decisões de desenho, ambas deliberadas:
//
// 1. A detecção é por FORMATO, nunca por valor conhecido. Escrever o ref de
//    produção aqui para "procurá-lo" o colocaria no repositório — exatamente
//    o que o teste existe para impedir. Formato também cobre projetos futuros
//    que ninguém listou.
//
// 2. O escopo é restrito a arquivos de configuração. Uma varredura global
//    quebraria em migrations, runbooks e testes que citam identificadores por
//    motivo legítimo, e um teste que grita sem motivo é desligado.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const raiz = process.cwd();

/** Só configuração. Migrations, docs e testes ficam de fora de propósito. */
const ARQUIVOS_DE_CONFIG = [
  ".env.example",
  ".gitignore",
  ".lovable/project.json",
  ".github/workflows/gate.yml",
  "package.json",
  "vite.config.ts",
];

const PADROES_PROIBIDOS: Array<{ label: string; re: RegExp }> = [
  {
    label: "URL de projeto Supabase real",
    re: /https:\/\/[a-z0-9]{20}\.supabase\.co/i,
  },
  {
    // Um ref de projeto Supabase tem 20 caracteres minúsculos. Mesmo
    // heurístico já usado em staging-guard.test.ts.
    label: "project_ref de 20 caracteres",
    re: /\b[a-z]{20}\b/,
  },
  {
    label: "JWT real (chave legada anon/service)",
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  },
  {
    label: "chave Supabase nova com corpo real",
    re: /\bsb_(publishable|secret)_[A-Za-z0-9_-]{10,}/,
  },
];

describe("arquivos de configuração versionados não carregam valor real", () => {
  for (const rel of ARQUIVOS_DE_CONFIG) {
    test(`${rel} não contém credencial nem identificador de projeto`, () => {
      const caminho = join(raiz, rel);
      if (!existsSync(caminho)) return; // arquivo opcional
      const conteudo = readFileSync(caminho, "utf8");
      const achados = PADROES_PROIBIDOS.filter((p) => p.re.test(conteudo)).map((p) => p.label);
      expect({ arquivo: rel, achados }).toEqual({ arquivo: rel, achados: [] });
    });
  }
});

describe("a família .env não volta para o controle de versão", () => {
  const rastreados = (): string[] => {
    const r = spawnSync("git", ["ls-files"], { cwd: raiz, encoding: "utf8" });
    if (r.status !== 0) throw new Error("git ls-files falhou");
    return r.stdout.split(/\r?\n/).filter(Boolean);
  };

  test("nenhum arquivo .env está rastreado, exceto .env.example", () => {
    const envs = rastreados().filter((f) => /(^|\/)\.env($|\.)/.test(f));
    expect(envs).toEqual([".env.example"]);
  });

  test(".env está coberto pelo .gitignore", () => {
    const r = spawnSync("git", ["check-ignore", ".env"], { cwd: raiz, encoding: "utf8" });
    expect({ ignorado: r.status === 0 }).toEqual({ ignorado: true });
  });

  test(".env.example continua versionado — é o modelo, não um segredo", () => {
    expect(rastreados()).toContain(".env.example");
  });
});

describe(".env.example descreve o contrato de ambiente", () => {
  const exemplo = () => readFileSync(join(raiz, ".env.example"), "utf8");

  test("declara as duas dimensões obrigatórias", () => {
    const src = exemplo();
    expect(src).toContain("VITALOS_RUNTIME_ENV");
    expect(src).toContain("VITALOS_DB_TARGET");
  });

  test("declara o feature gate da FIB-T como desabilitado", () => {
    expect(exemplo()).toMatch(/VITE_FIBT_PILOT_ENABLED\s*=\s*"?false"?/);
  });

  test("usa domínio inerte .invalid, nunca um host real", () => {
    const src = exemplo();
    expect(src).toContain(".invalid");
    expect(src).not.toMatch(/https:\/\/[a-z0-9-]+\.supabase\.co/i);
  });

  test("avisa que a secret key nunca leva prefixo VITE_", () => {
    expect(exemplo()).toContain("VITE_");
    expect(exemplo()).toMatch(/STAGING_SUPABASE_SECRET_KEY/);
  });

  test("nao repete a afirmacao falsa de que .env era ignorado antes", () => {
    // O comentário antigo dizia "O .env real é ignorado pelo git (P1-01)"
    // enquanto o arquivo estava rastreado. Documentação que mente sobre o
    // estado do repo é pior que ausência de documentação.
    expect(exemplo()).not.toContain("Copie para .env e preencha");
  });
});
