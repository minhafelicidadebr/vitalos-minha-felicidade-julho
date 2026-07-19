// Ponto único de carga da projeção runtime de status de Skill — mesma
// disciplina de src/domain/evidence/registries.ts: o domínio carrega o JSON
// e re-exporta tipos do engine (domínio pode importar engine; o inverso é
// proibido). Este módulo NUNCA importa docs/ai/florencia-skills/ — a
// projeção em contracts/ é o único elo com a governança documental, e só
// existe porque scripts/sync-skill-status-projection.ts a manteve em
// paridade (verificado em skill-status-projection-parity.test.ts).

import {
  isKnownSkillStatus,
  validateSkillStatusEntries,
  type SkillLifecycleStatus,
  type SkillStatusEntry,
} from "@/engine/florencia/skill-status";
import projectionJson from "./contracts/skill-status-projection.json";

export interface SkillStatusProjection {
  readonly projection: string;
  readonly sourceRegistry: string;
  readonly sourceVersion: string;
  readonly generatedAt: string;
  readonly skills: readonly SkillStatusEntry[];
}

function deepFreeze<T>(value: T): T {
  Object.freeze(value);
  if (value && typeof value === "object") {
    for (const key of Object.getOwnPropertyNames(value)) {
      const child = (value as Record<string, unknown>)[key];
      if (child && typeof child === "object" && !Object.isFrozen(child)) deepFreeze(child);
    }
  }
  return value;
}

export const SKILL_STATUS_PROJECTION: Readonly<SkillStatusProjection> = deepFreeze(
  projectionJson as SkillStatusProjection,
);

/**
 * Mapa skill_id → status pronto para PolicyGateOptions.skillStatus.
 * Fail-closed em duas camadas independentes da checagem de paridade (que só
 * roda em teste/build): id duplicado exclui TODAS as ocorrências daquele id
 * (nenhuma é confiável) e status fora do enum conhecido nunca entra no mapa
 * — corrupção nunca vira "disponível", vira "ausente" (que já é bloqueado
 * por isSkillAvailable). Resultado sempre readonly.
 */
export function resolveSkillStatusMap(): Readonly<Record<string, SkillLifecycleStatus>> {
  const map: Record<string, SkillLifecycleStatus> = {};
  const seen = new Set<string>();
  const corrupted = new Set<string>();

  for (const entry of SKILL_STATUS_PROJECTION.skills) {
    if (seen.has(entry.skill_id)) {
      corrupted.add(entry.skill_id);
      continue;
    }
    seen.add(entry.skill_id);
    if (!isKnownSkillStatus(entry.status)) continue; // status desconhecido nunca entra
    map[entry.skill_id] = entry.status;
  }
  for (const id of corrupted) delete map[id]; // duplicata: nenhuma ocorrência é confiável

  return Object.freeze(map);
}

/** Auto-checagem estrutural da projeção carregada — usada em teste. */
export function validateLoadedProjection() {
  return validateSkillStatusEntries(SKILL_STATUS_PROJECTION.skills);
}
