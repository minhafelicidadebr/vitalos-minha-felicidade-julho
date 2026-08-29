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
import { join } from "node:path";
import { Glob } from "bun";

const raiz = process.cwd();
const DIR_MIGRATIONS = join(raiz, "supabase", "migrations");
const DIR_PROVAS = join(raiz, "supabase", "tests");

const HARDENING = "20260828120000_profile_authority_boundary_hardening.sql";
const RECONCILIACAO = "20260828121000_definer_surface_and_execute_grants.sql";

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

    test("existe pelo menos a reconciliação depois do hardening (o teste não é vácuo)", () => {
        expect(posteriores.map((m) => m.nome)).toContain(RECONCILIACAO);
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

describe("a superfície SECURITY DEFINER tem inventário declarado", () => {
    const sql = readFileSync(join(DIR_MIGRATIONS, RECONCILIACAO), "utf8");

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

    test("a checagem de completude está presente e não é opcional", () => {
        // Sem ela, o inventário protege só o que já existia hoje.
        expect(sql).toContain("fora do inventario de EXECUTE");
        expect(sql).toMatch(/deptype\s*=\s*'e'/);
    });

    /**
     * Só o bloco de declaração interessa. O nome de cada função aparece também
     * no cabeçalho e no CREATE OR REPLACE; casar com a primeira ocorrência leria
     * a documentação em vez do registro, e o teste passaria (ou falharia) por
     * acidente de posição no arquivo.
     */
    function grantees(assinatura: string): string {
        const registro = sql.slice(
            sql.indexOf("INSERT INTO _execute_pretendido"),
            sql.indexOf("-- ── 2.1"),
        );
        const i = registro.indexOf(`'${assinatura}'`);
        expect(i).toBeGreaterThan(-1);
        return registro.slice(i, registro.indexOf("),", i));
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

    test("as três suítes existem", () => {
        expect(suites).toEqual([
            "01_profile_authority_boundary.sql",
            "02_definer_surface_and_grants.sql",
            "03_fibt_contract_convergence.sql",
        ]);
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
