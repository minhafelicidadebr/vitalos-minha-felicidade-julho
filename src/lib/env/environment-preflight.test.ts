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

/**
 * `.env` versionado tal como o Lovable exige: público, com identidade de
 * PRODUÇÃO declarada (é o único ref que tem default versionado — de
 * propósito, ver environment-contract.ts). Nunca VITALOS_RUNTIME_ENV,
 * VITALOS_DB_TARGET nem VITALOS_STAGING_PROJECT_REF.
 */
const ENV_PRODUTIVO = [
  `SUPABASE_URL=${URL_PROD}`,
  "SUPABASE_PUBLISHABLE_KEY=chave-publica-ficticia",
  `VITE_SUPABASE_URL=${URL_PROD}`,
  "VITE_SUPABASE_PUBLISHABLE_KEY=chave-publica-ficticia",
  "VITE_FIBT_PILOT_ENABLED=false",
  `VITALOS_PRODUCTION_PROJECT_REF=${REF_PROD}`,
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
 *
 * `extra` injeta variáveis de PROCESSO (não de arquivo) — é como simular o
 * ambiente que o Lovable injeta em todo container do projeto (editor,
 * preview, build gerenciado), sem depender do Lovable de verdade.
 */
function preflight(args: string[], envLocal?: string, extra?: Record<string, string>): Resultado {
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
      ...extra,
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
    `VITALOS_STAGING_PROJECT_REF=${REF_STAGING}`,
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

  test("preview sem VITALOS_STAGING_PROJECT_REF continua falhando", () => {
    // Só o `.env` produtivo (com VITALOS_PRODUCTION_PROJECT_REF, sem o par de
    // staging) e nenhum .env.local: preview exige staging, e a máquina não
    // declarou identidade nenhuma para staging.
    const r = preflight(["--runtime=preview", "--db=staging"]);
    expect(r.code).toBe(1);
    expect(r.saida).toContain("exige VITALOS_STAGING_PROJECT_REF declarado");
  });

  test("LIMITE FECHADO: preview com URL de produção e VITALOS_STAGING_PROJECT_REF declarado não engana mais o contrato", () => {
    // Esta é a vulnerabilidade que esta correção fecha: antes, `preview →
    // staging` aceitava qualquer URL remota — inclusive a de produção —
    // desde que cliente e servidor concordassem entre si. Agora, mesmo
    // declarando VITALOS_STAGING_PROJECT_REF, se a URL efetiva continuar
    // sendo a de PRODUÇÃO (herdada do .env versionado, sem override local
    // das URLs), o preflight recusa por identidade não bater.
    const r = preflight(
      ["--runtime=preview", "--db=staging"],
      `VITALOS_STAGING_PROJECT_REF=${REF_STAGING}\n`, // declara staging, mas não sobrescreve a URL
    );
    expect(r.code).toBe(1);
    expect(r.saida).toContain("VITALOS_STAGING_PROJECT_REF declara");
  });

  test("preview com staging corretamente configurado → PASS", () => {
    const r = preflight(
      ["--runtime=preview", "--db=staging"],
      [
        `SUPABASE_URL=${URL_STAGING}`,
        `VITE_SUPABASE_URL=${URL_STAGING}`,
        `VITALOS_STAGING_PROJECT_REF=${REF_STAGING}`,
        "",
      ].join("\n"),
    );
    expect({ code: r.code, staging: r.saida.includes("banco=staging") }).toEqual({
      code: 0,
      staging: true,
    });
    expect(r.saida).not.toContain("banco=production");
  });
});

