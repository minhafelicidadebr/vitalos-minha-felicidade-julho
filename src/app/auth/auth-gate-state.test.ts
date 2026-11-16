import { expect, test } from "bun:test";
import { authGateState } from "./auth-gate-state";
const base = {
  isPublic: false,
  ready: true,
  hasSession: false,
  requiresRealAuth: false,
  demoHydrated: true,
  demoUnlocked: false,
  expired: false,
};
test("sessão institucional não depende da hidratação ou senha do demo", () => {
  for (const requiresRealAuth of [true, false])
    expect(
      authGateState({
        ...base,
        hasSession: true,
        demoHydrated: false,
        ready: false,
        requiresRealAuth,
        expired: true,
      }),
    ).toBe("allow");
});
test("demo nunca libera rota real; ausência de sessão leva a login", () => {
  expect(authGateState({ ...base, demoUnlocked: true })).toBe("allow");
  expect(authGateState({ ...base, requiresRealAuth: true, demoUnlocked: true })).toBe("login");
  expect(authGateState(base)).toBe("login");
});
test("aguarda hidratação sem adivinhar desbloqueio e falha com recuperação finita", () => {
  expect(authGateState({ ...base, demoHydrated: false })).toBe("loading");
  expect(authGateState({ ...base, demoHydrated: false, expired: true })).toBe("recover");
  expect(authGateState({ ...base, ready: false, expired: true })).toBe("recover");
});
test("rotas reais não aguardam demo; páginas públicas continuam utilizáveis", () => {
  expect(authGateState({ ...base, requiresRealAuth: true, demoHydrated: false })).toBe("login");
  expect(authGateState({ ...base, isPublic: true, ready: false, expired: true })).toBe("public");
});
