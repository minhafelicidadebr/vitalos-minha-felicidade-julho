-- ═══════════════════════════════════════════════════════════════════════════
-- CONVITE DE PESSOA COM PAPEL REAL (Onda "Convite de Pessoa", passo 2/7)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA: só o primeiro admin de uma organização tem login real (via
-- org_invites → provision_organization_from_invite). org_invites não serve
-- para convidar uma SEGUNDA pessoa: não tem org_id (a tabela CRIA a
-- organização) nem role (o papel vem fixo do pack via orgAdminRole). Todo
-- outro papel — Colaborador, Líder de Equipe, CHRO, C-Level, SST, RH Admin
-- adicional — só existe hoje como persona de demonstração.
--
-- SOLUÇÃO: member_invites é o análogo de org_invites para uma organização
-- JÁ EXISTENTE — token → org_id + email + role explícitos. accept_member_invite
-- segue exatamente o padrão transacional de provision_organization_from_invite
-- (mesmo repositório, 20260703140000): SELECT ... FOR UPDATE trava a linha do
-- convite contra corrida de duas aceitações simultâneas com o mesmo token.
--
-- DUAS DECISÕES MAIS RESTRITIVAS QUE O PRECEDENTE, DE PROPÓSITO:
--
-- 1) REVOKE ALL explícito logo após o CREATE TABLE. Este projeto Supabase
--    concede ALL por default a authenticated/anon/service_role em toda
--    tabela nova do schema public (achado documentado em
--    20260703230000_revoke_learning_default_privileges.sql) — sem este
--    REVOKE, a ausência de GRANT explícito NÃO significa ausência de acesso.
--
-- 2) EXECUTE de accept_member_invite só para service_role (não authenticated,
--    ao contrário de provision_organization_from_invite, que é chamada
--    direto do cliente após login). Aqui a única chamadora é
--    member-invite.server.ts, que sempre resolve p_user_id a partir do
--    próprio access_token do chamador (nunca do payload) — restringir
--    EXECUTE fecha por completo a possibilidade de alguém tentar consumir o
--    convite de outra pessoa adivinhando um UUID, sem depender só da
--    checagem de e-mail dentro da função.
--
-- 1 PESSOA = 1 PERFIL = 1 ORGANIZAÇÃO (mesmo modelo documentado em
-- 20260703130000_revoke_profile_self_elevation.sql): accept_member_invite
-- recusa com 'already_has_profile' se o usuário já tiver um profiles row —
-- migrar alguém entre organizações é fora de escopo desta RPC.
--
-- HOLDING_ADMIN e GESTOR_CARTEIRA (scope multi-org) NÃO são papéis
-- convidáveis por este mecanismo — ver invitableRoles() em pack-routes.ts.
-- Um admin de holding por definição precisa enxergar mais de uma
-- organização; este modelo de perfil único não comporta isso. Fica para o
-- schema N:M (organization_memberships) já planejado separadamente em
-- docs/PLANO_MESTRE_EVOLUCAO_VITALOS_2026_2027.md.
--
-- APLICAÇÃO REMOTA: pendente. Este arquivo fica pronto (testado localmente
-- via bun run gate) para colar no SQL Editor do Lovable — ver
-- docs/RUNBOOK_MIGRACOES_LOVABLE.md.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.member_invites (
  token           TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(24), 'hex'),
  org_id          UUID NOT NULL REFERENCES public.organizations(id),
  email           TEXT NOT NULL,
  role            TEXT NOT NULL,
  created_by      UUID REFERENCES auth.users(id),
  used_at         TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS member_invites_org_id ON public.member_invites(org_id);

ALTER TABLE public.member_invites ENABLE ROW LEVEL SECURITY;

-- Sem GRANT default confiável nesta conta — fecha explicitamente antes de
-- conceder qualquer coisa (defesa em profundidade, camada independente da RLS).
REVOKE ALL ON public.member_invites FROM authenticated, anon;
GRANT ALL ON public.member_invites TO service_role;

-- Toda escrita (criar convite, aceitar convite) passa por
-- member-invite.server.ts via service_role — esta policy é só leitura direta
-- por um admin autenticado (defesa em profundidade; nenhum caminho do app
-- depende dela hoje, mesmo padrão de org_invites_admin_read).
CREATE POLICY "member_invites_admin_read" ON public.member_invites
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT profiles.org_id FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['RH_ADMIN', 'DIRETOR', 'DGP_RH', 'SINDICO', 'SESMT_SAUDE'])
    )
  );

CREATE OR REPLACE FUNCTION public.accept_member_invite(
  p_invite_token TEXT,
  p_user_id      UUID
)
RETURNS TABLE(org_id UUID, role TEXT, error TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite     public.member_invites%ROWTYPE;
  v_user_email TEXT;
  v_existing   public.profiles%ROWTYPE;
BEGIN
  -- Trava a linha do convite: uma segunda aceitação concorrente com o MESMO
  -- token espera aqui até esta transação terminar (mesma técnica de
  -- provision_organization_from_invite).
  SELECT * INTO v_invite FROM public.member_invites WHERE token = p_invite_token FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'invalid_token'::TEXT;
    RETURN;
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'already_used'::TEXT;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'expired'::TEXT;
    RETURN;
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  IF v_user_email IS NULL OR lower(v_user_email) <> lower(v_invite.email) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'email_mismatch'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_existing FROM public.profiles WHERE id = p_user_id;
  IF FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'already_has_profile'::TEXT;
    RETURN;
  END IF;

  -- SEM bloco de exceção aqui de propósito, mesma razão do precedente: se
  -- este INSERT falhar, a exceção deve propagar e abortar a transação
  -- inteira (nada foi escrito ainda — não há nada para deixar órfão).
  INSERT INTO public.profiles (id, org_id, role, display_name)
  VALUES (p_user_id, v_invite.org_id, v_invite.role, split_part(v_user_email, '@', 1));

  UPDATE public.member_invites
  SET used_at = NOW(), used_by_user_id = p_user_id
  WHERE token = p_invite_token;

  RETURN QUERY SELECT v_invite.org_id, v_invite.role, NULL::TEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_member_invite(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_member_invite(TEXT, UUID) TO service_role;

-- ── Verificação pós-aplicação (colar no Lovable depois de aplicar) ───────────
-- SELECT has_table_privilege('anon', 'public.member_invites', 'SELECT');                    -- false
-- SELECT has_table_privilege('authenticated', 'public.member_invites', 'INSERT');            -- false
-- SELECT has_function_privilege('authenticated', 'public.accept_member_invite(text,uuid)', 'EXECUTE'); -- false
-- SELECT has_function_privilege('service_role', 'public.accept_member_invite(text,uuid)', 'EXECUTE');  -- true
