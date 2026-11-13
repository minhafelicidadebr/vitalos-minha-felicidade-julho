// Processo independente de releitura. Credencial pública e login do usuário;
// nenhum service_role é usado para demonstrar isolamento entre empresas.
import { createClient } from "@supabase/supabase-js";
import { institutionalEnv, institutionalWorkdir } from "./institutional-local";
import { requireInstitutionalLocalTarget } from "../src/lib/env/institutional-local-target";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
const env = await institutionalEnv();
requireInstitutionalLocalTarget(env.SUPABASE_URL, env.INSTITUTIONAL_DB_URL, "supabase_db_vitalos-institutional-first-admin");
const results: Array<{ name: string; pass: boolean }> = [];
for (const [email, slug] of [["alfa@institutional.test", "institutional-alfa"], ["beta@institutional.test", "institutional-beta"]]) {
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: "Synthetic-local-only-2026!" });
  if (error || !data.user) throw new Error("Login local de releitura falhou.");
  const profile = await client.from("profiles").select("org_id,role").eq("id", data.user.id).single();
  const organizations = await client.from("organizations").select("id,slug");
  const pass = !profile.error && profile.data?.role === "RH_ADMIN" && !organizations.error && organizations.data?.length === 1 && organizations.data[0]?.slug === slug && organizations.data[0]?.id === profile.data.org_id;
  results.push({ name: `${slug}: vínculo persistido e inventário isolado`, pass: !!pass });
  console.log(`${pass ? "PASS" : "FAIL"} ${slug}: vínculo persistido e inventário isolado`);
  if (!pass) throw new Error("Releitura ou isolamento divergiu.");
  await client.auth.signOut({ scope: "local" });
}
writeFileSync(join(institutionalWorkdir, "readback.json"), JSON.stringify({ recordedAt: new Date().toISOString(), separateProcess: true, results }, null, 2));
