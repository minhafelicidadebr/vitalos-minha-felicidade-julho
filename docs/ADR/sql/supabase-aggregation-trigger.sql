-- ══════════════════════════════════════════════════════════════════════════════
-- VitalOS · Supabase SQL · Gatilho de Segurança K-anonimato
-- ══════════════════════════════════════════════════════════════════════════════
--
-- QUANDO usar: cole este SQL no Supabase Dashboard > SQL Editor e clique "Run".
--
-- O QUE faz:
--   1. count_wave_responses(p_wave_id) — função pública SECURITY DEFINER que
--      conta respostas sem expor linha individual. Já usada pelo app.
--   2. trg_fn_check_k_anonymity() — function SECURITY DEFINER que dispara em
--      cada INSERT em wave_responses. Quando n≥5 e sem capsule → atualiza
--      waves.status = 'ready_to_seal' (safety net caso o app não acione).
--   3. trg_wave_k_anonymity — trigger que invoca a function acima.
--
-- INVARIANTES preservados:
--   • Nenhum SELECT individual em wave_responses (só COUNT via SECURITY DEFINER)
--   • Dados individuais não vazam — a function só atualiza waves.status
--   • Idempotente: pode ser executado múltiplas vezes sem efeito colateral
--
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Função de contagem pública (já pode existir — CREATE OR REPLACE) ─────

CREATE OR REPLACE FUNCTION public.count_wave_responses(p_wave_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM wave_responses WHERE wave_id = p_wave_id;
$$;

GRANT EXECUTE ON FUNCTION public.count_wave_responses(uuid) TO anon, authenticated, service_role;

-- ─── 2. Função do gatilho ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_fn_check_k_anonymity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count    BIGINT;
  v_capsule  BOOLEAN;
BEGIN
  -- Conta respostas via função SECURITY DEFINER (nunca SELECT direto)
  v_count := public.count_wave_responses(NEW.wave_id);

  -- Verifica se capsule já existe para esta onda
  SELECT EXISTS(
    SELECT 1 FROM wave_capsules WHERE wave_id = NEW.wave_id
  ) INTO v_capsule;

  -- Se n≥5 e ainda sem capsule → marca como pronta para selar
  IF v_count >= 5 AND NOT v_capsule THEN
    UPDATE waves
    SET status = 'ready_to_seal'
    WHERE id = NEW.wave_id
      AND status IN ('collecting', 'active');
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 3. Gatilho na tabela wave_responses ─────────────────────────────────────

DROP TRIGGER IF EXISTS trg_wave_k_anonymity ON wave_responses;

CREATE TRIGGER trg_wave_k_anonymity
AFTER INSERT ON wave_responses
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_check_k_anonymity();

-- ─── 4. Verificação (opcional — rode separado após o CREATE acima) ────────────
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'wave_responses';
