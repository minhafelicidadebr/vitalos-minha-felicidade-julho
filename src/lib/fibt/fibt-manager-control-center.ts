// Estados publicáveis do centro de controle FIB-T.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ESTE MÓDULO FOI REESCRITO (macro-onda 10.2-B)
// ═══════════════════════════════════════════════════════════════════════════
// A versão anterior exportava `buildManagerAnalytics(responses, versao)`, que
// recebia as RESPOSTAS CRUAS lidas por service_role e recalculava média e
// escore AO VIVO, aplicando apenas `n >= FIBT_K_MIN`. Isso era um caminho
// alternativo completo em volta da publicação protegida introduzida pela
// Task 10.1 (`cohort_capsules` + `aggregate_cohort_responses`):
//
//   · duas cargas sucessivas do painel enquanto um setor cruzava n → n+1
//     devolviam duas médias exatas, e `media_{n+1}·(n+1) − media_n·n` é a
//     resposta exata da pessoa nova — exatamente o vazamento que
//     20260909222000 fecha no banco;
//   · a comparação entre setores mais os rótulos de participação e o total da
//     onda reconstruíam por subtração o tamanho de um setor protegido — o que
//     20260909221000 recusa no banco.
//
// A correção NÃO duplica a regra de privacidade: os valores observáveis vêm
// SEMPRE do snapshot PUBLICADO (`cohort_capsules`), e a regra de supressão
// complementar é a função canônica `suppressDifferentialInference`
// (src/engine/survey/sector-link-engine.ts) — a MESMA de que o SQL de
// 20260909221000 foi derivado, e que a própria migration cita como fonte.
// O escore vem do caminho canônico já existente (`buildFibtCohortReport` →
// manifesto + engine versionado), então nenhuma fórmula nova é criada e
// `MISSING_AS_ZERO` permanece `false`.
//
// A ordem de decisão espelha a do SQL, deliberadamente:
//   n=0 → sem dados
//   n < k_min → participantes insuficientes
//   partição em estado diferencial → supressão complementar
//   sem snapshot publicado → aguardando lote (ou retido no fechamento)
//   snapshot publicado sem os 32 itens → aguardando cobertura por item
//   snapshot publicado e completo → leitura disponível
//
// Consequência aceita: `buildManagerAnalytics` deixou de existir. A ausência
// dessa função é a prova de que não há mais caminho de recálculo ao vivo.

import {
  FIBT_K_MIN,
  validateFibtResponses,
  type FibtItemResponse,
  type FibtResult,
} from "@/engine/fibt/fibt-engine";
import { suppressDifferentialInference } from "@/engine/survey/sector-link-engine";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import {
  buildFibtCohortReport,
  fibtInstrumentDef,
  type CohortAggregate,
} from "./fibt-cohort-report";

/** Rótulo não numérico usado sempre que a contagem exata não pode sair. */
export const PROTECTED_COUNT_LABEL = "protegida";

export type ManagerAnalytics =
  | {
    state: "available";
    /** Contagem PUBLICADA, nunca a viva — é isso que impede o delta pequeno de vazar. */
    countLabel: string;
    n: number;
    result: FibtResult;
    publishedAt: string | null;
    /** Onda selada cuja última atualização foi retida por privacidade. */
    finalUpdateWithheld: boolean;
  }
  | {
    state: "insufficient_participants";
    countLabel: string;
    kMin: number;
    message: string;
  }
  | {
    state: "awaiting_batched_release";
    countLabel: typeof PROTECTED_COUNT_LABEL;
    kMin: number;
    message: string;
  }
  | {
    state: "complementary_suppression";
    countLabel: typeof PROTECTED_COUNT_LABEL;
    kMin: number;
    message: string;
  }
  | {
    state: "awaiting_item_coverage";
    countLabel: typeof PROTECTED_COUNT_LABEL;
    kMin: number;
    message: string;
  }
  | {
    state: "withheld_on_close";
    countLabel: typeof PROTECTED_COUNT_LABEL;
    kMin: number;
    message: string;
  }
  | {
    state: "wave_reading_unavailable";
    countLabel: typeof PROTECTED_COUNT_LABEL;
    message: string;
  }
  | {
    state: "no_data";
    countLabel: "0";
    message: string;
  }
  | {
    state: "methodology_error";
    countLabel: "Indisponível";
    message: string;
  }
  | {
    state: "technical_error";
    countLabel: "Indisponível";
    message: string;
  };

/** Snapshot publicado de um segmento, como vive em `cohort_capsules`. */
export interface PublishedCohortSnapshot {
  /** NULL = linha de BASELINE: marca d'água registrada, nada publicado ainda. */
  publishedResponseCount: number | null;
  /** NULL = nada observável ainda. Quando presente, só itens que passaram o gate. */
  itemMeans: Record<string, number> | null;
  publishedAt: string | null;
}

