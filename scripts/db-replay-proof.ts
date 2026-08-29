#!/usr/bin/env bun
// ═══════════════════════════════════════════════════════════════════════════
// REPLAY EXECUTÁVEL DA CADEIA DE MIGRATIONS + PROVA DE AUTORIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
//
// POR QUE ESTE SCRIPT EXISTE: até aqui, a garantia de que um REVOKE realmente
// fecha um caminho de escrita era leitura de SQL. O histórico deste
// repositório mostra o limite disso — 20260703130000 revogou UPDATE por
// coluna, ninguém percebeu que o GRANT de tabela pré-existente neutralizava a
// revogação, e o buraco sobreviveu à revisão humana até aparecer no banco
// vivo. Privilégio no Postgres é resultado da INTERAÇÃO de várias entradas de
// ACL, RLS e trigger; só o banco sabe o resultado. Então o banco é quem
// responde.
//
// O QUE FAZ: sobe um Postgres descartável em Docker, aplica o shim de
// plataforma, aplica a cadeia de migrations em ordem e executa as suítes de
// prova de supabase/tests/. Cada suíte é SQL que tenta o ataque de verdade,
// como `authenticated`, com JWT de sessão — e falha a execução se o ataque
// funcionar.
//
// NUNCA toca staging nem produção: o alvo é sempre um container local novo,
// endereçado por nome fixo, sem credencial de projeto nenhuma. Não existe
// caminho neste arquivo que aceite um host remoto.
//
// MODOS
//   --mode=clean    Banco limpo → cadeia COMPLETA → provas.
//                   Prova que um clone do repo reproduz o schema esperado.
//   --mode=preprod  Banco limpo → cadeia até o estado PRÉ-PRODUÇÃO observado
//                   → drift de ACL observado em produção → pacote G1 → provas.
//                   Prova que o pacote G1 funciona no estado REAL do alvo, não
//                   apenas no estado do desenvolvedor.
//
// USO
//   bun run db:replay              (clean)
//   bun run db:replay:preprod      (preprod)
//   bun run db:replay -- --keep    (mantém o container para inspeção)
//   bun run db:replay -- --inventory
//
// SAÍDA: relatório determinístico + exit code 0/1.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const raiz = process.cwd();

// ── Fronteira do pacote G1 ───────────────────────────────────────────────────
//
// Migrations com nome ESTRITAMENTE MENOR que este marco compõem o estado que a
// evidência read-only CONFIRMOU aplicado em produção: contrato de
// submit_sector_response com 2 argumentos (text, jsonb), sem colunas de
// consentimento. Da fronteira para frente está o pacote que o Gate G1 autoriza.
//
// A fronteira fica em 20260806210000, e não depois, porque o CONTRACT dessa
// timestamp comprovadamente nunca rodou (ver NAO_EXECUTAVEIS abaixo): remover
// wave_responses.invite_token é trabalho PENDENTE, não baseline.
//
// Esta constante é a fonte única da fronteira: o runbook G1, o modo preprod e
// o teste de custódia leem daqui.
const G1_BOUNDARY = "20260806210000";

/**
 * LINHAGEM: este repositório contém DUAS linhagens mutuamente exclusivas.
 *
 * `20260730160000_drop_response_invite_link_contract.sql` é a Migration B de
 * STAGING. As preconditions dela codificam o inventário do piloto sintético de
 * lá: exatamente 16 respostas com invite_token, dentro de duas organizações de
 * UUID fixo. Ela DROPA wave_responses.invite_token.
 *
 * `20260806210000_drop_response_invite_link_contract_production.sql` é a gêmea
 * de PRODUÇÃO. Ela EXIGE que invite_token ainda exista, e codifica o inventário
 * produtivo (3 ondas legadas seladas de UUID fixo, 30 convites, 0 respostas).
 *
 * As duas não podem rodar no mesmo banco, em nenhuma ordem: a primeira remove a
 * coluna que a segunda exige. Isso NÃO é defeito — é fail-closed funcionando,
 * cada migration recusando um banco para o qual a autorização humana não foi
 * dada. A consequência é que "replay lexicográfico da cadeia inteira" não é uma
 * afirmação possível, e um relatório que a declarasse verde estaria mentindo.
 *
 * O replay reproduz a LINHAGEM DE PRODUÇÃO, que é a relevante para o Gate G1.
 * A linhagem de staging fica declarada e fora do replay, não omitida.
 */
