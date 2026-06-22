// Dinâmicas de aprendizagem — tipos + classificadores PUROS, setor-agnósticos.
//
// O catálogo das 9 dinâmicas (vocabulário, pedagogia, citações) vive no mock
// `src/mocks/learning-dynamics-mock.ts` — aqui ficam apenas o contrato e a lógica de
// organização por eixo M.E.T.E. Sem import de domain/, sem React, sem I/O.
//
// As 9 dinâmicas destilam o Work-Wellbeing Playbook 2.0 (Gamified Learning OS) e se
// distribuem pelos eixos do ciclo: Educar concentra a aquisição; Transformar concentra
// a aplicação. Cada uma enriquece uma superfície VitalOS que JÁ existe — compor, não
// acumular (doutrina Fable 5 §5.1).

/** Eixo do ciclo M.E.T.E. que a dinâmica serve. */
export type MeteAxis = "medir" | "educar" | "transformar" | "evoluir";

/** Natureza pedagógica da dinâmica (independe de setor). */
export type DynamicKind =
  | "quiz"
  | "flashcard"
  | "video"
  | "evidence"
  | "plan"
  | "reflection"
  | "scenario"
  | "builder"
  | "debate";

export interface LearningDynamic {
  /** Identificador estável da dinâmica (ex.: "D1", "D2", "X1"). */
  id: string;
  kind: DynamicKind;
  /** Título humano, sem nome de marca de terceiros. */
  title: string;
  /** Frase curta do que o aprendiz faz. */
  tagline: string;
  axis: MeteAxis;
  /** Racional pedagógico com base científica (pt-BR) — honestidade como feature. */
  pedagogyPt: string;
  /** Referência da base científica da dinâmica. */
  citation: string;
  /** Rota VitalOS existente que a dinâmica enriquece (compor, não criar silo). */
  enrichesRoute: string;
}

const AXIS_ORDER: Record<MeteAxis, number> = {
  medir: 0,
  educar: 1,
  transformar: 2,
  evoluir: 3,
};

/** Busca uma dinâmica pelo id (case-insensitive, tolerante a espaços). */
export function getDynamic(catalog: LearningDynamic[], id: string): LearningDynamic | undefined {
  const target = id.trim().toLocaleUpperCase("pt-BR");
  return catalog.find((d) => d.id.trim().toLocaleUpperCase("pt-BR") === target);
}

/** Dinâmicas de um eixo, preservando a ordem do catálogo. */
export function dynamicsByAxis(catalog: LearningDynamic[], axis: MeteAxis): LearningDynamic[] {
  return catalog.filter((d) => d.axis === axis);
}

/** Dinâmicas que enriquecem uma rota específica. */
export function dynamicsForRoute(catalog: LearningDynamic[], route: string): LearningDynamic[] {
  return catalog.filter((d) => d.enrichesRoute === route);
}

export interface AxisGroup {
  axis: MeteAxis;
  dynamics: LearningDynamic[];
}

/** Agrupa o catálogo por eixo na ordem canônica do ciclo M.E.T.E. (eixos vazios omitidos). */
export function groupByAxis(catalog: LearningDynamic[]): AxisGroup[] {
  const axes: MeteAxis[] = ["medir", "educar", "transformar", "evoluir"];
  return axes
    .map((axis) => ({ axis, dynamics: dynamicsByAxis(catalog, axis) }))
    .filter((group) => group.dynamics.length > 0)
    .sort((a, b) => AXIS_ORDER[a.axis] - AXIS_ORDER[b.axis]);
}
