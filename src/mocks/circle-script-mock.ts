// Roteiros determinísticos dos Círculos Vivos (I5) — prompts estruturados,
// versionados e citáveis, SEM LLM (P2-04 do cânone). v1 cobre 4 drivers; os
// demais honestamente ainda não têm roteiro — a UI declara isso, não finge.

import type { CircleScript } from "@/engine/embaixadorias/circle-engine";

export const CIRCLE_SCRIPTS: CircleScript[] = [
  {
    driverId: "energia",
    title: "Círculo da Energia",
    openingPrompt: "Nesta semana, o que te deu energia de verdade — e o que só te cansou?",
    discussionPrompts: [
      "Onde você sentiu um cansaço que dava para evitar?",
      "Que microdescanso real cabe na sua rotina esta semana?",
    ],
    closingPrompt: "Um compromisso de descanso real para os próximos 7 dias.",
    citation: "Edmondson (1999) — segurança psicológica em grupo pequeno com estrutura.",
  },
  {
    driverId: "seguranca_psicologica",
    title: "Círculo da Voz Segura",
    openingPrompt: "Conte uma vez em que discordar de alguém melhorou o resultado.",
    discussionPrompts: [
      "O que faz você hesitar antes de admitir um erro aqui?",
      "O que a equipe poderia fazer para errar em voz alta, sem medo?",
    ],
    closingPrompt: "Um compromisso de dizer uma coisa difícil, com respeito, esta semana.",
    citation: "Edmondson (1999) — segurança psicológica se constrói em grupo pequeno.",
  },
  {
    driverId: "clareza",
    title: "Círculo da Clareza",
    openingPrompt: "Qual decisão recente você não entendeu o porquê?",
    discussionPrompts: [
      "Onde a prioridade da equipe está confusa hoje?",
      "O que ajudaria a comunicação a chegar mais rápido e mais clara?",
    ],
    closingPrompt: "Um compromisso de perguntar 'por quê' antes de assumir a próxima vez.",
    citation: "Craik & Lockhart (1972) — elaboração reflexiva falada consolida entendimento.",
  },
  {
    driverId: "reconhecimento",
    title: "Círculo do Reconhecimento",
    openingPrompt: "Quem te ajudou esta semana e você ainda não agradeceu?",
    discussionPrompts: [
      "Que tipo de reconhecimento realmente importa para você?",
      "O que a equipe celebra bem, e o que passa despercebido?",
    ],
    closingPrompt: "Um compromisso de reconhecer alguém, específico e sincero, esta semana.",
    citation: "Craik & Lockhart (1972) — falar em voz alta fortalece a memória do que importa.",
  },
];

export const CIRCLE_VIVO_COPY = {
  eyebrow: "Círculos Vivos · Comunidade",
  title: "Uma roda pequena, uma segurança grande",
  lead:
    "5 a 8 pessoas, um roteiro citável, zero espaço para vazamento — não existe onde guardar " +
    "o que é dito aqui. Ao final, cada pessoa leva um compromisso pequeno para o próprio Diário.",
  privacyNote:
    "O registro desta roda guarda só metadados (facilitador, driver, data, quantas pessoas " +
    "estavam) — nunca o que foi dito, nunca quem disse o quê. Impossibilidade estrutural, não " +
    "promessa de política.",
  noScriptNote:
    "Esta embaixadoria ainda não tem um roteiro determinístico pronto — é uma frente futura, " +
    "não um placeholder disfarçado.",
  demoNote: "Demonstração: as rodas desta sessão são efêmeras e vivem só neste navegador.",
} as const;
