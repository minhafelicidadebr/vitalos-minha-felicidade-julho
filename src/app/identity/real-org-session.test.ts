import { describe, expect, test } from "bun:test";
import { institutionalEntry, observeOrgSession, resolveOrgSession, ORG_ANONYMOUS, type OrgSessionReader, type OrgSessionState } from "./real-org-session";

function reader(overrides: Partial<OrgSessionReader> = {}): OrgSessionReader {
  return {
    userId: async () => "user-alfa",
    profile: async () => ({ data: { org_id: "alfa", role: "RH_ADMIN", display_name: null }, error: null }),
    organization: async () => ({ data: { name: "Empresa Alfa", plan: "pilot", pack_id: "enterprise" }, error: null }),
    ...overrides,
  };
}
describe("entrada institucional", () => {
  test("sessão ausente não consulta perfil e preserva entrada de demonstração", async () => {
    const state = await resolveOrgSession(reader({ userId: async () => null, profile: async () => { throw new Error("não consultar"); } }));
    expect(state).toEqual(ORG_ANONYMOUS);
    expect(institutionalEntry(state.status, "/ivo-integral")).toBe("demo");
  });
  test("perfil ausente ou sem organização produz aviso institucional", async () => {
    for (const profile of [null, { org_id: null, role: "MEMBER", display_name: null }]) {
      const state = await resolveOrgSession(reader({ profile: async () => ({ data: profile, error: null }) }));
      expect(state.status).toBe("unlinked");
      expect(institutionalEntry(state.status, "/ivo-integral")).toBe("notice");
    }
  });
  test("erros e organização inacessível nunca viram demo nem ausência de vínculo", async () => {
    for (const r of [
      reader({ userId: async () => { throw new Error("privado"); } }),
      reader({ profile: async () => ({ data: null, error: { message: "privado" } }) }),
      reader({ organization: async () => ({ data: null, error: null }) }),
      reader({ organization: async () => ({ data: null, error: { message: "privado" } }) }),
    ]) {
      const state = await resolveOrgSession(r);
      expect(state).toEqual({ loading: false, status: "unavailable", org: null });
      expect(institutionalEntry(state.status, "/plataforma")).toBe("notice");
    }
  });
  test("identidade e organização são as consultadas; nenhum papel é elevado", async () => {
    const ids: string[] = [];
    const state = await resolveOrgSession(reader({
      profile: async (id) => { ids.push(id); return { data: { org_id: "beta", role: "MEMBER", display_name: null }, error: null }; },
      organization: async (id) => { ids.push(id); return { data: { name: "Empresa Beta", plan: "pilot", pack_id: "enterprise" }, error: null }; },
    }));
    expect(ids).toEqual(["user-alfa", "beta"]);
    expect(state.org?.role).toBe("MEMBER");
    expect(state.org?.orgId).toBe("beta");
    expect(institutionalEntry(state.status, "/ivo-integral/q2")).toBe("app");
  });
  test("primeiro administrador pode alcançar entrada de plataforma e aceite sem vínculo", () => {
    for (const path of ["/plataforma", "/ativar/token", "/aceitar-convite/token"]) expect(institutionalEntry("unlinked", path)).toBe("app");
    for (const path of ["/plataforma-falsa", "/admin", "/ivo-integral/acoes"]) expect(institutionalEntry("unlinked", path)).toBe("notice");
  });
  test("logout durante consulta descarta resultado anterior e limpa organização", async () => {
    let finish!: (state: OrgSessionState) => void;
    let calls = 0;
    const states: OrgSessionState[] = [];
    const observer = observeOrgSession(() => ++calls === 1 ? new Promise((r) => { finish = r; }) : Promise.resolve(ORG_ANONYMOUS), (s) => states.push(s));
    const first = observer.refresh();
    await Promise.resolve();
    await observer.refresh();
    finish(await resolveOrgSession(reader()));
    await first;
    expect(states.at(-1)).toEqual(ORG_ANONYMOUS);
    expect(states.some((s) => s.status === "ready")).toBe(false);
  });
  test("desmontagem invalida consulta pendente; retry pode recuperar falha", async () => {
    const states: OrgSessionState[] = [];
    let fail = true;
    const observer = observeOrgSession(() => resolveOrgSession(reader({ userId: async () => { if (fail) throw new Error(); return "user-alfa"; } })), (s) => states.push(s));
    await observer.refresh();
    expect(states.at(-1)?.status).toBe("unavailable");
    fail = false;
    await observer.refresh();
    expect(states.at(-1)?.status).toBe("ready");
    const pending = observer.refresh();
    observer.dispose();
    const size = states.length;
    await pending;
    expect(states).toHaveLength(size);
  });
});
