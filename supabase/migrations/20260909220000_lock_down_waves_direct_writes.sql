-- P0-2 / TASK_10 — fecha o bypass do gate de instrumento/plano em `waves`
--
-- PROBLEMA
-- `checkInstrumentAllowed` / `checkInviteQuota` / `checkWaveQuota`
-- (src/engine/billing/plan-engine.ts) só existem em TypeScript, dentro de
-- createWaveAsAdmin (wave-admin.server.ts). A migration original
-- (20260630161949) concedeu GRANT INSERT/UPDATE/DELETE em public.waves para
-- `authenticated` e criou a policy "waves_admin_write" (FOR ALL, org+role).
-- Isso significa que qualquer RH_ADMIN/DIRETOR/SST podia chamar
-- supabase.from('waves').insert(...) diretamente com o próprio access_token,
-- satisfazendo grant + RLS, e criar uma onda de qualquer instrumento (ex.:
-- FIB_T num plano "pilot" que só permite COPSOQ) sem nunca passar pelo gate
-- de plano/instrumento nem pelas checagens de quota.
--
-- Mesma classe de problema já corrigida para wave_responses e wave_invites em
-- 20260705160043_...sql ("Lock down direct table-level DML so all writes
-- must go through submit_wave_response") — waves nunca recebeu o mesmo
-- fechamento.
--
-- CORREÇÃO
-- Toda escrita em `waves` já passa, na aplicação real, pelo client de
-- service role (createWaveWithAdmin em db-adapter.ts, closeWaveAsAdmin em
-- wave-admin.server.ts). Nenhum caminho legítimo depende de escrita direta
-- por `authenticated`. Revoga o grant de DML direto e remove a policy que
-- o sustentava; a leitura (`waves_org`, FOR SELECT) fica intacta — qualquer
-- membro da organização continua podendo listar as próprias ondas.

BEGIN;

REVOKE INSERT, UPDATE, DELETE ON public.waves FROM authenticated, anon;

DROP POLICY IF EXISTS "waves_admin_write" ON public.waves;

GRANT ALL ON public.waves TO service_role;

-- ---------------------------------------------------------------------------
-- Verificação pós-migration
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_insere_auth BOOLEAN;
  v_atualiza_auth BOOLEAN;
  v_apaga_auth BOOLEAN;
  v_le_auth BOOLEAN;
BEGIN
  SELECT has_table_privilege('authenticated', 'public.waves', 'INSERT') INTO v_insere_auth;
  SELECT has_table_privilege('authenticated', 'public.waves', 'UPDATE') INTO v_atualiza_auth;
  SELECT has_table_privilege('authenticated', 'public.waves', 'DELETE') INTO v_apaga_auth;
  SELECT has_table_privilege('authenticated', 'public.waves', 'SELECT') INTO v_le_auth;

  IF v_insere_auth OR v_atualiza_auth OR v_apaga_auth THEN
    RAISE EXCEPTION
      'FALHA: authenticated ainda tem DML direto em public.waves (insert=%, update=%, delete=%)',
      v_insere_auth, v_atualiza_auth, v_apaga_auth;
  END IF;

  IF NOT v_le_auth THEN
    RAISE EXCEPTION 'FALHA: authenticated perdeu SELECT em public.waves (leitura org-scoped precisa continuar)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'waves' AND policyname = 'waves_admin_write'
  ) THEN
    RAISE EXCEPTION 'FALHA: policy waves_admin_write ainda presente';
  END IF;

  RAISE NOTICE 'P0-2 fechado: authenticated sem INSERT/UPDATE/DELETE direto em public.waves; toda escrita passa por createWaveAsAdmin/closeWaveAsAdmin (service_role).';
END $$;

COMMIT;
