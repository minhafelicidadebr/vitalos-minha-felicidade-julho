-- ═══════════════════════════════════════════════════════════════════════════
-- BILATERAL PAIRS — formação real da Dupla de Prática (I6, aperto de mão)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Fecha a promessa declarada na fatia do diretório consentido: a dupla REAL
-- só existe com aceite EXPLÍCITO dos dois lados — nunca fabricada com
-- storage local (que enganaria o parceiro), nunca designada por gestor.
-- É a materialização multi-usuário do `formPair` do practice-pair-engine
-- (bilateral por construção), com a atomicidade que só uma RPC dá.
--
-- Duas tabelas + uma RPC:
--   pair_invites  — o convite (visível SÓ às duas partes; anti-spam por
--                   UNIQUE parcial de convite pendente por par de pessoas).
--   pair_records  — a dupla formada (criada SÓ pela RPC, nunca por INSERT
--                   direto do cliente — GRANT nega INSERT a authenticated).
--   accept_pair_invite — o aperto de mão atômico: FOR UPDATE no convite,
--                   revalida diretório/dupla-ativa dos DOIS lados, cria a
--                   dupla e marca o convite aceito na MESMA transação
--                   (mesmo desenho do submit_wave_response/S3, mas
--                   authenticated: auth.uid() é a identidade, não um token).

-- ── 1. Convites ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pair_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_user       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  focus_driver_id TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  CONSTRAINT pair_invites_no_self CHECK (from_user <> to_user)
);

-- Anti-spam: no máximo UM convite pendente por par ordenado de pessoas.
CREATE UNIQUE INDEX IF NOT EXISTS pair_invites_one_pending
  ON public.pair_invites(from_user, to_user) WHERE status = 'pending';

ALTER TABLE public.pair_invites ENABLE ROW LEVEL SECURITY;

-- Só as DUAS partes enxergam o convite — nunca terceiros, nem da mesma org.
CREATE POLICY pair_invites_select_parties ON public.pair_invites
  FOR SELECT USING (from_user = auth.uid() OR to_user = auth.uid());

-- Convidar: só em nome próprio, só dentro da própria org, e só para quem
-- está VISÍVEL no diretório consentido (nunca convidar quem não optou).
CREATE POLICY pair_invites_insert_own ON public.pair_invites
  FOR INSERT WITH CHECK (
    from_user = auth.uid()
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pair_directory_entries d
      WHERE d.user_id = to_user AND d.org_id = pair_invites.org_id AND d.visible = TRUE
    )
  );

-- Sem UPDATE/DELETE por policy: toda transição de estado passa pela RPC
-- (aceitar) ou pelas RPCs de recusa/cancelamento abaixo — nunca o cliente
-- edita a linha direto (estado é máquina, não campo livre).

REVOKE ALL ON public.pair_invites FROM PUBLIC, authenticated, anon;
GRANT SELECT, INSERT ON public.pair_invites TO authenticated;
GRANT ALL ON public.pair_invites TO service_role;

-- ── 2. Duplas formadas ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pair_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_a        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_b        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  focus_driver_id TEXT NOT NULL,
  formed_on       DATE NOT NULL DEFAULT CURRENT_DATE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  dissolved_at    TIMESTAMPTZ,
  CONSTRAINT pair_records_no_self CHECK (member_a <> member_b)
);

ALTER TABLE public.pair_records ENABLE ROW LEVEL SECURITY;

-- Só os DOIS membros enxergam a própria dupla.
CREATE POLICY pair_records_select_members ON public.pair_records
  FOR SELECT USING (member_a = auth.uid() OR member_b = auth.uid());

-- NENHUM INSERT/UPDATE/DELETE de cliente: a dupla nasce SÓ pela RPC
-- (aceite bilateral atômico) e se dissolve SÓ pela RPC de dissolução.
REVOKE ALL ON public.pair_records FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.pair_records TO authenticated;
GRANT ALL ON public.pair_records TO service_role;

