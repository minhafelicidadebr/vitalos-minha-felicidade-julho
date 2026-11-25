// Proposta comercial e institucional por seções. O conteúdo vive só no servidor
// (src/lib/proposal/*.server.ts) e chega ao navegador depois da senha validada.

/** Classificação de cada afirmação relevante — visível na página e na ficha de revisão. */
export type ClaimKind =
  | "fato" // fato verificado (fonte registrada)
  | "hipotese" // hipótese para a conversa
  | "condicao" // condição comercial proposta
  | "exemplo"; // demonstração ou exemplo fictício

/** Maturidade de cada capacidade, conferida nas fontes internas do piloto. */
export type Availability = "plataforma" | "instituto" | "condicionada";

export interface ProposalLink {
  label: string;
  href: string;
}

export interface Capability {
  label: string;
  availability: Availability;
  /** Para "condicionada": a decisão comercial necessária (prazo, alternativa ou ajuste). */
  decision?: string;
}

/** Os quatro movimentos da Matriz IFT (Instituto Felicidade para Todos). */
export type IftMovement = "mensurar" | "educar" | "transformar" | "evoluir";

export interface IftCell {
  text: string;
  availability: Availability;
}

/** Faixa de corresponsabilidade ISG × Instituto (exemplo, definido na reunião). */
export interface CoResponsibility {
  institutoConduz: string;
  isgDecide: string;
  isgExecuta: string;
  juntosRevisam: string;
}

/** Lente da jornada canônica (src/domain/journey.ts) aplicada a cada etapa. */
export interface StageFramework {
  lens: string; // "Risco"
  question: string; // pergunta-guia
  domain: "A" | "B"; // B = risco psicossocial (educativo); A = florescimento
  ift: Record<IftMovement, IftCell>;
  roles: CoResponsibility;
  /** Horas da equipe do Instituto por papel nesta etapa (modelo adotado pelo fundador). */
  hours: { coord: number; educ: number; impl: number };
}

export interface JourneyStage {
  id: "q1" | "q2" | "q3" | "q4" | "q5";
  code: string; // "Q1"
  verb: string; // "Preparar"
  deliverable: string;
  condition: string;
  /** Valor da parcela do marco, em reais, derivado do total. */
  installment: number;
  participants: string[];
  instituteActivities: string[];
  acceptance: string[];
  capabilities: Capability[];
  framework: StageFramework;
}

export interface PriceComponent {
  label: string;
  perStage: number;
  program: number;
  detail: string;
}

/** Ponte de valor: referência → reduções explicadas → condição. */
export interface PriceBridgeStep {
  label: string;
  perStage: number;
  kind: "reference" | "reduction" | "condition";
  detail: string;
}

export interface Responsibility {
  party: string;
  group: "isg" | "instituto";
  does: string;
  effort: string;
}

/** Número exibido com contagem animada. Vem sempre do Commercial Claims Registry. */
export interface ProposalMetric {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  detail: string;
}

export type ScienceIcon = "book" | "heart" | "compass" | "sun" | "shield";

export interface ScienceAnchor {
  id: string;
  icon: ScienceIcon;
  name: string;
  what: string;
  inProposal: string;
  status: "ancora" | "referencia" | "condicionado";
  statusLabel: string;
}

export type BandImage = "compreender" | "agir" | "evoluir";

export interface ProposalBand {
  id: string;
  image: BandImage;
  kicker: string;
  title: string;
  summary: string;
  imageAlt: string;
}

export interface ScheduleMonth {
  label: string;
  focus: string;
  activities: string[];
  conditioned?: string;
  milestone?: string;
}

export type TeamPhoto = "joao-paulo" | "ana-paula" | "olga";

export interface TeamMember {
  name: string;
  label: string;
  bio: string;
  role: string;
  photo: TeamPhoto;
}

