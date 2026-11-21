// Guia da Jornada · porta editorial do visitante (V2.1 §13, porta 1).
// Reusa o mecanismo da apresentação: scrypt, sessão SEM ESTADO assinada no cookie
// HttpOnly (funciona entre instâncias do Worker), no-store, limite de tentativas e
// expiração. Configuração, cookie, caminho e escopo de assinatura são PRÓPRIOS do guia.
// A credencial vive só no segredo do servidor: VITALOS_GUIDE_VERIFIER (formato scrypt-v1)
// e VITALOS_GUIDE_ORIGIN (uma ou mais origens separadas por vírgula).
import { createPresentationHandler, type PresentationAccessConfig } from "@/lib/presentation/access.server";

export function readGuideConfig(): PresentationAccessConfig | null {
  const origins = (process.env.VITALOS_GUIDE_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const verifier = process.env.VITALOS_GUIDE_VERIFIER;
  if (!origins.length || !verifier) return null;
  return { origins, verifier };
}

export function createGuideHandler(deps: Parameters<typeof createPresentationHandler>[0] = {}) {
  return createPresentationHandler({
    config: readGuideConfig,
    loadDeck: async () => ({
      content: (await import("@/domain/guide/enterprise-guide")).ENTERPRISE_GUIDE,
      // Usado só para o rótulo de disponibilidade ("Disponível" × "Em preparação").
      environment: process.env.VITALOS_RUNTIME_ENV ?? "unknown",
    }),
    cookieName: "vitalos_guide",
    cookiePath: "/api/guia",
    signingScope: "guide-session",
    ...deps,
  });
}

export const handleGuideRequest = createGuideHandler();
