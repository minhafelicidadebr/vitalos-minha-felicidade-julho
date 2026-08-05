// Contrato de implantação Wrangler do deployment HML (FIBT-HML-4D).
//
// Estes testes existem por causa de uma falha real: a config HML declarava
// `no_bundle: true` mas não declarava `rules`, e o Worker subiu com todos os
// arquivos presentes, imports corretos e multipart íntegro — e ainda assim
// falhou em runtime com `No such module`. A causa foi classificação de
// módulos ausente, não bundling. Os testes abaixo travam esse contrato.
//
// Deliberadamente NÃO dependem de nomes de chunk com hash (que mudam a cada
// build): validam relações semânticas — cobertura de glob, resolução de
// imports, e paridade de campos entre a config canônica e a derivada.

import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  stripJsonComments,
  deriveDeploymentConfig,
  INHERITED_DEPLOYMENT_FIELDS,
} from "./derive-private-wrangler-config";

const CANONICAL_PATH = join(process.cwd(), "wrangler.hml.jsonc");
const canonical = JSON.parse(stripJsonComments(readFileSync(CANONICAL_PATH, "utf8")));

/**
 * Converte um glob simples (só `**` e `*`) em RegExp — suficiente para os
 * globs do nitro. `**​/` casa zero ou mais diretórios, então `**​/*.mjs`
 * precisa casar tanto `index.mjs` (raiz) quanto `_ssr/a/b.mjs`.
 */
function globToRegExp(glob: string): RegExp {
  // O token vira o grupo de diretórios por ÚLTIMO, de propósito: esse grupo
  // termina em "*" (quantificador) e, se fosse inserido antes das
  // substituições de "*"/"**", se fundiria com o "*" do próprio glob —
  // transformando o glob em algo que exige ao menos um diretório e deixando
  // de casar um arquivo na raiz, como index.mjs.
  const TOKEN = "GLOBSTARSLASHTOKEN";
  const body = glob
    .split("**/")
    .join(TOKEN)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .split(TOKEN)
    .join("(?:[^/]+/)*");
  return new RegExp(`^${body}$`);
}
function matchesAnyGlob(path: string, globs: string[]): boolean {
  return globs.some((g) => globToRegExp(g).test(path));
}

describe("FIBT-HML-4D — contrato de descoberta de módulos (no_bundle + rules)", () => {
  test("1. no_bundle=true exige rules declarado (a falha original)", () => {
    if (canonical.no_bundle === true) {
      expect(Array.isArray(canonical.rules)).toBe(true);
      expect(canonical.rules.length).toBeGreaterThan(0);
    }
  });

  test("2. os globs cobrem os módulos .mjs e .js que o nitro emite", () => {
    const globs = canonical.rules.flatMap((r: { globs: string[] }) => r.globs);
    for (const sample of [
      "index.mjs",
      "_libs/h3+rou3+srvx.mjs", // nome com "+" — precisa casar sem tratamento especial
      "_ssr/start-ABC123.mjs",
      "_chunks/ssr-renderer.mjs",
      "_libs/@radix-ui/react-dialog+[...].mjs",
      "nested/deep/module.js",
    ]) {
      expect(matchesAnyGlob(sample, globs)).toBe(true);
    }
  });

  test("3. o type é reconhecido como módulo ES pelo Wrangler", () => {
    for (const rule of canonical.rules) expect(rule.type).toBe("ESModule");
  });

  test("4. a config derivada preserva rules (não pode ser perdida na derivação)", () => {
    const derived = deriveDeploymentConfig({
      canonical,
      runtimeVars: { EXEMPLO: "valor-sintetico" },
      artifactDir: "/tmp/artefato-sintetico",
    });
    expect(derived.rules).toEqual(canonical.rules);
    expect(derived.no_bundle).toBe(true);
  });

  test("4b. derivar de uma canônica SEM rules falha em vez de degradar em silêncio", () => {
    const semRules = { ...canonical };
    delete (semRules as Record<string, unknown>).rules;
    expect(() =>
      deriveDeploymentConfig({ canonical: semRules, runtimeVars: {}, artifactDir: "/tmp/x" }),
    ).toThrow(/rules/);
  });

  test("5. main fica dentro do escopo coberto pelos globs", () => {
    const derived = deriveDeploymentConfig({
      canonical,
      runtimeVars: {},
      artifactDir: "/tmp/artefato-sintetico",
    });
    const mainRelative = String(derived.main).split("/server/")[1]!;
    const globs = canonical.rules.flatMap((r: { globs: string[] }) => r.globs);
    expect(matchesAnyGlob(mainRelative, globs)).toBe(true);
  });

  test("6. preview_urls permanece false na canônica e na derivada", () => {
    expect(canonical.preview_urls).toBe(false);
    const derived = deriveDeploymentConfig({ canonical, runtimeVars: {}, artifactDir: "/tmp/x" });
    expect(derived.preview_urls).toBe(false);
  });

  test("7. nenhuma route, custom domain, cron ou binding extra é introduzido", () => {
    for (const proibido of [
      "routes",
      "route",
      "custom_domains",
      "triggers",
      "crons",
      "kv_namespaces",
      "d1_databases",
      "r2_buckets",
      "queues",
      "services",
      "durable_objects",
    ]) {
      expect(canonical).not.toHaveProperty(proibido);
    }
    const derived = deriveDeploymentConfig({ canonical, runtimeVars: {}, artifactDir: "/tmp/x" });
    for (const proibido of ["routes", "custom_domains", "triggers"]) {
      expect(derived).not.toHaveProperty(proibido);
    }
  });

  test("8/9. NITRO_WRANGLER_DEPLOYMENT_CONTRACT — campos críticos batem com o config do nitro", () => {
    // O wrangler.json do nitro só existe depois de um build; quando ausente,
    // o teste confirma o contrato pelo lado canônico e não falha o CI.
    const nitroPath = join(process.cwd(), ".output", "server", "wrangler.json");
    if (!existsSync(nitroPath)) {
      expect(canonical.no_bundle).toBe(true);
      expect(Array.isArray(canonical.rules)).toBe(true);
      return;
    }
    const nitro = JSON.parse(readFileSync(nitroPath, "utf8"));

    // Devem ser IGUAIS ao que o nitro produz — divergir aqui foi a causa raiz.
    expect(canonical.rules).toEqual(nitro.rules);
    expect(canonical.no_bundle).toBe(nitro.no_bundle);
    expect(canonical.compatibility_flags).toEqual(nitro.compatibility_flags);
    expect(canonical.assets.binding).toBe(nitro.assets.binding);

    // Campo crítico novo no nitro sem classificação nossa = falha explícita.
    const CLASSIFICADOS = new Set([
      "main", // reapontado: caminho relativo à raiz do repo, não a .output/server
      "name", // divergência intencional (nitro deriva do nome da pasta)
      "compatibility_date", // pinado deliberadamente
      "assets", // directory reapontado pelo mesmo motivo de `main`
      "compatibility_flags",
      "no_bundle",
      "rules",
    ]);
    const naoClassificados = Object.keys(nitro).filter((k) => !CLASSIFICADOS.has(k));
    expect(naoClassificados).toEqual([]);
  });
});

