// Regressao: a validacao visual da FIBT-1 apontou deliberadamente
// VITE_SUPABASE_URL para staging (.env.local, gitignored) para que o
// cliente REAL do navegador testasse contra staging. Isso fez
// requireStagingTarget() recusar o proprio staging como "producao", porque
// o guard original tratava VITE_SUPABASE_URL como sinal de producao —
// verdade ate aquele momento, falso depois. Estes testes fixam o
// comportamento correto: SUPABASE_URL (sem VITE_) e' o unico sinal
// confiavel, porque nenhum .env.local o sobrescreve.
//
// Nenhum ref REAL aparece aqui: os identificadores sao ficticios. Um ref nao
// e' segredo, mas fixar o real num arquivo versionado o transforma em
// constante que alguem copia para outro lugar.

import { describe, expect, test } from "bun:test";
import { forbiddenRefs, maskRef, projectRefFromUrl, requireStagingTarget } from "./staging-guard";

const PROD_REF = "pppppppppppppppppppp";
const STAGING_REF = "ssssssssssssssssssss";
const PROD_URL = `https://${PROD_REF}.supabase.co`;
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;

describe("projectRefFromUrl / maskRef", () => {
  test("extrai o ref da URL", () => {
    expect(projectRefFromUrl(STAGING_URL)).toBe(STAGING_REF);
  });

  test("mascara preservando so as pontas", () => {
    expect(maskRef(STAGING_REF)).toBe("ssss...ssss");
  });

  test("URL nao reconhecida lanca erro", () => {
    expect(() => projectRefFromUrl("https://example.com")).toThrow();
  });
});

describe("forbiddenRefs — so SUPABASE_URL decide, nunca VITE_SUPABASE_URL", () => {
  test("SUPABASE_URL sozinho e' proibido", () => {
    expect(forbiddenRefs({ SUPABASE_URL: PROD_URL }).has(PROD_REF)).toBe(true);
  });

  test("VITE_SUPABASE_URL sozinho NAO entra na lista (o bug corrigido)", () => {
    const proibidos = forbiddenRefs({ VITE_SUPABASE_URL: STAGING_URL });
    expect(proibidos.has(STAGING_REF)).toBe(false);
    expect(proibidos.size).toBe(0);
  });

  test("cenario real da validacao visual: SUPABASE_URL=prod, VITE_SUPABASE_URL=staging -- so prod fica proibido", () => {
    const proibidos = forbiddenRefs({ SUPABASE_URL: PROD_URL, VITE_SUPABASE_URL: STAGING_URL });
    expect(proibidos.has(PROD_REF)).toBe(true);
    expect(proibidos.has(STAGING_REF)).toBe(false);
  });

  test("FORBIDDEN_PROJECT_REFS extra continua funcionando", () => {
    const proibidos = forbiddenRefs({ FORBIDDEN_PROJECT_REFS: "aaa,bbb" });
    expect(proibidos.has("aaa")).toBe(true);
    expect(proibidos.has("bbb")).toBe(true);
  });
});

