-- FIBT-1 / CONTRACT PRODUTIVO -- remocao do vinculo resposta -> convite
--
-- Encerra o ciclo EXPAND -> PROVE -> CONTRACT em PRODUCAO removendo
-- public.wave_responses.invite_token, a coluna que materializa no schema o
-- caminho resposta -> convite -> pessoa. Privacidade por desenho e nao
-- guardar a ligacao, nao esconde-la.
--
-- POR QUE UM ARQUIVO NOVO, E NAO A MIGRATION B DE STAGING
-- 20260730160000_drop_response_invite_link_contract.sql permanece IMUTAVEL.
-- As preconditions dela codificam o inventario do piloto sintetico de
-- staging: AFETADAS_ESPERADAS = 16 e uma lista fechada de duas organizacoes
-- 'a0000000-...'. Nenhum dos dois vale em producao. Nao e defeito -- e o
-- fail-closed recusando rodar num banco para o qual a autorizacao humana nao
-- foi dada.
--
-- BASELINE PRODUTIVO DESTA MIGRATION (FIBT-D2B, apos Pacotes 0/1/2/3/2A):
--   wave_responses            = 0 linhas
--   ondas COPSOQ legadas      = 3, todas sealed
--   convites legados          = 30, todos com expires_at preenchido e used_at NULL
--   submit_wave_response      = versao da Migration A, que NAO grava a coluna
--   aggregate_cohort_responses= contrato endurecido de 8 colunas
--   count_cohort_participation= instalada
--
-- REVERSIBILIDADE -- LEIA ANTES
-- Schema: reversivel (recriar coluna e FK).
-- Dados:  com wave_responses = 0 nao existe valor a perder. Esta e a razao
--         de aplicar o CONTRACT AGORA, com a tabela vazia, e nao depois de
--         a coleta real comecar. Se a precondition de 0 linhas falhar, a
--         migration aborta -- e ai a remocao passa a exigir snapshot.
--
-- SEM CASCADE, em lugar nenhum. DROP COLUMN sem CASCADE ja e fail-closed
-- contra view/matview dependente; a precondition de dependencias existe para
-- produzir DIAGNOSTICO em vez de um erro obscuro.

-- ===========================================================================
-- 1. PRECONDITIONS FAIL-CLOSED
-- ===========================================================================

DO $$
DECLARE
  ONDAS_LEGADAS CONSTANT UUID[] := ARRAY[
    '83c204a5-686c-4b0e-ad2b-405e12c67ae9'::UUID,
    'dbd534fe-ab7c-4f75-aa65-0f768195e4bb'::UUID,
    '851c9aa3-8556-4a02-ac23-ce68ceca7d14'::UUID
  ];
  ESPERADO_ONDAS    CONSTANT INTEGER := 3;
  ESPERADO_CONVITES CONSTANT INTEGER := 30;

  CONTRATO_AGREGACAO CONSTANT TEXT :=
    'TABLE(visible boolean, response_count integer, response_count_label text, '
    || 'k_min integer, item_means jsonb, factor_scores jsonb, domain_means jsonb, '
    || 'suppression_reason text)';

  v_respostas   INTEGER;
  v_ondas       INTEGER;
  v_convites    INTEGER;
  v_expirados   INTEGER;
  v_usados      INTEGER;
  v_dependentes TEXT;
  v_funcoes     TEXT;
  v_retorno     TEXT;
