// Gate de repositório da fronteira de autoridade de profiles.
//
// A prova de COMPORTAMENTO desta correção vive em SQL, executada contra um
// Postgres real (supabase/tests/01_profile_authority_boundary.sql, via
// `bun run db:replay`). É lá que o ataque é realmente tentado — e é a única
// forma honesta de afirmar que um REVOKE surtiu efeito, porque privilégio
// efetivo no Postgres é a interação de ACL de tabela, ACL de coluna, RLS e
// trigger. Nenhuma análise de texto resolve essa interação.
//
// Este arquivo cobre o que o replay NÃO cobre: o replay exige Docker, e o CI
// pode não ter. Sem um gate no `bun test`, a regressão que passa desapercebida é
// a mais provável de todas — alguém adiciona uma migration que reconcede o
// privilégio, o replay não roda naquele PR, e o buraco volta.
//
// O foco aqui é justamente ORDEM e CONTINUIDADE na cadeia de migrations, que é
// o que o banco não sabe responder: o banco só conhece o estado final de UMA
// aplicação, não o que a próxima migration do repositório vai fazer.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { Glob } from "bun";

const raiz = process.cwd();
const DIR_MIGRATIONS = join(raiz, "supabase", "migrations");
const DIR_PROVAS = join(raiz, "supabase", "tests");

const HARDENING = "20260828120000_profile_authority_boundary_hardening.sql";
const M6_HISTORICA = "20260828121000_definer_surface_and_execute_grants.sql";
const M6A = "20260901120000_current_production_definer_surface_security_closure.sql";
const M6_HISTORICA_SHA256 = "4725c8c3e3ce8033045e7613ed1eab49c5ef77628210ec74a43496fe46877371";

function migrations(): { nome: string; sql: string }[] {
    return [...new Glob("*.sql").scanSync({ cwd: DIR_MIGRATIONS })]
        .sort()
        .map((nome) => ({ nome, sql: readFileSync(join(DIR_MIGRATIONS, nome), "utf8") }));
}

/** SQL sem comentários: uma migration pode CITAR um GRANT proibido ao explicá-lo. */
function sqlEfetivo(sql: string): string {
    return sql
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .filter((l) => !l.trim().startsWith("--"))
        .join("\n");
}

describe("as três camadas estão versionadas", () => {
    const sql = readFileSync(join(DIR_MIGRATIONS, HARDENING), "utf8");
    const efetivo = sqlEfetivo(sql);

    test("camada 1: revoga tudo de profiles antes de reconceder o mínimo", () => {
        // A ordem é o controle. `REVOKE UPDATE (col)` depois de um GRANT de tabela
        // não subtrai nada — foi assim que 20260703130000 falhou. Partir de
        // REVOKE ALL torna impossível sobrar privilégio herdado.
        const iRevoke = efetivo.indexOf("REVOKE ALL ON public.profiles FROM anon, authenticated");
        const iGrant = efetivo.indexOf("GRANT UPDATE (display_name) ON public.profiles");
        expect(iRevoke).toBeGreaterThan(-1);
        expect(iGrant).toBeGreaterThan(iRevoke);
    });

    test("camada 1: só display_name volta a ser gravável, e SELECT é preservado", () => {
        expect(efetivo).toContain("GRANT SELECT ON public.profiles TO authenticated");
        expect(efetivo).toMatch(/GRANT UPDATE \(display_name\) ON public\.profiles TO authenticated/);
        // Nenhum GRANT de escrita ampla pode reaparecer nesta migration.
        expect(efetivo).not.toMatch(/GRANT[^;]*\b(INSERT|DELETE)\b[^;]*public\.profiles[^;]*authenticated/i);
    });

    test("camada 2: a policy FOR ALL morre e nasce uma por comando, sem INSERT/DELETE", () => {
        expect(efetivo).toContain('DROP POLICY IF EXISTS "profile_own" ON public.profiles');
        expect(efetivo).toMatch(/CREATE POLICY "profiles_select_own"[\s\S]*?FOR SELECT/);
        expect(efetivo).toMatch(/CREATE POLICY "profiles_update_own"[\s\S]*?FOR UPDATE/);
        // WITH CHECK é o que impede o UPDATE de mover a linha para fora do escopo.
        expect(efetivo).toMatch(/CREATE POLICY "profiles_update_own"[\s\S]*?WITH CHECK \(id = auth\.uid\(\)\)/);
        expect(efetivo).not.toMatch(/CREATE POLICY[^;]*ON public\.profiles[^;]*FOR (ALL|INSERT|DELETE)/i);
    });

    test("camada 3: trigger cobre INSERT, UPDATE e DELETE, e é SECURITY INVOKER", () => {
        expect(efetivo).toMatch(
            /CREATE TRIGGER profiles_authority_boundary[\s\S]*?BEFORE INSERT OR UPDATE OR DELETE ON public\.profiles/,
        );
        expect(efetivo).toMatch(/FOR EACH ROW/);
        // SECURITY INVOKER não é detalhe: com DEFINER, current_user viraria o owner
        // e a função nunca reconheceria o papel de cliente que a acionou.
        expect(efetivo).toMatch(/enforce_profile_authority_boundary[\s\S]*?SECURITY INVOKER/);
        expect(efetivo).toMatch(/SET search_path = public/);
    });

    test("camada 3: as três colunas de autoridade e identidade são protegidas", () => {
        for (const coluna of ["role", "org_id", "id"]) {
            expect(efetivo).toContain(`NEW.${coluna} IS DISTINCT FROM OLD.${coluna}`);
        }
    });

    test("os caminhos legítimos são pré-condição, não esperança", () => {
        // Fechar a criação de perfil por cliente sem as RPCs de convite presentes
        // transformaria hardening em onboarding indisponível.
        expect(efetivo).toContain("provision_organization_from_invite");
        expect(efetivo).toContain("accept_member_invite");
        expect(efetivo).toContain("GRANT ALL ON public.profiles TO service_role");
    });
});