const STAGING_ONLY_MIGRATIONS = new Set([
    "20260730160000_drop_response_invite_link_contract.sql",
]);

/**
 * NÃO EXECUTÁVEL — achado desta onda, confirmado empiricamente.
 *
 * `20260806210000_drop_response_invite_link_contract_production.sql` aborta
 * SEMPRE, em qualquer banco PostgreSQL, na precondition 1.6. A consulta que
 * procura funções dependentes de wave_responses.invite_token faz
 *
 *     SELECT ... FROM pg_proc p JOIN pg_namespace n ...
 *      WHERE n.nspname = 'public' AND pg_get_functiondef(p.oid) ~* '...'
 *
 * e o planejador empurra o qual de `pg_get_functiondef` para o scan de pg_proc,
 * ANTES do join que filtraria o schema. `pg_get_functiondef` recusa agregados,
 * então a primeira agregada do pg_catalog encontrada aborta a transação com
 * `"array_agg" is an aggregate function`.
 *
 * Não é dependência de plano nem de dado: reproduzido em Postgres 17 VAZIO, sem
 * nenhum objeto do projeto. Ou seja, esta migration nunca rodou com sucesso em
 * lugar nenhum — o CONTRACT produtivo continua PENDENTE, e a presença de
 * wave_responses.invite_token em produção passa a ser questão de PREFLIGHT, não
 * um fato encerrado.
 *
 * O pacote G1 desta onda contém a substituta corrigida e idempotente. Aqui a
 * migration é excluída do replay de forma declarada — não silenciosa.
 */
/**
 * Migrations desta onda, escritas para serem reaplicáveis sem efeito colateral.
 * O critério é operacional, não estético: se a janela de mudança do G1 for
 * interrompida no meio, o operador precisa poder rodar o pacote de novo sem
 * primeiro descobrir, sob pressão, exatamente onde parou.
 */
const IDEMPOTENTES = new Set([
    // Desta onda.
    "20260806211000_response_invite_link_contract_forward_fix.sql",
    "20260828120000_profile_authority_boundary_hardening.sql",
    "20260828121000_definer_surface_and_execute_grants.sql",
    // Pré-existentes, verificadas como reaplicáveis pelo próprio replay:
    // CREATE OR REPLACE da função, CREATE UNIQUE INDEX IF NOT EXISTS e
    // ADD CONSTRAINT guardado por pg_constraint. Reaplicar passa e não muda
    // nada — a primeira versão desta lista as classificava como one-shot, e o
    // replay corrigiu a suposição.
    "20260811120000_fail_closed_sector_response_cohort_binding.sql",
    "20260812120000_one_active_sector_link_per_cohort.sql",
]);

const NAO_EXECUTAVEIS = new Map([
    [
        "20260806210000_drop_response_invite_link_contract_production.sql",
        "aborta sempre na precondition 1.6 (pg_get_functiondef sobre agregados); substituída no pacote G1",
    ],
]);

const CONTAINER = "vitalos-fibt-replay";
const IMAGE = "postgres:17-alpine";
const DB = "fibt_replay";
const PGUSER = "postgres";
const PGPASSWORD = "replay-local-only";

const args = process.argv.slice(2);
const modo = (args.find((a) => a.startsWith("--mode="))?.slice(7) ?? "clean") as
    | "clean"
    | "preprod";
const manter = args.includes("--keep");
const inventario = args.includes("--inventory");

