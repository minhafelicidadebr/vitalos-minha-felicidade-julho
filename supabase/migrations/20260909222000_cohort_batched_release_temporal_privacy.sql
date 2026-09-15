-- P1 / TASK 10.1 §DECISÃO 1 — diferenciação TEMPORAL em aggregate_cohort_responses
--
-- ═══════════════════════════════════════════════════════════════════════════
-- PROBLEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- 20260909221000 fechou a diferenciação ENTRE COORTES (subtração contra o
-- total da onda). Não fechou a diferenciação TEMPORAL: a função recalculava
-- item_means AO VIVO em cada chamada. Duas chamadas sucessivas à MESMA coorte
-- enquanto ela cruza n=9 -> n=10 devolvem duas médias exatas, e
--     media_10 * 10 - media_9 * 9
-- é a resposta EXATA do respondente novo. k_min por snapshot é insuficiente:
-- os dois snapshots respeitam n>=5 individualmente e o vazamento acontece na
-- DIFERENÇA entre eles.
--
-- Rastreio de exposição (por que não há saída mais simples):
--   · A função é SECURITY DEFINER com GRANT EXECUTE TO authenticated. O
--     escopo de tenant é por PERTENCIMENTO à organização (join em profiles
--     por auth.uid()), não por papel administrativo — então QUALQUER membro
--     autenticado da organização dona da onda a invoca direto no PostgREST
--     (/rest/v1/rpc/aggregate_cohort_responses). Não é alcançável apenas pela
--     UI: o flag VITE_FIBT_PILOT_ENABLED é de build do cliente e não governa
--     o banco. Logo NÃO é possível provar o caminho inalcançável.
--   · Revogar EXECUTE de authenticated é proibido por invariante já aceito:
--     supabase/tests/02_definer_surface_and_grants.sql falha explicitamente
--     se authenticated perder esta função ("o painel FIB-T pararia").
--   · Não existe caminho persistido seguro de nível COORTE para redirecionar
--     os consumidores: wave_capsules é de nível ONDA (uma linha por wave_id,
--     sem item_means por coorte) e wave_cohorts é só metadado.
-- Portanto: menor mecanismo de publicação em lote PERSISTIDO, dentro da
-- assinatura existente. NENHUMA função nova é criada — a migration M6A
-- (20260901120000) ABORTA diante de qualquer função de public fora da sua
-- allowlist, e este arquivo respeita isso via CREATE OR REPLACE.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA A — MUTABILIDADE DE RESPOSTA => MARCA D'ÁGUA POR CONJUNTO
-- ═══════════════════════════════════════════════════════════════════════════
-- Rastreado: nenhum corpo de função SQL do repositório faz UPDATE ou DELETE
-- em wave_responses; anon/authenticated tiveram INSERT/UPDATE/DELETE
-- revogados (20260705160043) e SELECT revogado (20260725120000);
-- erase_my_assessments opera em personal_assessments, não aqui. Para o
-- CLIENTE, portanto, wave_responses é append-only e imutável.
-- MAS service_role mantém ALL (limpeza operacional/sintética faz DELETE de
-- fato). Sob DELETE, uma regra de contagem (live - publicado >= k) não é
-- suficiente: apagar linhas antigas e inserir novas pode manter o delta de
-- CONTAGEM alto enquanto o conjunto de contribuintes novos é pequeno.
-- Por isso a marca d'água é POR CONJUNTO, não por contagem:
-- published_response_ids guarda exatamente quais respostas entraram no
-- snapshot publicado, e "contribuintes novos" é a cardinalidade das respostas
-- atuais que NÃO estão nesse conjunto. Isso permanece correto sob DELETE,
-- UPDATE de answers e troca de cohort_id.
-- Os ids são chaves surrogadas anônimas: wave_responses não tem mais vínculo
-- com convite/pessoa (invite_token removido pelo CONTRACT), então guardá-los
-- não cria elo de identidade — e a tabela é inacessível a papel de cliente.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA B — MISSING_AS_ZERO=false => SUPRESSÃO POR ITEM
-- ═══════════════════════════════════════════════════════════════════════════
-- Rastreado: NÃO existe constraint de banco garantindo as 32 respostas por
-- submissão (zero CHECK sobre `answers`). A completude é validada somente em
-- TypeScript (validateBlindSubmission -> item_set_mismatch), e a própria
-- suíte 03 insere respostas parciais. Logo o banco não pode assumir que todo
-- item tem os mesmos contribuintes. Cada item é liberado individualmente e
-- só quando tem >= k_min contribuintes TOTAIS **e** >= k_min contribuintes
-- NOVOS desde o último snapshot. Um item sem contribuintes novos suficientes
-- simplesmente não entra no snapshot — nunca é publicado com média que possa
-- mover por menos de k_min pessoas. MISSING_AS_ZERO continua false: item
-- ausente na resposta não conta como zero, apenas não contribui.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA D — BOOTSTRAP DA PRIMEIRA PUBLICAÇÃO
-- ═══════════════════════════════════════════════════════════════════════════
-- Antes desta migration a função liberava médias AO VIVO. Se alguém já tivesse
-- observado o estado ao vivo em n=9, a PRIMEIRA publicação persistida em n=10
-- seria diferenciável contra essa observação histórica por 1 pessoa. Não é
-- suficiente assumir "não houve observação".
-- Mitigação: a migration SEMEIA o estado atual como snapshot já publicado
-- para todo segmento que hoje tem n >= k_min (ou seja, exatamente os
-- segmentos cujo agregado já era observável). A partir daí, qualquer release
-- novo exige k_min contribuintes NOVOS em relação ao que já era observável —
-- o degrau de 1 pessoa deixa de existir mesmo com histórico observado.
-- Segmentos com n < k_min não são semeados porque nada deles era observável
-- (a função já devolvia privacy_threshold); o primeiro release deles exigirá
-- n >= k_min, o que não revela indivíduo.
-- Em produção o inventário é 0 respostas (3 ondas legadas seladas, 30
-- convites, 0 respostas), então a semeadura é comprovadamente no-op ali — e o
-- bloco reporta quantas linhas semeou, sem depender dessa suposição.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Persistência da publicação em lote (nível COORTE)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cohort_capsules (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES public.organizations(id),
  wave_id                 UUID NOT NULL REFERENCES public.waves(id),
  -- NULL = bucket "sem coorte" da onda. É um segmento legítimo e precisa de
  -- publicação própria, por isso a coluna é anulável.
  cohort_id               UUID,
  -- NULL = linha de BASELINE (marca d'água registrada, NADA publicado ainda).
  -- Ver PROVA D: o bootstrap NÃO pode tornar observável o agregado exato
  -- corrente só porque n >= k_min.
  published_response_count INTEGER,
  -- Marca d'água POR CONJUNTO (PROVA A) — quais respostas já estão
  -- contabilizadas (seja como baseline não publicado, seja como snapshot
  -- publicado). Robusta a DELETE/UPDATE/troca de coorte.
  published_response_ids  UUID[] NOT NULL,
  -- NULL = nada observável ainda (baseline). Quando não-nulo, contém somente
  -- itens que passaram o gate de contribuintes (PROVA B).
  item_means              JSONB,
  published_at            TIMESTAMPTZ,
  CONSTRAINT cohort_capsules_count_nonneg CHECK (published_response_count >= 0),
  -- A coorte tem de pertencer À MESMA onda (mesma disciplina de FK composta
  -- de wave_invites/wave_responses).
  CONSTRAINT cohort_capsules_cohort_wave_fk
    FOREIGN KEY (cohort_id, wave_id) REFERENCES public.wave_cohorts(id, wave_id)
);

-- Unicidade do segmento. Par de índices parciais em vez de
-- UNIQUE NULLS NOT DISTINCT: não depende de PostgreSQL >= 15 e trata o bucket
-- sem coorte de forma explícita.
CREATE UNIQUE INDEX IF NOT EXISTS cohort_capsules_wave_cohort_uk
  ON public.cohort_capsules (wave_id, cohort_id) WHERE cohort_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cohort_capsules_wave_nocohort_uk
  ON public.cohort_capsules (wave_id) WHERE cohort_id IS NULL;

COMMENT ON TABLE public.cohort_capsules IS
  'Snapshot PUBLICADO do agregado de uma coorte (ou do bucket sem coorte) de uma onda. Existe para impedir diferenciacao TEMPORAL: a media so muda quando ha >= k_min contribuintes NOVOS desde o snapshot anterior. Acessivel exclusivamente por aggregate_cohort_responses (SECURITY DEFINER); nenhum papel de cliente le esta tabela.';
COMMENT ON COLUMN public.cohort_capsules.published_response_ids IS
  'Marca dagua por CONJUNTO: ids anonimos das respostas incluidas no snapshot. Permite exigir k_min contribuintes NOVOS mesmo sob DELETE/UPDATE (uma regra de contagem seria burlavel). Nao ha vinculo com pessoa: wave_responses nao guarda mais invite_token.';

-- Fecha a tabela para papel de cliente. OBRIGATÓRIO e não redundante: a conta
-- deste projeto tem ALTER DEFAULT PRIVILEGES concedendo ALL em TABLES para
-- anon/authenticated/service_role (drift real reproduzido em
-- supabase/local/00_platform_shim.sql), então tabela nova NASCE ABERTA.
REVOKE ALL ON public.cohort_capsules FROM PUBLIC, anon, authenticated;
-- service_role recebe só o que a operação genuinamente exige: a função roda
-- como DEFINER (owner) e não depende deste grant; ele existe para manutenção
-- operacional e para as provas em supabase/tests.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohort_capsules TO service_role;

-- RLS ligada e NENHUMA policy: fail-closed por construção para qualquer papel
-- que não seja owner/service_role.
ALTER TABLE public.cohort_capsules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS cohort_capsules_org_idx ON public.cohort_capsules (org_id);

-- ---------------------------------------------------------------------------
-- 2. aggregate_cohort_responses — leitor com publicação em lote
-- ---------------------------------------------------------------------------
-- Contrato de retorno INALTERADO (mesmas 8 colunas, mesmos tipos, mesmos
-- nomes) — o consumidor real (src/lib/api/fibt-cohort.functions.ts) não muda.
-- O que muda: os valores liberados vêm SEMPRE do snapshot publicado, nunca do
-- cálculo ao vivo.

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
  v_k                CONSTANT INTEGER := 5;
  v_org              UUID;
  v_n                INTEGER;
  v_hidden_segments  INTEGER;
  v_visible_segments INTEGER;
  v_total_segments   INTEGER;
  v_pub_ids          UUID[];
  v_pub_count        INTEGER;
  v_pub_means        JSONB;
  v_tem_linha        BOOLEAN := FALSE;
  v_tem_publicado    BOOLEAN := FALSE;
  v_novos            INTEGER;
  v_ids_atuais       UUID[];
  v_means_novo       JSONB;
BEGIN
  -- ── Escopo de tenant (inalterado, dentro da RPC) ────────────────────────
  -- Exige identidade organizacional real: service_role puro (auth.uid() NULL)
  -- não recebe nada. Comportamento pré-existente, agora explicitamente
  -- coberto por teste.
  SELECT w.org_id INTO v_org
    FROM public.waves w
    JOIN public.profiles p ON p.org_id = w.org_id
   WHERE w.id = p_wave_id AND p.id = auth.uid()
   LIMIT 1;

  IF v_org IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TEXT, v_k,
                        NULL::JSONB, NULL::JSONB, NULL::JSONB, 'not_authorized'::TEXT;
    RETURN;
  END IF;

  -- ── Partição completa de segmentos (supressão diferencial de 221000) ────
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

  IF v_hidden_segments = 1 AND v_visible_segments = v_total_segments - 1 THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TEXT, v_k,
                        NULL::JSONB, NULL::JSONB, NULL::JSONB, 'differential_inference_risk'::TEXT;
    RETURN;
  END IF;

  -- ── Serialização da publicação deste segmento ───────────────────────────
  -- Chave de lock DETERMINÍSTICA e ESCOPADA AO SEGMENTO: derivada apenas de
  -- (p_wave_id, p_cohort_id), com sentinela textual para o bucket sem coorte
  -- (COALESCE evita que NULL torne a chave inteira NULL). Duas chamadas
  -- concorrentes para o MESMO segmento serializam; segmentos diferentes não
  -- se bloqueiam entre si, salvo colisão de hash — que só custa
  -- serialização extra, nunca correção: a correção é garantida pelos índices
  -- únicos parciais + o SELECT ... FOR UPDATE abaixo.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_wave_id::TEXT || '|' || COALESCE(p_cohort_id::TEXT, '@sem-coorte'), 0)
  );

  SELECT c.published_response_ids, c.published_response_count, c.item_means
    INTO v_pub_ids, v_pub_count, v_pub_means
    FROM public.cohort_capsules c
   WHERE c.wave_id = p_wave_id
     AND ((p_cohort_id IS NULL AND c.cohort_id IS NULL) OR c.cohort_id = p_cohort_id)
   FOR UPDATE;

  v_tem_linha := FOUND;
  IF NOT v_tem_linha THEN
    v_pub_ids := '{}'::UUID[];
    v_pub_count := NULL;
    v_pub_means := NULL;
  END IF;
  -- Uma linha de BASELINE (item_means NULL) conta como marca d'água mas NÃO
  -- como algo observável: enquanto não houver k_min contribuintes novos sobre
  -- ela, o resultado é indisponível fail-closed. É isso que impede o bootstrap
  -- de expor n=10 contra uma observação histórica de n=9 (PROVA D).
  v_tem_publicado := v_pub_means IS NOT NULL;

  -- Contribuintes NOVOS por CONJUNTO (PROVA A) — não é live - publicado.
  SELECT COALESCE(array_agg(r.id), '{}'::UUID[]),
         COUNT(*) FILTER (WHERE r.id <> ALL (v_pub_ids))
    INTO v_ids_atuais, v_novos
    FROM public.wave_responses r
   WHERE r.wave_id = p_wave_id
     AND ((p_cohort_id IS NULL AND r.cohort_id IS NULL) OR r.cohort_id = p_cohort_id);

  -- ── Decisão de publicação ───────────────────────────────────────────────
  IF v_novos >= v_k THEN
    -- Médias por item, liberadas item a item (PROVA B): cada item precisa de
    -- >= k_min contribuintes TOTAIS e >= k_min contribuintes NOVOS.
    WITH atual AS (
      SELECT r.id AS resposta_id, kv.key AS item_key, (kv.value)::NUMERIC AS valor
        FROM public.wave_responses r
        CROSS JOIN LATERAL jsonb_each_text(r.answers) AS kv(key, value)
       WHERE r.wave_id = p_wave_id
         AND ((p_cohort_id IS NULL AND r.cohort_id IS NULL) OR r.cohort_id = p_cohort_id)
    ),
    por_item AS (
      SELECT item_key,
             COUNT(*) AS contribuintes_total,
             COUNT(*) FILTER (WHERE resposta_id <> ALL (v_pub_ids)) AS contribuintes_novos,
             ROUND(AVG(valor), 4) AS media
        FROM atual
       GROUP BY item_key
    )
    SELECT jsonb_object_agg(item_key, media)
      INTO v_means_novo
      FROM por_item
     WHERE contribuintes_total >= v_k
       AND contribuintes_novos >= v_k;

    IF v_means_novo IS NULL OR v_means_novo = '{}'::JSONB THEN
      -- Nenhum item alcança o limiar de contribuintes. Fail-closed: não
      -- publica agregado vazio nem inventa valor.
      IF v_tem_publicado THEN
        RETURN QUERY SELECT TRUE, v_pub_count, v_pub_count::TEXT, v_k,
                            v_pub_means, NULL::JSONB, NULL::JSONB, NULL::TEXT;
      ELSE
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TEXT, v_k,
                            NULL::JSONB, NULL::JSONB, NULL::JSONB,
                            'item_level_insufficient_contributors'::TEXT;
      END IF;
      RETURN;
    END IF;

    -- Publicação ATÔMICA: contagem, conjunto e médias na MESMA linha, numa
    -- única instrução. Consumidor nunca vê contagem de um release com médias
    -- de outro.
    IF v_tem_linha THEN
      UPDATE public.cohort_capsules
         SET published_response_count = v_n,
             published_response_ids = v_ids_atuais,
             item_means = v_means_novo,
             published_at = NOW()
       WHERE wave_id = p_wave_id
         AND ((p_cohort_id IS NULL AND cohort_id IS NULL) OR cohort_id = p_cohort_id);
    ELSE
      INSERT INTO public.cohort_capsules
        (org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means, published_at)
      VALUES (v_org, p_wave_id, p_cohort_id, v_n, v_ids_atuais, v_means_novo, NOW());
    END IF;

    v_pub_count := v_n;
    v_pub_means := v_means_novo;
    v_tem_publicado := TRUE;
  END IF;

  -- ── Liberação: SEMPRE o snapshot publicado, nunca o estado ao vivo ──────
  IF NOT v_tem_publicado THEN
    -- Ainda não há release seguro para este segmento: estado indisponível
    -- fail-closed. Nunca devolve o agregado ao vivo.
    RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::TEXT, v_k,
                        NULL::JSONB, NULL::JSONB, NULL::JSONB,
                        'awaiting_batched_release'::TEXT;
    RETURN;
  END IF;

  -- response_count e response_count_label refletem o PUBLICADO (v_pub_count),
  -- nunca v_n: é isso que impede a contagem de vazar o delta pequeno.
  RETURN QUERY SELECT TRUE, v_pub_count, v_pub_count::TEXT, v_k,
                      v_pub_means, NULL::JSONB, NULL::JSONB, NULL::TEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) IS
  'Resultado agregado PUBLICADO de uma coorte. Nunca devolve calculo ao vivo: a media/contagem liberadas vem de cohort_capsules e so avancam quando ha >= k_min=5 contribuintes NOVOS (marca dagua por CONJUNTO, robusta a DELETE/UPDATE) desde o snapshot anterior, com cada item liberado apenas se tiver >= k_min contribuintes totais E novos. Mantem a supressao diferencial entre coortes (differential_inference_risk) e o limiar privacy_threshold. Nunca devolve resposta individual.';

