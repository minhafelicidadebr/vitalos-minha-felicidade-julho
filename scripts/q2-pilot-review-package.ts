// Índice de revisão offline. Não publica, não consulta serviços e não aprova piloto.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getFactorContentById } from "../src/domain/ivo/factor-content";
import { getFactorLearningActivity } from "../src/domain/ivo/factor-learning-activities";
import { getGovernanceEntry } from "../src/domain/ivo/methodology-governance";

export const REVIEW_PACKAGE_PATH = "docs/vitalos/Q2_PILOT_REVIEW_PACKAGE_2026-11-16.json";
export const PRODUCT_CANDIDATE = "517c2066c9b6de0cfeb5914ca107296c1e96d29e";

// Lista fechada: não enumera repositório, arquivos pessoais, .env ou arquivos .q.
// O escopo é selecionado, não uma prova de fechamento transitivo das dependências.
export const REVIEW_ATTACHMENTS = [
  "package.json",
  "bun.lock",
  "src/app/auth/AuthGate.tsx",
  "src/app/auth/auth-gate-state.ts",
  "src/routes/entrar.tsx",
  "src/routes/auth.callback.tsx",
  "src/routes/ivo-integral.acoes.tsx",
  "src/features/auth/InstitutionalAuth.tsx",
  "src/lib/auth/auth-recovery.ts",
  "src/lib/ivo/published-action-source.ts",
  "src/components/ivo/ActionFollowUp.tsx",
  "src/lib/ivo/education-availability.server.ts",
  "src/lib/ivo/learning-application.server.ts",
  "src/domain/ivo/factor-content.json",
  "src/domain/ivo/q2-learning-activity-001.json",
  "src/domain/ivo/methodology-governance.json",
  "src/domain/instruments/fibt/fibt-instrument.v1.json",
  "src/domain/evidence/evidence-registry.json",
  "src/domain/evidence/claim-registry.json",
  "src/domain/evidence/mechanism-registry.json",
  "docs/vitalos/decisions/D10_UNIT_001_2026-11-15.md",
  "docs/vitalos/Q2_D10_APPROVED_LOCAL_PROOF_2026-11-16.md",
  "docs/vitalos/MACRO_ONDA_AUTONOMA_FECHAMENTO_2026-11-16.md",
  "docs/vitalos/LEARNING_Q2_CLIENT_VALIDATION_PROTOCOL.md",
  "docs/vitalos/Q2_PILOT_REVIEW_2026-11-16.md",
  "docs/vitalos/artifacts/Q2_D10_LOCAL_READBACK_2026-11-16.json",
  "docs/vitalos/artifacts/MACRO_ONDA_AUTONOMA_BROWSER_2026-11-16.json",
  "docs/vitalos/artifacts/MACRO_Q2_ORIGEM_PROVA_2026-11-16.json",
  "docs/vitalos/artifacts/MACRO_ACESSO_DESKTOP_2026-11-16.jpg",
  "docs/vitalos/artifacts/MACRO_ACESSO_MOBILE_320_2026-11-16.jpg",
  "docs/vitalos/artifacts/MACRO_Q2_PLANO_MOBILE_320_2026-11-16.jpg",
] as const;

type AttachmentReader = (path: (typeof REVIEW_ATTACHMENTS)[number]) => Uint8Array;
const readAttachment: AttachmentReader = (path) => readFileSync(resolve(path));

