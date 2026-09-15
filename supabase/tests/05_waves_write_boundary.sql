-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA EXECUTÁVEL · FRONTEIRA DE ESCRITA DE public.waves (TASK 10.1 §F)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A migration 20260909220000_lock_down_waves_direct_writes.sql revoga
-- INSERT/UPDATE/DELETE de `authenticated`/`anon` em public.waves e remove a
-- policy "waves_admin_write", fechando o P0-2: o gate de instrumento/plano
-- (checkInstrumentAllowed/checkInviteQuota/checkWaveQuota) só existe em
-- TypeScript dentro de createWaveAsAdmin, então enquanto o cliente pudesse
-- escrever direto na tabela ele criava onda de qualquer instrumento (ex.:
-- FIB_T num plano "pilot" que só permite COPSOQ) sem passar por gate algum.
--
-- O postflight daquela migration checa PRIVILÉGIO (has_table_privilege). Isso
-- não é suficiente como prova: privilégio no Postgres é o resultado da
-- INTERAÇÃO entre ACL de tabela, ACL de coluna, RLS e trigger — foi exatamente
-- essa lacuna que deixou `profiles` aberto por semanas (ver o cabeçalho de
-- scripts/db-replay-proof.ts). Aqui o ataque é TENTADO de verdade, como
-- `authenticated`, com JWT de sessão de um admin da organização DONA da onda —
-- o ator mais privilegiado que o antigo grant contemplava.
--
-- Também prova o que NÃO pode ter sido quebrado pela revogação: leitura
-- org-scoped continua funcionando, a fronteira de tenant continua fechada, e
-- o caminho legítimo da aplicação (service_role, usado por
-- createWaveAsAdmin/closeWaveAsAdmin) continua escrevendo normalmente.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 1 · ACL E POLICY (estado declarado)
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco1$
DECLARE
  v_falhas TEXT[] := '{}';
  r        RECORD;
BEGIN
  FOR r IN
    SELECT papel, privilegio,
           has_table_privilege(papel, 'public.waves', privilegio) AS tem
      FROM unnest(ARRAY['anon', 'authenticated']) AS papel,
           unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privilegio
  LOOP
    IF r.tem THEN
      v_falhas := v_falhas || format('%s ainda tem %s direto em public.waves', r.papel, r.privilegio);
    END IF;
  END LOOP;

  -- A revogação não pode ter virado indisponibilidade: listar as próprias
  -- ondas é função legítima de qualquer membro da organização.
  IF NOT has_table_privilege('authenticated', 'public.waves', 'SELECT') THEN
    v_falhas := v_falhas || 'authenticated perdeu SELECT em public.waves (leitura org-scoped quebraria)';
  END IF;

  -- service_role é o caminho real da aplicação (createWaveAsAdmin usa
  -- supabaseAdmin) — tem que continuar podendo escrever.
  FOR r IN
    SELECT privilegio, has_table_privilege('service_role', 'public.waves', privilegio) AS tem
      FROM unnest(ARRAY['INSERT', 'UPDATE', 'DELETE', 'SELECT']) AS privilegio
  LOOP
    IF NOT r.tem THEN
      v_falhas := v_falhas || format('service_role perdeu %s em public.waves', r.privilegio);
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'waves' AND policyname = 'waves_admin_write'
  ) THEN
    v_falhas := v_falhas || 'policy waves_admin_write voltou a existir (sustentava o bypass)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'waves' AND policyname = 'waves_org'
  ) THEN
    v_falhas := v_falhas || 'policy waves_org (SELECT org-scoped) ausente';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.waves'::regclass) THEN
    v_falhas := v_falhas || 'RLS desligada em public.waves';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: ACL/policy de public.waves:\n  - %', array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: WAVES_ACL=authenticated/anon sem INSERT/UPDATE/DELETE · SELECT preservado · service_role intacto · waves_admin_write ausente · RLS on';
END
$bloco1$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 2 · O ATAQUE É TENTADO DE VERDADE, COMO authenticated
-- ═══════════════════════════════════════════════════════════════════════════
DO $bloco2$
DECLARE
  c_org_a   CONSTANT UUID := 'f0000000-0000-4000-8000-00000000fa01';
  c_org_b   CONSTANT UUID := 'f0000000-0000-4000-8000-00000000fb01';
  c_onda_a  CONSTANT UUID := 'f0000000-0000-4000-8000-00000000fa02';
  c_onda_b  CONSTANT UUID := 'f0000000-0000-4000-8000-00000000fb02';
  c_admin_a CONSTANT UUID := 'f0000000-0000-4000-8000-00000000fa03';
  v_out     TEXT;
  v_antes   INTEGER;
  v_depois  INTEGER;
  v_lidas   INTEGER;
  v_status  TEXT;
  v_falhas  TEXT[] := '{}';
