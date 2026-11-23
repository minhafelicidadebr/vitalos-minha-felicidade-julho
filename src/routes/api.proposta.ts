import { createFileRoute } from "@tanstack/react-router";

// Proposta comercial · conteúdo e preço só depois da senha validada no servidor.
export const Route = createFileRoute("/api/proposta")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (await import("@/lib/proposal/proposal-access.server")).handleProposalRequest(request),
      POST: async ({ request }) =>
        (await import("@/lib/proposal/proposal-access.server")).handleProposalRequest(request),
      DELETE: async ({ request }) =>
        (await import("@/lib/proposal/proposal-access.server")).handleProposalRequest(request),
    },
  },
});
