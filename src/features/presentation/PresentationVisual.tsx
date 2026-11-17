import {
  ArrowUpRight,
  BookOpen,
  Building2,
  ChartNoAxesCombined,
  Check,
  Compass,
  FileText,
  Heart,
  LockKeyhole,
  MoveRight,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Clock3,
} from "lucide-react";
import type { PresentationCard, PresentationIcon, PresentationSlide } from "./types";

const icons = {
  heart: Heart,
  users: Users,
  compass: Compass,
  building: Building2,
  chart: ChartNoAxesCombined,
  book: BookOpen,
  spark: Sparkles,
  shield: ShieldCheck,
  arrow: MoveRight,
  check: Check,
  clock: Clock3,
  file: FileText,
  lock: LockKeyhole,
  target: Target,
};
export function PresentationSymbol({ name }: { name: PresentationIcon }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" strokeWidth={1.6} />;
}

export function PresentationCardView({ card }: { card: PresentationCard }) {
  return (
    <div className="presentation-card">
      <div className="presentation-card-top">
        <span className="presentation-icon">
          <PresentationSymbol name={card.icon} />
        </span>
        <span className="presentation-card-label">{card.label}</span>
      </div>
      <h3>{card.title}</h3>
      <p>{card.body}</p>
      {card.status && <span className="presentation-status">{card.status}</span>}
    </div>
  );
}

export function PresentationVisual({ slide }: { slide: PresentationSlide }) {
  if (slide.kind === "hero" || slide.kind === "closing")
    return (
      <div
        className="presentation-orbit"
        aria-label="Da leitura ao desenvolvimento e ao acompanhamento"
      >
        <div className="presentation-orbit-center">
          <img src="/brand/vitalos/vitalos-mark-256.png" alt="" width="256" height="256" />
          <span>
            Vitalidade
            <br />
            em movimento
          </span>
        </div>
        <div className="presentation-orbit-cards">
          {slide.cards.map((card) => (
            <PresentationCardView key={card.label} card={card} />
          ))}
        </div>
        <span className="presentation-orbit-caption">
          <Sparkles size={15} aria-hidden="true" /> Um ecossistema conectado
        </span>
      </div>
    );
  if (slide.kind === "lenses")
    return (
      <div className="presentation-lenses">
        <div className="presentation-matrix-caption">
          <span>Perspectivas IVO</span>
          <span>Organização conceitual</span>
        </div>
        <div className="presentation-matrix-perspectives">
          {["EU", "NÓS", "LIDERANÇA", "ORGANIZAÇÃO"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="presentation-cards">
          {slide.cards.map((card) => (
            <PresentationCardView key={card.label} card={card} />
          ))}
        </div>
      </div>
    );
  if (slide.kind === "report")
    return (
      <div className="presentation-report">
        <div className="presentation-report-cover">
          <span>VitalOS™</span>
          <FileText size={42} strokeWidth={1} aria-hidden="true" />
          <h3>
            Relatório
            <br />
            Global ESG
          </h3>
          <p>
            Uma narrativa do ciclo
            <br />
            com origem e limites
          </p>
          <span className="presentation-report-badge">PRÉVIA DEMONSTRATIVA</span>
        </div>
        <div className="presentation-report-records">
          {slide.cards.map((card) => (
            <div className="presentation-record" key={card.label}>
              <PresentationSymbol name={card.icon} />
              <div>
                <span>{card.label}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  const isFlow = ["cycle", "action", "learning", "onboarding"].includes(slide.kind);
  return (
    <div
      className={`presentation-cards presentation-visual--${slide.kind} ${isFlow ? "presentation-flow" : ""}`}
    >
      {slide.cards.map((card, index) => (
        <div className="presentation-card-wrap" key={card.label}>
          <PresentationCardView card={card} />
          {isFlow && index < slide.cards.length - 1 && (
            <ArrowUpRight className="presentation-flow-arrow" size={18} aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}
