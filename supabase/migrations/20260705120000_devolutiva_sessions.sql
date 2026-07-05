-- ═══════════════════════════════════════════════════════════════════════════
-- CERIMÔNIA DA DEVOLUTIVA — persistência real do rito participativo (I-T2, S6.4)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- CONTEXTO: devolutiva-ceremony-engine.ts já é motor puro, testado, que decide
-- quando uma pauta de votação pode ser PUBLICADA (quórum k-anônimo ≥5) e como
-- ranquear os drivers votados. Faltava só onde guardar a sessão do rito entre
-- o início (facilitador abre) e o fim (pauta de co-criação sai e semeia o
-- Plano Vivo).
--
-- PRIVACIDADE POR SCHEMA (mesmo idioma do I5 da Academia e do S3 — captura
-- cega): esta tabela NÃO TEM coluna de identidade de votante. `priority_votes`
-- é só uma contagem por driver (JSONB), incrementada por qualquer chamada de
-- `cast_priority_vote` — a cerimônia é um rito ao vivo, com o facilitador
-- registrando votos de mão levantada na sala; não existe (e não pode existir)
-- um voto individual rastreável nesta tabela. Isso é uma garantia estrutural,
-- não uma política: não há como reidentificar quem votou em quê porque o dado
-- nunca existiu.
--
-- QUÓRUM COMO GATE DE PUBLICAÇÃO: `pauta_driver_ids` só é preenchida no
-- fechamento SE attendance_count >= 5 (mesma regra do engine, replicada aqui
-- em defesa de profundidade — disciplina já usada em action_log/record_action_event
-- na migration anterior). Abaixo do quórum, o fechamento grava status='closed'
-- mas pauta_driver_ids fica NULL — a UI mostra "quórum não atingido", nunca um
-- ranking de amostra pequena.
--
-- CANDIDATOS NÃO SÃO PERSISTIDOS: a lista de drivers elegíveis para votação
-- (hoje: a mesma fila determinística de priority-engine usada em /plano-acao)
-- não tem tabela própria — é config/engine, não dado de organização. Por isso
-- `close_devolutiva_session` recebe a lista de candidatos como parâmetro (mesma
-- lógica de `create_action_plan` receber os itens do QUARTERLY_PLAN): o banco
-- nunca inventa um candidato que o chamador não apresentou.
--
-- SEGURANÇA DAS RPCs: mesma disciplina da migration anterior — EXECUTE das 4
-- funções abaixo é revogado de PUBLIC/authenticated/anon e concedido só a
-- service_role, alcançável apenas via devolutiva-ceremony.server.ts depois de
-- requireOrgAdmin(accessToken) resolver a org real do chamador.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.devolutiva_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  capsule_id           UUID REFERENCES public.wave_capsules(id),
  facilitator_user_id  UUID NOT NULL REFERENCES auth.users(id),
  script_version       TEXT NOT NULL DEFAULT 'v1',
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  attendance_count     INTEGER NOT NULL DEFAULT 0 CHECK (attendance_count >= 0),
  priority_votes       JSONB NOT NULL DEFAULT '{}'::jsonb, -- { driverId: count } — agregado, zero identidade
  pauta_driver_ids     TEXT[], -- ranking final; só preenchido no fechamento SE quórum atingido
  held_on              DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS devolutiva_sessions_org_idx ON public.devolutiva_sessions (org_id, created_at DESC);

-- ─── RLS: leitura para qualquer membro da org; ESCRITA SÓ VIA RPC ───────────

ALTER TABLE public.devolutiva_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devolutiva_sessions_org_read" ON public.devolutiva_sessions;
CREATE POLICY "devolutiva_sessions_org_read" ON public.devolutiva_sessions FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

REVOKE ALL ON public.devolutiva_sessions FROM authenticated, anon;
GRANT SELECT ON public.devolutiva_sessions TO authenticated;
GRANT ALL ON public.devolutiva_sessions TO service_role;

-- ─── RPC 1 · Abrir a cerimônia (recusa se já há uma aberta na org) ──────────

