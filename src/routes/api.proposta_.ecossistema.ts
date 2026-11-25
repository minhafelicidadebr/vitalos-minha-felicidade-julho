import { createFileRoute } from "@tanstack/react-router";

// Proposta para o ecossistema ISG · conteúdo só depois da senha validada no servidor.
// Mesma sessão de /api/proposta (cookie com Path=/api/proposta cobre este caminho).
export const Route = createFileRoute("/api/proposta_/ecossistema")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (await import("@/lib/proposal/proposal-access.server")).handleProposalEcosystemRequest(
          request,
        ),
      POST: async ({ request }) =>
        (await import("@/lib/proposal/proposal-access.server")).handleProposalEcosystemRequest(
          request,
        ),
      DELETE: async ({ request }) =>
        (await import("@/lib/proposal/proposal-access.server")).handleProposalEcosystemRequest(
          request,
        ),
    },
  },
});
