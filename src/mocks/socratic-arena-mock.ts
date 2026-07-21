// Conteúdo da Arena de Debate Socrático (LD-010, Fatia B) — dilema aprovado
// no ADR: docs/learning/PLANO_ARENA_SOCRATICA_LD010_2026-07-21.md.
//
// FONTES AUTORIZADAS (eixos Achievement/Management/Operational Design, TASK.md
// deste ADR): ACH-001, ACH-002, MGT-005 (evidência empírica/revisão) e OPD-001,
// OPD-002 (síntese/modelo teórico — nunca apresentados como intervenção
// testada). Nenhum destes eixos ainda tinha rota surfaceada no produto.
//
// HONESTIDADE DA ASSIMETRIA (registrada no ADR, não escondida): as 5 fontes
// autorizadas SÓ sustentam o Lado A (autonomia participativa). O registro
// congelado não tem, hoje, um estudo que sustente diretamente o Lado B
// (direção centralizada) — por isso toda carta do Lado B é `basis:
// "valor_operacional"`, sem `sourceStudyId`: raciocínio operacional legítimo,
// nunca disfarçado de evidência. O motor (socratic-arena-engine.ts) recusa por
// construção uma carta `valor_operacional` que cite estudo.
//
// A consistência (ids existem + trust gate + ambos os lados + ausência de
// linguagem de vencedor/ranking) é verificada em
// socratic-arena-consistency.test.ts — por teste, não por fé.

import type { ArenaDilemma } from "@/engine/learning/socratic-arena-engine";

export const AUTONOMIA_OU_DIRECAO_DILEMMA: ArenaDilemma = {
  id: "arena-autonomia-ou-direcao",
  title: "Autonomia participativa ou direção centralizada?",
  framing:
    "Todo líder enfrenta este dilema mais de uma vez: deixar o time coconstruir metas e formas de trabalho, ou definir o caminho de cima para garantir velocidade e coordenação? Não existe resposta certa fora do contexto — o objetivo aqui é considerar os dois lados com seriedade, não escolher um vencedor. Regras: foque em ideias, não em pessoas ou equipes reais; nada aqui é avaliação de você; esta sessão é privada e não é registrada nem compartilhada.",
  sideALabel: "Autonomia participativa",
  sideBLabel: "Direção centralizada",
  cards: [
    // ─── Lado A — evidência empírica/revisão (eixos Achievement/Management) ──
    {
      id: "aoc-a1",
      side: "A",
      basis: "evidencia_empirica",
      text: "Um estudo quase-experimental encontrou que participar do desenho do próprio sistema de metas/avaliação associa-se a atitudes e desempenho mais favoráveis do que receber o sistema já pronto, nos contextos organizacionais estudados.",
      sourceStudyId: "ACH-001",
    },
    {
      id: "aoc-a2",
      side: "A",
      basis: "evidencia_empirica",
      text: "Em contexto de gestão da qualidade, a participação dos empregados associou-se a respostas mais favoráveis ao sistema — com o efeito dependendo de como a participação foi desenhada, não sendo automático.",
      sourceStudyId: "ACH-002",
    },
    {
      id: "aoc-a3",
      side: "A",
      basis: "evidencia_empirica",
      text: "Uma revisão sistemática de estudos de intervenção aponta que o redesenho do trabalho tende a funcionar melhor quando quem faz o trabalho participa do próprio redesenho — os efeitos variam por contexto e implementação.",
      sourceStudyId: "MGT-005",
    },
    // ─── Lado A — síntese/modelo teórico (Operational Design) — nunca ─────────
    // apresentados como intervenção testada, só como base conceitual.
    {
      id: "aoc-a4",
      side: "A",
      basis: "sintese_teorica",
      text: "Uma síntese teórica influente argumenta que perspectivas relacionais e proativas ampliam o desenho clássico do trabalho — um fundamento conceitual para dar às pessoas autoria sobre o próprio trabalho (não é, em si, prova de intervenção).",
      sourceStudyId: "OPD-001",
    },
    {
      id: "aoc-a5",
      side: "A",
      basis: "sintese_teorica",
      text: "O modelo teórico de 'job crafting' descreve como pessoas remodelam ativamente tarefas e relações do próprio trabalho — é uma lente conceitual sobre por que dar espaço de autoria pode importar, não uma intervenção já testada.",
      sourceStudyId: "OPD-002",
    },
    // ─── Lado B — raciocínio operacional, SEM estudo por trás (honesto) ──────
    {
      id: "aoc-b1",
      side: "B",
      basis: "valor_operacional",
      text: "Sob prazo apertado ou crise real, esperar o tempo de coconstrução pode custar a janela de decisão — uma direção clara agora evita paralisia quando não dá para esperar.",
    },
    {
      id: "aoc-b2",
      side: "B",
      basis: "valor_operacional",
      text: "Quando metas precisam ser comparáveis entre vários times (por exemplo, indicadores corporativos), centralizar a definição garante que todo mundo meça a mesma coisa, da mesma forma.",
    },
    {
      id: "aoc-b3",
      side: "B",
      basis: "valor_operacional",
      text: "Times muito novos, ou decisões com pouco contexto acumulado, podem se beneficiar de um norte claro antes de terem informação suficiente para coconstruir com qualidade.",
    },
    {
      id: "aoc-b4",
      side: "B",
      basis: "valor_operacional",
      text: "Participação genuína tem custo real de tempo e coordenação — nem toda decisão comporta esse investimento, e insistir nele pode atrasar o que era simples.",
    },
    {
      id: "aoc-b5",
      side: "B",
      basis: "valor_operacional",
      text: "Em contextos com exigência regulatória rígida, processos centralizados e padronizados reduzem o risco de variação indevida entre equipes.",
    },
  ],
  closingSynthesis:
    "Não há um lado certo fora do contexto. A evidência disponível hoje favorece a participação quando existe tempo para desenhar junto — atitudes e desempenho tendem a responder melhor. Mas centralizar pode ser a escolha certa sob urgência real, quando a comparabilidade entre times importa mais do que a adaptação local, ou quando o time ainda não tem contexto para coconstruir com qualidade. O trade-off é genuíno: cada escolha tem um custo real, e a pergunta que fica não é 'qual lado venceu', mas 'o que este contexto específico pede agora'.",
};

/** Biblioteca de dilemas da Arena (hoje, 1 dilema — mais entram por decisão
 * própria do founder, cada um com seu próprio levantamento de fontes). */
export const SOCRATIC_ARENA_DILEMMAS = [AUTONOMIA_OU_DIRECAO_DILEMMA] as const;
