// Q3 · PERMA+V — EMPRESA SINTÉTICA DE DEMONSTRAÇÃO (mock-first).
//
// Tudo aqui é fictício: empresa, equipes, médias, ações e as 15 perguntas (autorais, ilustrativas).
// O instrumento validado só entra pela ficha de fonte aprovada (F3), ainda pendente. Entrega só AGREGADOS por equipe — nenhuma
// resposta individual. Nenhum número aqui é resultado real nem evidência.

export type PermaFactorId = "P" | "E" | "R" | "M" | "A";

export const Q3_DEMO_COPY = {
  title: "Q3 · PERMA+V — demonstração",
  badge: "Demonstração com dados sintéticos",
  disclaimer:
    "Empresa, equipes e números fictícios. As perguntas são exemplos ilustrativos escritos para esta demonstração; não são o instrumento validado. Nada aqui é resultado real, diagnóstico ou avaliação de pessoas.",
  experimental: "Leitura experimental e educativa. Não se relaciona a desempenho, promoção ou remuneração.",
  suppressed: "Oculto: menos de 5 respostas. Protegemos o anonimato do grupo.",
  denied: "Este perfil não acessa o Q3 nesta etapa. O acesso segue a política de papéis registrada.",
  personaHint: "Troque o perfil no cabeçalho para ver o fluxo de cada papel.",
  scaleHint: "0 = nada / nunca · 10 = completamente / sempre",
  submitted: "Obrigado! Na demonstração sua resposta fica só neste navegador e não é enviada.",
  collectiveTitle: "Devolutiva coletiva da organização",
  vitalityTitle: "Vitalidade (+V) · práticas sugeridas",
  vitalityDraft: "Rascunho em revisão editorial — convites, não prescrições.",
  convergenceTitle: "Régua do IVO · teste de convergência (sintético)",
  convergenceNote:
    "Correlação entre médias de equipe (Spearman), só equipes com 5 ou mais respostas. Critérios de demonstração; os reais serão fixados no plano registrado com o estatístico.",
  ownActionsTitle: "Minhas ações",
  actionsTitle: "Plano de ação proposto",
  labels: {
    adherence: "Adesão",
    responded: "respostas",
    invited: "convidados",
    teams: "Por equipe",
    org: "Organização (equipes visíveis)",
    priorities: "Fatores para cuidar primeiro",
    devolutiva: "Roteiro da devolutiva",
    questionnaire: "Questionário ilustrativo (15 perguntas de exemplo)",
    submit: "Enviar respostas (demonstração)",
    answered: "respondidas",
    owner: "Responsável",
    teamsUsed: "equipes",
    supports: "sustenta",
    doesNotSupport: "não sustenta",
    insufficient: "dados insuficientes",
    convergent: "convergente",
    discriminant: "discriminante",
    noActions: "Nenhuma ação sob sua responsabilidade neste ciclo.",
    empty: "Ainda não há equipes com respostas suficientes para mostrar o agregado.",
    loading: "Carregando a demonstração…",
    error: "Não foi possível montar a demonstração. Recarregue a página.",
    reset: "Responder de novo",
  },
} as const;

export const Q3_FACTORS: readonly { id: PermaFactorId; label: string }[] = [
  { id: "P", label: "Emoções positivas" },
  { id: "E", label: "Engajamento" },
  { id: "R", label: "Relacionamentos" },
  { id: "M", label: "Significado" },
  { id: "A", label: "Realização" },
];

/** 15 itens AUTORAIS e ILUSTRATIVOS (escala 0–10). Não são o instrumento validado nem paráfrase dele:
 * servem só para demonstrar o fluxo. O instrumento oficial entra pela ficha de fonte aprovada (F3). */
export const Q3_DEMO_ITEMS: readonly { id: string; factorId: PermaFactorId; text: string }[] = [
  { id: "p1", factorId: "P", text: "Nesta semana, tive momentos de bom humor durante o trabalho." },
  { id: "p2", factorId: "P", text: "Saio do expediente com uma sensação boa sobre o dia." },
  { id: "p3", factorId: "P", text: "O clima do meu trabalho costuma ser leve." },
  { id: "e1", factorId: "E", text: "Consigo me concentrar de verdade nas minhas tarefas." },
  { id: "e2", factorId: "E", text: "Algumas atividades me prendem a atenção sem esforço." },
  { id: "e3", factorId: "E", text: "Tenho curiosidade pelo que faço no dia a dia." },
  { id: "r1", factorId: "R", text: "Sei a quem recorrer na equipe quando algo aperta." },
  { id: "r2", factorId: "R", text: "Sinto que meus colegas contam comigo." },
  { id: "r3", factorId: "R", text: "Gosto da convivência com as pessoas do meu time." },
  { id: "m1", factorId: "M", text: "Vejo para quem o meu trabalho faz diferença." },
  { id: "m2", factorId: "M", text: "O que faço combina com o que considero importante." },
  { id: "m3", factorId: "M", text: "Entendo como minhas tarefas se ligam ao propósito da empresa." },
  { id: "a1", factorId: "A", text: "Termino as entregas que me proponho a fazer." },
  { id: "a2", factorId: "A", text: "Percebo meu avanço ao longo dos meses." },
  { id: "a3", factorId: "A", text: "Tenho dado conta dos desafios do meu trabalho." },
];

export interface Q3DemoTeam {
  id: string;
  label: string;
  invited: number;
  responded: number;
  /** Médias SINTÉTICAS por fator (0–10). */
  factors: Record<PermaFactorId, number>;
  /** Médias SINTÉTICAS de dimensões IVO do mesmo ciclo (0–100), para a régua. */
  ivo: { proposito_significado: number; crescimento_maestria: number; cooperacao_confianca: number; condicoes_carga: number };
}

