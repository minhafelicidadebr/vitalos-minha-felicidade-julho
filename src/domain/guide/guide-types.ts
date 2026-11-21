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
}

export interface GuideLensContent {
  lens: GuideLens;
  title: string;
  instrument: string;
  question: string;
  phase: string;
  /** Texto do caso fictício nesta lente. */
  scene: string[];
  /** Validação de privacidade, agregação e publicação da lente. */
  guardrails: string[];
  matrix: Record<GuidePerspective, GuideMatrixCell>;
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
