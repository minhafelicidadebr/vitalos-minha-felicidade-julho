-- Fecha vazamento de metadado cross-tenant encontrado durante a prova
-- dinâmica de staging (Q1.1 —
-- docs/handoff/Q1.1_SAAS_OPERATIONAL_PROOF_2026-07-24.md §11/§12).
--
-- ACHADO: public.count_wave_responses(p_wave_id) nunca verificou se a onda
-- pedida pertence à organização do chamador — só contava por wave_id, sem
-- nenhum vínculo de tenant. Como a função é GRANT EXECUTE TO authenticated
-- (necessário para o fluxo real: admin_list_waves mostra a contagem de cada
-- onda), QUALQUER usuário autenticado de QUALQUER organização podia chamar
-- esta função com o wave_id de outra organização — direto pelo endpoint REST
-- do Supabase (/rest/v1/rpc/count_wave_responses), sem nem passar pelo app —
-- e descobrir a contagem exata de respostas daquela onda alheia.
--
-- Confirmado ao vivo (projeto de staging isolado): usuário de tenant-demo
-- chamando count_wave_responses(<wave_id de tenant-piloto>) recebia a
-- contagem real (7), sem nenhuma negativa.
--
-- POR QUE NÃO ERA EXPLORADO PELO APP REAL: os dois únicos chamadores
-- (capsule-aggregator.server.ts, wave-admin.functions.ts) usam o client de
-- service role e SEMPRE verificam a organização antes de chamar. Mas a
-- própria função RPC, exposta a `authenticated`, não tinha nenhuma trava —
-- bastava alguém saber/obter um wave_id de outra org (link vazado, engano,
-- suporte) para descobrir esse metadado.
--
-- CORREÇÃO: adiciona um vínculo de organização dentro da própria função,
-- igual ao que as RLS policies já fazem (org_id IN (SELECT org_id FROM
-- profiles WHERE id = auth.uid())) — preservando o bypass para service_role,
-- que é quem os dois chamadores internos usam e cuja autorização já foi
-- verificada no código da aplicação antes da chamada.
--
-- Verificação pós-aplicação (rodar contra o banco vivo, não só citar):
--   -- como usuário autenticado da org dona da onda: retorna a contagem real
--   -- como usuário autenticado de OUTRA org: retorna 0
--   -- como service_role: retorna a contagem real (comportamento preservado)

CREATE OR REPLACE FUNCTION public.count_wave_responses(p_wave_id UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER FROM public.wave_responses
  WHERE wave_id = p_wave_id
    AND (
      auth.role() = 'service_role'
      OR wave_id IN (
        SELECT w.id FROM public.waves w
        JOIN public.profiles p ON p.org_id = w.org_id
        WHERE p.id = auth.uid()
      )
    );
$$;
