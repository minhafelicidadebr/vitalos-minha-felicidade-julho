import { describe, expect, test } from "bun:test";
import { Q3_DEMO_ACTIONS, Q3_DEMO_CRITERIA, Q3_DEMO_HYPOTHESES, Q3_DEMO_ITEMS, Q3_DEMO_LEADER_USER_ID, Q3_DEMO_ORG, Q3_DEMO_TEAMS } from "@/domain/demo/q3-demo-synthetic";
import { buildConvergence, buildOrgSummary, buildTeamRows, ownActions, personaAccess } from "./q3-demo-view";

const actor = (role: string, userId = "u1") => ({ userId, orgId: Q3_DEMO_ORG.id, role });

describe("Q3 demonstração sintética · modelo de visão", () => {
  test("15 itens, 3 por fator", () => {
    expect(Q3_DEMO_ITEMS).toHaveLength(15);
    for (const f of ["P", "E", "R", "M", "A"]) expect(Q3_DEMO_ITEMS.filter((i) => i.factorId === f)).toHaveLength(3);
  });

  test("equipe com menos de 5 respostas fica oculta e sem médias", () => {
    const rows = buildTeamRows(Q3_DEMO_TEAMS);
    const fin = rows.find((r) => r.id === "financeiro")!;
    expect(fin.visible).toBe(false);
    expect("factors" in fin).toBe(false);
    expect(rows.filter((r) => r.visible)).toHaveLength(5);
  });

  test("agregado da organização ignora a equipe oculta e ordena prioridades", () => {
    const s = buildOrgSummary(Q3_DEMO_TEAMS);
    expect(s.responded).toBe(52);
    expect(s.invited).toBe(71);
    const visible = Q3_DEMO_TEAMS.filter((t) => t.responded >= 5);
    const w = visible.reduce((a, t) => a + t.responded, 0);
    expect(s.factors!.M).toBeCloseTo(Math.round((visible.reduce((a, t) => a + t.factors.M * t.responded, 0) / w) * 10) / 10, 10);
    expect(s.priorities).toHaveLength(5);
    expect(s.factors![s.priorities[0]!]).toBeLessThanOrEqual(s.factors![s.priorities[4]!]);
    expect(buildOrgSummary([{ ...Q3_DEMO_TEAMS[5]! }]).factors).toBeNull();
  });

  test("régua do IVO sobre dados sintéticos: convergentes e discriminantes decididos com 5 equipes", () => {
    const res = buildConvergence(Q3_DEMO_TEAMS, Q3_DEMO_HYPOTHESES, Q3_DEMO_CRITERIA);
    expect(res.map((r) => r.result.verdict)).toEqual(["supports", "supports", "supports", "supports", "supports"]);
    expect(res.every((r) => r.result.teams === 5)).toBe(true);
  });

  test("acesso por perfil vem da política de papéis", () => {
    expect(personaAccess(actor("RH_ADMIN"))).toEqual({ rhDashboard: true, collective: true, respond: false, ownActions: false });
    expect(personaAccess(actor("LIDER_EQUIPE"))).toEqual({ rhDashboard: false, collective: true, respond: true, ownActions: true });
    expect(personaAccess(actor("COLABORADOR"))).toEqual({ rhDashboard: false, collective: true, respond: true, ownActions: false });
    expect(personaAccess(actor("SST_PROFISSIONAL"))).toEqual({ rhDashboard: false, collective: false, respond: false, ownActions: false });
  });

  test("liderança vê só as próprias ações", () => {
    const mine = ownActions(actor("LIDER_EQUIPE", Q3_DEMO_LEADER_USER_ID), Q3_DEMO_ACTIONS);
    expect(mine.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(ownActions(actor("COLABORADOR", Q3_DEMO_LEADER_USER_ID), Q3_DEMO_ACTIONS)).toEqual([]);
  });
});
