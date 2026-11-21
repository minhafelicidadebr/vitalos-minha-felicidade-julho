// Releitura da prova D10 pelo produto. Não executa setup, migration ou escrita de dados.
// --baseline: captura estado sintético antes da interação; sem flag: verifica depois.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  institutionalContainer,
  institutionalEnv,
  institutionalSql,
  institutionalWorkdir,
} from "./institutional-local";
import { requireInstitutionalLocalTarget } from "../src/lib/env/institutional-local-target";

const TITLE = "Aplicação Q2 aprovada — D10 0.1.0 — ensaio local";
const env = await institutionalEnv(); // Confere API, DB, container e project_id antes de consultas.
requireInstitutionalLocalTarget(env.SUPABASE_URL, env.INSTITUTIONAL_DB_URL, institutionalContainer);
const path = join(institutionalWorkdir, "q2-d10-browser-baseline.json");
if (process.argv.includes("--baseline") && existsSync(path))
  throw new Error("Baseline D10 já existe; preservada. Use a releitura sem --baseline.");
const snapshot = JSON.parse(
  await institutionalSql(`
  SELECT json_build_object(
    'modules', (SELECT json_agg(t ORDER BY t.slug,t.module) FROM (
      SELECT o.slug,m.module,m.enabled,m.revision FROM public.org_module_entitlements m
      JOIN public.organizations o ON o.id=m.org_id
      WHERE o.slug IN ('institutional-alfa','institutional-beta')) t),
    'actions', (SELECT coalesce(json_agg(t ORDER BY t.id),'[]'::json) FROM (
      SELECT a.id,o.slug,md5(row_to_json(a)::text) AS digest FROM public.action_items a
      JOIN public.organizations o ON o.id=a.org_id
      WHERE o.slug IN ('institutional-alfa','institutional-beta')) t),
    'evidence', (SELECT coalesce(json_agg(t ORDER BY t.id),'[]'::json) FROM (
      SELECT e.id,md5(row_to_json(e)::text) AS digest FROM public.evidence_records e
      JOIN public.organizations o ON o.id=e.org_id
      WHERE o.slug IN ('institutional-alfa','institutional-beta')) t)
  );
`),
) as {
  modules: Array<{ slug: string; module: string; enabled: boolean; revision: number }>;
  actions: Array<{ id: string; slug: string; digest: string }>;
  evidence: Array<{ id: string; digest: string }>;
};
if (process.argv.includes("--baseline")) {
  writeFileSync(
    path,
    JSON.stringify({ capturedAt: new Date().toISOString(), ...snapshot }, null, 2),
  );
  console.log(
    JSON.stringify({
      baseline: true,
      actions: snapshot.actions.length,
      evidence: snapshot.evidence.length,
      modules: snapshot.modules,
    }),
  );
  process.exit(0);
}

const before = JSON.parse(readFileSync(path, "utf8")) as typeof snapshot;
const results: Array<{ name: string; pass: boolean }> = [];
function check(name: string, pass: boolean) {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
  if (!pass) throw new Error("Releitura D10 interrompida.");
}
check(
  "habilitação e revisões Alfa/Beta preservadas",
  JSON.stringify(snapshot.modules) === JSON.stringify(before.modules),
);
check(
  "ações e evidências anteriores preservadas",
  before.actions.every((a) =>
    snapshot.actions.some((b) => a.id === b.id && a.digest === b.digest),
  ) &&
    before.evidence.every((a) =>
      snapshot.evidence.some((b) => a.id === b.id && a.digest === b.digest),
    ),
);
check(
  "Beta não recebeu novas ações",
  snapshot.actions.filter((a) => a.slug === "institutional-beta").length ===
    before.actions.filter((a) => a.slug === "institutional-beta").length,
);

let itemId: string | undefined;
for (const slug of ["alfa", "beta"]) {
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: `${slug}@institutional.test`,
    password: "Synthetic-local-only-2026!",
  });
  if (error || !data.session) throw new Error("Login normal da identidade sintética falhou.");
  try {
    if (slug === "alfa") {
      const found = await client
        .from("action_items")
        .select(
          "id,title,description,status,source_lens_id,source_wave_id,source_cohort_id,source_factor_id,source_instrument_version",
        )
        .eq("title", TITLE);
      check(
        "uma aplicação aprovada persistida e visível à Alfa",
        !found.error && found.data?.length === 1,
      );
      const item = found.data![0]!;
      itemId = item.id;
      check(
        "conteúdo e atividade 0.1.0 identificados sem TESTE",
        item.description.includes("[conteudo:Q2-bem_estar-aprendizagem-equipe-001@0.1.0]") &&
          item.description.includes(
            "Atividade 0.1.0. Referência da atividade: Q2-pratica-aprendizagem-equipe-001.",
          ) &&
          !item.description.includes("TESTE-"),
      );
      check(
        "origem nativa publicada preservada",
        item.source_lens_id === "fibt" &&
          item.source_factor_id === "bem_estar" &&
          item.source_wave_id === "a339451f-7642-4ed1-b629-e1ad6f42ec86" &&
          !!item.source_cohort_id &&
          item.source_instrument_version === "1.0.0",
      );
      const evidence = await client
        .from("evidence_records")
        .select("id,evidence_scope,content_ref")
        .eq("item_id", item.id);
      check(
        "execução e aprendizagem persistidas em escopos distintos",
        !evidence.error &&
          evidence.data?.filter((e) => e.evidence_scope === "execucao").length === 1 &&
          evidence.data?.filter((e) => e.evidence_scope === "aprendizagem").length === 1,
      );
      const payload = JSON.stringify({ item, evidence: evidence.data });
      check(
        "ledger sem respostas, gabaritos ou nota pedagógica",
        !/answers|correctOptionId|recallPrompt|quizScore|correctCount/.test(payload),
      );
      check("ação concluída operacionalmente", item.status === "concluida");
    } else {
      const foreign = await client.from("action_items").select("id").eq("id", itemId!);
      const foreignEvidence = await client
        .from("evidence_records")
        .select("id")
        .eq("item_id", itemId!);
      check(
        "Beta não lê a ação nem suas evidências por RLS",
        !foreign.error &&
          foreign.data?.length === 0 &&
          !foreignEvidence.error &&
          foreignEvidence.data?.length === 0,
      );
    }
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}
check(
  "somente uma nova ação no estado local",
  snapshot.actions.length === before.actions.length + 1,
);
check(
  "somente duas novas evidências no estado local",
  snapshot.evidence.length === before.evidence.length + 2,
);
writeFileSync(
  join(institutionalWorkdir, "q2-d10-browser-readback.json"),
  JSON.stringify(
    { capturedAt: new Date().toISOString(), independentProcess: true, itemId, results },
    null,
    2,
  ),
);