BEGIN
  -- --- 1.1 A tabela e a coluna precisam existir ---------------------------
  IF to_regclass('public.wave_responses') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: public.wave_responses nao existe.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='wave_responses'
                    AND column_name='invite_token') THEN
    RAISE EXCEPTION 'ABORTADO: wave_responses.invite_token nao existe -- o CONTRACT ja foi aplicado, ou este banco nao e o alvo desta migration.';
  END IF;

  -- --- 1.2 Tabela vazia: e o que torna a remocao sem perda de dado --------
  SELECT COUNT(*) INTO v_respostas FROM public.wave_responses;
  IF v_respostas <> 0 THEN
    RAISE EXCEPTION 'ABORTADO: wave_responses tem % linha(s); o baseline aprovado declara 0. Com linha existente a remocao passa a destruir vinculo e exige snapshot + nova autorizacao.', v_respostas;
  END IF;

  -- --- 1.3 Migration A integralmente presente -----------------------------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='wave_responses' AND column_name='cohort_id') THEN
    RAISE EXCEPTION 'ABORTADO: wave_responses.cohort_id ausente (Migration A nao aplicada).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='wave_responses' AND column_name='instrument') THEN
    RAISE EXCEPTION 'ABORTADO: wave_responses.instrument ausente (Migration A nao aplicada).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='wave_responses' AND column_name='instrument_version') THEN
    RAISE EXCEPTION 'ABORTADO: wave_responses.instrument_version ausente (Migration A nao aplicada).';
  END IF;
  IF to_regclass('public.wave_cohorts') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: public.wave_cohorts ausente (Migration A nao aplicada).';
  END IF;

  -- --- 1.4 Privacy hardening integralmente presente -----------------------
  IF to_regprocedure('public.count_cohort_participation(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: count_cohort_participation ausente (privacy hardening nao aplicado).';
  END IF;
  IF to_regprocedure('public.aggregate_cohort_responses(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: aggregate_cohort_responses ausente.';
  END IF;

  SELECT pg_get_function_result(to_regprocedure('public.aggregate_cohort_responses(uuid,uuid)'))
    INTO v_retorno;
  IF lower(regexp_replace(v_retorno, '\s+', ' ', 'g')) IS DISTINCT FROM lower(CONTRATO_AGREGACAO) THEN
    RAISE EXCEPTION 'ABORTADO: aggregate_cohort_responses nao esta no contrato endurecido de 8 colunas. Observado: %', v_retorno;
  END IF;

  -- --- 1.5 submit_wave_response na versao que NAO grava a coluna ----------
  IF to_regprocedure('public.submit_wave_response(uuid,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: submit_wave_response(uuid,text,jsonb) ausente.';
  END IF;
  IF pg_get_functiondef(to_regprocedure('public.submit_wave_response(uuid,text,jsonb)'))
       ~* 'INSERT\s+INTO\s+public\.wave_responses\s*\([^)]*\minvite_token\M' THEN
    RAISE EXCEPTION 'ABORTADO: submit_wave_response ainda nomeia invite_token no INSERT -- a versao da Migration A nao esta instalada.';
  END IF;

  -- --- 1.6 Nenhuma funcao pode referenciar a COLUNA -----------------------
  -- Nome de PARAMETRO nunca conta: \minvite_token\M nao casa p_invite_token.
  -- O PostgreSQL nao rastreia corpo de plpgsql como dependencia, entao um
  -- DROP COLUMN passaria e a funcao quebraria so em runtime. Esta e a
  -- precondition que impede exatamente isso -- foi ela que capturou
  -- submit_sector_response, que faz
  -- INSERT INTO public.wave_responses (wave_id, invite_token, answers).
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO v_funcoes
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND pg_get_functiondef(p.oid) ~* 'wave_responses'
     AND (
          pg_get_functiondef(p.oid) ~* 'INSERT\s+INTO\s+public\.wave_responses\s*\([^)]*\minvite_token\M'
       OR pg_get_functiondef(p.oid) ~* 'UPDATE\s+public\.wave_responses\s+SET[^;]*\minvite_token\M'
       OR pg_get_functiondef(p.oid) ~* 'SELECT[^;]*\minvite_token\M[^;]*FROM\s+public\.wave_responses'
       OR pg_get_functiondef(p.oid) ~* 'RETURNING[^;]*\minvite_token\M'
     );

  IF v_funcoes IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTADO: funcao(oes) ainda referenciam wave_responses.invite_token: %. Reescreva-as ANTES deste CONTRACT -- o DROP COLUMN nao seria bloqueado pelo PostgreSQL e elas quebrariam em runtime.', v_funcoes;
  END IF;

  -- --- 1.7 Nenhuma dependencia estrutural bloqueante ----------------------
  -- pg_depend por classid, referenciando o attnum EXATO da coluna. A FK
  -- proprio da coluna (deptype 'a'/interna) e removida junto com ela pelo
  -- proprio DROP COLUMN e por isso e classificada, nao bloqueante.
  SELECT string_agg(DISTINCT d.classid::regclass::TEXT, ', ') INTO v_dependentes
    FROM pg_depend d
    JOIN pg_attribute a
      ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
   WHERE d.refclassid = 'pg_class'::regclass
     AND d.refobjid   = 'public.wave_responses'::regclass
     AND a.attname    = 'invite_token'
     AND d.classid   <> 'pg_constraint'::regclass;

  IF v_dependentes IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTADO: dependencia estrutural sobre a coluna em %. Inventarie antes; CASCADE nao e permitido.', v_dependentes;
  END IF;

  -- --- 1.8 Ondas legadas seladas e convites inutilizados ------------------
  SELECT COUNT(*) INTO v_ondas
    FROM public.waves WHERE id = ANY (ONDAS_LEGADAS) AND status = 'sealed';
  IF v_ondas <> ESPERADO_ONDAS THEN
    RAISE EXCEPTION 'ABORTADO: % onda(s) legada(s) selada(s), esperado %.', v_ondas, ESPERADO_ONDAS;
  END IF;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE expires_at IS NOT NULL),
         COUNT(*) FILTER (WHERE used_at    IS NOT NULL)
    INTO v_convites, v_expirados, v_usados
    FROM public.wave_invites WHERE wave_id = ANY (ONDAS_LEGADAS);

  IF v_convites  <> ESPERADO_CONVITES THEN
    RAISE EXCEPTION 'ABORTADO: % convite(s) legado(s), esperado(s) %.', v_convites, ESPERADO_CONVITES;
  END IF;
  IF v_expirados <> ESPERADO_CONVITES THEN
    RAISE EXCEPTION 'ABORTADO: apenas % convite(s) com expires_at preenchido, esperado(s) %.', v_expirados, ESPERADO_CONVITES;
  END IF;
  IF v_usados <> 0 THEN
    RAISE EXCEPTION 'ABORTADO: % convite(s) legado(s) utilizados; o baseline aprovado declara 0.', v_usados;
  END IF;

  RAISE NOTICE 'Preconditions OK: wave_responses vazia, Migration A e hardening presentes, nenhuma funcao referencia a coluna, % ondas seladas, % convites expirados.', v_ondas, v_convites;
END $$;

-- ===========================================================================
-- 2. CONTRACT -- remocao do vinculo
-- ===========================================================================
-- Sem IF EXISTS: a precondition 1.1 ja provou que a coluna existe. Manter
-- IF EXISTS transformaria uma coluna obrigatoria ausente num no-op silencioso.
-- Sem CASCADE: a precondition 1.7 ja provou que nao ha dependente estrutural.
-- A FK wave_responses_invite_token_fkey e removida junto com a coluna pelo
-- proprio DROP COLUMN, que e o comportamento documentado do PostgreSQL para
-- constraints da propria coluna.

ALTER TABLE public.wave_responses DROP COLUMN invite_token;

COMMENT ON TABLE public.wave_responses IS
  'Conteudo anonimo de resposta. Sem policy de SELECT e sem GRANT de SELECT para anon/authenticated: nenhum papel cliente le resposta individual. Sem invite_token, sem email e sem FK para wave_invites -- a juncao resposta->participante NAO EXISTE no schema. Escrita apenas via submit_wave_response / submit_sector_response (SECURITY DEFINER). Leitura agregada apenas via aggregate_cohort_responses, com k-anon >= 5.';

-- ===========================================================================
-- 3. POS-CHECKS (dentro da transacao, antes do COMMIT)
-- ===========================================================================

DO $$
DECLARE
  ONDAS_LEGADAS CONSTANT UUID[] := ARRAY[
    '83c204a5-686c-4b0e-ad2b-405e12c67ae9'::UUID,
    'dbd534fe-ab7c-4f75-aa65-0f768195e4bb'::UUID,
    '851c9aa3-8556-4a02-ac23-ce68ceca7d14'::UUID
  ];
  CONTRATO_AGREGACAO CONSTANT TEXT :=
    'TABLE(visible boolean, response_count integer, response_count_label text, '
    || 'k_min integer, item_means jsonb, factor_scores jsonb, domain_means jsonb, '
    || 'suppression_reason text)';

  v_respostas INTEGER;
  v_convites  INTEGER;
  v_expirados INTEGER;
  v_usados    INTEGER;
  v_seladas   INTEGER;
  v_retorno   TEXT;
BEGIN
  IF to_regclass('public.wave_responses') IS NULL THEN
    RAISE EXCEPTION 'FALHA: wave_responses deixou de existir.';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='wave_responses' AND column_name='invite_token') THEN
    RAISE EXCEPTION 'FALHA: wave_responses.invite_token ainda existe.';
  END IF;

  -- Nenhuma FK de wave_responses pode alcancar wave_invites.
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
     WHERE c.conrelid  = 'public.wave_responses'::regclass
       AND c.contype   = 'f'
       AND c.confrelid = 'public.wave_invites'::regclass
  ) THEN
    RAISE EXCEPTION 'FALHA: ainda existe FK de wave_responses para wave_invites.';
  END IF;

  SELECT COUNT(*) INTO v_respostas FROM public.wave_responses;
  IF v_respostas <> 0 THEN RAISE EXCEPTION 'FALHA: wave_responses deixou de ser 0 (%).', v_respostas; END IF;

  FOR v_retorno IN SELECT unnest(ARRAY['cohort_id','instrument','instrument_version']) LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='wave_responses' AND column_name=v_retorno) THEN
      RAISE EXCEPTION 'FALHA: wave_responses.% sumiu.', v_retorno;
    END IF;
  END LOOP;

  IF to_regprocedure('public.submit_wave_response(uuid,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'FALHA: submit_wave_response desapareceu.';
  END IF;
  IF to_regprocedure('public.count_cohort_participation(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'FALHA: count_cohort_participation desapareceu.';
  END IF;

  SELECT pg_get_function_result(to_regprocedure('public.aggregate_cohort_responses(uuid,uuid)'))
    INTO v_retorno;
  IF lower(regexp_replace(v_retorno, '\s+', ' ', 'g')) IS DISTINCT FROM lower(CONTRATO_AGREGACAO) THEN
    RAISE EXCEPTION 'FALHA: contrato de aggregate_cohort_responses mudou. Observado: %', v_retorno;
  END IF;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE expires_at IS NOT NULL),
         COUNT(*) FILTER (WHERE used_at    IS NOT NULL)
    INTO v_convites, v_expirados, v_usados
    FROM public.wave_invites WHERE wave_id = ANY (ONDAS_LEGADAS);
  IF v_convites  <> 30 THEN RAISE EXCEPTION 'FALHA: % convite(s) preservado(s), esperado(s) 30.', v_convites; END IF;
  IF v_expirados <> 30 THEN RAISE EXCEPTION 'FALHA: apenas % convite(s) expirado(s).', v_expirados; END IF;
  IF v_usados    <> 0  THEN RAISE EXCEPTION 'FALHA: % convite(s) passaram a usados.', v_usados; END IF;

  SELECT COUNT(*) INTO v_seladas
    FROM public.waves WHERE id = ANY (ONDAS_LEGADAS) AND status = 'sealed';
  IF v_seladas <> 3 THEN RAISE EXCEPTION 'FALHA: % onda(s) legada(s) selada(s), esperado 3.', v_seladas; END IF;

  RAISE NOTICE 'CONTRACT produtivo concluido: nao existe caminho resposta -> convite -> pessoa no schema.';
END $$;
