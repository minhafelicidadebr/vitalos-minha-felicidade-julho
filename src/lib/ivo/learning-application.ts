// Contrato de atividade e rastro descritivo; respostas pedagógicas não integram o ledger.
import type { FibtActionView } from "./ivo-views";
import { parseContentRef } from "./content-ref";
export interface LearningCheck {
  id: string;
  question: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
}
export interface LearningActivity {
  id: string;
  version: string;
  contentVersion: string;
  checks: readonly LearningCheck[];
  recallPrompt?: string;
  practicePrompt: string;
  reviewPrompt: string;
}

const REVIEW_REF = /^\[revisao:([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})\]\s+/i;
const APPROVED_ACTIVITY = /^Atividade [\w.-]+\. Referência da atividade: [\w.-]+\. /;

export function activityDescriptionPrefix(activity: { id: string; version: string }) {
  return `Atividade ${activity.version}. Referência da atividade: ${activity.id}. `;
}

/** Laços de revisão são resolvidos somente no mesmo plano, a partir da referência do servidor. */
export function learningReviewSource(description: string): string | null {
  const ref = parseContentRef(description);
  if (!ref || ref.contentId.startsWith("TESTE-")) return null;
  const body = APPROVED_ACTIVITY.exec(ref.text);
  return body ? (REVIEW_REF.exec(ref.text.slice(body[0].length))?.[1] ?? null) : null;
}

export function matchesLearningApplication(
  description: string,
  content: { id: string; version: string },
  activity: { id: string; version: string },
): boolean {
  const ref = parseContentRef(description);
  return (
    !!ref &&
    ref.contentId === content.id &&
    ref.version === content.version &&
    ref.text.startsWith(activityDescriptionPrefix(activity))
  );
}

export function reviewedLearningDescription(text: string) {
  const activity = APPROVED_ACTIVITY.exec(text);
  return activity
    ? activity[0] +
        text.slice(activity[0].length).replace(REVIEW_REF, "Ajuste planejado após revisão. ")
    : text;
}

export function learningApplicationTrace(action: FibtActionView) {
  const content = parseContentRef(action.description);
  if (!content) return null;
  return {
    actionId: action.id,
    source: {
      waveId: action.source.waveId,
      cohortId: action.source.cohortId,
      factorId: action.source.factorId,
      instrumentVersion: action.source.instrumentVersion,
    },
    content: {
      id: content.contentId,
      version: content.version,
      test: content.contentId.startsWith("TESTE-"),
    },
    executionRecords: action.evidence.execution.length,
    learningRecords: action.evidence.learning.length,
    statement:
      "Aplicação planejada; registros não comprovam aprendizagem, eficácia ou causalidade.",
    nextStep:
      "Revisar o conteúdo sem consulta e registrar separadamente o que foi executado e aprendido.",
  };
}
