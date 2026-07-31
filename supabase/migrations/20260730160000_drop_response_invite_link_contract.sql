-- FIBT-1 / MIGRATION B -- CONTRACT (destrutiva, parcialmente irreversivel)
--
-- NAO APLICAR sem que a Migration A esteja aplicada e a prova intermediaria
-- esteja integralmente verde.
--
-- O QUE FAZ
-- Remove wave_responses.invite_token e a FK para wave_invites, eliminando do
-- SCHEMA o caminho resposta -> convite -> email. Esconder a relacao na
-- interface nao basta: enquanto a coluna existir, uma policy futura, um dump
-- ou um RPC descuidado reidentifica.
--
-- REVERSIBILIDADE -- LEIA ANTES
-- Schema: reversivel (recriar coluna, FK e funcoes).
-- Dados:  NAO reversivel a partir desta migration. Os valores de invite_token
--         sao DESTRUIDOS. Restaurar exige o snapshot temporario gerado fora
--         do repositorio por:
--             bun run scripts/fibt1-staging-proof.ts snapshot
--         Sem esse snapshot, esta migration NAO e reversivel em dados.
--
-- CONSUMIDOR FUNCIONAL ENCONTRADO NA BUSCA ESTATICA
-- submit_sector_response nomeia invite_token no INSERT (gravando NULL). Dropar
-- a coluna sem corrigir essa funcao quebraria o fluxo de link setorial. Por
-- isso ela e reescrita AQUI, antes do DROP.

-- ===========================================================================
-- 1. PRECONDITIONS FAIL-CLOSED
-- ===========================================================================
-- Provam pelo BANCO, nao pelo nome exibido, que tudo que sera afetado e
-- sintetico. Qualquer divergencia aborta a transacao inteira.

DO $$
DECLARE
  v_afetadas       INTEGER;
  v_nao_sinteticas INTEGER;
  v_emails_reais   INTEGER;
  v_policy_legada  INTEGER;
BEGIN
  -- --- 1.1 Quantas linhas perdem valor ------------------------------------
  SELECT COUNT(*) INTO v_afetadas
    FROM public.wave_responses WHERE invite_token IS NOT NULL;
  RAISE NOTICE 'Respostas com invite_token nao nulo: %', v_afetadas;

  -- --- 1.2 Toda linha afetada pertence a tenant COMPROVADAMENTE sintetico --
  -- Tres sinais independentes, nao apenas organization.name:
  --   (a) UUID de organizacao na faixa semeada a0000000-...
  --   (b) nome com marcador sintetico explicito
  --   (c) prefixo controlado desta onda (fibt1-synth-)
  SELECT COUNT(*) INTO v_nao_sinteticas
    FROM public.wave_responses r
    JOIN public.waves w ON w.id = r.wave_id
    JOIN public.organizations o ON o.id = w.org_id
   WHERE r.invite_token IS NOT NULL
     AND NOT (
          o.id::TEXT LIKE 'a0000000-0000-0000-0000-%'
       -- '_' casa um caractere qualquer: pega "sintetico" e "sintetico"
       -- acentuado sem precisar de byte nao-ASCII neste arquivo.
       OR o.name LIKE '%(sint_tico)%'
       OR o.name LIKE 'P0 Proof %'
       OR o.name LIKE 'fibt1-synth-%'
     );

  IF v_nao_sinteticas > 0 THEN
    RAISE EXCEPTION 'ABORTADO: % resposta(s) com invite_token pertencem a organizacao NAO comprovadamente sintetica.', v_nao_sinteticas;
  END IF;

  -- --- 1.3 Nenhum email real nos convites das ondas afetadas --------------
  -- Se houvesse email real, o dado nao seria sintetico -- e o snapshot
  -- passaria a conter PII, o que nao e aceitavel.
  SELECT COUNT(*) INTO v_emails_reais
    FROM public.wave_invites i
    JOIN public.waves w ON w.id = i.wave_id
    JOIN public.organizations o ON o.id = w.org_id
   WHERE i.email IS NOT NULL
     AND i.email NOT LIKE '%@example.invalid'
     AND i.email NOT LIKE '%@example.com';

  IF v_emails_reais > 0 THEN
    RAISE EXCEPTION 'ABORTADO: % convite(s) com email fora de example.invalid/example.com -- dado possivelmente real.', v_emails_reais;
  END IF;

  -- --- 1.4 Nenhuma policy legada dependente da coluna ---------------------
  SELECT COUNT(*) INTO v_policy_legada
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'wave_responses' AND policyname = 'response_submit';

  IF v_policy_legada > 0 THEN
    RAISE EXCEPTION 'ABORTADO: policy legada response_submit ainda existe e depende de invite_token.';
  END IF;

  -- --- 1.5 Migration A tem que estar aplicada -----------------------------
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='wave_responses' AND column_name='cohort_id') THEN
    RAISE EXCEPTION 'ABORTADO: Migration A nao aplicada (wave_responses.cohort_id ausente).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='public' AND table_name='wave_cohorts') THEN
    RAISE EXCEPTION 'ABORTADO: Migration A nao aplicada (wave_cohorts ausente).';
  END IF;

  -- --- 1.6 O fluxo novo nao pode estar gravando a coluna legada -----------
  -- Toda resposta que JA tenha coorte precisa ter invite_token NULL. Se
  -- alguma tiver os dois, o caminho novo ainda escreve no antigo.
  IF EXISTS (SELECT 1 FROM public.wave_responses
              WHERE cohort_id IS NOT NULL AND invite_token IS NOT NULL) THEN
    RAISE EXCEPTION 'ABORTADO: existe resposta com cohort_id E invite_token -- o fluxo novo ainda preenche a coluna legada.';
  END IF;

  RAISE NOTICE 'Preconditions OK. Removendo o vinculo de % resposta(s) sintetica(s).', v_afetadas;
