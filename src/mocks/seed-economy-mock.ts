// Sementes Vivas — dados demonstrativos DETERMINÍSTICOS (Fable 5 §5.6).
// A carteira inicial da Marina e as contribuições dos pools são fixas para que
// a demo conte sempre a mesma história: um pool VISÍVEL (≥5 contribuintes) e um
// pool PROTEGIDO (<5) — a honestidade k-anon aparece na própria demonstração.

import type { PoolContribution, SeedWalletEvent } from "@/engine/recognition/seed-economy-engine";
import { GAMIFICATION_TODAY } from "./gamification-mock";

/** Histórico inicial da carteira demo (semana corrente de GAMIFICATION_TODAY = 2026-06-18, quinta). */
export const SEED_WALLET_SEED: SeedWalletEvent[] = [
  {
    id: "seed-earn-pulse-0616",
    kind: "earned",
    amount: 2,
    sourceKind: "pulse_completed",
    occurredOn: "2026-06-16",
  },
  {
    id: "seed-earn-module-0616",
    kind: "earned",
    amount: 1,
    sourceKind: "learning_module",
    occurredOn: "2026-06-16",
  },
  {
    id: "seed-earn-path-0617",
    kind: "earned",
    amount: 2,
    sourceKind: "learning_path",
    occurredOn: "2026-06-17",
  },
  {
    id: "seed-earn-kudo-0617",
    kind: "earned",
    amount: 1,
    sourceKind: "kudo_sent",
    occurredOn: "2026-06-17",
  },
  {
    id: "seed-earn-evidence-0618",
    kind: "earned",
    amount: 2,
    sourceKind: "mission_evidence",
    occurredOn: GAMIFICATION_TODAY,
  },
];

/**
 * Contribuições coletivas demonstrativas.
 * Bosque do Bem-Comum: 6 contribuintes únicos → VISÍVEL (k=5 satisfeito).
 * Pomar da Equipe: 3 contribuintes → PROTEGIDO (a demo mostra a microcopy k-anon).
 */
export const SEED_POOL_CONTRIBUTIONS: PoolContribution[] = [
  { poolId: "bosque_bem_comum", contributorId: "u-pedro", amount: 14 },
  { poolId: "bosque_bem_comum", contributorId: "u-ana", amount: 9 },
  { poolId: "bosque_bem_comum", contributorId: "u-julia", amount: 22 },
  { poolId: "bosque_bem_comum", contributorId: "u-carlos", amount: 11 },
  { poolId: "bosque_bem_comum", contributorId: "u-fernanda", amount: 17 },
  { poolId: "bosque_bem_comum", contributorId: "u-outros-01", amount: 25 },
  { poolId: "pomar_equipe", contributorId: "u-julia", amount: 4 },
  { poolId: "pomar_equipe", contributorId: "u-pedro", amount: 3 },
  { poolId: "pomar_equipe", contributorId: "u-fernanda", amount: 2 },
];

export const SEED_ECONOMY_COPY = {
  eyebrow: "Sementes Vivas · Loja do Bem-Comum",
  title: "Aqui, tudo que existe para “comprar” é um presente",
  lead:
    "Sementes nascem da sua participação e só têm um destino: outra pessoa, a sua equipe ou uma causa. " +
    "Doar não rende XP nem vantagem — e é exatamente por isso que vale a pena.",
  scienceNote:
    "Gastar recursos em outras pessoas eleva o bem-estar de quem dá mais do que gastar em si — efeito " +
    "replicado em 136 países (Dunn, Aknin & Norton, 2008, Science; Aknin et al., 2013, JPSP).",
  noRewardNote:
    "Por design, plantar uma semente não gera XP, pontos nem sementes de volta. O motivo pró-social " +
    "não se compra (Deci & Ryan).",
  privacyNote:
    "Quem recebe vê “alguém plantou uma semente para você”. Seu nome só aparece se você " +
    "escolher. Não existe ranking de doadores — nem vai existir.",
  demoNote:
    "Demonstração: a carteira e as doações desta sessão são efêmeras e não são persistidas.",
} as const;
