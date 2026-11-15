// Contrato de atividade e rastro descritivo; respostas pedagógicas não integram o ledger.
import type { FibtActionView } from "./ivo-views";
import { parseContentRef } from "./content-ref";
export interface LearningCheck {
  id: string;
  question: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
}
export interface LearningActivity {
  id: string;
  version: string;
  contentVersion: string;
  checks: LearningCheck[];
  practicePrompt: string;
  reviewPrompt: string;
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
