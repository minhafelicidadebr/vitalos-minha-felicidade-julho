-- P0-SEC: vincula o provisionamento de organizacao ao usuario autenticado.
--
-- NOTA DE FORMATO: este arquivo e deliberadamente ASCII puro. Uma tentativa
-- anterior de aplicacao falhou com "ERROR 42601: syntax error at or near -"
-- porque o conteudo passou por um renderizador que aplicou substituicao
-- tipografica e transformou o "--" da primeira linha. O arquivo em disco
-- estava correto (bytes 2d 2d), mas o transporte corrompeu. Sem travessao,
-- sem seta, sem moldura, sem acento: nada aqui pode ser substituido no
-- caminho ate o SQL Editor.
--
-- ACHADO (reproduzido ao vivo em staging isolado, com dados sinteticos,
-- antes desta correcao. Ver scripts/staging-org-invite-identity-proof.ts):
--
--   1. usuario A autenticado + convite generico + p_user_id de OUTRA pessoa
--      resultava em organizacao CRIADA e profile vinculado a outra pessoa.
--      Impersonacao.
--   2. anon, SEM NENHUM JWT, + convite generico + p_user_id de outra pessoa
--      resultava em organizacao CRIADA. Nem autenticacao era necessaria.
--
-- CAUSA: a funcao validava identidade apenas dentro de
-- "IF v_invite.email IS NOT NULL" (comparando o e-mail do p_user_id com o do
-- convite) e NUNCA comparava p_user_id com auth.uid(). Como
-- org_invites.email e nullable e o app cria convites sem e-mail de proposito
-- (src/lib/api/org-invite.server.ts:88, fluxo de link generico para
-- WhatsApp), o caminho sem e-mail ficava sem nenhuma checagem de identidade.
-- O token do convite virava, na pratica, autorizacao para escrever no perfil
-- de qualquer UUID.
--
-- Alem disso, anon conseguiu EXECUTE apesar de 20260705160043 ter feito
-- REVOKE EXECUTE ... FROM PUBLIC e concedido so a authenticated. Mesmo
-- padrao de privilegio default da conta ja observado em wave_responses
-- (20260725120000). Por isso o REVOKE abaixo NAO e a defesa principal: a
-- checagem dentro da funcao e. O scanner do Lovable ja demonstrou reconceder
-- EXECUTE por conta propria neste projeto (ver 20260705160043 e
-- 20260714130000), entao uma defesa que dependa so de GRANT/REVOKE nao
-- sobrevive.
--
-- PRECEDENTE IDENTICO: 20260714130000 restringiu accept_member_invite a
-- service_role exatamente por "NUNCA confere se quem esta chamando e o
-- proprio p_user_id". O comentario daquela migration classificou
-- provision_organization_from_invite como "legitimamente chamada do cliente",
-- o que e verdade quanto a intencao, mas a protecao assumida (e-mail do
-- convite) nao existe no caminho de convite generico.
--
-- INVARIANTE INTRODUZIDO: o usuario efetivo do provisionamento e auth.uid(),
-- nunca o p_user_id vindo do cliente. p_user_id permanece na assinatura por
-- compatibilidade (onboarding.server.ts e o types.ts gerado dependem dela),
-- mas passa a ser apenas uma ASSERCAO que precisa bater com auth.uid().
--
-- BYPASS DE service_role, deliberado e necessario: o app real chama esta RPC
-- pelo client de service role (onboarding.server.ts), DEPOIS de resolver a
-- identidade da sessao em onboarding.functions.ts:33
-- (resolveAuthenticatedUserId(data.accessToken)). Nesse caminho auth.uid() e
-- NULL por construcao, e a autorizacao ja aconteceu na camada de aplicacao.
-- Mesma disciplina adotada em 20260725130000 para count_wave_responses.
--
-- A deteccao de service_role usa auth.role(), que le a claim do JWT, e NAO
-- current_user: current_user nao prova a origem da requisicao e mudaria o
-- significado do bypass.
--
-- PRESERVADO integralmente: validacao do token, expiracao, uso unico,
-- validacao de e-mail quando o convite tem e-mail, atomicidade (a checagem
-- entra ANTES de qualquer INSERT, entao falha nao deixa escrita parcial),
-- SECURITY DEFINER com search_path fixo, e o contrato de retorno.

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
  v_caller     UUID := auth.uid();
  v_is_service BOOLEAN := (auth.role() = 'service_role');
BEGIN
  -- Portao de identidade (P0-SEC).
  -- Roda ANTES de ler o convite e antes de qualquer escrita: falha aqui nao
  -- deixa organizacao, profile ou convite consumido para tras.
  IF NOT v_is_service THEN
    -- Sem sessao (anon) nao provisiona nada. Fecha o cenario 2 do achado.
    IF v_caller IS NULL THEN
      RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'not_authenticated'::TEXT;
      RETURN;
    END IF;
    -- p_user_id so pode ser o proprio chamador. Fecha o cenario 1 do achado.
    IF p_user_id IS DISTINCT FROM v_caller THEN
      RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, 'identity_mismatch'::TEXT;
      RETURN;
    END IF;
  END IF;

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
  INSERT INTO public.profiles (id, org_id, role, display_name)
  VALUES (p_user_id, v_org_id, p_role, p_org_name);
  UPDATE public.org_invites SET used_at = NOW(), used_by_org_id = v_org_id WHERE token = p_invite_token;
  RETURN QUERY SELECT v_org_id, p_user_id, COALESCE(v_invite.plan, 'pilot'), NULL::TEXT;
END;
$$;

-- Defesa em profundidade. NAO e o controle principal (ver cabecalho).
-- O app chama por service_role; nenhum caminho de cliente precisa de EXECUTE.
REVOKE EXECUTE ON FUNCTION public.provision_organization_from_invite(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.provision_organization_from_invite(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;

-- Pos-checks (rodar contra o banco vivo, nao apenas citar):
--
-- 1) Privilegio efetivo:
--    SELECT has_function_privilege('anon', p.oid, 'EXECUTE')          -- false
--         , has_function_privilege('authenticated', p.oid, 'EXECUTE') -- false
--         , has_function_privilege('service_role', p.oid, 'EXECUTE')  -- true
--    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public'
--      AND p.proname = 'provision_organization_from_invite';
--
-- 2) Comportamento (staging, dados sinteticos):
--    bun run staging:org-invite-proof
--    usuario A + p_user_id de A       -> organizacao criada
--    usuario A + p_user_id de B       -> identity_mismatch, nenhuma escrita
--    anon sem JWT                     -> not_authenticated, nenhuma escrita
--    convite com e-mail incompativel  -> email_mismatch
--    convite ja consumido             -> already_used
--    service_role (caminho do app)    -> organizacao criada
