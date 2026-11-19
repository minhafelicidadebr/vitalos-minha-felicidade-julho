import { expect, test } from "bun:test";
import { requireQ1BrowserProofLocalTarget } from "./q1-browser-proof-local-target";

const api = "http://127.0.0.1:57721";
const db = "postgresql://synthetic:synthetic@127.0.0.1:57722/postgres";
const container = "supabase_db_vitalos-q1-browser-proof";
const binding = "127.0.0.1:57722";
const project = "vitalos-q1-browser-proof";

test("guard Q1 aceita somente a fixture local descartável identificada", () => {
  expect(() =>
    requireQ1BrowserProofLocalTarget(api, db, container, binding, project),
  ).not.toThrow();
});

test("guard Q1 recusa API, DB, container, binding e projeto divergentes", () => {
  expect(() =>
    requireQ1BrowserProofLocalTarget("https://remote.invalid", db, container, binding, project),
  ).toThrow();
  expect(() =>
    requireQ1BrowserProofLocalTarget(
      api,
      db.replace("127.0.0.1", "remote.invalid"),
      container,
      binding,
      project,
    ),
  ).toThrow();
  expect(() =>
    requireQ1BrowserProofLocalTarget(
      api,
      db.replace("57722", "57723"),
      container,
      binding,
      project,
    ),
  ).toThrow();
  expect(() =>
    requireQ1BrowserProofLocalTarget(api, db, "supabase_db_other", binding, project),
  ).toThrow();
  expect(() =>
    requireQ1BrowserProofLocalTarget(api, db, container, "0.0.0.0:57722", project),
  ).toThrow();
  expect(() =>
    requireQ1BrowserProofLocalTarget(api, db, container, binding, "another-project"),
  ).toThrow();
});
