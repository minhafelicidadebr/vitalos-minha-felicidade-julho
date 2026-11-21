// Liderança ligada ao ciclo de ação Q2 (decisão Q2_LEADER_SCOPE_PROPOSAL_2026-11-18):
// lê e registra execução só nas ações das quais é responsável; o resto segue com o RH.

import { describe, expect, test } from "bun:test";
import type { MembershipResult } from "@/lib/auth/authorize.server";
import {
  activateFibtActionPlan,
  loadFibtActionLoop,
  recordFibtActionEvidence,
  recordFibtActionStatus,
  setFibtActionAccountability,
  type FibtActionLedgerStore,
  type FibtActionLoopDeps,
  type FibtLedgerItemRow,
  type FibtLedgerSnapshot,
} from "./fibt-action-loop.server";
import { loadIvoQ2ReadingForSession } from "./ivo-q2-reading.server";

const ADMIN: Record<string, MembershipResult> = {
  "t-rh": { ok: true, membership: { userId: "u-rh", orgId: "org-alfa", role: "RH_ADMIN" } },
};
const MEMBER: Record<string, MembershipResult> = {
  "t-lider": { ok: true, membership: { userId: "u-lider", orgId: "org-alfa", role: "LIDER_EQUIPE" } },
  "t-colab": { ok: true, membership: { userId: "u-colab", orgId: "org-alfa", role: "COLABORADOR" } },
  "t-lider-beta": { ok: true, membership: { userId: "u-lider-b", orgId: "org-beta", role: "LIDER_EQUIPE" } },
};

function item(id: string, ownerUserId: string | null, planId = "plan-ativo"): FibtLedgerItemRow {
  return {
    id, planId, orgId: "org-alfa", rank: 1, title: `Ação ${id}`, description: "d", effort: "medio", status: "planejada",
    ownerUserId, ownerRoleLabel: "Facilitação", dueOn: "2026-12-01", metricLabel: "Encontros", metricBaseline: 0, metricTarget: 1, metricUnit: "encontro",
    sourceLensId: "fibt", sourceWaveId: "w", sourceCohortId: "c", sourceFactorId: "bem_estar", sourceInstrumentVersion: "1.0.0", sourcePublishedAt: "2026-11-15T00:00:00.000Z",
  };
}

function ledger() {
  const state: FibtLedgerSnapshot = {
    plans: [
      { id: "plan-ativo", orgId: "org-alfa", cycleKey: "2026-T4", seasonName: "T4", status: "active", createdAt: "2026-11-01T00:00:00.000Z", activatedAt: "2026-11-02T00:00:00.000Z" },
      { id: "plan-rascunho", orgId: "org-alfa", cycleKey: "2027-T1", seasonName: "T1", status: "draft", createdAt: "2026-11-10T00:00:00.000Z", activatedAt: null },
    ],
    items: [item("propria", "u-lider"), item("alheia", "u-rh"), item("rascunho", "u-lider", "plan-rascunho")],
    evidence: [{ id: "ev-alheia", itemId: "alheia", orgId: "org-alfa", kind: "texto", scope: "execucao", contentRef: "ata", occurredOn: "2026-11-05", createdAt: "2026-11-05T00:00:00.000Z" }],
    events: [],
    cohortLabels: {},
  };
  const writes: string[] = [];
  const store = {
    loadFibtLedger: async () => structuredClone(state),
    listPlanCycles: async () => [],
    findItem: async (orgId: string, itemId: string) => {
      const i = state.items.find((x) => x.id === itemId && x.orgId === orgId);
      const p = i && state.plans.find((x) => x.id === i.planId);
      return i && p ? { id: i.id, orgId: i.orgId, planId: i.planId, sourceLensId: i.sourceLensId, sourceFactorId: i.sourceFactorId, status: i.status, planStatus: p.status, ownerUserId: i.ownerUserId } : null;
    },
    findPlan: async (orgId: string, planId: string) => {
      const p = state.plans.find((x) => x.id === planId && x.orgId === orgId);
      return p ? { id: p.id, orgId: p.orgId, status: p.status } : null;
    },
    createPlan: async () => ({ accepted: false, reason: "unused", planId: null }),
    setAccountability: async (input: { itemId: string; owner: { userId: string } }) => { writes.push(`owner:${input.itemId}:${input.owner.userId}`); return { accepted: true, reason: null }; },
    activatePlan: async () => { writes.push("activate"); return { accepted: true }; },
    recordEvent: async (input: { itemId: string; actorRoleLabel: string }) => { writes.push(`status:${input.itemId}:${input.actorRoleLabel}`); return { accepted: true, reason: null }; },
    recordEvidence: async (input: { itemId: string; actorRoleLabel: string }) => { writes.push(`evidence:${input.itemId}:${input.actorRoleLabel}`); return { accepted: true, reason: null, evidenceId: "ev-new" }; },
  } as unknown as FibtActionLedgerStore;
  return { store, writes };
}

