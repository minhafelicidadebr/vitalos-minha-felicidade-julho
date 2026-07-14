// Rota inicial do admin de cada setor (P1-06) — pura, testável.
//
// PROBLEMA: o pós-ativação (ativar.$token.tsx) navegava sempre para "/rh",
// correto só para o pack enterprise. Uma diretora de escola ou um síndico
// caíam num dashboard de RH que não fala a língua do setor deles.
//
// SOLUÇÃO: cada pack não-enterprise já declara `overviewRoute` no próprio
// JSON (mesmo campo que AppShell.tsx usa para a navegação da demo) —
// reaproveita a fonte única em vez de duplicar o mapeamento setor→rota.

import { resolvePackBundle } from "./registry";
import type { PackRole } from "@/engine/pack/pack-types";

/** Rota inicial do admin de um setor — declarada no pack (overviewRoute), com fallback ao painel padrão (enterprise/RH_ADMIN → /rh). */
export function resolveOrgOverviewRoute(packId: string): string {
  const pack = resolvePackBundle(packId).pack as unknown as { overviewRoute?: string };
  return pack.overviewRoute ?? "/rh";
}

// Escopos convidáveis pelo mecanismo de convite de membro (member_invites) —
// uma pessoa por vez, sempre dentro de UMA organização já existente. Exclui
// de propósito escopos multi-organização (platform/holding/portfolio) e
// papéis temporários/externos (scoped_reports/opportunities/account_health):
// o modelo de perfil hoje é 1 pessoa = 1 perfil = 1 organização (ver
// 20260703130000_revoke_profile_self_elevation.sql) — convidar alguém como
// Admin do Grupo numa única org seria uma mentira estrutural, não só uma
// lacuna de UI.
const INVITABLE_SCOPES = new Set(["organization", "team", "self"]);

/**
 * Papéis que um admin da organização pode oferecer no convite de pessoa —
 * fonte única usada tanto pelo seletor em /admin quanto pela validação em
 * member-invite.server.ts (nunca duas listas que podem dessincronizar).
 */
export function invitableRoles(pack: { roles: PackRole[] }): PackRole[] {
  return (pack.roles ?? []).filter((role) => INVITABLE_SCOPES.has(role.scope));
}
