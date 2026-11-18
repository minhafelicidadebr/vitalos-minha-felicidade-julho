import { getFactorContentCatalog } from "@/domain/ivo/factor-content";
import { getAvailableFactorLearningActivity } from "@/domain/ivo/factor-learning-activities";
import type { EducationDeps } from "./ivo-education.server";
import { authorizeLedger, ledgerOf } from "./fibt-action-loop.server";
import {
  addFibtActionToPlan,
  type AddActionToPlanRequest,
  type PlanCompositionDeps,
} from "./fibt-plan-composition.server";
import {
  resolveEducationAvailability,
  isEducationContentAvailable,
} from "./education-availability.server";
import { activityDescriptionPrefix, matchesLearningApplication } from "./learning-application";
import type { LedgerWriteOutcome } from "./ivo-views";
export type LearningApplicationRequest = AddActionToPlanRequest & {
  contentId: string;
  contentVersion: string;
  activityVersion: string;
  reviewOfItemId?: string;
};
export type LearningApplicationDeps = PlanCompositionDeps &
  Pick<EducationDeps, "contentCatalog" | "activityCatalog">;
const rejected = (
  reason: string,
  message = "Não foi possível conferir a origem. Tente novamente.",
): LedgerWriteOutcome => ({ ok: true, accepted: false, reason, message });
export async function createLearningApplication(
  input: LearningApplicationRequest,
  deps: LearningApplicationDeps = {},
): Promise<LedgerWriteOutcome> {
  const auth = await authorizeLedger(input.accessToken, deps);
  if (!auth.ok) return auth;
  const content = (deps.contentCatalog ?? getFactorContentCatalog)().find(
    (c) => c.id === input.contentId,
  );
  const availability = resolveEducationAvailability(deps);
  const { testVisible } = availability;
  const visible = isEducationContentAvailable(content, availability);
  if (!visible || !content || content.factorId !== input.factorId)
    return {
      ok: true,
      accepted: false,
      reason: "content_not_available",
      message: "Conteúdo indisponível para esta aplicação. Atualize a jornada.",
    };
  const activity = getAvailableFactorLearningActivity(content, testVisible, deps.activityCatalog);
  if (
    content.version !== input.contentVersion ||
    !activity ||
    activity.version !== input.activityVersion
  )
    return {
      ok: true,
      accepted: false,
      reason: "content_version_changed",
      message:
        "A versão da atividade mudou ou não está disponível. Atualize e revise antes de confirmar.",
    };
  const {
    contentId: _contentId,
    contentVersion: _contentVersion,
    activityVersion: _activityVersion,
    reviewOfItemId,
    ...application
  } = input;
  if (/^\s*\[revisao:/i.test(application.description)) {
    return rejected(
      "reserved_review_reference",
      "A referência da revisão é definida pelo servidor.",
    );
  }
  let reviewRef = "";
  if (reviewOfItemId) {
    if (
      content.status !== "APROVADO" ||
      activity.status !== "APROVADO" ||
      application.description.trim().length < 3
    ) {
      return rejected(
        "review_unavailable",
        "Confirme uma síntese coletiva para registrar o ajuste.",
      );
    }
    try {
      const original = await ledgerOf(deps).findItem(auth.orgId, reviewOfItemId);
      if (
        !original ||
        original.orgId !== auth.orgId ||
        original.planId !== input.planId ||
        original.sourceLensId !== "fibt" ||
        original.sourceWaveId !== input.waveId ||
        original.sourceCohortId !== input.cohortId ||
        original.sourceFactorId !== input.factorId ||
        !matchesLearningApplication(original.description ?? "", content, activity)
      )
        return rejected(
          "review_source_mismatch",
          "A origem da revisão mudou. Reabra a ação no plano.",
        );
      if (original.planStatus === "draft") {
        return rejected(
          "plan_not_active",
          "Ative o plano antes de registrar um ajuste da revisão.",
        );
      }
      // A descrição participa da identidade PI-13. Mesmo pedido e mesma síntese
      // reconstituem a mesma referência antes do índice único de inclusão.
      reviewRef = `[revisao:${original.id}] `;
    } catch {
      return rejected("db_error");
    }
  }
  // Sem respostas/nota/atestado de conclusão. Só a aplicação confirmada pelo gestor.
  // TESTE mantém a descrição histórica para não invalidar retries anteriores.
  const activityRef =
    activity.status === "APROVADO"
      ? activityDescriptionPrefix(activity)
      : `Atividade ${activity.version}. `;
  return addFibtActionToPlan(
    { ...application, description: `${activityRef}${reviewRef}${application.description}` },
    deps,
    { id: content.id, version: content.version },
  );
}
