// Survey engine — puro. O runtime de aplicação de um instrumento (mock-first): dado
// o conjunto de itens e as respostas em curso, computa progresso, validade e o
// próximo item. NÃO computa score individual (isso seria julgamento): a resposta só
// existe para entrar no agregado (n≥k). A persistência real é Fase 2; aqui o estado
// é de sessão. Nunca importa de domain/.

export type SurveyValue = number;

export interface SurveyItem {
  id: string;
  pillarId: string;
  text: string;
  section?: string;
  /** Item de redação invertida (pontuação reversa na agregação — Fase 2). */
  reverse?: boolean;
}

export interface SurveyScaleOption {
  value: SurveyValue;
  label: string;
}

export interface SurveyScale {
  presentation: "buttons" | "slider";
  options: SurveyScaleOption[];
  minLabel: string;
  maxLabel: string;
}

export interface SurveyDefinition {
  id: string;
  instrumentShort: string;
  items: SurveyItem[];
  scale: SurveyScale;
  intro: {
    eyebrow: string;
    lead: string;
    disclaimer: string;
    thanksTitle: string;
    thanksBody: string;
  };
  completionRoute: "/devolutiva" | "/viat";
  completionLabel: string;
}

export type SurveyResponses = Record<string, SurveyValue | undefined>;

export interface SurveyProgress {
  total: number;
  answered: number;
  pct: number;
  isComplete: boolean;
  firstUnansweredId: string | null;
}

export function surveyProgress(items: SurveyItem[], responses: SurveyResponses): SurveyProgress {
  const total = items.length;
  const answered = items.filter((it) => responses[it.id] != null).length;
  const firstUnanswered = items.find((it) => responses[it.id] == null);
  return {
    total,
    answered,
    pct: total > 0 ? Math.round((answered / total) * 100) : 0,
    isComplete: total > 0 && answered === total,
    firstUnansweredId: firstUnanswered?.id ?? null,
  };
}

export function isAllowedSurveyValue(scale: SurveyScale, value: SurveyValue): boolean {
  return scale.options.some((option) => option.value === value);
}
