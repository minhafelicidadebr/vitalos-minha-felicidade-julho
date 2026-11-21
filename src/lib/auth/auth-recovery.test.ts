import { expect, mock, test } from "bun:test";
import { resolveAuthDestination, withAuthDeadline } from "./auth-recovery";

const session = async () => ({ user: { id: "synthetic-user" } });
test("erro retornado na consulta não vira ausência de perfil nem onboarding", async () => {
  expect(
    await resolveAuthDestination({
      session,
      profile: async () => ({ data: null, error: { message: "private diagnostic" } }),
    }),
  ).toEqual({ kind: "profile_unavailable" });
});
test("erro lançado na sessão/consulta é recuperável", async () => {
  expect(
    await resolveAuthDestination({
      session: async () => {
        throw Error("private");
      },
      profile: mock(),
    }),
  ).toEqual({ kind: "session_unavailable" });
  expect(
    await resolveAuthDestination({
      session,
      profile: async () => {
        throw Error("private");
      },
    }),
  ).toEqual({ kind: "profile_unavailable" });
});
test("link sem sessão não consulta perfil", async () => {
  const profile = mock();
  expect(await resolveAuthDestination({ session: async () => null, profile })).toEqual({
    kind: "invalid_link",
  });
  expect(profile).not.toHaveBeenCalled();
});
test("somente ausência confirmada conduz ao onboarding", async () => {
  expect(
    await resolveAuthDestination({ session, profile: async () => ({ data: null, error: null }) }),
  ).toEqual({ kind: "ready", to: "/onboarding" });
});
for (const role of ["RH_ADMIN", "DIRETOR", "SST", "COLABORADOR", "UNKNOWN"])
  test(`preserva destino por papel ${role}`, async () => {
    expect(
      await resolveAuthDestination({
        session,
        profile: async () => ({ data: { role }, error: null }),
      }),
    ).toEqual({
      kind: "ready",
      to: ["RH_ADMIN", "DIRETOR", "SST"].includes(role) ? "/rh" : "/colaborador",
    });
  });
test("retorno legítimo conserva query; retorno externo nunca é destino", async () => {
  const profile = async () => ({ data: { role: "RH_ADMIN" }, error: null });
  expect(await resolveAuthDestination({ session, profile }, "/rh/convites?token=ficticio")).toEqual(
    { kind: "ready", to: "/rh/convites?token=ficticio" },
  );
  for (const bad of [
    "https://outside.invalid",
    "//outside.invalid",
    "/%2foutside.invalid",
    "/rh#secret",
  ]) {
    expect(await resolveAuthDestination({ session, profile }, bad)).toEqual({
      kind: "ready",
      to: "/rh",
    });
  }
});
test("deadline libera a interface, não faz retry nem consome resultado tardio", async () => {
  let finish!: (value: string) => void;
  const operation = new Promise<string>((resolve) => {
    finish = resolve;
  });
  await expect(withAuthDeadline(operation, 5)).rejects.toThrow("auth_deadline");
  finish("late");
  expect(await withAuthDeadline(Promise.resolve("ok"), 20)).toBe("ok");
  await expect(withAuthDeadline(Promise.reject(new Error("failure")), 20)).rejects.toThrow(
    "failure",
  );
});
