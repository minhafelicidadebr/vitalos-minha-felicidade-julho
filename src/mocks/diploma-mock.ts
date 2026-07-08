// Diploma Vivo — dados demonstrativos DETERMINÍSTICOS (Fable 5 §5.6, I2).
// Dois casos fixos que contam a história honesta da certificação computada:
// um driver ELEGÍVEL (as 3 provas cumpridas) e um driver AINDA NÃO elegível
// (retenção imatura) — a demo mostra os critérios reais, nunca só o troféu.
//
// Caminho real (S6.5 "Reconhecer e Selar", blueprint §I): os mesmos sinais
// virão de participation_events (trilha), sm2_card_state (retenção — a ponte
// card→driver já existe no catálogo de flashcards) e evidence_records
// (prática, via query nova recorded_by+lever_id). O engine não muda.
//
// O sinal de PRÁTICA não é fixo aqui: é COMPOSTO do Diário de Prática Viva
// (I7 → I2) na rota — registrar uma prática no /diario muda o critério na hora.

import type { DiplomaEligibilityInput } from "@/engine/academia/diploma-engine";

export interface DiplomaMockCase {
  driverId: string;
  driverLabel: string;
  pathTitle: string;
  /** Trilha e retenção fixas na demo; a prática vem do Diário (I7). */
  signals: Omit<DiplomaEligibilityInput, "appliedPracticeCount">;
}

export const DIPLOMA_MOCK_CASES: DiplomaMockCase[] = [
  {
    driverId: "energia",
    driverLabel: "Energia & Vitalidade",
    pathTitle: "Energia que se Renova",
    // Trilha completa + 2 cartões maduros (28d e 35d); a prática vem do Diário
    // (a base do mock do Diário dá 1 registro da Marina em "energia" → elegível).
    signals: { pathCompleted: true, cardIntervalsDays: [28, 35] },
  },
  {
    driverId: "seguranca_psicologica",
    driverLabel: "Segurança Psicológica",
    pathTitle: "Fundamentos do Florescimento",
    // Retenção imatura (1 cartão de 7d) e zero prática no Diário → em jornada.
    signals: { pathCompleted: true, cardIntervalsDays: [30, 7] },
  },
];

export const DIPLOMA_AWARDED_ON = "2026-06-18"; // mesma âncora de GAMIFICATION_TODAY

export const DIPLOMA_COPY = {
  eyebrow: "Diploma Vivo · Academia do Florescimento",
  title: "Um diploma que certifica prática, não presença",
  lead:
    "A elegibilidade é computada de três provas reais: trilha concluída, retenção " +
    "comprovada por revisão espaçada e prática aplicada registrada. Não existe " +
    "diploma comprado — só conquistado.",
  scienceNote:
    "O que este diploma atesta é o efeito de teste (Roediger & Karpicke, 2006) e a " +
    "retenção espaçada (Cepeda et al., 2006) — conhecimento que sobreviveu ao tempo, " +
    "não horas em frente à tela.",
  consentNote:
    "Seu nome só aparece no documento com o seu consentimento explícito, confirmado " +
    "no momento da emissão.",
  demoNote:
    "Demonstração: os sinais desta tela são fixos. Na versão real, trilha, retenção e " +
    "prática vêm dos seus dados de aprendizagem persistidos — o motor de elegibilidade " +
    "é exatamente o mesmo.",
} as const;
