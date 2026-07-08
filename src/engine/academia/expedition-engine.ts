// ⚠️ WIP — commitado em pausa por limite de créditos da sessão (ver
// docs/HANDOFF_PROXIMA_SESSAO.md). SEM TESTES ainda, SEM pack config, SEM
// rota — não está wired em lugar nenhum do app (zero risco ao build atual).
// Não trate como "pronto": termine o arquivo .test.ts, a seção
// `collectiveNarrative` no pack (schema+leitor) e a rota /expedicao antes
// de considerar esta fatia (I4) fechada. Ver EXPED.1-4 na lista de tarefas.
//
// Expedições contra a Drenagem — engine PURO (I4, Academia Viva 2.0). Os 8
// antagonistas sistêmicos do cânone (§1.5) como NARRATIVA DERIVADA DA MEDIÇÃO:
//
// 1. O antagonista da temporada NUNCA é escolhido por marketing — é derivado do
//    driver pior-ranqueado pela medição real (`rankDriversByExposure`, o mesmo
//    ranking que alimenta /matriz e /drivers). Sem medição → sem antagonista.
// 2. O antagonista só RECUA com prova: o delta por driver da Reavaliação
//    (`DriverEvolution.improved`), com o tamanho do recuo declarado honestamente
//    (§8: um recuo de 6 pts diz "pequeno", nunca infla).
// 3. Só é DERROTADO com eficácia plena (Guia MTE 11.4.4): medida de fonte
//    implementada E mantida no tempo E melhora de risco — o gate que o
//    reavaliacao-engine já computa (`ReavaliacaoEfficacy`).
// 4. O Cinismo, chefe final, não tem driver: só cai com um ciclo fechado com
//    evidência (eficácia plena em ≥1 driver) — verbatim do cânone: "é exatamente
//    para matá-lo que existem o Culture Lab e a Vitrine de Evidências".
//
// Antagonistas nunca são pessoas (blindagem do cânone) — são padrões sistêmicos.
// Ciência: identidade de grupo comum (inimigo sistêmico compartilhado, Gaertner &
// Dovidio); Locke & Latham 2002 (metas coletivas específicas).
//
// Engine ≠ Domínio: o bestiário (nomes, taglines, counteredBy) chega por
// parâmetro (pack, seção collectiveNarrative). Tipos dos sinais reais importados
// dos engines NR-1 (engine→engine, mesmo idioma do diploma×sm2).

import type { DriverExposureNeed } from "../nr1/crosswalk-engine";
import type { DriverEvolution, ReavaliacaoEfficacy } from "../nr1/reavaliacao-engine";

export interface AntagonistDef {
  id: string;
  name: string;
  tagline: string;
  /** Drivers do crosswalk que combatem este antagonista (vazio só no chefe final). */
  counteredBy: readonly string[];
  /** O Cinismo: nunca selecionado por driver; só cai com ciclo fechado + evidência. */
  finalBoss?: boolean;
}

// ─── Seleção do antagonista da temporada (medição real, nunca marketing) ──────

export interface SeasonAntagonistSelection {
  antagonist: AntagonistDef;
  /** O driver real (pior-ranqueado) que convocou este antagonista — o "porquê" citável. */
  need: DriverExposureNeed;
}

/**
 * Caminha o ranking real (já vem pior-primeiro do rankDriversByExposure) e
 * devolve o primeiro antagonista combatível. `null` quando não há medição —
 * honestidade: sem dado, não se inventa inimigo.
 */
export function selectSeasonAntagonist(
  bestiary: readonly AntagonistDef[],
  needs: readonly DriverExposureNeed[],
): SeasonAntagonistSelection | null {
  for (const need of needs) {
    const antagonist = bestiary.find(
      (a) => !a.finalBoss && a.counteredBy.includes(need.driverId),
    );
    if (antagonist) return { antagonist, need };
  }
  return null;
}

// ─── Estado do antagonista (a derrota exige prova) ───────────────────────────

export type AntagonistStatus = "dominando" | "recuando" | "derrotado";

