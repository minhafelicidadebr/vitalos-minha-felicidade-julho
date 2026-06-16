// Academia engine — puro. Torna a aprendizagem DIRIGIDA PELO DADO: dada a leitura
// da organização (os pilares/forças mais fracos) e o papel, ranqueia as trilhas —
// priorizando as que endereçam o que a comunidade mais precisa agora. Compõe a
// saída do IVO/VIA-T com o catálogo de trilhas; não inventa conteúdo. Educar deixa
// de ser estático. Nunca importa de domain/.

export type PathRelevance = "prioritaria" | "recomendada" | "complementar";

export interface RankablePath {
  id: string;
  pillarName: string;
  roles: string[];
}

export interface RankedPath<P extends RankablePath> {
  path: P;
  relevance: PathRelevance;
  /** Pilar fraco que esta trilha endereça (quando prioritária). */
  matchedPillar: string | null;
}

const ORDER: Record<PathRelevance, number> = { prioritaria: 0, recomendada: 1, complementar: 2 };

export function recommendPaths<P extends RankablePath>(
  paths: P[],
  opts: { lowestPillarNames: string[]; roleId: string },
): RankedPath<P>[] {
  const weak = new Set(opts.lowestPillarNames.map((n) => n.toLowerCase()));

  const ranked: RankedPath<P>[] = paths
    .filter((p) => p.roles.includes(opts.roleId))
    .map((p) => {
      const matched = weak.has(p.pillarName.toLowerCase());
      const relevance: PathRelevance = matched ? "prioritaria" : "recomendada";
      return { path: p, relevance, matchedPillar: matched ? p.pillarName : null };
    });

  return ranked
    .map((r, i) => ({ r, i }))
    .sort((a, b) => ORDER[a.r.relevance] - ORDER[b.r.relevance] || a.i - b.i)
    .map(({ r }) => r);
}
