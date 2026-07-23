// Orientation Rationale Engine — SAFE-VOICE-BRIDGE §5, Fatia A.
//
// Resolve "por que esta orientação foi recomendada?" — o primeiro consumidor
// real da ponte NASCENTES (ver docs/ai/nascentes-atlas/SAFE-VOICE-BRIDGE.md
// e docs/ai/nascentes-atlas/PLANO_SAFE_VOICE_BRIDGE_5_CONSUMIDOR_2026-07-22.md).
//
// Contrato: devolve OrientationRationale | null. Nunca um objeto parcial —
// qualquer elo ausente, órfão, incompatível ou não confiável faz o resultado
// inteiro cair para null (fail-closed). Reusa exclusivamente funções e
// registries já existentes e testados:
//   - getTemplateAnchors (response-templates.ts) — o vínculo canônico
//     templateId → mechanismId, decidido como propriedade intrínseca do
//     template (checkpoint arquitetural da Fatia A, decisão A).
//   - findClaimForContext / resolveStudy (passport-engine.ts) — mesma
//     seleção de claim com contexto completo + trustGate embutido que
//     /voz-segura já usa para os passaportes.
//   - isSkillAvailable (skill-status.ts) — mesmo predicado único de
//     disponibilidade de Skill usado em toda a Truth Layer (Onda 5).
//
// Este motor explica GOVERNANÇA E ROTEAMENTO (por que este template, com
// este mecanismo e esta Skill, foi selecionado para este contexto) — nunca
// causalidade, eficácia, personalização ou recomendação individual. Não cria
// claim novo, não reescreve safe_claim, não duplica texto do Evidence
// Passport (só referencia studyId para quem quiser aprofundar lá).
//
// Engine puro: sem React, sem I/O, sem import de src/domain. Determinístico
// — mesma entrada sempre produz a mesma saída estrutural; nenhum relógio,
// random ou efeito colateral.

import { getTemplateAnchors, type FlorenciaTemplateId } from "./response-templates";
import { isSkillAvailable, type SkillLifecycleStatus } from "./skill-status";
import {
  findClaimForContext,
  resolveStudy,
  type ClaimRegistry,
  type EvidenceRegistry,
  type MechanismRecord,
  type RequestContext,
} from "@/engine/evidence/passport-engine";

// ─── Contrato de saída ────────────────────────────────────────────────────────

export interface OrientationRationale {
  readonly templateId: FlorenciaTemplateId;
  readonly mechanism: {
    readonly mechanismId: string;
    readonly name: string;
    readonly safeExplanation: string;
    /** Nome provisório do NASCENTES_ATLAS v0.9 — nunca exibir sem o
     * qualificador "provisório" na superfície consumidora. */
    readonly nascente: string;
  };
  readonly claim: {
    readonly claimId: string;
    readonly safeClaim: string;
    /** Referência para linkar ao Evidence Passport — nunca o conteúdo do
     * passaporte é reproduzido aqui (diferenciação SAFE-VOICE-BRIDGE §5 §6). */
    readonly studyId: string;
  };
  readonly skill: {
    readonly skillId: string;
    readonly status: SkillLifecycleStatus;
  };
}

// ─── Contrato de entrada ──────────────────────────────────────────────────────

export interface OrientationRationaleInput {
  /** Vem de FlorenciaResponseAllowed.templateId (resultado já computado por
   * buildResponseTemplate — este motor nunca reconstrói o pipeline). */
  readonly templateId: string;
  /** Mesmo shape que voz-segura.tsx já monta para findClaimForContext
   * (intendedUse=intent, role, segment, targetContext=section). */
  readonly requestContext: RequestContext;
  /** ResolvedFlorenciaContext.candidateSkillIds — ordem importa: a primeira
   * é a Skill principal (mesma convenção do cta-registry.json). */
  readonly candidateSkillIds: readonly string[];
}

export interface OrientationRationaleSources {
  readonly evidenceRegistry: EvidenceRegistry;
  readonly claimRegistry: ClaimRegistry;
  readonly mechanisms: readonly MechanismRecord[];
  readonly skillStatusMap: Readonly<Record<string, SkillLifecycleStatus>>;
}

