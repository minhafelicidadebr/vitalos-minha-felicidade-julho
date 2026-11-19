import { expect, test } from "bun:test";
import { operatePreparation } from "./q1-preparation.server";
import { noticeVersion, type PrepEvent, type PrepSave } from "@/domain/survey/q1-preparation";
const org = crypto.randomUUID(),
  user = crypto.randomUUID(),
  cycle = "2027-T1";
const base: PrepSave = {
  expectedScope: org,
  cycle,
  requestId: crypto.randomUUID(),
  base: 0,
  command: {
    kind: "notice",
    template: noticeVersion,
    contact: "Canal da equipe",
    returnChannel: "Mural coletivo",
  },
};
function fixture() {
  const events: PrepEvent[] = [];
  let calls = 0;
  const deps = {
    authorize: async () => ({ ok: true as const, orgId: org, userId: user, role: "RH_ADMIN" }),
    journal: async (actor: { orgId: string; userId: string }, key: string, append?: PrepSave) => {
      expect(actor.orgId).toBe(org);
      expect(key).toBe(cycle);
      calls++;
      if (append && !events.some((e) => e.id === append.requestId))
        events.push({ id: append.requestId, command: append.command });
      return { status: "ready", organization: "Empresa fictícia", events };
    },
  };
  return { deps, events, calls: () => calls };
}
test("recusa perfil inadequado e mudança de empresa antes da consulta", async () => {
  const f = fixture();
  expect(
    await operatePreparation(base, {
      ...f.deps,
      authorize: async () => ({ ok: true, role: "LIDER", orgId: org, userId: user }),
    }),
  ).toEqual({ ok: false, reason: "forbidden" });
  expect(await operatePreparation({ ...base, expectedScope: crypto.randomUUID() }, f.deps)).toEqual(
    { ok: false, reason: "scope" },
  );
  expect(f.calls()).toBe(0);
});
test("aplica a revisão, admite replay e devolve somente a projeção da própria organização", async () => {
  const f = fixture();
  const saved = await operatePreparation(base, f.deps);
  expect(saved.ok && saved.view.revision).toBe(1);
  expect(saved).not.toHaveProperty("events");
  expect(await operatePreparation(base, f.deps)).toEqual(saved);
  expect(f.events).toHaveLength(1);
  expect(await operatePreparation({ ...base, requestId: crypto.randomUUID() }, f.deps)).toEqual({
    ok: false,
    reason: "conflict",
  });
  expect(await operatePreparation({ cycle }, f.deps)).toEqual(saved);
});
test("recusa Q1 desligado, histórico inválido, transição inválida e revogação durante a escrita", async () => {
  const f = fixture();
  expect(
    await operatePreparation(
      { cycle },
      { ...f.deps, journal: async () => ({ status: "forbidden" }) },
    ),
  ).toEqual({ ok: false, reason: "forbidden" });
  const malformed = {
    ...f.deps,
    journal: async () => ({
      status: "ready",
      organization: "Alfa",
      events: [{ command: { kind: "broken" } }],
    }),
  };
  expect(await operatePreparation({ cycle }, malformed)).toEqual({
    ok: false,
    reason: "unavailable",
  });
  const revoked = {
    ...f.deps,
    journal: async (a: Parameters<typeof f.deps.journal>[0], c: string, s?: PrepSave) =>
      s ? { status: "forbidden" } : f.deps.journal(a, c),
  };
  expect(await operatePreparation(base, revoked)).toEqual({ ok: false, reason: "forbidden" });
  const plan = {
    kind: "plan",
    controlId: crypto.randomUUID(),
    action: "Ajustar escala",
    owner: "Supervisão",
    due: "2027-03-01",
    indicator: "Revisar a escala",
  } as const;
  expect(await operatePreparation({ ...base, command: plan }, f.deps)).toEqual({
    ok: false,
    reason: "invalid",
  });
  expect(f.events).toHaveLength(0);
});
