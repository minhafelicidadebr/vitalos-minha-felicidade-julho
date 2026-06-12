// Mock data layer — typed hooks (Bloco 2). Single entry point for screens.
// Simulates what edge functions will return in Fase 2: aggregates only.
import { useMemo } from "react";
import { usePack } from "../engine/pack";
import { calculateIVO, type IVOResult } from "../engine/index/ivo-engine";
import { ivoCurrentCycle, ivoPreviousCycle, DEMO_ORG } from "./ivo-mock";
import { teamCurrentCycle, teamPreviousCycle, MOCK_LEADER } from "./lider-mock";
import { MOCK_SEASON } from "./colaborador-mock";
import { HEATMAP_UNITS, PARTICIPATION } from "./rh-mock";

export interface OrgInfo {
  id: string;
  name: string;
  totalCollaborators: number;
  participationPct: number;
  units: typeof HEATMAP_UNITS;
}

/** Demo organization with units and participation. */
export function useOrg(): OrgInfo {
  return useMemo(
    () => ({
      id: ivoCurrentCycle.organizationId,
      name: DEMO_ORG.name,
      totalCollaborators: DEMO_ORG.totalCollaborators,
      participationPct: PARTICIPATION.overallPct,
      units: HEATMAP_UNITS,
    }),
    [],
  );
}

export interface IvoData {
  current: IVOResult | null;
  previous: IVOResult | null;
  delta: number;
  loading: boolean;
}

/** Org-level IVO for both cycles, calculated from the pack. */
export function useIvo(): IvoData {
  const { index } = usePack();
  return useMemo(() => {
    if (!index) return { current: null, previous: null, delta: 0, loading: true };
    const current = calculateIVO(ivoCurrentCycle, index);
    const previous = calculateIVO(ivoPreviousCycle, index);
    return { current, previous, delta: current.ivoScore - previous.ivoScore, loading: false };
  }, [index]);
}

/** Team-level IVO (leader scope, n>=5 enforced by the engine). */
export function useTeamIvo(): IvoData & { teamName: string; teamSize: number } {
  const { index } = usePack();
  return useMemo(() => {
    const base = { teamName: MOCK_LEADER.team, teamSize: MOCK_LEADER.teamSize };
    if (!index) return { ...base, current: null, previous: null, delta: 0, loading: true };
    const current = calculateIVO(teamCurrentCycle, index);
    const previous = calculateIVO(teamPreviousCycle, index);
    return {
      ...base,
      current,
      previous,
      delta: current.ivoScore - previous.ivoScore,
      loading: false,
    };
  }, [index]);
}

/** Active season with M.E.T.E. phases. */
export function useSeason() {
  return MOCK_SEASON;
}
