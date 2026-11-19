// Todo script que constrói um cliente Supabase precisa passar pelo guard
// compartilhado. Sem isto, a proteção depende de alguém lembrar — e o
// histórico desta base mostra o que acontece: dois scripts tinham guard
// PRÓPRIO, cada um comparando um prefixo de ref diferente fixado no código
// ("shlmzz" num, "shlm" no outro). Um prefixo de 4 caracteres casaria com
// projetos que não são produção, e nenhum dos dois seguia o guard testado.
//
// O teste é estático (lê os arquivos) pelo mesmo motivo do schema-parity:
// uma invariante que se verifica sozinha não precisa de disciplina.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const raiz = process.cwd();
const DIR = join(raiz, "scripts");

/**
 * Scripts que podem criar cliente sem o guard. Vazio hoje, e assim deve
 * continuar: entrar aqui exige justificativa escrita no próprio allowlist.
 */
const ALLOWLIST: Record<string, string> = {};

function scripts(): { nome: string; src: string }[] {
  return [...new Glob("*.ts").scanSync({ cwd: DIR })]
    .sort()
    .map((nome) => ({ nome, src: readFileSync(join(DIR, nome), "utf8") }));
}

/** Código sem comentários: um script pode EXPLICAR o guard sem usá-lo. */
function codigo(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
}

const criaCliente = (src: string) => /\bcreateClient\s*[<(]/.test(codigo(src));

describe("cobertura do guard nos scripts", () => {
  test("existe pelo menos um script que cria cliente (o teste não é vácuo)", () => {
    expect(scripts().filter((s) => criaCliente(s.src)).length).toBeGreaterThan(0);
  });

  for (const { nome, src } of scripts()) {
    if (!criaCliente(src)) continue;

    test(`${nome} importa e invoca requireStagingTarget`, () => {
      if (nome in ALLOWLIST) return;
      const c = codigo(src);
      // Harnesses exclusivamente locais usam uma fronteira mais restritiva:
      // API, DB e container exatos; guard testado contra alvos remotos e o demo preservado.
      if (["institutional-local.ts", "institutional-first-admin-proof.ts", "institutional-readback-proof.ts", "institutional-module-proof.ts", "institutional-learning-proof.ts", "institutional-approved-learning-readback.ts", "institutional-tenant.ts"].includes(nome)) {
        expect(/import\s*\{[^}]*requireInstitutionalLocalTarget[^}]*\}\s*from\s*["'][^"']*institutional-local-target["']/.test(c)).toBe(true);
        expect(/requireInstitutionalLocalTarget\s*\(/.test(c)).toBe(true);
        return;
      }
      expect({
        script: nome,
        importa: /import\s*\{[^}]*requireStagingTarget[^}]*\}\s*from\s*["'][^"']*staging-guard["']/.test(c),
        invoca: /requireStagingTarget\s*\(/.test(c),
      }).toEqual({ script: nome, importa: true, invoca: true });
    });
  }
});

describe("nenhum guard duplicado sobreviveu", () => {
  for (const { nome, src } of scripts()) {
    test(`${nome} não fixa ref de projeto nem guard próprio`, () => {
      const c = codigo(src);
      expect({
        script: nome,
        refFixado: /\bPRODUCTION_REF\b/.test(c),
        // Um ref de projeto Supabase tem 20 caracteres minúsculos.
        refLiteral: /["'][a-z]{20}["']/.test(c),
        urlReal: /https:\/\/[a-z0-9]{20}\.supabase\.co/i.test(c),
      }).toEqual({ script: nome, refFixado: false, refLiteral: false, urlReal: false });
    });
  }
});

describe("nomenclatura de credencial de staging padronizada", () => {
  for (const { nome, src } of scripts()) {
    test(`${nome} não usa a nomenclatura legada ANON_KEY / SERVICE_ROLE_KEY`, () => {
      const c = codigo(src);
      expect({
        script: nome,
        anon: /STAGING_SUPABASE_ANON_KEY/.test(c),
        serviceRole: /STAGING_SUPABASE_SERVICE_ROLE_KEY/.test(c),
      }).toEqual({ script: nome, anon: false, serviceRole: false });
    });

    test(`${nome} não expõe credencial privilegiada sob prefixo VITE_`, () => {
      expect({
        script: nome,
        exposta: /VITE_[A-Z_]*(SECRET|SERVICE_ROLE)/.test(codigo(src)),
      }).toEqual({ script: nome, exposta: false });
    });
  }
});
