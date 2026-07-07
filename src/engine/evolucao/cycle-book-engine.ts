// Livro do Ciclo — engine PURO (I-E3, Arco da Prova). A síntese narrativa anual: o
// mesmo dado real já produzido por outros engines (Reavaliação NR-1, Atas de
// Vitória, snapshots ESG, Plano Vivo ativo) reunido num documento contável — "o ano
// desta organização em vitalidade", a prova viva do ciclo medir→entender→agir→provar.
//
// COMPOSIÇÃO (Fable 5 §5.1 — compor, não acumular): este engine NÃO recalcula nada.
// reavaliacao-engine, victory-engine, esg-report-engine e action-plan-engine já
// produziram cada peça, testada e real. Aqui só se decide COMO CONTAR a história —
// que capítulo aparece, em que ordem, com qual manchete.
//
// HONESTIDADE (Fable 5 §8): um capítulo sem substância real nunca é forçado a
// aparecer preenchido — `hasContent: false` com um corpo que diz exatamente o que
// falta (nunca "em breve" vago). Uma organização no primeiro ciclo AINDA tem um
// Livro — a história "a fundação foi lançada" é honesta e válida, não um erro.
//
// Engine ≠ Domínio: recebe todo dado já estruturado como parâmetro (nenhum import
// de mocks, nenhum I/O). Determinístico.

import type { ReavaliacaoResult } from "../nr1/reavaliacao-engine";

export interface CycleBookMeta {
  orgName: string;
  sectorLabel: string;
  /** Ex.: "2026" ou "2026 · T1–T3". */
  periodLabel: string;
  documentId: string;
  generatedAt: string;
}

export interface CycleBookVictoryRef {
  driverId: string;
  driverLabel: string;
  cycleKey: string;
  contentHash: string;
  issuedAt: string;
}

export interface CycleBookEsgRef {
  year: number;
  contentHash: string;
  generatedAt: string;
}

export interface CycleBookActivePlan {
  seasonName: string;
  totalActions: number;
  /** 0..100 — completude do §13 (dono+prazo+métrica). */
  compliancePct: number;
  /** 0..100 — % de ações concluídas. */
  concludedPct: number;
}

export interface CycleBookInput {
  meta: CycleBookMeta;
  /** null quando não há histórico real nenhum ainda (0 ciclos). */
  reavaliacao: ReavaliacaoResult | null;
  cycleCount: number;
  victories: readonly CycleBookVictoryRef[];
  esgSnapshots: readonly CycleBookEsgRef[];
  activePlan: CycleBookActivePlan | null;
}

export interface CycleBookChapter {
  id: string;
  title: string;
  /** false quando este capítulo não tem substância real — o corpo explica o porquê, nunca finge. */
  hasContent: boolean;
  body: string[];
  table?: { headers: string[]; rows: string[][] };
}

export interface CycleBookDocument {
  meta: CycleBookMeta;
  /** Uma frase-resumo do ano, derivada do sinal mais forte disponível (vitória > evolução > fundação). */
  headline: string;
  chapters: CycleBookChapter[];
  disclaimer: string;
}

const DISCLAIMER =
  "Documento narrativo que reúne evidências já reais desta organização — nenhum dado novo é " +
  "calculado aqui. Associações entre medidas e evolução de exposição são orientativas, nunca " +
  "prova de causalidade (sem grupo de controle). Leitura agregada, k-anonimato ≥ 5.";

function headlineFor(input: CycleBookInput): string {
  if (input.victories.length > 0) {
    const v = input.victories[0]!;
    return `${input.victories.length} vitória(s) selada(s) neste ciclo — a mais recente em ${v.driverLabel}.`;
  }
  if (input.reavaliacao && input.reavaliacao.improvedCount > 0) {
    return `${input.reavaliacao.improvedCount} driver(es) de risco melhoraram entre os ciclos medidos.`;
  }
  if (input.cycleCount >= 2) {
    return "A organização já tem histórico comparável — a evolução está sendo medida.";
  }
  if (input.cycleCount === 1) {
    return "Fundação lançada: a primeira leitura real desta organização foi registrada.";
  }
  return "Ainda não há um ciclo registrado — o Livro nasce vazio até a primeira leitura.";
}

