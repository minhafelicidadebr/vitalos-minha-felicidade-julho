-- ═══════════════════════════════════════════════════════════════════════════
-- ESPELHO VIVO — persistência real da autoavaliação pessoal (I-M3/I-M5, S6.5
-- "Espelhar e Guardar" do rollout do blueprint Mensurar Vivo)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO: engine/espelho/personal-assessment-engine.ts (puro, testado) já
-- pontua a autoavaliação PERMA pessoal e computa tendência entre leituras —
-- mas até aqui `/espelho` só guarda o resultado em localStorage (mock-first,
-- rotulado). Esta migration é o Trilho B da arquitetura dos Dois Trilhos
-- (Mensurar Vivo §E1) virando persistência real, mesmo padrão do S5
-- (sm2_card_state/participation_events): dado PESSOAL, sem k-anonimato a
-- proteger, RLS por auth.uid() — SEM service role no caminho de escrita.
--
-- MINIMIZAÇÃO LGPD (E1, decisão de desenho do próprio blueprint): esta tabela
-- guarda o SNAPSHOT COMPUTADO (faixas, escores, completude) — NUNCA as
-- respostas item a item. O dado bruto nunca sai da sessão do cliente; só o
-- resultado já processado é persistido. `instrument_version`/`engine_version`
-- preservam a honestidade histórica se o scoring evoluir (um score de 2026
-- não é comparável a um de 2028 sob outra fórmula sem essa marca).
--
-- INSERT-ONLY DE PROPÓSITO (mesma disciplina de participation_events): cada
-- autoavaliação tomada vira uma NOVA linha — "histórico = tendência"
-- (Mensurar Vivo §G). Não existe UPDATE nem DELETE ao cliente: apagar só
-- acontece pelo caminho auditável `erase_my_assessments()` (LGPD art. 18,
-- Cofre Pessoal I-M5) — mesmo motivo de `participation_events` não ter
-- DELETE ao cliente (impedir reescrever a própria história por fora do rito).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.personal_assessments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument         TEXT NOT NULL,
  instrument_version TEXT NOT NULL,
  engine_version     TEXT NOT NULL,
  result             JSONB NOT NULL,
  taken_at           DATE NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS personal_assessments_user_instrument_idx
  ON public.personal_assessments (user_id, instrument, taken_at DESC);

-- ─── RLS: a pessoa é a única dona — lê e insere o próprio, nunca edita/apaga ─

ALTER TABLE public.personal_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personal_assessments_own_read" ON public.personal_assessments;
CREATE POLICY "personal_assessments_own_read" ON public.personal_assessments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "personal_assessments_own_insert" ON public.personal_assessments;
CREATE POLICY "personal_assessments_own_insert" ON public.personal_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Nenhuma policy de UPDATE/DELETE — "histórico = tendência" (§G): reescrever
-- ou apagar uma linha silenciosamente destruiria a própria trilha honesta que
-- a tela usa para mostrar evolução. Apagar TUDO só pela RPC abaixo.
REVOKE ALL ON public.personal_assessments FROM authenticated, anon;
GRANT SELECT, INSERT ON public.personal_assessments TO authenticated;
GRANT ALL ON public.personal_assessments TO service_role;

-- ─── RPC · Cofre Pessoal (LGPD art. 18) — o único caminho de apagar tudo ────

CREATE OR REPLACE FUNCTION public.erase_my_assessments()
RETURNS TABLE(accepted BOOLEAN, erased_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  DELETE FROM public.personal_assessments WHERE user_id = auth.uid();
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT TRUE, v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.erase_my_assessments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.erase_my_assessments() TO authenticated;
