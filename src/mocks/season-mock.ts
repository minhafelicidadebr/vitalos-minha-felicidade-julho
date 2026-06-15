// Plano anual operacional — config de domínio (não é engine). Mapeia o ciclo
// M.E.T.E. (Mensurar → Educar → Transformar → Evoluir) ao longo de 4 temporadas
// × 13 semanas (52 semanas = 1 ano). Cada temporada é ancorada num instrumento
// científico e roda o ciclo completo.
//
// ORDEM CANÔNICA (espinha Furtado/anexo): Risco → Bem-Comum → Florescimento →
// Forças → Síntese. A IDENTIDADE de cada temporada (nome, instrumento, camada,
// pergunta, cor) deriva de CANONICAL_JOURNEY — fonte única compartilhada com
// /programa e /relatorio-global. Aqui ficam apenas os detalhes operacionais
// (fases M.E.T.E. e atividades).
//
// Fonte científica: src/domain/journey.ts + docs/ARQUITETURA_CIENTIFICA.md.

import type { AnnualPlan, MetePhaseDef, SeasonActivity } from "@/engine/season/season-engine";
import { CANONICAL_JOURNEY } from "@/domain/journey";

const [RISCO, BEM_COMUM, FLORESCIMENTO, FORCAS] = CANONICAL_JOURNEY;

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

// ─── T1 · Fundação Segura — Camada 1 (Risco psicossocial, COPSOQ/NR-1) ────────

const FUNDACAO_ACTIVITIES: SeasonActivity[] = [
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
    title: "Atualizar o PGR e preparar a Temporada do Bem-Comum",
    owner: "CHRO",
    phaseId: "evoluir",
  },
];

// ─── T2 · Raízes do Bem-Comum — Camada 2 (Ecossistema, FIB-T) ─────────────────

const BEM_COMUM_ACTIVITIES: SeasonActivity[] = [
  {
    week: 1,
    title: "Abrir o censo FIB-T (32 itens, 9 domínios de vida)",
    owner: "RH",
    phaseId: "mensurar",
  },
  {
    week: 2,
    title: "Mobilizar embaixadores para participação ampla (alvo ≥ 70%)",
    owner: "Embaixador",
    phaseId: "mensurar",
  },
  {
    week: 3,
    title: "Fechar a coleta e calcular o índice FIB-T do ecossistema",
    owner: "RH",
    phaseId: "mensurar",
  },
  {
    week: 4,
    title: "Devolutiva coletiva: ler os 9 domínios sem rótulo individual",
    owner: "Líder",
    phaseId: "educar",
  },
  {
    week: 5,
    title: "Rodas de escuta sobre os domínios mais frágeis",
    owner: "RH",
    phaseId: "educar",
  },
  {
    week: 7,
    title: "Pactos de equipe nos domínios de bem-comum (tempo, comunidade)",
    owner: "Líder",
    phaseId: "transformar",
  },
  {
    week: 8,
    title: "Iniciar iniciativas no Culture Lab para os domínios críticos",
    owner: "RH",
    phaseId: "transformar",
  },
  {
    week: 11,
    title: "Pulse FIB-T: medir a variação dos domínios tocados",
    owner: "Colaborador",
    phaseId: "evoluir",
  },
  {
    week: 13,
    title: "Ligar o ganho à ponte ESG e preparar a Temporada do Florescimento",
    owner: "CHRO",
    phaseId: "evoluir",
  },
];

// ─── T3 · Florescimento — Camada 3 (Vitalidade, PERMA+V → IVO) ────────────────

const FLORESCIMENTO_ACTIVITIES: SeasonActivity[] = [
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
    title: "Consolidar evidências e preparar a Temporada das Forças",
    owner: "CHRO",
    phaseId: "evoluir",
  },
];

// ─── T4 · Forças em Cultura — Camada 4 (Forças, VIA-T) + síntese do ano ───────

