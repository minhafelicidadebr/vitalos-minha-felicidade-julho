import { describe, expect, test } from "bun:test";
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

function base(over: Record<string, string | undefined> = {}) {
  return {
    VITALOS_RUNTIME_ENV: "local",
    VITALOS_DB_TARGET: "staging",
    SUPABASE_URL: URL_A,
    VITE_SUPABASE_URL: URL_A,
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
