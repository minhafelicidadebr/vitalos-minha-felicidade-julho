#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════
// PROVA DE CONCORRÊNCIA REAL — PUBLICAÇÃO DE cohort_capsules (TASK 10.1 GAP 3)
// ═══════════════════════════════════════════════════════════════════════════
//
// POR QUE ESTE SCRIPT EXISTE: uma suíte SQL roda numa ÚNICA sessão psql, então
// chamadas repetidas ali NÃO provam corrida. O requisito é comportamental:
// duas sessões PostgreSQL INDEPENDENTES atingindo o limiar de publicação ao
// mesmo tempo. Aqui são dois processos `psql` de verdade, disparados em
// paralelo dentro do container descartável do replay.
//
// O que é provado:
//   1. as duas sessões executam aggregate_cohort_responses concorrentemente;
//   2. os dois exit codes e os dois resultados são capturados;
//   3. a serialização acontece (lock consultivo de transação por segmento):
//      as duas sessões devolvem EXATAMENTE o mesmo snapshot;
//   4. existe exatamente UMA linha persistida para o segmento;
//   5. não há publicação duplicada (published_at único);
//   6. nenhuma sessão recebe valor parcial/ao vivo não publicado;
//   7. contagem e item_means correspondem ao MESMO snapshot atômico;
//   8. o índice único permanece como rede de segurança (duplicata recusada).
//
// NUNCA toca staging nem produção: opera apenas no container local de nome
// fixo criado por scripts/db-replay-proof.ts. Não aceita host remoto.

const CONTAINER = "vitalos-fibt-replay";
const DB = "fibt_replay";
const PGUSER = "postgres";
const PGPASSWORD = "replay-local-only";

const ORG = "b0000000-0000-4000-8000-0000000000c1";
const WAVE = "b0000000-0000-4000-8000-0000000000c2";
const COHORT = "b0000000-0000-4000-8000-0000000000c3";
const USER = "b0000000-0000-4000-8000-0000000000c4";

interface Passo {
    rotulo: string;
    ok: boolean;
    detalhe?: string;
}
const passos: Passo[] = [];
let falhou = false;

function registrar(rotulo: string, ok: boolean, detalhe?: string): void {
    passos.push({ rotulo, ok, detalhe });
    if (!ok) falhou = true;
    console.log(`${ok ? "  ok  " : " FAIL "} ${rotulo}${detalhe && !ok ? ` — ${detalhe}` : ""}`);
}

async function psql(sql: string, extraArgs: string[] = []): Promise<{ code: number; out: string; err: string }> {
    const proc = Bun.spawn(
        [
            "docker", "exec", "-i", "-e", `PGPASSWORD=${PGPASSWORD}`, CONTAINER,
            "psql", "-v", "ON_ERROR_STOP=1", "-tAq", "--no-psqlrc",
            "-U", PGUSER, "-d", DB, ...extraArgs, "-f", "-",
        ],
        { stdin: new TextEncoder().encode(sql), stdout: "pipe", stderr: "pipe" },
    );
    const [out, err] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
    ]);
    return { code: await proc.exited, out: out.trim(), err: err.trim() };
}

/** Sessão que espera no lock consultivo do segmento e então tenta publicar. */
function sqlSessaoConcorrente(): string {
    // pg_sleep ANTES da chamada, dentro da MESMA transação, maximiza a
    // sobreposição temporal entre as duas sessões: ambas entram na transação,
    // dormem, e disputam o lock do segmento praticamente ao mesmo tempo.
    return `
BEGIN;
SELECT set_config('request.jwt.claims',
  json_build_object('sub','${USER}','role','authenticated')::TEXT, true);
SELECT pg_sleep(0.35);
SELECT COALESCE(response_count::TEXT,'NULL') || '|' || COALESCE(item_means::TEXT,'NULL')
  FROM public.aggregate_cohort_responses('${WAVE}','${COHORT}');
COMMIT;
`;
}

console.log("\nPROVA DE CONCORRÊNCIA REAL — duas sessões psql independentes\n");

// ── 0. O container do replay tem de estar de pé ─────────────────────────────
const ping = await psql("SELECT 1");
if (ping.code !== 0) {
    console.error(
        `❌ Container '${CONTAINER}' indisponível. Rode primeiro:\n` +
        `   bun run scripts/db-replay-proof.ts --mode=clean --keep\n` +
        (ping.err ? `\n${ping.err}\n` : ""),
    );
    process.exit(1);
}
registrar(`container de replay acessível (${CONTAINER})`, true);

