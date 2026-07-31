-- FIBT-1 / MIGRATION A -- EXPAND (aditiva, reversivel)
--
-- Camada GENERICA de submissao anonima: serve FIB-T, PERMA+V, VIA-T e qualquer
-- instrumento futuro. Nada aqui e especifico da FIB-T.
--
-- PROBLEMA QUE ORIGINA A ONDA
-- wave_responses.invite_token referencia wave_invites(token), e wave_invites
-- guarda email. Existe, no schema, o caminho resposta -> convite -> pessoa.
-- Administradores de organizacao nao conseguem percorre-lo hoje (wave_responses
-- nao tem policy de SELECT), mas a ligacao existe no banco: basta uma policy
-- futura, um dump ou um RPC descuidado. Privacidade por design e nao guardar a
-- ligacao, nao esconde-la.
--
-- ESTRATEGIA EXPAND -> PROVE -> CONTRACT
-- Esta migration NAO remove nada. Ela cria o caminho novo ao lado do antigo e
-- deixa a coluna legada intacta, para que a remocao (Migration B) so aconteca
-- depois de o caminho novo estar provado contra o banco real.
--
-- SEPARACAO DE RESPONSABILIDADES
--   A. Distribuicao e elegibilidade (wave_invites): quem pode responder, de
--      qual coorte, ate quando. PODE conter email.
--   B. Conteudo anonimo (wave_responses): onda, instrumento, versao, coorte,
--      respostas. Nenhum email, nenhum token, nenhum id de convite.

-- ---------------------------------------------------------------------------
-- 0. Versao do instrumento na onda
-- ---------------------------------------------------------------------------
-- O resultado precisa ser reproduzivel contra a definicao vigente NAQUELE
-- momento, nao contra a definicao atual.

ALTER TABLE public.waves
  ADD COLUMN IF NOT EXISTS instrument_version TEXT;

COMMENT ON COLUMN public.waves.instrument_version IS
  'Versao do instrumento aplicada nesta onda (ex.: manifesto FIB-T 1.0.0). Copiada para cada resposta.';

-- Chave composta para permitir FK que amarra coorte a onda E organizacao.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'waves_id_org_uk'
  ) THEN
    ALTER TABLE public.waves ADD CONSTRAINT waves_id_org_uk UNIQUE (id, org_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Coorte como ENTIDADE, nao como texto livre
-- ---------------------------------------------------------------------------
-- Texto livre nao tem integridade: "Comercial", "comercial" e "Comerical"
-- viram tres recortes, e nada impede citar a coorte de outra organizacao.

CREATE TABLE IF NOT EXISTS public.wave_cohorts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.organizations(id),
  wave_id    UUID NOT NULL REFERENCES public.waves(id),
  key        TEXT NOT NULL,
  label      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wave_cohorts_wave_key_uk UNIQUE (wave_id, key),
  -- A coorte pertence a MESMA organizacao que a onda: garantido por FK
  -- composta, nao por disciplina de codigo.
  CONSTRAINT wave_cohorts_wave_org_fk FOREIGN KEY (wave_id, org_id)
    REFERENCES public.waves(id, org_id),
  -- Alvo das FKs compostas de convites e respostas.
  CONSTRAINT wave_cohorts_id_wave_uk UNIQUE (id, wave_id)
);

COMMENT ON TABLE public.wave_cohorts IS
  'Recorte de agregacao (setor, area, unidade) de uma onda. Generico para qualquer instrumento. Grupo, nunca pessoa: nao guarda identidade e nao deve receber coorte de tamanho tal que identifique alguem -- a supressao k-anon cuida disso na leitura.';

ALTER TABLE public.wave_cohorts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.wave_cohorts FROM PUBLIC, anon, authenticated;
GRANT  ALL ON public.wave_cohorts TO service_role;
GRANT  SELECT ON public.wave_cohorts TO authenticated;

