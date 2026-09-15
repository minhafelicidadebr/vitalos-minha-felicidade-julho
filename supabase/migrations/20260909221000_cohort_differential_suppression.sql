-- P1 / TASK_10 + TASK 10.1 §E — supressão diferencial em aggregate_cohort_responses
--
-- PROBLEMA (achado original, TASK_10)
-- aggregate_cohort_responses decide visibilidade olhando SOMENTE a própria
-- coorte, isolada: v_n = COUNT(*) desta coorte, comparado a k_min=5. Isso é
-- correto para essa coorte olhada sozinha, mas ignora que o mesmo chamador
-- (qualquer authenticated da organização) também pode ler
-- count_wave_responses(p_wave_id), que devolve a contagem EXATA da onda
-- inteira, deliberadamente sem gate de k-anon (finalidade operacional). É o
-- cenário descrito em docs/SURVEY_SECTOR_LINKS_AUDIT.md:50 ("Gestor pode
-- inferir grupo pequeno por subtração"), nunca fechado no RPC real — só
-- existe hoje como utilitário solto (suppressDifferentialInference,
-- src/engine/survey/sector-link-engine.ts) para uma feature diferente e não
-- implantada.
--
-- PROBLEMA (achado do red-team adversarial, TASK 10.1 §E — a primeira
-- correção era insuficiente)
-- A primeira versão desta correção comparava "esta coorte" contra
-- "residual = total da onda − esta coorte", tratando tudo que não é esta
-- coorte como um bloco só. Isso protege corretamente quando a onda tem
-- EXATAMENTE duas coortes (o residual É a outra coorte, então o teste é
-- exato) — mas falha com 3 ou mais coortes: em [10, 8, 4] (total=22), a
-- coorte de 10 tem residual=22−10=12 (>=5, "visível"), e a de 8 tem
-- residual=22−8=14 (>=5, "visível") — nenhuma delas suprimida por esse
-- teste. Mas um atacante que consulta as duas coortes visíveis (10 e 8)
-- calcula a terceira por subtração: 22−10−8=4 — exatamente o valor que a
-- coorte de 4 devolveria suprimido se perguntada direto. A supressão
-- pairwise (esta coorte vs. o resto somado) não enxerga a PARTIÇÃO
-- completa da onda em coortes individuais, só o agregado do resto.
--
-- CORREÇÃO GENERALIZADA
-- A regra correta é a de suppressDifferentialInference
-- (src/engine/survey/sector-link-engine.ts), aplicada à PARTIÇÃO COMPLETA de
-- segmentos da onda (cada coorte distinta + o bucket "sem coorte", cada um
-- contado uma vez): se exatamente UM segmento está oculto (n < k_min) E
-- TODOS os demais segmentos estão visíveis (n >= k_min), então publicar
-- QUALQUER um dos segmentos visíveis permite derivar o oculto por subtração
-- contra o total da onda — logo NENHUM segmento pode ser publicado nesse
-- estado, mesmo os que teriam n >= k_min sozinhos. Com ZERO segmentos
-- ocultos, nada a proteger. Com DOIS OU MAIS segmentos ocultos, a soma deles
-- é derivável pelo resto, mas nenhum INDIVIDUAL — não há como separar quanto
-- é de cada um sem informação adicional, então não há problema de
-- diferenciação a corrigir.
--
-- k_min continua 5, sem alteração de contrato de retorno, sem invenção de
-- métrica nova: mesmas 8 colunas, mesmo tipo. suppression_reason continua
-- usando 'differential_inference_risk', agora computado corretamente sobre
-- a partição completa em vez de um residual agregado.
--
-- Mantém a correção NULL-safe da versão anterior: `cohort_id = p_cohort_id`
-- nunca é verdadeira quando p_cohort_id é NULL (o "bucket sem coorte") — em
-- SQL, NULL = NULL não é TRUE. O GROUP BY cohort_id usado para enumerar os
-- segmentos já agrupa NULLs corretamente num único grupo (comportamento
-- padrão do Postgres), então essa parte não precisa de tratamento especial;
-- só a comparação pontual para extrair o v_n DESTA coorte específica precisa
-- da forma NULL-safe.

CREATE OR REPLACE FUNCTION public.aggregate_cohort_responses(
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
  v_k               CONSTANT INTEGER := 5;
  v_n               INTEGER;
  v_hidden_segments  INTEGER;
  v_visible_segments INTEGER;
  v_total_segments   INTEGER;
  v_means           JSONB;
BEGIN
  -- Escopo de tenant: inalterado.
  IF NOT EXISTS (
    SELECT 1 FROM public.waves w
    JOIN public.profiles p ON p.org_id = w.org_id
    WHERE w.id = p_wave_id AND p.id = auth.uid()
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TEXT, v_k,
                        NULL::JSONB, NULL::JSONB, NULL::JSONB, 'not_authorized'::TEXT;
    RETURN;
  END IF;

  -- Enumera TODOS os segmentos da onda (cada coorte distinta + o bucket sem
  -- coorte, agrupados por cohort_id — GROUP BY já trata todo NULL como um
  -- único grupo) numa única passada: é a PARTIÇÃO COMPLETA que a regra de
  -- supressão diferencial generalizada precisa examinar, não apenas "esta
  -- coorte vs. o resto somado".
  WITH segmentos AS (
    SELECT cohort_id, COUNT(*) AS n
      FROM public.wave_responses
     WHERE wave_id = p_wave_id
     GROUP BY cohort_id
  )
  SELECT
    COALESCE(SUM(n) FILTER (
      WHERE (cohort_id IS NULL AND p_cohort_id IS NULL) OR cohort_id = p_cohort_id
    ), 0),
    COUNT(*) FILTER (WHERE n < v_k),
    COUNT(*) FILTER (WHERE n >= v_k),
    COUNT(*)
    INTO v_n, v_hidden_segments, v_visible_segments, v_total_segments
    FROM segmentos;

  IF v_n < v_k THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, ('<' || v_k)::TEXT, v_k,
                        NULL::JSONB, NULL::JSONB, NULL::JSONB, 'privacy_threshold'::TEXT;
    RETURN;
  END IF;

  -- Supressão diferencial generalizada (P1 / TASK 10.1 §E): esta coorte tem
  -- n>=k_min por si só (chegamos até aqui), mas se exatamente UM segmento da
  -- onda inteira está oculto e TODOS os outros segmentos (incluindo este)
  -- estão visíveis, publicar este permite — combinado com os outros
  -- segmentos visíveis e o total da onda — derivar por subtração o valor
  -- exato do único segmento oculto, mesmo que ele apareça protegido quando
  -- perguntado direto.
  IF v_hidden_segments = 1 AND v_visible_segments = v_total_segments - 1 THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TEXT, v_k,
                        NULL::JSONB, NULL::JSONB, NULL::JSONB, 'differential_inference_risk'::TEXT;
    RETURN;
  END IF;

  SELECT jsonb_object_agg(item_key, media) INTO v_means
    FROM (
      SELECT kv.key AS item_key, ROUND(AVG((kv.value)::NUMERIC), 4) AS media
        FROM public.wave_responses r
        CROSS JOIN LATERAL jsonb_each_text(r.answers) AS kv(key, value)
       WHERE r.wave_id = p_wave_id
         AND ((p_cohort_id IS NULL AND r.cohort_id IS NULL) OR r.cohort_id = p_cohort_id)
       GROUP BY kv.key
    ) t;

  RETURN QUERY SELECT TRUE, v_n, v_n::TEXT, v_k,
                      v_means, NULL::JSONB, NULL::JSONB, NULL::TEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) IS
  'Resultado agregado de uma coorte para a organizacao. Abaixo de k_min=5 devolve visible=false, response_count NULL e response_count_label "<5". Tambem suprime (differential_inference_risk) QUALQUER coorte com n>=k_min quando, olhando a particao COMPLETA de segmentos da onda (todas as coortes + bucket sem coorte), exatamente UM segmento esta oculto e todos os demais estao visiveis -- nesse estado, publicar qualquer segmento visivel permite derivar o oculto por subtracao contra o total da onda. Nunca devolve resposta individual em hipotese alguma.';

-- ---------------------------------------------------------------------------
-- Verificação pós-migration
-- ---------------------------------------------------------------------------
-- Só metadados de catálogo, no mesmo padrão das demais migrations desta
-- linhagem (ex.: 20260730155000, 20260730150000) — nunca insere dado de
-- prova em tabela de produção real dentro de uma migration. A prova
-- comportamental de verdade (ataque de subtração tentado e recusado, com
-- dados sintéticos e limpeza, incluindo os arranjos multi-coorte exigidos
-- pela TASK 10.1 §E) vive em
-- supabase/tests/03_fibt_contract_convergence.sql, que só roda contra o
-- container descartável do replay (bun run db:replay) — nunca contra staging
-- nem produção.

DO $$
DECLARE
  v_oid OID := to_regprocedure('public.aggregate_cohort_responses(uuid,uuid)');
  v_def TEXT;
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'FALHA: aggregate_cohort_responses ausente após a migration';
  END IF;

  v_def := pg_get_functiondef(v_oid);

  IF v_def !~* 'differential_inference_risk' THEN
    RAISE EXCEPTION 'FALHA: aggregate_cohort_responses não referencia differential_inference_risk — supressão diferencial não aplicada';
  END IF;
  -- A regra tem que examinar a PARTIÇÃO COMPLETA de segmentos da onda
  -- (v_hidden_segments/v_visible_segments/v_total_segments), não apenas um
  -- residual agregado (v_residual) — essa era exatamente a insuficiência
  -- encontrada pelo red-team adversarial da TASK 10.1 §E: um residual
  -- agregado não distingue "3 coortes, 1 oculta" de "2 coortes".
  IF v_def !~* 'v_hidden_segments' OR v_def !~* 'v_visible_segments' OR v_def !~* 'v_total_segments' THEN
    RAISE EXCEPTION 'FALHA: aggregate_cohort_responses não examina a partição completa de segmentos da onda (regressão para o residual agregado insuficiente)';
  END IF;
  -- A comparação antiga `cohort_id = p_cohort_id` (sem tratamento de NULL)
  -- não pode mais ser o único predicado — precisa da forma NULL-safe.
  IF v_def !~* 'cohort_id\s+IS\s+NULL' THEN
    RAISE EXCEPTION 'FALHA: aggregate_cohort_responses não trata p_cohort_id NULL (bucket sem coorte) de forma NULL-safe';
  END IF;

  RAISE NOTICE 'PROVEN: aggregate_cohort_responses examina a partição completa de segmentos da onda (supressão diferencial generalizada, hiddenCount=1 && visibleCount=total-1) e trata cohort_id NULL — comportamento verificado em supabase/tests/03_fibt_contract_convergence.sql';
END $$;
