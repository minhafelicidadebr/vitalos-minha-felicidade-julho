import { createFileRoute } from "@tanstack/react-router";

// Guia da Jornada · conteúdo editorial protegido por senha (só depois da validação no servidor).
export const Route = createFileRoute("/api/guia")({
  server: {
    handlers: {
      GET: async ({ request }) => (await import("@/lib/guide/guide-access.server")).handleGuideRequest(request),
      POST: async ({ request }) => (await import("@/lib/guide/guide-access.server")).handleGuideRequest(request),
      DELETE: async ({ request }) => (await import("@/lib/guide/guide-access.server")).handleGuideRequest(request),
    },
  },
});
