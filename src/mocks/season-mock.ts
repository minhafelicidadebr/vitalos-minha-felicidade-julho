// Plano anual operacional — config de domínio (não é engine). Mapeia o ciclo
// M.E.T.E. (Mensurar → Educar → Transformar → Evoluir) das 4 lentes ao longo de
// 4 temporadas × 13 semanas (52 semanas = 1 ano). Cada temporada é ancorada num
// instrumento científico (camada de medição) e roda o ciclo completo.
//
// Responde à pergunta estratégica: "como o gestor operacionaliza as 4 lentes
// dentro de um cronograma?" — cada aferição vira uma temporada, e as atividades
// pós-aferição (Educar/Transformar/Evoluir) preenchem o trimestre.
//
// Fonte científica: docs/ARQUITETURA_CIENTIFICA.md (4 camadas de medição).

import type { AnnualPlan, MetePhaseDef, SeasonActivity } from "@/engine/season/season-engine";

// Fronteiras M.E.T.E. comuns às 4 temporadas (13 semanas):
//   Mensurar  w1–3   · Educar  w4–6   · Transformar w7–10  · Evoluir w11–13
function metePhases(over: {
  mensurar: Pick<MetePhaseDef, "objective" | "instruments" | "deliverable">;
  educar: Pick<MetePhaseDef, "objective" | "instruments" | "deliverable">;
  transformar: Pick<MetePhaseDef, "objective" | "instruments" | "deliverable">;
  evoluir: Pick<MetePhaseDef, "objective" | "instruments" | "deliverable">;
}): MetePhaseDef[] {
  return [
    { id: "mensurar", label: "Mensurar", weekStart: 1, weekEnd: 3, ...over.mensurar },
    { id: "educar", label: "Educar", weekStart: 4, weekEnd: 6, ...over.educar },
    { id: "transformar", label: "Transformar", weekStart: 7, weekEnd: 10, ...over.transformar },
    { id: "evoluir", label: "Evoluir", weekStart: 11, weekEnd: 13, ...over.evoluir },
  ];
}

// ─── T1 · Primavera da Vitalidade — Camada 2 (Florescimento, PERMA/IVO) ───────

const T1_ACTIVITIES: SeasonActivity[] = [
  {
    week: 1,
    title: "Abrir a campanha do IVO (PERMA, 15 itens) para toda a organização",
    owner: "RH",
    phaseId: "mensurar",
  },
  {
    week: 2,
    title: "Mobilizar embaixadores para elevar a participação (alvo ≥ 70%)",
    owner: "Embaixador",
    phaseId: "mensurar",
  },
  {
    week: 3,
    title: "Fechar a coleta e calcular o IVO basal do ano",
    owner: "RH",
    phaseId: "mensurar",
  },
  {
    week: 4,
    title: "Devolutiva por equipe: ler o radar das 4 lentes com cada líder",
    owner: "Líder",
    phaseId: "educar",
  },
  {
    week: 5,
    title: "Workshop sobre os 2–3 pilares mais frágeis (linguagem PERMA)",
    owner: "RH",
    phaseId: "educar",
  },
  {
    week: 7,
    title: "Selecionar protocolos do Playbook para os pilares críticos",
    owner: "RH",
    phaseId: "transformar",
  },
  {
    week: 8,
    title: "Iniciar experimentos no Culture Lab com responsável e métrica",
    owner: "Líder",
    phaseId: "transformar",
  },
  {
    week: 11,
    title: "Pulse de validação: medir o efeito das intervenções",
    owner: "Colaborador",
    phaseId: "evoluir",
  },
  {
    week: 13,
    title: "Consolidar evidências e planejar a Temporada das Forças",
    owner: "CHRO",
    phaseId: "evoluir",
  },
];

// ─── T2 · Verão das Forças — Camada 3 (Forças, VIA-T v1) ──────────────────────

const T2_ACTIVITIES: SeasonActivity[] = [
  {
    week: 1,
    title: "Abrir o Mapa de Forças VIA-T (48 itens + ICUFT)",
    owner: "RH",
    phaseId: "mensurar",
  },
  {
    week: 2,
    title: "Reforçar o caráter exploratório e de autodesenvolvimento",
    owner: "Embaixador",
    phaseId: "mensurar",
  },
  {
    week: 4,
    title: "Devolutiva individual: Top 5 forças + missão de 7 dias",
    owner: "Colaborador",
    phaseId: "educar",
  },
  {
    week: 5,
    title: "Leitura coletiva das virtudes da equipe (agregado n≥5)",
    owner: "Líder",
    phaseId: "educar",
  },
  {
    week: 7,
    title: "Job crafting baseado em forças: realinhar tarefas ao talento",
    owner: "Líder",
    phaseId: "transformar",
  },
  {
    week: 8,
    title: "Personalizar trilhas da Academia por forças de afinidade",
    owner: "RH",
    phaseId: "transformar",
  },
  {
    week: 11,
    title: "Remedir o ICUFT: o ambiente passou a permitir usar as forças?",
    owner: "RH",
    phaseId: "evoluir",
  },
  {
    week: 13,
    title: "Mapear potencial subutilizado e preparar a Temporada da Segurança",
    owner: "CHRO",
    phaseId: "evoluir",
  },
];

