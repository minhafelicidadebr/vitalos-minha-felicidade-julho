export type PipelineRuntimeMode = "ephemeral_demo" | "cloud_persisted" | "cloud_blocked";
export type PipelineStageId = "capture" | "aggregation" | "index";

export interface PipelineAttestationInput {
  packId: string;
  organizationId: string;
  cycleId: string;
  capture: {
    mode: PipelineRuntimeMode;
    persisted: boolean;
    contentReturned: boolean;
  };
  aggregation: {
    participantCount: number;
    kAnonymityMin: number;
    publishable: boolean;
    publishedPillarCount: number;
    protectedPillarCount: number;
    protectedContractValid: boolean;
    rawResponsesReturned: boolean;
  };
  index: {
    indexId: string;
    indexLabel: string;
    score: number;
    respondentCount: number;
    visiblePillarCount: number;
    source: string;
    rawResponsesReturned: boolean;
  };
}

export interface PipelineAttestationCheck {
  id: string;
  stage: PipelineStageId;
  label: string;
  passed: boolean;
  note: string;
}

export interface PipelineAttestationStage {
  id: PipelineStageId;
  label: string;
  status: "verified" | "blocked";
  checkCount: number;
  passedCheckCount: number;
}

export interface PipelineAttestationDraft {
  schemaVersion: "vitalos.pipeline-attestation.v1";
  packId: string;
  organizationId: string;
  cycleId: string;
  status: "verified" | "blocked";
  assuranceLevel: "demo_contract" | "production_runtime";
  facts: {
    capture: {
      mode: PipelineRuntimeMode;
      persisted: boolean;
    };
    aggregation: {
      participantCount: number;
      kAnonymityMin: number;
      publishedPillarCount: number;
      protectedPillarCount: number;
    };
    index: {
      indexId: string;
      indexLabel: string;
      score: number;
      respondentCount: number;
      visiblePillarCount: number;
      source: string;
    };
  };
  stages: PipelineAttestationStage[];
  checks: PipelineAttestationCheck[];
}

function check(
  id: string,
  stage: PipelineStageId,
  label: string,
  passed: boolean,
  note: string,
): PipelineAttestationCheck {
  return { id, stage, label, passed, note };
}

/** Builds a proof draft exclusively from sanitized operational metadata. */
export function buildPipelineAttestation(
  input: PipelineAttestationInput,
): PipelineAttestationDraft {
  const persistenceIsHonest =
    (input.capture.mode === "ephemeral_demo" && !input.capture.persisted) ||
    (input.capture.mode === "cloud_persisted" && input.capture.persisted) ||
    (input.capture.mode === "cloud_blocked" && !input.capture.persisted);

  const checks: PipelineAttestationCheck[] = [
    check(
      "capture.boundary_available",
      "capture",
      "Fronteira de captura disponível",
      input.capture.mode !== "cloud_blocked",
      input.capture.mode === "cloud_blocked"
        ? "Modo Cloud solicitado sem adaptador; o pipeline falhou fechado."
        : "A captura possui uma fronteira server-side explícita.",
    ),
    check(
      "capture.content_absent",
      "capture",
      "Recibo sem conteúdo individual",
      !input.capture.contentReturned,
      "O contrato de captura retorna metadados operacionais, nunca respostas.",
    ),
    check(
      "capture.persistence_honest",
      "capture",
      "Persistência declarada sem fallback",
      persistenceIsHonest,
      input.capture.mode === "ephemeral_demo"
        ? "A demonstração valida e descarta; não alega persistência."
        : "O estado de persistência corresponde ao modo declarado.",
    ),
    check(
      "aggregation.k_floor",
      "aggregation",
      "Piso k-anônimo preservado",
      input.aggregation.kAnonymityMin >= 5,
      `Piso declarado: k=${input.aggregation.kAnonymityMin}.`,
    ),
    check(
      "aggregation.publishable",
      "aggregation",
      "Agregado organizacional publicável",
      input.aggregation.publishable &&
        input.aggregation.participantCount >= input.aggregation.kAnonymityMin,
      `Coorte organizacional: n=${input.aggregation.participantCount}.`,
    ),
    check(
      "aggregation.protected_values_removed",
      "aggregation",
      "Valores protegidos removidos",
      input.aggregation.protectedContractValid,
      `${input.aggregation.protectedPillarCount} pilares protegidos foram verificados sem média pública.`,
    ),
    check(
      "aggregation.raw_content_absent",
      "aggregation",
      "Resposta bruta ausente",
      !input.aggregation.rawResponsesReturned,
      "A superfície pública contém somente estatísticas autorizadas.",
    ),
    check(
      "index.public_source",
      "index",
      "Índice derivado de agregado público",
      input.index.source === "published_aggregates_only",
      `Lineage declarado: ${input.index.source}.`,
    ),
    check(
      "index.raw_content_absent",
      "index",
      "Índice sem payload individual",
      !input.index.rawResponsesReturned,
      "O resultado público remove respostas, itens e médias por pilar.",
    ),
    check(
      "index.respondent_lineage",
      "index",
      "Contagem coerente entre agregado e índice",
      input.index.respondentCount === input.aggregation.participantCount,
      `Agregado n=${input.aggregation.participantCount}; índice n=${input.index.respondentCount}.`,
    ),
    check(
      "index.score_range",
      "index",
      "Score dentro da escala declarada",
      Number.isInteger(input.index.score) && input.index.score >= 0 && input.index.score <= 1000,
      `${input.index.indexLabel}=${input.index.score} em escala 0–1000.`,
    ),
  ];

  const stages: PipelineAttestationStage[] = (
    [
      ["capture", "Capturar"],
      ["aggregation", "Agregar"],
      ["index", "Calcular índice"],
    ] as const
  ).map(([id, label]) => {
    const stageChecks = checks.filter((item) => item.stage === id);
    const passedCheckCount = stageChecks.filter((item) => item.passed).length;
    return {
      id,
      label,
      status: passedCheckCount === stageChecks.length ? "verified" : "blocked",
      checkCount: stageChecks.length,
      passedCheckCount,
    };
  });

  return {
    schemaVersion: "vitalos.pipeline-attestation.v1",
    packId: input.packId,
    organizationId: input.organizationId,
    cycleId: input.cycleId,
    status: checks.every((item) => item.passed) ? "verified" : "blocked",
    assuranceLevel:
      input.capture.mode === "cloud_persisted" ? "production_runtime" : "demo_contract",
    facts: {
      capture: {
        mode: input.capture.mode,
        persisted: input.capture.persisted,
      },
      aggregation: {
        participantCount: input.aggregation.participantCount,
        kAnonymityMin: input.aggregation.kAnonymityMin,
        publishedPillarCount: input.aggregation.publishedPillarCount,
        protectedPillarCount: input.aggregation.protectedPillarCount,
      },
      index: {
        indexId: input.index.indexId,
        indexLabel: input.index.indexLabel,
        score: input.index.score,
        respondentCount: input.index.respondentCount,
        visiblePillarCount: input.index.visiblePillarCount,
        source: input.index.source,
      },
    },
    stages,
    checks,
  };
}

/** Canonical payload intentionally excludes timestamps and any private-data hash. */
export function canonicalAttestationPayload(draft: PipelineAttestationDraft): string {
  return JSON.stringify({
    schemaVersion: draft.schemaVersion,
    packId: draft.packId,
    organizationId: draft.organizationId,
    cycleId: draft.cycleId,
    status: draft.status,
    assuranceLevel: draft.assuranceLevel,
    facts: draft.facts,
    stages: draft.stages,
    checks: draft.checks,
  });
}
