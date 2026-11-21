// Guia da Jornada · porta editorial do visitante (V2.1 §13, porta 1).
// Reusa o mecanismo da apresentação (scrypt, cookie HttpOnly com caminho próprio,
// no-store, limite de tentativas, expiração) com configuração e cookie PRÓPRIOS.
// A credencial vive só no segredo do servidor: VITALOS_GUIDE_VERIFIER (formato scrypt-v1).
// Sessões em memória num só processo: VITALOS_GUIDE_STORE precisa ser "single-process"
// (sem isso, recusa — decisão pendente sobre o armazenamento no ambiente de destino).
import { createPresentationHandler, type PresentationAccessConfig } from "@/lib/presentation/access.server";

export function readGuideConfig(): PresentationAccessConfig | null {
  const origin = process.env.VITALOS_GUIDE_ORIGIN;
  const verifier = process.env.VITALOS_GUIDE_VERIFIER;
  if (process.env.VITALOS_GUIDE_STORE !== "single-process" || !origin || !verifier) return null;
  return { origin, verifier };
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
    ...deps,
  });
}

export const handleGuideRequest = createGuideHandler();