// ─── T3 · Outono da Segurança — Camada 1 (Risco, COPSOQ/NR-1) ─────────────────

const T3_ACTIVITIES: SeasonActivity[] = [
  {
    week: 1,
    title: "Aplicar o COPSOQ (Domínio B) — inventário de riscos psicossociais",
    owner: "SST",
    phaseId: "mensurar",
  },
  {
    week: 2,
    title: "Garantir anonimato e mínimo de 5 respondentes por recorte",
    owner: "SST",
    phaseId: "mensurar",
  },
  {
    week: 4,
    title: "Interpretar resultados com profissional habilitado e a CIPA",
    owner: "SST",
    phaseId: "educar",
  },
  {
    week: 5,
    title: "Educação sobre NR-1/GRO e fatores de risco psicossocial",
    owner: "RH",
    phaseId: "educar",
  },
  {
    week: 7,
    title: "Elaborar o plano de ação (GRO) por categoria de risco",
    owner: "SST",
    phaseId: "transformar",
  },
  {
    week: 8,
    title: "Implementar medidas de controle das dimensões em risco",
    owner: "Líder",
    phaseId: "transformar",
  },
  {
    week: 11,
    title: "Monitorar exposição e registrar evidência documental",
    owner: "SST",
    phaseId: "evoluir",
  },
  {
    week: 13,
    title: "Atualizar o PGR e preparar a Temporada da Cultura",
    owner: "CHRO",
    phaseId: "evoluir",
  },
];

// ─── T4 · Inverno da Cultura — Camada 4 (Ação/Consolidação, Playbook + ESG) ───

const T4_ACTIVITIES: SeasonActivity[] = [
  {
    week: 1,
    title: "Remedir o IVO anual e calcular o delta vs. T1",
    owner: "RH",
    phaseId: "mensurar",
  },
  {
    week: 2,
    title: "Consolidar dados das 4 camadas do ano em um só painel",
    owner: "CHRO",
    phaseId: "mensurar",
  },
  {
    week: 4,
    title: "Relatório anual de cultura e town hall de resultados",
    owner: "CHRO",
    phaseId: "educar",
  },
  {
    week: 5,
    title: "Revisar o Pacto de Cultura com base no que mudou",
    owner: "Líder",
    phaseId: "educar",
  },
  {
    week: 7,
    title: "Protocolos de consolidação e ativação das embaixadorias",
    owner: "Embaixador",
    phaseId: "transformar",
  },
  {
    week: 8,
    title: "Experimentos finais para os pilares ainda frágeis",
    owner: "RH",
    phaseId: "transformar",
  },
  {
    week: 11,
    title: "Gerar a prontidão ESG/ODS/FIB e organizar evidências",
    owner: "RH",
    phaseId: "evoluir",
  },
  {
    week: 13,
    title: "Emitir o Selo Empresa Viva e planejar o próximo ano",
    owner: "CHRO",
    phaseId: "evoluir",
  },
];

