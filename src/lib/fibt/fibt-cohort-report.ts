// Ponte pura entre a agregacao do banco e o engine canonico da FIB-T.
//
// O banco devolve a media POR ITEM de uma coorte, ja com supressao k-anon
// aplicada. Este modulo transforma isso no resultado do instrumento usando o
// manifesto canonico -- e recusa qualquer coisa que nao permita um escore
// honesto.
//
// Regra que governa o arquivo inteiro: quando nao da para calcular, o
// resultado e "suprimido" ou "incompleto", NUNCA um numero de mentira e
// NUNCA um mock. Um painel que cai para dado ficticio quando o banco falha e
// pior do que um painel vazio: parece que funcionou.

import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import {
  scoreFibt,
  validateFibtResponses,
  type FibtInstrumentDef,
  type FibtItemResponse,
  type FibtResult,
} from "@/engine/fibt/fibt-engine";

/**
 * O que a RPC aggregate_cohort_responses devolve.
 *
 * `n` e null quando suprimido: abaixo do limiar o banco nao informa a
 * contagem exata, so a faixa em `countLabel` ("<5"). Saber que uma coorte tem
 * exatamente 4 pessoas ja e informacao sobre o grupo — combinada com
 * conhecimento organizacional, aproxima a reidentificacao sem que nenhuma
 * resposta tenha vazado.
 */
export interface CohortAggregate {
  visible: boolean;
  /** Contagem exata. null quando suprimido. */
  n: number | null;
  /** Faixa segura para exibir ("<5") ou o proprio numero quando visivel. */
  countLabel: string | null;
  kMin: number;
  /** Media por item ("q1" -> 2.5). null quando suprimido. */
  itemMeans: Record<string, number> | null;
  suppressionReason?: string | null;
}

export type FibtCohortReport =
  | { status: "suprimido"; countLabel: string; kMin: number; motivo: string }
  /** RPC devolveu `awaiting_batched_release`: há participações suficientes, falta lote. */
  | { status: "aguardando_lote"; kMin: number; motivo: string }
  /** RPC devolveu `differential_inference_risk`: supressão complementar entre recortes. */
  | { status: "supressao_complementar"; kMin: number; motivo: string }
  /** RPC devolveu `item_level_insufficient_contributors`. */
  | { status: "aguardando_cobertura_itens"; kMin: number; motivo: string }
  /** Motivo de supressão desconhecido — fail-closed, sem afirmar contagem. */
  | { status: "retido"; kMin: number; motivo: string }
  | { status: "nao_autorizado"; motivo: string }
  | { status: "incompleto"; n: number; itensAusentes: string[]; motivo: string }
  | { status: "versao_incompativel"; n: number; esperada: string; recebida: string; motivo: string }
  | { status: "ok"; n: number; resultado: FibtResult };

/**
 * Rótulo não numérico. Usado quando a contagem não pode sair e a faixa "<k"
 * também seria uma afirmação falsa (o recorte pode ter muitas respostas e
 * ainda assim estar retido por lote ou por supressão complementar).
 */
export const RETIDO_COUNT_LABEL = "protegida";

/**
 * DESENHO ARQUITETURAL -- por que a RPC devolve factor_scores e domain_means
 * NULOS, sempre.
 *
 * A fonte metodologica unica e o manifesto canonico + loader fail-closed +
 * engine versionado. O PostgreSQL entrega `item_means` agregado e protegido
 * por k-anon; QUEM CALCULA os tres Fatores, as nove leituras descritivas de
 * dominio e o escore bruto e o engine, aqui nesta camada.
 *
 * Duplicar as formulas em SQL criaria uma segunda definicao do instrumento,
 * fora do manifesto e fora dos testes canonicos -- exatamente a divergencia
 * que a FIBT-0 existiu para eliminar. Os campos permanecem no contrato da RPC
 * como nulos explicitos: reservados, nao esquecidos.
 */

/** Adapta o manifesto canonico ao contrato do engine. */
export function fibtInstrumentDef(): FibtInstrumentDef {
  const m = getFibtManifest();
  return {
    factors: m.factors.map((f) => ({ id: f.id, name: f.name, domainIds: [...f.domain_ids] })),
    domains: m.domains.map((d) => ({ id: d.id, name: d.name })),
    items: m.items.map((i) => ({
      id: i.id, text: i.text, factorId: i.factor_id, domainId: i.domain_id,
    })),
  };
}

/**
 * Constroi o relatorio de uma coorte. Fail-closed em quatro pontos: supressao
 * por k-anon, ausencia de conteudo, cobertura incompleta dos 32 itens e
 * versao de instrumento incompativel com o manifesto.
 *
 * `instrumentVersion` e a versao gravada na onda/resposta. Se ela nao bater
 * com o manifesto carregado, NAO pontuamos: os itens podem ter mudado de
 * Fator ou de Dominio entre versoes, e aplicar a definicao de hoje sobre
 * respostas de ontem produz um numero que parece certo e nao e.
 */
