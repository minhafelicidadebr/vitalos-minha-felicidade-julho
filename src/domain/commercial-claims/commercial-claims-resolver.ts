// Resolver puro do Commercial Claims Registry (H2.1B MVP, §9). Não pesquisa
// fonte, não gera texto, não reformula copy, não usa IA, não registra
// analytics, não persiste nada, não acessa banco, não autoriza superfície
// nova e não altera o registry — só resolve {claimId, variant, surfaceId}
// contra o que já está aprovado e congelado.
//
// Fail-closed (§9): claim desconhecido, draft/retired/expired, surface não
// autorizada ou variant inexistente sempre lançam — nunca string vazia,
// placeholder, fallback genérico ou copy parcial.

import { findCommercialClaim, isClaimExpired } from "./commercial-claims-registry";
import type { CommercialClaimEntry, ResolvedCommercialClaim } from "./commercial-claim-types";

export interface ResolveCommercialClaimInput {
  claimId: string;
  variant: string;
  surfaceId: string;
}

/**
 * Injeção mínima só para teste (§9 continua puro para quem chama sem 2º
 * argumento — todo binding real usa a assinatura de 1 argumento). Evita
 * mock.module no singleton do registry, que já causou vazamento entre
 * arquivos de teste neste repo (mesma lição do fakeSupabase compartilhado).
 */
export interface ResolveCommercialClaimDeps {
  findClaim: (claimId: string) => CommercialClaimEntry | undefined;
  isExpired: (claim: CommercialClaimEntry, now?: Date) => boolean;
}

const DEFAULT_DEPS: ResolveCommercialClaimDeps = {
  findClaim: findCommercialClaim,
  isExpired: isClaimExpired,
};

export class CommercialClaimResolutionError extends Error {
  constructor(message: string) {
    super(`[commercial-claims-resolver] ${message}`);
    this.name = "CommercialClaimResolutionError";
  }
}

export function resolveCommercialClaim(
  input: ResolveCommercialClaimInput,
  deps: ResolveCommercialClaimDeps = DEFAULT_DEPS,
): ResolvedCommercialClaim {
  const claim = deps.findClaim(input.claimId);
  if (!claim) {
    throw new CommercialClaimResolutionError(
      `claim desconhecido: "${input.claimId}".`,
    );
  }

  if (claim.status !== "approved") {
    throw new CommercialClaimResolutionError(
      `claim "${input.claimId}" está "${claim.status}" — só claims approved podem ser resolvidos.`,
    );
  }

  if (deps.isExpired(claim)) {
    throw new CommercialClaimResolutionError(
      `claim "${input.claimId}" está vencido (review_due_at ${claim.review_due_at}) — precisa de revisão antes de nova publicação.`,
    );
  }

  if (!claim.allowed_surface_ids.includes(input.surfaceId)) {
    throw new CommercialClaimResolutionError(
      `surface "${input.surfaceId}" não está autorizada para o claim "${input.claimId}".`,
    );
  }

  const text = claim.variants[input.variant];
  if (text === undefined) {
    throw new CommercialClaimResolutionError(
      `variant "${input.variant}" não existe no claim "${input.claimId}" (disponíveis: ${Object.keys(claim.variants).join(", ")}).`,
    );
  }

  return Object.freeze({
    claimId: claim.claim_id,
    variant: input.variant,
    surfaceId: input.surfaceId,
    text,
    category: claim.category,
    limitations: claim.limitations,
    sourceRefs: claim.source_refs,
  });
}