export const ANNUAL_PLAN: AnnualPlan = {
  year: 2026,
  weeksPerSeason: 13,
  seasons: [
    {
      id: "t1-2026",
      index: 1,
      name: "Primavera da Vitalidade",
      cycleId: "T1-2026",
      layer: 2,
      layerLabel: "Camada 2 · Florescimento",
      question: "Como as pessoas estão?",
      primaryInstrument: "IVO + PERMA",
      color: "#10B981",
      startLabel: "Jan–Mar",
      phases: metePhases({
        mensurar: {
          objective: "Estabelecer o IVO basal do ano com o PERMA (15 itens).",
          instruments: ["IVO", "PERMA"],
          deliverable: "Radar das 4 lentes + IVO basal",
        },
        educar: {
          objective: "Traduzir os dados em entendimento: o que cada pilar significa.",
          instruments: ["Devolutiva", "FlorescerIA"],
          deliverable: "Workshops por equipe nos pilares frágeis",
        },
        transformar: {
          objective: "Rodar protocolos de evidência para os pilares críticos.",
          instruments: ["Culture Lab", "Playbook"],
          deliverable: "Experimentos ativos com métrica e responsável",
        },
        evoluir: {
          objective: "Validar o efeito e consolidar o aprendizado da temporada.",
          instruments: ["Pulse", "Relatórios"],
          deliverable: "Evidência de variação do IVO + plano da T2",
        },
      }),
      activities: T1_ACTIVITIES,
    },
    {
      id: "t2-2026",
      index: 2,
      name: "Verão das Forças",
      cycleId: "T2-2026",
      layer: 3,
      layerLabel: "Camada 3 · Forças",
      question: "Como cada um contribui?",
      primaryInstrument: "VIA-T v1",
      color: "#F59E0B",
      startLabel: "Abr–Jun",
      phases: metePhases({
        mensurar: {
          objective: "Mapear forças percebidas e as condições de uso (ICUFT).",
          instruments: ["VIA-T", "ICUFT"],
          deliverable: "Top 5 forças por pessoa + virtudes da equipe",
        },
        educar: {
          objective: "Devolver forças como linguagem de desenvolvimento, não avaliação.",
          instruments: ["Devolutiva VIA-T", "Missões 7 dias"],
          deliverable: "Missões de 7 dias + leitura coletiva",
        },
        transformar: {
          objective: "Realinhar trabalho e trilhas às forças de cada um.",
          instruments: ["Academia", "Job crafting"],
          deliverable: "Trilhas personalizadas + tarefas realinhadas",
        },
        evoluir: {
          objective: "Remedir o ICUFT e revelar potencial subutilizado.",
          instruments: ["ICUFT", "Dashboard coletivo"],
          deliverable: "Mapa de potencial subutilizado",
        },
      }),
      activities: T2_ACTIVITIES,
    },
    {
      id: "t3-2026",
      index: 3,
      name: "Outono da Segurança",
      cycleId: "T3-2026",
      layer: 1,
      layerLabel: "Camada 1 · Risco (Domínio B)",
      question: "O que ameaça as pessoas?",
      primaryInstrument: "COPSOQ / NR-1",
      color: "#DC2626",
      startLabel: "Jul–Set",
      phases: metePhases({
        mensurar: {
          objective: "Inventariar a exposição a fatores de risco psicossocial.",
          instruments: ["COPSOQ II", "Inventário NR-1"],
          deliverable: "Exposição por dimensão (agregada, n≥5)",
        },
        educar: {
          objective: "Interpretar o risco com a CIPA e profissional habilitado.",
          instruments: ["Profissional habilitado", "CIPA"],
          deliverable: "Leitura técnica + educação NR-1/GRO",
        },
        transformar: {
          objective: "Construir e executar o plano de ação (GRO).",
          instruments: ["Plano GRO", "Medidas de controle"],
          deliverable: "Medidas de controle por categoria de risco",
        },
        evoluir: {
          objective: "Monitorar, evidenciar e formalizar no PGR.",
          instruments: ["Monitoramento", "PGR"],
          deliverable: "Evidência documental + PGR atualizado",
        },
      }),
      activities: T3_ACTIVITIES,
    },
    {
      id: "t4-2026",
      index: 4,
      name: "Inverno da Cultura",
      cycleId: "T4-2026",
      layer: 4,
      layerLabel: "Camada 4 · Ação & Prova",
      question: "O que fazer e como provar?",
      primaryInstrument: "Re-IVO + ESG/Selo",
      color: "#7C3AED",
      startLabel: "Out–Dez",
      phases: metePhases({
        mensurar: {
          objective: "Remedir o IVO anual e consolidar as 4 camadas do ano.",
          instruments: ["IVO", "Painel anual"],
          deliverable: "Delta anual do IVO + visão consolidada",
        },
        educar: {
          objective: "Contar a história do ano e revisar o Pacto de Cultura.",
          instruments: ["Relatório anual", "Town hall"],
          deliverable: "Narrativa de cultura + pacto revisado",
        },
        transformar: {
          objective: "Consolidar ganhos via embaixadorias e protocolos finais.",
          instruments: ["Embaixadorias", "Culture Lab"],
          deliverable: "Ativação das embaixadorias",
        },
        evoluir: {
          objective: "Provar com dado: prontidão ESG e Selo Empresa Viva.",
          instruments: ["ESG/ODS/FIB", "Selo Empresa Viva"],
          deliverable: "Relatório ESG + Selo + plano do próximo ano",
        },
      }),
      activities: T4_ACTIVITIES,
    },
  ],
};

// "Hoje" determinístico do programa: T1, semana 8 → fase Transformar.
// (alinhado ao card de temporada do dashboard do colaborador)
export const CURRENT_PROGRAM_WEEK = 8;

// Mapa de cores por papel responsável (chips de atividade).
export const OWNER_COLOR: Record<string, string> = {
  RH: "#6366F1",
  CHRO: "#8B5CF6",
  Líder: "#0EA5E9",
  Colaborador: "#10B981",
  Embaixador: "#F59E0B",
  SST: "#DC2626",
};

// Glossário M.E.T.E. para o cabeçalho.
export const METE_GLOSSARY: Array<{ id: string; label: string; gist: string }> = [
  { id: "mensurar", label: "Mensurar", gist: "Aplicar o instrumento da temporada e gerar o dado." },
  { id: "educar", label: "Educar", gist: "Transformar dado em entendimento compartilhado." },
  {
    id: "transformar",
    label: "Transformar",
    gist: "Rodar intervenções de evidência sobre o que importa.",
  },
  {
    id: "evoluir",
    label: "Evoluir",
    gist: "Remedir, consolidar a prova e planejar o próximo ciclo.",
  },
];

export const SEASON_INTRO = {
  eyebrow: "Cronograma Operacional · Ciclo M.E.T.E.",
  title: "A Jornada das 4 Lentes em 1 Ano",
  lead:
    "Cada lente vira uma temporada de 13 semanas e roda o ciclo completo " +
    "Mensurar → Educar → Transformar → Evoluir. Aferir é só o começo: o trimestre " +
    "inteiro existe para virar o dado em ação e prova.",
};
