// Prova de COMPORTAMENTO do preflight como processo real.
//
// Diferente de environment-contract.test.ts, que exercita a função pura, aqui
// o script é executado de verdade, com arquivos `.env` reais num diretório
// temporário. É o que prova a parte que a função pura não cobre: precedência
// entre `.env`, `.env.local` e `process.env`, leitura de argumento, e o código
// de saída que faz `dev`/`build` abortarem.
//
// O diretório é temporário e as credenciais são fictícias: o teste não pode
// depender do `.env.local` de quem o roda, nem vazar o ambiente real.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT = join(process.cwd(), "scripts", "environment-preflight.ts");

const REF_PROD = "pppppppppppppppppppp";
const REF_STAGING = "ssssssssssssssssssss";
const URL_PROD = `https://${REF_PROD}.supabase.co`;
const URL_STAGING = `https://${REF_STAGING}.supabase.co`;

/** `.env` versionado tal como o Lovable exige: público, sem VITALOS_*. */
const ENV_PRODUTIVO = [
  `SUPABASE_URL=${URL_PROD}`,
  "SUPABASE_PUBLISHABLE_KEY=chave-publica-ficticia",
  `VITE_SUPABASE_URL=${URL_PROD}`,
  "VITE_SUPABASE_PUBLISHABLE_KEY=chave-publica-ficticia",
  "VITE_FIBT_PILOT_ENABLED=false",
  "",
].join("\n");

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "vitalos-preflight-"));
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

interface Resultado {
  code: number;
  saida: string;
}

/**
 * Roda o preflight com ambiente CONTROLADO — não herdado. Herdar traria o
 * `.env` real da worktree pelo carregamento automático do bun, e o teste
 * passaria ou falharia pelo motivo errado.
 */
