-- FRONTEIRA DE AUTORIDADE DE profiles — CRITICAL: autoescalação de privilégio
--
-- ═══════════════════════════════════════════════════════════════════════════
-- ACHADO
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `Users can grant themselves administrative privileges.`
--
-- `public.profiles` guarda as duas colunas de onde TODA a autorização do
-- sistema deriva: `role` (papel) e `org_id` (tenant). Dezenas de policies em
-- outras tabelas resolvem autoridade lendo essas colunas — waves,
-- member_invites, org_invites, wave_invites, planos de ação, capsules. Quem
-- escreve nelas escreve a própria autorização e o próprio tenant.
--
-- O estado que permitia isso tinha duas partes, e as duas vinham da migration
-- base 20260630161949:
--
--   1. GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated
--   2. CREATE POLICY "profile_own" ON public.profiles FOR ALL
--        USING (id = auth.uid()) WITH CHECK (id = auth.uid())
--
-- A policy é de LINHA ("é minha própria linha?") e nunca de COLUNA. O GRANT é
-- de TABELA e cobre todas as colunas. Juntos: `UPDATE profiles SET role =
-- 'RH_ADMIN', org_id = '<outra org>' WHERE id = auth.uid()` satisfazia a
-- condição da policy e o privilégio da ACL.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE AS DUAS CORREÇÕES ANTERIORES NÃO FECHARAM
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 20260703130000 revogou UPDATE (role, org_id) por COLUNA. Não bastou: o GRANT
-- de TABELA pré-existente é uma entrada de ACL separada e continuava cobrindo
-- as duas colunas.
--
-- 20260703170000 corrigiu isso — `REVOKE UPDATE ON profiles` + `GRANT UPDATE
-- (display_name)`. Fechou o UPDATE. E parou aí.
--
-- O que ficou aberto, e é o achado desta onda: **INSERT e DELETE nunca foram
-- revogados**, e a policy `profile_own` é `FOR ALL` — ela cobre INSERT e DELETE
-- também. Então o caminho continuava trivial, só com dois passos:
--
--     DELETE FROM public.profiles WHERE id = auth.uid();
--     INSERT INTO public.profiles (id, org_id, role)
--     VALUES (auth.uid(), '<qualquer org>', 'RH_ADMIN');
--
-- As duas operações satisfazem `id = auth.uid()`. Privilégio de coluna não
-- restringe INSERT (o GRANT de INSERT era de tabela). O resultado é o mesmo
-- que o UPDATE proibido, por uma porta que ninguém tinha olhado.
--
-- LIÇÃO EMBUTIDA NO DESENHO DESTA MIGRATION: as duas tentativas anteriores
-- falharam por tratarem UMA camada como suficiente. Esta usa três, e a
-- terceira é testada COM as duas primeiras desfeitas
-- (supabase/tests/01_profile_authority_boundary.sql, bloco 5).
--
-- ═══════════════════════════════════════════════════════════════════════════
-- AS TRÊS CAMADAS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. ACL — `authenticated` fica com SELECT e com UPDATE de UMA coluna
--    (display_name). Sem INSERT, sem DELETE, sem TRUNCATE, sem REFERENCES,
--    sem TRIGGER. `anon` fica sem nada.
--
-- 2. RLS POR COMANDO — a policy `FOR ALL` é substituída por uma de SELECT e
--    uma de UPDATE. Não existe policy de INSERT nem de DELETE, e RLS nega por
--    padrão o que nenhuma policy permite. Duas camadas independentes negando
--    as mesmas duas operações.
--
-- 3. TRIGGER DE INVARIANTE — recusa, vindo de papel de cliente, qualquer
--    INSERT, qualquer DELETE e qualquer UPDATE que mexa em `role`, `org_id` ou
--    `id`. Esta é a camada que sobrevive a drift: um `GRANT` acidental ou uma
--    policy permissiva recriada por assistente de migration não reabre o
--    caminho.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE CONTINUA FUNCIONANDO (e é provado, não presumido)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Nenhum caminho legítimo da aplicação escreve profiles como `authenticated`.
-- Todo perfil nasce dentro de RPC SECURITY DEFINER — provision_organization_
-- from_invite (onboarding) e accept_member_invite (convite de membro) — que
-- rodam como owner da função e por isso passam pela camada 3. O app as chama
-- pelo cliente de service_role, depois de resolver a identidade da sessão em
-- servidor. `service_role` mantém escrita administrativa: é o único caminho de
-- correção de papel que existe hoje, já que não há RPC de promoção.
--
-- A única escrita legítima de cliente é o próprio nome de exibição, e ela
-- continua permitida — com teste positivo para que "revogar tudo" não passe
-- por sucesso.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. PRECONDITIONS
-- ---------------------------------------------------------------------------

