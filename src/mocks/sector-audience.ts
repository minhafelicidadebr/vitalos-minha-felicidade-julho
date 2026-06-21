// Despachante de audiência por setor. Resolve, para o pack ativo + papel, se o
// interlocutor pode ver a LEITURA COLETIVA (números do índice). Reusa os
// resolvers de audiência de cada home setorial (fonte única) — sem duplicar regra.
//
// Coerência: o copiloto (/copilota) usa isto para gatear a revelação do score,
// exatamente como as homes setoriais gateiam o painel coletivo.

import { hasAudienceCapability } from "@/engine/audience/audience-engine";
import { resolveSchoolAudience } from "./school-home-mock";
import { resolveGovernmentAudience } from "./government-home-mock";
import { resolveCondominiumAudience } from "./condominium-home-mock";
import { resolveHealthAudience } from "./health-home-mock";

// Papéis participantes do pack Empresa (não veem leitura coletiva). Os demais
// papéis corporativos (RH, CHRO, C-Level, líder, SST, holding) veem.
const ENTERPRISE_PARTICIPANT_ROLES = new Set(["COLABORADOR", "EMBAIXADOR"]);

export function canSeeCollective(packId: string, roleId: string): boolean {
  switch (packId) {
    case "school":
      return hasAudienceCapability(resolveSchoolAudience(roleId).policy, "collective_index");
    case "government":
      return hasAudienceCapability(resolveGovernmentAudience(roleId).policy, "collective_index");
    case "condominium":
      return hasAudienceCapability(resolveCondominiumAudience(roleId).policy, "collective_index");
    case "health":
      return hasAudienceCapability(resolveHealthAudience(roleId).policy, "collective_index");
    case "enterprise":
    default:
      return !ENTERPRISE_PARTICIPANT_ROLES.has(roleId);
  }
}