-- Membro da organizacao le as coortes da propria organizacao. Nada alem disso.
DROP POLICY IF EXISTS "wave_cohorts_member_read" ON public.wave_cohorts;
CREATE POLICY "wave_cohorts_member_read" ON public.wave_cohorts
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE INDEX IF NOT EXISTS wave_cohorts_org_idx ON public.wave_cohorts(org_id);

-- ---------------------------------------------------------------------------
-- 2. Distribuicao: convite ganha coorte e expiracao
-- ---------------------------------------------------------------------------

ALTER TABLE public.wave_invites
  ADD COLUMN IF NOT EXISTS cohort_id  UUID,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wave_invites_cohort_wave_fk'
  ) THEN
    -- O convite so pode citar coorte DA SUA PROPRIA onda.
    ALTER TABLE public.wave_invites
      ADD CONSTRAINT wave_invites_cohort_wave_fk FOREIGN KEY (cohort_id, wave_id)
      REFERENCES public.wave_cohorts(id, wave_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS wave_invites_cohort_idx ON public.wave_invites(wave_id, cohort_id);

COMMENT ON COLUMN public.wave_invites.cohort_id IS
  'Coorte de distribuicao. E o UNICO atributo do convite que atravessa para a resposta.';
COMMENT ON COLUMN public.wave_invites.expires_at IS
  'Expiracao opcional. NULL = nao expira.';

-- ---------------------------------------------------------------------------
-- 3. Conteudo anonimo: resposta ganha coorte, instrumento e versao
-- ---------------------------------------------------------------------------

ALTER TABLE public.wave_responses
  ADD COLUMN IF NOT EXISTS cohort_id          UUID,
  ADD COLUMN IF NOT EXISTS instrument         TEXT,
  ADD COLUMN IF NOT EXISTS instrument_version TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wave_responses_cohort_wave_fk'
  ) THEN
    ALTER TABLE public.wave_responses
      ADD CONSTRAINT wave_responses_cohort_wave_fk FOREIGN KEY (cohort_id, wave_id)
      REFERENCES public.wave_cohorts(id, wave_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS wave_responses_cohort_idx ON public.wave_responses(wave_id, cohort_id);

COMMENT ON COLUMN public.wave_responses.cohort_id IS
  'Recorte de agregacao. Aponta para um GRUPO; nao permite voltar ao participante.';
COMMENT ON COLUMN public.wave_responses.invite_token IS
  'LEGADO -- em remocao (FIBT-1 Migration B). O fluxo novo NUNCA preenche esta coluna. Mantida temporariamente apenas para compatibilidade com linhas anteriores.';

-- ---------------------------------------------------------------------------
-- 4. Submissao atomica que NAO grava o token
-- ---------------------------------------------------------------------------
-- Substitui a versao anterior. O uso unico continua garantido por
-- wave_invites.used_at (era assim antes tambem -- invite_token nunca sustentou
-- essa regra), agora com trava de linha explicita contra replay concorrente.

CREATE OR REPLACE FUNCTION public.submit_wave_response(
  p_wave_id      UUID,
  p_invite_token TEXT,
  p_answers      JSONB
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, response_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite public.wave_invites%ROWTYPE;
  v_wave   public.waves%ROWTYPE;
  v_count  INTEGER;
BEGIN
  -- Trava a linha do convite: uma segunda chamada concorrente com o MESMO
  -- token espera esta transacao terminar antes de prosseguir.
  SELECT * INTO v_invite FROM public.wave_invites WHERE token = p_invite_token FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'already_used'::TEXT, 0;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at <= NOW() THEN
    RETURN QUERY SELECT FALSE, 'expired_token'::TEXT, 0;
    RETURN;
  END IF;

  -- Vinculo token<->onda (P0-06): o convite tem que pertencer A MESMA onda que
  -- o cliente afirma estar respondendo.
  IF v_invite.wave_id <> p_wave_id THEN
    RETURN QUERY SELECT FALSE, 'invalid_token'::TEXT, 0;
    RETURN;
  END IF;

  SELECT * INTO v_wave FROM public.waves WHERE id = p_wave_id;
  IF v_wave.id IS NULL OR v_wave.status IN ('sealed', 'cancelled', 'archived') THEN
    RETURN QUERY SELECT FALSE, 'wave_not_open'::TEXT, 0;
    RETURN;
  END IF;

  -- A coorte e o UNICO atributo que atravessa do convite para a resposta.
  -- invite_token fica deliberadamente de fora do INSERT: a coluna legada
  -- permanece NULL em toda linha nova.
  INSERT INTO public.wave_responses (wave_id, cohort_id, instrument, instrument_version, answers)
  VALUES (p_wave_id, v_invite.cohort_id, v_wave.instrument, v_wave.instrument_version, p_answers);

  UPDATE public.wave_invites SET used_at = NOW() WHERE token = p_invite_token;

  SELECT COUNT(*) INTO v_count FROM public.wave_responses WHERE wave_id = p_wave_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_wave_response(uuid, text, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.submit_wave_response(uuid, text, jsonb) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Agregacao por coorte com privacy gate k_min = 5
-- ---------------------------------------------------------------------------
-- O gate vive no BANCO, nao so na interface: um cliente nao consegue obter a
-- media de um grupo pequeno nem chamando a RPC direto.

CREATE OR REPLACE FUNCTION public.aggregate_cohort_responses(
  p_wave_id   UUID,
  p_cohort_id UUID
)
RETURNS TABLE(n INTEGER, k_min INTEGER, visible BOOLEAN, item_means JSONB)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_k     CONSTANT INTEGER := 5;
  v_n     INTEGER;
  v_means JSONB;
BEGIN
  -- Escopo de tenant: o chamador tem que pertencer a organizacao DONA da onda.
  IF NOT EXISTS (
    SELECT 1 FROM public.waves w
    JOIN public.profiles p ON p.org_id = w.org_id
    WHERE w.id = p_wave_id AND p.id = auth.uid()
  ) THEN
    RETURN QUERY SELECT 0, v_k, FALSE, NULL::JSONB;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_n
    FROM public.wave_responses
   WHERE wave_id = p_wave_id AND cohort_id = p_cohort_id;

  IF v_n < v_k THEN
    -- Suprimido: devolve a contagem (util para operacao) e NENHUM conteudo.
    RETURN QUERY SELECT v_n, v_k, FALSE, NULL::JSONB;
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

  RETURN QUERY SELECT v_n, v_k, TRUE, v_means;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.aggregate_cohort_responses(uuid, uuid) IS
  'Media por item de uma coorte, com supressao k-anon (k_min=5) aplicada no banco. Abaixo do limiar devolve visible=false e item_means NULL. Nunca devolve resposta individual.';

-- ---------------------------------------------------------------------------
-- 6. Verificacao pos-migration (conferir, nao presumir)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema='public' AND table_name='wave_cohorts') THEN
    RAISE EXCEPTION 'FALHA: wave_cohorts nao foi criada';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='wave_responses' AND column_name='cohort_id') THEN
    RAISE EXCEPTION 'FALHA: wave_responses.cohort_id nao foi criado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='waves' AND column_name='instrument_version') THEN
    RAISE EXCEPTION 'FALHA: waves.instrument_version nao foi criado';
  END IF;

  -- EXPAND nao remove nada: a coluna legada TEM que continuar existindo aqui.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='wave_responses' AND column_name='invite_token') THEN
    RAISE EXCEPTION 'FALHA: invite_token sumiu -- esta migration e aditiva, a remocao e a Migration B';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='wave_cohorts_wave_org_fk') THEN
    RAISE EXCEPTION 'FALHA: FK composta coorte->onda/org ausente';
  END IF;
END $$;
