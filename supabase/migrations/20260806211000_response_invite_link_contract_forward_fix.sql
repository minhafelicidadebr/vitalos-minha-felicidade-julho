-- FIBT / CONTRACT — remoção do vínculo resposta → convite (FORWARD FIX)
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ESTA MIGRATION EXISTE
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 20260806210000_drop_response_invite_link_contract_production.sql NUNCA rodou
-- com sucesso, em nenhum banco. A precondition 1.6 dela procura funções que
-- dependem de wave_responses.invite_token assim:
--
--     SELECT ... FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--      WHERE n.nspname = 'public' AND pg_get_functiondef(p.oid) ~* '...'
--
-- O planejador empurra o qual de `pg_get_functiondef` para o scan de pg_proc,
-- antes do join que restringiria ao schema public. `pg_get_functiondef` recusa
-- funções agregadas, então a primeira agregada do pg_catalog aborta a
-- transação com `"array_agg" is an aggregate function`. Reproduzido num
-- PostgreSQL 17 VAZIO, sem nenhum objeto deste projeto: não é dependência de
-- plano, de estatística nem de dado. Aborta sempre.
--
-- CONSEQUÊNCIA, e é ela que justifica esta migration: a próxima da cadeia,
-- 20260807120000_sector_response_consent_durability.sql, tem como precondition
-- que `wave_responses.invite_token` NÃO exista mais. Com o CONTRACT abortando,
-- a durabilidade de consentimento fica bloqueada — o que é coerente com a
-- evidência produtiva de que consent_version e consent_accepted_at estão
-- ausentes em produção. O CONTRACT é o pré-requisito que faltava.
--
-- A migration original permanece IMUTÁVEL no repositório: o hash dela está no
-- manifesto verificável e citado em documento de prova já emitido. Corrigir
-- para frente preserva a cadeia de custódia; reescrever histórico não.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE FAZ
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Remove public.wave_responses.invite_token e a FK para wave_invites,
-- eliminando do SCHEMA o caminho resposta → convite → e-mail → pessoa.
-- Privacidade por desenho é não guardar a ligação, não escondê-la de quem lê
-- a interface.
--
-- IDEMPOTENTE, deliberadamente. Não se sabe, sem preflight no alvo, se alguém
-- aplicou o DROP manualmente statement a statement depois de a precondition
-- ter falhado. Uma migration que exige "a coluna existe" transformaria essa
-- incerteza em incidente no meio da janela de mudança. Aqui, coluna ausente é
-- sucesso: o estado desejado já vale.
--
-- FAIL-CLOSED ONDE IMPORTA. A remoção só é livre de perda de dado enquanto
-- nenhuma resposta tiver invite_token preenchido. Se houver, esta migration
-- ABORTA e informa a contagem: destruir vínculo de resposta existente exige
-- snapshot e autorização humana nova, não uma migration automática.
--
-- SEM CASCADE, em lugar nenhum.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. PRECONDITIONS FAIL-CLOSED
-- ---------------------------------------------------------------------------

DO $preflight$
DECLARE
  v_ja_removida  BOOLEAN;
  v_com_vinculo  INTEGER;
  v_funcoes      TEXT;
  v_policies     TEXT;
  v_dependentes  TEXT;
BEGIN
  IF to_regclass('public.wave_responses') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: public.wave_responses não existe.';
  END IF;

  v_ja_removida := NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'wave_responses'
       AND column_name = 'invite_token'
  );

  PERFORM set_config('fibt.contract_ja_removida', v_ja_removida::TEXT, true);

  IF v_ja_removida THEN
    RAISE NOTICE 'CONTRACT já aplicado neste banco: wave_responses.invite_token ausente. Nada a remover.';
    RETURN;
  END IF;

  -- 1.1 Perda de dado: só prossegue com a coluna integralmente vazia.
  SELECT COUNT(*) INTO v_com_vinculo
    FROM public.wave_responses WHERE invite_token IS NOT NULL;

  IF v_com_vinculo > 0 THEN
    RAISE EXCEPTION 'ABORTADO: % resposta(s) com invite_token preenchido. Remover a coluna destruiria esse vínculo de forma irreversível — exige snapshot verificado e autorização humana específica, não esta migration.',
      v_com_vinculo;
  END IF;

  -- 1.2 Nenhuma função pode referenciar a COLUNA.
  --
  -- O PostgreSQL não rastreia corpo de plpgsql como dependência: um DROP
  -- COLUMN passaria e a função quebraria só em runtime, no primeiro
  -- respondente. Esta é a precondition que impede isso — e é a que a versão
  -- anterior tentou escrever.
  --
  -- CTE MATERIALIZED é o que conserta o defeito: força a resolução do schema
  -- ANTES de `pg_get_functiondef` ser chamada, de modo que a função nunca é
  -- aplicada a agregadas do pg_catalog. O filtro prokind ∈ (f,p) é a segunda
  -- camada: exclui agregadas ('a') e window ('w'), justamente as que
  -- pg_get_functiondef recusa.
  WITH publicas AS MATERIALIZED (
    SELECT p.oid, p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind IN ('f', 'p')
  )
  SELECT string_agg(proname, ', ' ORDER BY proname) INTO v_funcoes
    FROM publicas
   WHERE pg_get_functiondef(oid) ~* 'wave_responses'
     AND (
          pg_get_functiondef(oid) ~* 'INSERT\s+INTO\s+public\.wave_responses\s*\([^)]*\minvite_token\M'
       OR pg_get_functiondef(oid) ~* 'UPDATE\s+public\.wave_responses\s+SET[^;]*\minvite_token\M'
       OR pg_get_functiondef(oid) ~* 'SELECT[^;]*\minvite_token\M[^;]*FROM\s+public\.wave_responses'
       OR pg_get_functiondef(oid) ~* 'RETURNING[^;]*\minvite_token\M'
     );

  IF v_funcoes IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTADO: função(ões) ainda referenciam wave_responses.invite_token: %. Reescreva-as ANTES do CONTRACT.',
      v_funcoes;
  END IF;

  -- 1.3 Nenhuma policy pode depender da coluna.
  SELECT string_agg(policyname, ', ' ORDER BY policyname) INTO v_policies
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'wave_responses'
     AND COALESCE(qual, '') || ' ' || COALESCE(with_check, '') ~* '\minvite_token\M';

  IF v_policies IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTADO: policy(ies) dependem de invite_token: %.', v_policies;
  END IF;

  -- 1.4 Nenhuma dependência estrutural bloqueante (view, matview, índice de
  -- outra origem). A FK própria da coluna é removida junto pelo DROP COLUMN e
  -- por isso pg_constraint fica de fora — sem CASCADE em lugar nenhum.
  SELECT string_agg(DISTINCT d.classid::regclass::TEXT, ', ') INTO v_dependentes
    FROM pg_depend d
    JOIN pg_attribute a
      ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
   WHERE d.refclassid = 'pg_class'::regclass
     AND d.refobjid   = 'public.wave_responses'::regclass
     AND a.attname    = 'invite_token'
     AND d.classid   <> 'pg_constraint'::regclass;

  IF v_dependentes IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTADO: dependência estrutural sobre a coluna em %. Inventarie antes; CASCADE não é permitido.',
      v_dependentes;
  END IF;

  RAISE NOTICE 'Preconditions OK: coluna vazia, sem função, policy ou dependência estrutural apontando para ela.';