// ── 1. Fixtures: segmento exatamente no limiar de PRIMEIRA publicação ──────
const setup = await psql(`
DELETE FROM public.cohort_capsules WHERE wave_id = '${WAVE}';
DELETE FROM public.wave_responses  WHERE wave_id = '${WAVE}';
DELETE FROM public.wave_cohorts    WHERE wave_id = '${WAVE}';
DELETE FROM public.waves           WHERE id      = '${WAVE}';
DELETE FROM public.profiles        WHERE id      = '${USER}';
DELETE FROM public.organizations   WHERE id      = '${ORG}';

INSERT INTO public.organizations (id, slug, name)
VALUES ('${ORG}', 'org-concorrencia-release', 'Org Concorrencia Release');
INSERT INTO auth.users (id, email)
VALUES ('${USER}', 'concorrencia@exemplo.invalid') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, org_id, role, display_name)
VALUES ('${USER}', '${ORG}', 'RH_ADMIN', 'Admin Concorrencia');
INSERT INTO public.waves (id, org_id, instrument, label, status)
VALUES ('${WAVE}', '${ORG}', 'FIB_T', 'Onda Concorrencia', 'collecting');
INSERT INTO public.wave_cohorts (id, org_id, wave_id, key, label)
VALUES ('${COHORT}', '${ORG}', '${WAVE}', 'conc', 'Conc');
-- Exatamente k_min: a PRIMEIRA publicação está disponível para ambas as
-- sessões, que é o ponto de corrida mais perigoso (INSERT concorrente).
INSERT INTO public.wave_responses (wave_id, cohort_id, answers)
SELECT '${WAVE}', '${COHORT}', '{"1":3}'::JSONB FROM generate_series(1, 5);
SELECT 'setup-ok';
`);
if (setup.code !== 0) {
    registrar("fixtures criadas", false, setup.err.split("\n").slice(0, 4).join(" | "));
    process.exit(1);
}
registrar("fixtures criadas (segmento com n=5, sem snapshot)", true);

// ── 2. Duas sessões INDEPENDENTES, em paralelo, no mesmo limiar ────────────
const [s1, s2] = await Promise.all([
    psql(sqlSessaoConcorrente()),
    psql(sqlSessaoConcorrente()),
]);

registrar(
    `sessão 1 concluiu (exit ${s1.code})`,
    s1.code === 0,
    s1.code === 0 ? undefined : s1.err.split("\n").slice(0, 3).join(" | "),
);
registrar(
    `sessão 2 concluiu (exit ${s2.code})`,
    s2.code === 0,
    s2.code === 0 ? undefined : s2.err.split("\n").slice(0, 3).join(" | "),
);

const r1 = s1.out.split("\n").filter((l) => l.includes("|")).pop() ?? "";
const r2 = s2.out.split("\n").filter((l) => l.includes("|")).pop() ?? "";
console.log(`         sessão 1 -> ${r1}`);
console.log(`         sessão 2 -> ${r2}`);

// ── 3. Serialização: as duas sessões viram o MESMO snapshot ────────────────
registrar(
    "serialização pelo lock consultivo: as duas sessões devolvem o mesmo snapshot",
    r1 !== "" && r1 === r2,
    `s1=${r1} s2=${r2}`,
);

// ── 4/5. Exatamente uma linha, uma única publicação ────────────────────────
const inv = await psql(`
SELECT COUNT(*)::TEXT || '|' || COUNT(DISTINCT published_at)::TEXT || '|'
     || COALESCE(MAX(published_response_count)::TEXT,'NULL')
  FROM public.cohort_capsules WHERE wave_id = '${WAVE}' AND cohort_id = '${COHORT}';
`);
const [linhas, publicacoes, contagem] = (inv.out || "0|0|NULL").split("|");
registrar("exatamente 1 linha persistida para o segmento", linhas === "1", `linhas=${linhas}`);
registrar("nenhuma publicação duplicada (published_at único)", publicacoes === "1", `distintos=${publicacoes}`);

// ── 6/7. Valores publicados, atômicos e não-ao-vivo ────────────────────────
registrar(
    "nenhuma sessão recebeu valor parcial/ao vivo (contagem publicada = 5)",
    contagem === "5" && r1.startsWith("5|") && !r1.includes("NULL"),
    `contagem_persistida=${contagem} retorno=${r1}`,
);

const atomico = await psql(`
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM public.cohort_capsules
   WHERE wave_id = '${WAVE}' AND cohort_id = '${COHORT}'
     AND published_response_count::TEXT || '|' || item_means::TEXT = $$${r1}$$
) THEN 'atomico' ELSE 'divergente' END;
`);
registrar(
    "contagem e item_means retornados vêm do MESMO snapshot atômico",
    atomico.out === "atomico",
    `resultado=${atomico.out}`,
);

// ── 8. Índice único como rede de segurança ─────────────────────────────────
const dup = await psql(`
INSERT INTO public.cohort_capsules
  (org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means, published_at)
SELECT org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means, published_at
  FROM public.cohort_capsules WHERE wave_id = '${WAVE}' AND cohort_id = '${COHORT}';
`);
registrar(
    "índice único recusa a duplicata (rede de segurança da corrida)",
    dup.code !== 0 && /duplicate key|23505/i.test(dup.err),
    dup.code === 0 ? "duplicata foi ACEITA" : dup.err.split("\n")[0],
);

// ── Limpeza das fixtures deste script ──────────────────────────────────────
await psql(`
DELETE FROM public.cohort_capsules WHERE wave_id = '${WAVE}';
DELETE FROM public.wave_responses  WHERE wave_id = '${WAVE}';
DELETE FROM public.wave_cohorts    WHERE wave_id = '${WAVE}';
DELETE FROM public.waves           WHERE id      = '${WAVE}';
DELETE FROM public.profiles        WHERE id      = '${USER}';
DELETE FROM public.organizations   WHERE id      = '${ORG}';
`);

const ok = passos.filter((p) => p.ok).length;
console.log(`\n── RESULTADO ─────────────────────────────────────────────────`);
console.log(`passos=${passos.length} · ok=${ok} · falhas=${passos.length - ok}`);
if (falhou) {
    console.error("\n❌ CONCURRENT_PUBLICATION=FAIL — ver passos FAIL acima.");
    process.exit(1);
}
console.log("\n✅ CONCURRENT_PUBLICATION=PASS — duas sessões reais serializadas, uma única publicação atômica.");
process.exit(0);
