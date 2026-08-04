-- PROD-0.6C — dados sintéticos do TARGETED_HARNESS.
--
-- UUIDs DETERMINÍSTICOS derivados de namespace própria de teste:
--   md5('vitalos-proof-ns:' || <nome>)::uuid
-- Reprodutíveis, sem extensão, e sem qualquer relação com UUID real de
-- produção ou staging. E-mails em example.invalid. Nomes marcados TEST_ONLY.
--
-- NENHUM dado copiado de staging ou produção.

INSERT INTO auth.users (id, email) VALUES
  (md5('vitalos-proof-ns:admin')::uuid,  'admin@example.invalid'),
  (md5('vitalos-proof-ns:membro')::uuid, 'membro@example.invalid')
ON CONFLICT DO NOTHING;

INSERT INTO public.organizations (id, slug, name) VALUES
  (md5('vitalos-proof-ns:org')::uuid, 'test-only-org', 'TEST_ONLY Organização de Prova')
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, org_id, role, display_name) VALUES
  (md5('vitalos-proof-ns:admin')::uuid,  md5('vitalos-proof-ns:org')::uuid, 'RH_ADMIN',    'TEST_ONLY Admin'),
  (md5('vitalos-proof-ns:membro')::uuid, md5('vitalos-proof-ns:org')::uuid, 'COLABORADOR', 'TEST_ONLY Membro')
ON CONFLICT DO NOTHING;

INSERT INTO public.waves (id, org_id, instrument, label, status) VALUES
  (md5('vitalos-proof-ns:wave')::uuid, md5('vitalos-proof-ns:org')::uuid, 'fibt', 'TEST_ONLY Onda', 'open')
ON CONFLICT DO NOTHING;

-- 30 convites não usados e não enviados — espelha o baseline produtivo PROD-0.
INSERT INTO public.wave_invites (token, wave_id, email)
SELECT 'TEST_ONLY_TOKEN_' || lpad(i::text, 3, '0'),
       md5('vitalos-proof-ns:wave')::uuid,
       'participante' || i || '@example.invalid'
  FROM generate_series(1, 30) i
ON CONFLICT DO NOTHING;

-- wave_responses permanece VAZIA — é o baseline autorizado da Migration B.