export interface ProtectedReadingInput {
  /** Contagem VIVA do segmento — metadado operacional, nunca conteúdo de resposta. */
  liveCount: number;
  /**
   * Partição COMPLETA da onda: contagem viva de cada segmento com ao menos uma
   * resposta (coortes + bucket sem coorte). Segmento vazio NÃO entra — é
   * exatamente o que o `GROUP BY cohort_id` do SQL faz.
   */
  partitionCounts: readonly number[];
  published: PublishedCohortSnapshot | null;
  waveInstrumentVersion: string | null;
  /** Versões distintas presentes nas respostas deste segmento. */
  segmentInstrumentVersions?: readonly (string | null)[];
  waveSealed: boolean;
  kMin?: number;
}

export interface ManagerFactorComparison {
  cohortId: string;
  cohortLabel: string;
  factors: Array<{ id: string; name: string; mean: number }>;
}

function itemMeansToResponses(itemMeans: Record<string, number>): FibtItemResponse[] {
  return Object.entries(itemMeans).map(([itemId, value]) => ({
    itemId,
    value: typeof value === "number" ? value : Number(value),
  }));
}

/**
 * Decide o que é observável de um segmento, a partir do snapshot PUBLICADO.
 * Nunca recebe resposta individual — só contagens e o snapshot já liberado
 * pelo mecanismo canônico.
 */
export function buildProtectedCohortReading(input: ProtectedReadingInput): ManagerAnalytics {
  const kMin = input.kMin ?? FIBT_K_MIN;

  // ── Precedência 0: identidade metodológica ─────────────────────────────────
  // Uma onda cuja versão do instrumento não é a do manifesto carregado, ou um
  // segmento com respostas de versões diferentes, invalida qualquer escore.
  // Vem antes dos estados de privacidade porque é bloqueio de correção e a
  // mensagem não carrega nenhuma contagem.
  const manifestVersion = getFibtManifest().instrument_version;
  if (!input.waveInstrumentVersion || input.waveInstrumentVersion !== manifestVersion) {
    return {
      state: "methodology_error",
      countLabel: "Indisponível",
      message:
        "A versão do instrumento declarada na onda não corresponde ao manifesto FIB-T " +
        "carregado. Nenhum escore é calculado com uma definição diferente da que foi aplicada.",
    };
  }
  const segmentVersions = input.segmentInstrumentVersions ?? [];
  if (segmentVersions.some((version) => !!version && version !== input.waveInstrumentVersion)) {
    return {
      state: "methodology_error",
      countLabel: "Indisponível",
      message:
        "Há respostas vinculadas a uma versão diferente do instrumento neste recorte. " +
        "Misturar versões produziria um número que parece certo e não é.",
    };
  }

  if (input.liveCount <= 0) {
    return {
      state: "no_data",
      countLabel: "0",
      message: "Nenhuma participação válida foi registrada neste recorte.",
    };
  }

  if (input.liveCount < kMin) {
    return {
      state: "insufficient_participants",
      countLabel: `<${kMin}`,
      kMin,
      message:
        `Ainda não há participações suficientes para publicar com segurança ` +
        `(mínimo de ${kMin}). A quantidade exata não é informada, para proteger quem respondeu.`,
    };
  }

  // Supressão complementar — regra canônica do engine, a mesma de que o SQL
  // de 20260909221000 foi derivado. Vem ANTES do lote, igual ao SQL.
  if (suppressDifferentialInference(
    input.partitionCounts.map((count) => ({ count })),
    kMin,
  )) {
    return {
      state: "complementary_suppression",
      countLabel: PROTECTED_COUNT_LABEL,
      kMin,
      message:
        "Leitura retida para proteger recortes pequenos desta onda: publicar este " +
        "recorte permitiria deduzir, por subtração contra o total, um recorte que " +
        "está protegido. Não é falha técnica nem ausência de respostas.",
    };
  }

  const published = input.published;
  const hasPublication = !!published && published.itemMeans !== null;

  if (!hasPublication) {
    if (input.waveSealed) {
      return {
        state: "withheld_on_close",
        countLabel: PROTECTED_COUNT_LABEL,
        kMin,
        message:
          "A onda foi fechada e nenhuma leitura pôde ser publicada com segurança. " +
          "Fechar a coleta é decisão sobre quando parar, nunca autorização para " +
          "publicar um recorte que revelaria participantes.",
      };
    }
    return {
      state: "awaiting_batched_release",
      countLabel: PROTECTED_COUNT_LABEL,
      kMin,
      message:
        "Há participações suficientes, mas a publicação acontece em lote protegido: " +
        `a leitura só avança quando ${kMin} novas participações entram desde a última ` +
        "publicação. Isso impede que a diferença entre duas leituras revele uma pessoa.",
    };
  }

  const itemMeans = published!.itemMeans!;
  const def = fibtInstrumentDef();
  const check = validateFibtResponses(itemMeansToResponses(itemMeans), def);

  if (check.missingItemIds.length > 0) {
    return {
      state: "awaiting_item_coverage",
      countLabel: PROTECTED_COUNT_LABEL,
      kMin,
      message:
        `A leitura publicada ainda não cobre os 32 itens: item com menos de ${kMin} ` +
        "participantes não é publicado. Sem os 32 itens não existe escore FIB-T — e " +
        "nenhum item ausente é tratado como zero.",
    };
  }

  if (check.invalidItemIds.length > 0) {
    return {
      state: "methodology_error",
      countLabel: "Indisponível",
      message:
        "A leitura publicada contém valor fora da escala documentada de 0 a 4. " +
        "Nenhum escore é calculado sobre dado inválido.",
    };
  }

  const aggregate: CohortAggregate = {
    visible: true,
    n: published!.publishedResponseCount,
    countLabel:
      published!.publishedResponseCount === null
        ? null
        : String(published!.publishedResponseCount),
    kMin,
    itemMeans,
    suppressionReason: null,
  };

  const report = buildFibtCohortReport(aggregate, input.waveInstrumentVersion);

  if (report.status === "ok") {
    const publishedCount = published!.publishedResponseCount ?? report.n;
    return {
      state: "available",
      countLabel: String(publishedCount),
      n: publishedCount,
      result: report.resultado,
      publishedAt: published!.publishedAt,
      finalUpdateWithheld: input.waveSealed && input.liveCount > publishedCount,
    };
  }

  if (report.status === "versao_incompativel") {
    return {
      state: "methodology_error",
      countLabel: "Indisponível",
      message: report.motivo,
    };
  }

  if (report.status === "incompleto") {
    return {
      state: "awaiting_item_coverage",
      countLabel: PROTECTED_COUNT_LABEL,
      kMin,
      message:
        "A leitura publicada não cobre os 32 itens do instrumento com valores válidos. " +
        "Sem cobertura completa não existe escore FIB-T.",
    };
  }

  // `suprimido`/`nao_autorizado` não deveriam chegar aqui: só chamamos o
  // relatório com um snapshot já publicado. Fail-closed em vez de silêncio.
  return {
    state: "technical_error",
    countLabel: "Indisponível",
    message: "A leitura publicada não pôde ser interpretada. Nenhum valor foi estimado.",
  };
}

