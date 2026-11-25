// Guia da Jornada Empresarial · tipos compartilhados (cliente e servidor).
// O CONTEÚDO vive em enterprise-guide.ts e só é carregado no servidor, depois da
// validação de acesso (senha editorial ou sessão institucional).

export type GuideLens = "Q1" | "Q2" | "Q3" | "Q4" | "Q5";
export type GuidePerspective = "colaborador" | "lideranca" | "rh" | "sst" | "direcao" | "plataforma";
export type GuideMode = "atua" | "acompanha" | "dependencia";
/** Nível documentado no registro. `ambiente` só é efetivo quando o ambiente atual foi verificado. */
export type AvailabilityLevel = "descrito" | "demonstrativo" | "local" | "ambiente";

export interface GuideMatrixCell {
  mode: GuideMode;
  /** Tarefa (quando atua) ou quem atua (quando acompanha). */
  who: string;
  /** Quem recebe a entrega, ou o que o perfil consulta. */
  receives: string;
  /** Condição de acesso e estado, em linguagem cotidiana. */
  condition: string;
  /** Capacidade do registro de disponibilidade que sustenta a célula, quando houver. */
  capability?: string;
  /** Rótulos dos dois blocos do card do papel, quando o padrão da etapa não serve. */
  labels?: { first: string; second: string };
}

/** Jornada por perfil: o mesmo formato do Q2 para todas as etapas. */
export interface GuideLensJourney {
  /** Passos curtos do fluxo (ex.: preparar → revisar). */
  flow?: { steps: string[]; arrows: boolean; note?: string };
  /** Resumo do exemplo, curto e sem dados. */
  example: string;
  /** "Que evidência fica?" */
  evidence: string;
  /** Checagem opcional (id em `checks`). */
  checkId?: string;
  /** Aviso fixo da etapa (ex.: Q1 só preparação). */
  stageNotice?: string;
  /** Selo editorial da etapa (ex.: "Exemplo educativo"). */
  stageChip?: string;
}

export type CyclePhase = "Mensurar" | "Educar" | "Transformar" | "Evoluir";
export type IvoPerspective = "eu" | "nos" | "lideranca" | "organizacao";

export interface GuideSceneStep {
  label: string;
  /** Quem atua neste passo (selo). */
  who: string;
  text: string;
}

export interface GuideLensContent {
  lens: GuideLens;
  title: string;
  instrument: string;
  question: string;
  phase: string;
  /** Fase do ciclo em que o caso está nesta lente (mapa 2). */
  cyclePhase: CyclePhase;
  /** Passos do caso fictício nesta lente, com quem atua. */
  scene: GuideSceneStep[];
  /**
   * Perspectivas do IVO que aparecem NA CENA (mapa 3). Conteúdo editorial da cena,
   * nunca um mapeamento papel → perspectiva.
   */
  ivoScene?: Partial<Record<IvoPerspective, string>>;
  /** Validação de privacidade, agregação e publicação da lente. */
  guardrails: string[];
  matrix: Record<GuidePerspective, GuideMatrixCell>;
  journey?: GuideLensJourney;
  /** "Como a equipe colabora" desta etapa. Sem valor, vale o fluxo do Q2 (`GuideContent.handoffs`). */
  handoffs?: GuideHandoff[];
  /** Voz por perspectiva (texto de tela). */
  voices: Partial<Record<GuidePerspective, string>>;
}

export interface GuideCheck {
  id: string;
  question: string;
  options: { id: string; label: string; feedback: string }[];
  correctOptionId: string;
}

export interface GuideHandoff {
  id: string;
  verb: string;
  owner: string;
  perspective: GuidePerspective;
  /** Outras perspectivas que também se reconhecem neste passo. */
  also?: GuidePerspective[];
  /** Passo de quem acompanha o retorno ("Você acompanha"), não de quem atua. */
  follow?: boolean;
  evidence: string;
}

export interface GuideQ5Row {
  kind: string;
  text: string;
  origin: string;
}

export interface GuideContent {
  version: string;
  caseLabel: string;
  opening: {
    title: string;
    text: string;
    /** Caso contínuo, apresentado sob a abertura. */
    example: { title: string; text: string };
    receives: { title: string; text: string };
    mobilizes: { title: string; text: string };
    consult: { title: string; items: { label: string; capability?: string; fixed?: "Em preparação" | "Exemplo da jornada"; note?: string }[] };
    billing: string;
    disclaimer: string;
    primaryCta: string;
    secondaryCta: { label: string; href: string };
  };
  perspectives: { id: GuidePerspective; label: string }[];
  maps: { lenses: string; cycle: string; perspectives: string; scene: string; ivoDefinition: string };
  lenses: GuideLensContent[];
  handoffs: GuideHandoff[];
  q5Extract: { rows: GuideQ5Row[]; note: string };
  resolvedExample: string;
  checks: GuideCheck[];
  whatNext: string;
  readingNotice: string;
}

/** Entrada do registro de disponibilidade: descreve, não autoriza. */
export interface AvailabilityEntry {
  id: string;
  lens: GuideLens;
  role: GuidePerspective | "qualquer";
  capability: string;
  level: Exclude<AvailabilityLevel, "ambiente">;
  verifiedIn: string[];
  route: string | null;
  serverCheck: string | null;
  ctaLabel: string | null;
  decisionRef: string;
  verifiedAt: string;
}