const FORCAS_ACTIVITIES: SeasonActivity[] = [
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
    title: "Remedir o ICUFT e gerar a prontidão ESG/ODS/FIB do ano",
    owner: "RH",
    phaseId: "evoluir",
  },
  {
    week: 13,
    title: "Emitir o Relatório Global e o Selo Empresa Viva; planejar o próximo ano",
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
      name: RISCO.seasonName,
      cycleId: RISCO.cycleId,
      layer: RISCO.layer,
      layerLabel: RISCO.layerLabel,
      question: RISCO.guidingQuestion,
      primaryInstrument: RISCO.instrument,
      color: RISCO.color,
      startLabel: RISCO.startLabel,
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
      activities: FUNDACAO_ACTIVITIES,
    },
    {
      id: "t2-2026",
      index: 2,
      name: BEM_COMUM.seasonName,
      cycleId: BEM_COMUM.cycleId,
      layer: BEM_COMUM.layer,
      layerLabel: BEM_COMUM.layerLabel,
      question: BEM_COMUM.guidingQuestion,
      primaryInstrument: BEM_COMUM.instrument,
      color: BEM_COMUM.color,
      startLabel: BEM_COMUM.startLabel,
      phases: metePhases({
        mensurar: {
          objective: "Medir a Felicidade Interna Bruta em 9 domínios de vida (32 itens).",
          instruments: ["FIB-T", "Censo de bem-estar"],
          deliverable: "Índice FIB-T + perfil dos 9 domínios (n≥5)",
        },
        educar: {
          objective: "Devolver os domínios frágeis como agenda coletiva, sem rótulo individual.",
          instruments: ["Devolutiva FIB-T", "Rodas de escuta"],
          deliverable: "Mapa dos domínios prioritários por área",
        },
        transformar: {
          objective: "Agir sobre os domínios de bem-comum mais frágeis (tempo, comunidade, saúde).",
          instruments: ["Culture Lab", "Pactos de equipe"],
          deliverable: "Iniciativas de bem-comum em curso",
        },
        evoluir: {
          objective: "Remedir os domínios tocados e ligar o ganho à ponte ESG.",
          instruments: ["Pulse FIB-T", "Ponte ESG"],
          deliverable: "Variação dos domínios + contribuição social (S)",
        },
      }),
      activities: BEM_COMUM_ACTIVITIES,
    },
    {
      id: "t3-2026",
      index: 3,
      name: FLORESCIMENTO.seasonName,
      cycleId: FLORESCIMENTO.cycleId,
      layer: FLORESCIMENTO.layer,
      layerLabel: FLORESCIMENTO.layerLabel,
      question: FLORESCIMENTO.guidingQuestion,
      primaryInstrument: FLORESCIMENTO.instrument,
      color: FLORESCIMENTO.color,
      startLabel: FLORESCIMENTO.startLabel,
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
          deliverable: "Evidência de variação do IVO + plano da T4",
        },
      }),
      activities: FLORESCIMENTO_ACTIVITIES,
    },
    {
      id: "t4-2026",
      index: 4,
      name: FORCAS.seasonName,
      cycleId: FORCAS.cycleId,
      layer: FORCAS.layer,
      layerLabel: FORCAS.layerLabel,
      question: FORCAS.guidingQuestion,
      primaryInstrument: FORCAS.instrument,
      color: FORCAS.color,
      startLabel: FORCAS.startLabel,
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
          objective: "Remedir o ICUFT e fechar o ano: Relatório Global ESG + Selo Empresa Viva.",
          instruments: ["ICUFT", "ESG/ODS/FIB", "Selo Empresa Viva"],
          deliverable:
            "Potencial subutilizado + Relatório Global ESG + Selo + plano do próximo ano",
        },
      }),
      activities: FORCAS_ACTIVITIES,
    },
  ],
};

// "Hoje" determinístico do programa: T1 (Fundação Segura), semana 8 → Transformar.
// (o card de temporada do dashboard do colaborador deriva deste mesmo valor)
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
  title: "A Jornada de Vitalidade em 1 Ano",
  lead:
    "Quatro instrumentos, quatro temporadas de 13 semanas, na ordem que importa: " +
    "primeiro o que pode adoecer, depois o que faz florescer. Cada estação roda o ciclo " +
    "Mensurar → Educar → Transformar → Evoluir — aferir é só o começo.",
};
