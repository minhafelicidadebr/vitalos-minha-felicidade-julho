// R7 — catálogo curatorial fator FIB-T → conteúdo educativo. Server-only.
//
// Mostra apenas o que a curadoria permite:
//   · APROVADO — respeita o escopo local da decisão, além de fontes e versões;
//   · TESTE identificado — somente em runtime local descartável;
//   · PROPOSTO nunca é mostrado como recomendação.
// O vínculo educativo NÃO cria mapeamento dimensional e NÃO altera escore.
// Conteúdo mock da Academia não é usado aqui como recomendação real.
import { authorizeLedger, type FibtActionLoopDeps } from "./fibt-action-loop.server";
import { resolveEducationAvailability, isEducationContentAvailable } from "./education-availability.server";
import { getFactorContentCatalog, getFactorContentMeta, type FactorContent } from "@/domain/ivo/factor-content";
import { getAvailableFactorLearningActivity, type FactorLearningActivity } from "@/domain/ivo/factor-learning-activities";
import type { EducationContentView, LoadEducationOutcome } from "./ivo-views";

export interface EducationDeps extends FibtActionLoopDeps {
  contentCatalog?: () => readonly FactorContent[];
  activityCatalog?: readonly FactorLearningActivity[];
}

export async function loadEducationForSession(input: { accessToken?: string }, deps: EducationDeps = {}): Promise<LoadEducationOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps);
  if (!auth.ok) return auth;
  const availability = resolveEducationAvailability(deps);
  const { testVisible } = availability;
  const catalog = (deps.contentCatalog ?? getFactorContentCatalog)();
  const visible = catalog.filter((c) => isEducationContentAvailable(c, availability));
  const byFactor: Record<string, EducationContentView[]> = {};
  for (const c of visible) {
    (byFactor[c.factorId] ??= []).push({
      contentId: c.id,
      factorId: c.factorId,
      status: c.status as "APROVADO" | "TESTE",
      version: c.version,
      title: c.title,
      objective: c.objective,
      audience: c.audience,
      format: c.format,
      estimatedMinutes: c.estimatedMinutes,
      body: [...c.body],
      evidenceCodes: [...c.evidenceCodes],
      safeClaimIds: [...c.safeClaimIds],
      ...(c.status === "APROVADO" ? { usageNotice: "Aprovação metodológica para ensaio local. Sem validação de eficácia ou liberação comercial." } : {}),
      activity: getAvailableFactorLearningActivity(c, testVisible, deps.activityCatalog),
    });
  }
  const meta = getFactorContentMeta();
  return {
    ok: true,
    catalog: {
      curationStatus: meta.curationStatus,
      curationDecision: meta.curationDecision,
      approvedCount: visible.filter((c) => c.status === "APROVADO").length,
      testVisible,
    },
    byFactor,
  };
}
