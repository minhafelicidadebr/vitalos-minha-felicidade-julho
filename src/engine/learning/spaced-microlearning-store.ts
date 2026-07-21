import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  initMicroPlan,
  reconcilePlan,
  reviewUnit,
  setCadence,
  toDayString,
  type MicroCadence,
  type MicroPlanState,
  type MicroUnit,
} from "./spaced-microlearning-engine";

// Persistência PRIVADA e OPT-IN do microlearning espaçado (LD-013).
//
// HONESTIDADE: nada é gravado até a pessoa ATIVAR ("acompanhar neste aparelho").
// O estado vive só no localStorage deste dispositivo — não é conta, não é
// servidor, não sai daqui, não vira indicador organizacional. "Parar e apagar"
// (disableAndClear) zera o registro. Não há sincronização com nuvem nesta
// fatia: é deliberadamente local (Fase 2 exigiria pedido explícito + RLS).
//
// Sem streak coercitivo: o store não guarda "dias seguidos"; só o agendamento.

interface SpacedMicroState {
  enabled: boolean;
  plan: MicroPlanState | null;
  /** Ativa o acompanhamento e cria o plano (todas as unidades vencidas hoje). */
  enable: (units: readonly MicroUnit[], planVersion: string, cadence: MicroCadence) => void;
  /** Reconcilia o plano persistido com o conteúdo atual (unidades novas/removidas). */
  hydratePlan: (units: readonly MicroUnit[], planVersion: string) => void;
  review: (unitId: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
  changeCadence: (cadence: MicroCadence) => void;
  /** Desliga e apaga o estado privado deste aparelho. */
  disableAndClear: () => void;
}

function today(): string {
  return toDayString(new Date());
}

export const useSpacedMicrolearning = create<SpacedMicroState>()(
  persist(
    (set, get) => ({
      enabled: false,
      plan: null,
      enable: (units, planVersion, cadence) =>
        set({
          enabled: true,
          plan: initMicroPlan(units, planVersion, cadence, today()),
        }),
      hydratePlan: (units, planVersion) => {
        const { enabled, plan } = get();
        if (!enabled || !plan) return;
        set({ plan: reconcilePlan(plan, units, planVersion, today()) });
      },
      review: (unitId, quality) => {
        const { plan } = get();
        if (!plan) return;
        set({ plan: reviewUnit(plan, unitId, quality, today()) });
      },
      changeCadence: (cadence) => {
        const { plan } = get();
        if (!plan) return;
        set({ plan: setCadence(plan, cadence) });
      },
      disableAndClear: () => set({ enabled: false, plan: null }),
    }),
    {
      name: "vitalos-spaced-microlearning",
      // Só o opt-in e o plano persistem — ambos privados a este aparelho.
      partialize: (s) => ({ enabled: s.enabled, plan: s.plan }),
    },
  ),
);
