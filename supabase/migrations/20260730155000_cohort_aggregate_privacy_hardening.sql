-- FIBT-1 / PRIVACY HARDENING -- anterior a Migration B
--
-- NAO altera a Migration A congelada. Substitui apenas o contrato de retorno
-- de aggregate_cohort_responses e adiciona uma funcao operacional separada.
--
-- PROBLEMA
-- A versao da Migration A suprime o CONTEUDO abaixo do limiar, mas devolve o
-- n exato (ex.: 4). Numa coorte pequena, saber que sao exatamente 4 pessoas ja
-- e informacao sobre o grupo: combinada com conhecimento organizacional
-- ("aquele setor tem 4 pessoas"), aproxima a reidentificacao mesmo sem uma
-- unica resposta vazar. Supressao que informa o tamanho exato do grupo
-- protege menos do que parece.
--
-- CONTRATO NOVO, abaixo do limiar:
--   visible              = false
--   response_count       = NULL          (nunca o numero exato)
--   response_count_label = '<5'          (faixa, suficiente para operar)
--   item_means           = NULL
--   factor_scores        = NULL
--   domain_means         = NULL
--   suppression_reason   = 'privacy_threshold'
--
-- SEPARACAO DE FINALIDADE
-- Quem precisa da contagem exata para operacao (acompanhar adesao) usa
-- count_cohort_participation, funcao distinta, sem nenhum conteudo de
-- resposta e com permissao propria. Finalidades diferentes, funcoes
-- diferentes: e o que permite tirar a contagem de quem so deveria ver
-- resultado agregado.

-- ---------------------------------------------------------------------------
-- 1. Resultado agregado para a organizacao -- sem n exato abaixo do limiar
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.aggregate_cohort_responses(uuid, uuid);

CREATE FUNCTION public.aggregate_cohort_responses(
  p_wave_id   UUID,
  p_cohort_id UUID
)
RETURNS TABLE(
  visible              BOOLEAN,
  response_count       INTEGER,
  response_count_label TEXT,
  k_min                INTEGER,
  item_means           JSONB,
  factor_scores        JSONB,
  domain_means         JSONB,
  suppression_reason   TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_k     CONSTANT INTEGER := 5;
  v_n     INTEGER;
  v_means JSONB;
BEGIN
  -- Escopo de tenant: o chamador tem que pertencer a organizacao DONA da onda.
  -- Sem identidade organizacional (ex.: service_role puro), nada e devolvido.
  IF NOT EXISTS (
    SELECT 1 FROM public.waves w
    JOIN public.profiles p ON p.org_id = w.org_id
    WHERE w.id = p_wave_id AND p.id = auth.uid()
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TEXT, v_k,
                        NULL::JSONB, NULL::JSONB, NULL::JSONB, 'not_authorized'::TEXT;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_n
    FROM public.wave_responses
   WHERE wave_id = p_wave_id AND cohort_id = p_cohort_id;

  IF v_n < v_k THEN
    -- Abaixo do limiar: nem conteudo, nem contagem exata. A faixa '<5' basta
    -- para a organizacao saber que existe um grupo e que ele esta protegido.
    RETURN QUERY SELECT FALSE, NULL::INTEGER, ('<' || v_k)::TEXT, v_k,
                        NULL::JSONB, NULL::JSONB, NULL::JSONB, 'privacy_threshold'::TEXT;
    RETURN;
  END IF;

  SELECT jsonb_object_agg(item_key, media) INTO v_means
    FROM (
      SELECT kv.key AS item_key, ROUND(AVG((kv.value)::NUMERIC), 4) AS media
        FROM public.wave_responses r
        CROSS JOIN LATERAL jsonb_each_text(r.answers) AS kv(key, value)
       WHERE r.wave_id = p_wave_id AND r.cohort_id = p_cohort_id
       GROUP BY kv.key
    ) t;

  -- factor_scores e domain_means ficam NULL: o calculo por Fator/Dominio
  -- pertence ao engine canonico, que le o manifesto versionado. Duplicar a
  -- formula em SQL criaria uma segunda fonte de verdade divergindo com o
  -- tempo. As colunas existem no contrato para uso futuro, se a agregacao
  -- migrar para o banco -- hoje sao explicitamente nulas, nao esquecidas.
  RETURN QUERY SELECT TRUE, v_n, v_n::TEXT, v_k,
                      v_means, NULL::JSONB, NULL::JSONB, NULL::TEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) IS
  'Resultado agregado de uma coorte para a organizacao. Abaixo de k_min=5 devolve visible=false, response_count NULL e response_count_label "<5" -- nunca a contagem exata. Nao devolve resposta individual em hipotese alguma.';

-- ---------------------------------------------------------------------------
-- 2. Contagem exata: finalidade operacional, funcao e permissao separadas
-- ---------------------------------------------------------------------------
-- Existe para acompanhar adesao. Nao devolve nenhum conteudo de resposta.
-- Deliberadamente NAO concedida a anon; um papel futuro de results_viewer
-- (que so pode ver resultado agregado) tambem nao deve receber EXECUTE aqui.

CREATE OR REPLACE FUNCTION public.count_cohort_participation(
  p_wave_id   UUID,
  p_cohort_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Somente administracao da organizacao dona da onda.
  IF NOT EXISTS (
    SELECT 1 FROM public.waves w
    JOIN public.profiles p ON p.org_id = w.org_id
    WHERE w.id = p_wave_id
      AND p.id = auth.uid()
      AND p.role = ANY (ARRAY['RH_ADMIN', 'DIRETOR'])
  ) THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.wave_responses
   WHERE wave_id = p_wave_id AND cohort_id = p_cohort_id;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.count_cohort_participation(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.count_cohort_participation(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.count_cohort_participation(uuid, uuid) IS
  'Contagem exata de respostas de uma coorte, para acompanhamento operacional de adesao. Finalidade e permissao separadas do resultado agregado: nao devolve conteudo algum, e restrita a RH_ADMIN/DIRETOR da organizacao dona. NAO conceder a papel que so deveria ver resultado agregado.';

-- ---------------------------------------------------------------------------
-- 3. Verificacao pos-migration
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_cols TEXT;
BEGIN
  SELECT string_agg(p.proname, ',') INTO v_cols
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('aggregate_cohort_responses', 'count_cohort_participation');

  IF v_cols IS NULL OR v_cols NOT LIKE '%aggregate_cohort_responses%' THEN
    RAISE EXCEPTION 'FALHA: aggregate_cohort_responses ausente';
  END IF;
  IF v_cols NOT LIKE '%count_cohort_participation%' THEN
    RAISE EXCEPTION 'FALHA: count_cohort_participation ausente';
  END IF;

  -- O contrato novo tem que expor response_count_label e suppression_reason.
  IF NOT EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'aggregate_cohort_responses'
       AND array_to_string(p.proargnames, ',') LIKE '%response_count_label%'
  ) THEN
    RAISE EXCEPTION 'FALHA: contrato novo sem response_count_label';
  END IF;

  RAISE NOTICE 'Privacy hardening aplicado: abaixo de k_min a contagem exata nao sai no resultado agregado.';
END $$;