if (modo !== "clean" && modo !== "preprod") {
    console.error(`Modo inválido: ${modo}. Use --mode=clean ou --mode=preprod.`);
    process.exit(1);
}

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

async function docker(
    argv: string[],
    stdin?: string,
): Promise<{ code: number; out: string; err: string }> {
    const proc = Bun.spawn(["docker", ...argv], {
        stdin: stdin === undefined ? "ignore" : new TextEncoder().encode(stdin),
        stdout: "pipe",
        stderr: "pipe",
    });
    const [out, err] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
    ]);
    const code = await proc.exited;
    return { code, out, err };
}

/**
 * Executa SQL no container. ON_ERROR_STOP=1: qualquer erro aborta e falha.
 *
 * FIDELIDADE DE TRANSAÇÃO — não é detalhe. As migrations deste projeto foram
 * aplicadas pelo SQL Editor do painel, que envolve o script INTEIRO em UMA
 * transação. Várias delas dependem disso: capturam estado no preflight com
 * `set_config(..., is_local => true)` e comparam no postflight. Em autocommit,
 * cada statement é sua própria transação e o valor LOCAL é descartado antes do
 * postflight ler — a migration então acusa uma mudança que nunca houve.
 *
 * Foi exatamente o que aconteceu na primeira tentativa deste replay: o postflight
 * de 20260806205000 reportou "a ACL da funcao mudou" quando nada havia mudado.
 * O defeito era do harness, não da migration. Rodar em transação única elimina a
 * classe inteira desse falso positivo — e um falso positivo aqui é pior que
 * ruído: ensina a ignorar o gate.
 *
 * Arquivos que já gerenciam a própria transação (BEGIN/COMMIT explícitos) rodam
 * como estão, para não aninhar e mudar o significado do COMMIT interno.
 */
async function psql(sql: string): Promise<{ code: number; out: string; err: string }> {
    const gerenciaPropriaTransacao = /^\s*BEGIN\s*;/im.test(sql);
    return docker(
        [
            "exec",
            "-i",
            "-e",
            `PGPASSWORD=${PGPASSWORD}`,
            CONTAINER,
            "psql",
            "-v",
            "ON_ERROR_STOP=1",
            ...(gerenciaPropriaTransacao ? [] : ["--single-transaction"]),
            "--quiet",
            "--no-psqlrc",
            "-U",
            PGUSER,
            "-d",
            DB,
            "-f",
            "-",
        ],
        sql,
    );
}

/** Consulta de uma linha/uma coluna, sem alinhamento — para asserções. */
async function scalar(sql: string): Promise<string> {
    const r = await docker(
        [
            "exec",
            "-i",
            "-e",
            `PGPASSWORD=${PGPASSWORD}`,
            CONTAINER,
            "psql",
            "-v",
            "ON_ERROR_STOP=1",
            "-tAq",
            "--no-psqlrc",
            "-U",
            PGUSER,
            "-d",
            DB,
            "-f",
            "-",
        ],
        sql,
    );
    if (r.code !== 0) throw new Error(r.err.trim());
    return r.out.trim();
}

