// Diário de Prática Viva — dados demonstrativos DETERMINÍSTICOS (Fable 5 §5.6, I7).
// A base conta a história honesta: a Marina tem 1 prática registrada em "energia"
// (é o sinal que deixa o Diploma Vivo do driver elegível — I2 compõe I7);
// o coletivo tem um driver VISÍVEL (5 praticantes consentidos) e um PROTEGIDO
// (2 consentidos < k=5 — a microcopy de proteção aparece na própria demo).

import type { PracticeEntry } from "@/engine/learning/practice-journal-engine";
import { MOCK_USER } from "./colaborador-mock";
import { GAMIFICATION_TODAY } from "./gamification-mock";

export const PRACTICE_JOURNAL_SEED: PracticeEntry[] = [
  // A prática da Marina que sustenta o critério 3 do Diploma de "energia" (privada).
  {
    id: "pj-marina-energia-1",
    authorId: MOCK_USER.id,
    driverId: "energia",
    kind: "texto",
    summary: "Apliquei a pausa de 5 minutos com a equipe antes da daily desta semana.",
    shareConsent: false,
    occurredOn: "2026-06-16",
  },
  // Coletivo consentido em "energia": 5 praticantes únicos → agregado VISÍVEL.
  ...["u-pedro", "u-ana", "u-julia", "u-fernanda", "u-bianca"].map((authorId, i) => ({
    id: `pj-${authorId}-energia`,
    authorId,
    driverId: "energia",
    kind: "checklist" as const,
    summary: "Checklist de microdescansos aplicado na semana.",
    shareConsent: true,
    occurredOn: i % 2 === 0 ? "2026-06-16" : "2026-06-17",
  })),
  // Coletivo em "clareza": só 2 consentidos → agregado PROTEGIDO (k-anon).
  {
    id: "pj-u-pedro-clareza",
    authorId: "u-pedro",
    driverId: "clareza",
    kind: "reflexao",
    summary: "Reescrevi o objetivo do sprint em linguagem simples com o time.",
    shareConsent: true,
    occurredOn: "2026-06-17",
  },
  {
    id: "pj-u-ana-clareza",
    authorId: "u-ana",
    driverId: "clareza",
    kind: "texto",
    summary: "Documentei os critérios de pronto do quadro.",
    shareConsent: true,
    occurredOn: GAMIFICATION_TODAY,
  },
];

export const PRACTICE_DRIVER_LABELS: Record<string, string> = {
  energia: "Energia & Vitalidade",
  seguranca_psicologica: "Segurança Psicológica",
  clareza: "Clareza & Papéis",
  reconhecimento: "Reconhecimento",
  proposito: "Propósito",
};

export const PRACTICE_JOURNAL_COPY = {
  eyebrow: "Diário de Prática Viva · Academia",
  title: "O aprendizado só conta quando vira prática",
  lead:
    "Registre o que você aplicou de verdade — um relato curto, um checklist, uma reflexão. " +
    "O registro é seu: privado por default, compartilhado só se você consentir, registro a registro.",
  privacyNote:
    "O texto do seu registro nunca entra em contagem coletiva. O agregado só conta " +
    "REGISTROS consentidos, nunca lê conteúdo, e só aparece com 5+ praticantes.",
  diplomaNote:
    "Cada prática registrada alimenta a terceira prova do seu Diploma Vivo no driver correspondente.",
  scienceNote:
    "Escrever o que se praticou consolida o aprendizado (Craik & Lockhart, 1972) e fecha a " +
    "intenção de implementação — \"quando X, farei Y\" (Gollwitzer, 1999).",
  demoNote:
    "Demonstração: os registros desta sessão são efêmeros e vivem só neste navegador.",
} as const;
