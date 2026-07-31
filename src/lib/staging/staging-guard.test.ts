// Regressao: a validacao visual da FIBT-1 apontou deliberadamente
// VITE_SUPABASE_URL para staging (.env.local, gitignored) para que o
// cliente REAL do navegador testasse contra staging. Isso fez
// requireStagingTarget() recusar o proprio staging como "producao", porque
// o guard original tratava VITE_SUPABASE_URL como sinal de producao —
// verdade ate aquele momento, falso depois. Estes testes fixam o
// comportamento correto: SUPABASE_URL (sem VITE_) e' o unico sinal
// confiavel, porque nenhum .env.local desta onda o sobrescreve.

import { describe, expect, test } from "bun:test";
import { forbiddenRefs, maskRef, projectRefFromUrl, requireStagingTarget } from "./staging-guard";

const PROD_URL = "https://shlmnbrbhczfxsdlakol.supabase.co";
const STAGING_URL = "https://xttjkpzhxtjfwxjsxuab.supabase.co";

describe("projectRefFromUrl / maskRef", () => {
  test("extrai o ref da URL", () => {
    expect(projectRefFromUrl(STAGING_URL)).toBe("xttjkpzhxtjfwxjsxuab");
  });

  test("mascara preservando so as pontas", () => {
    expect(maskRef("xttjkpzhxtjfwxjsxuab")).toBe("xttj...xuab");
  });

  test("URL nao reconhecida lanca erro", () => {
    expect(() => projectRefFromUrl("https://example.com")).toThrow();
  });
});

describe("forbiddenRefs — so SUPABASE_URL decide, nunca VITE_SUPABASE_URL", () => {
  test("SUPABASE_URL sozinho e' proibido", () => {
    const proibidos = forbiddenRefs({ SUPABASE_URL: PROD_URL });
    expect(proibidos.has("shlmnbrbhczfxsdlakol")).toBe(true);
  });

  test("VITE_SUPABASE_URL sozinho NAO entra na lista (o bug corrigido)", () => {
    const proibidos = forbiddenRefs({ VITE_SUPABASE_URL: STAGING_URL });
    expect(proibidos.has("xttjkpzhxtjfwxjsxuab")).toBe(false);
    expect(proibidos.size).toBe(0);
  });

  test("cenario real da validacao visual: SUPABASE_URL=prod, VITE_SUPABASE_URL=staging -- so prod fica proibido", () => {
    const proibidos = forbiddenRefs({ SUPABASE_URL: PROD_URL, VITE_SUPABASE_URL: STAGING_URL });
    expect(proibidos.has("shlmnbrbhczfxsdlakol")).toBe(true);
    expect(proibidos.has("xttjkpzhxtjfwxjsxuab")).toBe(false);
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
    expect(alvo.projectRef).toBe("xttjkpzhxtjfwxjsxuab");
    expect(alvo.maskedRef).toBe("xttj...xuab");
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
  });
});
