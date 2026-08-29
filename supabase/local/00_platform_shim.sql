-- ═══════════════════════════════════════════════════════════════════════════
-- SHIM DE PLATAFORMA SUPABASE — SOMENTE PARA REPLAY LOCAL
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Este arquivo NÃO é uma migration e NUNCA deve ser aplicado em staging ou
-- produção. Ele vive fora de supabase/migrations/ de propósito: o manifesto
-- verificável (supabase/migrations.manifest.json) e a paridade de schema só
-- leem supabase/migrations/*.sql, então nada daqui entra na cadeia produtiva.
--
-- POR QUE EXISTE: a cadeia de migrations depende de objetos que a plataforma
-- Supabase provê, não o projeto — os papéis do PostgREST (anon, authenticated,
-- service_role), o schema `auth`, `auth.users` e as funções `auth.uid()` /
-- `auth.role()` que toda RLS policy usa. Sem eles, um Postgres limpo recusa a
-- primeira migration e o replay completo (PHASE I) seria impossível de provar.
--
-- FIDELIDADE DELIBERADA: `auth.uid()` e `auth.role()` são reproduzidas com a
-- MESMA semântica da plataforma — leem `request.jwt.claims` do GUC da sessão.
-- É isso que permite provar autorização de verdade no replay: a suíte de
-- regressão faz `SET LOCAL ROLE authenticated` + `set_config('request.jwt.
-- claims', ...)` e o banco se comporta como se a requisição tivesse vindo do
-- PostgREST. Um shim que devolvesse um UUID fixo provaria nada.
--
-- O QUE NÃO É SIMULADO (e por que não importa aqui): GoTrue, Storage, Realtime,
-- Kong e o próprio PostgREST. As invariantes desta onda são todas do banco —
-- ACL, RLS, trigger e contrato de RPC — e são checadas no banco.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Papéis do PostgREST ──────────────────────────────────────────────────────
-- NOINHERIT reproduz a plataforma: `authenticator` não herda privilégio, ele
-- precisa de SET ROLE explícito. É o que torna o teste de bypass honesto.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOLOGIN;
  END IF;
END $$;

GRANT anon, authenticated, service_role TO authenticator;
GRANT anon, authenticated, service_role TO postgres;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ── Schema auth ──────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- Subconjunto de auth.users que as migrations realmente referenciam: `id`
-- (alvo de FK em profiles e em várias tabelas pessoais) e `email` (comparado
-- com o e-mail do convite dentro de provision_organization_from_invite e
-- accept_member_invite). As demais ~30 colunas do GoTrue não participam de
-- nenhuma invariante desta onda.
CREATE TABLE IF NOT EXISTS auth.users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT,
  raw_user_meta_data JSONB DEFAULT '{}'::JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Nenhum papel de cliente lê auth.users direto na plataforma real; só as
-- funções SECURITY DEFINER (que rodam como owner) a alcançam.
REVOKE ALL ON auth.users FROM anon, authenticated;

-- ── auth.uid() / auth.role() / auth.jwt() ────────────────────────────────────
-- Semântica idêntica à da plataforma: claim da sessão, NULL quando ausente.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::JSONB ->> 'sub')
  )::UUID
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::JSONB ->> 'role')
  )::TEXT
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::JSONB,
    '{}'::JSONB
  )
$$;

GRANT EXECUTE ON FUNCTION auth.uid(), auth.role(), auth.jwt()
  TO anon, authenticated, service_role;

-- ── Default privileges da conta Lovable ──────────────────────────────────────
-- Achado real registrado em 20260703230000_revoke_learning_default_privileges
-- e em 20260710130000: nesta conta, tabela nova nasce com privilégio para os
-- papéis de cliente. Reproduzir isso no replay é essencial — sem isto, o
-- replay local seria MAIS seguro que a produção e provaria menos do que
-- parece. As migrations que revogam esses defaults precisam ter algo a revogar.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- E o mesmo para FUNÇÕES — esta linha é a mais importante do arquivo para a
-- fidelidade da auditoria de superfície SECURITY DEFINER.
--
-- Sem ela, uma função nova nasce no replay com ACL default (EXECUTE para PUBLIC)
-- e um `REVOKE EXECUTE ... FROM PUBLIC` parece suficiente. Na plataforma real
-- não é: o default privilege da conta concede EXECUTE EXPLICITAMENTE a anon,
-- authenticated e service_role, e revogar de PUBLIC não remove concessão
-- explícita. É a mesma armadilha do GRANT de tabela versus REVOKE de coluna que
-- deixou profiles aberto por semanas.
--
-- Reproduzir isso aqui é o que faz o replay encontrar as funções que só
-- revogaram de PUBLIC — mark_invite_used e accept_member_invite entre elas — em
-- vez de declará-las seguras por engano.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
