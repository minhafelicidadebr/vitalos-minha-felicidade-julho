import { describe, expect, test } from "bun:test";
import { loadGuideJourney, perspectiveForRole, type GuideContextDeps } from "./guide-context.server";
import { operationalCta, resolveGuideEntry } from "./guide-entry";

const content = async () => ({}) as never;
const base = (role: string, over: Partial<GuideContextDeps> = {}): GuideContextDeps => ({
  authorize: async () => ({ ok: true, userId: "u1", orgId: "o1", role }),
  readModules: async () => [{ module: "Q1", enabled: false }, { module: "Q2", enabled: true }],
  loadFeedback: async () => ({ ok: true }),
  environment: () => "local",
  content,
  ...over,
});
const activePlan = (actions: { id: string; mine: boolean; status?: string }[]) => ({
  ok: true as const,
  viewerScope: "own_actions",
  plans: [{ status: "active", actions: actions.map((a) => ({ id: a.id, title: `Ação ${a.id}`, status: a.status ?? "planejada", dueOn: null, owner: { isCurrentUser: a.mine } })) }],
});

describe("Guia · contexto de 'Meu percurso' no servidor", () => {
  test("liderança com ação própria no plano ativo → tarefa do Q2 e CTA de registro", async () => {
    const r = await loadGuideJourney({ accessToken: "t" }, base("LIDER_EQUIPE", { loadLoop: async () => activePlan([{ id: "a1", mine: true }]) }));
    if (!r.ok) throw new Error("esperado ok");
    expect(r.context.tasks.map((t) => t.id)).toEqual(["a1"]);
    const entry = resolveGuideEntry(r.context);
    expect(entry).toMatchObject({ kind: "task", task: { id: "a1", lens: "Q2" } });
    expect(operationalCta("q2.execucao_lideranca", r.context)?.href).toBe("/ivo-integral/acoes");
  });

  test("colaborador: só a devolutiva; nenhuma capacidade de RH ou liderança, sem chamar o ciclo de ações", async () => {
    let loopCalled = false;
    const r = await loadGuideJourney({ accessToken: "t" }, base("COLABORADOR", { loadLoop: async () => { loopCalled = true; return { ok: false }; } }));
    if (!r.ok) throw new Error("esperado ok");
    expect(loopCalled).toBe(false);
    expect(r.context.perspective).toBe("colaborador");
    expect(r.context.grantedCapabilities).toEqual(["q2.devolutiva_coletiva"]);
    expect(operationalCta("q2.leitura_plano", r.context)).toBeNull();
    expect(operationalCta("q2.execucao_lideranca", r.context)).toBeNull();
    expect(resolveGuideEntry(r.context)).toEqual({ kind: "stage", lens: "Q2" });
  });

  test("SST no Q2: membro com devolutiva, sem tarefa nem ações", async () => {
    const r = await loadGuideJourney({ accessToken: "t" }, base("SST_PROFISSIONAL"));
    if (!r.ok) throw new Error("esperado ok");
    expect(r.context.perspective).toBe("sst");
    expect(r.context.tasks).toEqual([]);
    expect(r.context.grantedCapabilities).toEqual(["q2.devolutiva_coletiva"]);
  });

  test("Q2 desabilitado: nenhuma lente operacional; resolvedor abre o mapa", async () => {
    const r = await loadGuideJourney({ accessToken: "t" }, base("LIDER_EQUIPE", { readModules: async () => [{ module: "Q2", enabled: false }] }));
    if (!r.ok) throw new Error("esperado ok");
    expect(r.context.availableLenses).toEqual([]);
    expect(r.context.unavailable).toBeUndefined();
    expect(resolveGuideEntry(r.context).kind).toBe("map");
  });

  test("falha na leitura dos módulos é diferente de Q2 desabilitado", async () => {
    const r = await loadGuideJourney({ accessToken: "t" }, base("LIDER_EQUIPE", { readModules: async () => null }));
    if (!r.ok) throw new Error("esperado ok");
    expect(r.context.unavailable).toBe("modules");
    expect(r.context.grantedCapabilities).toEqual([]);
  });

  test("falha na leitura de ações preserva só a devolutiva confirmada", async () => {
    const r = await loadGuideJourney({ accessToken: "t" }, base("LIDER_EQUIPE", { loadLoop: async () => { throw new Error("offline"); } }));
    if (!r.ok) throw new Error("esperado ok");
    expect(r.context.unavailable).toBe("q2");
    expect(r.context.tasks).toEqual([]);
    expect(r.context.grantedCapabilities).toEqual(["q2.devolutiva_coletiva"]);
  });

  test("sessão recusada: nada é montado", async () => {
    const r = await loadGuideJourney({}, base("RH_ADMIN", { authorize: async () => ({ ok: false, category: "unauthenticated", error: "Entre." }) }));
    expect(r).toEqual({ ok: false, category: "unauthenticated", error: "Entre." });
  });

  test("papéis: liderança, RH, SST, direção; desconhecido vira colaborador", () => {
    expect(["LIDER_EQUIPE", "RH_ADMIN", "SST_PROFISSIONAL", "DIRETOR", "OUTRO"].map(perspectiveForRole)).toEqual(["lideranca", "rh", "sst", "direcao", "colaborador"]);
  });
});
