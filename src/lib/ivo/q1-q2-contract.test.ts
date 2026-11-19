// B3 · contrato compartilhado Q1/Q2 (empresa, papel, módulo, ciclo) sem misturar lentes.
// Prova só o que as duas jornadas dividem: a sessão IVO, a habilitação por módulo e o
// isolamento de organização. Nenhum cálculo, mapeamento ou índice composto aqui.

import { describe, expect, test } from "bun:test";
import type { MembershipResult } from "@/lib/auth/authorize.server";
import { checkModule, moduleForInstrument } from "@/lib/identity/module-access.server";
import type { ModuleState } from "@/lib/identity/module-contract";
import { authorizeIvoSession, type IvoSessionDeps } from "./ivo-q2-reading.server";

const SESSIONS: Record<string, MembershipResult> = {
  "t-rh-alfa": { ok: true, membership: { userId: "u-rh", orgId: "org-alfa", role: "RH_ADMIN" } },
  "t-rh-beta": { ok: true, membership: { userId: "u-rh-b", orgId: "org-beta", role: "RH_ADMIN" } },
};
const MEMBERS: Record<string, MembershipResult> = {
  "t-lider": { ok: true, membership: { userId: "u-lider", orgId: "org-alfa", role: "LIDER_EQUIPE" } },
  "t-colab": { ok: true, membership: { userId: "u-colab", orgId: "org-alfa", role: "COLABORADOR" } },
  // Revisor técnico do Q1 (migration 20261119103000): papel real em profiles.
  "t-sst": { ok: true, membership: { userId: "u-sst", orgId: "org-alfa", role: "SST_PROFISSIONAL" } },
};

function deps(spy: { memberReads: number } = { memberReads: 0 }): IvoSessionDeps {
  return {
    boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
    identity: () => ({ requestedMode: "cloud", state: "cloud", realAuthentication: true, serverEnforced: true, reason: "cloud_ready" }),
    requireAdmin: async (t) => SESSIONS[t] ?? (MEMBERS[t] ? { ok: false, reason: "not_admin" } : { ok: false, reason: "invalid_session" }),
    resolveMember: async (t) => {
      spy.memberReads++;
      return MEMBERS[t] ?? SESSIONS[t] ?? { ok: false, reason: "invalid_session" };
    },
  };
}

describe("B3 · sessão IVO compartilhada: o padrão continua só-administrador", () => {
  test("sem opção, liderança e colaborador são recusados e o vínculo de membro nem é consultado", async () => {
    // É o caminho da preparação Q1 (authorizeIvoSession sem opções): o acesso empresarial ao Q1
    // não é ampliado pelas aberturas do Q2.
    const spy = { memberReads: 0 };
    for (const t of ["t-lider", "t-colab"]) {
      expect(await authorizeIvoSession(t, deps(spy))).toMatchObject({ ok: false, category: "forbidden" });
    }
    expect(spy.memberReads).toBe(0);
  });

  test("a abertura do Q2 é opt-in e separada: liderança só com allowLeader, colaborador só com allowMember", async () => {
    expect(await authorizeIvoSession("t-lider", deps(), { allowLeader: true })).toMatchObject({ ok: true, role: "LIDER_EQUIPE", orgId: "org-alfa" });
    expect(await authorizeIvoSession("t-colab", deps(), { allowLeader: true })).toMatchObject({ ok: false, category: "forbidden" });
    expect(await authorizeIvoSession("t-colab", deps(), { allowMember: true })).toMatchObject({ ok: true, role: "COLABORADOR" });
  });

  test("SST (revisor Q1) não entra no ledger Q2: recusado sem opção e com allowLeader; só a devolutiva coletiva de membro", async () => {
    expect(await authorizeIvoSession("t-sst", deps())).toMatchObject({ ok: false, category: "forbidden" });
    // allowLeader é a opção dos caminhos de leitura do ciclo, estado e execução.
    expect(await authorizeIvoSession("t-sst", deps(), { allowLeader: true })).toMatchObject({ ok: false, category: "forbidden" });
    // allowMember é só a projeção coletiva fechada (C2, D3 "todos os membros").
    expect(await authorizeIvoSession("t-sst", deps(), { allowMember: true })).toMatchObject({ ok: true, role: "SST_PROFISSIONAL" });
  });

  test("a organização vem sempre da sessão; administradores de empresas diferentes não se misturam", async () => {
    expect(await authorizeIvoSession("t-rh-alfa", deps())).toMatchObject({ ok: true, orgId: "org-alfa" });
    expect(await authorizeIvoSession("t-rh-beta", deps())).toMatchObject({ ok: true, orgId: "org-beta" });
  });
});

describe("B3 · habilitação por módulo: Q1 e Q2 independentes, pendência do Q1 não bloqueia o Q2", () => {
  const read = (q1: boolean, q2: boolean) => async (): Promise<ModuleState[]> => [
    { module: "Q1", enabled: q1, revision: 1 },
    { module: "Q2", enabled: q2, revision: 1 },
  ];

  test("cada instrumento responde só ao seu módulo; as demais lentes não dependem de Q1/Q2", () => {
    expect(moduleForInstrument("COPSOQ")).toBe("Q1");
    expect(moduleForInstrument("FIB_T")).toBe("Q2");
    expect(moduleForInstrument("PERMA")).toBeNull();
    expect(moduleForInstrument("VIA_T")).toBeNull();
  });

  test("Q1 habilitado fica em method_pending e o Q2 habilitado segue ok; Q2 desligado não é liberado pelo Q1", async () => {
    const q1OnQ2On = read(true, true);
    expect(await checkModule("alfa", "Q1", q1OnQ2On)).toMatchObject({ ok: false, reason: "method_pending" });
    expect(await checkModule("alfa", "Q2", q1OnQ2On)).toEqual({ ok: true });
    const q1OnQ2Off = read(true, false);
    expect(await checkModule("beta", "Q1", q1OnQ2Off)).toMatchObject({ ok: false, reason: "method_pending" });
    expect(await checkModule("beta", "Q2", q1OnQ2Off)).toMatchObject({ ok: false, reason: "disabled" });
  });

  test("falha ao ler habilitação nega os dois módulos (não abre nada por exceção)", async () => {
    const broken = async (): Promise<ModuleState[]> => {
      throw new Error("falha");
    };
    expect(await checkModule("alfa", "Q2", broken)).toMatchObject({ ok: false, reason: "unavailable" });
    expect(await checkModule("alfa", "Q1", broken)).toMatchObject({ ok: false, reason: "unavailable" });
  });
});
