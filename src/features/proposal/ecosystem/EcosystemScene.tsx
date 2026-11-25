// Uma cena da proposta para o ecossistema, renderizada no palco (slide) ou na leitura vertical
// (página). Mesmo conteúdo e mesma ordem nos dois: só a composição muda. Nenhum texto nasce aqui.
import { useContext, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Accessibility,
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarX2,
  ClipboardCheck,
  Compass,
  Ear,
  ExternalLink,
  FileText,
  Gamepad2,
  Gauge,
  GraduationCap,
  Handshake,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  Leaf,
  Lightbulb,
  MapPinned,
  MessageSquareText,
  MessagesSquare,
  MonitorPlay,
  MonitorSmartphone,
  Network,
  Plug,
  Presentation,
  RefreshCcw,
  ScrollText,
  Search,
  Shield,
  ShieldCheck,
  Signal,
  TrendingUp,
  UserRound,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import reportCover from "@/assets/relatorio-global-esg-cover-3d.jpg";
import { CONTINUITY_IMAGE, HERO_IMAGE } from "../media";
import { InstitutoMark, Understand } from "../ProposalV3";
import { DeckNav, DialogContainer } from "../proposal-shared";
import compreender from "@/assets/presentation/v4-compreender.jpg";
import type { EcosystemProposal, EcoDemo, EcoIcon, EcoImage, EcoItem, EcoScene } from "./types";

const ICONS: Record<EcoIcon, typeof Gauge> = {
  map: MapPinned,
  report: FileText,
  dialogue: MessagesSquare,
  team: UsersRound,
  calendar: CalendarDays,
  productivity: TrendingUp,
  absence: CalendarX2,
  wellbeing: HeartPulse,
  listen: Ear,
  protect: ShieldCheck,
  search: Search,
  pact: Handshake,
  facilitation: Presentation,
  dashboard: LayoutDashboard,
  leaf: Leaf,
  shield: Shield,
  book: BookOpen,
  action: Workflow,
  review: RefreshCcw,
  person: UserRound,
  compass: Compass,
  building: Building2,
  signal: Signal,
  hypothesis: Lightbulb,
  record: ClipboardCheck,
  feedback: MessageSquareText,
  governance: Landmark,
  operation: Briefcase,
  network: Network,
  platform: MonitorSmartphone,
  accessibility: Accessibility,
  performance: Gauge,
  integration: Plug,
  learning: GraduationCap,
  game: Gamepad2,
  synthesis: ScrollText,
};

export const ECO_IMAGES: Record<EcoImage, string> = {
  brasilia: CONTINUITY_IMAGE,
  listening: compreender,
  workplace: HERO_IMAGE,
};

export const pad = (n: number) => String(n).padStart(2, "0");

function Icon({ name }: { name?: EcoIcon }) {
  if (!name) return null;
  const C = ICONS[name];
  return (
    <span className="eco-icon" aria-hidden>
      <C />
    </span>
  );
}

/** Rótulo + texto no formato "Rótulo · texto" (texto final da seção 4). */
function Item({
  item,
  as: Tag = "li",
  className = "eco-card",
}: {
  item: EcoItem;
  as?: "li" | "div";
  className?: string;
}) {
  return (
    <Tag className={className}>
      <Icon name={item.icon} />
      <strong className="eco-card-label">{item.label}</strong>
      {item.body ? <span className="eco-card-body">{item.body}</span> : null}
    </Tag>
  );
}

function Sources({ scene }: { scene: EcoScene }) {
  if (!scene.sources?.length) return null;
  return (
    <p className="eco-sources">
      <span>Fonte:</span>{" "}
      {scene.sources.map((s, i) => (
        <span key={s.href}>
          {i ? " · " : null}
          <a href={s.href} target="_blank" rel="noopener noreferrer">
            {s.label}
            <ExternalLink aria-hidden className="eco-ext" />
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </span>
      ))}
    </p>
  );
}

function SceneUnderstand({ scene, onDark }: { scene: EcoScene; onDark?: boolean }) {
  const u = scene.understand;
  if (!u) return null;
  return (
    <>
      <Understand
        label={u.question}
        title={u.question}
        description={`Cena ${pad(scene.number)} · ${scene.title}`}
        variant={onDark ? "on-dark" : "secondary"}
      >
        <p className="text-base leading-relaxed text-foreground">{u.body}</p>
        {scene.sources?.length ? (
          <div className="mt-3 text-sm">
            <Sources scene={scene} />
          </div>
        ) : null}
      </Understand>
      <div className="proposal-print-only eco-print-understand">
        <strong>Entenda · {u.question}</strong>
        <p>{u.body}</p>
      </div>
    </>
  );
}

/** Janela da demonstração (cena 13): mesmo componente de diálogo das janelas "Entenda". */
function DemoDialog({ demo, label }: { demo: EcoDemo; label: string }) {
  const container = useContext(DialogContainer);
  return (
    <>
      <DialogPrimitive.Root>
        <DialogPrimitive.Trigger className="proposal-understand-primary proposal-no-print inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <MonitorPlay aria-hidden className="h-4 w-4" />
          {label}
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal container={container ?? undefined}>
          <DialogPrimitive.Overlay className="proposal-dialog-overlay" />
          <DialogPrimitive.Content data-proposal-dialog className="proposal-dialog proposal">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="proposal-kicker text-xs font-semibold uppercase tracking-[0.14em]">
                  Demonstração
                </p>
                <DialogPrimitive.Title className="font-serif text-2xl leading-tight text-foreground">
                  {demo.title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {demo.caption}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                aria-label="Fechar"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
            <dl className="eco-demo-rows">
              {demo.rows.map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
            <DialogPrimitive.Close className="mt-4 inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Fechar
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      <div className="proposal-print-only eco-print-understand">
        <strong>{demo.title}</strong>
        <dl className="eco-demo-rows">
          {demo.rows.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
        <p>{demo.caption}</p>
      </div>
    </>
  );
}

/** Quatro passos com indicador selecionado (cena 13). */
function DemoSteps({ items }: { items: EcoItem[] }) {
  const [step, setStep] = useState(0);
  return (
    <div className="eco-demo">
      <ol className="eco-demo-steps" data-reveal-group>
        {items.map((it, i) => (
          <li key={it.label}>
            <button
              type="button"
              aria-pressed={step === i}
              onClick={() => setStep(i)}
              className="eco-demo-step"
            >
              <span className="eco-demo-num" aria-hidden>
                {i + 1}
              </span>
              <Icon name={it.icon} />
              <strong>{it.label}</strong>
              <span className="eco-card-body">{it.body}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="eco-demo-track" aria-hidden>
        <span style={{ width: `${((step + 1) / items.length) * 100}%` }} />
      </div>
    </div>
  );
}

function Visual({ scene, demo, slide }: { scene: EcoScene; demo: EcoDemo; slide: boolean }) {
  const { items } = scene;
  switch (scene.layout) {
    case "cover":
      return null;
    case "timeline":
      return (
        <ol className="eco-timeline" data-reveal-group>
          {items.map((it, i) => (
            <li key={it.label} className="eco-timeline-node">
              <span className="eco-timeline-dot" aria-hidden>
                <Icon name={it.icon} />
              </span>
              <span className="eco-timeline-num" aria-hidden>
                {pad(i + 1)}
              </span>
              <strong className="eco-card-label">{it.label}</strong>
            </li>
          ))}
        </ol>
      );
    case "stats":
      return (
        <ul className="eco-stats" data-reveal-group>
          {items.map((it) => (
            <li key={it.label} className="eco-stat">
              <Icon name={it.icon} />
              <strong className="eco-stat-value">{it.label}</strong>
              {it.body ? <span className="eco-stat-label">{it.body}</span> : null}
            </li>
          ))}
        </ul>
      );
    case "indicators":
      return (
        <ul className="eco-indicators" data-reveal-group>
          {items.map((it, i) => (
            <li key={it.label} className={`eco-indicator eco-tone-${i + 1}`}>
              <Icon name={it.icon} />
              <strong className="eco-card-label">{it.label}</strong>
              {it.body ? <span className="eco-card-body">{it.body}</span> : null}
            </li>
          ))}
        </ul>
      );
    case "decision-cards":
      return (
        <ol className="eco-cards eco-chain" data-reveal-group>
          {items.map((it, i) => (
            <Item
              key={it.label}
              item={it}
              className={`eco-card ${i === items.length - 1 ? "is-decision" : ""}`}
            />
          ))}
        </ol>
      );
    case "converge":
      return (
        <div className="eco-converge">
          <ul className="eco-cards eco-cols-2" data-reveal-group>
            {items.map((it) => (
              <Item key={it.label} item={it} />
            ))}
          </ul>
          <div className="eco-converge-lines" aria-hidden />
          <p className="eco-converge-target">
            <ArrowRight aria-hidden className="eco-inline-icon" />
            {scene.closing}
          </p>
        </div>
      );
    case "tracks":
      return (
        <ul className="eco-tracks" data-reveal-group>
          {items.map((it, i) => (
            <li key={it.label} className={`eco-track eco-track-${i + 1}`}>
              <Icon name={it.icon} />
              <div>
                <strong className="eco-card-label">{it.label}</strong>
                <span className="eco-card-body">{it.body}</span>
              </div>
            </li>
          ))}
        </ul>
      );
    case "cycle":
      return (
        <ol className="eco-cycle" data-reveal-group>
          {items.map((it) => (
            <Item key={it.label} item={it} className="eco-card eco-cycle-step" />
          ))}
        </ol>
      );
    case "ivo":
      return (
        <div className="eco-ivo">
          <div className="eco-ivo-brand">
            <VitalOSBrand
              variant="mark"
              decorative={false}
              alt="VitalOS"
              className="eco-ivo-mark"
            />
            <span>IVO</span>
          </div>
          <ul className="eco-cards eco-cols-4" data-reveal-group>
            {items.map((it) => (
              <Item key={it.label} item={it} />
            ))}
          </ul>
        </div>
      );
    case "lenses": {
      const lenses = items.filter((it) => it.code !== "Q5");
      const synthesis = items.find((it) => it.code === "Q5");
      return (
        <div className="eco-lenses">
          <ul className="eco-lens-grid" data-reveal-group>
            {lenses.map((it, i) => (
              <li key={it.label} className={`eco-lens proposal-accent-${i + 1}`}>
                <span className="eco-lens-code">{it.code}</span>
                <Icon name={it.icon} />
                <strong className="eco-card-label">{it.label}</strong>
                <span className="eco-card-body">{it.body}</span>
              </li>
            ))}
          </ul>
          {synthesis ? (
            <div className="eco-lens-synthesis">
              <span className="eco-lens-code">{synthesis.code}</span>
              <Icon name={synthesis.icon} />
              <strong className="eco-card-label">{synthesis.label}</strong>
              <span className="eco-card-body">{synthesis.body}</span>
            </div>
          ) : null}
        </div>
      );
    }
    case "sequence":
      return (
        <div className="eco-sequence-wrap">
          <ol className="eco-sequence" data-reveal-group>
            {items.map((it) => (
              <Item key={it.label} item={it} className="eco-card eco-seq-step" />
            ))}
          </ol>
          {scene.image ? (
            <figure className="eco-figure">
              <img src={ECO_IMAGES[scene.image]} alt="" loading="lazy" decoding="async" />
              {scene.imageNote ? <figcaption>{scene.imageNote}</figcaption> : null}
            </figure>
          ) : null}
        </div>
      );
    case "demo":
      return (
        <>
          <DemoSteps items={items} />
          {scene.cta ? <DemoDialog demo={demo} label={scene.cta.label} /> : null}
        </>
      );
    case "transition":
      return <span className="eco-gold-line" aria-hidden />;
    case "ring":
      return (
        <div className="eco-ring">
          <svg className="eco-ring-art" viewBox="0 0 320 320" aria-hidden focusable="false">
            <circle cx="160" cy="160" r="118" className="eco-ring-orbit" />
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
              const x = 160 + Math.cos(a) * 118;
              const y = 160 + Math.sin(a) * 118;
              return (
                <g key={i}>
                  <line x1="160" y1="160" x2={x} y2={y} className="eco-ring-spoke" />
                  <circle cx={x} cy={y} r="13" className="eco-ring-node" />
                </g>
              );
            })}
            <circle cx="160" cy="160" r="46" className="eco-ring-core" />
          </svg>
          <ul className="eco-cards eco-ring-list" data-reveal-group>
            {items.map((it) => (
              <Item key={it.label} item={it} />
            ))}
          </ul>
          {slide ? null : (
            <p className="eco-note">
              Operações representadas de forma genérica: o perímetro é confirmado pela ISG.
            </p>
          )}
        </div>
      );
    case "waves":
      return (
        <ol className="eco-waves" data-reveal-group>
          {items.map((it, i) => (
            <li key={it.label} className="eco-wave" style={{ "--wave": i } as React.CSSProperties}>
              <span className="eco-wave-bar" aria-hidden />
              <strong className="eco-card-label">{it.label}</strong>
              <span className="eco-card-body">{it.body}</span>
            </li>
          ))}
        </ol>
      );
    case "report":
      return (
        <div className="eco-report">
          <ul className="eco-cards eco-stack" data-reveal-group>
            {items.map((it) => (
              <Item key={it.label} item={it} />
            ))}
          </ul>
          <figure className="eco-figure eco-report-cover">
            <img
              src={reportCover}
              alt="Capa do Relatório Global ESG"
              loading="lazy"
              decoding="async"
            />
            {scene.caption ? <figcaption>{scene.caption}</figcaption> : null}
          </figure>
        </div>
      );
    case "investment":
      return (
        <div className="eco-investment">
          <ul className="eco-cards eco-cols-3" data-reveal-group>
            {items.map((it) => (
              <Item key={it.label} item={it} />
            ))}
          </ul>
          <p className="eco-closing">{scene.closing}</p>
        </div>
      );
    case "photo":
      return (
        <ul className="eco-cards eco-stack eco-on-photo" data-reveal-group>
          {items.map((it) => (
            <Item key={it.label} item={it} />
          ))}
        </ul>
      );
    case "decision":
      return (
        <ol className="eco-decision-list" data-reveal-group>
          {items.map((it, i) => (
            <li key={it.label}>
              <span className="eco-decision-num" aria-hidden>
                {i + 1}
              </span>
              {it.label}
            </li>
          ))}
        </ol>
      );
    case "cards":
    default:
      return (
        <ul className={`eco-cards eco-cols-${Math.min(items.length, 3)}`} data-reveal-group>
          {items.map((it) => (
            <Item key={it.label} item={it} />
          ))}
        </ul>
      );
  }
}

function ExploreCta({ label, onExplore }: { label: string; onExplore?: () => void }) {
  const deck = useContext(DeckNav);
  const go = onExplore ?? deck?.next;
  return (
    <button type="button" onClick={go} className="eco-cta">
      {label}
      <ArrowRight aria-hidden className="h-4 w-4" />
    </button>
  );
}

/** Chamada final. Sem canal aprovado, o botão leva ao texto de apoio (responder à mensagem). */
function DecisionCta({
  cta,
  contact,
}: {
  cta: NonNullable<EcoScene["cta"]>;
  contact: EcosystemProposal["contact"];
}) {
  const support = useRef<HTMLParagraphElement>(null);
  return (
    <div className="eco-decision-cta">
      {contact ? (
        <a href={contact.href} target="_blank" rel="noopener noreferrer" className="eco-cta">
          {cta.label}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </a>
      ) : (
        <button type="button" className="eco-cta" onClick={() => support.current?.focus()}>
          {cta.label}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </button>
      )}
      {cta.support ? (
        <p ref={support} tabIndex={-1} className="eco-support">
          {cta.support}
        </p>
      ) : null}
      <div className="eco-brands eco-brands-end">
        <InstitutoMark surface="dark" className="eco-brand-ift" />
        <VitalOSBrand
          variant="horizontal"
          surface="dark"
          decorative={false}
          alt="VitalOS"
          className="eco-brand-vitalos"
        />
        <span className="eco-recipient">ISG Participações</span>
      </div>
    </div>
  );
}

const DARK = new Set(["cover", "transition", "decision", "photo"]);
export const isDarkScene = (scene: EcoScene) => DARK.has(scene.layout);

export function EcosystemScene({
  scene,
  demo,
  slide = false,
  headingId,
  onExplore,
  contact = null,
}: {
  scene: EcoScene;
  demo: EcoDemo;
  slide?: boolean;
  headingId?: string;
  onExplore?: () => void;
  contact?: EcosystemProposal["contact"];
}) {
  const dark = isDarkScene(scene);
  const withPhoto =
    scene.layout === "cover" || scene.layout === "photo" || scene.layout === "transition";
  return (
    <div
      className={`eco-scene eco-layout-${scene.layout} ${dark ? "eco-dark" : ""} ${slide ? "is-slide" : "is-page"}`}
    >
      {withPhoto && scene.image ? (
        <figure className="eco-photo" aria-hidden={!scene.imageNote}>
          <img src={ECO_IMAGES[scene.image]} alt="" decoding="async" />
          {scene.imageNote ? <figcaption>{scene.imageNote}</figcaption> : null}
        </figure>
      ) : null}
      <div className="eco-content">
        <header className="eco-head">
          {scene.layout === "cover" ? (
            <div className="eco-brands">
              <InstitutoMark surface="dark" className="eco-brand-ift" />
              <VitalOSBrand
                variant="horizontal"
                surface="dark"
                decorative={false}
                alt="VitalOS"
                className="eco-brand-vitalos"
              />
            </div>
          ) : null}
          <p className="eco-kicker">
            <span className="tabular-nums">{pad(scene.number)}</span> · {scene.chapter}
          </p>
          <h2 id={headingId} className="eco-title">
            {scene.title}
          </h2>
          {scene.lead ? <p className="eco-lead">{scene.lead}</p> : null}
        </header>
        <Visual scene={scene} demo={demo} slide={slide} />
        {scene.caption && scene.layout !== "report" ? (
          <p className="eco-caption">{scene.caption}</p>
        ) : null}
        {scene.layout === "cover" && scene.cta ? (
          <div className="eco-cover-cta">
            <ExploreCta label={scene.cta.label} onExplore={onExplore} />
            <span className="eco-recipient">Proposta à ISG Participações</span>
          </div>
        ) : null}
        {scene.layout === "decision" && scene.cta ? (
          <DecisionCta cta={scene.cta} contact={contact} />
        ) : null}
        <div className="eco-foot">
          <SceneUnderstand scene={scene} onDark={dark} />
          {slide ? null : <Sources scene={scene} />}
        </div>
      </div>
    </div>
  );
}
