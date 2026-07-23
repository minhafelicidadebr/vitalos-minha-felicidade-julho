// Entry point dos CTAs governados da FlorêncIA na trilha. Nasceu para a única
// capacidade ACTIVE da onda inicial (prepare_safe_conversation, ver
// docs/ai/florencia/CAPABILITY-MAP.md) — o nome do arquivo/componente ficou
// por compatibilidade; hoje serve qualquer CTA do registry cujo intent tenha
// template ativo em response-templates.ts (via prop ctaId; label e ícone vêm
// do registry, nunca digitados aqui). Orquestra o pipeline canônico e abre o
// FlorenciaDrawer com o resultado computado.
//
// Não cria claims, não decide allowedClaimIds, não duplica o Policy Gate,
// não persiste nada, não grava ActionLog, não chama LLM/RAG, não acessa
// resposta individual.
//
// segment/role/route/section/entityRefs/privacyScope/productStatus têm
// defaults de produção (Empresa × Liderança × /voz-segura ×
// mechanism:MECH-VOICE-001+study:EDMONDSON-1999 × aggregate_only × DEMO) e
// só existem como props para exercitar os cenários bloqueados em teste de
// integração, sem duplicar a lógica do Policy Gate na interface.

import { useState } from "react";
import { Eye, Flag, FolderCheck, MessageCircle, type LucideIcon } from "lucide-react";
import { FlorenciaDrawer } from "./FlorenciaDrawer";
import {
  normalizeContextEnvelope,
  type PrivacyScope,
  type ProductStatus,
  type RawContextEnvelope,
} from "@/engine/florencia/context-envelope";
import { resolveFlorenciaContext, type CtaResolution } from "@/engine/florencia/cta-resolution";
import { evaluatePolicyGate } from "@/engine/florencia/policy-gate";
import {
  buildResponseTemplate,
  type FlorenciaResponseTemplateResult,
} from "@/engine/florencia/response-templates";
import { resolveOrientationRationale } from "@/engine/florencia/orientation-rationale-engine";
import {
  projectOrientationRationaleViewModel,
  type OrientationRationaleViewModel,
} from "@/engine/florencia/orientation-rationale-view-model";
import ctaRegistryJson from "@/domain/florencia/cta-registry.json";
import { CLAIM_REGISTRY, EVIDENCE_REGISTRY, MECHANISM_REGISTRY } from "@/domain/evidence/registries";
import { resolveSkillStatusMap } from "@/domain/florencia/skill-status-projection";
import { getLearningDynamicsRegistry } from "@/domain/learning/learning-dynamics-registry";
import { deriveProductStatus } from "@/engine/learning/learning-dynamics-resolution";

// Mesma fonte governada dos passaportes de /voz-segura — nenhuma leitura
// paralela dos JSONs de evidência aqui (ver domain/evidence/registries.ts).
const CLAIMS = CLAIM_REGISTRY.claims;
const EVIDENCE = EVIDENCE_REGISTRY;
// Truth Layer (Onda 5): mapa canônico de status de Skill — obrigatório no
// Policy Gate desde este corte. Espelho curado do skill-registry.json
// documental, nunca lido diretamente aqui (ver skill-status-projection.ts).
const SKILL_STATUS = resolveSkillStatusMap();

// Ícones permitidos por nome do registry — fallback MessageCircle para nome
// desconhecido (o ícone é decorativo; o label do registry é a informação).
const CTA_ICONS: Record<string, LucideIcon> = {
  "message-circle": MessageCircle,
  eye: Eye,
  flag: Flag,
  "folder-check": FolderCheck,
};

// Truth Layer (Onda 5 — semente): o status de produto default NÃO é digitado —
// deriva do registro canônico de dinâmicas (LD-001 = FlorêncIA determinística,
// runtime PARCIAL × conteúdo DEMO ⇒ superfície DEMO pelo elo mais fraco).
// Dinâmica ausente do registro = piso DEMO (falha fechado, nunca eleva).
const FLORENCIA_DYNAMIC_ID = "LD-001";
const florenciaDynamic = getLearningDynamicsRegistry().find((d) => d.id === FLORENCIA_DYNAMIC_ID);
const DERIVED_PRODUCT_STATUS: ProductStatus = florenciaDynamic
  ? deriveProductStatus(florenciaDynamic)
  : "DEMO";

interface CtaRegistryEntry {
  cta_id: string;
  intent: string;
  label: string;
  icon: string;
  entityRefs: string[];
  allowedEntityRefPrefixes: string[];
  requestedClaimIds: string[];
  candidateSkillIds: string[];
  suggestedQuestions: string[];
}