CREATE INDEX IF NOT EXISTS pair_records_members ON public.pair_records(member_a, member_b) WHERE active;

-- ── 3. RPC: o aperto de mão atômico ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_pair_invite(p_invite_id UUID)
RETURNS TABLE(accepted BOOLEAN, reason TEXT, pair_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite public.pair_invites%ROWTYPE;
  v_pair_id UUID;
BEGIN
  -- Trava o convite: dois aceites simultâneos → um espera, o segundo vê o estado novo.
  SELECT * INTO v_invite FROM public.pair_invites WHERE id = p_invite_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'invite_not_found'::TEXT, NULL::UUID; RETURN;
  END IF;

  -- Só o DESTINATÁRIO aceita — a bilateralidade é literal.
  IF v_invite.to_user <> auth.uid() THEN
    RETURN QUERY SELECT FALSE, 'not_invitee'::TEXT, NULL::UUID; RETURN;
  END IF;

  IF v_invite.status <> 'pending' THEN
    RETURN QUERY SELECT FALSE, 'not_pending'::TEXT, NULL::UUID; RETURN;
  END IF;

  -- Os DOIS ainda precisam estar visíveis no diretório (sair = retirar consentimento).
  IF NOT EXISTS (SELECT 1 FROM public.pair_directory_entries WHERE user_id = v_invite.from_user AND visible) OR
     NOT EXISTS (SELECT 1 FROM public.pair_directory_entries WHERE user_id = v_invite.to_user AND visible) THEN
    RETURN QUERY SELECT FALSE, 'left_directory'::TEXT, NULL::UUID; RETURN;
  END IF;

  -- Uma dupla ativa por pessoa (mesma regra do engine already_paired).
  IF EXISTS (
    SELECT 1 FROM public.pair_records
    WHERE active AND (member_a IN (v_invite.from_user, v_invite.to_user)
                   OR member_b IN (v_invite.from_user, v_invite.to_user))
  ) THEN
    RETURN QUERY SELECT FALSE, 'already_paired'::TEXT, NULL::UUID; RETURN;
  END IF;

  INSERT INTO public.pair_records (org_id, member_a, member_b, focus_driver_id)
  VALUES (v_invite.org_id, v_invite.from_user, v_invite.to_user, v_invite.focus_driver_id)
  RETURNING id INTO v_pair_id;

  UPDATE public.pair_invites SET status = 'accepted', responded_at = NOW() WHERE id = p_invite_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_pair_id;
END;
$$;

-- ── 4. RPCs de recusa e cancelamento (máquina de estados, nunca UPDATE livre) ─
CREATE OR REPLACE FUNCTION public.decline_pair_invite(p_invite_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.pair_invites SET status = 'declined', responded_at = NOW()
  WHERE id = p_invite_id AND to_user = auth.uid() AND status = 'pending';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_pair_invite(p_invite_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.pair_invites SET status = 'cancelled', responded_at = NOW()
  WHERE id = p_invite_id AND from_user = auth.uid() AND status = 'pending';
  RETURN FOUND;
END;
$$;

-- Trava de EXECUTE (padrão S6): só authenticated (auth.uid() é a identidade).
REVOKE EXECUTE ON FUNCTION public.accept_pair_invite(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decline_pair_invite(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_pair_invite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_pair_invite(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_pair_invite(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_pair_invite(UUID) TO authenticated, service_role;

-- ── Verificação pós-aplicação (colar no Lovable depois de aplicar) ───────────
-- SELECT has_table_privilege('authenticated', 'public.pair_records', 'INSERT');  -- false (só a RPC cria)
-- SELECT has_table_privilege('authenticated', 'public.pair_invites', 'UPDATE');  -- false (só RPCs transitam)
-- SELECT has_function_privilege('anon', 'public.accept_pair_invite(uuid)', 'EXECUTE'); -- false
-- SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('pair_invites', 'pair_records'); -- 3
