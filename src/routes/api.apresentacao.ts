import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/apresentacao")({
  server: {
    handlers: {
      GET: async ({ request }) => handleAccessRequest(request),
      POST: async ({ request }) => handleAccessRequest(request),
      DELETE: async ({ request }) => handleAccessRequest(request),
    },
  },
});

async function handleAccessRequest(request: Request) {
  if (new URL(request.url).searchParams.get("scope") === "demo") {
    return (await import("@/lib/demo/demo-access.server")).handleDemoAccessRequest(request);
  }
  return (await import("@/lib/presentation/access.server")).handlePresentationRequest(request);
}
