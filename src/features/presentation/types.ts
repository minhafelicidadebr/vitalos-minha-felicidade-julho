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
  | "transition"
  | "ivo"
  | "profiles"
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
  detail?: PresentationDetail;
}
export interface PresentationDetail {
  title: string;
  introduction: string;
  blocks: PresentationCard[];
  sources?: PresentationSource[];
}
export interface PresentationSource {
  label: string;
  href: string;
}
export interface PresentationMetric {
  value: number;
  suffix: string;
  label: string;
  context: string;
  prefix?: string;
  decimals?: number;
}
export interface PresentationDemoStep {
  area: "Medir" | "Agir" | "Provar";
  title: string;
  summary: string;
  fields: { label: string; value: string }[];
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
  detail: PresentationDetail;
  detailCta: string;
  references?: PresentationSource[];
  executive?: boolean;
  metrics?: PresentationMetric[];
  transitionImage?: "compreender" | "agir" | "evoluir";
  demoSteps?: PresentationDemoStep[];
}
export interface PresentationDeck {
  edition: string;
  slides: PresentationSlide[];
  contact: { label: string; href: string };
}
export type PresentationReply =
  | { state: "ready"; deck: PresentationDeck; ttlMs: number }
  | { state: "locked" | "unavailable" | "limited" | "invalid" };