BEGIN
  -- ── Fixtures: duas organizações, uma onda cada. Nenhum dado real. ────────
  INSERT INTO public.organizations (id, slug, name) VALUES
    (c_org_a, 'org-fronteira-waves-a', 'Org Fronteira Waves A'),
    (c_org_b, 'org-fronteira-waves-b', 'Org Fronteira Waves B')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (id, email)
  VALUES (c_admin_a, 'admin-fronteira-waves@exemplo.invalid')
  ON CONFLICT (id) DO NOTHING;

  -- RH_ADMIN da org A: exatamente o papel que a policy removida
  -- ("waves_admin_write", role IN ('RH_ADMIN','DIRETOR','SST')) autorizava a
  -- escrever direto. Se o fechamento fosse incompleto, ESTE ator escreveria.
  INSERT INTO public.profiles (id, org_id, role, display_name)
  VALUES (c_admin_a, c_org_a, 'RH_ADMIN', 'Admin Fronteira A')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.waves (id, org_id, instrument, label, status) VALUES
    (c_onda_a, c_org_a, 'COPSOQ', 'Onda Fronteira A', 'collecting'),
    (c_onda_b, c_org_b, 'COPSOQ', 'Onda Fronteira B', 'collecting')
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO v_antes FROM public.waves;

  -- ── Vira authenticated com JWT real do admin da org A ────────────────────
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', c_admin_a::TEXT, 'role', 'authenticated')::TEXT,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  -- 2.1 INSERT direto — o bypass do P0-2. Instrumento FIB_T na PRÓPRIA org
  -- (nada de cross-tenant aqui): o ponto é que o gate de plano/instrumento
  -- vive só na aplicação, então qualquer escrita direta o contorna.
  v_out := _proof.attempt(format(
    'INSERT INTO public.waves (org_id, instrument, label, status) VALUES (%L, %L, %L, %L)',
    c_org_a, 'FIB_T', 'ATAQUE-INSERT-DIRETO', 'collecting'));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('authenticated INSERT direto em waves NÃO foi bloqueado (%s)', v_out);
  END IF;

  -- 2.2 UPDATE direto — mudar o instrumento de uma onda existente é o mesmo
  -- bypass por outra porta (contorna checkInstrumentAllowed igualmente).
  v_out := _proof.attempt(format(
    'UPDATE public.waves SET instrument = %L WHERE id = %L', 'FIB_T', c_onda_a));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('authenticated UPDATE direto em waves NÃO foi bloqueado (%s)', v_out);
  END IF;

  -- 2.3 UPDATE de selamento — reabrir/reselar onda sem passar por
  -- closeWaveAsAdmin (que é a única ação autorizada a selar, P0-08).
  v_out := _proof.attempt(format(
    'UPDATE public.waves SET status = %L, seal_outcome = %L WHERE id = %L',
    'sealed', 'published', c_onda_a));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('authenticated UPDATE de status/seal_outcome NÃO foi bloqueado (%s)', v_out);
  END IF;

  -- 2.4 DELETE direto — apagar a própria onda destruiria evidência.
  v_out := _proof.attempt(format('DELETE FROM public.waves WHERE id = %L', c_onda_a));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('authenticated DELETE direto em waves NÃO foi bloqueado (%s)', v_out);
  END IF;

  -- 2.5 Cross-tenant: escrever na onda de OUTRA organização.
  v_out := _proof.attempt(format(
    'UPDATE public.waves SET label = %L WHERE id = %L', 'INVADIDA', c_onda_b));
  IF NOT _proof.blocked(v_out) THEN
    v_falhas := v_falhas || format('authenticated UPDATE cross-tenant em waves NÃO foi bloqueado (%s)', v_out);
  END IF;

  -- 2.6 O que TEM que continuar funcionando: ler as ondas da própria org.
  SELECT COUNT(*) INTO v_lidas FROM public.waves WHERE org_id = c_org_a;
  IF v_lidas < 1 THEN
    v_falhas := v_falhas || 'authenticated não consegue mais LER as ondas da própria organização (revogação virou indisponibilidade)';
  END IF;

  -- 2.7 Fronteira de tenant na LEITURA: a onda da org B não pode aparecer.
  SELECT COUNT(*) INTO v_lidas FROM public.waves WHERE org_id = c_org_b;
  IF v_lidas <> 0 THEN
    v_falhas := v_falhas || format('authenticated leu %s onda(s) de outra organização', v_lidas);
  END IF;

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);

  -- ── Nada foi escrito: a contagem e o estado da onda A não mudaram ────────
  SELECT COUNT(*) INTO v_depois FROM public.waves;
  IF v_depois <> v_antes THEN
    v_falhas := v_falhas || format(
      'a contagem de waves mudou de %s para %s — alguma escrita passou', v_antes, v_depois);
  END IF;

  SELECT instrument || '|' || status || '|' || COALESCE(label, '')
    INTO v_status FROM public.waves WHERE id = c_onda_a;
  IF v_status IS DISTINCT FROM 'COPSOQ|collecting|Onda Fronteira A' THEN
    v_falhas := v_falhas || format('a onda A foi alterada por algum dos ataques: %s', v_status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.waves WHERE label = 'Onda Fronteira B') THEN
    v_falhas := v_falhas || 'a onda B (outro tenant) foi alterada/removida';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: fronteira de escrita de public.waves:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: WAVES_DIRECT_INSERT=BLOCKED · WAVES_DIRECT_UPDATE=BLOCKED · WAVES_DIRECT_DELETE=BLOCKED · CROSS_TENANT_WRITE=BLOCKED · ORG_SCOPED_READ=PASS · TENANT_READ_BOUNDARY=PASS (como RH_ADMIN autenticado da org dona)';