function deps(store: FibtActionLedgerStore): FibtActionLoopDeps {
  return {
    moduleAccess: async () => ({ ok: true }),
    boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
    identity: () => ({ requestedMode: "cloud", state: "cloud", realAuthentication: true, serverEnforced: true, reason: "cloud_ready" }),
    requireAdmin: async (t) => ADMIN[t] ?? (MEMBER[t] ? { ok: false, reason: "not_admin" } : { ok: false, reason: "invalid_session" }),
    resolveMember: async (t) => MEMBER[t] ?? ADMIN[t] ?? { ok: false, reason: "invalid_session" },
    capability: () => ({ enabled: true, source: "local_fixture" }),
    ledger: store,
    listOrgLeaders: async (orgId) => (orgId === "org-alfa" ? [{ userId: "u-lider", label: "Liderança Alfa" }] : []),
    findOrgMemberRole: async (orgId, userId) =>
      ({ "org-alfa:u-lider": "LIDER_EQUIPE", "org-alfa:u-colab": "COLABORADOR", "org-alfa:u-rh": "RH_ADMIN" } as Record<string, string>)[`${orgId}:${userId}`] ?? null,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  };
}

const titles = (r: Awaited<ReturnType<typeof loadFibtActionLoop>>) =>
  r.ok ? r.plans.flatMap((p) => p.actions.map((a) => a.title)) : null;

