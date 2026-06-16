// Itens do instrumento da onda ativa (PERMA+V → IVO), versão de demonstração.
// Subconjunto representativo dos pilares; a bateria completa e a psicometria vivem
// em docs/instrumentos/PERMA_TRABALHO.md e entram na Fase 2. Escala Likert 1–5.

import type { SurveyItem } from "@/engine/survey/survey-engine";

export const PERMA_RESPONSE_SCALE = [
  "Discordo totalmente",
  "Discordo",
  "Neutro",
  "Concordo",
  "Concordo totalmente",
];

export const PERMA_ITEMS: SurveyItem[] = [
  {
    id: "p-eng-1",
    pillarId: "proposito_significado",
    text: "Sinto que o meu trabalho tem propósito e significado.",
  },
  {
    id: "p-eng-2",
    pillarId: "crescimento_maestria",
    text: "Tenho oportunidades de aprender e crescer aqui.",
  },
  {
    id: "p-eng-3",
    pillarId: "energia_vitalidade",
    text: "Na maior parte dos dias, chego ao fim com energia razoável.",
  },
  {
    id: "p-eng-4",
    pillarId: "equilibrio_autonomia",
    text: "Consigo equilibrar as demandas do trabalho com a minha vida.",
  },
  {
    id: "p-nos-1",
    pillarId: "seguranca_psicologica",
    text: "Sinto-me seguro(a) para expor ideias e admitir erros.",
  },
  {
    id: "p-nos-2",
    pillarId: "cooperacao_confianca",
    text: "Há cooperação e confiança entre as pessoas da minha equipe.",
  },
  {
    id: "p-nos-3",
    pillarId: "reconhecimento_pares",
    text: "O bom trabalho costuma ser reconhecido entre os pares.",
  },
  {
    id: "p-nos-4",
    pillarId: "comunicacao_pertencimento",
    text: "Sinto que pertenço e que a comunicação é clara.",
  },
  {
    id: "p-lid-1",
    pillarId: "clareza_direcao",
    text: "Tenho clareza sobre a direção e o que se espera de mim.",
  },
  {
    id: "p-lid-2",
    pillarId: "justica_coerencia",
    text: "As decisões da liderança são justas e coerentes.",
  },
  {
    id: "p-org-1",
    pillarId: "condicoes_carga",
    text: "Minha carga de trabalho é sustentável na maioria das semanas.",
  },
  {
    id: "p-org-2",
    pillarId: "cultura_bem_estar",
    text: "A cultura daqui leva o bem-estar a sério, na prática.",
  },
];

export const SURVEY_INTRO = {
  eyebrow: "Onda Ativa · Responder",
  lead:
    "Doze perguntas, poucos minutos. Não há resposta certa — só a sua honesta. Tudo entra no " +
    "agregado (n≥5); a sua resposta individual é invisível para todos, inclusive para a gestão.",
  disclaimer:
    "Instrumento experimental aplicado em caráter de medição coletiva. Não é avaliação individual, " +
    "não mede felicidade pessoal e não alimenta desempenho, promoção ou remuneração.",
  thanksTitle: "Obrigado — sua voz foi registrada",
  thanksBody:
    "Sua resposta entra no agregado da onda. No fechamento, a devolutiva traz o que a comunidade " +
    "aprendeu — e o que vem a seguir.",
};
