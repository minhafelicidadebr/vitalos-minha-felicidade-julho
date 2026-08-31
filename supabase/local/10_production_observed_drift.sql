-- ═══════════════════════════════════════════════════════════════════════════
-- DRIFT DE PRODUÇÃO OBSERVADO — SOMENTE PARA REPLAY LOCAL (modo preprod)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Este arquivo NÃO é uma migration. Ele existe para que o replay do pacote G1
-- aconteça contra o estado REAL do alvo, e não contra o estado ideal que a
-- cadeia de migrations descreve.
--
-- POR QUE ISSO IMPORTA: a cadeia versionada já contém duas migrations que
-- fecham a escrita de `role`/`org_id` por `authenticated`
-- (20260703170000_fix_profile_revoke_table_level_grant e a gêmea
-- 20260703203735). Ainda assim, a evidência read-only colhida no banco de
-- PRODUÇÃO mostra a capacidade de UPDATE presente. As duas afirmações só
-- convivem de uma forma: o estado produtivo divergiu do repositório — a
-- revogação não está em vigor lá, seja porque a migration não foi aplicada,
-- seja porque um GRANT posterior a desfez.
--
-- Validar o pacote G1 contra o replay limpo provaria pouco: no replay limpo o
-- buraco de UPDATE já está fechado antes do pacote rodar. Reproduzir o drift
-- aqui é o que torna o teste honesto — o pacote precisa fechar o caminho
-- PARTINDO do estado drifted, e é isso que o modo preprod exercita.
--
-- FONTE DA EVIDÊNCIA (read-only, sem mutação):
--   · policy profiles.profile_own: cmd=ALL, qual=(id = auth.uid()),
--     with_check=(id = auth.uid());
--   · capacidade estrutural de UPDATE em profiles.role e profiles.org_id pelo
--     papel `authenticated`;
--   · contrato de submit_sector_response com 2 argumentos (text, jsonb),
--     reproduzido naturalmente pelo corte em G1_BOUNDARY.
--
-- O drift de INSERT/DELETE não precisa ser injetado: ele nunca foi fechado em
-- lugar nenhum: o GRANT da migration base sobrevive intacto na cadeia inteira.
-- ═══════════════════════════════════════════════════════════════════════════