async function subirContainer(): Promise<void> {
    await docker(["rm", "-f", CONTAINER]);

    const up = await docker([
        "run",
        "-d",
        "--name",
        CONTAINER,
        "-e",
        `POSTGRES_PASSWORD=${PGPASSWORD}`,
        "-e",
        `POSTGRES_DB=${DB}`,
        "--tmpfs",
        "/var/lib/postgresql/data",
        IMAGE,
    ]);
    if (up.code !== 0) {
        registrar("container de replay iniciado", false, up.err.trim() || up.out.trim());
        throw new Error("docker run falhou");
    }

    // Espera de prontidão — NÃO usar pg_isready aqui.
    //
    // A imagem oficial do postgres sobe um servidor TEMPORÁRIO durante o initdb
    // (para criar o banco e rodar scripts de inicialização) e depois o derruba
    // para subir o definitivo. pg_isready responde OK nessa fase intermediária,
    // e o replay então tentava aplicar o shim exatamente na janela em que o
    // socket desaparece — falha intermitente, do tipo que faz alguém "rodar de
    // novo" em vez de confiar no gate.
    //
    // O critério aqui é uma consulta real bem-sucedida DUAS vezes seguidas, com
    // intervalo: o servidor temporário não sobrevive a isso.
    let seguidas = 0;
    for (let i = 0; i < 120; i += 1) {
        const r = await docker([
            "exec",
            "-e",
            `PGPASSWORD=${PGPASSWORD}`,
            CONTAINER,
            "psql",
            "-tAq",
            "-U",
            PGUSER,
            "-d",
            DB,
            "-c",
            "SELECT 1",
        ]);
        seguidas = r.code === 0 && r.out.trim() === "1" ? seguidas + 1 : 0;
        if (seguidas >= 2) {
            registrar("container de replay iniciado", true);
            return;
        }
        await Bun.sleep(500);
    }
    registrar("container de replay iniciado", false, "postgres não aceitou consulta em 60s");
    throw new Error("timeout aguardando postgres");
}

/** Todos os arquivos, em ordem lexicográfica = a ordem que o Supabase CLI usaria. */
function migrationsOrdenadas(): string[] {
    const dir = join(raiz, "supabase", "migrations");
    return [...new Glob("*.sql").scanSync({ cwd: dir })].sort();
}

/**
 * A linhagem de produção replayável: tudo, menos as exclusivas de staging e as
 * comprovadamente não executáveis. As duas exclusões são declaradas e
 * reportadas na saída — a ideia é que ninguém leia "replay verde" sem ver
 * exatamente o que ficou fora e por quê.
 */
function linhagemDeProducao(): string[] {
    return migrationsOrdenadas().filter(
        (n) => !STAGING_ONLY_MIGRATIONS.has(n) && !NAO_EXECUTAVEIS.has(n),
    );
}

function lerSql(...partes: string[]): string {
    return readFileSync(join(raiz, ...partes), "utf8");
}

async function aplicarArquivo(rotulo: string, ...partes: string[]): Promise<boolean> {
    const r = await psql(lerSql(...partes));
    const ok = r.code === 0;
    registrar(rotulo, ok, ok ? undefined : r.err.trim().split("\n").slice(0, 6).join(" | "));
    return ok;
}

/**
 * Compensação de linhagem duplicada — ver supabase/local/lineage/README.md.
 *
 * Duas migrations deste repositório (as de nome UUID de 2026-07-03 20:36/20:37)
 * são eco gerado pelo Lovable das migrations escritas à mão e retrodatadas no
 * mesmo dia. O conteúdo se sobrepõe e, em ordem lexicográfica, a segunda
 * tentativa de criar o MESMO objeto aborta a cadeia. Em produção isso nunca
 * apareceu porque a aplicação foi pelo SQL Editor, statement a statement.
 *
 * Os arquivos históricos NÃO são editados: seus hashes estão fixados no
 * manifesto verificável e citados em documento de prova anterior
 * (docs/fibt-prod-proof/PROD06_NONPROD_PROOF_PLAN.md). Reescrevê-los
 * invalidaria a cadeia de custódia para resolver um problema que é só de replay.
 *
 * A compensação roda IMEDIATAMENTE ANTES da migration duplicada, apenas no
 * replay local, e é sempre um DROP ... IF EXISTS do objeto que a duplicata vai
 * recriar de forma idêntica. Não mascara erro: se o objeto não existisse, o
 * DROP é no-op e a criação segue; qualquer erro NOVO continua abortando.
 */
function compensacaoDeLinhagem(nome: string): string | null {
    const caminho = join(raiz, "supabase", "local", "lineage", nome);
    return existsSync(caminho) ? caminho : null;
}