END
$bloco2$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 3 · O CAMINHO LEGÍTIMO DA APLICAÇÃO CONTINUA FUNCIONANDO
-- ═══════════════════════════════════════════════════════════════════════════
--
-- createWaveAsAdmin/closeWaveAsAdmin escrevem via supabaseAdmin (service
-- role). Fechar a porta do cliente não pode ter fechado a da aplicação —
-- senão a correção de segurança viraria uma indisponibilidade.
DO $bloco3$
DECLARE
  c_org_a  CONSTANT UUID := 'f0000000-0000-4000-8000-00000000fa01';
  c_onda_a CONSTANT UUID := 'f0000000-0000-4000-8000-00000000fa02';
  v_nova   UUID;
  v_falhas TEXT[] := '{}';
BEGIN
  -- Como service_role (o papel que a aplicação usa de fato).
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  EXECUTE 'SET LOCAL ROLE service_role';

  INSERT INTO public.waves (org_id, instrument, label, status)
  VALUES (c_org_a, 'COPSOQ', 'Onda Legitima Service Role', 'collecting')
  RETURNING id INTO v_nova;

  IF v_nova IS NULL THEN
    v_falhas := v_falhas || 'service_role não conseguiu criar onda (caminho legítimo quebrado)';
  END IF;

  -- Selamento — o que closeWaveAsAdmin faz ao fechar a onda.
  UPDATE public.waves
     SET status = 'sealed', sealed_at = NOW(), seal_outcome = 'withheld_for_privacy'
   WHERE id = v_nova;
  IF NOT EXISTS (
    SELECT 1 FROM public.waves
     WHERE id = v_nova AND status = 'sealed' AND seal_outcome = 'withheld_for_privacy'
  ) THEN
    v_falhas := v_falhas || 'service_role não conseguiu selar a onda (closeWaveAsAdmin quebraria)';
  END IF;

  DELETE FROM public.waves WHERE id = v_nova;

  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '', true);

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: caminho legítimo da aplicação:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: LEGITIMATE_APP_WAVE_MANAGEMENT=PASS (service_role cria e sela onda; seal_outcome=withheld_for_privacy aceito pelo schema)';
END
$bloco3$;

-- ═══════════════════════════════════════════════════════════════════════════
-- BLOCO 4 · NENHUMA RPC ALCANÇÁVEL PELO CLIENTE MUTA public.waves
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Requisito explícito da TASK 10.1 §F: "não apenas grep de nomes de função —
-- rastreie os caminhos de mutação". Aqui o rastreio é feito no CATÁLOGO do
-- banco (mais forte que grep no repo): para CADA função do schema public
-- executável por anon ou authenticated, inspeciona o corpo real
-- (pg_get_functiondef) procurando mutação de waves. Uma função nova que
-- reabrisse essa porta — por qualquer nome — falha aqui.
DO $bloco4$
DECLARE
  r        RECORD;
  v_falhas TEXT[] := '{}';
  v_total  INTEGER := 0;
BEGIN
  FOR r IN
    SELECT p.oid,
           p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS assinatura,
           pg_get_functiondef(p.oid) AS corpo
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind = 'f'
       AND (
         has_function_privilege('anon', p.oid, 'EXECUTE')
         OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
       )
  LOOP
    v_total := v_total + 1;
    IF r.corpo ~* '(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(public\.)?waves\M' THEN
      v_falhas := v_falhas || format(
        '%s é executável por anon/authenticated E muta public.waves — bypass do gate de instrumento/plano',
        r.assinatura);
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    v_falhas := v_falhas || 'nenhuma função alcançável pelo cliente foi inspecionada — o rastreio não rodou de fato';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION E'FAILED: rastreio de caminhos de mutação de waves:\n  - %',
      array_to_string(v_falhas, E'\n  - ');
  END IF;

  RAISE NOTICE 'PROVEN: NO_CLIENT_REACHABLE_RPC_MUTATES_WAVES=true (% função(ões) do schema public executáveis por anon/authenticated inspecionadas no catálogo, nenhuma muta waves)', v_total;
END
$bloco4$;

-- ── Limpeza das fixtures deste arquivo ──────────────────────────────────────
DELETE FROM public.waves
 WHERE id IN ('f0000000-0000-4000-8000-00000000fa02', 'f0000000-0000-4000-8000-00000000fb02');
DELETE FROM public.profiles WHERE id = 'f0000000-0000-4000-8000-00000000fa03';
DELETE FROM public.organizations
 WHERE id IN ('f0000000-0000-4000-8000-00000000fa01', 'f0000000-0000-4000-8000-00000000fb01');
