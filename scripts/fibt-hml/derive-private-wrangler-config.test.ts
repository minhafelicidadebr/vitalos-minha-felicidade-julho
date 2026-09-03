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
  REQUIRED_RUNTIME_VARS,
  OPTIONAL_RUNTIME_VARS,
} from "./derive-private-wrangler-config";

const CANONICAL_PATH = join(process.cwd(), "wrangler.hml.jsonc");
const canonical = JSON.parse(stripJsonComments(readFileSync(CANONICAL_PATH, "utf8")));

/** Um conjunto completo e válido de runtime vars sintéticas — usado como
 *  ponto de partida nos testes que removem/corrompem exatamente uma
 *  variável, em vez de reconstruir o objeto inteiro em cada teste. */
function validSyntheticRuntimeVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const name of REQUIRED_RUNTIME_VARS) vars[name] = "valor-sintetico";
  vars.VITE_FIBT_HML_ENABLED = "true"; // única com valor exigido, não arbitrário
  return vars;
}

/**
 * Converte um glob simples (só "**" e "*") em RegExp — suficiente para os
 * globs do nitro. O padrão "**" seguido de barra casa zero ou mais
 * diretórios, então "index.mjs" (na raiz) e "_ssr/a/b.mjs" (aninhado)
 * precisam casar ambos.
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
      runtimeVars: validSyntheticRuntimeVars(),
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
      runtimeVars: validSyntheticRuntimeVars(),
      artifactDir: "/tmp/artefato-sintetico",
    });
    const mainRelative = String(derived.main).split("/server/")[1]!;
    const globs = canonical.rules.flatMap((r: { globs: string[] }) => r.globs);
    expect(matchesAnyGlob(mainRelative, globs)).toBe(true);
  });

  test("6. preview_urls permanece false na canônica e na derivada", () => {
    expect(canonical.preview_urls).toBe(false);
    const derived = deriveDeploymentConfig({
      canonical,
      runtimeVars: validSyntheticRuntimeVars(),
      artifactDir: "/tmp/x",
    });
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
    const derived = deriveDeploymentConfig({
      canonical,
      runtimeVars: validSyntheticRuntimeVars(),
      artifactDir: "/tmp/x",
    });
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

describe("FIBT-HML-5D — contrato de runtime vars (VITE_FIBT_HML_ENABLED também é server-side)", () => {
  test("1. o contrato exige exatamente 17 runtime vars", () => {
    // 17, não 16: o diagnóstico original desta rodada só nomeou
    // VITE_FIBT_HML_ENABLED. Escrever o teste "8" abaixo (varredura de
    // process.env nos boundaries .server.ts) encontrou uma segunda var
    // com o mesmo defeito, VITE_SUPABASE_URL — não corrigi-la também
    // deixaria a V3 travar no próximo gate (HML_BROWSER_PROJECT_REF_MISSING)
    // assim que o primeiro fosse resolvido.
    expect(REQUIRED_RUNTIME_VARS.length).toBe(17);
    expect(REQUIRED_RUNTIME_VARS).toContain("VITE_FIBT_HML_ENABLED");
    expect(REQUIRED_RUNTIME_VARS).toContain("VITE_SUPABASE_URL");
  });

  test("2. runtime vars completas e válidas derivam sem erro", () => {
    expect(() =>
      deriveDeploymentConfig({
        canonical,
        runtimeVars: validSyntheticRuntimeVars(),
        artifactDir: "/tmp/artefato-sintetico",
      }),
    ).not.toThrow();
  });

  test("3. VITE_FIBT_HML_ENABLED ausente do runtime falha fechado (a falha real do FIBT-HML-5C)", () => {
    const vars = validSyntheticRuntimeVars();
    delete vars.VITE_FIBT_HML_ENABLED;
    expect(() =>
      deriveDeploymentConfig({ canonical, runtimeVars: vars, artifactDir: "/tmp/x" }),
    ).toThrow(/VITE_FIBT_HML_ENABLED/);
  });

  test('4. VITE_FIBT_HML_ENABLED diferente de "true" falha fechado', () => {
    for (const valorErrado of ["", "1", " true", "TRUE", "false", "0"]) {
      const vars = { ...validSyntheticRuntimeVars(), VITE_FIBT_HML_ENABLED: valorErrado };
      expect(() =>
        deriveDeploymentConfig({ canonical, runtimeVars: vars, artifactDir: "/tmp/x" }),
      ).toThrow(/VITE_FIBT_HML_ENABLED/);
    }
  });

  test("4b. valor null (não apenas string vazia) falha fechado, sem crashar com TypeError", () => {
    // Achado na revisão adversarial: `"chave" in obj` é true mesmo quando o
    // valor é null (só falso quando a CHAVE não existe). Sem checar o tipo
    // primeiro, `.trim()` num null lançaria TypeError em vez do erro
    // fail-closed esperado — um JSON de runtime vars com `"X": null` (erro
    // humano plausível ao editar à mão) crasharia de um jeito confuso.
    const vars = { ...validSyntheticRuntimeVars() } as Record<string, unknown>;
    vars.VITE_FIBT_HML_ENABLED = null;
    expect(() =>
      deriveDeploymentConfig({
        canonical,
        runtimeVars: vars as Record<string, string>,
        artifactDir: "/tmp/x",
      }),
    ).toThrow(/VITE_FIBT_HML_ENABLED/);
  });

  test("5. presente no build env mas ausente do runtime env ainda falha (build e runtime são objetos distintos)", () => {
    // Simula exatamente o bug real: build.hml.private.env tinha a variável,
    // mas o objeto que vira `vars` no upload (runtime.hml.private.json) não
    // — o derivador só enxerga o segundo, nunca o primeiro.
    const buildEnv = { VITE_FIBT_HML_ENABLED: "true" };
    const runtimeVarsSemAVariavel = validSyntheticRuntimeVars();
    delete runtimeVarsSemAVariavel.VITE_FIBT_HML_ENABLED;
    expect(buildEnv.VITE_FIBT_HML_ENABLED).toBe("true"); // build tinha, sim
    expect(() =>
      deriveDeploymentConfig({
        canonical,
        runtimeVars: runtimeVarsSemAVariavel,
        artifactDir: "/tmp/x",
      }),
    ).toThrow(/VITE_FIBT_HML_ENABLED/);
  });

  test("6. cada uma das 16 vars obrigatórias, se ausente isoladamente, falha fechado", () => {
    for (const nomeRemovido of REQUIRED_RUNTIME_VARS) {
      const vars = validSyntheticRuntimeVars();
      delete vars[nomeRemovido];
      expect(() =>
        deriveDeploymentConfig({ canonical, runtimeVars: vars, artifactDir: "/tmp/x" }),
      ).toThrow(new RegExp(nomeRemovido));
    }
  });

  test("7. a documentação não classifica mais VITE_FIBT_HML_ENABLED como só-cliente", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/fibt-hml/CLOUDFLARE_HML_DEPLOYMENT.md"),
      "utf8",
    );
    expect(doc).not.toMatch(/VITE_FIBT_HML_ENABLED[\s\S]{0,80}só liga o banner no cliente/);
    // E precisa dizer explicitamente que também é server-side.
    expect(doc).toMatch(/VITE_FIBT_HML_ENABLED[\s\S]{0,400}server-side/);
  });

  test("8. toda variável lida via process.env pelos boundaries HML .server.ts está no contrato de runtime vars", () => {
    // Escaneia os módulos SERVER-ONLY (sufixo .server.ts — a própria
    // convenção deste repo para "seguro só em servidor, importável com
    // process.env real") e confirma que cada nome lido está coberto por
    // REQUIRED_RUNTIME_VARS, OPTIONAL_RUNTIME_VARS, ou é o único secret
    // conhecido (entregue por --secrets-file, nunca por `vars`).
    //
    // hml-frontend-guard.ts é DELIBERADAMENTE excluído: não tem sufixo
    // .server.ts, e seu único call site real (resolveHmlMode em
    // convite.$token.tsx) passa `import.meta.env`, não `process.env` — o
    // Vite substitui isso estaticamente no build, então os nomes que esse
    // arquivo lê não precisam existir como runtime var do Worker. Incluí-lo
    // aqui produziria falso positivo (confirmado: foi assim que
    // VITE_FIBT_HML_PROJECT_REF apareceu na primeira versão deste teste).
    const KNOWN_SECRET_NAMES = new Set(["SUPABASE_SERVICE_ROLE_KEY"]);
    const boundaryFiles = [
      "src/lib/fibt-hml/hml-backend-boundary.server.ts",
      "src/lib/fibt-hml/hml-deployment-boundary.server.ts",
      "src/lib/fibt-hml/cloudflare-access-jwt.server.ts",
    ];
    const ENV_READ_RE = /\benv\.([A-Z][A-Z0-9_]*)\b/g;
    const naoDeclaradas: string[] = [];
    for (const rel of boundaryFiles) {
      const full = join(process.cwd(), rel);
      if (!existsSync(full)) continue; // arquivo pode não existir nesta base ainda
      const src = readFileSync(full, "utf8");
      ENV_READ_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = ENV_READ_RE.exec(src))) {
        const name = m[1]!;
        const declarada =
          (REQUIRED_RUNTIME_VARS as readonly string[]).includes(name) ||
          (OPTIONAL_RUNTIME_VARS as readonly string[]).includes(name) ||
          KNOWN_SECRET_NAMES.has(name);
        if (!declarada && !naoDeclaradas.includes(name)) naoDeclaradas.push(name);
      }
    }
    expect(naoDeclaradas).toEqual([]);
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
        else
          out.push(
            full
              .slice(base.length + 1)
              .split("\\")
              .join("/"),
          );
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
        else
          out.push(
            full
              .slice(base.length + 1)
              .split("\\")
              .join("/"),
          );
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
  }, 30_000);
});