describe("liderança no ciclo de ação Q2", () => {
  test("lê só a própria ação do plano ativo; nem rascunho, nem ação alheia, nem evidência alheia", async () => {
    const { store } = ledger();
    const r = await loadFibtActionLoop({ accessToken: "t-lider" }, deps(store));
    expect(titles(r)).toEqual(["Ação propria"]);
    expect(r).toMatchObject({ ok: true, viewerScope: "own_actions" });
    expect(await loadFibtActionLoop({ accessToken: "t-rh" }, deps(store))).not.toHaveProperty("viewerScope");
    expect(JSON.stringify(r)).not.toContain("Ação alheia");
    expect(JSON.stringify(r)).not.toContain("ev-alheia");
    // RH segue vendo tudo.
    expect(titles(await loadFibtActionLoop({ accessToken: "t-rh" }, deps(store)))).toEqual(
      expect.arrayContaining(["Ação propria", "Ação alheia", "Ação rascunho"]),
    );
  });

  test("registra estado e execução na própria ação, com papel derivado da sessão", async () => {
    const { store, writes } = ledger();
    expect(await recordFibtActionStatus({ accessToken: "t-lider", itemId: "propria", toStatus: "em_execucao" }, deps(store))).toMatchObject({ ok: true, accepted: true });
    expect(await recordFibtActionEvidence({ accessToken: "t-lider", itemId: "propria", scope: "execucao", content: "encontro realizado", occurredOn: "2026-11-17" }, deps(store))).toMatchObject({ ok: true, accepted: true });
    expect(writes).toEqual(["status:propria:LIDER_EQUIPE", "evidence:propria:LIDER_EQUIPE"]);
  });

  test("ação alheia responde como inexistente; rascunho recusa; aprendizagem e ativação seguem com o RH", async () => {
    const { store, writes } = ledger();
    const d = deps(store);
    expect(await recordFibtActionStatus({ accessToken: "t-lider", itemId: "alheia", toStatus: "em_execucao" }, d)).toMatchObject({ accepted: false, reason: "item_not_found" });
    expect(await recordFibtActionEvidence({ accessToken: "t-lider", itemId: "alheia", scope: "execucao", content: "x", occurredOn: "2026-11-17" }, d)).toMatchObject({ accepted: false, reason: "item_not_found" });
    expect(await recordFibtActionStatus({ accessToken: "t-lider", itemId: "rascunho", toStatus: "em_execucao" }, d)).toMatchObject({ accepted: false, reason: "plan_not_active" });
    expect(await recordFibtActionEvidence({ accessToken: "t-lider", itemId: "propria", scope: "aprendizagem", content: "x", occurredOn: "2026-11-17" }, d)).toMatchObject({ accepted: false, reason: "authority_reserved_to_admin" });
    expect(await activateFibtActionPlan({ accessToken: "t-lider", planId: "plan-rascunho" }, d)).toMatchObject({ ok: false, category: "forbidden" });
    expect(writes).toEqual([]);
  });

  test("RH designa só liderança da própria empresa; sem designação, segue o próprio RH", async () => {
    const { store, writes } = ledger();
    const d = deps(store);
    const base = { accessToken: "t-rh", itemId: "rascunho", ownerRoleLabel: "Facilitação", dueOn: "2026-12-01", executionMetric: { label: "Encontros", baseline: 0, target: 1, unit: "encontro" } };
    expect(await setFibtActionAccountability({ ...base, ownerUserId: "u-lider" }, d)).toMatchObject({ ok: true, accepted: true });
    expect(await setFibtActionAccountability(base, d)).toMatchObject({ ok: true, accepted: true });
    for (const ownerUserId of ["u-colab", "u-lider-b", "u-inexistente"]) {
      expect(await setFibtActionAccountability({ ...base, ownerUserId }, d)).toMatchObject({ accepted: false, reason: "owner_not_eligible" });
    }
    // A própria liderança não designa ninguém.
    expect(await setFibtActionAccountability({ ...base, accessToken: "t-lider", ownerUserId: "u-lider" }, d)).toMatchObject({ ok: false, category: "forbidden" });
    expect(writes).toEqual(["owner:rascunho:u-lider", "owner:rascunho:u-rh"]);
    // Lista de designação: só para o RH.
    expect(await loadFibtActionLoop({ accessToken: "t-rh" }, d)).toMatchObject({ assignableLeaders: [{ userId: "u-lider", label: "Liderança Alfa" }] });
    expect(await loadFibtActionLoop({ accessToken: "t-lider" }, d)).not.toHaveProperty("assignableLeaders");
  });

  test("colaborador e liderança de outra empresa não entram; leitura Q2 por setor segue negada à liderança", async () => {
    const { store, writes } = ledger();
    const d = deps(store);
    expect(await loadFibtActionLoop({ accessToken: "t-colab" }, d)).toMatchObject({ ok: false, category: "forbidden" });
    expect(await recordFibtActionStatus({ accessToken: "t-colab", itemId: "propria", toStatus: "em_execucao" }, d)).toMatchObject({ ok: false, category: "forbidden" });
    // Liderança Beta: a organização vem da sessão; a ação da Alfa não existe para ela.
    expect(titles(await loadFibtActionLoop({ accessToken: "t-lider-beta" }, d))).toEqual([]);
    expect(await recordFibtActionStatus({ accessToken: "t-lider-beta", itemId: "propria", toStatus: "em_execucao" }, d)).toMatchObject({ accepted: false, reason: "item_not_found" });
    expect(await loadIvoQ2ReadingForSession({ accessToken: "t-lider" }, d)).toMatchObject({ ok: false, category: "forbidden", memberPath: { href: "/diario" } });
    expect(writes).toEqual([]);
  });
});