/**
 * Leitura no nível da ONDA. Não existe snapshot publicado de nível onda:
 * `cohort_capsules` é por segmento e `wave_capsules` guarda dimensões por
 * pilar de um modelo diferente (não as médias por item da FIB-T). Compor as
 * médias publicadas dos segmentos numa média da onda exigiria uma decisão
 * metodológica NOVA — os contribuintes por item diferem entre segmentos, então
 * a média ponderada pela contagem publicada não é exata. Esse ponto está
 * deliberadamente PARADO: aqui a resposta é indisponibilidade explícita, nunca
 * um número aproximado.
 */
export function buildWaveReadingUnavailable(): ManagerAnalytics {
  return {
    state: "wave_reading_unavailable",
    countLabel: PROTECTED_COUNT_LABEL,
    message:
      "A publicação protegida da FIB-T acontece por setor: não existe leitura " +
      "publicada no nível da onda. Combinar os setores publicados numa média única " +
      "exigiria uma decisão metodológica que ainda não foi tomada — e um número " +
      "aproximado não seria honesto.",
  };
}

export function buildTechnicalUnavailable(message: string): ManagerAnalytics {
  return { state: "technical_error", countLabel: "Indisponível", message };
}

/** Somente setores com leitura PUBLICADA entram na comparação. */
export function buildFactorComparison(
  cohorts: ReadonlyArray<{ id: string; label: string; analytics: ManagerAnalytics }>,
): ManagerFactorComparison[] {
  return cohorts.flatMap((cohort) =>
    cohort.analytics.state === "available"
      ? [
        {
          cohortId: cohort.id,
          cohortLabel: cohort.label,
          factors: cohort.analytics.result.factors.map((factor) => ({
            id: factor.id,
            name: factor.name,
            mean: factor.mean,
          })),
        },
      ]
      : [],
  );
}

/** Estados em que nenhum valor agregado é observável. */
export function isProtectedState(state: ManagerAnalytics["state"]): boolean {
  return (
    state === "insufficient_participants" ||
    state === "awaiting_batched_release" ||
    state === "complementary_suppression" ||
    state === "awaiting_item_coverage" ||
    state === "withheld_on_close"
  );
}
