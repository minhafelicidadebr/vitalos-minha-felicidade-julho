// Acesso compartilhado à demonstração: segredo e sessão próprios, separados da proposta.
// Configure VITALOS_DEMO_VERIFIER (scrypt-v1) e VITALOS_DEMO_ORIGIN no ambiente do servidor.
import {
  createPresentationHandler,
  type PresentationAccessConfig,
} from "@/lib/presentation/access.server";

export function readDemoConfig(): PresentationAccessConfig | null {
  const origins = (process.env.VITALOS_DEMO_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const verifier = process.env.VITALOS_DEMO_VERIFIER;
  if (!origins.length || !verifier) return null;
  return { origins, verifier };
}

export function createDemoAccessHandler(
  deps: Parameters<typeof createPresentationHandler>[0] = {},
) {
  return createPresentationHandler({
    config: readDemoConfig,
    loadDeck: async () => null,
    cookieName: "vitalos_demo",
    cookiePath: "/api/apresentacao",
    signingScope: "demo-session",
    ttlMs: 8 * 60 * 60 * 1000,
    ...deps,
  });
}

export const handleDemoAccessRequest = createDemoAccessHandler();
