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
}

export interface Responsibility {
  party: string;
  group: "isg" | "instituto";
  does: string;
  effort: string;
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
  summary: { label: string; title: string; body: string }[];
  opening: {
    question: string;
    note: string;
    difficulties: { title: string; body: string }[];
  };
  why: {
    parties: { name: string; role: string; body: string }[];
    affinity: { body: string; source: ProposalLink; checked: string };
    window: string;
  };
  scenario: {
    title: string;
    context: string;
    steps: { label: string; body: string }[];
    record: { field: string; value: string }[];
    missing: string[];
  };
  journey: { intro: string; sharedCondition: string; stages: JourneyStage[] };
  indicators: {
    operational: { title: string; body: string }[];
    effect: string;
  };
  investment: {
    total: number;
    installments: number;
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
    /** Destino do agendamento. `null` até o Instituto confirmar — nenhum link inventado. */
    contact: ProposalLink | null;
  };
  sources: { claim: string; kind: ClaimKind; source: string }[];
}