CREATE OR REPLACE FUNCTION public.open_devolutiva_session(
  p_org_id             UUID,
  p_capsule_id         UUID,
  p_facilitator_user_id UUID,
  p_script_version     TEXT
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, session_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.devolutiva_sessions WHERE org_id = p_org_id AND status = 'open') THEN
    RETURN QUERY SELECT FALSE, 'session_already_open'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  INSERT INTO public.devolutiva_sessions (org_id, capsule_id, facilitator_user_id, script_version)
  VALUES (p_org_id, p_capsule_id, p_facilitator_user_id, COALESCE(p_script_version, 'v1'))
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_session_id;
END;
$$;

-- ─── RPC 2 · Registrar um voto — só incrementa a contagem, nunca identidade ─

CREATE OR REPLACE FUNCTION public.cast_priority_vote(
  p_session_id UUID,
  p_driver_id  TEXT
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, votes JSONB)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status TEXT;
  v_votes  JSONB;
BEGIN
  SELECT status, priority_votes INTO v_status, v_votes
  FROM public.devolutiva_sessions WHERE id = p_session_id FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'session_not_found'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  IF v_status <> 'open' THEN
    RETURN QUERY SELECT FALSE, 'session_not_open'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  IF p_driver_id IS NULL OR btrim(p_driver_id) = '' THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  v_votes := v_votes || jsonb_build_object(p_driver_id, COALESCE((v_votes ->> p_driver_id)::INTEGER, 0) + 1);

  UPDATE public.devolutiva_sessions SET priority_votes = v_votes WHERE id = p_session_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_votes;
END;
$$;

-- ─── RPC 3 · Atualizar a contagem de presentes ──────────────────────────────

CREATE OR REPLACE FUNCTION public.set_devolutiva_attendance(
  p_session_id       UUID,
  p_attendance_count INTEGER
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM public.devolutiva_sessions WHERE id = p_session_id FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'session_not_found'::TEXT;
    RETURN;
  END IF;
  IF v_status <> 'open' THEN
    RETURN QUERY SELECT FALSE, 'session_not_open'::TEXT;
    RETURN;
  END IF;
  IF p_attendance_count IS NULL OR p_attendance_count < 0 THEN
    RETURN QUERY SELECT FALSE, 'invalid_request'::TEXT;
    RETURN;
  END IF;

  UPDATE public.devolutiva_sessions SET attendance_count = p_attendance_count WHERE id = p_session_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- ─── RPC 4 · Fechar a cerimônia — quórum decide se a pauta é publicada ──────

CREATE OR REPLACE FUNCTION public.close_devolutiva_session(
  p_session_id           UUID,
  p_candidate_driver_ids TEXT[]
)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, published BOOLEAN, pauta TEXT[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status     TEXT;
  v_attendance INTEGER;
  v_votes      JSONB;
  v_published  BOOLEAN;
  v_pauta      TEXT[];
BEGIN
  SELECT status, attendance_count, priority_votes INTO v_status, v_attendance, v_votes
  FROM public.devolutiva_sessions WHERE id = p_session_id FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'session_not_found'::TEXT, FALSE, NULL::TEXT[];
    RETURN;
  END IF;
  IF v_status <> 'open' THEN
    RETURN QUERY SELECT FALSE, 'session_not_open'::TEXT, FALSE, NULL::TEXT[];
    RETURN;
  END IF;

  v_published := v_attendance >= 5;

  IF v_published AND p_candidate_driver_ids IS NOT NULL AND array_length(p_candidate_driver_ids, 1) > 0 THEN
    SELECT array_agg(t.driver_id ORDER BY COALESCE((v_votes ->> t.driver_id)::INTEGER, 0) DESC, t.ord)
    INTO v_pauta
    FROM unnest(p_candidate_driver_ids) WITH ORDINALITY AS t(driver_id, ord);
  ELSE
    v_pauta := NULL;
  END IF;

  UPDATE public.devolutiva_sessions
  SET status = 'closed', closed_at = NOW(), pauta_driver_ids = v_pauta
  WHERE id = p_session_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_published, v_pauta;
END;
$$;

-- ─── Trava de EXECUTE — só service_role chama estas 4 RPCs ──────────────────

REVOKE EXECUTE ON FUNCTION public.open_devolutiva_session(UUID, UUID, UUID, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.cast_priority_vote(UUID, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.set_devolutiva_attendance(UUID, INTEGER) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.close_devolutiva_session(UUID, TEXT[]) FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.open_devolutiva_session(UUID, UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cast_priority_vote(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_devolutiva_attendance(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_devolutiva_session(UUID, TEXT[]) TO service_role;
