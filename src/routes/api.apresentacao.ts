import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/apresentacao")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (await import("@/lib/presentation/access.server")).handlePresentationRequest(request),
      POST: async ({ request }) =>
        (await import("@/lib/presentation/access.server")).handlePresentationRequest(request),
      DELETE: async ({ request }) =>
        (await import("@/lib/presentation/access.server")).handlePresentationRequest(request),
    },
  },
});