// ─── Resolução ─────────────────────────────────────────────────────────────────

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * Resolve a cadeia mínima da orientação. Ordem dos guards = ordem de
 * checagem; cada um cobre exatamente um cenário de fail-closed do contrato.
 * Nunca devolve objeto parcial — o primeiro elo que falhar interrompe com
 * null, nenhum campo é preenchido antes da checagem completa.
 */
export function resolveOrientationRationale(
  input: OrientationRationaleInput,
  sources: OrientationRationaleSources,
): OrientationRationale | null {
  // 1. Vínculo canônico do template — cobre "template inexistente" e
  //    "vínculo ausente" (getTemplateAnchors só devolve non-null para
  //    templates ativos com mechanismId/requiredClaimId declarados).
  const anchors = getTemplateAnchors(input.templateId);
  if (!anchors) return null;

  // 2. Mecanismo — cobre "mecanismo órfão" e "IDs duplicados"/"registry
  //    inválido" (id duplicado torna qualquer ocorrência não confiável,
  //    mesma disciplina de resolveSkillStatusMap).
  const matches = sources.mechanisms.filter((m) => m.mechanism_id === anchors.mechanismId);
  if (matches.length !== 1) return null;
  const mechanism = matches[0]!;

  // 3-5. Estudos do mecanismo (primário + complementares) — um mecanismo
  //    pode ancorar mais de um estudo (ex.: MECH-VOICE-001 tem TRU-006
  //    primário + LDR-007 complementar); claims diferentes do MESMO
  //    mecanismo podem autorizar estudos diferentes dentro dele. Tenta cada
  //    study_id até achar o claim que o TEMPLATE efetivamente exige — nunca
  //    assume que é sempre o primário, e nunca aceita um claim genericamente
  //    compatível que não seja o exigido (isso cobre "claim órfão",
  //    "incompatível com papel/segmento/targetContext" e "ambiguidade" num
  //    só laço: só a combinação estudo-do-mecanismo × claim-exigido conta).
  let matchedClaim: ReturnType<typeof findClaimForContext> = null;
  let matchedStudyId: string | null = null;
  for (const studyId of mechanism.study_ids) {
    const candidateStudy = resolveStudy(sources.evidenceRegistry, studyId);
    if (!candidateStudy) continue; // estudo-âncora ausente para este id — tenta o próximo
    const candidateClaim = findClaimForContext(
      sources.evidenceRegistry,
      sources.claimRegistry,
      candidateStudy,
      input.requestContext,
    );
    if (candidateClaim && candidateClaim.claim_id === anchors.requiredClaimId) {
      matchedClaim = candidateClaim;
      matchedStudyId = candidateStudy.study_id;
      break;
    }
  }
  if (!matchedClaim || !matchedStudyId) return null;
  const claim = matchedClaim;
  const studyId = matchedStudyId;

  // 6. Skill — candidateSkillIds[0] é a Skill PRINCIPAL CANÔNICA da
  //    orientação, formalizado aqui (checkpoint da Fatia B): índices
  //    posteriores (candidateSkillIds[1+], ex.: SKILL-EVIDENCE-CLAIM-
  //    GUARDIAN/SKILL-PRIVACY-SAFETY-GUARDIAN no cta-registry.json) são
  //    Skills AUXILIARES da governança, nunca fallback automático da
  //    principal. Se a principal estiver indisponível (ROADMAP/desconhecida),
  //    o motor falha fechado — NUNCA degrada silenciosamente para a próxima
  //    da lista (isSkillAvailable é o único predicado de disponibilidade do
  //    sistema; travado por teste em orientation-rationale-engine.test.ts).
  const principalSkillId = input.candidateSkillIds[0];
  if (!principalSkillId) return null;
  const skillStatus = sources.skillStatusMap[principalSkillId];
  if (!isSkillAvailable(skillStatus)) return null;
  const skillId = principalSkillId;

  return deepFreeze({
    templateId: input.templateId as FlorenciaTemplateId,
    mechanism: {
      mechanismId: mechanism.mechanism_id,
      name: mechanism.name,
      safeExplanation: mechanism.safe_explanation,
      nascente: mechanism.nascente,
    },
    claim: {
      claimId: claim.claim_id,
      safeClaim: claim.safe_claim,
      studyId,
    },
    skill: {
      skillId,
      status: skillStatus as SkillLifecycleStatus,
    },
  });
}