describe("nenhuma migration posterior reabre o caminho", () => {
    // Este é o teste que o banco não sabe fazer: ele conhece o estado final de
    // uma aplicação, não o que a próxima migration do repositório vai fazer.
    const posteriores = migrations().filter((m) => m.nome > HARDENING);

    test("M6 histórica e M6A existem depois do hardening (o teste não é vácuo)", () => {
        expect(posteriores.map((m) => m.nome)).toContain(M6_HISTORICA);
        expect(posteriores.map((m) => m.nome)).toContain(M6A);
    });

    for (const { nome, sql } of posteriores) {
        test(`${nome} não reconcede escrita ampla em profiles a papel de cliente`, () => {
            const efetivo = sqlEfetivo(sql);
            const proibido = [
                // GRANT de tabela (sem lista de colunas) para papel de cliente.
                /GRANT\s+(ALL|[A-Z, ]*\b(INSERT|UPDATE|DELETE)\b[A-Z, ]*)\s+ON\s+(TABLE\s+)?public\.profiles\s+TO\s+[^;]*\b(anon|authenticated|PUBLIC)\b/i,
                // Policy permissiva ampla.
                /CREATE\s+POLICY[^;]*ON\s+public\.profiles[^;]*FOR\s+(ALL|INSERT|DELETE)/i,
                // Remoção da camada 3.
                /DROP\s+TRIGGER[^;]*profiles_authority_boundary/i,
            ];
            const violacoes = proibido.filter((re) => re.test(efetivo)).map((re) => re.source);
            expect({ migration: nome, violacoes }).toEqual({ migration: nome, violacoes: [] });
        });
    }
});

