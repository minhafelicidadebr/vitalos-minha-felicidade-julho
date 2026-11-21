import { expect, test } from "bun:test";
import { requireInstitutionalLocalTarget } from "./institutional-local-target";
const api = "http://127.0.0.1:57621";
const db = "postgresql://synthetic:synthetic@127.0.0.1:57622/postgres";
const container = "supabase_db_vitalos-institutional-first-admin";
test("guard local recusa host remoto, portas, banco, container e URL ambígua", () => {
  expect(() => requireInstitutionalLocalTarget(api, db, container)).not.toThrow();
  for (const bad of [undefined, "https://remote.invalid", "http://127.0.0.1:55421", "http://127.0.0.1:57621@remote.invalid"]) expect(() => requireInstitutionalLocalTarget(bad, db, container)).toThrow();
  for (const bad of [undefined, db.replace("127.0.0.1", "remote.invalid"), db.replace("57622", "55422"), db.replace("/postgres", "/other"), db.replace("postgresql:", "https:")]) expect(() => requireInstitutionalLocalTarget(api, bad, container)).toThrow();
  expect(() => requireInstitutionalLocalTarget(api, db, "supabase_db_vitalos-ivo-local")).toThrow();
});
