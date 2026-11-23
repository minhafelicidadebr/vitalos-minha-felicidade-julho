// Proposta comercial · mesma porta da apresentação empresarial (scrypt, sessão sem estado
// assinada em cookie HttpOnly, no-store, limite de tentativas, expiração), com configuração,
// cookie, caminho e escopo de assinatura PRÓPRIOS. Preço e termos só saem por aqui.
// Segredos do servidor: VITALOS_PROPOSAL_VERIFIER (scrypt-v1) e VITALOS_PROPOSAL_ORIGIN.
import {
  createPresentationHandler,
  type PresentationAccessConfig,
} from "@/lib/presentation/access.server";

export function readProposalConfig(): PresentationAccessConfig | null {
  const origins = (process.env.VITALOS_PROPOSAL_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const verifier = process.env.VITALOS_PROPOSAL_VERIFIER;
  if (!origins.length || !verifier) return null;
  return { origins, verifier };
}

export function createProposalHandler(deps: Parameters<typeof createPresentationHandler>[0] = {}) {
  return createPresentationHandler({
    config: readProposalConfig,
    loadDeck: async () => (await import("./isg-content.server")).getIsgProposal(),
    cookieName: "vitalos_proposal",
    cookiePath: "/api/proposta",
    signingScope: "proposal-session",
    // Cabe uma reunião executiva inteira sem pedir a senha de novo.
    ttlMs: 90 * 60 * 1000,
    ...deps,
  });
}

export const handleProposalRequest = createProposalHandler();
