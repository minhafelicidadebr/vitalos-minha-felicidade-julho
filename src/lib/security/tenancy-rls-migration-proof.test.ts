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