export interface ProposalContent {
  version: string;
  date: string;
  recipient: string;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    imageAlt: string;
    imageCaption: string;
  };
  /** Capa: marca VitalOS em destaque, linha-categoria e frase de valor. */
  cover: {
    brandLine: string;
    valueLine: string;
    chips: { label: string; detail: string }[];
  };
  /** Matriz IFT: pré-treino dos quatro movimentos antes das etapas. */
  ift: {
    title: string;
    intro: string;
    movements: { id: IftMovement; name: string; description: string }[];
    domainNote: string;
    rolesNote: string;
    roleLabels: Record<keyof CoResponsibility, string>;
  };
  /** Valor de referência, ponte de valor e colaboração técnica (decisões de 23/11/2026). */
  pricing: {
    title: string;
    intro: string;
    referencePerStage: number;
    referenceTotal: number;
    components: PriceComponent[];
    bridge: PriceBridgeStep[];
    collaboration: string;
    parameters: { label: string; value: string }[];
    license: { includes: string[]; excludes: string[]; wording: string };
    notes: string[];
  };
  summary: { label: string; title: string; body: string }[];
  opening: {
    question: string;
  };
  why: {
    parties: { name: string; role: string; body: string }[];
    affinity: { body: string; source: ProposalLink; checked: string };
    /** Mapa do que a ISG declara no site institucional × o que o Instituto soma. */
    isgMap: {
      fronts: { name: string; detail: string; touches?: boolean }[];
      brands: string[];
      values: string[];
      adds: { title: string; body: string }[];
      source: ProposalLink;
      checked: string;
      note: string;
    };
    window: string;
  };
  scenario: {
    title: string;
    context: string;
    /** Exemplo trabalhado: o problema concreto antes dos passos. */
    problem: string;
    handover: { from: string; to: string; tickets: { label: string; lost: boolean }[] };
    steps: { label: string; body: string; who: string; record: string; teamSees: string }[];
    before: string;
    after: string;
    record: { field: string; value: string }[];
    missing: string[];
  };
  journey: { intro: string; sharedCondition: string; stages: JourneyStage[] };
  /** "O que o Instituto já fez": vazio quando o claim não resolve (fail-closed). */
  track: {
    title: string;
    intro: string;
    items: ProposalMetric[];
    record: string;
    scope: string;
    source: string;
  } | null;
  /** "O que a literatura mostra" (correlacional). */
  literature: { title: string; intro: string; items: ProposalMetric[]; note: string } | null;
  science: {
    title: string;
    intro: string;
    playbook: {
      statement: string;
      detail: string;
      attribution: string;
      studies: number;
      edition: string;
      source: ProposalLink;
    } | null;
    anchors: ScienceAnchor[];
    principle: string;
  };
  externalCase: {
    title: string;
    summary: string;
    practices: { label: string; body: string }[];
    note: string;
    sources: ProposalLink[];
  };
  bands: ProposalBand[];
  schedule: {
    title: string;
    intro: string;
    note: string;
    monthsPerStage: number;
    stages: { id: JourneyStage["id"]; months: ScheduleMonth[] }[];
  };
  team: { title: string; intro: string; members: TeamMember[]; note: string };
  indicators: {
    operational: { title: string; body: string }[];
    effect: string;
  };
  investment: {
    total: number;
    installments: number;
    /** Duração de cada etapa (meses). O equivalente mensal é derivado: parcela ÷ meses. */
    monthsPerStage: number;
    scope: string;
    composition: string[];
    quantities: string[];
    terms: string[];
  };
  counterpart: {
    hours: number;
    intro: string;
    deliverables: { title: string; body: string }[];
    caseUse: string;
    externalUse: string;
  };
  roles: { title: string; deliverables: string }[];
  responsibilities: Responsibility[];
  conditions: string[];
  nextSession: {
    title: string;
    goal: string;
    agenda: string[];
    howTo: string;
    /** Deixa claro que combinar a reunião não é contratação nem início do projeto. */
    note: string;
    /** Destino do agendamento. `null` até o Instituto confirmar — nenhum link inventado. */
    contact: ProposalLink | null;
  };
  sources: { claim: string; kind: ClaimKind; source: string }[];
}