async function aplicarCadeia(nomes: string[], rotulo: string): Promise<boolean> {
    let compensadas = 0;
    for (const nome of nomes) {
        const compensacao = compensacaoDeLinhagem(nome);
        if (compensacao) {
            const c = await psql(readFileSync(compensacao, "utf8"));
            if (c.code !== 0) {
                registrar(
                    `${rotulo}: compensação de linhagem de ${nome}`,
                    false,
                    c.err.trim().split("\n").slice(0, 6).join(" | "),
                );
                return false;
            }
            compensadas += 1;
        }

        const r = await psql(lerSql("supabase", "migrations", nome));
        if (r.code !== 0) {
            registrar(
                `${rotulo}: ${nome}`,
                false,
                r.err.trim().split("\n").slice(0, 8).join(" | "),
            );
            return false;
        }
    }
    registrar(
        `${rotulo} (${nomes.length} migration(s)` +
        (compensadas > 0
            ? `, ${compensadas} com compensação de linhagem declarada)`
            : ")"),
        true,
    );
    return true;
}

async function rodarProvas(): Promise<void> {
    const dir = join(raiz, "supabase", "tests");
    if (!existsSync(dir)) {
        registrar("suítes de prova encontradas", false, "supabase/tests/ não existe");
        return;
    }
    const suites = [...new Glob("*.sql").scanSync({ cwd: dir })].sort();
    if (suites.length === 0) {
        registrar("suítes de prova encontradas", false, "nenhum .sql em supabase/tests/");
        return;
    }
    for (const suite of suites) {
        const r = await psql(lerSql("supabase", "tests", suite));
        const ok = r.code === 0;
        // As suítes usam RAISE NOTICE para cada invariante provada; em falha, a
        // mensagem da exceção é o que interessa.
        const notas = (ok ? r.err : r.err)
            .split("\n")
            .filter((l) => l.includes("PROVEN:") || l.includes("FAILED:") || l.includes("ERROR"))
            .slice(0, 40);
        registrar(
            `prova ${suite}`,
            ok,
            ok ? undefined : notas.join(" | ") || r.err.trim().slice(0, 500),
        );
        if (ok) for (const n of notas) console.log(`         ${n.replace(/^NOTICE:\s*/, "")}`);
    }
}

async function dumpInventario(): Promise<void> {
    const sql = `
SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
       || ' | owner=' || pg_get_userbyid(p.proowner)
       || ' | secdef=' || p.prosecdef
       || ' | search_path=' || COALESCE(array_to_string(p.proconfig, ','), 'UNSET')
       || ' | acl=' || COALESCE(p.proacl::TEXT, 'DEFAULT(PUBLIC)')
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
 ORDER BY 1;`;
    const out = await scalar(sql);
    console.log("\n── INVENTÁRIO DE FUNÇÕES public ─────────────────────────────");
    console.log(out);

    const acl = await scalar(`
SELECT c.relname
       || ' | ' || COALESCE(c.relacl::TEXT, 'DEFAULT')
       || ' | rls=' || c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r'
 ORDER BY 1;`);
    console.log("\n── ACL DE TABELAS public ────────────────────────────────────");
    console.log(acl);
}

// ── Execução ────────────────────────────────────────────────────────────────
console.log(`\nREPLAY DE MIGRATIONS — modo=${modo} · alvo=container local descartável\n`);

const dv = await docker(["version", "--format", "{{.Server.Version}}"]);
if (dv.code !== 0) {
    console.error("❌ Docker não está disponível. Este gate exige Docker local.");
    console.error(dv.err.trim() || dv.out.trim());
    process.exit(1);
}
registrar(`docker disponível (engine ${dv.out.trim()})`, true);

