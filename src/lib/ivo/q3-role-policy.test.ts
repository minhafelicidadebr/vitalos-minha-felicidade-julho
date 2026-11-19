import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { decideQ3Operation, type Q3Operation } from "./q3-role-policy";

const org = "org-alfa";
const ops: Q3Operation[] = ["apply", "read_aggregate", "run_feedback", "own_actions", "collective_feedback"];
const allowedOps = (role: string, owner: string | null = null) =>
  ops.filter((op) => decideQ3Operation({ userId: "u1", orgId: org, role }, op, { orgId: org, actionOwnerUserId: owner }).allowed);

describe("política de papéis Q3 (Q3-07, não ligada)", () => {
  test("RH aplica, lê agregado e conduz devolutiva", () => {
    expect(allowedOps("RH_ADMIN")).toEqual(["apply", "read_aggregate", "run_feedback", "collective_feedback"]);
  });
  test("liderança: só ações próprias e devolutiva coletiva", () => {
    expect(allowedOps("LIDER_EQUIPE", "u1")).toEqual(["own_actions", "collective_feedback"]);
    expect(decideQ3Operation({ userId: "u1", orgId: org, role: "LIDER_EQUIPE" }, "own_actions", { orgId: org, actionOwnerUserId: "u2" })).toEqual({ allowed: false, reason: "not_action_owner" });
    expect(decideQ3Operation({ userId: "u1", orgId: org, role: "LIDER_EQUIPE" }, "own_actions", { orgId: org })).toEqual({ allowed: false, reason: "not_action_owner" });
  });
  test("colaborador: só devolutiva coletiva; SST e papel desconhecido recusados", () => {
    expect(allowedOps("COLABORADOR", "u1")).toEqual(["collective_feedback"]);
    expect(allowedOps("SST_PROFISSIONAL")).toEqual([]);
    expect(allowedOps("QUALQUER")).toEqual([]);
  });
  test("outra organização e leitura individual: sempre recusadas", () => {
    for (const role of ["RH_ADMIN", "LIDER_EQUIPE", "COLABORADOR"]) {
      expect(decideQ3Operation({ userId: "u1", orgId: org, role }, "collective_feedback", { orgId: "org-beta" })).toEqual({ allowed: false, reason: "other_org" });
      expect(decideQ3Operation({ userId: "u1", orgId: org, role }, "read_individual", { orgId: org })).toEqual({ allowed: false, reason: "individual_never" });
    }
  });
  test("nenhum código de produção importa a política antes da F5", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.startsWith("q3-role-policy") && readFileSync(path, "utf8").includes("q3-role-policy")) hits.push(path);
      }
    };
    walk(join(import.meta.dir, "..", ".."));
    expect(hits).toEqual([]);
  });
});
