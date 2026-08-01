import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import {
  DB_TARGETS,
  RUNTIME_ENVS,
  allowedTargetsFor,
  isCombinationAllowed,
  isInertUrl,
  isLocalUrl,
  maskRef,
  projectRefFromUrl,
  validateEnvironment,
  type DbTarget,
  type RuntimeEnv,
} from "./environment-contract";

/** Projeto fictício — nenhum ref real deste projeto entra em teste. */
const REF_A = "aaaaaaaaaaaaaaaaaaaa";
const REF_B = "bbbbbbbbbbbbbbbbbbbb";
const URL_A = `https://${REF_A}.supabase.co`;
const URL_B = `https://${REF_B}.supabase.co`;
const URL_INERTE = "https://db.invalid";
const URL_LOCAL = "http://localhost:54321";

/**
 * Alvo staging correto por padrão: URLs em REF_A e VITALOS_STAGING_PROJECT_REF
 * declarando o mesmo REF_A. Os testes que só querem exercitar OUTRA parte do
 * contrato (nature da URL, combinação proibida) alcançam essa parte antes de
 * chegar na checagem de identidade exata, então não precisam se preocupar com
 * ela — e os que testam a MESMA checagem sobrescrevem explicitamente.
 */
function base(over: Record<string, string | undefined> = {}) {
  return {
    VITALOS_RUNTIME_ENV: "local",
    VITALOS_DB_TARGET: "staging",
    SUPABASE_URL: URL_A,
    VITE_SUPABASE_URL: URL_A,
    VITALOS_STAGING_PROJECT_REF: REF_A,
    ...over,
  };
}

describe("matriz runtime x banco", () => {
  test("as combinações permitidas do contrato são exatamente estas", () => {
    const permitidas: Array<[RuntimeEnv, DbTarget]> = [
      ["ci", "test"],
      ["preview", "staging"],
      ["production", "production"],
      ["local", "local"],
      ["local", "staging"],
    ];
    for (const [r, t] of permitidas) {
      expect({ r, t, ok: isCombinationAllowed(r, t) }).toEqual({ r, t, ok: true });
    }
  });

  test("nenhum runtime não-produtivo alcança o banco de produção", () => {
    for (const r of RUNTIME_ENVS) {
      if (r === "production") continue;
      expect({ r, ok: isCombinationAllowed(r, "production") }).toEqual({ r, ok: false });
    }
  });

  test("production nunca aponta para staging, test ou local", () => {
    for (const t of DB_TARGETS) {
      if (t === "production") continue;
      expect({ t, ok: isCombinationAllowed("production", t) }).toEqual({ t, ok: false });
    }
  });

  test("ci só alcança o alvo test — nunca staging nem produção", () => {
    expect(allowedTargetsFor("ci")).toEqual(["test"]);
  });

  test("preview só alcança staging", () => {
    expect(allowedTargetsFor("preview")).toEqual(["staging"]);
  });

  test("toda combinação fora da matriz é recusada", () => {
    const total = RUNTIME_ENVS.length * DB_TARGETS.length;
    let permitidas = 0;
    for (const r of RUNTIME_ENVS) {
      for (const t of DB_TARGETS) if (isCombinationAllowed(r, t)) permitidas += 1;
    }
    // 5 permitidas de 16 possíveis: a lista é fechada, não uma sugestão.
    expect({ total, permitidas }).toEqual({ total: 16, permitidas: 5 });
  });
});

