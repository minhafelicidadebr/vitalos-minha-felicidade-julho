import { sanitizeAuthReturnTo } from "./auth-redirect";

// Limita a espera da interface, sem cancelar ou reenviar a operação no provedor.
export async function withAuthDeadline<T>(operation: PromiseLike<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("auth_deadline")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export type AuthDestination =
  | { kind: "ready"; to: string }
  | { kind: "invalid_link" | "session_unavailable" | "profile_unavailable" };

// Resolve apenas navegação. As rotas e serviços mantêm a autorização.
export async function resolveAuthDestination(
  dependencies: {
    session: () => Promise<{ user: { id: string } } | null>;
    profile: (id: string) => PromiseLike<{ data: { role?: string } | null; error: unknown }>;
  },
  requestedReturnTo?: string,
): Promise<AuthDestination> {
  let session;
  try {
    session = await withAuthDeadline(dependencies.session(), 6000);
  } catch {
    return { kind: "session_unavailable" };
  }
  if (!session) return { kind: "invalid_link" };
  const safeReturnTo = sanitizeAuthReturnTo(requestedReturnTo);
  if (safeReturnTo) return { kind: "ready", to: safeReturnTo };
  try {
    const profile = await withAuthDeadline(dependencies.profile(session.user.id), 8000);
    // Erro não significa ausência: nunca inicia onboarding por falha de consulta.
    if (profile.error) return { kind: "profile_unavailable" };
    if (!profile.data) return { kind: "ready", to: "/onboarding" };
    return {
      kind: "ready",
      to: ["RH_ADMIN", "DIRETOR", "SST"].includes(profile.data.role ?? "") ? "/rh" : "/colaborador",
    };
  } catch {
    return { kind: "profile_unavailable" };
  }
}