function buildMeasurementChapter(input: CycleBookInput): CycleBookChapter {
  if (input.cycleCount === 0) {
    return {
      id: "medimos",
      title: "1. O que medimos",
      hasContent: false,
      body: [
        "Nenhum ciclo foi registrado no Cofre de Ciclos ainda. Este capítulo nasce quando a " +
          "primeira onda selada desta organização for registrada como ciclo.",
      ],
    };
  }
  const r = input.reavaliacao;
  const body = [`${input.cycleCount} ciclo(s) real(is) registrado(s) no Cofre de Ciclos.`];
  if (r && input.cycleCount >= 2) {
    body.push(
      `Exposição média medida: ${r.meanFirst} no primeiro ciclo → ${r.meanLast} no mais recente ` +
        `(tendência ${r.overallTrend}).`,
    );
  } else if (r) {
    body.push(`Exposição média medida no ciclo único: ${r.meanFirst}.`);
  }
  return { id: "medimos", title: "1. O que medimos", hasContent: true, body };
}

function buildEvolutionChapter(input: CycleBookInput): CycleBookChapter {
  const r = input.reavaliacao;
  const hasContent = !!r && input.cycleCount >= 2 && r.drivers.length > 0;
  if (!hasContent) {
    return {
      id: "mudou",
      title: "2. O que mudou",
      hasContent: false,
      body: [
        "É preciso pelo menos 2 ciclos registrados com dimensões comparáveis para mostrar " +
          "evolução real por driver — ainda não há essa comparação disponível.",
      ],
    };
  }
  return {
    id: "mudou",
    title: "2. O que mudou",
    hasContent: true,
    body: [
      `${r!.improvedCount} driver(es) melhoraram, ${r!.worsenedCount} pioraram, entre o primeiro e o ` +
        "último ciclo medido.",
    ],
    table: {
      headers: ["Driver", "Camada", "Primeiro ciclo", "Último ciclo", "Variação"],
      rows: r!.drivers.map((d) => [
        d.label,
        d.macroLayer,
        String(d.firstLoad),
        String(d.lastLoad),
        `${d.reduction > 0 ? "−" : d.reduction < 0 ? "+" : "±"}${Math.abs(d.reduction)}`,
      ]),
    },
  };
}

/**
 * "As não-vitórias com igual dignidade" (I-E3, GRI — equilíbrio entre desempenho positivo e
 * negativo é o que torna o resto crível). Nunca oculta um driver que não melhorou; nunca usa
 * tom de fracasso — é o próximo ciclo de trabalho, não um veredicto.
 */
function buildNonVictoriesChapter(input: CycleBookInput): CycleBookChapter | null {
  const r = input.reavaliacao;
  if (!r || input.cycleCount < 2 || r.drivers.length === 0) return null;

  const notImproved = r.drivers.filter((d) => !d.improved);
  if (notImproved.length === 0) {
    return {
      id: "nao_vitorias",
      title: "4. Onde ainda estamos trabalhando",
      hasContent: true,
      body: [
        "Todos os drivers medidos neste ciclo melhoraram de nível de risco — nenhum fica de fora " +
          "desta honestidade porque não havia nada difícil a relatar.",
      ],
    };
  }
  return {
    id: "nao_vitorias",
    title: "4. Onde ainda estamos trabalhando",
    hasContent: true,
    body: [
      `${notImproved.length} driver(es) ainda não mostraram melhora de nível de risco entre os ` +
        "ciclos medidos — registrado com a mesma dignidade das vitórias. Atividade sem prova não é " +
        "evidência, mas isto também não é fracasso: é o próximo ciclo de trabalho.",
    ],
    table: {
      headers: ["Driver", "Camada", "Primeiro ciclo", "Último ciclo", "Tendência"],
      rows: notImproved.map((d) => [d.label, d.macroLayer, String(d.firstLoad), String(d.lastLoad), d.trend]),
    },
  };
}

function buildVictoriesChapter(input: CycleBookInput): CycleBookChapter {
  if (input.victories.length === 0) {
    return {
      id: "vitorias",
      title: "3. As vitórias seladas",
      hasContent: false,
      body: [
        "Nenhuma Ata de Vitória foi selada ainda. Uma Ata nasce quando um driver melhora de " +
          "verdade, a medida de fonte segue mantida, e a amostra é reportável — atividade não é " +
          "evidência.",
      ],
    };
  }
  return {
    id: "vitorias",
    title: "3. As vitórias seladas",
    hasContent: true,
    body: [`${input.victories.length} Ata(s) de Vitória selada(s) — registro imutável e verificável.`],
    table: {
      headers: ["Driver", "Ciclo", "Selada em", "Hash"],
      rows: input.victories.map((v) => [
        v.driverLabel,
        v.cycleKey,
        v.issuedAt.slice(0, 10),
        `${v.contentHash.slice(0, 12)}…`,
      ]),
    },
  };
}

