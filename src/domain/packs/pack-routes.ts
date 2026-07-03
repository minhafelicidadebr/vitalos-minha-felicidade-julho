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

/** Rota inicial do admin de um setor — declarada no pack (overviewRoute), com fallback ao painel padrão (enterprise/RH_ADMIN → /rh). */
export function resolveOrgOverviewRoute(packId: string): string {
  const pack = resolvePackBundle(packId).pack as unknown as { overviewRoute?: string };
  return pack.overviewRoute ?? "/rh";
}
