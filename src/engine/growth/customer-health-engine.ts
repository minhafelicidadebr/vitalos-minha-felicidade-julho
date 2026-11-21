// Customer Health Score v1 — engine PURO (S8 fatia 2, E4 do Plano Mestre).
// A saúde de UMA conta cliente aos olhos do founder/customer success: a org
// está percorrendo o arco medir → aprender → transformar → evoluir?
//
// HONESTIDADE (Fable 5 §8):
// - Entradas são CONTAGENS org-level de operação (ondas, cápsulas, planos,
//   evidências) — zero dado individual, zero conteúdo de resposta. k-anon
//   não se aplica a contagens de operação, mas o princípio de mínimo dado sim.
// - O score NUNCA compara contas entre si (nunca ranking — invariante 9);
//   é a leitura longitudinal de UMA conta contra o próprio arco do produto.
// - Cada dimensão declara o que foi contado e qual é a próxima melhor ação —
//   número sem caminho de ação é vaidade.
//
// O sinal legado northStarMet verifica somente ≥2 ciclos registrados e ≥1
// evidência. Essas contagens não verificam efeito medido, aprendizagem ou eficácia.

export interface AccountSignals {
  /** Ondas de medição criadas (tabela waves). */
  wavesCreated: number;
  /** Cápsulas k-anon publicadas (wave_capsules) — medição que virou leitura. */
  capsulesPublished: number;
  /** Eventos de aprendizagem persistidos (participation_events dos membros). */
  learningEvents: number;
  /** Planos de ação criados (action_plans). */
  actionPlans: number;
  /** Ações com dono E prazo definidos (action_items completos, Guia MTE §13). */
  actionsWithOwner: number;
  /** Evidências de transformação registradas (evidence_records). */
  evidenceRecords: number;
  /** Ciclos de medição registrados no Cofre (org_cycle_registry). */
  cyclesRegistered: number;
}

export type HealthBand = "nascente" | "ativando" | "operando" | "florescendo";

export interface HealthDimension {
  id: "medir" | "aprender" | "transformar" | "evoluir";
  label: string;
  /** 0–25 por dimensão (as 4 somam o score 0–100). */
  score: number;
  /** O que foi contado — a fórmula visível. */
  evidence: string;
  /** A próxima melhor ação desta dimensão (nunca número sem caminho). */
  nextAction: string;
}

export interface CustomerHealth {
  /** 0–100 = soma das 4 dimensões. */
  score: number;
  band: HealthBand;
  dimensions: HealthDimension[];
  /** A próxima melhor ação da conta = a da dimensão mais fraca. */
  nextBestAction: string;
  /** True quando satisfaz o North Star (≥2 ciclos + ≥1 evidência). */
  northStarMet: boolean;
}

/** Degraus honestos: 0 → nada; 1 → começou; meta → operando pleno (25). */
function stepScore(count: number, startedAt: number, fullAt: number): number {
  if (count <= 0) return 0;
  if (count >= fullAt) return 25;
  // Interpola entre "começou" (10) e "pleno" (25) — nunca infla o começo.
  const progress = (count - startedAt) / (fullAt - startedAt);
  return Math.round(10 + progress * 15);
}

export function computeCustomerHealth(signals: AccountSignals): CustomerHealth {
  const medir: HealthDimension = {
    id: "medir",
    label: "Medir com proteção",
    // Cápsula publicada vale mais que onda criada: medição que ninguém leu não opera.
    score: Math.min(
      25,
      stepScore(signals.wavesCreated, 1, 2) * 0.4 +
        stepScore(signals.capsulesPublished, 1, 2) * 0.6,
    ),
    evidence: `${signals.wavesCreated} onda(s) criada(s) · ${signals.capsulesPublished} leitura(s) em cápsulas legadas`,
    nextAction:
      signals.wavesCreated === 0
        ? "Criar a primeira onda de medição em /admin"
        : signals.capsulesPublished === 0
          ? "Alcançar n≥5 respostas para publicar a primeira leitura protegida"
          : "Manter a cadência de medição da temporada",
  };

  const aprender: HealthDimension = {
    id: "aprender",
    label: "Aprender no contexto",
    score: stepScore(signals.learningEvents, 1, 20),
    evidence: `${signals.learningEvents} evento(s) de aprendizagem registrados pelos membros`,
    nextAction:
      signals.learningEvents === 0
        ? "Convidar a equipe para a trilha prioritária da Academia"
        : "Sustentar a prática: revisões SM-2 e trilhas por driver",
  };

  const transformar: HealthDimension = {
    id: "transformar",
    label: "Transformar com dono",
    score: Math.min(
      25,
      stepScore(signals.actionPlans, 1, 1) * 0.4 + stepScore(signals.actionsWithOwner, 1, 4) * 0.6,
    ),
    evidence: `${signals.actionPlans} plano(s) de ação · ${signals.actionsWithOwner} ação(ões) com dono e prazo`,
    nextAction:
      signals.actionPlans === 0
        ? "Gerar o plano de 13 semanas a partir da leitura protegida"
        : signals.actionsWithOwner === 0
          ? "Atribuir dono e prazo às ações (Guia MTE §13)"
          : "Registrar check-ins das ações em andamento",
  };

  const evoluir: HealthDimension = {
    id: "evoluir",
    label: "Evoluir com prova",
    score: Math.min(
      25,
      stepScore(signals.evidenceRecords, 1, 3) * 0.5 + stepScore(signals.cyclesRegistered, 1, 2) * 0.5,
    ),
    evidence: `${signals.evidenceRecords} evidência(s) registrada(s) · ${signals.cyclesRegistered} ciclo(s) no Cofre`,
    nextAction:
      signals.evidenceRecords === 0
        ? "Registrar a primeira evidência de uma ação implementada"
        : signals.cyclesRegistered < 2
          ? "Registrar a cápsula selada como ciclo no Cofre para habilitar o antes/depois"
          : "Preparar a reavaliação comparando os ciclos",
  };

  const dimensions = [medir, aprender, transformar, evoluir].map((d) => ({
    ...d,
    score: Math.round(d.score),
  }));
  const score = dimensions.reduce((sum, d) => sum + d.score, 0);

  const band: HealthBand =
    score >= 80 ? "florescendo" : score >= 50 ? "operando" : score >= 20 ? "ativando" : "nascente";

  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0]!;

  return {
    score,
    band,
    dimensions,
    nextBestAction: weakest.nextAction,
    northStarMet: signals.cyclesRegistered >= 2 && signals.evidenceRecords >= 1,
  };
}