DO $preflight$
DECLARE
  v_colunas TEXT;
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: public.profiles não existe.';
  END IF;

  -- As três colunas de autoridade/identidade precisam existir com o nome
  -- esperado. Se o schema tiver derivado, o hardening abaixo endureceria o
  -- objeto errado e a suíte passaria testando outra coisa.
  SELECT string_agg(column_name, ', ' ORDER BY column_name) INTO v_colunas
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
     AND column_name IN ('id', 'org_id', 'role', 'display_name');

  IF v_colunas IS DISTINCT FROM 'display_name, id, org_id, role' THEN
    RAISE EXCEPTION 'ABORTADO: contrato de colunas de profiles divergiu (encontrado: %).',
      COALESCE(v_colunas, 'nenhuma');
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass) THEN
    RAISE EXCEPTION 'ABORTADO: row level security está desabilitada em public.profiles.';
  END IF;

  -- As RPCs que são o único caminho legítimo de criação de perfil precisam
  -- existir ANTES de a criação por cliente ser fechada. Fechar sem elas
  -- transformaria hardening em indisponibilidade de onboarding.
  IF to_regprocedure('public.provision_organization_from_invite(text,uuid,text,text,text,text,text,text,text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: provision_organization_from_invite ausente — o onboarding ficaria sem caminho de criação de perfil.';
  END IF;
  IF to_regprocedure('public.accept_member_invite(text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'ABORTADO: accept_member_invite ausente — a aceitação de convite ficaria sem caminho de criação de perfil.';
  END IF;

  RAISE NOTICE 'Preconditions OK: contrato de profiles íntegro e caminhos legítimos presentes.';
END
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. CAMADA 1 · ACL DE MENOR PRIVILÉGIO
-- ---------------------------------------------------------------------------
--
-- REVOKE ALL primeiro, e só então reconceder o mínimo. É a ordem que evita a
-- armadilha de 20260703130000: revogar por coluna sem antes retirar o grant de
-- tabela que a neutraliza. Aqui não há sobra possível — parte-se de zero.

REVOKE ALL ON public.profiles FROM anon, authenticated;

-- SELECT da própria linha: a sessão do app lê org_id/role/display_name, e as
-- policies de outras tabelas resolvem autoridade por subconsulta em profiles.
GRANT SELECT ON public.profiles TO authenticated;

-- A única coluna que o dono do perfil tem motivo legítimo de escrever.
GRANT UPDATE (display_name) ON public.profiles TO authenticated;

-- Escrita administrativa permanece com service_role (usado pelas RPCs e pelo
-- servidor, nunca exposto ao navegador).
GRANT ALL ON public.profiles TO service_role;

-- ---------------------------------------------------------------------------
-- 2. CAMADA 2 · RLS POR COMANDO, SEM `FOR ALL`
-- ---------------------------------------------------------------------------
--
-- `FOR ALL` foi a raiz do achado: uma policy pensada para leitura da própria
-- linha acabou autorizando INSERT e DELETE da própria linha. Separar por
-- comando torna a intenção explícita e faz o silêncio significar negação.

DROP POLICY IF EXISTS "profile_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- USING e WITH CHECK ambos amarrados à própria linha: sem WITH CHECK, um
-- UPDATE poderia mover a linha para fora do escopo visível.
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Nenhuma policy de INSERT e nenhuma de DELETE, de propósito: RLS nega por
-- padrão o que nenhuma policy permite. A ausência AQUI é o controle.

-- ---------------------------------------------------------------------------
-- 3. CAMADA 3 · TRIGGER DE INVARIANTE (sobrevive a drift)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_profile_authority_boundary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $trigger$
DECLARE
  -- Papéis alcançáveis pela API pública sem nenhum segredo: é o que o
  -- PostgREST assume para uma requisição de navegador. `authenticator` entra na
  -- lista porque é o papel de conexão do PostgREST — ninguém deveria escrever
  -- profiles como ele, e se um dia escrever, é bug ou ataque.
  --
  -- Lista de NEGAÇÃO e não de permissão, deliberadamente: o conjunto de papéis
  -- privilegiados varia entre plataforma, replay local e futuras integrações
  -- (postgres, service_role, supabase_admin, o owner de cada função DEFINER).
  -- Uma allowlist erraria fechando um caminho legítimo em silêncio no pior
  -- momento; a denylist é fechada, curta e verificável — esses três papéis são
  -- exatamente os expostos pela borda pública.
  PAPEIS_DE_CLIENTE CONSTANT TEXT[] := ARRAY['anon', 'authenticated', 'authenticator'];
BEGIN
  -- Fora da borda pública (RPC SECURITY DEFINER rodando como owner,
  -- service_role, manutenção via postgres) nada é restringido aqui: a
  -- autorização desses caminhos acontece antes, na aplicação e nas próprias
  -- funções.
  IF NOT (current_user::TEXT = ANY (PAPEIS_DE_CLIENTE)) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'perfil não pode ser criado por papel de cliente (%): use o fluxo de convite.', current_user
      USING ERRCODE = 'insufficient_privilege',
            HINT = 'provision_organization_from_invite ou accept_member_invite';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'perfil não pode ser removido por papel de cliente (%).', current_user
      USING ERRCODE = 'insufficient_privilege',
            HINT = 'remoção de perfil é operação administrativa';
  END IF;

  -- UPDATE: a linha pode ser editada, a AUTORIDADE dela não.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role não pode ser alterado por papel de cliente (%).', current_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'profiles.org_id não pode ser alterado por papel de cliente (%).', current_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Trocar `id` seria assumir o perfil de outra pessoa.
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.id não pode ser alterado por papel de cliente (%).', current_user
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END
$trigger$;

COMMENT ON FUNCTION public.enforce_profile_authority_boundary() IS
  'Camada 3 da fronteira de autoridade de profiles. Recusa INSERT, DELETE e alteracao de role/org_id/id quando a operacao vem de papel de cliente (anon, authenticated, authenticator). Existe para sobreviver a drift de ACL ou de RLS: com GRANT reconcedido e policy FOR ALL recriada, esta camada continua recusando. Provado em supabase/tests/01_profile_authority_boundary.sql, bloco 5.';

DROP TRIGGER IF EXISTS profiles_authority_boundary ON public.profiles;

CREATE TRIGGER profiles_authority_boundary
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_authority_boundary();

COMMENT ON TABLE public.profiles IS
  'Perfil: vinculo pessoa->organizacao e papel. role e org_id sao campos de AUTORIDADE -- toda policy de tenant do sistema deriva deles. Escrita por papel de cliente restringida em tres camadas independentes: ACL (so SELECT + UPDATE de display_name), RLS por comando (sem policy de INSERT/DELETE) e trigger de invariante. Criacao de perfil apenas via RPC SECURITY DEFINER do fluxo de convite; correcao de papel apenas via service_role.';

-- ---------------------------------------------------------------------------
-- 4. TENANT: criação e alteração de organização não é operação de cliente
-- ---------------------------------------------------------------------------
--
-- `organizations` também nasceu com GRANT SELECT, INSERT, UPDATE, DELETE para
-- `authenticated`, e nunca teve policy de escrita — então a RLS já negava. Mas
-- isso é UMA camada: uma única policy permissiva recriada por engano
-- transformaria o grant esquecido em criação de tenant pelo cliente. Nenhum
-- caminho da aplicação escreve organizations como `authenticated` (tudo passa
-- por service_role ou pela RPC de provisionamento), então o grant é dívida
-- pura.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.organizations FROM anon, authenticated;
GRANT ALL ON public.organizations TO service_role;

-- ---------------------------------------------------------------------------
-- 5. POSTCONDITIONS
-- ---------------------------------------------------------------------------
--
-- Asserções de CATÁLOGO: as três camadas existem e o mínimo legítimo sobrevive.
-- A prova de COMPORTAMENTO (o ataque realmente falha) vive em
-- supabase/tests/01_profile_authority_boundary.sql, executada contra um banco
-- real pelo replay — catálogo não substitui tentar o ataque.

DO $postflight$
DECLARE
  v_falhas TEXT[] := '{}';
BEGIN
  -- Camada 1
  IF has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') THEN
    v_falhas := v_falhas || 'authenticated ainda pode UPDATE profiles.role';
  END IF;
  IF has_column_privilege('authenticated', 'public.profiles', 'org_id', 'UPDATE') THEN
    v_falhas := v_falhas || 'authenticated ainda pode UPDATE profiles.org_id';
  END IF;
  IF has_table_privilege('authenticated', 'public.profiles', 'INSERT') THEN
    v_falhas := v_falhas || 'authenticated ainda tem INSERT em profiles';
  END IF;
  IF has_table_privilege('authenticated', 'public.profiles', 'DELETE') THEN
    v_falhas := v_falhas || 'authenticated ainda tem DELETE em profiles';
  END IF;
  IF has_table_privilege('anon', 'public.profiles', 'SELECT') THEN
    v_falhas := v_falhas || 'anon ainda tem SELECT em profiles';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.profiles', 'SELECT') THEN
    v_falhas := v_falhas || 'authenticated perdeu SELECT em profiles (a sessão quebraria)';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE') THEN
    v_falhas := v_falhas || 'authenticated perdeu UPDATE de display_name (revogação excessiva)';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.profiles', 'UPDATE') THEN
    v_falhas := v_falhas || 'service_role perdeu UPDATE em profiles (correção de papel ficaria sem caminho)';
  END IF;

  -- Camada 2
  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'ALL') THEN
    v_falhas := v_falhas || 'sobrou policy FOR ALL em profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'profiles'
                AND cmd IN ('INSERT', 'DELETE')) THEN
    v_falhas := v_falhas || 'existe policy de INSERT ou DELETE em profiles';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                  WHERE schemaname = 'public' AND tablename = 'profiles'
                    AND policyname = 'profiles_select_own' AND cmd = 'SELECT') THEN
    v_falhas := v_falhas || 'policy profiles_select_own ausente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                  WHERE schemaname = 'public' AND tablename = 'profiles'
                    AND policyname = 'profiles_update_own' AND cmd = 'UPDATE'
                    AND with_check IS NOT NULL) THEN
    v_falhas := v_falhas || 'policy profiles_update_own ausente ou sem WITH CHECK';
  END IF;

  -- Camada 3
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.profiles'::regclass
       AND NOT tgisinternal
       AND tgname = 'profiles_authority_boundary'
       AND tgtype & 4 = 4    -- INSERT
       AND tgtype & 8 = 8    -- DELETE
       AND tgtype & 16 = 16  -- UPDATE
  ) THEN
    v_falhas := v_falhas || 'trigger profiles_authority_boundary ausente ou não cobre INSERT/UPDATE/DELETE';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p, unnest(p.proconfig) AS cfg
     WHERE p.oid = to_regprocedure('public.enforce_profile_authority_boundary()')
       AND cfg ~ 'search_path\s*=\s*"?public"?'
  ) THEN
    v_falhas := v_falhas || 'enforce_profile_authority_boundary sem search_path fixo';
  END IF;
  IF (SELECT prosecdef FROM pg_proc
       WHERE oid = to_regprocedure('public.enforce_profile_authority_boundary()')) THEN
    v_falhas := v_falhas || 'enforce_profile_authority_boundary é SECURITY DEFINER (precisa ser INVOKER para ler current_user do chamador)';
  END IF;

  -- Tenant
  IF has_table_privilege('authenticated', 'public.organizations', 'INSERT')
     OR has_table_privilege('authenticated', 'public.organizations', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.organizations', 'DELETE') THEN
    v_falhas := v_falhas || 'authenticated ainda escreve em organizations';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.organizations', 'SELECT') THEN
    v_falhas := v_falhas || 'authenticated perdeu SELECT em organizations';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FALHA: hardening incompleto:\n  - %', array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: fronteira de autoridade de profiles em 3 camadas (ACL + RLS por comando + trigger).';
  RAISE NOTICE 'PROVEN: escrita de cliente em organizations revogada; SELECT e service_role preservados.';
END
$postflight$;

COMMIT;
