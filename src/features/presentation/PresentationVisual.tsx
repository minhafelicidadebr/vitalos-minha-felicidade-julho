import { useEffect, useRef, useState } from "react";
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
import teamPhoto from "@/assets/presentation/v4-hero.jpg";
import compreenderPhoto from "@/assets/presentation/v4-compreender.jpg";
import agirPhoto from "@/assets/presentation/v4-agir.jpg";
import evoluirPhoto from "@/assets/presentation/v4-evoluir.jpg";
import { ActionTrail, DashboardJourney, IvoMap, RoleExplorer } from "./PresentationExperience";
import type {
  PresentationCard,
  PresentationIcon,
  PresentationMetric,
  PresentationSlide,
} from "./types";

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
  return <Icon aria-hidden="true" strokeWidth={1.7} />;
}
export function PresentationCardView({ card }: { card: PresentationCard }) {
  return (
    <div className="presentation-card">
      <span className="presentation-card-label">{card.label}</span>
      <h3>{card.title}</h3>
      <p>{card.body}</p>
      {card.status && <span className="presentation-status">{card.status}</span>}
    </div>
  );
}

export function MetricView({ metric }: { metric: PresentationMetric }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(metric.value);
  useEffect(() => {
    let frame = 0;
    let started = false;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => {
      cancelAnimationFrame(frame);
      setShown(metric.value);
    };
    const animate = () => {
      if (started || media.matches) return;
      started = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 850);
        setShown(metric.value * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) {
                animate();
                observer?.disconnect();
              }
            },
            { threshold: 0.35 },
          );
    if (ref.current) observer?.observe(ref.current);
    media.addEventListener("change", stop);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      media.removeEventListener("change", stop);
    };
  }, [metric.value]);
  const format = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: metric.decimals ?? 0,
      maximumFractionDigits: metric.decimals ?? 0,
    }).format(value);
  return (
    <div className="presentation-metric" ref={ref}>
      <strong>
        <span aria-hidden="true">
          {metric.prefix}
          {format(shown)}
          <span>{metric.suffix}</span>
        </span>
        <span className="sr-only">
          {metric.prefix}
          {format(metric.value)}
          {metric.suffix}
        </span>
      </strong>
      <h3>{metric.label}</h3>
      <p>{metric.context}</p>
    </div>
  );
}
function Sequence({ slide }: { slide: PresentationSlide }) {
  const [selected, setSelected] = useState(0);
  const card = slide.cards[selected]!;
  const delivery =
    slide.id === "trimestre"
      ? ["Uma prioridade discutida", "Uma aplicação preparada", "Uma decisão para continuar"]
      : [
          "Uma pergunta de trabalho",
          "Repertório para interpretar",
          "Um acordo com condições",
          "Aprendizagem para o próximo ciclo",
        ];
  return (
    <div className="presentation-sequence">
      <div className="presentation-sequence-top">
        <span>
          {slide.id === "trimestre" ? "Ao longo de um trimestre" : "Exemplo fictício · Alfa"}
        </span>
        <Clock3 size={20} />
      </div>
      <div className="presentation-step-buttons" aria-label="Etapas da jornada">
        {slide.cards.map((c, i) => (
          <button key={c.label} aria-pressed={selected === i} onClick={() => setSelected(i)}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {c.label}
          </button>
        ))}
      </div>
      <div
        className="presentation-step-content"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <PresentationSymbol name={card.icon} />
        <h3>{card.title}</h3>
        <p>{card.body}</p>
        <div className="presentation-delivery">
          <Check size={18} aria-hidden="true" />
          <span>{delivery[selected]}</span>
        </div>
      </div>
      {slide.id === "trimestre" && (
        <div className="presentation-year" aria-label="Lentes de foco ao longo do ano">
          <span>
            Q1 <b>COPSOQ</b>
          </span>
          <span>
            Q2 <b>FIB-T</b>
          </span>
          <span>
            Q3 <b>PERMA+V</b>
          </span>
          <span>
            Q4 <b>VIA-T</b>
          </span>
        </div>
      )}
    </div>
  );
}
function LearningSample() {
  const [answer, setAnswer] = useState<number | null>(null);
  return (
    <div className="presentation-practice">
      <span className="presentation-sample-label">Uma pequena experiência de aprendizagem</span>
      <BookOpen size={32} aria-hidden="true" />
      <h3>Uma leitura coletiva abre qual conversa?</h3>
      <p>Escolha uma interpretação para explorar o exemplo.</p>
      <div role="group" aria-label="Respostas do exemplo">
        {[
          "Que condições ajudariam a equipe a pedir apoio?",
          "Quem da equipe está com dificuldade?",
        ].map((a, i) => (
          <button aria-pressed={answer === i} key={a} onClick={() => setAnswer(i)}>
            {a}
            <ArrowUpRight size={18} aria-hidden="true" />
          </button>
        ))}
      </div>
      {answer !== null && (
        <div className="presentation-feedback" role="status">
          <strong>
            {answer === 0 ? "Uma pergunta para a gestão." : "Retome o contexto coletivo."}
          </strong>
          <p>
            {answer === 0
              ? "A leitura ajuda a discutir condições de trabalho. A equipe pode combinar uma prática com tempo e apoio."
              : "O resultado coletivo orienta uma conversa sobre condições. Uma nova tentativa pode partir do que a equipe precisa para participar."}
          </p>
          <button onClick={() => setAnswer(null)}>Explorar novamente</button>
        </div>
      )}
      <small>Exemplo didático da apresentação · suas escolhas ficam apenas nesta tela.</small>
    </div>
  );
}
export function PresentationVisual({
  slide,
  onExplore,
}: {
  slide: PresentationSlide;
  onExplore?: (card: PresentationCard, element?: HTMLButtonElement) => void;
}) {
  if (slide.kind === "transition") {
    const photo = { compreender: compreenderPhoto, agir: agirPhoto, evoluir: evoluirPhoto }[
      slide.transitionImage!
    ];
    const alt = {
      compreender:
        "Executivas e colegas de diferentes gerações analisam juntos uma situação de trabalho",
      agir: "Equipe diversa prepara uma prática em conjunto ao redor de uma mesa",
      evoluir:
        "Duas executivas, uma delas de cabelos grisalhos, revisam um documento com seus colegas",
    }[slide.transitionImage!];
    return (
      <figure className="presentation-transition-image">
        <img src={photo} alt={alt} width="1672" height="941" loading="lazy" />
      </figure>
    );
  }
  if (slide.kind === "ivo") return <IvoMap slide={slide} />;
  if (slide.kind === "profiles") return <RoleExplorer slide={slide} onExplore={onExplore} />;
  if (slide.demoSteps?.length) return <DashboardJourney slide={slide} />;
  if (slide.kind === "action") return <ActionTrail slide={slide} />;
  if (slide.kind === "hero" || slide.kind === "closing")
    return (
      <figure className="presentation-human">
        <img
          src={slide.kind === "hero" ? teamPhoto : evoluirPhoto}
          alt="Executivas e colegas de diferentes idades e tons de pele colaborando em um ambiente de trabalho brasileiro"
          width="1672"
          height="941"
          fetchPriority={slide.kind === "hero" ? "high" : undefined}
          loading={slide.kind === "hero" ? "eager" : "lazy"}
        />
        <figcaption>
          <span>Conhecimento que encontra pessoas.</span>
          <small>Imagem ilustrativa criada para a apresentação</small>
        </figcaption>
        <div className="presentation-human-mark" aria-hidden="true">
          <span>Escutar</span>
          <span>Aprender</span>
          <span>Evoluir</span>
        </div>
      </figure>
    );
  if (slide.id === "trimestre") return <Sequence slide={slide} />;
  if (slide.kind === "learning") return <LearningSample />;
  if (slide.kind === "cycle")
    return (
      <div className="presentation-cycle">
        <div className="presentation-cycle-center">
          <img src="/brand/vitalos/vitalos-mark-256.png" alt="" width="80" height="80" />
          <strong>
            Desenvolver
            <br />
            com continuidade
          </strong>
        </div>
        {slide.cards.map((card, i) => (
          <button
            key={card.label}
            onClick={(event) => onExplore?.(card, event.currentTarget)}
            className={`presentation-cycle-stage stage-${i}`}
          >
            <PresentationSymbol name={card.icon} />
            <span>{card.label}</span>
            <small>{card.title}</small>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
    );
  if (slide.kind === "lenses")
    return (
      <div className="presentation-lens-grid">
        {slide.cards.map((card) => (
          <button
            key={card.label}
            className="presentation-lens"
            onClick={(event) => onExplore?.(card, event.currentTarget)}
            aria-label={`Explorar ${card.label}`}
          >
            <span className="presentation-lens-top">
              <PresentationSymbol name={card.icon} />
              <ArrowUpRight size={20} />
            </span>
            <span className="presentation-card-label">{card.label}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            <span className="presentation-status">{card.status}</span>
          </button>
        ))}
      </div>
    );
  if (slide.kind === "report")
    return (
      <div className="presentation-report">
        <div className="presentation-report-cover">
          <span>VitalOS™</span>
          <FileText size={38} />
          <h3>
            O percurso
            <br />
            da sua
            <br />
            organização.
          </h3>
          <p>Relatório global ESG</p>
          <small>Prévia ilustrativa</small>
        </div>
        <ol className="presentation-report-records">
          {slide.cards.map((card) => (
            <li key={card.label}>
              <PresentationSymbol name={card.icon} />
              <div>
                <strong>{card.label}</strong>
                <p>{card.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  if (slide.kind === "trust")
    return (
      <div className="presentation-science">
        <div className="presentation-science-heading">
          <BookOpen size={28} />
          <span>
            Referências que informam
            <br />
            nossa abordagem
          </span>
        </div>
        <div className="presentation-institution">
          <small>Uma referência de curadoria</small>
          <h3>
            Work Wellbeing
            <br />
            Playbook 2.0
          </h3>
          <p>World Wellbeing Movement</p>
        </div>
        <div className="presentation-academic">
          <span>Com apoio à elaboração do Playbook</span>
          <strong>Wellbeing Research Centre</strong>
          <p>University of Oxford</p>
          <span>e Indeed</span>
        </div>
        <div className="presentation-science-path">
          <span>Pesquisa</span>
          <MoveRight />
          <span>Aprendizagem</span>
          <MoveRight />
          <span>Prática</span>
        </div>
      </div>
    );
  return (
    <div className={`presentation-cards presentation-visual--${slide.kind}`}>
      {slide.metrics?.length ? (
        <div className="presentation-metrics">
          {slide.metrics.map((m) => (
            <MetricView key={m.label} metric={m} />
          ))}
        </div>
      ) : null}
      {slide.cards.map((card, i) => (
        <div className="presentation-editorial-row" key={card.label}>
          <span className="presentation-row-symbol">
            <PresentationSymbol name={card.icon} />
          </span>
          <div>
            <span className="presentation-card-label">{card.label}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </div>
          <span className="presentation-row-number" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
        </div>
      ))}
    </div>
  );
}
