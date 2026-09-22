import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ═══════════════════════════════════════════════════════════════════════════
// FRONTEIRA DE LEITURA PUBLICADA — guarda estática (macro-onda 10.2-B)
// ═══════════════════════════════════════════════════════════════════════════
//
// A Task 10.1 fechou a diferenciação temporal e a inferência por subtração NO
// BANCO (`cohort_capsules` + `aggregate_cohort_responses`). A macro-onda 10.2
// descobriu que o painel `/fibt-piloto` contornava isso: lia `answers` cruas
// por service_role e recalculava média e escore ao vivo em TypeScript.
//
// Os testes de comportamento provam que o caminho ATUAL está correto. Esta
// guarda existe para o caminho FUTURO: falha se alguém reintroduzir leitura de
// conteúdo de resposta ou recálculo ao vivo no caminho do painel. Mesmo padrão
// de `scripts-guard-coverage.test.ts` — invariante arquitetural travada por
// teste, não por convenção.

const RAIZ = process.cwd();

function ler(...partes: string[]): string {
  return readFileSync(join(RAIZ, ...partes), "utf8");
}

/**
 * Remove comentários antes de procurar por código. Sem isso a guarda dispararia
 * na própria prosa que documenta o que foi removido — e a documentação do
 * defeito é justamente o que se quer preservar.
 */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Todas as colunas pedidas em `.select("…")` de um arquivo. */
function colunasSelecionadas(fonte: string): string[] {
  return [...fonte.matchAll(/\.select\(\s*["'`]([^"'`]*)["'`]/g)].map((m) => m[1]!);
}

function arquivosTs(dir: string, acc: string[] = []): string[] {
  for (const entrada of readdirSync(join(RAIZ, dir))) {
    const relativo = `${dir}/${entrada}`;
    if (statSync(join(RAIZ, relativo)).isDirectory()) arquivosTs(relativo, acc);
    else if (/\.tsx?$/.test(entrada) && !/\.test\.tsx?$/.test(entrada)) acc.push(relativo);
  }
  return acc;
}

/**
 * Único lugar do app autorizado a ler `answers` cruas: o publicador de cápsula
 * de ONDA, que tem controle de lote próprio (`withheldForPrivacy`) desde a
 * Task 10.1. Ampliar esta lista é decisão de privacidade — o teste força que
 * ela seja explícita, e não um efeito colateral de um refactor.
 */
const LEITORES_AUTORIZADOS_DE_RESPOSTA = ["src/lib/api/capsule-aggregator.server.ts"];

const SERVICO_PAINEL = ["src", "lib", "fibt", "fibt-manager-control-center.server.ts"] as const;
const PURO_PAINEL = ["src", "lib", "fibt", "fibt-manager-control-center.ts"] as const;

describe("fronteira de leitura publicada — caminho do painel FIB-T", () => {
  test("nenhuma consulta do serviço do painel pede o conteúdo das respostas", () => {
    const colunas = colunasSelecionadas(ler(...SERVICO_PAINEL));
    expect(colunas).toContain("cohort_id,instrument_version");
    expect(colunas.filter((c) => c.includes("answers"))).toEqual([]);
  });

  test("o serviço do painel lê o snapshot publicado, e é dele que vem o valor", () => {
    const fonte = ler(...SERVICO_PAINEL);
    expect(fonte.includes('.from("cohort_capsules")')).toBe(true);
    expect(colunasSelecionadas(fonte)).toContain(
      "cohort_id,published_response_count,item_means,published_at",
    );
    expect(fonte.includes("buildProtectedCohortReading")).toBe(true);
  });

  test("o contrato do store não declara nenhum método que devolva resposta", () => {
    const fonte = ler(...SERVICO_PAINEL);
    const contrato = fonte.slice(
      fonte.indexOf("export interface FibtManagerStore"),
      fonte.indexOf("export interface FibtManagerLinkSummary"),
    );
    expect(contrato.length).toBeGreaterThan(100);
    expect(contrato.includes("listResponses(")).toBe(false);
    expect(contrato.includes("listSegmentParticipation(")).toBe(true);
    expect(contrato.includes("listPublishedSnapshots(")).toBe(true);
  });

  test("o módulo puro do painel não usa o agregador ao vivo do engine", () => {
    const codigo = semComentarios(ler(...PURO_PAINEL));
    // `aggregateFibt` agrega respostas POR PESSOA — usá-lo aqui seria voltar ao
    // recálculo ao vivo. O escore vem de `buildFibtCohortReport` sobre as médias
    // por item JÁ PUBLICADAS.
    expect(codigo.includes("aggregateFibt")).toBe(false);
    expect(codigo.includes("buildManagerAnalytics")).toBe(false);
    expect(codigo.includes("buildFibtCohortReport(")).toBe(true);
  });

  test("a regra de supressão complementar é reusada do engine, não reescrita", () => {
    const fonte = ler(...PURO_PAINEL);
    expect(
      fonte.includes('suppressDifferentialInference } from "@/engine/survey/sector-link-engine"'),
    ).toBe(true);
    expect(fonte.includes("suppressDifferentialInference(")).toBe(true);
  });

  test("nenhum arquivo passou a ler `answers` cruas fora da allowlist", () => {
    const suspeitos = arquivosTs("src")
      .filter((arquivo) =>
        colunasSelecionadas(readFileSync(join(RAIZ, arquivo), "utf8")).some((c) =>
          c.includes("answers"),
        ),
      )
      .filter((arquivo) => !LEITORES_AUTORIZADOS_DE_RESPOSTA.includes(arquivo));
    expect(suspeitos).toEqual([]);
  });

  test("o publicador de cápsula de onda mantém o próprio controle de lote", () => {
    const fonte = ler("src", "lib", "api", "capsule-aggregator.server.ts");
    // Se este controle desaparecer, a leitura de ONDA volta a publicar a cada
    // resposta e o vazamento por delta reabre nessa outra superfície.
    expect(fonte.includes("withheldForPrivacy")).toBe(true);
    expect(fonte.includes("delta < K_ANONYMITY_MIN")).toBe(true);
    // Nenhum parâmetro de escape: `forcePublish` só pode aparecer em prosa
    // histórica, nunca como argumento de função.
    expect(/forcePublish\s*[:?),=]/.test(fonte)).toBe(false);
  });

  test("o avanço da publicação usa a RPC canônica, nunca service role", () => {
    const fonte = ler("src", "lib", "fibt", "fibt-cohort-publication.server.ts");
    expect(fonte.includes('rpc("aggregate_cohort_responses"')).toBe(true);
    expect(fonte.includes("SUPABASE_PUBLISHABLE_KEY")).toBe(true);
    // Pedir service role aqui seria pedir à RPC o bypass que ela recusa.
    expect(fonte.includes("SUPABASE_SERVICE_ROLE_KEY")).toBe(false);
    expect(fonte.includes("supabaseAdmin")).toBe(false);
  });
});