export interface AntagonistAssessment {
  antagonistId: string;
  status: AntagonistStatus;
  /** Frase honesta do porquê — sempre cita o dado, nunca promete. */
  evidenceNote: string;
  /** Melhor redução medida entre os drivers que combatem este antagonista (pts). */
  bestReduction: number | null;
}

/** Tamanho de efeito declarado com honestidade — nunca infla um recuo pequeno. */
export function reductionLabel(reduction: number): string {
  if (reduction < 5) return "recuo marginal";
  if (reduction < 15) return "recuo pequeno";
  if (reduction < 30) return "recuo moderado";
  return "recuo grande";
}

export function assessAntagonist(
  antagonist: AntagonistDef,
  drivers: readonly DriverEvolution[],
  efficacy: ReavaliacaoEfficacy | null,
): AntagonistAssessment {
  // Chefe final: O Cinismo só cai com ciclo fechado + evidência de eficácia plena.
  if (antagonist.finalBoss) {
    if (efficacy && efficacy.ofWhichImproved >= 1) {
      return {
        antagonistId: antagonist.id,
        status: "derrotado",
        evidenceNote:
          `Ciclo fechado com evidência: ${efficacy.ofWhichImproved} driver(s) com medida ` +
          "implementada, mantida e melhora de risco medida.",
        bestReduction: null,
      };
    }
    const anyImproved = drivers.some((d) => d.improved);
    if (anyImproved) {
      return {
        antagonistId: antagonist.id,
        status: "recuando",
        evidenceNote:
          "Há melhora medida, mas o ciclo ainda não fechou com eficácia plena — o Cinismo só cai com prova completa.",
        bestReduction: null,
      };
    }
    return {
      antagonistId: antagonist.id,
      status: "dominando",
      evidenceNote: "Nenhum ciclo fechado com evidência ainda — é exatamente para isso que o programa existe.",
      bestReduction: null,
    };
  }

  const combatants = drivers.filter((d) => antagonist.counteredBy.includes(d.driverId));
  if (combatants.length === 0) {
    return {
      antagonistId: antagonist.id,
      status: "dominando",
      evidenceNote: "Sem reavaliação medida dos drivers que o combatem — o antagonista só recua com prova.",
      bestReduction: null,
    };
  }

  const improved = combatants.filter((d) => d.improved);
  const bestReduction = Math.max(...combatants.map((d) => d.reduction));

  if (improved.length === 0) {
    return {
      antagonistId: antagonist.id,
      status: "dominando",
      evidenceNote: "A reavaliação ainda não mostra queda de nível de risco nos drivers que o combatem.",
      bestReduction,
    };
  }

  // Derrota exige eficácia plena no driver que melhorou: medida implementada E mantida.
  const defeatedBy = improved.find(
    (d) =>
      efficacy !== null &&
      efficacy.driverIds.includes(d.driverId) &&
      !efficacy.lapsedDriverIds.includes(d.driverId),
  );
  if (defeatedBy) {
    return {
      antagonistId: antagonist.id,
      status: "derrotado",
      evidenceNote:
        `${defeatedBy.label}: ${reductionLabel(defeatedBy.reduction)} de ${defeatedBy.reduction} pts, ` +
        "com medida de fonte implementada e mantida — eficácia plena.",
      bestReduction,
    };
  }

  const bestImproved = [...improved].sort((a, b) => b.reduction - a.reduction)[0];
  return {
    antagonistId: antagonist.id,
    status: "recuando",
    evidenceNote:
      `${bestImproved.label}: ${reductionLabel(bestImproved.reduction)} de ${bestImproved.reduction} pts — ` +
      "recua, mas a derrota exige medida de fonte implementada e mantida (eficácia plena).",
    bestReduction,
  };
}

/** Estado do bestiário inteiro — determinístico, na ordem do pack. */
export function assessBestiary(
  bestiary: readonly AntagonistDef[],
  drivers: readonly DriverEvolution[],
  efficacy: ReavaliacaoEfficacy | null,
): AntagonistAssessment[] {
  return bestiary.map((a) => assessAntagonist(a, drivers, efficacy));
}
