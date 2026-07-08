// Loop Vivo da Semana — dados demonstrativos DETERMINÍSTICOS (Fable 5 §5.6, I3).
// Equipe fixa de 10 pessoas (Marina + 9 colegas). Aprender e Praticar já foram
// concluídos pela equipe; Evidenciar compõe AO VIVO o Diário de Prática (I7) e
// Celebrar compõe AO VIVO a Celebração do Jardineiro (I6) — mesma composição
// viva já usada entre I7→I2 no Diploma.
//
// Achado honesto: o Pomar da Equipe já é deliberadamente protegido por k-anon
// desde a sprint I1 (3 contribuintes < 5) — então "Celebrar" fica travado não
// por falta de mecânica, mas pela MESMA lição de proteção k-anon que atravessa
// o app inteiro. Isso é consistente, não um placeholder disfarçado.
//
// Refletir/Compartilhar/Evoluir ficam com cobertura fixa e baixa por ora — a
// equipe ainda não chegou lá (destravamento sequencial impede pular etapas).

import type { CelebrationRecord } from "@/engine/recognition/celebration-engine";
import { celebratedThisWeek } from "@/engine/recognition/celebration-engine";
import { MOCK_USER } from "./colaborador-mock";
import { GAMIFICATION_TODAY } from "./gamification-mock";
import { PRACTICE_JOURNAL_SEED } from "./practice-journal-mock";

export const LOOP_TEAM_IDS: readonly string[] = [
  MOCK_USER.id,
  "u-pedro",
  "u-ana",
  "u-julia",
  "u-fernanda",
  "u-bianca",
  "u-carlos",
  "u-rafael",
  "u-diego",
  "u-sofia",
];

export const LOOP_TEAM_SIZE = LOOP_TEAM_IDS.length;
export const LOOP_TEAM_LABEL = "Experiência do Usuário"; // mesmo time da Marina (colaborador-mock)

/** Contagens fixas dos passos que este ambiente demo NÃO consegue medir ao vivo
 * (exigiriam sinais reais de VÁRIAS pessoas — este ambiente só tem a sessão da
 * Marina). "Evidenciar" e "Celebrar" são as exceções: compõem os engines reais. */
export const LOOP_FIXED_COUNTS = {
  aprender: 8, // 80% — a equipe concluiu a trilha da semana
  praticar: 7, // 70% — a maioria já praticou
  // evidenciar: calculado ao vivo do Diário de Prática (I7)
  refletir: 2, // 20% — ainda não chegou lá (passo trancado por ora)
  compartilhar: 0,
  // celebrar: calculado ao vivo da Celebração do Jardineiro (I6)
  evoluir: 3, // 30% — revisões SM-2 agendadas
} as const;

/** Conta quantas pessoas da equipe têm ≥1 registro no Diário este ciclo —
 * é o sinal REAL que decide se "Evidenciar" está concluído pela equipe. */
export function countEvidenciarCoverage(sessionEntries: readonly { authorId: string }[]): number {
  const all = [...PRACTICE_JOURNAL_SEED, ...sessionEntries];
  const practicedTeamMembers = new Set(
    all.filter((e) => LOOP_TEAM_IDS.includes(e.authorId)).map((e) => e.authorId),
  );
  return practicedTeamMembers.size;
}

/**
 * "Celebrar" é all-or-nothing (o líder converte O POOL, não pessoa por pessoa):
 * se o Pomar da Equipe já foi celebrado nesta semana, a equipe toda conta —
 * senão, zero. Composição real com `celebratedThisWeek` (celebration-engine, I6).
 */
export function countCelebrarCoverage(
  celebrationRecords: readonly CelebrationRecord[],
  today: string = GAMIFICATION_TODAY,
): number {
  return celebratedThisWeek(celebrationRecords, "pomar_equipe", today) ? LOOP_TEAM_SIZE : 0;
}

export const LOOP_VIVO_COPY = {
  eyebrow: "Loop Vivo da Semana · Academia",
  title: "Um ritual que a equipe fecha JUNTA",
  lead:
    "Os 7 passos do florescimento viram uma maré coletiva: cada passo destrava pela " +
    "cobertura da equipe, nunca pelo seu progresso sozinho. Ninguém é nomeado por não " +
    "ter feito — só a equipe inteira é celebrada por fechar o ciclo.",
  celebrarNote:
    "\"Celebrar\" trava pela MESMA lição de proteção k-anon que atravessa o app: o " +
    "Pomar da Equipe tem poucos contribuintes ainda, então fica protegido — o líder " +
    "só pode celebrar um pool visível (5+ contribuintes).",
  scienceNote:
    "O passo Celebrar não é enfeite: afeto positivo amplia o repertório de ação " +
    "(Fredrickson, 2001) — e times fecham o loop juntos (identidade de grupo comum, " +
    "Gaertner & Dovidio).",
  demoNote:
    "Demonstração: a equipe e a maioria das contagens desta tela são fixas — " +
    "\"Evidenciar\" e \"Celebrar\" são as exceções, calculadas ao vivo a partir do " +
    "Diário de Prática e da Celebração do Jardineiro reais.",
} as const;
