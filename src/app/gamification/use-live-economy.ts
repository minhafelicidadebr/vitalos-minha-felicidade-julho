import { useMemo } from "react";
import { getRoleLearningTargets, recommendPaths } from "@/engine/academia/academia-engine";
import { computeWave } from "@/engine/campaign/campaign-engine";
import {
  getAntiGamingRules,
  getParticipationLedgerConfig,
} from "@/engine/gamification/gamification-engine";
import {
  buildParticipationSummary,
  hasParticipationEvidence,
} from "@/engine/gamification/participation-ledger";
import { useParticipationLedger } from "@/engine/gamification/participation-store";
import { deriveLiveMissions } from "@/engine/gamification/live-economy";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { usePack } from "@/engine/pack";
import { rankPriorities } from "@/engine/priority/priority-engine";
import { usePersona } from "@/app/identity/persona-store";
import { useWaveResponses } from "@/engine/survey/survey-store";
import { getLearningPaths } from "@/mocks/academia-mock";
import { getActiveWave } from "@/mocks/campaign-mock";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { GAMIFICATION_TODAY } from "@/mocks/gamification-mock";
import { getSectorData } from "@/mocks/sector-data";

export function useLiveEconomy() {
  const { packId, index, gamification } = usePack();
  const { roleId } = usePersona();
  const events = useParticipationLedger((state) => state.events);
  const record = useParticipationLedger((state) => state.record);
  const waveInput = getActiveWave(packId);
  const responded = useWaveResponses((state) => state.hasResponded(waveInput.id));

  return useMemo(() => {
    if (!index || !gamification) {
      return {
        events,
        missions: [],
        summary: null,
        rules: null,
        ledgerConfig: null,
        record,
        today: GAMIFICATION_TODAY,
      };
    }

    const rules = getAntiGamingRules(gamification);
    const ledgerConfig = getParticipationLedgerConfig(gamification);
    const summary = buildParticipationSummary(events, GAMIFICATION_TODAY, ledgerConfig.badges);
    const current = calculateIVO(getSectorData(packId).currentCycle, index);
    const topPriority =
      rankPriorities(pillarsFromIvo(current), FORECAST_LEVERS, { scenario: "medio" }).items[0] ??
      null;
    const catalog = getLearningPaths(packId);
    const targets = getRoleLearningTargets(catalog, roleId);
    const eligible = new Set(targets.pillarIds);
    const priorityPillars = current.lenses
      .flatMap((lens) => lens.pillars)
      .filter((pillar) => pillar.visible && eligible.has(pillar.pillarId))
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map((pillar) => ({ id: pillar.pillarId, label: pillar.pillarName }));
    const rankedPaths = recommendPaths(catalog, { roleId, priorityPillars });
    const recommended =
      rankedPaths.find((path) => path.relevance === "prioritaria") ?? rankedPaths[0] ?? null;
    const completedModules =
      recommended?.path.modules.filter((module) =>
        hasParticipationEvidence(events, "learning_module", `${recommended.path.id}:${module.id}`),
      ).length ?? 0;
    const wave = computeWave(waveInput);
    const prioritySourceId = topPriority
      ? `priority:${current.cycleId}:${topPriority.leverId}`
      : null;

    return {
      events,
      rules,
      ledgerConfig,
      summary,
      record,
      today: GAMIFICATION_TODAY,
      missions: deriveLiveMissions(
        {
          waveOpen: wave.state === "aberta" || wave.state === "encerrando",
          waveId: waveInput.id,
          waveInstrument: wave.instrumentShort,
          alreadyResponded: responded,
          topPriorityId: prioritySourceId,
          topPriorityLabel: topPriority?.label ?? null,
          priorityEvidenceRecorded: prioritySourceId
            ? hasParticipationEvidence(events, "mission_evidence", prioritySourceId)
            : false,
          recommendedPathId: recommended?.path.id ?? null,
          recommendedPathTitle: recommended?.path.title ?? null,
          recommendedPathCompletedModules: completedModules,
          recommendedPathTotalModules: recommended?.path.modules.length ?? 0,
          recommendedPathCompleted: recommended
            ? hasParticipationEvidence(events, "learning_path", recommended.path.id)
            : false,
        },
        rules,
        summary.xpToday,
      ),
    };
  }, [events, gamification, index, packId, record, responded, roleId, waveInput]);
}
