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

/** O que a RPC aggregate_cohort_responses devolve. */
export interface CohortAggregate {
  n: number;
  kMin: number;
  visible: boolean;
  /** Media por item ("q1" -> 2.5). null quando suprimido. */
  itemMeans: Record<string, number> | null;
}

export type FibtCohortReport =
  | { status: "suprimido"; n: number; kMin: number; motivo: string }
  | { status: "incompleto"; n: number; itensAusentes: string[]; motivo: string }
  | { status: "ok"; n: number; resultado: FibtResult };

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
 * Constroi o relatorio de uma coorte. Fail-closed em tres pontos: supressao
 * por k-anon, ausencia de conteudo e cobertura incompleta dos 32 itens.
 */
export function buildFibtCohortReport(agg: CohortAggregate): FibtCohortReport {
  if (!agg.visible || agg.itemMeans === null) {
    return {
      status: "suprimido",
      n: agg.n,
      kMin: agg.kMin,
      motivo:
        `Resultado oculto: ${agg.n} resposta(s), abaixo do minimo de ${agg.kMin} ` +
        "exigido para proteger quem respondeu.",
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
      n: agg.n,
      itensAusentes: [...check.missingItemIds, ...check.invalidItemIds],
      motivo:
        "O agregado nao cobre os 32 itens do instrumento com valores validos. " +
        "Sem cobertura completa nao existe escore FIB-T.",
    };
  }

  return { status: "ok", n: agg.n, resultado: scoreFibt(respostas, def) };
}
