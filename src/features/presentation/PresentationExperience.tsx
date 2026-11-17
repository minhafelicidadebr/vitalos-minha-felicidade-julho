import { useState } from "react";
import { ArrowRight, ArrowUpRight, FileText, Compass, LockKeyhole } from "lucide-react";
import type { PresentationCard, PresentationSlide } from "./types";

type Explore = (card: PresentationCard, element?: HTMLButtonElement) => void;

export function IvoMap({ slide }: { slide: PresentationSlide }) {
  return (
    <div className="presentation-ivo-map">
      <div className="presentation-ivo-heading">
        <Compass size={30} aria-hidden="true" />
        <div>
          <span>IVO</span>
          <strong>Índice de Vitalidade Organizacional</strong>
        </div>
      </div>
      <ol className="presentation-ivo-layers">
        {slide.cards.map((card, i) => (
          <li key={card.label}>
            <span className="presentation-ivo-number" aria-hidden="true">
              0{i + 1}
            </span>
            <div>
              <span className="presentation-card-label">{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="presentation-ivo-review">
        <span>Leitura de referência</span>
        <ArrowRight aria-hidden="true" />
        <span>Ação acompanhada</span>
        <ArrowRight aria-hidden="true" />
        <span>Nova leitura comparável</span>
      </div>
      <p className="presentation-experience-note">{slide.cards[2]?.status}</p>
    </div>
  );
}

export function RoleExplorer({
  slide,
  onExplore,
}: {
  slide: PresentationSlide;
  onExplore?: Explore;
}) {
  const [selected, setSelected] = useState(0);
  const card = slide.cards[selected]!;
  return (
    <div className="presentation-role-explorer">
      <div
        className="presentation-role-select"
        role="group"
        aria-label="Explorar a participação de cada perfil"
      >
        {slide.cards.map((role, i) => (
          <button key={role.label} aria-pressed={selected === i} onClick={() => setSelected(i)}>
            {role.label}
          </button>
        ))}
      </div>
      <div className="presentation-role-card" aria-live="polite" aria-atomic="true">
        <span className="presentation-card-label">{card.label}</span>
        <h3>{card.title}</h3>
        <p>{card.body}</p>
        <dl>
          {card.detail?.blocks.slice(0, 2).map((block) => (
            <div key={block.label}>
              <dt>{block.label}</dt>
              <dd>{block.body}</dd>
            </div>
          ))}
        </dl>
        <span className="presentation-status">{card.status}</span>
        <button
          className="presentation-detail-button"
          onClick={(e) => onExplore?.(card, e.currentTarget)}
        >
          Explorar este perfil
          <ArrowUpRight size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="presentation-platform-boundary">
        <LockKeyhole size={20} aria-hidden="true" />
        <p>
          Administração da plataforma cuida da habilitação e dos convites institucionais.
          Participação no serviço e permissão no sistema têm escopos próprios.
        </p>
      </div>
    </div>
  );
}

export function DashboardJourney({ slide }: { slide: PresentationSlide }) {
  const [selected, setSelected] = useState(0);
  const steps = slide.demoSteps!;
  const step = steps[selected]!;
  const areas = ["Medir", "Agir", "Provar"] as const;
  return (
    <div className="presentation-dashboard">
      <div className="presentation-dashboard-top">
        <span>VitalOS / Alfa</span>
        <strong>Exemplo ilustrativo · empresa fictícia</strong>
      </div>
      <div
        className="presentation-dashboard-areas"
        role="group"
        aria-label="Área da etapa selecionada"
      >
        {areas.map((area) => (
          <span key={area} data-current={step.area === area}>
            {area}
            {step.area === area && <span className="sr-only"> · área atual</span>}
          </span>
        ))}
      </div>
      <div
        className="presentation-dashboard-steps"
        role="group"
        aria-label="Explorar o percurso no dashboard"
      >
        {steps.map((item, i) => (
          <button key={item.title} aria-pressed={selected === i} onClick={() => setSelected(i)}>
            <span aria-hidden="true">0{i + 1}</span>
            {item.title}
          </button>
        ))}
      </div>
      <div className="presentation-dashboard-content" aria-live="polite" aria-atomic="true">
        <span className="presentation-card-label">
          {step.area} / {String(selected + 1).padStart(2, "0")}
        </span>
        <h3>{step.title}</h3>
        <p>{step.summary}</p>
        <dl>
          {step.fields.map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="presentation-experience-note">
        Simulação de navegação · nenhum dado é enviado ou salvo ao explorar.
      </p>
    </div>
  );
}

export function ActionTrail({ slide }: { slide: PresentationSlide }) {
  return (
    <div className="presentation-action-trail">
      <span className="presentation-sample-label">Alfa fictícia / uma ação rastreável</span>
      <ol>
        {slide.cards.map((card) => (
          <li key={card.label}>
            <FileText size={18} aria-hidden="true" />
            <div>
              <span className="presentation-card-label">{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="presentation-experience-note">
        Registrar a prática permite revisá-la. Avaliar mudança requer novas evidências e critérios
        comparáveis.
      </p>
    </div>
  );
}