// Única tradução estrutural JSON → CtaResolution — não decide nem reinterpreta
// nada do registry, só troca cta_id por ctaId (Engine ≠ Domínio: quem lê o
// JSON é a camada de aplicação, não o engine).
function resolveCtaFromRegistry(ctaId: string): CtaResolution | null {
  const registry = ctaRegistryJson as unknown as { ctas: CtaRegistryEntry[] };
  const entry = registry.ctas.find((c) => c.cta_id === ctaId);
  if (!entry) return null;
  return {
    ctaId: entry.cta_id,
    intent: entry.intent,
    label: entry.label,
    icon: entry.icon,
    suggestedQuestions: entry.suggestedQuestions,
    requestedClaimIds: entry.requestedClaimIds,
    allowedEntityRefPrefixes: entry.allowedEntityRefPrefixes,
    candidateSkillIds: entry.candidateSkillIds,
  };
}

export interface FlorenciaSafeConversationEntryPointProps {
  /** CTA do registry a orquestrar — o label/ícone do botão vêm de lá. */
  ctaId?: string;
  segment?: string;
  role?: string;
  route?: string;
  section?: string;
  entityRefs?: string[];
  privacyScope?: PrivacyScope;
  productStatus?: ProductStatus;
  /**
   * Notifica o caller do resultado computado (allowed ou blocked) — o
   * componente não persiste nada sozinho (ver nota no topo do arquivo);
   * quem decide se/como registrar (ex.: ActionLog) é a rota que o compõe.
   */
  onInteraction?: (result: FlorenciaResponseTemplateResult) => void;
}

export function FlorenciaSafeConversationEntryPoint({
  ctaId = "CTA-PREPARE-CONVERSATION",
  segment = "enterprise",
  role = "lider",
  route = "/voz-segura",
  section = "preparar-conversa",
  entityRefs = ["mechanism:MECH-VOICE-001", "study:EDMONDSON-1999"],
  privacyScope = "aggregate_only",
  productStatus = DERIVED_PRODUCT_STATUS,
  onInteraction,
}: FlorenciaSafeConversationEntryPointProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<FlorenciaResponseTemplateResult | null>(null);
  // SAFE-VOICE-BRIDGE §5, Fatia C — projeção "por que esta orientação foi
  // recomendada?" computada aqui (mesma camada que já monta context/policy
  // gate/template), nunca dentro do FlorenciaDrawer (que continua puramente
  // apresentacional). null sempre que result não for "allowed" — nenhum
  // rationale é calculado para bloqueios.
  const [viewModel, setViewModel] = useState<OrientationRationaleViewModel | null>(null);

  const isAuthorizedSurface = segment === "enterprise" && role === "lider";
  const registryCta = resolveCtaFromRegistry(ctaId);

  function handleClick() {
    const cta = registryCta;
    if (!cta) return;

    const raw: RawContextEnvelope = {
      cta_id: ctaId,
      segment,
      role,
      route,
      section,
      entity_refs: entityRefs,
      privacy_scope: privacyScope,
      product_status: productStatus,
    };

    const outcome = resolveFlorenciaContext(normalizeContextEnvelope(raw), cta);
    // Falha estrutural de resolução (não um bloqueio governado) — sem
    // superfície de erro, sem drawer com result null, sem stack exposto.
    if (!outcome.ok || !outcome.context) return;

    const policyGate = evaluatePolicyGate(outcome.context, CLAIMS, EVIDENCE, {
      allowedPrivacyScopes: ["aggregate_only"],
      skillStatus: SKILL_STATUS,
    });

    const templateResult = buildResponseTemplate({ context: outcome.context, cta, policyGate });
    setResult(templateResult);

    // Fatia C: rationale só é resolvido quando allowed — um bloqueio não
    // produziu orientação, não há "porquê" para explicar (mesmo princípio
    // do bloqueador 1 pré-§5 para orientation_consulted).
    const rationale =
      templateResult.status === "allowed"
        ? resolveOrientationRationale(
            {
              templateId: templateResult.templateId,
              requestContext: {
                intendedUse: outcome.context.intent,
                role: outcome.context.role,
                segment: outcome.context.segment,
                targetContext: outcome.context.section,
              },
              candidateSkillIds: outcome.context.candidateSkillIds,
            },
            {
              evidenceRegistry: EVIDENCE,
              claimRegistry: CLAIM_REGISTRY,
              mechanisms: MECHANISM_REGISTRY,
              skillStatusMap: SKILL_STATUS,
            },
          )
        : null;
    setViewModel(projectOrientationRationaleViewModel(rationale));

    setOpen(true);
    onInteraction?.(templateResult);
  }

  // Autorização de superfície: só Empresa × Liderança vê esta CTA. Rota e
  // entity_refs continuam validadas pelo pipeline — bloqueiam com safeMessage
  // em vez de esconder o botão (ver response-templates.ts). CTA inexistente
  // no registry também não renderiza nada (falha estrutural, não governada).
  if (!isAuthorizedSurface || !registryCta) return null;

  const Icon = CTA_ICONS[registryCta.icon] ?? MessageCircle;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Icon className="h-4 w-4" aria-hidden />
        {registryCta.label}
      </button>
      <FlorenciaDrawer open={open} onOpenChange={setOpen} result={result} viewModel={viewModel} />
    </>
  );
}
