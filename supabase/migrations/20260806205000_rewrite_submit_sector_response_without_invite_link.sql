-- FIBT-1 / PACOTE 3A -- remove a dependencia de runtime da coluna legada
--
-- POR QUE EXISTE
-- submit_sector_response, criada em 20260708120000_sector_links.sql, faz
--   INSERT INTO public.wave_responses (wave_id, invite_token, answers)
-- nomeando a coluna que o CONTRACT produtivo remove. O PostgreSQL NAO
-- rastreia corpo de plpgsql como dependencia: o DROP COLUMN passaria e esta
-- funcao quebraria so em runtime, no primeiro link setorial usado. Por isso
-- a reescrita vem ANTES, em migration propria, e nao embutida no CONTRACT.
--
-- ESCOPO -- a UNICA mudanca funcional e eliminar a referencia a coluna.
-- Preservados sem alteracao: assinatura (TEXT, JSONB), tipo de retorno,
-- SECURITY DEFINER, search_path, ordem e semantica das validacoes, e os
-- QUATRO codigos de motivo exatos: invalid_token, link_revoked, link_expired,
-- wave_not_open.
--
-- NAO copia do dataset de staging. A Migration B de staging tambem reescreve
-- esta funcao, mas la ela TROCA os motivos para 'revoked' e 'expired'. Aqui
-- isso seria uma mudanca de contrato: sector-link.server.ts repassa
-- `outcome?.reason` adiante sem traduzir, entao renomear altera o que chega a
-- interface. Os nomes originais ficam.
--
-- ACL: nenhum GRANT ou REVOKE nesta migration. CREATE OR REPLACE preserva a
-- ACL vigente, e o pos-check compara antes x depois para provar isso.

-- ---------------------------------------------------------------------------
-- 0. Captura da ACL vigente (local a transacao, nao cria objeto)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_oid OID := to_regprocedure('public.submit_sector_response(text,jsonb)');
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: submit_sector_response(text,jsonb) nao existe -- esta migration substitui uma funcao existente, nao cria uma nova.';
  END IF;

  PERFORM set_config(
    'fibt.sector_acl_before',
    COALESCE((SELECT proacl::TEXT FROM pg_proc WHERE oid = v_oid), ''),
    true
  );
  PERFORM set_config(
    'fibt.sector_owner_before',
    (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid = v_oid),
    true
  );
END $$;

-- ---------------------------------------------------------------------------
-- 1. Preconditions do schema pos-Pacote-2
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.sector_links') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: public.sector_links nao existe.';
  END IF;
  IF to_regclass('public.wave_cohorts') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: public.wave_cohorts ausente (Migration A nao aplicada).';
  END IF;

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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='waves' AND column_name='instrument_version') THEN
    RAISE EXCEPTION 'ABORTADO: waves.instrument_version ausente (Migration A nao aplicada).';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. A funcao, sem a coluna legada
-- ---------------------------------------------------------------------------
-- Validacao de instrumento/itens/escala continua em TypeScript
-- (validateBlindSubmission, engine puro) -- sector-link.server.ts valida ANTES
-- de invocar. Esta RPC garante VINCULO (link->onda), VALIDADE (status/
-- expiracao/onda aberta) e INSERT anonimo na mesma transacao.

