// Nudge engine — pure, sector-agnostic. Reads the nudge library from the
// gamification pack passed as parameter; never imports from domain/.
import type { GamificationEconomy } from "../pack/pack-types";

export interface NudgeDef {
  id: string;
  pillarId: string;
  copy: string;
  channel: string;
  frequencyCapPerWeek: number;
  optInRequired: boolean;
  targetRole?: string;
}

export interface NudgeDelivery {
  nudge: NudgeDef;
  reason: "scheduled" | "contextual";
}

interface EconomyShape {
  nudgeLibrarySeed?: Array<{
    id: string;
    pillar: string;
    copy: string;
    channel?: string;
    frequencyCapPerWeek?: number;
    optInRequired?: boolean;
    targetRole?: string;
  }>;
}

export function getNudgeLibrary(economy: GamificationEconomy): NudgeDef[] {
  const shape = economy as unknown as EconomyShape;
  return (shape.nudgeLibrarySeed ?? []).map((n) => ({
    id: n.id,
    pillarId: n.pillar,
    copy: n.copy,
    channel: n.channel ?? "in_app",
    frequencyCapPerWeek: n.frequencyCapPerWeek ?? 1,
    optInRequired: n.optInRequired ?? false,
    targetRole: n.targetRole,
  }));
}

/**
 * Picks nudges eligible for delivery, honoring:
 * - role targeting (nudges with targetRole only go to that role)
 * - opt-in (optInRequired nudges need explicit consent)
 * - weekly frequency caps (deliveredThisWeek counts per nudge id)
 */
export function selectNudges(
  library: NudgeDef[],
  options: {
    role: string;
    optedInNudgeIds: Set<string>;
    deliveredThisWeek: Map<string, number>;
    max?: number;
  },
): NudgeDelivery[] {
  const { role, optedInNudgeIds, deliveredThisWeek, max = 2 } = options;

  return library
    .filter((n) => !n.targetRole || n.targetRole === role)
    .filter((n) => !n.optInRequired || optedInNudgeIds.has(n.id))
    .filter((n) => (deliveredThisWeek.get(n.id) ?? 0) < n.frequencyCapPerWeek)
    .slice(0, max)
    .map((nudge) => ({ nudge, reason: "scheduled" as const }));
}
