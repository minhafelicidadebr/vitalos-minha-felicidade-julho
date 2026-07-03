-- ═══════════════════════════════════════════════════════════════════════════
-- RPC TRANSACIONAL DE PROVISIONAMENTO (P0-05, Sprint S2)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA: createOrgAndAdmin (onboarding.server.ts) fazia 5 passos separados
-- via chamadas REST independentes: validar convite → checar e-mail → INSERT
-- organizations → INSERT profiles → UPDATE org_invites. Nada disso era
-- transacional. Duas requisições simultâneas com o MESMO token de convite
-- podiam ambas passar pela checagem "convite ainda não usado" antes de
-- qualquer uma marcar o convite como usado — resultando em DUAS organizações
-- e DOIS perfis para um único convite (órfãos, já que só um consumo do
-- convite pode vencer no final).
--
-- SOLUÇÃO: uma única função PL/pgSQL que faz tudo dentro da MESMA transação
-- implícita do corpo da função, com `SELECT ... FOR UPDATE` travando a linha
-- do convite. Uma segunda chamada concorrente com o mesmo token BLOQUEIA até
-- a primeira terminar (commit ou rollback); ao continuar, ela vê
-- `used_at IS NOT NULL` e retorna 'already_used' sem criar nada. Resultado:
-- exatamente 1 organização, 1 perfil, 1 convite consumido — sempre.
--
-- A checagem de e-mail vinculado também migra para dentro da transação,
-- lendo `auth.users` diretamente (mesma base, sem chamada HTTP separada à
-- Admin API) — mais uma fonte de corrida eliminada.
--
-- CAMADAS: papel-por-setor (orgAdminRole) e validação de packId continuam em
-- JavaScript (onboarding.server.ts), lidos do registry de packs — são
-- configuração de domínio, não pertencem a SQL. Esta função recebe o papel
-- e o packId JÁ resolvidos como parâmetros; só garante ATOMICIDADE.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.provision_organization_from_invite(
  p_invite_token   TEXT,
  p_user_id        UUID,
  p_org_name       TEXT,
  p_org_slug       TEXT,
  p_pack_id        TEXT,
  p_role           TEXT,
  p_cnpj           TEXT,
  p_team_size_band TEXT,
  p_phone          TEXT,
  p_address        TEXT DEFAULT NULL,
  p_segment        TEXT DEFAULT NULL
)
RETURNS TABLE(org_id UUID, profile_id UUID, plan TEXT, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite     public.org_invites%ROWTYPE;
  v_user_email TEXT;
  v_org_id     UUID;
BEGIN
  -- Trava a linha do convite: qualquer chamada concorrente com o MESMO token
  -- espera aqui até esta transação terminar. É isto que serializa a corrida.
  SELECT * INTO v_invite FROM public.org_invites WHERE token = p_invite_token FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'invalid_token'::TEXT;
    RETURN;
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'already_used'::TEXT;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'expired'::TEXT;
    RETURN;
  END IF;

  IF v_invite.email IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    IF v_user_email IS NULL OR lower(v_user_email) <> lower(v_invite.email) THEN
      RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'email_mismatch'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Bloco aninhado só aqui: nada foi escrito ainda nesta transação, então
  -- capturar a exceção e devolver um erro gracioso é seguro (não há nada
  -- anterior para vazar como órfão).
  BEGIN
    INSERT INTO public.organizations (slug, name, pack_id, plan, cnpj, team_size_band, phone, address, segment)
    VALUES (
      p_org_slug, p_org_name, p_pack_id, COALESCE(v_invite.plan, 'pilot'),
      p_cnpj, p_team_size_band, p_phone, p_address, p_segment
    )
    RETURNING id INTO v_org_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'slug_taken'::TEXT;
      RETURN;
  END;

  -- SEM bloco de exceção aqui de propósito: se este INSERT falhar (ex.: este
  -- usuário já tem perfil em outro lugar), a exceção deve propagar e abortar
  -- a transação INTEIRA — incluindo o INSERT em organizations acima. Um
  -- EXCEPTION aninhado criaria um savepoint que isolaria só este INSERT,
  -- deixando a organização recém-criada órfã sem perfil. Deixar propagar é o
  -- que garante atomicidade real: tudo ou nada.
  INSERT INTO public.profiles (id, org_id, role, display_name)
  VALUES (p_user_id, v_org_id, p_role, p_org_name);

  UPDATE public.org_invites
  SET used_at = NOW(), used_by_org_id = v_org_id
  WHERE token = p_invite_token;

  RETURN QUERY SELECT v_org_id, p_user_id, COALESCE(v_invite.plan, 'pilot'), NULL::TEXT;
END;
$$;
