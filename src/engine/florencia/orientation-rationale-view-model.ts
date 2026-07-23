// Orientation Rationale View Model — SAFE-VOICE-BRIDGE §5, Fatia B.
//
// Projeta OrientationRationale (Fatia A, dado técnico/auditável) num
// ViewModel seguro para uma futura superfície de apresentação. Pura
// transformação de forma — nenhuma nova decisão de confiança, nenhum claim
// novo, nenhuma chamada a IA. Este módulo NÃO decide onde/como isto aparece
// na UI (Fatia C, não autorizada aqui) — só decide O QUE é seguro mostrar.
//
// Semântica autorizada: a superfície futura explica GOVERNANÇA E ROTEAMENTO
// ("como esta orientação foi selecionada?") — nunca causalidade, eficácia,
// diagnóstico ou personalização. `title`/`selectionExplanation` são
// constantes FIXAS, iguais para toda orientação — não variam por conteúdo,
// papel ou histórico de uso (travado por teste: nenhum dos dois é composto
// a partir de dado do rationale).
//
// Separação de campos: mechanismId/claimId/studyId/skillId NUNCA entram nas
// strings de copy pública. studyId sobrevive só dentro de
// `passportReference` como chave estrutural (para a Fatia C montar um link
// ao Evidence Passport já existente) — nunca renderizado como texto visível.
// `nascente` é deliberadamente OMITIDO deste ViewModel: não está entre os
// campos autorizados e evita reexibir um nome provisório do NASCENTES_ATLAS
// como se fosse taxonomia definitiva.
//
// Não duplica o Evidence Passport: sem níveis de leitura, sem critérios de
// confiança, sem estrutura de linhas — `evidenceSummary` é o safe_claim já
// congelado, verbatim, e `passportReference` é só uma referência para quem
// quiser abrir o Passport de verdade.
//
// Engine puro: sem React, sem I/O, sem import de src/domain.

import type { OrientationRationale } from "./orientation-rationale-engine";

// ─── Textos fixos (determinísticos — nunca variam por orientação) ──────────

const FIXED_TITLE = "Como esta orientação foi selecionada?";

const FIXED_SELECTION_EXPLANATION =
  "Esta orientação segue uma regra determinística de governança — papel, " +
  "contexto e evidência científica autorizada —, não uma recomendação " +
  "personalizada por inteligência artificial.";

const PASSPORT_CTA_LABEL = "Ver a evidência científica completa";

// ─── Nomes públicos de Skill (curado, extensão linha a linha) ──────────────
//
// Espelho MÍNIMO do campo `name` de
// docs/ai/florencia-skills/registries/skill-registry.json (governança
// documental — nunca importada em runtime, mesma disciplina da Onda 5/
// skill-status-projection.json). Uma Skill nova só ganha entrada aqui
// quando alguém verificar o nome contra o registro canônico — nunca
// derivação automática do skill_id. skillId sem entrada aqui nunca vira
// texto público: fail-closed (ver projectOrientationRationaleViewModel).
const SKILL_PUBLIC_NAME: Readonly<Record<string, string>> = {
  "SKILL-CONVERSATION-FACILITATOR": "Facilitador Conversacional",
  "SKILL-INTERVENTION-PLANNER": "Planejador de Intervenções",
  "SKILL-EVOLVE-MONITOR": "Monitor de Evolução",
  "SKILL-ESG-TRACE-ARCHITECT": "Arquiteto de Rastreabilidade ESG",
};

// ─── Contrato de saída ──────────────────────────────────────────────────────

export interface OrientationRationaleViewModel {
  readonly title: string;
  readonly selectionExplanation: string;
  readonly mechanismPublicName: string;
  readonly mechanismSafeExplanation: string;
  readonly evidenceSummary: string;
  readonly skillPublicName: string;
  /** Referência governada para abrir o Evidence Passport do estudo-âncora —
   * nunca o conteúdo do passaporte em si. null quando a referência não é
   * utilizável; o restante do ViewModel continua válido (campo opcional,
   * não bloqueia a explicação principal). */
  readonly passportReference: { readonly studyId: string; readonly ctaLabel: string } | null;
}

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
 * Projeta o rationale técnico (Fatia A) num ViewModel seguro para
 * apresentação. Fail-closed: `rationale` null ⇒ ViewModel null; Skill sem
 * nome público curado ⇒ ViewModel null inteiro (nunca expõe o skillId cru
 * como substituto de um nome ausente — silêncio é mais seguro que vazamento
 * de id técnico). `passportReference` é a única exceção: sua ausência não
 * derruba o resto do ViewModel, porque é explicitamente opcional.
 */
export function projectOrientationRationaleViewModel(
  rationale: OrientationRationale | null,
): OrientationRationaleViewModel | null {
  if (!rationale) return null;

  const skillPublicName = SKILL_PUBLIC_NAME[rationale.skill.skillId];
  if (!skillPublicName) return null;

  const studyId = rationale.claim.studyId.trim();
  const passportReference = studyId ? { studyId, ctaLabel: PASSPORT_CTA_LABEL } : null;

  return deepFreeze({
    title: FIXED_TITLE,
    selectionExplanation: FIXED_SELECTION_EXPLANATION,
    mechanismPublicName: rationale.mechanism.name,
    mechanismSafeExplanation: rationale.mechanism.safeExplanation,
    evidenceSummary: rationale.claim.safeClaim,
    skillPublicName,
    passportReference,
  });
}
