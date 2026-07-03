-- ═══════════════════════════════════════════════════════════════════════════
-- RPC ATÔMICA DE SUBMISSÃO DE RESPOSTA (P0-06, Sprint S3)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA: saveWaveResponse (db-adapter.ts) fazia 3 chamadas HTTP separadas:
--   1. is_invite_valid_for_wave (checa)
--   2. INSERT direto em wave_responses (grava)
--   3. mark_invite_used (consome)
-- Entre 1 e 3 existe uma janela de corrida: dois envios simultâneos com o
-- MESMO token podiam ambos passar pela checagem 1 antes de qualquer um
-- consumir o token em 3 — duas respostas gravadas para um único convite de
-- uso único. Além disso, a policy `response_submit` original só checava
-- "o token existe e não foi usado", nunca se o token PERTENCE à onda que o
-- cliente está afirmando responder (`wave_responses.wave_id` podia divergir
-- de `wave_invites.wave_id` sem que nada acusasse).
--
-- SOLUÇÃO: uma única função SECURITY DEFINER, chamável por `anon` (o
-- respondente nunca tem sessão — o token É a credencial), que trava a linha
-- do convite (`FOR UPDATE`) e faz checagem de vínculo + status da onda +
-- INSERT + consumo do token na MESMA transação. A policy de INSERT também é
-- reforçada com o mesmo vínculo, como segunda camada (defesa em
-- profundidade: mesmo que algo um dia grave em wave_responses fora desta
-- RPC, o vínculo token↔onda continua sendo exigido pelo Postgres).
--
-- Validação de instrumento/itens/escala (P0-07) continua em TypeScript
-- (`validateBlindSubmission`, engine puro) — é regra de domínio versionada
-- junto do catálogo de surveys, não pertence a SQL. Esta RPC garante só
-- ATOMICIDADE e VÍNCULO; response-capture.server.ts chama o validador ANTES
-- de invocar esta função.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Reforça a policy de INSERT com o vínculo wave_id↔token ────────────────
DROP POLICY IF EXISTS "response_submit" ON public.wave_responses;
CREATE POLICY "response_submit" ON public.wave_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wave_invites
      WHERE token = wave_responses.invite_token
        AND wave_id = wave_responses.wave_id
        AND used_at IS NULL
    )
  );

-- ── 2. RPC atômica ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_wave_response(
  p_wave_id      UUID,
  p_invite_token TEXT,
  p_answers      JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite      public.wave_invites%ROWTYPE;
  v_wave_status TEXT;
  v_count       INTEGER;
BEGIN
  -- Trava a linha do convite: uma segunda chamada concorrente com o MESMO
  -- token espera esta transação terminar antes de prosseguir.
  SELECT * INTO v_invite FROM public.wave_invites WHERE token = p_invite_token FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'already_used'::TEXT, 0;
    RETURN;
  END IF;

  -- Vínculo token↔onda (P0-06): o convite tem que pertencer À MESMA onda que
  -- o cliente afirma estar respondendo.
  IF v_invite.wave_id <> p_wave_id THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;

  SELECT status INTO v_wave_status FROM public.waves WHERE id = p_wave_id;
  IF v_wave_status IS NULL OR v_wave_status IN ('sealed', 'cancelled', 'archived') THEN
    RETURN QUERY SELECT FALSE, 'wave_not_open'::TEXT, 0;
    RETURN;
  END IF;

  INSERT INTO public.wave_responses (wave_id, invite_token, answers)
  VALUES (p_wave_id, p_invite_token, p_answers);

  UPDATE public.wave_invites SET used_at = NOW() WHERE token = p_invite_token;

  SELECT COUNT(*) INTO v_count FROM public.wave_responses WHERE wave_id = p_wave_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_count;
END;
$$;