export function renderQ2PilotReviewPackage(read: AttachmentReader = readAttachment): string {
  // Os carregadores canônicos validam curadoria, claim, fonte e versões.
  const unit = getFactorContentById("Q2-bem_estar-aprendizagem-equipe-001");
  const activity = getFactorLearningActivity(unit?.id ?? "", unit?.version ?? "");
  const decision = getGovernanceEntry("D10");
  if (
    unit?.status !== "APROVADO" ||
    activity?.status !== "APROVADO" ||
    unit.version !== "0.1.0" ||
    activity.version !== "0.1.0" ||
    unit.curation?.approval?.scope !== "local_descartavel" ||
    activity.curation?.approval?.scope !== "local_descartavel" ||
    decision?.state !== "aprovado_para_piloto" ||
    decision.version !== "0.3.0"
  )
    throw new Error(
      "Escopo/versão canônicos mudaram: revisar o pacote; não promover automaticamente.",
    );

  return (
    JSON.stringify(
      {
        schemaVersion: "q2-pilot-review/0.1.0",
        generated: "nao_editar_a_mao_respostas_no_dossie_humano",
        purpose: "revisao_previa_de_piloto",
        productCandidate: PRODUCT_CANDIDATE,
        snapshotDate: "2026-11-16",
        realPilotAuthorization: "nao_concedida_por_este_pacote",
        evidenceScope: "local_descartavel",
        editorialApproval: {
          decisionId: decision.id,
          decisionVersion: decision.version,
          decisionState: decision.state,
          intendedUse: decision.approval?.intendedUse,
          unit: {
            id: unit.id,
            version: unit.version,
            evidenceRefs: unit.evidenceCodes,
            claimRefs: unit.safeClaimIds,
            approval: unit.curation.approval,
          },
          activity: {
            id: activity.id,
            version: activity.version,
            evidenceRefs: activity.evidenceCodes,
            claimRefs: activity.safeClaimIds,
            approval: activity.curation.approval,
          },
        },
        reportedEvidence: [
          {
            kind: "gate_local",
            reference: "docs/vitalos/MACRO_ONDA_AUTONOMA_FECHAMENTO_2026-11-16.md",
            tests: 4366,
            currentExecution: false,
          },
          {
            kind: "browser_local",
            reference: "docs/vitalos/artifacts/MACRO_Q2_ORIGEM_PROVA_2026-11-16.json",
            currentExecution: false,
          },
          {
            kind: "db_local_anterior",
            reference: "docs/vitalos/artifacts/Q2_D10_LOCAL_READBACK_2026-11-16.json",
            currentExecution: false,
          },
        ],
        unresolvedEvidence: [
          "Captura mobile detalhada do cartão aprovado; resumo mobile já registrado.",
          "CI e homologação remota do candidato não confirmados.",
          "Carga, SLA, recuperação operacional e validação com clientes não demonstrados por este pacote.",
        ],
        // Formulário PROPOSTO, não segundo registro de aprovação. Usar referências
        // pseudônimas na revisão; dados pessoais/credenciais não pertencem ao pacote.
        pilotScopeProposal: {
          state: "aguardando_delimitacao_humana",
          organizationReference: null,
          cohortReference: null,
          period: null,
          operationalResponsibleReference: null,
          participantInformationAndExitReference: null,
          dataAccessRetentionAndDeletionReference: null,
          evaluationDesignAndStopCriteriaReference: null,
          supportAndRecoveryReference: null,
          scopeExtensionDecisionReference: null,
          remoteReleaseAuthorizationReference: null,
        },
        independentDependencies: {
          q1ExactSource: "pendente_apenas_para_Q1",
          esgRelationsAndEvidenceContract: "pendentes_para_alegacoes_e_integracao_ESG",
          efficacyD9: "nao_aprovada_por_aprendizagem_ou_execucao",
        },
        integrity: {
          algorithm: "sha256",
          textNormalization: "CRLF_to_LF_UTF8",
          meaning: "integridade_do_escopo_selecionado_nao_autenticidade_nem_autorizacao",
          attachments: REVIEW_ATTACHMENTS.map((path) => {
            const bytes = read(path);
            const binary = path.endsWith(".jpg");
            const input = binary
              ? bytes
              : Buffer.from(Buffer.from(bytes).toString("utf8").replace(/\r\n/g, "\n"));
            return {
              path,
              format: binary ? "binary" : "text_lf",
              sha256: createHash("sha256").update(input).digest("hex"),
            };
          }),
        },
      },
      null,
      2,
    ) + "\n"
  );
}

export function checkQ2PilotReviewPackage(current: string, read?: AttachmentReader): boolean {
  return current.replace(/\r\n/g, "\n") === renderQ2PilotReviewPackage(read);
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((arg) => !["--check", "--write"].includes(arg))) {
    console.error("Use --check (padrão, somente leitura) ou --write (somente pacote local).");
    process.exit(1);
  }
  if (args[0] === "--write") {
    writeFileSync(REVIEW_PACKAGE_PATH, renderQ2PilotReviewPackage());
    console.log("PACOTE_LOCAL_GRAVADO — piloto real não autorizado.");
  } else {
    if (
      !existsSync(REVIEW_PACKAGE_PATH) ||
      !checkQ2PilotReviewPackage(readFileSync(REVIEW_PACKAGE_PATH, "utf8"))
    ) {
      console.error("INTEGRIDADE_DIVERGENTE — revisar evidências/versões antes de regenerar.");
      process.exit(1);
    }
    console.log(
      "INTEGRIDADE_LOCAL_OK — somente arquivos/escopo selecionados; não executa as provas.",
    );
    console.log("PILOTO_REAL_NAO_AUTORIZADO — decisões de escopo e liberação permanecem próprias.");
  }
}
