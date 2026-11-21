// C2 · devolutiva coletiva para membros: projeção fechada, sem dado de pessoa.

import { describe, expect, test } from "bun:test";
import type { MembershipResult } from "@/lib/auth/authorize.server";
import type { FibtActionLedgerStore, FibtLedgerItemRow, FibtLedgerSnapshot } from "./fibt-action-loop.server";
import { loadMemberPlanFeedback, type MemberPlanFeedbackDeps } from "./member-plan-feedback.server";

const ADMIN: Record<string, MembershipResult> = { "t-rh": { ok: true, membership: { userId: "u-rh", orgId: "org-alfa", role: "RH_ADMIN" } } };
const MEMBER: Record<string, MembershipResult> = {
  "t-colab": { ok: true, membership: { userId: "u-colab", orgId: "org-alfa", role: "COLABORADOR" } },
  "t-lider": { ok: true, membership: { userId: "u-lider", orgId: "org-alfa", role: "LIDER_EQUIPE" } },
  "t-embaixador": { ok: true, membership: { userId: "u-emb", orgId: "org-alfa", role: "EMBAIXADOR" } },
  "t-beta": { ok: true, membership: { userId: "u-b", orgId: "org-beta", role: "COLABORADOR" } },
};
const AFTER = "2026-11-20T10:00:00.000Z";
const BEFORE = "2026-11-18T10:00:00.000Z";

function item(id: string, planId: string, createdAt: string): FibtLedgerItemRow {
  return {
    id, planId, orgId: "org-alfa", rank: 1, title: `Título ${id}`, description: "Descrição com Fulana", effort: "medio", status: "em_execucao",
    ownerUserId: "u-lider", ownerRoleLabel: "Liderança de equipe", dueOn: "2026-12-10", metricLabel: "Encontros", metricBaseline: 0, metricTarget: 2, metricUnit: "encontro",
    sourceLensId: "fibt", sourceWaveId: "w", sourceCohortId: "c1", sourceFactorId: "bem_estar", sourceInstrumentVersion: "1.0.0", sourcePublishedAt: "2026-11-15T00:00:00.000Z",
    createdAt,
  };
}

function deps(): MemberPlanFeedbackDeps {
  const snapshot: FibtLedgerSnapshot = {
    plans: [
      { id: "ativo", orgId: "org-alfa", cycleKey: "2026-T4", seasonName: "T4", status: "active", createdAt: BEFORE, activatedAt: BEFORE },
      { id: "rascunho", orgId: "org-alfa", cycleKey: "2027-T1", seasonName: "T1", status: "draft", createdAt: AFTER, activatedAt: null },
    ],
    items: [item("novo", "ativo", AFTER), item("antigo", "ativo", BEFORE), item("rasc", "rascunho", AFTER)],
    evidence: [{ id: "ev", itemId: "novo", orgId: "org-alfa", kind: "texto", scope: "execucao", contentRef: "ata com Fulana", occurredOn: "2026-11-19", createdAt: AFTER }],
    events: [{ id: "e1", itemId: "novo", orgId: "org-alfa", kind: "status_change", toStatus: "em_execucao", note: "nota interna", occurredAt: AFTER }],
    cohortLabels: { c1: "Operações" },
  };
  const store = {
    loadFibtLedger: async (orgId: string) => (orgId === "org-alfa" ? structuredClone(snapshot) : { plans: [], items: [], evidence: [], events: [], cohortLabels: {} }),
  } as unknown as FibtActionLedgerStore;
  return {
    moduleAccess: async (orgId) => (orgId === "org-alfa" ? { ok: true } : { ok: false, reason: "disabled", error: "Módulo não habilitado para esta empresa." }),
    boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
    identity: () => ({ requestedMode: "cloud", state: "cloud", realAuthentication: true, serverEnforced: true, reason: "cloud_ready" }),
    requireAdmin: async (t) => ADMIN[t] ?? (MEMBER[t] ? { ok: false, reason: "not_admin" } : { ok: false, reason: "invalid_session" }),
    resolveMember: async (t) => MEMBER[t] ?? ADMIN[t] ?? { ok: false, reason: "invalid_session" },
    capability: () => ({ enabled: true, source: "local_fixture" }),
    ledger: store,
    // title_visible_at: só "novo" (e o rascunho) foram escritos sob o aviso.
    titleVisibleItemIds: async (orgId) => new Set(orgId === "org-alfa" ? ["novo", "rasc"] : []),
  };
}

describe("C2 · devolutiva coletiva para membros", () => {
  test("todos os membros leem a mesma projeção; sem rascunho", async () => {
    for (const t of ["t-colab", "t-lider", "t-embaixador", "t-rh"]) {
      const r = await loadMemberPlanFeedback({ accessToken: t }, deps());
      expect(r).toMatchObject({ ok: true, plans: [{ cycle: "2026-T4", status: "active" }] });
      if (r.ok) expect(r.plans[0]!.actions).toHaveLength(2);
    }
  });

  test("título só de ação criada depois do aviso; demais campos fechados", async () => {
    const r = await loadMemberPlanFeedback({ accessToken: "t-colab" }, deps());
    if (!r.ok) throw new Error("esperava ok");
    const [novo, antigo] = r.plans[0]!.actions;
    expect(novo).toEqual({ title: "Título novo", sectorLabel: "Operações", factorName: expect.any(String), status: "em_execucao", dueMonth: "2026-12", hasExecutionRecord: true });
    expect(antigo).toMatchObject({ title: null, hasExecutionRecord: false });
  });

  test("sem a coluna title_visible_at (conjunto vazio), nenhum título é exibido", async () => {
    const r = await loadMemberPlanFeedback({ accessToken: "t-colab" }, { ...deps(), titleVisibleItemIds: async () => new Set() });
    if (!r.ok) throw new Error("esperava ok");
    expect(r.plans[0]!.actions.every((a) => a.title === null)).toBe(true);
  });

  test("payload não carrega responsável, descrição, indicador, evidência nem linha do tempo", async () => {
    const serialized = JSON.stringify(await loadMemberPlanFeedback({ accessToken: "t-colab" }, deps()));
    for (const forbidden of ["Fulana", "Liderança de equipe", "u-lider", "Encontros", "nota interna", "owner", "description", "evidence", "timeline", "metric", "rascunho", "Título rasc"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  test("outra empresa sem módulo e sessão inválida não leem nada", async () => {
    expect(await loadMemberPlanFeedback({ accessToken: "t-beta" }, deps())).toMatchObject({ ok: false, category: "module_disabled" });
    expect(await loadMemberPlanFeedback({ accessToken: "t-invalido-qualquer" }, deps())).toMatchObject({ ok: false, category: "unauthenticated" });
    expect(await loadMemberPlanFeedback({}, deps())).toMatchObject({ ok: false });
  });
});
