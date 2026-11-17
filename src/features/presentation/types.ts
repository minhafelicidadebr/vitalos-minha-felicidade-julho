export type VisualKind =
  | "hero"
  | "context"
  | "gaps"
  | "cycle"
  | "perspectives"
  | "lenses"
  | "roles"
  | "reading"
  | "learning"
  | "action"
  | "evidence"
  | "report"
  | "trust"
  | "onboarding"
  | "closing";
export type PresentationIcon =
  | "heart"
  | "users"
  | "compass"
  | "building"
  | "chart"
  | "book"
  | "spark"
  | "shield"
  | "arrow"
  | "check"
  | "clock"
  | "file"
  | "lock"
  | "target";
export interface PresentationCard {
  label: string;
  title: string;
  body: string;
  icon: PresentationIcon;
  status?: string;
}
export interface PresentationSlide {
  id: string;
  chapter: string;
  eyebrow: string;
  title: string;
  summary: string;
  kind: VisualKind;
  note: string;
  cards: PresentationCard[];
  detail: {
    title: string;
    introduction: string;
    blocks: PresentationCard[];
    sources?: Array<{ label: string; href: string }>;
  };
  detailCta: string;
}
export interface PresentationDeck {
  edition: string;
  slides: PresentationSlide[];
  contact: { label: string; href: string };
}
export type PresentationReply =
  | { state: "ready"; deck: PresentationDeck; ttlMs: number }
  | { state: "locked" | "unavailable" | "limited" | "invalid" };
