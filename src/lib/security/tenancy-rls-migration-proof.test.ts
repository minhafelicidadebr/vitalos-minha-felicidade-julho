// Prova estrutural de RLS (Q1.1, escopo item 4) — lê o SQL REAL aplicado em
// supabase/migrations/ e confere as políticas de tenancy da onda (o corte
// vertical desta prova), em vez de só "citar que a migration existe".
//
// Limite honesto (registrado também no doc de evidência): este ambiente não
// tem Docker/Supabase CLI (`docker`/`supabase` ausentes) — não há como rodar
// a policy contra um Postgres vivo com sessão real. Esta prova é o máximo
// verificável sem esse ambiente: análise estática do texto SQL versionado,
// que é o que realmente é aplicado (mesmo arquivo que o `supabase db push`
// usaria). Não substitui uma verificação `has_table_privilege`/sessão real
// contra um banco vivo antes do 1º piloto real — só fecha a lacuna de
// "citar migration" apontada no prompt operacional.

import { describe, expect, test } from "bun:test";
import { collectSqlSources } from "@/lib/schema-parity/parity-io";

function allSql(): string {
  return collectSqlSources()
    .map((s) => s.content)
    .join("\n");
}

const TENANT_TABLES = [
  "organizations",
  "profiles",
  "waves",
  "wave_invites",
  "wave_responses",
  "wave_capsules",
] as const;

describe("RLS habilitada nas tabelas do corte vertical (waves)", () => {
  const sql = allSql();
  for (const table of TENANT_TABLES) {
    test(`public.${table} tem ENABLE ROW LEVEL SECURITY em alguma migration`, () => {
      const re = new RegExp(
        `ALTER TABLE public\\.${table}\\s+ENABLE ROW LEVEL SECURITY`,
        "i",
      );
      expect(re.test(sql)).toBe(true);
    });
  }
});