describe("FIBT-HML-4D — sanidade do artefato quando presente", () => {
  const serverDir = join(process.cwd(), ".output", "server");

  test("todo módulo server é classificável pelos globs; nenhum asset público entra como módulo", () => {
    if (!existsSync(serverDir)) return; // sem build local, nada a verificar

    const globs = canonical.rules.flatMap((r: { globs: string[] }) => r.globs);
    const walk = (dir: string, base = dir, out: string[] = []): string[] => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, base, out);
        else out.push(full.slice(base.length + 1).split("\\").join("/"));
      }
      return out;
    };

    const files = walk(serverDir);
    const modules = files.filter((f) => f.endsWith(".mjs") || f.endsWith(".js"));
    expect(modules.length).toBeGreaterThan(0);
    for (const m of modules) expect(matchesAnyGlob(m, globs)).toBe(true);

    // Os globs não podem arrastar coisas que não são módulos server-side.
    for (const f of files.filter((x) => !x.endsWith(".mjs") && !x.endsWith(".js"))) {
      expect(matchesAnyGlob(f, globs)).toBe(false);
    }
    expect(files.some((f) => f.endsWith(".map"))).toBe(false);
    expect(files.some((f) => f.includes("node_modules/"))).toBe(false);
  });

  test("todos os imports internos do artefato resolvem para um arquivo existente", () => {
    if (!existsSync(serverDir)) return;

    const walk = (dir: string, base = dir, out: string[] = []): string[] => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, base, out);
        else out.push(full.slice(base.length + 1).split("\\").join("/"));
      }
      return out;
    };
    const files = new Set(walk(serverDir));
    const IMPORT_RE = /\b(?:import|export)\s+(?:[^'"]*?\sfrom\s*)?["'](\.[^"']+)["']/g;

    const naoResolvidos: string[] = [];
    for (const rel of files) {
      if (!rel.endsWith(".mjs") && !rel.endsWith(".js")) continue;
      const src = readFileSync(join(serverDir, rel), "utf8");
      IMPORT_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = IMPORT_RE.exec(src))) {
        const dirOfFile = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
        const target = join(dirOfFile, m[1]!).split("\\").join("/");
        if (!files.has(target)) naoResolvidos.push(`${rel} -> ${m[1]}`);
      }
    }
    expect(naoResolvidos).toEqual([]);
  });
});