function preflight(args: string[], envLocal?: string): Resultado {
  writeFileSync(join(dir, ".env"), ENV_PRODUTIVO, "utf8");
  writeFileSync(join(dir, ".env.local"), envLocal ?? "", "utf8");

  const r = spawnSync("bun", ["run", SCRIPT, ...args], {
    cwd: dir,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      HOME: process.env.HOME,
      USERPROFILE: process.env.USERPROFILE,
      // Impede o bun de injetar o .env da worktree no processo filho.
      DOTENV_CONFIG_PATH: join(dir, ".env"),
    } as NodeJS.ProcessEnv,
  });

  return { code: r.status ?? -1, saida: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

describe("11. dev com apenas o .env produtivo e sem configuração local", () => {
  test("falha — não existe default versionado para o alvo de banco", () => {
    const r = preflight(["--runtime=local", "--allow-db=local,staging"]);
    expect(r.code).toBe(1);
    expect(r.saida).toContain("VITALOS_DB_TARGET ausente");
  });

  test("a recusa explica que a ausência de default é intencional", () => {
    const r = preflight(["--runtime=local", "--allow-db=local,staging"]);
    expect(r.saida).toContain("de propósito");
  });

  test("o `.env` produtivo sozinho nunca resolve para produção", () => {
    const r = preflight(["--runtime=local", "--allow-db=local,staging"]);
    expect(r.saida).not.toContain("banco=production");
  });
});

describe("12. dev com .env.local completo de staging", () => {
  const localStaging = [
    "VITALOS_DB_TARGET=staging",
    `SUPABASE_URL=${URL_STAGING}`,
    `VITE_SUPABASE_URL=${URL_STAGING}`,
    "",
  ].join("\n");

  test("passa e resolve para staging, não para o projeto do .env versionado", () => {
    const r = preflight(["--runtime=local", "--allow-db=local,staging"], localStaging);
    expect({ code: r.code, staging: r.saida.includes("banco=staging") }).toEqual({
      code: 0,
      staging: true,
    });
  });

  test(".env.local vence o .env versionado — o ref reportado é o de staging", () => {
    const r = preflight(["--runtime=local", "--allow-db=local,staging"], localStaging);
    expect(r.saida).toContain("ssss...ssss");
    expect(r.saida).not.toContain("pppp...pppp");
  });

  test("dev recusa production mesmo se alguém escrever isso no .env.local", () => {
    const r = preflight(
      ["--runtime=local", "--allow-db=local,staging"],
      "VITALOS_DB_TARGET=production\n",
    );
    expect(r.code).toBe(1);
    expect(r.saida).toContain("aceita VITALOS_DB_TARGET em [local, staging]");
  });
});

describe("13. divergência entre cliente e servidor continua bloqueada", () => {
  test("servidor em produção e navegador em staging é recusado", () => {
    const r = preflight(
      ["--runtime=local", "--allow-db=local,staging"],
      `VITALOS_DB_TARGET=staging\nVITE_SUPABASE_URL=${URL_STAGING}\n`,
    );
    // SUPABASE_URL fica no valor do .env versionado (produção); só a VITE_ foi
    // sobrescrita — exatamente o estado da validação visual da FIBT-1.
    expect(r.code).toBe(1);
    expect(r.saida).toContain("projetos DIFERENTES");
  });

  test("a recusa não imprime URL completa nem ref inteiro", () => {
    const r = preflight(
      ["--runtime=local", "--allow-db=local,staging"],
      `VITALOS_DB_TARGET=staging\nVITE_SUPABASE_URL=${URL_STAGING}\n`,
    );
    expect(r.saida).not.toContain(URL_PROD);
    expect(r.saida).not.toContain(REF_PROD);
    expect(r.saida).toContain("pppp...pppp");
  });
});

describe("contexto fixo dos comandos de build", () => {
  test("build de produção usa o .env versionado e resolve production", () => {
    const r = preflight(["--runtime=production", "--db=production"]);
    expect({ code: r.code, ok: r.saida.includes("runtime=production banco=production") }).toEqual({
      code: 0,
      ok: true,
    });
  });

  test("build:ci recusa o .env produtivo — exige URL inerte", () => {
    const r = preflight(["--runtime=ci", "--db=test"]);
    expect(r.code).toBe(1);
    expect(r.saida).toContain("exige URL inerte");
  });

  test("build:ci passa quando o ambiente traz URLs .invalid", () => {
    const r = preflight(
      ["--runtime=ci", "--db=test"],
      "SUPABASE_URL=https://ci.invalid\nVITE_SUPABASE_URL=https://ci.invalid\n",
    );
    expect({ code: r.code, inerte: r.saida.includes("projeto=(inerte)") }).toEqual({
      code: 0,
      inerte: true,
    });
  });

  test("preview é travado em staging — nunca resolve para production", () => {
    const r = preflight(["--runtime=preview", "--db=staging"]);
    expect(r.saida).not.toContain("banco=production");
  });

  test("LIMITE CONHECIDO: o contrato não distingue staging de produção pela URL", () => {
    // `preview → staging` aceita qualquer URL REMOTA, inclusive a de produção:
    // staging e produção têm a mesma natureza de URL, e distingui-las exigiria
    // um registro de refs conhecidos versionado no repo — exatamente o que se
    // evita, porque transforma identificador de ambiente em constante que
    // alguém copia. A proteção real aqui é operacional: quem roda `preview`
    // aponta staging no seu .env.local.
    //
    // O teste fixa esse limite em vez de escondê-lo: se um dia o contrato
    // passar a validar identidade de projeto, ele falha e a mudança fica
    // visível.
    const r = preflight(["--runtime=preview", "--db=staging"]);
    expect({ code: r.code, staging: r.saida.includes("banco=staging") }).toEqual({
      code: 0,
      staging: true,
    });
  });
});

describe("14-15. contexto declarado pelos comandos do package.json", () => {
  const scripts = (): Record<string, string> =>
    (JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    }).scripts;

  test("14. build:ci declara runtime ci e alvo test", () => {
    const s = scripts()["build:ci"]!;
    expect(s).toContain("--runtime=ci");
    expect(s).toContain("--db=test");
  });

  test("15. build produtivo declara runtime production e alvo production", () => {
    const s = scripts()["build"]!;
    expect(s).toContain("--runtime=production");
    expect(s).toContain("--db=production");
  });

  test("build é o contrato do Lovable: continua sendo o script `build`", () => {
    expect(scripts()).toHaveProperty("build");
    expect(scripts()["build"]).toContain("vite build");
  });

  test("dev e build:dev nunca aceitam production", () => {
    for (const nome of ["dev", "build:dev"]) {
      const s = scripts()[nome]!;
      expect({ nome, allow: s.includes("--allow-db=local,staging") }).toEqual({ nome, allow: true });
      expect({ nome, prod: s.includes("--db=production") }).toEqual({ nome, prod: false });
    }
  });

  test("todo comando de execução passa pelo preflight", () => {
    for (const nome of ["dev", "build", "build:ci", "build:dev", "preview"]) {
      expect({ nome, guardado: scripts()[nome]!.includes("preflight") }).toEqual({
        nome,
        guardado: true,
      });
    }
  });

  test("o CI roda build:ci, nunca o build produtivo do Lovable", () => {
    const wf = readFileSync(join(process.cwd(), ".github/workflows/gate.yml"), "utf8");
    expect(wf).toContain("bun run build:ci");
    expect(wf).not.toMatch(/run:\s*bun run build\s*$/m);
    expect(wf).toContain("VITALOS_RUNTIME_ENV: ci");
    expect(wf).toContain("VITALOS_DB_TARGET: test");
    expect(wf).toContain(".invalid");
  });
});