CREATE OR REPLACE FUNCTION public.submit_sector_response(
  p_token_hash TEXT,
  p_answers    JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link               public.sector_links%ROWTYPE;
  v_wave_status        TEXT;
  v_instrument         TEXT;
  v_instrument_version TEXT;
  v_cohort_id          UUID;
  v_count              INTEGER;
BEGIN
  SELECT * INTO v_link FROM public.sector_links WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.status <> 'active' THEN
    RETURN QUERY SELECT FALSE, 'link_revoked'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.expires_at <= NOW() THEN
    RETURN QUERY SELECT FALSE, 'link_expired'::TEXT, 0;
    RETURN;
  END IF;

  -- Mesma leitura de antes, agora trazendo tambem instrumento e versao: sao
  -- colunas que a Migration A passou a exigir na resposta, e vem da ONDA,
  -- nunca do cliente.
  SELECT status, instrument, instrument_version
    INTO v_wave_status, v_instrument, v_instrument_version
    FROM public.waves WHERE id = v_link.wave_id;

  IF v_wave_status IS NULL OR v_wave_status IN ('sealed', 'cancelled', 'archived') THEN
    RETURN QUERY SELECT FALSE, 'wave_not_open'::TEXT, 0;
    RETURN;
  END IF;

  -- Coorte do setor, quando a onda declarar uma com essa chave. NULL e
  -- aceitavel e e o comportamento historico: link compartilhado sem coorte
  -- registrada agrega no nivel da onda.
  SELECT c.id INTO v_cohort_id
    FROM public.wave_cohorts c
   WHERE c.wave_id = v_link.wave_id AND c.key = v_link.sector_label;

  -- Anonimo por schema: nenhuma referencia ao link, ao token ou ao hash.
  -- A coluna legada nao e nomeada -- antes ela era preenchida com NULL, o que
  -- ja era anonimo; a diferenca e que agora o INSERT tambem sobrevive a
  -- remocao da coluna.
  INSERT INTO public.wave_responses (wave_id, cohort_id, instrument, instrument_version, answers)
  VALUES (v_link.wave_id, v_cohort_id, v_instrument, v_instrument_version, p_answers);

  SELECT COUNT(*) INTO v_count FROM public.wave_responses WHERE wave_id = v_link.wave_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Pos-check fail-closed
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  CONTRATO_RETORNO CONSTANT TEXT :=
    'TABLE(accepted boolean, reason text, response_count integer)';

  v_oid          OID;
  v_nargs        INTEGER;
  v_argnames     TEXT[];
  v_out_nomes    TEXT[];
  v_out_tipos    TEXT[];
  v_tipos_obs    TEXT;
  v_secdef       BOOLEAN;
  v_config       TEXT[];
  v_def          TEXT;
  v_acl_depois   TEXT;
  v_acl_antes    TEXT;
  v_owner_depois TEXT;
  v_owner_antes  TEXT;
BEGIN
  v_oid := to_regprocedure('public.submit_sector_response(text,jsonb)');
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'FALHA: submit_sector_response(text,jsonb) desapareceu.';
  END IF;

  SELECT pronargs,
         proargnames,
         prosecdef,
         proconfig,
         pg_get_functiondef(v_oid),
         COALESCE(proacl::TEXT, ''),
         pg_get_userbyid(proowner)
    INTO v_nargs, v_argnames, v_secdef, v_config, v_def,
         v_acl_depois, v_owner_depois
    FROM pg_proc WHERE oid = v_oid;

  -- ── Assinatura: catalogo, nunca texto formatado nem array derivado ──────
  --
  -- Duas execucoes produtivas abortaram aqui, as duas por REPRESENTACAO, nao
  -- por defeito da funcao:
  --
  --   1a) comparava pg_get_function_identity_arguments() contra 'text, jsonb'
  --       e reprovou "p_token_hash text, p_answers jsonb" -- o catalogo traz
  --       os NOMES junto dos tipos.
  --   2a) comparava proargtypes::OID[] contra ARRAY[...] e reprovou tipos
  --       corretos: proargtypes e um OIDVECTOR, indexado a partir de ZERO.
  --       Convertido para oid[], o array resultante tem lower bound 0, e a
  --       igualdade de arrays no PostgreSQL considera dimensoes e limites --
  --       entao {text,jsonb} com bound 0 nunca e igual a ARRAY[text,jsonb]
  --       com bound 1, mesmo com os mesmos OIDs na mesma ordem.
  --
  -- A forma robusta e indexar o oidvector nas posicoes 0 e 1 diretamente,
  -- dentro de uma consulta ao proprio pg_proc: nao ha conversao, nao ha
  -- array intermediario, nao ha texto.
  IF v_nargs IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'FALHA: numero de argumentos de entrada = %, esperado 2.', v_nargs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
     WHERE p.oid = v_oid
       AND p.proargtypes[0] = 'text'::regtype::OID
       AND p.proargtypes[1] = 'jsonb'::regtype::OID
  ) THEN
    SELECT p.proargtypes[0]::regtype::TEXT || ', ' || p.proargtypes[1]::regtype::TEXT
      INTO v_tipos_obs FROM pg_proc p WHERE p.oid = v_oid;
    RAISE EXCEPTION 'FALHA: tipos dos argumentos mudaram. Observado: %', v_tipos_obs;
  END IF;

  IF v_argnames[1] IS DISTINCT FROM 'p_token_hash'
     OR v_argnames[2] IS DISTINCT FROM 'p_answers' THEN
    RAISE EXCEPTION 'FALHA: nomes dos argumentos mudaram. Observado: %, %',
      v_argnames[1], v_argnames[2];
  END IF;

  -- ── Retorno: contrato estrutural (nome + tipo + ordem), nao string ──────
  -- Mesma classe de fragilidade da assinatura: comparar
  -- pg_get_function_result() contra um literal depende de como o PostgreSQL
  -- escolhe formatar. As colunas de saida (proargmodes = 't') sao lidas do
  -- catalogo e comparadas elemento a elemento; array_agg produz lower bound
  -- 1, igual ao do ARRAY[...] literal, entao a igualdade e bem definida.
  SELECT array_agg(t.nome ORDER BY t.ord), array_agg(format_type(t.tipo, NULL) ORDER BY t.ord)
    INTO v_out_nomes, v_out_tipos
    FROM pg_proc p
    CROSS JOIN LATERAL unnest(p.proallargtypes, p.proargmodes, p.proargnames)
           WITH ORDINALITY AS t(tipo, modo, nome, ord)
   WHERE p.oid = v_oid AND t.modo = 't';

  IF v_out_nomes IS DISTINCT FROM ARRAY['accepted', 'reason', 'response_count'] THEN
    RAISE EXCEPTION 'FALHA: colunas de retorno mudaram. Esperado accepted/reason/response_count, observado: %', v_out_nomes;
  END IF;
  IF v_out_tipos IS DISTINCT FROM ARRAY['boolean', 'text', 'integer'] THEN
    RAISE EXCEPTION 'FALHA: tipo de retorno mudou. Esperado % , observado: %', CONTRATO_RETORNO, v_out_tipos;
  END IF;
  IF v_secdef IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'FALHA: SECURITY DEFINER deixou de valer.';
  END IF;
  -- Mesma classe das duas falhas anteriores: `proconfig` guarda pares
  -- `nome=valor` em texto, e um `SET search_path = public` pode ser
  -- normalizado com espacos ou com o valor entre aspas. Igualdade exata
  -- contra 'search_path=public' reprovaria uma configuracao correta apenas
  -- por formatacao. A checagem passa a ser por padrao, ainda fail-closed:
  -- qualquer outro schema (ou schema adicional) nao casa.
  IF NOT EXISTS (
    SELECT 1 FROM unnest(COALESCE(v_config, ARRAY[]::TEXT[])) AS c
     WHERE btrim(c) ~* '^search_path\s*=\s*"?public"?$'
  ) THEN
    RAISE EXCEPTION 'FALHA: search_path nao e mais public. Observado: %', v_config;
  END IF;

  -- Corpo novo nao pode referenciar a COLUNA. Nome de parametro nao conta:
  -- \minvite_token\M nao casa p_invite_token.
  IF v_def ~* 'INSERT\s+INTO\s+public\.wave_responses\s*\([^)]*\minvite_token\M' THEN
    RAISE EXCEPTION 'FALHA: o INSERT ainda nomeia invite_token.';
  END IF;
  IF v_def ~* '\minvite_token\M' THEN
    RAISE EXCEPTION 'FALHA: o corpo ainda referencia invite_token.';
  END IF;

  -- Os quatro codigos de motivo continuam exatamente os mesmos.
  IF v_def NOT LIKE '%invalid_token%' THEN RAISE EXCEPTION 'FALHA: motivo invalid_token sumiu.'; END IF;
  IF v_def NOT LIKE '%link_revoked%' THEN RAISE EXCEPTION 'FALHA: motivo link_revoked sumiu.'; END IF;
  IF v_def NOT LIKE '%link_expired%' THEN RAISE EXCEPTION 'FALHA: motivo link_expired sumiu.'; END IF;
  IF v_def NOT LIKE '%wave_not_open%' THEN RAISE EXCEPTION 'FALHA: motivo wave_not_open sumiu.'; END IF;

  -- ACL e owner preservados: CREATE OR REPLACE nao os altera, e aqui se prova.
  v_acl_antes   := current_setting('fibt.sector_acl_before', true);
  v_owner_antes := current_setting('fibt.sector_owner_before', true);

  IF v_acl_antes IS NULL OR v_owner_antes IS NULL THEN
    RAISE EXCEPTION 'FALHA: a captura de ACL/owner anterior nao chegou ao pos-check.';
  END IF;
  IF v_acl_depois IS DISTINCT FROM v_acl_antes THEN
    RAISE EXCEPTION 'FALHA: a ACL da funcao mudou.';
  END IF;
  IF v_owner_depois IS DISTINCT FROM v_owner_antes THEN
    RAISE EXCEPTION 'FALHA: o owner da funcao mudou.';
  END IF;

  RAISE NOTICE 'Pacote 3A concluido: submit_sector_response sem referencia a wave_responses.invite_token, assinatura/retorno/SECURITY DEFINER/search_path/ACL/owner preservados.';
END $$;
