// Trava arquitetural da fratura F1 (P0 — hibridismo demo/produção,
// docs/handoff/MATRIZ_REVALIDACAO_ANALISES_2026-07-13.md). Não resolve o
// P0 — só impede que ele CRESÇA enquanto a Onda "Fronteira Demo/Real"
// (PLANO_ELEVACAO_180_VITALOS §Onda 1) não substitui os mocks por dados
// reais. Mesma filosofia do schema-parity e do engine-domain-boundary:
// invariante que se auto-verifica, não doutrina em doc.
//
// Regra: uma rota só pode importar de "@/mocks" se já estiver na lista
// congelada abaixo (medida em 2026-07-13). Rota NOVA que importa mock
// falha o teste — force a decisão consciente de ampliar a lista (retrocesso)
// ou usar um adapter real. Rota que SAI da lista (parou de importar mock)
// é permitida silenciosamente — é o sinal de progresso que a Onda 1 busca;
// remova-a da lista abaixo para que o teto continue apertando.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = import.meta.dir;

// Congelada em 2026-07-13 (passagem de bastão game.felicidade) — 61 rotas.
// Idêntica à contagem revalidada em MATRIZ_REVALIDACAO_ANALISES_2026-07-13.md.
const MOCK_IMPORT_BASELINE: ReadonlySet<string> = new Set([
  "academia.tsx",
  "acesso.tsx",
  "atlas.tsx",
  "benchmark.tsx",
  "clevel.tsx",
  "condominios.tsx",
  "confianca.tsx",
  "convite.$token.tsx",
  "copilota.tsx",
  "copiloto.tsx",
  "devolutiva.tsx",
  "diario.tsx",
  "diploma.tsx",
  "driver.$driverId.tsx",
  "drivers.tsx",
  "embaixador.tsx",
  "embaixadorias.tsx",
  "escola.tsx",
  "esg.tsx",
  "espelho.tsx",
  "evolucao-nr1.tsx",
  "evolucao.tsx",
  "expedicao.tsx",
  "experimentos.tsx",
  "fechamento.tsx",
  "fibt.tsx",
  "floresceria.tsx",
  "governo.tsx",
  "holding.tsx",
  "impacto.tsx",
  "ivo.tsx",
  "lab.tsx",
  "loop-vivo.tsx",
  "lupa-da-escuta.tsx",
  "matriz.tsx",
  "metodologia.tsx",
  "missoes.tsx",
  "onda.tsx",
  "panorama.tsx",
  "plano-acao.tsx",
  "plano-nr1.tsx",
  "prioridades.tsx",
  "privacidade.tsx",
  "programa.tsx",
  "pulse.tsx",
  "quiosque.tsx",
  "reconhecimento.tsx",
  "relatorio-global.tsx",
  "relatorios.tsx",
  "respond.s.$token.tsx",
  "responder.tsx",
  "revisar.tsx",
  "saude.tsx",
  "selo.tsx",
  "setores.tsx",
  "sinais.tsx",
  "sst.tsx",
  "temporada.tsx",
  "trajetoria.tsx",
  "viat.tsx",
  "vitrine.tsx",
]);

function findMockImportingRoutes(): string[] {
  const offenders: string[] = [];
  for (const entry of readdirSync(ROUTES_DIR)) {
    if (!/\.tsx$/.test(entry) || /\.test\.tsx$/.test(entry)) continue;
    const content = readFileSync(join(ROUTES_DIR, entry), "utf-8");
    if (/from\s+["']@\/mocks/.test(content)) {
      offenders.push(entry);
    }
  }
  return offenders.sort();
}

describe("trava de fronteira Demo/Real — src/routes não pode ganhar novo import de mock", () => {
  test("toda rota que importa @/mocks já pertence à lista congelada", () => {
    const current = findMockImportingRoutes();
    const newOffenders = current.filter((route) => !MOCK_IMPORT_BASELINE.has(route));
    // Se falhar: uma rota NOVA (ou uma rota antiga que não importava mock antes)
    // passou a importar @/mocks. Ou substitua por um adapter real (preferível —
    // ver docs/handoff/PLANO_PROXIMA_ONDA_VITALOS_2026-07-13.md, Onda 1), ou
    // adicione o arquivo à lista MOCK_IMPORT_BASELINE explicitamente, com
    // justificativa no commit.
    expect(newOffenders).toEqual([]);
  });

  test("a lista congelada não contém rota que já parou de importar mock (teto obsoleto)", () => {
    const current = new Set(findMockImportingRoutes());
    const stale = [...MOCK_IMPORT_BASELINE].filter((route) => !current.has(route)).sort();
    // Se falhar: alguma rota da lista já foi migrada para dado real — ótimo.
    // Remova-a de MOCK_IMPORT_BASELINE para que o teto continue apertando
    // (não deixe o progresso silencioso enfraquecer a trava).
    expect(stale).toEqual([]);
  });
});