describe("a superfície SECURITY DEFINER tem inventário phase-aware declarado", () => {
    const sql = readFileSync(join(DIR_MIGRATIONS, M6A), "utf8");

    test("M6 histórica permanece byte-for-byte na custódia canônica", () => {
        const historica = readFileSync(join(DIR_MIGRATIONS, M6_HISTORICA), "utf8")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n");
        expect(createHash("sha256").update(historica, "utf8").digest("hex")).toBe(
            M6_HISTORICA_SHA256,
        );
    });

    test("toda RPC chamada pelo código está no inventário de EXECUTE", () => {
        // Uma RPC que o app chama mas o inventário não declara sairia da
        // reconciliação com o privilégio herdado dos default privileges da conta —
        // exatamente o defeito que esta migration existe para fechar.
        const nomes = new Set<string>();
        for (const rel of new Glob("**/*.{ts,tsx}").scanSync({ cwd: join(raiz, "src") })) {
            const norm = rel.replace(/\\/g, "/");
            if (norm.includes(".test.")) continue;
            if (norm.startsWith("lib/schema-parity/")) continue;
            const src = readFileSync(join(raiz, "src", rel), "utf8");
            for (const m of src.matchAll(/\.rpc\(\s*["'`]([a-z_]+)["'`]/g)) nomes.add(m[1]!);
        }

        expect(nomes.size).toBeGreaterThan(0);
        const ausentes = [...nomes].filter((n) => !sql.includes(`public.${n}(`)).sort();
        expect(ausentes).toEqual([]);
    });

    test("a checagem de completude phase-aware é fail-closed", () => {
        expect(sql).toContain("fora de REQUIRED_NOW + FUTURE_OPTIONAL");
        expect(sql).toMatch(/deptype\s*=\s*'e'/);
        expect(sql).toContain("função(ões) REQUIRED_NOW ausente(s)");
    });

    test("declara exatamente 15 REQUIRED_NOW e 14 FUTURE_OPTIONAL", () => {
        const required = sql.slice(
            sql.indexOf("INSERT INTO _m6a_required_now"),
            sql.indexOf("INSERT INTO _m6a_future_optional"),
        );
        const future = sql.slice(
            sql.indexOf("INSERT INTO _m6a_future_optional"),
            sql.indexOf("-- REQUIRED_NOW é fail-closed"),
        );
        expect([...required.matchAll(/\('public\./g)]).toHaveLength(15);
        expect([...future.matchAll(/\('public\./g)]).toHaveLength(14);
        expect(future).toContain("public.record_item_funnel_event");
        expect(required).toContain("public.enforce_profile_authority_boundary()");
    });

    /**
     * Só o bloco de declaração interessa. O nome de cada função aparece também
     * no cabeçalho e no CREATE OR REPLACE; casar com a primeira ocorrência leria
     * a documentação em vez do registro, e o teste passaria (ou falharia) por
     * acidente de posição no arquivo.
     */
    function grantees(assinatura: string): string {
        const inicioRegistro = sql.indexOf("INSERT INTO _m6a_required_now");
        const fimRegistro = sql.indexOf("-- REQUIRED_NOW é fail-closed");
        expect(inicioRegistro).toBeGreaterThan(-1);
        expect(fimRegistro).toBeGreaterThan(inicioRegistro);

        const registro = sql.slice(inicioRegistro, fimRegistro);
        const i = registro.indexOf(`'${assinatura}'`);
        expect(i).toBeGreaterThan(-1);
        const proximaVirgula = registro.indexOf("),", i);
        const fimInsert = registro.indexOf(");", i);
        const fimEntrada = proximaVirgula === -1
            ? fimInsert
            : fimInsert === -1
                ? proximaVirgula
                : Math.min(proximaVirgula, fimInsert);
        expect(fimEntrada).toBeGreaterThan(i);
        return registro.slice(i, fimEntrada);
    }

    test("as funções que estavam alcançáveis por herança ficam service_role", () => {
        const alvos = [
            "public.mark_invite_used(text)",
            "public.accept_member_invite(text,uuid)",
            "public.record_item_funnel_event(text,text,integer,boolean,integer,jsonb)",
        ];
        for (const assinatura of alvos) {
            const declarado = grantees(assinatura);
            expect(declarado).toContain("'service_role'");
            expect(declarado).not.toContain("'anon'");
            expect(declarado).not.toContain("'authenticated'");
        }
    });

    test("a pesquisa anônima continua anônima por contrato", () => {
        // Least privilege não pode virar "revoga tudo": sem anon, o respondente
        // (que nunca tem sessão) não responde.
        expect(grantees("public.submit_sector_response(text,jsonb,text)")).toContain("'anon'");
        expect(grantees("public.submit_wave_response(uuid,text,jsonb)")).toContain("'anon'");
    });
});

describe("as suítes de prova em SQL estão presentes e cobrem o achado", () => {
    const suites = [...new Glob("*.sql").scanSync({ cwd: DIR_PROVAS })].sort();

    test("as nove suítes existem", () => {
        expect(suites).toEqual([
            "01_profile_authority_boundary.sql",
            "02_definer_surface_and_grants.sql",
            "03_fibt_contract_convergence.sql",
            "04_m6a_phase_aware_surface.sql",
            // TASK 10.1 §F — fronteira de escrita de public.waves. Fecha o
            // P0-2 (gate de instrumento/plano só existia em TypeScript,
            // enquanto o cliente escrevia direto na tabela).
            "05_waves_write_boundary.sql",
            // TASK 10.1 Decisão 1 — diferenciação TEMPORAL. k_min por
            // snapshot não basta: o vazamento está na DIFERENÇA entre duas
            // chamadas sucessivas à mesma coorte.
            "06_cohort_temporal_release.sql",
            // IVO R6 — proveniência FIB-T em action_items (migration local
            // 20261002120000, não aplicada remotamente). Prova cross-tenant,
            // escrita direta e RLS/RPC como authenticated de duas orgs + anon.
            "07_fibt_action_provenance.sql",
            // IVO C8 — protocolos, observações e pareceres de eficácia (migration local
            // 20261005120000, não aplicada remotamente). Ciclo rascunho→registrado, parecer
            // conclusivo só com governança registrada no próprio parecer, revisor independente,
            // sem DELETE, duas organizações + anon.
            "08_ivo_efficacy_protocols.sql",
            // IVO PI-13 — inclusão de ação em plano existente e encerramento operacional
            // (migration local 20261016120000, aditiva, não aplicada remotamente). Gatilhos no
            // schema ivo_ledger (sem função nova em public): plano encerrado é terminal,
            // plano ativo só recebe ação com §13, repetição do mesmo pedido não duplica.
            "09_ivo_plan_composition_closure.sql",
            // Q2 B2 — ator verificado no ledger (org, papel real, escopo da liderança) e
            // title_visible_at (migration local 20261119120000, não aplicada remotamente).
            // Transação com ROLLBACK; qualquer FAIL aborta a suíte.
            "10_q2_ledger_actor_scope.sql",
        ]);
    });

    test("a suíte de release temporal ataca de verdade o delta entre snapshots", () => {
        const sql = readFileSync(join(DIR_PROVAS, "06_cohort_temporal_release.sql"), "utf8");
        // Ataque real com papéis reais, não inspeção de ACL.
        expect(sql).toContain("SET LOCAL ROLE anon");
        expect(sql).toContain("_proof.blocked");
        expect(sql).toContain("request.jwt.claims");
        // O núcleo: +1..+4 não move o observável, +5 move.
        expect(sql).toContain("DELTA_+1..+4=NO_OBSERVABLE_CHANGE");
        expect(sql).toContain("DELTA_+5=ATOMIC_RELEASE");
        // PROVA A (mutação) e PROVA B (contribuintes por item).
        expect(sql).toContain("RESPONSE_MUTATION_CANNOT_YIELD_DELTA_LT_K=true");
        expect(sql).toContain("EVERY_RELEASED_ITEM_MEAN_HAS_K_MIN_CONTRIBUTORS=true");
        // PROVA C (composição) e concorrência.
        expect(sql).toContain("CROSS_SNAPSHOT_COMPOSITION_SAFE=true");
        expect(sql).toContain("CONCURRENT_PUBLICATION_SAFE=true");
        // A persistência não pode ser lida/escrita por papel de cliente.
        expect(sql).toContain("PERSISTENCE_TABLE_CLIENT_ACCESS=DENIED");
        // Controle positivo: o caminho legítimo continua publicando.
        expect(sql).toContain("FIRST_RELEASE_AT_K=ALLOWED");
    });

    test("a suíte da fronteira de waves tenta a escrita direta, e não só lê o catálogo", () => {
        const sql = readFileSync(join(DIR_PROVAS, "05_waves_write_boundary.sql"), "utf8");
        // Mesma disciplina da suíte 01: o ataque é TENTADO como authenticated
        // com JWT de sessão, não inferido de has_table_privilege.
        expect(sql).toContain("SET LOCAL ROLE authenticated");
        expect(sql).toContain("request.jwt.claims");
        expect(sql).toContain("_proof.blocked");
        // As três portas de escrita direta, mais a variante cross-tenant.
        expect(sql).toContain("WAVES_DIRECT_INSERT=BLOCKED");
        expect(sql).toContain("WAVES_DIRECT_UPDATE=BLOCKED");
        expect(sql).toContain("WAVES_DIRECT_DELETE=BLOCKED");
        expect(sql).toContain("CROSS_TENANT_WRITE=BLOCKED");
        // Controle positivo: revogar não pode virar indisponibilidade —
        // leitura org-scoped e o caminho service_role continuam funcionando.
        expect(sql).toContain("ORG_SCOPED_READ=PASS");
        expect(sql).toContain("LEGITIMATE_APP_WAVE_MANAGEMENT=PASS");
        // Rastreio de caminhos de mutação no catálogo, não grep de nomes.
        expect(sql).toContain("NO_CLIENT_REACHABLE_RPC_MUTATES_WAVES");
    });

    test("a suíte de autoridade tenta o ataque, e não só lê o catálogo", () => {
        const sql = readFileSync(join(DIR_PROVAS, suites[0]!), "utf8");
        expect(sql).toContain("SET LOCAL ROLE authenticated");
        expect(sql).toContain("request.jwt.claims");
        // O caminho que as correções de 2026-07-03 deixaram aberto.
        expect(sql).toMatch(/DELETE FROM public\.profiles WHERE id = %L/);
        expect(sql).toMatch(/ON CONFLICT \(id\) DO UPDATE/);
        // A prova de que o bloqueio não depende de uma camada só.
        expect(sql).toContain("DRIFT_SURVIVAL");
        // Controle positivo: sem ele, "revoga tudo" passaria.
        expect(sql).toContain("display_name self-edit=PASS");
    });
});