export function buildFibtCohortReport(
  agg: CohortAggregate,
  instrumentVersion?: string | null,
): FibtCohortReport {
  const reason = agg.suppressionReason ?? null;

  if (reason === "not_authorized") {
    return {
      status: "nao_autorizado",
      motivo: "Esta onda nao pertence a sua organizacao, ou a sessao nao tem vinculo organizacional.",
    };
  }

  // ── Motivos introduzidos pela Task 10.1 ────────────────────────────────────
  //
  // ANTES (defeito D2 da macro-onda 10.2): todo motivo diferente de
  // `not_authorized` caia no ramo unico de supressao e a mensagem afirmava
  // "menos de 5 respostas (<5)" usando `countLabel ?? "<k"`. Como
  // `awaiting_batched_release`, `differential_inference_risk` e
  // `item_level_insufficient_contributors` devolvem `response_count_label`
  // NULO, uma coorte com 9 ou 40 respostas era descrita como tendo menos de
  // cinco. Cada motivo passa a ter ramo proprio, e nenhum deles afirma
  // contagem.
  if (reason === "awaiting_batched_release") {
    return {
      status: "aguardando_lote",
      kMin: agg.kMin,
      motivo:
        "Resultado ainda nao publicado: a liberacao acontece em lote protegido, " +
        `somente quando ${agg.kMin} novas participacoes entram desde a ultima publicacao. ` +
        "Nao significa que faltem participantes.",
    };
  }

  if (reason === "differential_inference_risk") {
    return {
      status: "supressao_complementar",
      kMin: agg.kMin,
      motivo:
        "Resultado retido para proteger um recorte pequeno desta onda: publicar este " +
        "recorte permitiria deduzi-lo por subtracao contra o total. Nao e falha tecnica.",
    };
  }

  if (reason === "item_level_insufficient_contributors") {
    return {
      status: "aguardando_cobertura_itens",
      kMin: agg.kMin,
      motivo:
        `Nenhum item alcancou ${agg.kMin} participantes na publicacao atual. ` +
        "Sem cobertura por item nao existe escore, e item ausente nunca vale zero.",
    };
  }

  if (!agg.visible || agg.itemMeans === null) {
    if (reason !== null && reason !== "privacy_threshold") {
      // Motivo novo que este cliente ainda nao conhece. Fail-closed: nunca
      // inventa faixa nem afirma quantidade.
      return {
        status: "retido",
        kMin: agg.kMin,
        motivo:
          "Resultado retido por protecao de privacidade. O motivo informado pelo banco " +
          "nao e reconhecido por esta versao da aplicacao, e nenhuma contagem foi estimada.",
      };
    }

    // Defesa em profundidade: mesmo que o banco devolva a contagem exata, ela
    // NAO atravessa para a interface abaixo do limiar. Somente a FAIXA sai
    // daqui — e apenas quando ela e, de fato, uma faixa.
    const incoming = agg.countLabel;
    const label =
      incoming === null || incoming === undefined
        ? `<${agg.kMin}`
        : incoming.startsWith("<")
          ? incoming
          : RETIDO_COUNT_LABEL;
    return {
      status: "suprimido",
      countLabel: label,
      kMin: agg.kMin,
      motivo:
        label.startsWith("<")
          ? `Resultado oculto: menos de ${agg.kMin} respostas (${label}). ` +
          "A quantidade exata nao e informada, para proteger quem respondeu."
          : "Resultado oculto por protecao de privacidade. A quantidade exata nao e " +
          "informada, para proteger quem respondeu.",
    };
  }

  // Versao do instrumento: so pontua se a definicao carregada for a MESMA que
  // gerou as respostas. Entre versoes um item pode mudar de Fator -- foi o que
  // a FIBT-0 corrigiu -- e o escore sairia errado com aparencia de certo.
  const manifest = getFibtManifest();
  if (instrumentVersion && instrumentVersion !== manifest.instrument_version) {
    return {
      status: "versao_incompativel",
      n: agg.n ?? 0,
      esperada: manifest.instrument_version,
      recebida: instrumentVersion,
      motivo:
        `Estas respostas foram coletadas com a versao ${instrumentVersion} do instrumento, ` +
        `e a definicao carregada e a ${manifest.instrument_version}. ` +
        "O resultado nao e calculado com uma definicao diferente da que foi aplicada.",
    };
  }

  const def = fibtInstrumentDef();
  const respostas: FibtItemResponse[] = Object.entries(agg.itemMeans).map(([itemId, value]) => ({
    itemId, value,
  }));

  // O engine ja recusa conjunto incompleto, mas aqui a falha vira estado de
  // UI em vez de excecao -- a tela precisa dizer o que faltou.
  const check = validateFibtResponses(respostas, def);
  if (!check.complete) {
    return {
      status: "incompleto",
      n: agg.n ?? 0,
      itensAusentes: [...check.missingItemIds, ...check.invalidItemIds],
      motivo:
        "O agregado nao cobre os 32 itens do instrumento com valores validos. " +
        "Sem cobertura completa nao existe escore FIB-T.",
    };
  }

  return { status: "ok", n: agg.n ?? 0, resultado: scoreFibt(respostas, def) };
}