function buildEsgChapter(input: CycleBookInput): CycleBookChapter {
  if (input.esgSnapshots.length === 0) {
    return {
      id: "esg",
      title: "5. A prova para fora (ESG)",
      hasContent: false,
      body: [
        "Nenhum snapshot ESG imutável foi gerado ainda. O Dossiê ESG Auditável (Relatório Global) " +
          "gera um snapshot com hash verificável quando a organização decide publicar.",
      ],
    };
  }
  return {
    id: "esg",
    title: "5. A prova para fora (ESG)",
    hasContent: true,
    body: [`${input.esgSnapshots.length} snapshot(s) ESG imutável(is) gerado(s).`],
    table: {
      headers: ["Ano", "Gerado em", "Hash"],
      rows: input.esgSnapshots.map((s) => [String(s.year), s.generatedAt.slice(0, 10), `${s.contentHash.slice(0, 12)}…`]),
    },
  };
}

function buildPlanChapter(input: CycleBookInput): CycleBookChapter {
  const p = input.activePlan;
  if (!p) {
    return {
      id: "plano",
      title: "6. O plano em curso",
      hasContent: false,
      body: ["Nenhum Plano Vivo ativo no momento."],
    };
  }
  return {
    id: "plano",
    title: "6. O plano em curso",
    hasContent: true,
    body: [
      `Temporada "${p.seasonName}": ${p.totalActions} ação(ões), ${p.compliancePct}% com dono+prazo+métrica ` +
        `(Guia MTE 2026 §13), ${p.concludedPct}% concluídas.`,
    ],
  };
}

function buildEfficacyChapter(input: CycleBookInput): CycleBookChapter | null {
  const eff = input.reavaliacao?.efficacy;
  if (!eff || eff.withSourceMeasure === 0) return null;
  return {
    id: "eficacia",
    title: "7. Eficácia honesta",
    hasContent: true,
    body: [
      `Dos ${eff.withSourceMeasure} driver(es) com medida de fonte implementada, ${eff.maintained} ` +
        `seguem com a medida mantida — e desses, ${eff.ofWhichImproved} baixaram de nível de risco. ` +
        "Associação orientativa, nunca prova de causalidade.",
    ],
  };
}

/**
 * "Capítulo de limitações obrigatório; nada sem fonte computada" (I-E3, spec verbatim).
 * Sempre presente, sempre por último — declara o que este Livro NÃO é, e o que ainda não
 * tem pipeline de dado real (honestidade sobre o próprio blueprint: FIB-T e Selo Empresa
 * Viva são citados no blueprint original, mas não têm computação real por organização
 * hoje — aparecerão quando tiverem, nunca antes disso).
 */
function buildLimitationsChapter(): CycleBookChapter {
  return {
    id: "limitacoes",
    title: "Limitações deste Livro",
    hasContent: true,
    body: [
      "Este Livro reúne só o que já é real e computado nesta organização — nada é estimado para " +
        "preencher uma lacuna.",
      "Associações entre medidas do Plano Vivo e queda de exposição são orientativas: sem grupo de " +
        "controle, é correlação, nunca prova de causalidade.",
      "Toda leitura agregada respeita k-anonimato ≥ 5 — nenhum recorte menor aparece, mesmo quando " +
        "existiria um número a mostrar.",
      "O escopo real hoje é o instrumento COPSOQ (Domínio B, exposição psicossocial NR-01). Outras " +
        "lentes do blueprint original (FIB-T, Selo Empresa Viva) ainda não têm pipeline de dado real " +
        "equivalente por organização — entrarão neste Livro quando tiverem, nunca antes.",
    ],
  };
}

export function buildCycleBook(input: CycleBookInput): CycleBookDocument {
  const chapters = [
    buildMeasurementChapter(input),
    buildEvolutionChapter(input),
    buildVictoriesChapter(input),
  ];
  const nonVictoriesChapter = buildNonVictoriesChapter(input);
  if (nonVictoriesChapter) chapters.push(nonVictoriesChapter);
  chapters.push(buildEsgChapter(input), buildPlanChapter(input));
  const efficacyChapter = buildEfficacyChapter(input);
  if (efficacyChapter) chapters.push(efficacyChapter);
  chapters.push(buildLimitationsChapter());

  return {
    meta: input.meta,
    headline: headlineFor(input),
    chapters,
    disclaimer: DISCLAIMER,
  };
}
