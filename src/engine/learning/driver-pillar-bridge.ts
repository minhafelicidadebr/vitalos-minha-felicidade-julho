// Ponte driver→pilar — engine PURO que fecha o loop M.E.T.E.: o sinal coletivo do
// Medir (IVO/IEV agregado) prioriza o que a Academia oferece para Educar. Não conhece
// setor: recebe os vínculos driver↔pilar e os sinais de pilar como parâmetros (engine ≠
// domínio). Determinístico, sem React, sem I/O.
//
// HONESTIDADE (Fable 5 §8): prioridade orienta a ordem do estudo, não culpa pessoas. A
// ordenação é explicável — começa pelos pilares de menor leitura agregada visível. Usa
// apenas agregados (k-anon ≥ 5 já garantido a montante: pilares com n<5 vêm visible=false).

/** Sinal agregado de um pilar do índice (já filtrado por k-anon a montante). */
export interface PillarSignal {
  pillarId: string;
  name: string;
  score: number;
  visible: boolean;
}

/** Vínculo de um driver de aprendizagem aos pilares do índice que ele endereça. */
export interface DriverPillarLink {
  driverId: string;
  pillarIds: string[];
}

export interface DriverNeed {
  driverId: string;
  /** True se o driver endereça algum dos pilares prioritários (menor leitura). */
  priority: boolean;
  matchedPillars: { pillarId: string; name: string; score: number }[];
  /** Menor score entre pilares endereçados (1000 se nenhum) — quanto menor, mais urgente. */
  lowestScore: number;
}

const DEFAULT_PRIORITY_COUNT = 4;

/**
 * Ordena os drivers por necessidade coletiva: primeiro os que endereçam um dos pilares
 * prioritários (os de menor score visível), depois por menor score endereçado. Drivers
 * sem pilar visível correspondente caem ao fim, sem prioridade — recomendação honesta.
 */
export function rankDriversByNeed(
  links: DriverPillarLink[],
  signals: PillarSignal[],
  opts: { priorityCount?: number } = {},
): DriverNeed[] {
  const priorityCount = opts.priorityCount ?? DEFAULT_PRIORITY_COUNT;
  const visible = signals.filter((s) => s.visible);
  const byId = new Map(visible.map((s) => [s.pillarId, s]));

  // Pilares prioritários = os de menor score (empate resolvido por id, determinístico).
  const prioritySet = new Set(
    [...visible]
      .sort((a, b) => a.score - b.score || a.pillarId.localeCompare(b.pillarId))
      .slice(0, priorityCount)
      .map((s) => s.pillarId),
  );

  return links
    .map((link, order) => {
      const matchedPillars = link.pillarIds
        .map((pid) => byId.get(pid))
        .filter((s): s is PillarSignal => Boolean(s))
        .map((s) => ({ pillarId: s.pillarId, name: s.name, score: s.score }));
      const lowestScore = matchedPillars.length
        ? Math.min(...matchedPillars.map((m) => m.score))
        : 1000;
      const priority = link.pillarIds.some((pid) => prioritySet.has(pid));
      return { need: { driverId: link.driverId, priority, matchedPillars, lowestScore }, order };
    })
    .sort(
      (a, b) =>
        Number(b.need.priority) - Number(a.need.priority) ||
        a.need.lowestScore - b.need.lowestScore ||
        a.order - b.order,
    )
    .map(({ need }) => need);
}

/**
 * Reordena itens (genérico) pela necessidade dos drivers, preservando a ordem original
 * dentro do mesmo driver. Itens cujo driver não está no ranking vão ao fim.
 */
export function orderByDriverNeed<T extends { card: { driverId: string } }>(
  items: T[],
  needs: DriverNeed[],
): T[] {
  const rank = new Map(needs.map((n, i) => [n.driverId, i]));
  return items
    .map((item, order) => ({ item, order }))
    .sort((a, b) => {
      const ra = rank.get(a.item.card.driverId) ?? Number.MAX_SAFE_INTEGER;
      const rb = rank.get(b.item.card.driverId) ?? Number.MAX_SAFE_INTEGER;
      return ra - rb || a.order - b.order;
    })
    .map(({ item }) => item);
}

/** Conjunto de drivers marcados como prioritários — para a UI sinalizar com honestidade. */
export function priorityDriverIds(needs: DriverNeed[]): Set<string> {
  return new Set(needs.filter((n) => n.priority).map((n) => n.driverId));
}
