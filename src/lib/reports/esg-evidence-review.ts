/** Pré-revisão pura. Não autentica revisores, resolve referências ou autoriza emissão. */
export interface EsgEvidenceReview {
  relation: { id: string; version: string; axis: "E" | "S" | "G"; use: string };
  decision?: {
    relationId: string; version: string; axis: "E" | "S" | "G"; use: string;
    status: "proposed" | "approved" | "rejected" | "revoked";
    reviewerRef: string; decidedAt: string;
  };
  evidence: {
    state: "available" | "protected" | "absent";
    projectRef: string; mechanismRef: string; studyIds: readonly string[];
    executionRefs: readonly string[]; limitations: readonly string[]; nextCycle: string;
    valueKind: string; language: string;
  };
}

const filled = (value: string) => value.trim().length > 0;

/** Saída sem IDs/fontes: pode resumir pendências, nunca liberar conteúdo protegido. */
export function reviewEsgEvidence(input: EsgEvidenceReview) {
  if (input.evidence.state === "protected") {
    return { status: "protected" as const, reasons: ["Conteúdo retido; revisão exige acesso autorizado."] };
  }
  const reasons: string[] = [];
  const { relation, decision, evidence } = input;
  if (!filled(relation.id) || !filled(relation.version) || !filled(relation.use) ||
      !["E", "S", "G"].includes(relation.axis)) reasons.push("Definição do vínculo incompleta.");
  if (!decision || decision.status !== "approved") reasons.push("Aprovação metodológica pendente, rejeitada ou revogada.");
  else {
    if (decision.relationId !== relation.id || decision.version !== relation.version ||
        decision.axis !== relation.axis || decision.use !== relation.use) reasons.push("Decisão não corresponde ao vínculo, versão, eixo ou uso.");
    if (!filled(decision.reviewerRef) || !/^\d{4}-\d{2}-\d{2}T/.test(decision.decidedAt) ||
        !Number.isFinite(Date.parse(decision.decidedAt))) reasons.push("Registro de revisão incompleto.");
  }
  if (evidence.state !== "available") reasons.push("Evidência não disponível.");
  if (!filled(evidence.projectRef) || !/^MECH-[A-Z]+-\d{3}$/.test(evidence.mechanismRef) ||
      evidence.studyIds.length < 1 || evidence.studyIds.length > 5 ||
      evidence.studyIds.some(id => !/^[A-Z]{3}-\d{3}$/.test(id))) reasons.push("Referências estruturais incompletas ou incompatíveis.");
  if (!evidence.executionRefs.length || !evidence.executionRefs.every(filled)) reasons.push("Execução sem referência válida.");
  if (!evidence.limitations.length || !evidence.limitations.every(filled) || !filled(evidence.nextCycle)) reasons.push("Limitações ou próximo ciclo ausentes.");
  if (!["contagem_agregada", "percentual_agregado"].includes(evidence.valueKind)) reasons.push("Unidade fora do contrato canônico.");
  if (evidence.language !== "mudanca_observada") reasons.push("Linguagem fora do contrato canônico.");
  return { status: reasons.length ? "blocked" as const : "ready_for_review" as const, reasons };
}