-- Reintroduz exatamente a capacidade observada no alvo.
GRANT UPDATE ON public.profiles TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- CORREÇÃO PARCIAL DO ASSISTENTE DO LOVABLE — AGORA É MIGRATION REAL
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Este arquivo já simulou manualmente aqui a correção parcial de
-- `20260825022411_81c55fc7-a2bd-4962-b11a-0e1945894d65.sql` (commit "Fixed
-- security issues" na main), na época em que ela só existia em `main` e não
-- nesta branch. A reconciliação de Wave 5.2.1 trouxe esse arquivo de verdade
-- para `supabase/migrations/` — ele agora faz parte de `pacoteG1` (o
-- timestamp cai dentro da janela do G1) e é aplicado de verdade pelo replay,
-- na posição real da cadeia.
--
-- Simular a correção parcial AQUI TAMBÉM duplicaria `CREATE POLICY
-- profile_own_select` e faria a aplicação real da migration abortar por
-- objeto já existente — não por divergência do alvo, por um erro do harness.
-- Então este arquivo agora só injeta o que a migration real NÃO faz por
-- conta própria: o `GRANT UPDATE` residual (achado independente desta onda,
-- nunca fechado por nenhuma migration existente) e o inventário legado.
--
-- Ver `SUPERSEDIDAS_NAO_AUTORADAS` em scripts/db-replay-proof.ts para a
-- análise completa de por que essa migration não fecha o achado e como o
-- pacote a supersede.

-- Confirma que o estado de partida do teste é o estado vulnerável observado.
-- Se um dia a cadeia mudar e este arquivo deixar de reproduzir o alvo, é
-- melhor descobrir aqui do que descobrir depois do Gate G1.
DO $$
BEGIN
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') THEN
    RAISE EXCEPTION 'ABORTED: drift não reproduzido — authenticated deveria poder UPDATE em profiles.role.';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.profiles', 'org_id', 'UPDATE') THEN
    RAISE EXCEPTION 'ABORTED: drift não reproduzido — authenticated deveria poder UPDATE em profiles.org_id.';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.profiles', 'INSERT') THEN
    RAISE EXCEPTION 'ABORTED: baseline inesperado — authenticated deveria ter INSERT em profiles.';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.profiles', 'DELETE') THEN
    RAISE EXCEPTION 'ABORTED: baseline inesperado — authenticated deveria ter DELETE em profiles.';
  END IF;
  IF to_regprocedure('public.submit_sector_response(text,jsonb,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTED: baseline inesperado — o contrato de 3 argumentos não deveria existir antes do pacote G1.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'wave_responses'
       AND column_name = 'invite_token'
  ) THEN
    RAISE EXCEPTION 'ABORTED: baseline inesperado — invite_token deveria existir antes do CONTRACT do pacote G1.';
  END IF;
  -- A correção parcial de 20260825022411 ainda NÃO foi aplicada neste ponto
  -- (ela mora dentro do pacote G1, aplicada mais adiante pelo replay real) —
  -- então a policy FOR ALL original precisa continuar aqui intacta.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'ALL'
  ) THEN
    RAISE EXCEPTION 'ABORTED: baseline inesperado — a policy FOR ALL original deveria existir antes do pacote G1 (a correção parcial do Lovable ainda não rodou).';
  END IF;
  RAISE NOTICE 'PROVEN: estado de partida reproduz o alvo produtivo (ACL drifted + contrato legado de 2 argumentos + invite_token presente + correção parcial do Lovable ainda não aplicada).';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- INVENTÁRIO LEGADO OBSERVADO
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Produção não é um banco vazio: existem organizações, perfis, ondas COPSOQ
-- seladas e convites legados. Rodar o pacote G1 contra um banco limpo provaria
-- que ele APLICA, não que ele aplica SOBRE DADO EXISTENTE — e é a segunda coisa
-- que o Gate G1 precisa saber.
--
-- Reproduz o inventário declarado no cabeçalho de
-- 20260806210000_drop_response_invite_link_contract_production.sql:
--   · 3 ondas COPSOQ legadas, de UUID fixo, todas status='sealed';
--   · 30 convites nessas ondas, com expires_at preenchido e used_at NULL;
--   · wave_responses = 0 linha.
--
-- NADA AQUI É DADO REAL. Os três UUID de onda já estão escritos naquela
-- migration (identificam estrutura, não pessoa). Os convites são tokens gerados
-- na hora e a coluna de e-mail fica NULL — nenhum endereço, real ou sintético,
-- é gravado. Zero resposta é criada, então não existe resposta individual para
-- ser lida por ninguém, nem por este arquivo.
DO $$
DECLARE
  ONDAS_LEGADAS CONSTANT UUID[] := ARRAY[
    '83c204a5-686c-4b0e-ad2b-405e12c67ae9'::UUID,
    'dbd534fe-ab7c-4f75-aa65-0f768195e4bb'::UUID,
    '851c9aa3-8556-4a02-ac23-ce68ceca7d14'::UUID
  ];
  c_org  CONSTANT UUID := 'b0000000-0000-4000-8000-00000000000b';
  v_onda UUID;
  v_i    INTEGER;
BEGIN
  INSERT INTO public.organizations (id, slug, name, pack_id, plan)
  VALUES (c_org, 'baseline-produtivo-replay', 'Baseline Produtivo (replay)', 'enterprise', 'pilot')
  ON CONFLICT (id) DO NOTHING;

  FOREACH v_onda IN ARRAY ONDAS_LEGADAS LOOP
    INSERT INTO public.waves (id, org_id, instrument, label, status, sealed_at)
    VALUES (v_onda, c_org, 'copsoq_iii_short', 'Onda legada (replay)', 'sealed', NOW())
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  FOR v_i IN 1..30 LOOP
    INSERT INTO public.wave_invites (token, wave_id, expires_at, used_at)
    VALUES (
      'replay-legacy-invite-' || lpad(v_i::TEXT, 2, '0'),
      ONDAS_LEGADAS[((v_i - 1) % 3) + 1],
      NOW() + INTERVAL '30 days',
      NULL
    )
    ON CONFLICT (token) DO NOTHING;
  END LOOP;

  IF (SELECT COUNT(*) FROM public.waves
       WHERE id = ANY (ONDAS_LEGADAS) AND status = 'sealed') <> 3 THEN
    RAISE EXCEPTION 'ABORTED: inventário legado não reproduzido (3 ondas seladas).';
  END IF;
  IF (SELECT COUNT(*) FROM public.wave_invites WHERE wave_id = ANY (ONDAS_LEGADAS)) <> 30 THEN
    RAISE EXCEPTION 'ABORTED: inventário legado não reproduzido (30 convites).';
  END IF;
  IF (SELECT COUNT(*) FROM public.wave_responses) <> 0 THEN
    RAISE EXCEPTION 'ABORTED: baseline inválido — wave_responses deveria estar vazia.';
  END IF;

  RAISE NOTICE 'PROVEN: inventário legado reproduzido (3 ondas seladas, 30 convites, 0 resposta).';
END $$;
