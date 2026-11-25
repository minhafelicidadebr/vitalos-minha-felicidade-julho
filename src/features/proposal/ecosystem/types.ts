// Proposta para o ecossistema ISG · contrato do conteúdo servido por /api/proposta/ecossistema.
// Todo texto nasce no servidor (src/lib/proposal/ecosystem-content.server.ts); a página e o modo
// apresentar só escolhem a composição visual de cada cena.

/** Ícones disponíveis (resolvidos no cliente para lucide-react). */
export type EcoIcon =
  | "map"
  | "report"
  | "dialogue"
  | "team"
  | "calendar"
  | "productivity"
  | "absence"
  | "wellbeing"
  | "listen"
  | "protect"
  | "search"
  | "pact"
  | "facilitation"
  | "dashboard"
  | "leaf"
  | "shield"
  | "book"
  | "action"
  | "review"
  | "person"
  | "compass"
  | "building"
  | "signal"
  | "hypothesis"
  | "record"
  | "feedback"
  | "governance"
  | "operation"
  | "network"
  | "platform"
  | "accessibility"
  | "performance"
  | "integration"
  | "learning"
  | "game"
  | "synthesis";

export type EcoLayout =
  | "cover"
  | "timeline"
  | "stats"
  | "indicators"
  | "cards"
  | "decision-cards"
  | "converge"
  | "tracks"
  | "cycle"
  | "ivo"
  | "lenses"
  | "sequence"
  | "demo"
  | "transition"
  | "ring"
  | "waves"
  | "report"
  | "investment"
  | "photo"
  | "decision";

export type EcoImage = "brasilia" | "listening" | "workplace";

export interface EcoItem {
  /** Rótulo curto (ou número, nas cenas de dados). */
  label: string;
  body?: string;
  icon?: EcoIcon;
  /** Sigla de lente (Q1…Q5) ou de etapa. */
  code?: string;
}

export interface EcoUnderstand {
  question: string;
  body: string;
}

export interface EcoSource {
  label: string;
  href: string;
}

export interface EcoScene {
  id: string;
  /** Número editorial (01–24): estável entre os modos e nos links diretos. */
  number: number;
  chapter: string;
  title: string;
  layout: EcoLayout;
  lead?: string;
  items: EcoItem[];
  caption?: string;
  closing?: string;
  understand?: EcoUnderstand;
  sources?: EcoSource[];
  /** Fala sugerida: só no roteiro do apresentador, nunca na projeção. */
  speech: string;
  executive: boolean;
  image?: EcoImage;
  /** Crédito/rotulagem da imagem (ex.: "Ilustração gerada"). */
  imageNote?: string;
  cta?: { label: string; support?: string };
  /** Alternativa de texto aplicada (registrada para a revisão). */
  alternative?: string;
}

export interface EcoDemo {
  title: string;
  rows: { label: string; value: string }[];
  caption: string;
}

export interface EcosystemProposal {
  version: string;
  title: string;
  recipient: string;
  scenes: EcoScene[];
  demo: EcoDemo;
  /** Canal de contato aprovado para a chamada final (null: responder à mensagem recebida). */
  contact: { href: string; label: string } | null;
}
