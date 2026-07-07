// Vitrine do Bem-Comum — dados demonstrativos DETERMINÍSTICOS (Fable 5 §5.6, I-M6).
// v1 é deliberadamente DEMO (blueprint PLANO_MENSURAR_VIVO_1.0.md §I: "Vitrine v1 DEMO
// rotulada" é a própria recomendação de rollout — `institutional_offers` real (S8) depende
// de csr_pledges real, que ainda não existe: a economia de Sementes (Academia Viva 2.0)
// também é demo. Honestidade sobre o blueprint > antecipar uma realidade que não existe.
//
// A seed da Ciranda é FIXA e PUBLICADA aqui mesmo — qualquer pessoa pode abrir este
// arquivo, rodar runCiranda com os mesmos dados e conferir o resultHash exibido na tela.

import type { EligibilityEvent } from "@/engine/vitrine/vitrine-offer-engine";
import { MOCK_USER } from "./colaborador-mock";

/** Roster do ciclo demo: Marina participou; nem todo colega participou (elegibilidade real é seletiva). */
export const VITRINE_ELIGIBILITY_EVENTS: EligibilityEvent[] = [
  { userId: MOCK_USER.id, participatedInCycle: true },
  { userId: "u-pedro", participatedInCycle: true },
  { userId: "u-ana", participatedInCycle: true },
  { userId: "u-julia", participatedInCycle: true },
  { userId: "u-carlos", participatedInCycle: false },
  { userId: "u-fernanda", participatedInCycle: true },
  { userId: "u-rafael", participatedInCycle: false },
  { userId: "u-bianca", participatedInCycle: true },
];

/** Seed publicada do ciclo — determinística e auditável (F2.2). */
export const VITRINE_CIRANDA_SEED = "ciclo-2026-07-museu";
export const VITRINE_CIRANDA_WINNER_COUNT = 2;

/** Quantas vezes cada oferta já foi resgatada e teve a Oferta Espelhada cumprida. */
export const VITRINE_FULFILLED_COUNTS: Record<string, number> = {
  of_ingressos_museu: 3,
  of_vale_cursos_livros: 1,
  of_dia_voluntariado: 0,
};

export const VITRINE_COPY = {
  eyebrow: "Vitrine do Bem-Comum · Demonstração",
  title: "Aqui, quem ganha você, ganha o coletivo junto",
  lead:
    "Você não compra nada aqui — a instituição declara ofertas, o acesso é por Ciranda " +
    "(chance igual para quem participou, nunca por mérito) e toda oferta individual " +
    "espelha uma contribuição ao coletivo.",
  contractLine:
    "Contrato de Reciprocidade: medir aqui nunca é extração — é troca. Esta é a retribuição " +
    "da instituição ao coletivo, não uma loja.",
  eligibilityNote:
    "Elegibilidade é só um booleano: participou ao menos 1 vez neste ciclo. Nunca lê XP, " +
    "sementes, desempenho ou ranking — e nunca vale a pena \"responder para concorrer\".",
  auditNote:
    "O sorteio é determinístico: a mesma seed publicada e a mesma lista de elegíveis sempre " +
    "produzem o mesmo resultado. Qualquer pessoa pode reconferir o hash abaixo.",
  demoNote:
    "Demonstração: o catálogo, o ciclo de elegibilidade e o sorteio desta tela são fixos " +
    "e não são persistidos — a Vitrine real chega quando a economia institucional " +
    "(csr_pledges) também for real.",
} as const;
