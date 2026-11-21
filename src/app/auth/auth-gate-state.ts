// Gate de navegação. A autorização de dados permanece nos serviços e no RLS.
export function authGateState(input: {
  isPublic: boolean;
  ready: boolean;
  hasSession: boolean;
  requiresRealAuth: boolean;
  demoHydrated: boolean;
  demoUnlocked: boolean;
  expired: boolean;
}): "public" | "allow" | "loading" | "recover" | "login" {
  if (input.isPublic) return "public";
  if (input.hasSession) return "allow";
  if (!input.ready || (!input.requiresRealAuth && !input.demoHydrated))
    return input.expired ? "recover" : "loading";
  if (!input.requiresRealAuth && input.demoUnlocked) return "allow";
  return "login";
}