describe("regressão P0 — ambiente gerenciado nunca promove produção", () => {
  // Um commit do workspace Lovable (528106c, gpt-engineer-app[bot]) introduziu
  // `lovableManaged = Boolean(env.LOVABLE_PROJECT_ID || env.LOVABLE_SANDBOX)`
  // que SOBRESCREVIA runtime/dbTarget/allow-db para production/production/
  // undefined, ignorando os argumentos explícitos que dev/build:dev/preview
  // declaram. Chegou a `main` sem PR e sem CI verde. Estes testes travam o
  // EFEITO da regressão, não o nome das duas variáveis — mencioná-las em
  // teste ou documentação continua permitido; o que não pode voltar é uma
  // variável de ambiente, qualquer que seja, promovendo runtime/db por si só.

  const localOk = "VITALOS_DB_TARGET=local\nSUPABASE_URL=http://localhost:9\nVITE_SUPABASE_URL=http://localhost:9\n";

  test("1. LOVABLE_PROJECT_ID definido não altera runtime", () => {
    const r = preflight(["--runtime=local", "--allow-db=local,staging"], localOk, {
      LOVABLE_PROJECT_ID: "algum-projeto-lovable",
    });
    expect(r.saida).toContain("runtime=local");
    expect(r.saida).not.toContain("runtime=production");
  });

  test("2. LOVABLE_SANDBOX definido não altera runtime", () => {
    const r = preflight(["--runtime=local", "--allow-db=local,staging"], localOk, {
      LOVABLE_SANDBOX: "1",
    });
    expect(r.saida).toContain("runtime=local");
    expect(r.saida).not.toContain("runtime=production");
  });

  test("3. as duas variáveis juntas também não alteram runtime", () => {
    const r = preflight(["--runtime=local", "--allow-db=local,staging"], localOk, {
      LOVABLE_PROJECT_ID: "algum-projeto-lovable",
      LOVABLE_SANDBOX: "1",
    });
    expect(r.saida).toContain("runtime=local");
    expect(r.saida).not.toContain("runtime=production");
  });

  test("4. build:dev (argumentos reais do package.json) continua local mesmo com LOVABLE_PROJECT_ID", () => {
    const r = preflight(["--runtime=local", "--allow-db=local,staging"], localOk, {
      LOVABLE_PROJECT_ID: "algum-projeto-lovable",
    });
    expect({ code: r.code, runtime: r.saida.includes("runtime=local") }).toEqual({
      code: 0,
      runtime: true,
    });
  });

  test("5. preview (argumentos reais do package.json) continua preview→staging mesmo com LOVABLE_SANDBOX", () => {
    const r = preflight(
      ["--runtime=preview", "--db=staging"],
      [
        `SUPABASE_URL=${URL_STAGING}`,
        `VITE_SUPABASE_URL=${URL_STAGING}`,
        `VITALOS_STAGING_PROJECT_REF=${REF_STAGING}`,
        "",
      ].join("\n"),
      { LOVABLE_SANDBOX: "1" },
    );
    expect({ code: r.code, staging: r.saida.includes("banco=staging") }).toEqual({
      code: 0,
      staging: true,
    });
    expect(r.saida).not.toContain("banco=production");
  });

  test("6. LOVABLE_PROJECT_ID com URLs produtivas (herdadas do .env) não transforma build:dev em production", () => {
    // Sem .env.local: só o .env produtivo (URL_PROD, sem VITALOS_DB_TARGET) —
    // exatamente o cenário em que a regressão promovia silenciosamente para
    // production. O comportamento correto é falhar do MESMO jeito que sem
    // LOVABLE_PROJECT_ID: VITALOS_DB_TARGET ausente, nunca "banco=production".
    const r = preflight(["--runtime=local", "--allow-db=local,staging"], undefined, {
      LOVABLE_PROJECT_ID: "algum-projeto-lovable",
    });
    expect(r.code).toBe(1);
    expect(r.saida).toContain("VITALOS_DB_TARGET ausente");
    expect(r.saida).not.toContain("banco=production");
  });

  test("7. LOVABLE_SANDBOX com URLs produtivas não transforma build:dev em production", () => {
    const r = preflight(["--runtime=local", "--allow-db=local,staging"], undefined, {
      LOVABLE_SANDBOX: "1",
    });
    expect(r.code).toBe(1);
    expect(r.saida).toContain("VITALOS_DB_TARGET ausente");
    expect(r.saida).not.toContain("banco=production");
  });

  test("8. argumentos explícitos nunca são sobrescritos por variável LOVABLE_*", () => {
    // --runtime=local é o argumento; LOVABLE_PROJECT_ID não pode vencê-lo.
    const r = preflight(["--runtime=local", "--allow-db=local,staging"], localOk, {
      LOVABLE_PROJECT_ID: "x",
    });
    expect(r.saida).toContain("runtime=local");
  });

  test("9. produção só é aceita pelo comando produtivo explícito (--runtime=production --db=production)", () => {
    const semLovable = preflight(["--runtime=production", "--db=production"]);
    expect(semLovable.saida).toContain("runtime=production");

    // build:dev e preview, mesmo com as duas variáveis LOVABLE_* juntas,
    // nunca alcançam "runtime=production" — só o comando produtivo alcança.
    const comLovableBuildDev = preflight(["--runtime=local", "--allow-db=local,staging"], localOk, {
      LOVABLE_PROJECT_ID: "x",
      LOVABLE_SANDBOX: "1",
    });
    expect(comLovableBuildDev.saida).not.toContain("runtime=production");
  });

  test("10. nenhuma variável de ambiente genérica (não só as duas nomeadas) promove production/production", () => {
    // Prova mais ampla que 1-3: uma variável de nome PARECIDO, mas não
    // reconhecida, também não pode ter efeito algum — não existe mecanismo
    // genérico de "ambiente confiável" além de VITALOS_RUNTIME_ENV/
    // VITALOS_DB_TARGET declarados explicitamente.
    const r = preflight(["--runtime=local", "--allow-db=local,staging"], localOk, {
      LOVABLE_MANAGED: "1",
      LOVABLE_CLOUD: "1",
      LOVABLE_WORKSPACE_ID: "x",
    });
    expect(r.saida).toContain("runtime=local");
    expect(r.saida).not.toContain("runtime=production");
  });
});

