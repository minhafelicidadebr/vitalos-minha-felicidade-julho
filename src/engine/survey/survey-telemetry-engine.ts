// Lupa da Escuta — engine PURO (I-M7, Mensurar Vivo). Telemetria k-anon do funil de
// resposta POR ITEM: quantas sessões chegaram a responder cada item, queda relativa
// ao item anterior, tempo incremental típico entre um item e o próximo, e um flag de
// "carga" quando um item consome um tempo muito acima do típico do instrumento.
//
// HONESTIDADE (Fable 5 §8, adaptação registrada): o fluxo real de resposta
// (/convite/$token) é um FORMULÁRIO DE PÁGINA ÚNICA — todos os itens ficam visíveis
// ao mesmo tempo, a pessoa pode responder fora de ordem. Por isso "chegou ao item X"
// aqui significa "respondeu o item X", não "viu uma tela dedicada ao item X" (que não
// existe nesta arquitetura). O tempo incremental por item é uma correlação com a
// ORDEM DECLARADA do instrumento, não uma sequência estritamente observada — o
// disclaimer do resultado deixa isso explícito. Isto melhora o INSTRUMENTO (qual item
// é confuso/demorado), nunca vigia a pessoa: nenhuma sessão é identificável, nenhum
// corte com n < k é exibido.
//
// Engine ≠ Domínio: a ordem canônica dos itens (itemIds) é injetada pelo chamador
// (survey-mock.ts hoje, dado real amanhã) — este engine não conhece nenhum instrumento
// específico. Determinístico, sem React, sem I/O.

export interface FunnelSessionSnapshot {
  /** ms desde o início da sessão até a PRIMEIRA resposta de cada item — só itens respondidos aparecem aqui. */
  itemTimingsMs: Readonly<Record<string, number>>;
  totalItems: number;
  /** true = respostas enviadas; false = sessão abandonada antes do envio (captura best-effort). */
  completed: boolean;
  elapsedMs: number;
}

export interface SurveyTelemetryInput {
  /** Ordem canônica dos itens do instrumento (ex.: survey.items.map(i => i.id)). */
  itemIds: readonly string[];
  sessions: readonly FunnelSessionSnapshot[];
  /** k-anonimato mínimo antes de qualquer leitura — default 5. */
  kAnonymityMin?: number;
}

export interface ItemFunnelStat {
  itemId: string;
  /** Posição do item na ordem canônica do instrumento (0-based). */
  position: number;
  /** Quantas sessões responderam este item — nunca exibido quando abaixo do k-anonimato. */
  n: number;
  visible: boolean;
  /** % de todas as sessões que responderam este item (0..100). Null quando suprimido. */
  reachedPct: number | null;
  /** Queda relativa ao item anterior da ordem canônica (pts percentuais; positivo = perdeu gente). Null no primeiro item ou quando um dos dois lados está suprimido. */
  dropOffPct: number | null;
  /** Mediana do tempo incremental (ms) entre o item anterior respondido e este. Null quando suprimido ou amostra insuficiente. */
  medianDeltaMs: number | null;
  /** true quando medianDeltaMs ≥ 3× a mediana geral do instrumento — item desproporcionalmente lento. */
  highLoad: boolean;
}

export type SurveyTelemetryResult =
  | { ok: false; totalSessions: number; kAnonymityMin: number }
  | {
      ok: true;
      totalSessions: number;
      completedSessions: number;
      completionRate: number;
      items: ItemFunnelStat[];
      /** Mediana de referência (ms) entre itens consecutivos, pool de todas as sessões/itens. Null se amostra insuficiente. */
      overallMedianDeltaMs: number | null;
      disclaimer: string;
    };

const DEFAULT_K_ANONYMITY_MIN = 5;
const HIGH_LOAD_MULTIPLIER = 3;

const DISCLAIMER =
  "Telemetria agregada e anônima do funil de resposta (k-anonimato ≥ k). Mede a qualidade do " +
  "instrumento, nunca a pessoa — nenhuma sessão é identificável. O formulário real é de página " +
  "única (todos os itens visíveis ao mesmo tempo): o tempo incremental por item é uma correlação " +
  "com a ordem declarada do instrumento, não uma sequência estritamente observada.";

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function buildSurveyTelemetry(input: SurveyTelemetryInput): SurveyTelemetryResult {
  const kAnonymityMin = input.kAnonymityMin ?? DEFAULT_K_ANONYMITY_MIN;
  const totalSessions = input.sessions.length;

  if (totalSessions < kAnonymityMin) {
    return { ok: false, totalSessions, kAnonymityMin };
  }

  const completedSessions = input.sessions.filter((s) => s.completed).length;

  // Deltas por item: tempo entre o item anterior respondido e este, só quando >=0
  // (resposta fora de ordem não informa "tempo para chegar aqui" — descartada, nunca
  // forçada a caber num modelo sequencial que a página única não garante).
  const deltasByItem = new Map<string, number[]>();
  const nByItem = new Map<string, number>();
  const pooledDeltas: number[] = [];

  for (const itemId of input.itemIds) {
    deltasByItem.set(itemId, []);
    nByItem.set(itemId, 0);
  }

  for (const session of input.sessions) {
    for (let i = 0; i < input.itemIds.length; i++) {
      const itemId = input.itemIds[i]!;
      const t = session.itemTimingsMs[itemId];
      if (t === undefined) continue;
      nByItem.set(itemId, (nByItem.get(itemId) ?? 0) + 1);

      if (i === 0) {
        if (t >= 0) {
          deltasByItem.get(itemId)!.push(t);
          pooledDeltas.push(t);
        }
        continue;
      }
      const prevId = input.itemIds[i - 1]!;
      const prevT = session.itemTimingsMs[prevId];
      if (prevT === undefined) continue;
      const delta = t - prevT;
      if (delta < 0) continue;
      deltasByItem.get(itemId)!.push(delta);
      pooledDeltas.push(delta);
    }
  }

  const overallMedianDeltaMs = pooledDeltas.length >= kAnonymityMin ? median(pooledDeltas) : null;

  const items: ItemFunnelStat[] = input.itemIds.map((itemId, position) => {
    const n = nByItem.get(itemId) ?? 0;
    const visible = n >= kAnonymityMin;

    const reachedPct = visible ? Math.round((n / totalSessions) * 1000) / 10 : null;

    let dropOffPct: number | null = null;
    if (visible && position > 0) {
      const prevId = input.itemIds[position - 1]!;
      const prevN = nByItem.get(prevId) ?? 0;
      if (prevN >= kAnonymityMin && prevN > 0) {
        dropOffPct = Math.round(((prevN - n) / prevN) * 1000) / 10;
      }
    }

    const itemDeltas = deltasByItem.get(itemId) ?? [];
    const medianDeltaMs = visible && itemDeltas.length >= kAnonymityMin ? median(itemDeltas) : null;

    const highLoad =
      medianDeltaMs !== null &&
      overallMedianDeltaMs !== null &&
      overallMedianDeltaMs > 0 &&
      medianDeltaMs >= overallMedianDeltaMs * HIGH_LOAD_MULTIPLIER;

    return { itemId, position, n, visible, reachedPct, dropOffPct, medianDeltaMs, highLoad };
  });

  return {
    ok: true,
    totalSessions,
    completedSessions,
    completionRate: Math.round((completedSessions / totalSessions) * 1000) / 1000,
    items,
    overallMedianDeltaMs,
    disclaimer: DISCLAIMER.replace("k-anonimato ≥ k", `k-anonimato ≥ ${kAnonymityMin}`),
  };
}
