-- ═══════════════════════════════════════════════════════════════════════════
-- CORREÇÃO: a revogação de P0-03 estava incompleta (achado em produção)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A migration 20260703130000_revoke_profile_self_elevation.sql fez
-- `REVOKE UPDATE (role, org_id) ON public.profiles FROM authenticated`,
-- assumindo que isso bastava. NÃO bastou: `public.profiles` já tinha
-- `GRANT UPDATE` na TABELA INTEIRA para `authenticated` desde a migration
-- base (schema original do projeto). No Postgres, privilégio de coluna e
-- privilégio de tabela são entradas de ACL SEPARADAS — revogar a entrada
-- por coluna não subtrai nada da entrada de tabela que já cobre todas as
-- colunas. As duas convivem, e a de tabela prevalece: `authenticated`
-- continuava podendo dar UPDATE em role/org_id através do grant de tabela,
-- mesmo com o REVOKE column-level aplicado. Confirmado ao vivo via
-- `has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')`
-- retornando TRUE mesmo depois da migration anterior.
--
-- CORREÇÃO: revogar UPDATE da tabela inteira, e reconceder explicitamente
-- só a coluna que o próprio usuário tem legítimo motivo de editar
-- (display_name — nome de exibição do perfil). role e org_id ficam sem
-- NENHUM caminho de UPDATE para `authenticated`; só `service_role`
-- continua podendo escrevê-los (via as RPCs SECURITY DEFINER, nunca por
-- UPDATE direto do cliente).
--
-- LIÇÃO para qualquer REVOKE column-level futuro neste projeto: sempre
-- checar primeiro se já existe um GRANT de tabela que o neutralizaria.
-- ═══════════════════════════════════════════════════════════════════════════

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;