-- ---------------------------------------------------------------------------
-- 3. Bootstrap (PROVA D) — semeia o que já era observável
-- ---------------------------------------------------------------------------

DO $bootstrap$
DECLARE
  v_k         CONSTANT INTEGER := 5;
  v_semeados  INTEGER := 0;
  v_respostas INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_respostas FROM public.wave_responses;

  -- BASELINE, NÃO PUBLICAÇÃO. published_response_count e item_means ficam
  -- NULL de propósito: registrar a marca d'água NÃO torna nada observável.
  -- Publicar aqui o agregado exato corrente seria o próprio ataque — o
  -- atacante que observou n=9 ao vivo antes da migration derivaria 1
  -- respondente de uma publicação imediata em n=10. A primeira publicação
  -- observável exigirá k_min contribuintes NOVOS sobre este baseline (e, por
  -- item, k_min contribuintes novos naquele item).
  INSERT INTO public.cohort_capsules
    (org_id, wave_id, cohort_id, published_response_count, published_response_ids, item_means, published_at)
  SELECT w.org_id,
         s.wave_id,
         s.cohort_id,
         NULL::INTEGER,
         s.ids,
         NULL::JSONB,
         NULL::TIMESTAMPTZ
    FROM (
      SELECT r.wave_id,
             r.cohort_id,
             COUNT(*) AS n,
             array_agg(r.id) AS ids
        FROM public.wave_responses r
       GROUP BY r.wave_id, r.cohort_id
      HAVING COUNT(*) >= v_k
    ) s
    JOIN public.waves w ON w.id = s.wave_id
   WHERE NOT EXISTS (
     SELECT 1 FROM public.cohort_capsules c
      WHERE c.wave_id = s.wave_id
        AND ((s.cohort_id IS NULL AND c.cohort_id IS NULL) OR c.cohort_id = s.cohort_id)
   );

  GET DIAGNOSTICS v_semeados = ROW_COUNT;

  -- Invariante do bootstrap: nenhuma linha semeada pode estar publicada.
  IF EXISTS (SELECT 1 FROM public.cohort_capsules WHERE item_means IS NOT NULL) THEN
    RAISE EXCEPTION 'FALHA: o bootstrap publicou agregado (item_means não nulo) — isso reabriria a diferenciação contra observação histórica ao vivo';
  END IF;

  RAISE NOTICE 'Bootstrap de cohort_capsules: % baseline(s) NAO PUBLICADO(S) registrado(s) a partir de % resposta(s) existente(s). Nada se tornou observavel: a primeira publicacao exige k_min contribuintes NOVOS sobre o baseline.',
    v_semeados, v_respostas;
