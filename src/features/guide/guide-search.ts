import type { GuideLens, GuidePerspective } from "@/domain/guide/guide-types";

const LENSES: GuideLens[] = ["Q1", "Q2", "Q3", "Q4", "Q5"];
const PERSPECTIVES: GuidePerspective[] = ["colaborador", "lideranca", "rh", "sst", "direcao", "plataforma"];

export interface GuideSearch {
  etapa?: GuideLens;
  perfil?: GuidePerspective;
}

/** Estado de leitura na URL: só etapa e perspectiva editoriais. Nunca papel, tarefa ou organização. */
export function validateGuideSearch(search: Record<string, unknown>): GuideSearch {
  const etapa = LENSES.find((l) => l === search.etapa);
  const perfil = PERSPECTIVES.find((p) => p === search.perfil);
  return { ...(etapa ? { etapa } : {}), ...(perfil ? { perfil } : {}) };
}
