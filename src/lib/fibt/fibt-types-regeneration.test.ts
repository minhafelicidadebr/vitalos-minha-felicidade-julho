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

/**
 * Isola o bloco da tabela wave_responses e verifica se ela ainda declara a
 * COLUNA invite_token. Checar a substring "invite_token" no arquivo inteiro
 * e' impreciso: o parametro de funcao p_invite_token (submit_wave_response,
 * provision_organization_from_invite) contem essa substring e continua
 * existindo de proposito -- o token ainda e' recebido para validar o
 * convite, so nao e' mais gravado na resposta.
 */
function waveResponsesTemInviteToken(tiposSrc: string): boolean {
  const inicio = tiposSrc.indexOf("wave_responses: {");
  if (inicio === -1) return false;
  const resto = tiposSrc.slice(inicio + "wave_responses: {".length);
  // Proximo campo de tabela na mesma indentacao (6 espacos) fecha o bloco.
  const fim = resto.search(/\n {6}[a-z_]+: \{/);
  const bloco = fim === -1 ? resto : resto.slice(0, fim);
  return /\binvite_token\b/.test(bloco);
}

function tiposRegenerados(): boolean {
  const t = ler(TIPOS_GERADOS);
  return t.includes("wave_cohorts") && !waveResponsesTemInviteToken(t);
}

function usaEscapeHatch(): boolean {
  return /const db = supabase as any/.test(ler(CAMADA_DADOS));
}

describe("isolamento do bloco wave_responses (evita falso positivo)", () => {
  test("p_invite_token como parametro de funcao NAO conta como coluna presente", () => {
    const fixture = `
      wave_responses: {
        Row: { id: string; wave_id: string; cohort_id: string | null }
      }
      submit_wave_response: {
        Args: { p_wave_id: string; p_invite_token: string; p_answers: Json }
      }
    `;
    expect(waveResponsesTemInviteToken(fixture)).toBe(false);
  });

  test("a coluna invite_token de fato presente E' detectada", () => {
    const fixture = `
      wave_responses: {
        Row: { id: string; invite_token: string | null }
      }
      waves: {
        Row: { id: string }
      }
    `;
    expect(waveResponsesTemInviteToken(fixture)).toBe(true);
  });

  test("o arquivo de tipos REAL, apos a regeneracao, e' reconhecido como regenerado", () => {
    // Prova de regressao: esta foi a checagem que falhou por causa do falso
    // positivo do parametro p_invite_token antes da correcao acima.
    expect(tiposRegenerados()).toBe(true);
  });
});

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