describe("requireStagingTarget — cenario da validacao visual nao falha mais", () => {
  const envBase = {
    STAGING_SUPABASE_URL: STAGING_URL,
    STAGING_SUPABASE_PUBLISHABLE_KEY: "pub-key",
    STAGING_SUPABASE_SECRET_KEY: "secret-key",
  };

  test("com VITE_SUPABASE_URL apontado para staging (como no .env.local da validacao visual), resolve normalmente", () => {
    const alvo = requireStagingTarget({
      ...envBase,
      SUPABASE_URL: PROD_URL,
      VITE_SUPABASE_URL: STAGING_URL, // exatamente o que a validacao visual fez
    });
    expect(alvo.projectRef).toBe(STAGING_REF);
    expect(alvo.maskedRef).toBe("ssss...ssss");
  });

  test("continua recusando se STAGING_SUPABASE_URL de fato apontar para o ref de SUPABASE_URL", () => {
    expect(() =>
      requireStagingTarget({ ...envBase, STAGING_SUPABASE_URL: PROD_URL, SUPABASE_URL: PROD_URL }),
    ).toThrow(/RECUSADO/);
  });

  test("continua exigindo as tres variaveis STAGING_*", () => {
    expect(() => requireStagingTarget({})).toThrow(/STAGING_SUPABASE_URL ausente/);
    expect(() => requireStagingTarget({ STAGING_SUPABASE_URL: STAGING_URL })).toThrow(
      /STAGING_SUPABASE_PUBLISHABLE_KEY ausente/,
    );
    expect(() =>
      requireStagingTarget({
        STAGING_SUPABASE_URL: STAGING_URL,
        STAGING_SUPABASE_PUBLISHABLE_KEY: "pub-key",
      }),
    ).toThrow(/STAGING_SUPABASE_SECRET_KEY ausente/);
  });

  test("nomenclatura legada (ANON_KEY / SERVICE_ROLE_KEY) nao e' mais aceita como alias", () => {
    expect(() =>
      requireStagingTarget({
        STAGING_SUPABASE_URL: STAGING_URL,
        STAGING_SUPABASE_ANON_KEY: "pub-key",
        STAGING_SUPABASE_SERVICE_ROLE_KEY: "secret-key",
      }),
    ).toThrow(/STAGING_SUPABASE_PUBLISHABLE_KEY ausente/);
  });
});

describe("divergencia entre ref declarado e URL real", () => {
  const envBase = {
    STAGING_SUPABASE_URL: STAGING_URL,
    STAGING_SUPABASE_PUBLISHABLE_KEY: "pub-key",
    STAGING_SUPABASE_SECRET_KEY: "secret-key",
  };

  test("ref declarado coerente com a URL passa", () => {
    const alvo = requireStagingTarget({ ...envBase, STAGING_SUPABASE_PROJECT_REF: STAGING_REF });
    expect(alvo.projectRef).toBe(STAGING_REF);
  });

  test("ref declarado divergente da URL e' recusado", () => {
    expect(() =>
      requireStagingTarget({ ...envBase, STAGING_SUPABASE_PROJECT_REF: PROD_REF }),
    ).toThrow(/RECUSADO.*declara/s);
  });

  test("a mensagem de divergencia nao imprime o ref inteiro", () => {
    try {
      requireStagingTarget({ ...envBase, STAGING_SUPABASE_PROJECT_REF: PROD_REF });
      throw new Error("deveria ter lancado");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).not.toContain(PROD_REF);
      expect(msg).not.toContain(STAGING_REF);
      expect(msg).toContain(maskRef(PROD_REF));
    }
  });
});

describe("chave privilegiada sob prefixo VITE_", () => {
  const envBase = {
    STAGING_SUPABASE_URL: STAGING_URL,
    STAGING_SUPABASE_PUBLISHABLE_KEY: "pub-key",
    STAGING_SUPABASE_SECRET_KEY: "secret-key",
  };

  test("VITE_ com SECRET no nome e' recusado antes de qualquer resolucao", () => {
    expect(() =>
      requireStagingTarget({ ...envBase, VITE_STAGING_SUPABASE_SECRET_KEY: "vazou" }),
    ).toThrow(/prefixo VITE_/);
  });

  test("VITE_ com SERVICE_ROLE no nome e' recusado", () => {
    expect(() =>
      requireStagingTarget({ ...envBase, VITE_SUPABASE_SERVICE_ROLE_KEY: "vazou" }),
    ).toThrow(/prefixo VITE_/);
  });

  test("VITE_ comum (URL, publishable) continua permitido", () => {
    const alvo = requireStagingTarget({
      ...envBase,
      VITE_SUPABASE_URL: STAGING_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: "pub-key",
    });
    expect(alvo.projectRef).toBe(STAGING_REF);
  });
});
