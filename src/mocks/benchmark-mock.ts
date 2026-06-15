// Benchmark — config de domínio (não é engine). O "agregado entre clientes":
// estatísticas de distribuição (quartis) por coorte setorial × porte. Cada
// coorte declara nOrgs — a base do k-anonimato ENTRE TENANTS. Tudo sintético e
// agregado; nenhuma organização individual existe aqui.
//
// Em produção, viriam de uma agregação periódica entre tenants, com nOrgs real
// e supressão automática de coortes pequenos (o engine já recusa nOrgs < mínimo).

import type { CohortStats, OrgMetric } from "@/engine/benchmark/benchmark-engine";
import type { IVOResult } from "@/engine/index/ivo-engine";

// Pilares materiais exibidos no benchmark (subconjunto curado dos 16).
const BENCH_PILLARS = [
  "energia_vitalidade",
  "proposito_significado",
  "equilibrio_autonomia",
  "seguranca_psicologica",
  "reconhecimento_pares",
  "justica_coerencia",
  "condicoes_carga",
  "cultura_bem_estar",
];

export const SECTOR_COHORTS: CohortStats[] = [
  {
    cohortId: "tech-200-1000",
    label: "Tecnologia · 200–1000 colaboradores",
    nOrgs: 14,
    metrics: [
      { metricId: "ivo", p25: 520, median: 600, p75: 680 },
      { metricId: "eu", p25: 540, median: 615, p75: 695 },
      { metricId: "nos", p25: 525, median: 605, p75: 685 },
      { metricId: "lideranca", p25: 500, median: 585, p75: 670 },
      { metricId: "organizacao", p25: 510, median: 590, p75: 675 },
      { metricId: "energia_vitalidade", p25: 470, median: 555, p75: 640 },
      { metricId: "proposito_significado", p25: 560, median: 640, p75: 720 },
      { metricId: "equilibrio_autonomia", p25: 480, median: 560, p75: 645 },
      { metricId: "seguranca_psicologica", p25: 520, median: 600, p75: 685 },
      { metricId: "reconhecimento_pares", p25: 490, median: 575, p75: 660 },
      { metricId: "justica_coerencia", p25: 500, median: 585, p75: 670 },
      { metricId: "condicoes_carga", p25: 460, median: 545, p75: 635 },
      { metricId: "cultura_bem_estar", p25: 530, median: 610, p75: 690 },
    ],
  },
  {
    cohortId: "servicos-1000-5000",
    label: "Serviços · 1000–5000 colaboradores",
    nOrgs: 9,
    metrics: [
      { metricId: "ivo", p25: 500, median: 575, p75: 655 },
      { metricId: "eu", p25: 515, median: 590, p75: 670 },
      { metricId: "nos", p25: 505, median: 580, p75: 660 },
      { metricId: "lideranca", p25: 485, median: 560, p75: 645 },
      { metricId: "organizacao", p25: 495, median: 570, p75: 650 },
      { metricId: "energia_vitalidade", p25: 450, median: 530, p75: 615 },
      { metricId: "proposito_significado", p25: 540, median: 620, p75: 700 },
      { metricId: "equilibrio_autonomia", p25: 460, median: 540, p75: 625 },
      { metricId: "seguranca_psicologica", p25: 500, median: 580, p75: 665 },
      { metricId: "reconhecimento_pares", p25: 470, median: 555, p75: 640 },
      { metricId: "justica_coerencia", p25: 480, median: 565, p75: 650 },
      { metricId: "condicoes_carga", p25: 440, median: 525, p75: 615 },
      { metricId: "cultura_bem_estar", p25: 510, median: 590, p75: 675 },
    ],
  },
  {
    // Coorte fino de propósito: demonstra o k-anonimato entre tenants (oculto).
    cohortId: "industria-menos-50",
    label: "Indústria · menos de 50 colaboradores",
    nOrgs: 3,
    metrics: [{ metricId: "ivo", p25: 480, median: 550, p75: 620 }],
  },
];

/** Constrói as métricas da org (IVO + 4 lentes + pilares materiais) a partir do resultado do IVO. */
export function orgMetricsFromIvo(result: IVOResult): OrgMetric[] {
  const metrics: OrgMetric[] = [
    { metricId: "ivo", label: "IVO global", score: result.ivoScore, kind: "ivo" },
  ];

  for (const lens of result.lenses) {
    metrics.push({
      metricId: lens.lensId,
      label: lens.lensName.split(" — ")[0] ?? lens.lensName,
      score: lens.score,
      kind: "lens",
    });
    for (const p of lens.pillars) {
      if (!BENCH_PILLARS.includes(p.pillarId)) continue;
      if (!p.visible) continue; // recorte oculto não entra no benchmark
      metrics.push({
        metricId: p.pillarId,
        label: p.pillarName,
        score: p.score,
        kind: "pillar",
        weight: p.weight,
      });
    }
  }
  return metrics;
}

export const POSITION_COPY: Record<string, { label: string; color: string; bg: string }> = {
  lider: {
    label: "Líder do setor",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-100 dark:bg-violet-950/40",
  },
  acima: {
    label: "Acima da mediana",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  mediana: {
    label: "Na mediana",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950/30",
  },
  abaixo: {
    label: "Abaixo da mediana",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
};

export const BENCHMARK_INTRO = {
  eyebrow: "Benchmark Setorial · Anônimo",
  title: "Onde você está no seu setor",
  lead:
    "Compare a sua vitalidade com o agregado anônimo de organizações do mesmo setor e porte. " +
    "Você vê a sua posição na distribuição — nunca o dado de outra empresa.",
  disclaimer:
    "Comparação indicativa contra a distribuição agregada do coorte (quartis), não contra " +
    "qualquer organização específica. Coortes com menos de 5 organizações ficam ocultos por " +
    "k-anonimato entre tenants — proteger o concorrente protege você. As faixas variam entre ciclos.",
  protectedNote:
    "Este coorte tem organizações de menos para comparar com segurança. Por k-anonimato entre " +
    "tenants, ele fica oculto até reunir ao menos 5 organizações — assim nenhuma empresa é " +
    "identificável pela comparação.",
};
