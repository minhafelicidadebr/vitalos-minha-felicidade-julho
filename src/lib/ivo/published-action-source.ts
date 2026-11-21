import type { IvoQ2View } from "./ivo-views";

// Preferência de navegação, nunca autorização. Não aceita setor protegido ou
// fator ausente da publicação; o servidor revalida a origem na confirmação.
export function publishedActionSource(
  view: IvoQ2View | null,
  preferred: { cohortId?: string; factorId?: string },
): { cohortId: string; factorId: string } | undefined {
  if (!preferred.cohortId || !preferred.factorId) return undefined;
  const sector = view?.sectors.find(
    (s) => s.cohortId === preferred.cohortId && s.group === "available",
  );
  return sector?.factors?.some((factor) => factor.id === preferred.factorId)
    ? { cohortId: preferred.cohortId, factorId: preferred.factorId }
    : undefined;
}