END $$;

-- ===========================================================================
-- 2. Corrigir o consumidor funcional ANTES do DROP
-- ===========================================================================
-- submit_sector_response deixa de nomear a coluna. Comportamento identico:
-- ja gravava NULL. A coorte do link setorial passa a ser resolvida quando
-- houver uma wave_cohort com key igual ao sector_label da onda; caso
-- contrario a resposta fica sem coorte, como antes.

CREATE OR REPLACE FUNCTION public.submit_sector_response(
  p_token_hash TEXT,
  p_answers    JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link      public.sector_links%ROWTYPE;
  v_wave      public.waves%ROWTYPE;
  v_cohort_id UUID;
  v_count     INTEGER;
BEGIN
  SELECT * INTO v_link FROM public.sector_links WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.status <> 'active' OR v_link.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'revoked'::TEXT, 0;
    RETURN;
  END IF;

  IF v_link.expires_at <= NOW() THEN
    RETURN QUERY SELECT FALSE, 'expired'::TEXT, 0;
    RETURN;
  END IF;

  SELECT * INTO v_wave FROM public.waves WHERE id = v_link.wave_id;
  IF v_wave.id IS NULL OR v_wave.status IN ('sealed', 'cancelled', 'archived') THEN
    RETURN QUERY SELECT FALSE, 'wave_not_open'::TEXT, 0;
    RETURN;
  END IF;

  -- Coorte do setor, quando declarada para esta onda. NULL e aceitavel: link
  -- compartilhado sem coorte registrada agrega no nivel da onda.
  SELECT c.id INTO v_cohort_id
    FROM public.wave_cohorts c
   WHERE c.wave_id = v_link.wave_id AND c.key = v_link.sector_label;

  -- Anonimo por schema: nenhuma referencia ao link, ao token ou ao hash.
  INSERT INTO public.wave_responses (wave_id, cohort_id, instrument, instrument_version, answers)
  VALUES (v_link.wave_id, v_cohort_id, v_wave.instrument, v_wave.instrument_version, p_answers);

  SELECT COUNT(*) INTO v_count FROM public.wave_responses WHERE wave_id = v_link.wave_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_sector_response(TEXT, JSONB) FROM PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public.submit_sector_response(TEXT, JSONB) TO anon, service_role;

-- ===========================================================================
-- 3. CONTRACT -- remocao do vinculo
-- ===========================================================================

DROP POLICY IF EXISTS "response_submit" ON public.wave_responses;

ALTER TABLE public.wave_responses DROP CONSTRAINT IF EXISTS wave_responses_invite_token_fkey;
ALTER TABLE public.wave_responses DROP COLUMN     IF EXISTS invite_token;

COMMENT ON TABLE public.wave_responses IS
  'Conteudo anonimo de resposta. Sem policy de SELECT: nenhum papel cliente le resposta individual. Sem invite_token, sem email e sem FK para wave_invites -- a juncao resposta->participante NAO EXISTE no schema. Escrita apenas via submit_wave_response / submit_sector_response (SECURITY DEFINER). Leitura agregada apenas via aggregate_cohort_responses, com k-anon >= 5.';

-- ===========================================================================
-- 4. VERIFICACAO POS-MIGRATION
-- ===========================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='wave_responses' AND column_name='invite_token') THEN
    RAISE EXCEPTION 'FALHA: wave_responses.invite_token ainda existe';
  END IF;

  -- Nenhuma FK de wave_responses pode alcancar wave_invites.
  IF EXISTS (
    SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
     WHERE tc.table_schema = 'public'
       AND tc.table_name = 'wave_responses'
       AND tc.constraint_type = 'FOREIGN KEY'
       AND ccu.table_name = 'wave_invites'
  ) THEN
    RAISE EXCEPTION 'FALHA: ainda existe FK de wave_responses para wave_invites';
  END IF;

  -- A coorte tem que ter sobrevivido: sem ela nao ha agregacao por recorte.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='wave_responses' AND column_name='cohort_id') THEN
    RAISE EXCEPTION 'FALHA: cohort_id sumiu';
  END IF;

  RAISE NOTICE 'CONTRACT concluido: nao existe caminho resposta -> convite -> email no schema.';
END $$;
