import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { decideLeaderOperation, leaderVisibleActions, type LeaderActor, type LeaderOperation } from "./leader-scope-policy";

const lider: LeaderActor = { userId: "u-lider", orgId: "org-alfa", role: "LIDER_EQUIPE" };
const propria = { ownerUserId: "u-lider" };
const alheia = { ownerUserId: "u-outro" };

describe("política de escopo da liderança (proposta, não ligada)", () => {
  test("lê e registra execução só na própria ação do plano ativo", () => {
    for (const op of ["view_action", "record_status", "record_execution_evidence"] as const) {
      expect(decideLeaderOperation(lider, op, { orgId: "org-alfa", planStatus: "active", action: propria })).toEqual({ allowed: true });
      expect(decideLeaderOperation(lider, op, { orgId: "org-alfa", planStatus: "active", action: alheia })).toEqual({ allowed: false, reason: "not_action_owner" });
    }
  });

  test("ação sem responsável não é de ninguém da liderança", () => {
    expect(decideLeaderOperation(lider, "view_action", { orgId: "org-alfa", planStatus: "active", action: { ownerUserId: null } }))
      .toEqual({ allowed: false, reason: "not_action_owner" });
  });

  test("plano encerrado: leitura da própria ação, sem escrita; rascunho: nada", () => {
    expect(decideLeaderOperation(lider, "view_action", { orgId: "org-alfa", planStatus: "closed", action: propria }).allowed).toBe(true);
    expect(decideLeaderOperation(lider, "record_status", { orgId: "org-alfa", planStatus: "closed", action: propria })).toEqual({ allowed: false, reason: "plan_not_active" });
    expect(decideLeaderOperation(lider, "view_action", { orgId: "org-alfa", planStatus: "draft", action: propria })).toEqual({ allowed: false, reason: "plan_not_active" });
    expect(decideLeaderOperation(lider, "view_plan_summary", { orgId: "org-alfa", planStatus: "draft" })).toEqual({ allowed: false, reason: "plan_not_active" });
  });

  test("autoridade de plano e leitura por setor seguem exclusivas do RH", () => {
    const reservadas: LeaderOperation[] = ["create_actions", "set_accountability", "activate_plan", "add_action", "close_plan", "view_sector_reading"];
    for (const op of reservadas) {
      expect(decideLeaderOperation(lider, op, { orgId: "org-alfa", planStatus: "active", action: propria })).toEqual({ allowed: false, reason: "authority_reserved_to_admin" });
    }
  });

  test("outra empresa e outros papéis são negados antes de qualquer outra regra", () => {
    expect(decideLeaderOperation(lider, "view_action", { orgId: "org-beta", planStatus: "active", action: propria })).toEqual({ allowed: false, reason: "other_org" });
    for (const role of ["COLABORADOR", "RH_ADMIN", "lider_equipe", ""]) {
      expect(decideLeaderOperation({ ...lider, role }, "view_action", { orgId: "org-alfa", planStatus: "active", action: propria })).toEqual({ allowed: false, reason: "not_leader" });
    }
  });

  test("filtro de visibilidade devolve só as próprias ações", () => {
    const itens = [{ id: "a", ...propria }, { id: "b", ...alheia }, { id: "c", ownerUserId: null }];
    expect(leaderVisibleActions(lider, "org-alfa", "active", itens).map((i) => i.id)).toEqual(["a"]);
    expect(leaderVisibleActions(lider, "org-beta", "active", itens)).toEqual([]);
  });

  test("permanece desligada: nenhum módulo de produção a importa", () => {
    const root = join(import.meta.dir, "..", "..");
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.startsWith("leader-scope-policy")) {
          if (readFileSync(path, "utf8").includes("leader-scope-policy")) hits.push(path);
        }
      }
    };
    walk(root);
    expect(hits).toEqual([]);
  });
});
