-- ═══════════════════════════════════════════════════════════════════════════
-- FECHA O GRANT AUTOMÁTICO DE authenticated EM accept_member_invite
-- (achado ao verificar 20260714120000 — mesma classe do achado #3 já
-- documentado em provision_organization_from_invite)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ACHADO (via query de verificação colada no Lovable logo após aplicar
-- 20260714120000_member_invites.sql): has_function_privilege('authenticated',
-- 'accept_member_invite(text,uuid)', 'EXECUTE') voltou TRUE, mesmo com a
-- migration terminando em REVOKE ... FROM PUBLIC / GRANT ... TO service_role
-- explícitos. O scanner de segurança do próprio Lovable detecta função nova
-- SECURITY DEFINER e adiciona GRANT EXECUTE TO authenticated por conta
-- própria — mesmo comportamento já documentado para
-- provision_organization_from_invite (achado #3, 20260705160043).
--
-- POR QUE ISSO É GRAVE AQUI (mais que no precedente): accept_member_invite
-- confere que o e-mail do p_user_id bate com o convite, mas NUNCA confere se
-- quem está chamando é o próprio p_user_id. Com EXECUTE liberado para
-- authenticated, qualquer pessoa logada — não precisa nem ser a convidada —
-- poderia chamar accept_member_invite(token_alheio, uuid_de_outra_pessoa) e
-- criar um perfil de organização para essa outra pessoa, sem o consentimento
-- dela. Por isso esta função foi desenhada desde o início para só aceitar
-- chamada via service_role (diferente de provision_organization_from_invite,
-- que é legitimamente chamada do cliente após login).
--
-- REVOKE é idempotente por natureza — colar de novo é sempre seguro.
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.accept_member_invite(TEXT, UUID) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_member_invite(TEXT, UUID) TO service_role;

-- ── Verificação pós-aplicação ────────────────────────────────────────────────
-- SELECT has_function_privilege('authenticated', 'public.accept_member_invite(text,uuid)', 'EXECUTE'); -- false
-- SELECT has_function_privilege('service_role', 'public.accept_member_invite(text,uuid)', 'EXECUTE');  -- true