describe("proteção estática — o bypass não pode voltar ao preflight", () => {
  // Escopo deliberadamente restrito ao COMPORTAMENTO do script, não ao nome
  // das variáveis: documentação e os próprios testes acima mencionam
  // LOVABLE_PROJECT_ID/LOVABLE_SANDBOX de propósito, para provar a rejeição.
  // O que este teste proíbe é o script usá-las para DEFINIR ou SOBRESCREVER
  // runtime, dbTarget ou allow-db.
  const codigo = () => readFileSync(SCRIPT, "utf8");

  test("environment-preflight.ts não lê LOVABLE_PROJECT_ID nem LOVABLE_SANDBOX", () => {
    const src = codigo();
    expect(src).not.toMatch(/env\.LOVABLE_PROJECT_ID/);
    expect(src).not.toMatch(/env\.LOVABLE_SANDBOX/);
  });

  test("nenhuma variável de ambiente fora de VITALOS_RUNTIME_ENV/VITALOS_DB_TARGET define runtime ou dbTarget", () => {
    const src = codigo();
    // As únicas fontes de runtime/dbTarget além do argumento --runtime/--db
    // têm que continuar sendo exatamente estas duas variáveis do contrato.
    const fontesRuntime = [...src.matchAll(/const runtime = ([^;]+);/g)].map((m) => m[1]);
    const fontesDbTarget = [...src.matchAll(/const dbTarget = ([^;]+);/g)].map((m) => m[1]);
    expect(fontesRuntime.every((f) => f!.includes("env.VITALOS_RUNTIME_ENV"))).toBe(true);
    expect(fontesDbTarget.every((f) => f!.includes("env.VITALOS_DB_TARGET") || f!.includes("dbFixo"))).toBe(true);
    expect(src).not.toMatch(/lovableManaged/);
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

  // Exceção explícita do sandbox do Lovable (commit c476aa7, 10/11/2026, coautoria do
  // founder): o Lovable executa `dev` e `build:dev` contra o próprio Lovable Cloud,
  // onde o preflight local recusaria o alvo. O desenvolvimento local guardado usa
  // `dev:checked`. Os valores ficam fixados: qualquer mudança nesses dois scripts
  // volta a exigir revisão.
  const LOVABLE_SANDBOX: Record<string, string> = {
    dev: "vite dev",
    "build:dev": "vite build --mode development",
  };

  test("exceção do sandbox do Lovable continua exatamente a registrada", () => {
    for (const [nome, valor] of Object.entries(LOVABLE_SANDBOX)) {
      expect({ nome, valor: scripts()[nome] }).toEqual({ nome, valor });
    }
  });

  test("dev:checked nunca aceita production", () => {
    const s = scripts()["dev:checked"]!;
    expect(s).toContain("preflight");
    expect(s).toContain("--allow-db=local,staging");
    expect(s).not.toContain("--db=production");
  });

  test("todo comando de execução fora do sandbox do Lovable passa pelo preflight", () => {
    for (const nome of ["dev:checked", "build", "build:ci", "preview"]) {
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