describe("variáveis obrigatórias", () => {
  test("runtime ausente reprova", () => {
    const v = validateEnvironment(base({ VITALOS_RUNTIME_ENV: undefined }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("VITALOS_RUNTIME_ENV ausente");
  });

  test("alvo de banco ausente reprova", () => {
    const v = validateEnvironment(base({ VITALOS_DB_TARGET: undefined }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("VITALOS_DB_TARGET ausente");
  });

  test("valor desconhecido reprova (não é tratado como default)", () => {
    const v = validateEnvironment(base({ VITALOS_RUNTIME_ENV: "prod" }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("desconhecido");
  });

  test("string vazia conta como ausente, não como valor", () => {
    const v = validateEnvironment(base({ VITALOS_DB_TARGET: "   " }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("ausente");
  });

  test("SUPABASE_URL ausente reprova", () => {
    const v = validateEnvironment(base({ SUPABASE_URL: undefined }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("SUPABASE_URL ausente");
  });

  test("VITE_SUPABASE_URL ausente reprova", () => {
    const v = validateEnvironment(base({ VITE_SUPABASE_URL: undefined }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("VITE_SUPABASE_URL ausente");
  });
});

describe("cliente e servidor no mesmo projeto", () => {
  test("refs iguais passam", () => {
    const v = validateEnvironment(base());
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.projectRef).toBe(REF_A);
  });

  test("refs diferentes reprovam — este é o modo de falha silencioso da FIBT-1", () => {
    const v = validateEnvironment(base({ VITE_SUPABASE_URL: URL_B }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("projetos DIFERENTES");
  });

  test("a mensagem de divergência nunca imprime a URL completa nem o ref inteiro", () => {
    const v = validateEnvironment(base({ VITE_SUPABASE_URL: URL_B }));
    expect(v.ok).toBe(false);
    if (!v.ok) {
      const texto = v.erros.join(" ");
      expect(texto).not.toContain(URL_A);
      expect(texto).not.toContain(URL_B);
      expect(texto).not.toContain(REF_A);
      expect(texto).not.toContain(REF_B);
      expect(texto).toContain(maskRef(REF_A));
    }
  });

  test("URL irreconhecível reprova em vez de virar ref vazio", () => {
    const v = validateEnvironment(base({ SUPABASE_URL: "https://exemplo.com" }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("não é uma URL Supabase reconhecível");
  });
});

describe("natureza da URL casada com o alvo", () => {
  test("URL .invalid é aceita quando o alvo é test", () => {
    const v = validateEnvironment({
      VITALOS_RUNTIME_ENV: "ci",
      VITALOS_DB_TARGET: "test",
      SUPABASE_URL: URL_INERTE,
      VITE_SUPABASE_URL: URL_INERTE,
    });
    expect(v.ok).toBe(true);
    if (v.ok) expect({ ref: v.projectRef, mascara: v.maskedRef }).toEqual({
      ref: null,
      mascara: "(inerte)",
    });
  });

  test("URL .invalid é recusada em execução real (alvo staging)", () => {
    const v = validateEnvironment(base({ SUPABASE_URL: URL_INERTE, VITE_SUPABASE_URL: URL_INERTE }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("exige URL remota");
  });

  test("URL de localhost é aceita quando o alvo é local", () => {
    const v = validateEnvironment({
      VITALOS_RUNTIME_ENV: "local",
      VITALOS_DB_TARGET: "local",
      SUPABASE_URL: URL_LOCAL,
      VITE_SUPABASE_URL: URL_LOCAL,
    });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.maskedRef).toBe("(local)");
  });

  test("localhost é recusado quando o alvo declarado é staging", () => {
    const v = validateEnvironment(base({ SUPABASE_URL: URL_LOCAL, VITE_SUPABASE_URL: URL_LOCAL }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("exige URL remota");
  });

  test("projeto remoto é recusado quando o alvo declarado é test", () => {
    const v = validateEnvironment({
      VITALOS_RUNTIME_ENV: "ci",
      VITALOS_DB_TARGET: "test",
      SUPABASE_URL: URL_A,
      VITE_SUPABASE_URL: URL_A,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("exige URL inerte");
  });

  test("misturar inerte com real reprova", () => {
    const v = validateEnvironment({
      VITALOS_RUNTIME_ENV: "ci",
      VITALOS_DB_TARGET: "test",
      SUPABASE_URL: URL_INERTE,
      VITE_SUPABASE_URL: URL_A,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("divergem em");
  });

  test("misturar localhost com remoto reprova", () => {
    const v = validateEnvironment(base({ SUPABASE_URL: URL_LOCAL }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("divergem em");
  });

  test("isInertUrl reconhece .invalid e recusa domínio real", () => {
    expect(isInertUrl(URL_INERTE)).toBe(true);
    expect(isInertUrl("https://qualquer.invalid/rest")).toBe(true);
    expect(isInertUrl(URL_A)).toBe(false);
    expect(isInertUrl("https://invalid.supabase.co")).toBe(false);
  });

  test("isLocalUrl reconhece as formas de loopback e recusa host remoto", () => {
    expect(isLocalUrl("http://localhost:54321")).toBe(true);
    expect(isLocalUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalUrl("https://localhost")).toBe(true);
    expect(isLocalUrl(URL_A)).toBe(false);
    expect(isLocalUrl("https://localhost.exemplo.com")).toBe(false);
  });
});

describe("primitivas de ref", () => {
  test("projectRefFromUrl extrai o ref e normaliza caixa", () => {
    expect(projectRefFromUrl(URL_A)).toBe(REF_A);
    expect(projectRefFromUrl(`https://${REF_A.toUpperCase()}.supabase.co/`)).toBe(REF_A);
  });

  test("projectRefFromUrl devolve null em vez de lançar", () => {
    expect(projectRefFromUrl("nada")).toBeNull();
    expect(projectRefFromUrl("https://x.exemplo.com")).toBeNull();
  });

  test("maskRef nunca devolve o valor inteiro", () => {
    expect(maskRef(REF_A)).not.toBe(REF_A);
    expect(maskRef(REF_A)).toBe("aaaa...aaaa");
    expect(maskRef("curto")).toBe("****");
  });
});

describe("identidade exata de projeto — staging e produção nunca são intercambiáveis", () => {
  // Cenário concreto que motivou esta seção: uma URL REMOTA sozinha nunca
  // provou qual ambiente é — staging e produção são igualmente remotos. Sem
  // um ref declarado para conferir, `preview → staging` e `local → staging`
  // aceitavam qualquer projeto remoto, inclusive o de produção, desde que
  // cliente e servidor concordassem entre si.

  test("1. preview com URL de produção e target staging → FAIL", () => {
    const v = validateEnvironment({
      VITALOS_RUNTIME_ENV: "preview",
      VITALOS_DB_TARGET: "staging",
      SUPABASE_URL: URL_A,
      VITE_SUPABASE_URL: URL_A,
      VITALOS_PRODUCTION_PROJECT_REF: REF_A, // REF_A é declarado como PRODUÇÃO
      VITALOS_STAGING_PROJECT_REF: REF_B, // staging declarado é outro projeto
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("VITALOS_STAGING_PROJECT_REF declara");
  });

  test("2. local→staging com URL de produção → FAIL", () => {
    const v = validateEnvironment({
      VITALOS_RUNTIME_ENV: "local",
      VITALOS_DB_TARGET: "staging",
      SUPABASE_URL: URL_A,
      VITE_SUPABASE_URL: URL_A,
      VITALOS_PRODUCTION_PROJECT_REF: REF_A,
      // Nenhum VITALOS_STAGING_PROJECT_REF declarado.
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("exige VITALOS_STAGING_PROJECT_REF declarado");
  });

  test("3. staging sem VITALOS_STAGING_PROJECT_REF → FAIL", () => {
    const v = validateEnvironment(base({ VITALOS_STAGING_PROJECT_REF: undefined }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("exige VITALOS_STAGING_PROJECT_REF declarado");
  });

  test("4. staging com ref declarado diferente da URL → FAIL", () => {
    const v = validateEnvironment(base({ VITALOS_STAGING_PROJECT_REF: REF_B }));
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.erros.join(" ")).toContain("VITALOS_STAGING_PROJECT_REF declara");
      expect(v.erros.join(" ")).toContain("mas SUPABASE_URL/VITE_SUPABASE_URL");
    }
  });

  test("5. staging com cliente e servidor em refs diferentes → FAIL", () => {
    const v = validateEnvironment(base({ VITE_SUPABASE_URL: URL_B }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("projetos DIFERENTES");
  });

  test("6. staging correto → PASS", () => {
    const v = validateEnvironment(base());
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.projectRef).toBe(REF_A);
  });

  test("7. production com URL de staging → FAIL", () => {
    const v = validateEnvironment({
      VITALOS_RUNTIME_ENV: "production",
      VITALOS_DB_TARGET: "production",
      SUPABASE_URL: URL_B,
      VITE_SUPABASE_URL: URL_B,
      VITALOS_PRODUCTION_PROJECT_REF: REF_A, // declara A, a URL real é B
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("VITALOS_PRODUCTION_PROJECT_REF declara");
  });

  test("8. production sem VITALOS_PRODUCTION_PROJECT_REF → FAIL", () => {
    const v = validateEnvironment({
      VITALOS_RUNTIME_ENV: "production",
      VITALOS_DB_TARGET: "production",
      SUPABASE_URL: URL_A,
      VITE_SUPABASE_URL: URL_A,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("exige VITALOS_PRODUCTION_PROJECT_REF declarado");
  });

  test("9. production correto → PASS", () => {
    const v = validateEnvironment({
      VITALOS_RUNTIME_ENV: "production",
      VITALOS_DB_TARGET: "production",
      SUPABASE_URL: URL_A,
      VITE_SUPABASE_URL: URL_A,
      VITALOS_PRODUCTION_PROJECT_REF: REF_A,
    });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.projectRef).toBe(REF_A);
  });

  test("10. production ref = staging ref → FAIL, mesmo com a URL coerente", () => {
    const v = validateEnvironment({
      VITALOS_RUNTIME_ENV: "production",
      VITALOS_DB_TARGET: "production",
      SUPABASE_URL: URL_A,
      VITE_SUPABASE_URL: URL_A,
      VITALOS_PRODUCTION_PROJECT_REF: REF_A,
      VITALOS_STAGING_PROJECT_REF: REF_A, // mesmo projeto que produção
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("declaram o mesmo projeto");
  });

  test("10b. o mesmo choque falha também quando o alvo ativo é staging", () => {
    const v = validateEnvironment(
      base({ VITALOS_PRODUCTION_PROJECT_REF: REF_A, VITALOS_STAGING_PROJECT_REF: REF_A }),
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("declaram o mesmo projeto");
  });

  test("13. nenhuma mensagem desta seção expõe ref completo — só a forma mascarada", () => {
    const cenarios: Array<Record<string, string | undefined>> = [
      base({ VITALOS_STAGING_PROJECT_REF: REF_B }), // #4
      {
        VITALOS_RUNTIME_ENV: "production",
        VITALOS_DB_TARGET: "production",
        SUPABASE_URL: URL_B,
        VITE_SUPABASE_URL: URL_B,
        VITALOS_PRODUCTION_PROJECT_REF: REF_A,
      }, // #7
      {
        VITALOS_RUNTIME_ENV: "production",
        VITALOS_DB_TARGET: "production",
        SUPABASE_URL: URL_A,
        VITE_SUPABASE_URL: URL_A,
        VITALOS_PRODUCTION_PROJECT_REF: REF_A,
        VITALOS_STAGING_PROJECT_REF: REF_A,
      }, // #10
    ];
    for (const cenario of cenarios) {
      const v = validateEnvironment(cenario);
      expect(v.ok).toBe(false);
      if (!v.ok) {
        const texto = v.erros.join(" ");
        expect(texto).not.toContain(REF_A);
        expect(texto).not.toContain(REF_B);
        expect(texto).not.toContain(URL_A);
        expect(texto).not.toContain(URL_B);
      }
    }
  });
});

describe("combinação proibida canônica", () => {
  test("local apontando para produção é recusado mesmo com URLs coerentes", () => {
    const v = validateEnvironment(base({ VITALOS_DB_TARGET: "production" }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.erros.join(" ")).toContain("Combinação proibida");
  });

  test("preview apontando para produção é recusado", () => {
    const v = validateEnvironment(
      base({ VITALOS_RUNTIME_ENV: "preview", VITALOS_DB_TARGET: "production" }),
    );
    expect(v.ok).toBe(false);
  });

  test("ci apontando para staging é recusado", () => {
    const v = validateEnvironment(
      base({ VITALOS_RUNTIME_ENV: "ci", VITALOS_DB_TARGET: "staging" }),
    );
    expect(v.ok).toBe(false);
  });
});

describe("14-15. VITALOS_*_PROJECT_REF nunca alcança o bundle do navegador", () => {
  // A verificação correta NÃO é grepar o artefato buildado pelo VALOR do ref:
  // o mesmo ref de produção já aparece LEGITIMAMENTE no bundle via
  // VITE_SUPABASE_URL (é a URL pública do projeto) — um grep por valor não
  // distinguiria esse caminho esperado de um vazamento pela variável nova.
  //
  // A garantia real é estrutural: Vite só injeta em `import.meta.env`, no
  // navegador, as chaves com prefixo VITE_ (mais MODE/DEV/PROD/SSR). Uma
  // variável sem esse prefixo não tem CAMINHO NENHUM até o bundle do cliente
  // — não é removida por uma regra deste repo, é o Vite que nunca a inclui.
  // A única forma de alguém criar um caminho que não existiria por padrão
  // seria escrever `import.meta.env.VITALOS_*` em código cliente — é
  // exatamente isso que se procura, por padrão de LEITURA, não por menção ao
  // nome (que aparece legitimamente na declaração de tipo do contrato).
  const raiz = process.cwd();
  const PADRAO_LEITURA_CLIENTE =
    /import\.meta\.env(\??)\.(VITALOS_STAGING_PROJECT_REF|VITALOS_PRODUCTION_PROJECT_REF)/;

  function arquivosDeCliente(): string[] {
    // Só as pastas onde código cliente pode viver — evita escanear domain/
    // packs, docs embutidos etc., que são grandes e irrelevantes aqui.
    const pastas = ["src/routes", "src/app", "src/lib", "src/components", "src/mocks"];
    const arquivos: string[] = [];
    for (const pasta of pastas) {
      const glob = new Glob("**/*.{ts,tsx}");
      for (const f of glob.scanSync({ cwd: join(raiz, pasta) })) {
        if (f.includes(".server.") || f.includes(".test.")) continue;
        arquivos.push(join(pasta, f));
      }
    }
    return arquivos;
  }

  const arquivos = arquivosDeCliente();

  test("14/15. nenhum arquivo cliente lê VITALOS_STAGING_PROJECT_REF ou VITALOS_PRODUCTION_PROJECT_REF via import.meta.env", () => {
    const achados = arquivos.filter((f) =>
      PADRAO_LEITURA_CLIENTE.test(readFileSync(join(raiz, f), "utf8")),
    );
    expect({ achados }).toEqual({ achados: [] });
  }, 20000);

  test("nem o preflight nem o contrato usam prefixo VITE_ para os dois refs", () => {
    // Confirma a premissa acima a partir do outro lado: se algum dia alguém
    // renomear para VITE_VITALOS_*_PROJECT_REF "para simplificar", o Vite
    // passaria a embuti-los de verdade — este teste pega essa mudança.
    const preflight = readFileSync(join(raiz, "scripts/environment-preflight.ts"), "utf8");
    const contrato = readFileSync(join(raiz, "src/lib/env/environment-contract.ts"), "utf8");
    expect(preflight).not.toMatch(/VITE_VITALOS/);
    expect(contrato).not.toMatch(/VITE_VITALOS/);
  });
});
