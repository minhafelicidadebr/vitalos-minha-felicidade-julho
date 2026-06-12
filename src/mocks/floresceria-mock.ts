import type { AIMode, AIResponse } from "../engine/ai/ai-types";

export const AI_MODES: AIMode[] = [
  { id: "insight_semanal", label: "Insight da semana", roles: ["COLABORADOR"], description: "Um destaque pessoal acionável" },
  { id: "microacao", label: "Micro-ação de hoje", roles: ["COLABORADOR"], description: "Sugestão de 5 minutos para o seu dia" },
  { id: "preparar_kudo", label: "Me ajude a reconhecer", roles: ["COLABORADOR"], description: "Rascunho de um kudo sincero" },
  { id: "copiloto_lider", label: "Copiloto do Líder", roles: ["LIDER_EQUIPE"], description: "Leitura dos agregados da equipe" },
  { id: "preparar_1on1", label: "Preparar conversa", roles: ["LIDER_EQUIPE"], description: "Roteiro de 1:1 sobre carga" },
  { id: "sugerir_protocolo", label: "Sugerir protocolo", roles: ["LIDER_EQUIPE", "RH_ADMIN", "CHRO"], description: "Protocolo do Culture Lab para o pilar mais baixo" },
  { id: "ler_heatmap", label: "Ler o heatmap", roles: ["RH_ADMIN", "CHRO"], description: "Padrões e hipóteses nos agregados" },
  { id: "rascunho_comunicado", label: "Rascunho de comunicado", roles: ["RH_ADMIN", "CHRO"], description: "Comunicação de resultados com transparência" },
  { id: "preparar_diretoria", label: "Preparar diretoria", roles: ["CHRO", "C_LEVEL"], description: "3 mensagens com números e honestidade" },
  { id: "risco_nr1", label: "Visão NR-1", roles: ["SST_PROFISSIONAL", "CHRO"], description: "Leitura educativa do inventário de riscos" },
];

// High-quality canned responses per mode (Fase 2 will call the real LLM proxy)
export const AI_RESPONSES: Record<string, AIResponse> = {
  insight_semanal: {
    text: "Seu pilar Propósito & Significado está em alta esta semana na sua organização. Pessoas que conectam o trabalho diário a algo maior tendem a sustentar energia por mais tempo. Que tal anotar uma linha hoje sobre o que fez seu trabalho valer a pena?",
  },
  microacao: {
    text: "Micro-ação de hoje (5 min): antes da próxima reunião, escreva a única coisa que você quer que aconteça nela. Clareza pessoal reduz reuniões que drenam — e protege seu pilar de Energia.",
  },
  preparar_kudo: {
    text: "Rascunho: \"Pedro, sua paciência explicando o fluxo de deploy ontem me destravou completamente. Você tem um talento raro de ensinar sem fazer o outro se sentir pequeno. Obrigada!\" — Dica: kudos específicos (o quê + o efeito em você) valem mais que elogios genéricos.",
  },
  copiloto_lider: {
    text: "Leitura dos agregados (n=7): sua equipe combina alta segurança psicológica (775) com baixo equilíbrio (425). Tradução: as pessoas falam abertamente — inclusive sobre estarem no limite. Isso é um ativo: equipes que ainda confiam avisam antes de adoecer. A janela de ação é agora.",
    proposal: {
      id: "prop-01",
      summary: "Ativar protocolo 'Pausas Protegidas' (4 semanas)",
      detail: "Bloquear 2 janelas de 3h sem reunião por semana, com você dando o exemplo. Efeito esperado: +10 a +20 pts em Equilíbrio & Autonomia. Medição antes/depois automática.",
      requiresApproval: true,
    },
  },
  preparar_1on1: {
    text: "Roteiro sugerido (30 min): 1) 'Como está sua carga, de verdade?' — e silêncio para ouvir. 2) 'O que eu poderia tirar do seu caminho esta semana?' 3) Um compromisso concreto seu, registrado. Evite: prometer o que não controla, comparar com colegas, minimizar ('todo mundo está assim').",
  },
  sugerir_protocolo: {
    text: "O pilar mais baixo da organização é Condições & Carga (450). O protocolo 'Carga Visível' (4 semanas) cria um termômetro semanal anônimo e obriga repactuação quando ≥30% reportam sobrecarga. Funciona porque transforma percepção difusa em decisão concreta de gestão.",
    proposal: {
      id: "prop-02",
      summary: "Ativar 'Carga Visível' na equipe de Fechamento (Sul)",
      detail: "Equipe com maior exposição no heatmap. 4 semanas, medição antes/depois vs equipes de comparação. Decisões registradas como evidência GRO.",
      requiresApproval: true,
    },
  },
  ler_heatmap: {
    text: "Padrões no heatmap: 1) A lente ORGANIZAÇÃO é a mais baixa em 2 de 3 unidades — o problema é sistêmico, não de equipes. 2) A Unidade Sul concentra o risco (489): hipótese plausível é a mudança de turno de março. 3) NE é sua referência interna (702 em NÓS) — vale estudar o que eles fazem antes de importar solução de fora.",
  },
  rascunho_comunicado: {
    text: "Rascunho: \"Time, os resultados do ciclo T1 chegaram. Subimos 51 pontos — obrigado a cada um dos 374 que respondeu. E vamos ser transparentes: Condições & Carga segue crítico, especialmente na Sul. Não vamos fingir que está tudo bem; vamos agir. Já está rodando um piloto de revisão de carga, e os resultados serão públicos aqui.\" — Transparência sobre o ruim gera mais confiança que celebração seletiva.",
  },
  preparar_diretoria: {
    text: "3 mensagens para a diretoria: 1) IVO subiu 51 pts em um ciclo — o sistema funciona e a participação (78%) valida o dado. 2) O risco está concentrado e nomeado: carga na Sul. Custo de inação estimado: R$ 5,5M/12m (fórmula transparente no P&L). 3) Pedimos uma decisão, não verba: proteger as janelas de pausa do piloto contra a pressão de prazos do Q3.",
  },
  risco_nr1: {
    text: "Leitura educativa do inventário: a exposição 'alta' em sobrecarga conecta-se diretamente ao pilar Condições & Carga (450) — coerência entre percepção e inventário fortalece a trilha documental. Recomendação: anexar o resultado do piloto 'Carga Visível' como evidência de ação. Lembrete: este material prepara o PGR, não o substitui.",
  },
};