END
$preflight$;

-- ---------------------------------------------------------------------------
-- 2. CONTRACT
-- ---------------------------------------------------------------------------

DO $contract$
DECLARE
  v_fk TEXT;
BEGIN
  IF current_setting('fibt.contract_ja_removida', true) = 'true' THEN
    RETURN;
  END IF;

  -- A FK é derrubada explicitamente e por NOME DESCOBERTO, não fixado: o nome
  -- gerado depende de como a coluna nasceu em cada ambiente, e um DROP
  -- CONSTRAINT com nome chutado falharia justamente no ambiente que importa.
  SELECT conname INTO v_fk
    FROM pg_constraint c
   WHERE c.conrelid = 'public.wave_responses'::regclass
     AND c.contype = 'f'
     AND c.confrelid = 'public.wave_invites'::regclass
   LIMIT 1;

  IF v_fk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.wave_responses DROP CONSTRAINT %I', v_fk);
    RAISE NOTICE 'FK removida: %.', v_fk;
  END IF;

  ALTER TABLE public.wave_responses DROP COLUMN invite_token;
  RAISE NOTICE 'Coluna wave_responses.invite_token removida.';
END
$contract$;

COMMENT ON TABLE public.wave_responses IS
  'Conteudo anonimo de resposta. Sem policy de SELECT e sem GRANT de SELECT para anon/authenticated: nenhum papel cliente le resposta individual. Sem invite_token e sem FK para wave_invites -- a juncao resposta->participante NAO EXISTE no schema. Escrita apenas via submit_wave_response / submit_sector_response (SECURITY DEFINER). Leitura agregada apenas via aggregate_cohort_responses, com k-anon >= 5.';

-- ---------------------------------------------------------------------------
-- 3. POSTCONDITIONS
-- ---------------------------------------------------------------------------
--
-- Valem igual nos dois caminhos (removeu agora, ou já estava removida): o que
-- se afirma é o ESTADO FINAL, não o trajeto.

DO $postflight$
DECLARE
  v_funcoes TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'wave_responses'
       AND column_name = 'invite_token'
  ) THEN
    RAISE EXCEPTION 'FALHA: wave_responses.invite_token ainda existe.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.wave_responses'::regclass
       AND contype = 'f'
       AND confrelid = 'public.wave_invites'::regclass
  ) THEN
    RAISE EXCEPTION 'FALHA: ainda existe FK de wave_responses para wave_invites.';
  END IF;

  -- Mesma varredura da precondition 1.2, agora como garantia de saída: nenhuma
  -- função ficou apontando para uma coluna que não existe mais.
  WITH publicas AS MATERIALIZED (
    SELECT p.oid, p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind IN ('f', 'p')
  )
  SELECT string_agg(proname, ', ' ORDER BY proname) INTO v_funcoes
    FROM publicas
   WHERE pg_get_functiondef(oid) ~* 'wave_responses'
     AND pg_get_functiondef(oid) ~* 'INSERT\s+INTO\s+public\.wave_responses\s*\([^)]*\minvite_token\M';

  IF v_funcoes IS NOT NULL THEN
    RAISE EXCEPTION 'FALHA: função(ões) % nomeiam uma coluna inexistente.', v_funcoes;
  END IF;

  -- Sanidade do fail-closed de leitura: nenhum papel cliente lê resposta.
  IF has_table_privilege('anon', 'public.wave_responses', 'SELECT')
     OR has_table_privilege('authenticated', 'public.wave_responses', 'SELECT') THEN
    RAISE EXCEPTION 'FALHA: papel cliente recuperou SELECT em wave_responses.';
  END IF;

  RAISE NOTICE 'PROVEN: vinculo resposta->convite removido do schema; nenhuma funcao, policy ou FK remanescente.';
END
$postflight$;

COMMIT;