try {
    await subirContainer();

    if (!(await aplicarArquivo("shim de plataforma Supabase", "supabase", "local", "00_platform_shim.sql"))) {
        throw new Error("shim falhou");
    }

    const todas = linhagemDeProducao();
    const antes = todas.filter((n) => n < G1_BOUNDARY);
    const pacoteG1 = todas.filter((n) => n >= G1_BOUNDARY);

    registrar(
        `linhagem de produção resolvida (${todas.length} de ${migrationsOrdenadas().length} migrations)`,
        true,
    );
    for (const n of STAGING_ONLY_MIGRATIONS) {
        console.log(`         fora — exclusiva de staging: ${n}`);
    }
    for (const [n, motivo] of NAO_EXECUTAVEIS) {
        console.log(`         fora — não executável: ${n}`);
        console.log(`                ${motivo}`);
    }

    if (modo === "clean") {
        if (!(await aplicarCadeia(todas, "cadeia completa aplicada"))) throw new Error("cadeia falhou");
    } else {
        if (!(await aplicarCadeia(antes, "estado pré-produção reproduzido"))) {
            throw new Error("baseline falhou");
        }
        if (
            !(await aplicarArquivo(
                "drift de ACL observado em produção injetado",
                "supabase",
                "local",
                "10_production_observed_drift.sql",
            ))
        ) {
            throw new Error("drift falhou");
        }
        if (!(await aplicarCadeia(pacoteG1, "pacote G1 aplicado sobre o estado real"))) {
            throw new Error("pacote G1 falhou");
        }
    }

    // ── Retomabilidade do runbook G1 ────────────────────────────────────────
    //
    // Uma janela de mudança pode ser interrompida. O que o operador precisa
    // saber é o que acontece ao rodar o pacote de novo — e a resposta não é a
    // mesma para todas as migrations, então afirmar "o pacote é idempotente"
    // seria falso.
    //
    // Duas propriedades distintas, verificadas separadamente:
    //
    //   · as migrations desta onda são IDEMPOTENTES: reaplicar tem de passar,
    //     porque o operador pode não saber se a primeira execução completou;
    //   · as migrations pré-existentes do pacote são ONE-SHOT com detecção de
    //     drift, por decisão de quem as escreveu. Reaplicar tem de RECUSAR, com
    //     diagnóstico. Uma recusa aqui é o comportamento correto; o que seria
    //     defeito é reaplicar em silêncio.
    for (const nome of pacoteG1.filter((n) => IDEMPOTENTES.has(n))) {
        const r = await psql(lerSql("supabase", "migrations", nome));
        registrar(
            `idempotente ao reaplicar: ${nome}`,
            r.code === 0,
            r.code === 0 ? undefined : r.err.trim().split("\n").slice(0, 4).join(" | "),
        );
    }

    await rodarProvas();

    // Deixado para o fim: uma migration one-shot que recusa aborta a própria
    // transação, mas rodar isso antes das provas seria arriscar o estado do
    // banco de prova por um teste que não precisa dessa ordem.
    for (const nome of pacoteG1.filter((n) => !IDEMPOTENTES.has(n))) {
        const r = await psql(lerSql("supabase", "migrations", nome));
        registrar(
            `one-shot recusa reaplicação (fail-closed): ${nome}`,
            r.code !== 0,
            r.code !== 0 ? undefined : "reaplicou em silêncio — deveria detectar drift e abortar",
        );
    }

    if (inventario) await dumpInventario();
} catch (e) {
    console.error(`\n(interrompido: ${(e as Error).message})`);
} finally {
    if (!manter) {
        await docker(["rm", "-f", CONTAINER]);
    } else {
        console.log(`\nContainer mantido: docker exec -it ${CONTAINER} psql -U ${PGUSER} -d ${DB}`);
    }
}

const okCount = passos.filter((p) => p.ok).length;
console.log(`\n── RESULTADO ─────────────────────────────────────────────────`);
console.log(`modo=${modo} · passos=${passos.length} · ok=${okCount} · falhas=${passos.length - okCount}`);

if (falhou) {
    console.error("\n❌ REPLAY FALHOU — ver passos marcados FAIL acima.");
    process.exit(1);
}
console.log("\n✅ REPLAY OK — cadeia aplica e todas as invariantes foram provadas no banco.");
process.exit(0);