END
$bootstrap$;

-- ---------------------------------------------------------------------------
-- 4. Verificação pós-migration (catálogo — comportamento vive em supabase/tests)
-- ---------------------------------------------------------------------------

DO $postflight$
DECLARE
  v_oid    OID := to_regprocedure('public.aggregate_cohort_responses(uuid,uuid)');
  v_def    TEXT;
  v_falhas TEXT[] := '{}';
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'FALHA: aggregate_cohort_responses ausente após a migration';
  END IF;
  v_def := pg_get_functiondef(v_oid);

  -- Publicação em lote presente e lendo do snapshot persistido.
  IF v_def !~* 'cohort_capsules' THEN
    v_falhas := v_falhas || 'a função não consulta cohort_capsules (release ao vivo ainda possível)';
  END IF;
  IF v_def !~* 'published_response_ids' THEN
    v_falhas := v_falhas || 'a função não usa marca d''água por conjunto (PROVA A)';
  END IF;
  IF v_def !~* 'contribuintes_novos' THEN
    v_falhas := v_falhas || 'a função não faz gate por item (PROVA B)';
  END IF;
  IF v_def !~* 'pg_advisory_xact_lock' THEN
    v_falhas := v_falhas || 'a publicação não é serializada (concorrência)';
  END IF;
  -- PROVA D: baseline tem de ser distinguível de publicado, e baseline não
  -- pode ser observável.
  IF v_def !~* 'v_tem_publicado' THEN
    v_falhas := v_falhas || 'a função não distingue baseline de snapshot publicado (PROVA D)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='cohort_capsules'
       AND column_name IN ('published_response_count','item_means')
       AND is_nullable = 'NO'
  ) THEN
    v_falhas := v_falhas || 'published_response_count/item_means não são anuláveis — baseline não publicado seria impossível';
  END IF;
  -- Supressões herdadas de 221000 não podem ter regredido.
  IF v_def !~* 'differential_inference_risk' OR v_def !~* 'v_hidden_segments' THEN
    v_falhas := v_falhas || 'a supressão diferencial entre coortes regrediu';
  END IF;
  IF v_def !~* 'cohort_id\s+IS\s+NULL' THEN
    v_falhas := v_falhas || 'o bucket sem coorte deixou de ser NULL-safe';
  END IF;
  -- search_path endurecido na DEFINER.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
     WHERE p.oid = v_oid AND p.prosecdef
       AND array_to_string(p.proconfig, ',') LIKE '%search_path=public%'
  ) THEN
    v_falhas := v_falhas || 'a função perdeu SECURITY DEFINER com search_path fixo';
  END IF;

  -- Tabela fechada a papel de cliente.
  IF has_table_privilege('anon', 'public.cohort_capsules', 'SELECT')
     OR has_table_privilege('authenticated', 'public.cohort_capsules', 'SELECT') THEN
    v_falhas := v_falhas || 'papel de cliente tem SELECT em cohort_capsules';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.cohort_capsules'::regclass) THEN
    v_falhas := v_falhas || 'RLS desligada em cohort_capsules';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cohort_capsules') THEN
    v_falhas := v_falhas || 'existe policy em cohort_capsules (deveria ser fail-closed sem policy)';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FALHA: release em lote de coorte:\n  - %', array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: aggregate_cohort_responses libera somente snapshot publicado (cohort_capsules), com marca d''água por conjunto, gate por item, lock de segmento e supressões de 221000 preservadas; tabela fail-closed para papel de cliente.';
END
$postflight$;

COMMIT;
