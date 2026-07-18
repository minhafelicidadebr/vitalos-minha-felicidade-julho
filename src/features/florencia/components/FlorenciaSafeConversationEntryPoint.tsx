// CTA governado da única capacidade ACTIVE desta onda — prepare_safe_conversation
// (docs/ai/florencia/CAPABILITY-MAP.md). Orquestra o pipeline canônico já
// existente e abre o FlorenciaDrawer com o resultado computado.
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
import { MessageCircle } from "lucide-react";
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
import type { ClaimRegistry, EvidenceRegistry } from "@/engine/evidence/passport-engine";
import ctaRegistryJson from "@/domain/florencia/cta-registry.json";
import claimRegistryJson from "@/domain/evidence/claim-registry.json";
import evidenceRegistryJson from "@/domain/evidence/evidence-registry.json";

const CTA_ID = "CTA-PREPARE-CONVERSATION";
const CLAIMS = (claimRegistryJson as unknown as ClaimRegistry).claims;
const EVIDENCE = evidenceRegistryJson as unknown as EvidenceRegistry;

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
  segment = "enterprise",
  role = "lider",
  route = "/voz-segura",
  section = "preparar-conversa",
  entityRefs = ["mechanism:MECH-VOICE-001", "study:EDMONDSON-1999"],
  privacyScope = "aggregate_only",
  productStatus = "DEMO",
  onInteraction,
}: FlorenciaSafeConversationEntryPointProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<FlorenciaResponseTemplateResult | null>(null);

  const isAuthorizedSurface = segment === "enterprise" && role === "lider";

  function handleClick() {
    const cta = resolveCtaFromRegistry(CTA_ID);
    if (!cta) return;

    const raw: RawContextEnvelope = {
      cta_id: CTA_ID,
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
    });

    const templateResult = buildResponseTemplate({ context: outcome.context, cta, policyGate });
    setResult(templateResult);
    setOpen(true);
    onInteraction?.(templateResult);
  }

  // Autorização de superfície: só Empresa × Liderança vê esta CTA. Rota e
  // entity_refs continuam validadas pelo pipeline — bloqueiam com safeMessage
  // em vez de esconder o botão (ver response-templates.ts).
  if (!isAuthorizedSurface) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Preparar uma conversa segura
      </button>
      <FlorenciaDrawer open={open} onOpenChange={setOpen} result={result} />
    </>
  );
}
