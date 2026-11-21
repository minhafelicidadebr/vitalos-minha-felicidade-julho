-- ═══════════════════════════════════════════════════════════════════════════
-- RESERVA ATÔMICA DE CONVITE DE PESSOA (assentos administrativos) · 21/11/2026
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA: createMemberInvite contava assentos e depois inseria o convite em
-- duas chamadas separadas. Com um assento livre, duas emissões simultâneas de
-- convite administrativo podiam ambas ver "1 livre" e ambas inserir.
--
-- DECISÃO (founder, 21/11/2026, docs/vitalos/decisions/ASSENTOS_ADMINISTRATIVOS_DECISAO_2026-11-21.md):
-- o limite do plano vale só para papéis administrativos canônicos; convite
-- administrativo pendente e válido reserva assento; outros papéis não consomem.
--
-- SOLUÇÃO: uma RPC que, na MESMA transação, serializa as emissões da organização
-- (pg_advisory_xact_lock por org), conta perfis administrativos + convites
-- administrativos pendentes não expirados, e só então insere.
--
-- Quem chama: só member-invite.server.ts via service_role, depois de
-- requireOrgAdmin. org_id, papéis administrativos canônicos (orgAdminRoles())
-- e teto do plano (plan-engine) vêm do servidor, nunca do cliente.
-- p_max_admin_seats NULL = plano sem teto.
--
-- APLICAÇÃO REMOTA: pendente, exige autorização explícita do founder.
-- Provada só no banco local descartável (vitalos-q1q2-integ).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.reserve_member_invite(
  p_org_id          UUID,
  p_email           TEXT,
  p_role            TEXT,
  p_created_by      UUID,
  p_admin_roles     TEXT[],
  p_max_admin_seats INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used   INTEGER;
  v_token  TEXT;
  v_row    public.member_invites%ROWTYPE;
BEGIN
  IF p_org_id IS NULL OR p_role IS NULL OR coalesce(trim(p_email), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;
  IF p_admin_roles IS NULL OR cardinality(p_admin_roles) = 0 THEN
    -- Sem a lista canônica não há contagem confiável: falha fechada.
    RETURN jsonb_build_object('ok', false, 'reason', 'admin_roles_missing');
  END IF;
  IF p_max_admin_seats IS NOT NULL AND p_max_admin_seats < 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_input');
  END IF;

  -- Serializa todas as emissões da mesma organização até o fim da transação.
  PERFORM pg_advisory_xact_lock(hashtextextended('reserve_member_invite:' || p_org_id::text, 0));

  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'org_not_found');
  END IF;

  IF p_role = ANY (p_admin_roles) AND p_max_admin_seats IS NOT NULL THEN
    SELECT
      (SELECT count(*) FROM public.profiles
        WHERE org_id = p_org_id AND role = ANY (p_admin_roles))
      +
      (SELECT count(*) FROM public.member_invites
        WHERE org_id = p_org_id
          AND role = ANY (p_admin_roles)
          AND used_at IS NULL
          AND (expires_at IS NULL OR expires_at > now()))
    INTO v_used;

    IF v_used >= p_max_admin_seats THEN
      RETURN jsonb_build_object(
        'ok', false, 'reason', 'seat_quota_exceeded',
        'used', v_used, 'limit', p_max_admin_seats);
    END IF;
  END IF;

  INSERT INTO public.member_invites (org_id, email, role, created_by)
  VALUES (p_org_id, trim(p_email), p_role, p_created_by)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true,
    'invite', jsonb_build_object(
      'token', v_row.token,
      'email', v_row.email,
      'role', v_row.role,
      'used_at', v_row.used_at,
      'expires_at', v_row.expires_at,
      'created_at', v_row.created_at));
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_member_invite(UUID, TEXT, TEXT, UUID, TEXT[], INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_member_invite(UUID, TEXT, TEXT, UUID, TEXT[], INTEGER)
  TO service_role;

-- Conferência pós-migration (o REVOKE não basta nesta conta: é preciso CONFERIR).
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.reserve_member_invite(uuid, text, text, uuid, text[], integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.reserve_member_invite(uuid, text, text, uuid, text[], integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'reserve_member_invite: EXECUTE ainda concedido a anon/authenticated';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.reserve_member_invite(uuid, text, text, uuid, text[], integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'reserve_member_invite: service_role sem EXECUTE';
  END IF;
END
$$;