describe("policies de tenant referenciam org_id + auth.uid() (não é filtro de frontend)", () => {
  const sql = allSql();

  test("waves_org restringe SELECT ao org_id do profile do chamador", () => {
    expect(sql).toMatch(
      /CREATE POLICY "waves_org" ON public\.waves FOR SELECT USING \(org_id IN \(SELECT org_id FROM public\.profiles WHERE id = auth\.uid\(\)\)\)/,
    );
  });

  test("capsule_org restringe SELECT ao org_id do profile do chamador", () => {
    expect(sql).toMatch(
      /CREATE POLICY "capsule_org" ON public\.wave_capsules FOR SELECT USING \(org_id IN \(SELECT org_id FROM public\.profiles WHERE id = auth\.uid\(\)\)\)/,
    );
  });

  test("waves_admin_write exige papel administrativo do setor, não só vínculo de org", () => {
    expect(sql).toMatch(
      /CREATE POLICY "waves_admin_write" ON public\.waves FOR ALL USING \(org_id IN \(SELECT org_id FROM public\.profiles WHERE id = auth\.uid\(\) AND role IN/,
    );
  });

  test("profile_own restringe o profile ao próprio auth.uid() — sem escalonamento de org/role por auto-edição", () => {
    expect(sql).toMatch(
      /CREATE POLICY "profile_own" ON public\.profiles FOR ALL USING \(id = auth\.uid\(\)\) WITH CHECK \(id = auth\.uid\(\)\)/,
    );
  });
});

describe("wave_responses — resposta individual estruturalmente ilegível (k-anon, item 6)", () => {
  const sql = allSql();

  test("nenhuma migration concede SELECT em wave_responses a anon/authenticated", () => {
    const grantSelectToClient = /GRANT[^;]*SELECT[^;]*ON public\.wave_responses[^;]*TO[^;]*(anon|authenticated)/is;
    expect(grantSelectToClient.test(sql)).toBe(false);
  });

  test("INSERT/UPDATE/DELETE em wave_responses foram revogados de anon/authenticated", () => {
    expect(sql).toMatch(
      /REVOKE INSERT, UPDATE, DELETE ON public\.wave_responses FROM anon, authenticated/,
    );
  });

  // Achado da prova dinâmica em staging (2026-07-25, ver
  // docs/handoff/Q1.1_SAAS_OPERATIONAL_PROOF_2026-07-24.md §11/§12):
  // has_table_privilege('authenticated'/'anon', 'public.wave_responses',
  // 'SELECT') voltava true contra um Postgres real, mesmo sem nenhum GRANT
  // SELECT explícito em texto — vinha do default de privilégio da conta,
  // porque wave_responses foi criada (20260630161949) antes da disciplina de
  // REVOKE ALL explícito adotada a partir de 20260705100000, e a migration
  // que depois endureceu a tabela só revogou INSERT/UPDATE/DELETE. A prova
  // estática acima (linha 76) nunca pegaria isso — texto ausente ≠ privilégio
  // ausente. Corrigido em 20260725120000_revoke_wave_responses_select_grant.sql.
  test("SELECT em wave_responses foi revogado explicitamente de anon/authenticated (fecha o default de privilégio da conta)", () => {
    expect(sql).toMatch(
      /REVOKE SELECT ON public\.wave_responses FROM authenticated, anon/,
    );
  });

  test("service_role mantém acesso total (único caminho de leitura agregada é o service role)", () => {
    expect(sql).toMatch(/GRANT ALL ON public\.wave_responses TO service_role/);
  });
});

describe("count_wave_responses — RPC de contagem não vaza respostas nem schema hijack (item 4)", () => {
  const sql = allSql();

  test("função é SECURITY DEFINER com search_path fixo", () => {
    expect(sql).toMatch(
      /count_wave_responses[\s\S]{0,600}?SECURITY DEFINER SET search_path = public/,
    );
  });

  test("EXECUTE foi revogado de PUBLIC antes de conceder a authenticated", () => {
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.count_wave_responses\(uuid\) FROM PUBLIC/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.count_wave_responses\(uuid\) TO authenticated/);
  });

  // Achado da prova dinâmica em staging (2026-07-25, ver
  // docs/handoff/Q1.1_SAAS_OPERATIONAL_PROOF_2026-07-24.md §11/§12): a
  // definição original só contava por wave_id, sem checar organização —
  // qualquer usuário autenticado de qualquer org podia descobrir a
  // contagem de respostas de uma onda de OUTRA org, direto pelo endpoint
  // REST (/rest/v1/rpc/count_wave_responses), sem passar pelo app.
  // Confirmado ao vivo contra um Postgres real (staging isolado): usuário
  // de tenant-demo obtinha a contagem real de uma onda do tenant-piloto.
  // Corrigido em 20260725130000_scope_count_wave_responses_to_caller_org.sql
  // — reintroduz o mesmo vínculo de organização que as RLS policies usam,
  // preservando o bypass para service_role (único chamador interno hoje).
  test("count_wave_responses verifica organização do chamador, com bypass só para service_role", () => {
    expect(sql).toMatch(/auth\.role\(\) = 'service_role'/);
    expect(sql).toMatch(
      /count_wave_responses[\s\S]{0,400}?SELECT w\.id FROM public\.waves w\s*JOIN public\.profiles p ON p\.org_id = w\.org_id\s*WHERE p\.id = auth\.uid\(\)/,
    );
  });
});

describe("submit_wave_response — escrita atômica trava o convite antes de checar vínculo (item 3, escrita)", () => {
  const sql = allSql();

  test("RPC é SECURITY DEFINER com search_path fixo", () => {
    expect(sql).toMatch(/submit_wave_response[\s\S]{0,600}?SECURITY DEFINER SET search_path = public/);
  });

  test("trava a linha do convite (FOR UPDATE) antes de decidir — evita corrida de duplo uso do token", () => {
    expect(sql).toMatch(/FROM public\.wave_invites WHERE token = p_invite_token FOR UPDATE/);
  });
});
