// Guarda do debito tecnico dos tipos gerados.
//
// `fibt-cohort.functions.ts` usa `supabase as any` porque types.ts ainda nao
// conhece wave_cohorts nem as RPCs novas. O cast e temporario: enquanto ele
// existir, um erro de nome de tabela ou coluna passa pelo tsc sem ser notado,
// justamente na camada que fala com o banco.
//
// Este teste NAO bloqueia a preparacao: enquanto os tipos estiverem
// desatualizados, ele passa e apenas registra o estado. Assim que os tipos
// forem regenerados, ele passa a EXIGIR a remocao do cast -- o debito fecha
// sozinho ou quebra o build. Nao depende de ninguem lembrar.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

const TIPOS_GERADOS = "src/integrations/supabase/types.ts";
const CAMADA_DADOS = "src/lib/api/fibt-cohort.functions.ts";

function tiposRegenerados(): boolean {
  const t = ler(TIPOS_GERADOS);
  return t.includes("wave_cohorts") && !t.includes("invite_token");
}

function usaEscapeHatch(): boolean {
  return /const db = supabase as any/.test(ler(CAMADA_DADOS));
}

describe("tipos gerados x escape hatch", () => {
  test("o escape hatch existe SOMENTE enquanto os tipos estao desatualizados", () => {
    if (tiposRegenerados()) {
      // Tipos em dia: o cast perdeu a justificativa e tem que sair.
      expect(usaEscapeHatch()).toBe(false);
    } else {
      // Ainda desatualizados: o cast e aceitavel, mas precisa estar
      // explicado, para nao virar habito silencioso.
      expect(ler(CAMADA_DADOS)).toContain("Migration A");
    }
  });

  test("o escape hatch esta confinado a um unico arquivo do fluxo FIB-T", () => {
    for (const f of [
      "src/lib/fibt/fibt-cohort-report.ts",
      "src/routes/fibt-piloto.tsx",
    ]) {
      expect(ler(f)).not.toMatch(/as any/);
    }
  });

  test("o caminho de regeneracao esta documentado", () => {
    const doc = ler("docs/fibt-isg/FIBT1_TIPOS_GERADOS.md");
    expect(doc).toContain("wave_cohorts");
    expect(doc).toMatch(/remover o escape hatch/i);
    // A ordem importa: regenerar antes da Migration B daria tipos que ainda
    // declaram invite_token.
    expect(doc.indexOf("Migration B")).toBeLessThan(doc.indexOf("Regeneração dos tipos"));
  });
});
