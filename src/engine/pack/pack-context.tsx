// Contexto do pack ativo — a METADE PURA da fronteira Engine↔Domínio.
// Este arquivo não importa NADA de domain/: só define o shape do contexto e
// o hook de leitura. Quem carrega/valida o pack (e portanto importa o
// registro de domain/) é o composition root: src/app/composition/PackProvider.tsx.
// (P1-07: engine nunca importa domain — a única exceção histórica vivia aqui
// e foi movida para a camada de composição em 2026-07-09.)
//
// Exceção pragmática documentada: este arquivo usa React (createContext), o
// que §6 desencoraja em engine/. O contexto É a interface pública que ~80
// rotas consomem via usePack() — movê-lo quebraria a superfície inteira sem
// ganho de pureza real (não há lógica aqui, só um read de contexto). O
// invariante que importa (zero import de domain/) está garantido.

import { createContext, useContext } from "react";
import type { DomainPack, GamificationEconomy, PackStatus, ProprietaryIndex } from "./pack-types";

export interface PackContextValue {
  status: PackStatus;
  pack: DomainPack | null;
  index: ProprietaryIndex | null;
  gamification: GamificationEconomy | null;
  /** Id do pack ativo (setor). */
  packId: string;
  /** Rótulo institucional do setor ativo (ex.: "Empresa", "Escola"). */
  sectorLabel: string;
  /** Troca o setor ativo em runtime. */
  setPackId: (packId: string) => void;
  t: (token: string, fallback?: string) => string;
  hasRole: (roleId: string) => boolean;
  reload: () => void;
}

export const PackContext = createContext<PackContextValue | null>(null);

export function usePack() {
  const ctx = useContext(PackContext);
  if (!ctx) throw new Error("usePack deve ser usado dentro de <PackProvider>.");
  return ctx;
}