export const Q3_DEMO_ORG = { id: "org-demo-florescer", label: "Empresa Demo Florescer (fictícia)", cycle: "Ciclo demonstrativo 2026" };

export const Q3_DEMO_TEAMS: readonly Q3DemoTeam[] = [
  { id: "atendimento", label: "Atendimento", invited: 15, responded: 12, factors: { P: 6.1, E: 6.4, R: 7.2, M: 6.8, A: 6.0 }, ivo: { proposito_significado: 62, crescimento_maestria: 58, cooperacao_confianca: 71, condicoes_carga: 48 } },
  { id: "tecnologia", label: "Tecnologia", invited: 12, responded: 9, factors: { P: 7.4, E: 7.8, R: 6.9, M: 7.6, A: 7.2 }, ivo: { proposito_significado: 74, crescimento_maestria: 71, cooperacao_confianca: 66, condicoes_carga: 41 } },
  { id: "operacoes", label: "Operações", invited: 10, responded: 7, factors: { P: 5.2, E: 5.5, R: 6.1, M: 5.4, A: 5.8 }, ivo: { proposito_significado: 51, crescimento_maestria: 55, cooperacao_confianca: 60, condicoes_carga: 63 } },
  { id: "comercial", label: "Comercial", invited: 20, responded: 15, factors: { P: 6.8, E: 7.0, R: 5.9, M: 6.5, A: 7.5 }, ivo: { proposito_significado: 66, crescimento_maestria: 70, cooperacao_confianca: 55, condicoes_carga: 52 } },
  { id: "pessoas", label: "Pessoas & Cultura", invited: 8, responded: 6, factors: { P: 7.9, E: 7.1, R: 8.0, M: 8.2, A: 6.6 }, ivo: { proposito_significado: 80, crescimento_maestria: 63, cooperacao_confianca: 79, condicoes_carga: 57 } },
  // Equipe abaixo de k: aparece oculta de propósito, para demonstrar a proteção.
  { id: "financeiro", label: "Financeiro", invited: 6, responded: 3, factors: { P: 6.0, E: 6.0, R: 6.0, M: 6.0, A: 6.0 }, ivo: { proposito_significado: 60, crescimento_maestria: 60, cooperacao_confianca: 60, condicoes_carga: 60 } },
];

/** Hipóteses do plano registrado v0 (pares PROPOSTOS, não aprovados). */
export const Q3_DEMO_HYPOTHESES = [
  { id: "H1", kind: "convergent", factor: "M", ivo: "proposito_significado", label: "Significado × Propósito" },
  { id: "H2", kind: "convergent", factor: "A", ivo: "crescimento_maestria", label: "Realização × Crescimento" },
  { id: "H3", kind: "convergent", factor: "R", ivo: "cooperacao_confianca", label: "Relacionamentos × Cooperação" },
  { id: "H4", kind: "discriminant", factor: "M", ivo: "condicoes_carga", against: "H1", label: "Significado × Carga (deve ser mais fraca)" },
  { id: "H5", kind: "discriminant", factor: "R", ivo: "condicoes_carga", against: "H3", label: "Relacionamentos × Carga (deve ser mais fraca)" },
] as const;

/** Critérios SÓ de demonstração — os reais ficam no plano registrado (a definir). */
export const Q3_DEMO_CRITERIA = { minTeams: 4, threshold: 0.5, method: "spearman" as const };

export interface Q3DemoAction {
  id: string;
  factorId: PermaFactorId;
  title: string;
  ownerUserId: string;
  ownerLabel: string;
  status: "planejada" | "em andamento" | "concluída";
}

export const Q3_DEMO_LEADER_USER_ID = "demo-lider-operacoes";

export const Q3_DEMO_ACTIONS: readonly Q3DemoAction[] = [
  { id: "a1", factorId: "M", title: "Roda de conversa: como nosso trabalho ajuda clientes", ownerUserId: Q3_DEMO_LEADER_USER_ID, ownerLabel: "Liderança · Operações", status: "planejada" },
  { id: "a2", factorId: "P", title: "Ritual semanal de reconhecimento entre pares", ownerUserId: Q3_DEMO_LEADER_USER_ID, ownerLabel: "Liderança · Operações", status: "em andamento" },
  { id: "a3", factorId: "R", title: "Pares de apoio no onboarding", ownerUserId: "demo-lider-comercial", ownerLabel: "Liderança · Comercial", status: "planejada" },
  { id: "a4", factorId: "A", title: "Metas trimestrais visíveis e celebradas no time", ownerUserId: "demo-rh", ownerLabel: "RH", status: "planejada" },
];

export const Q3_DEMO_DEVOLUTIVA_STEPS = [
  "Apresentar o resultado coletivo — nunca individual — e o que ele não diz.",
  "Ouvir a equipe: o que reconhecem e o que surpreende.",
  "Escolher 1 ou 2 fatores para cuidar no próximo ciclo.",
  "Combinar ações com responsáveis e data de revisão.",
] as const;

export const Q3_DEMO_VITALITY = [
  { id: "sono", title: "Sono e recuperação", practice: "Rotina curta de desligamento no fim do expediente." },
  { id: "movimento", title: "Movimento", practice: "Micro-pausa ativa de 2 minutos entre blocos de foco." },
  { id: "energia", title: "Pausas e energia", practice: "Mapear, em reflexão privada, os picos de energia da semana." },
  { id: "ritmo", title: "Ambiente e carga", practice: "Conversa de equipe sobre ritmo — sem substituir a gestão de riscos (Domínio B)." },
] as const;
