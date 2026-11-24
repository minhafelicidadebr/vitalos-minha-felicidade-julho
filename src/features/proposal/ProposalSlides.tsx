// Modo apresentação: slides horizontais derivados do MESMO conteúdo da página (nenhum texto
// novo nasce aqui). Teclado: ← → PageUp PageDown Espaço Home End, F tela cheia, Esc sai.
// Em telas estreitas ou em pé, os slides empilham na vertical (slide horizontal a 320 px piora a
// leitura). Movimento reduzido: troca sem animação. Endereço: #slide-N.
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CircleDashed, Flag, Maximize, Minimize, X } from "lucide-react";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import { BAND_IMAGES, HERO_IMAGE, ILLUSTRATION, TEAM_PHOTOS } from "./media";
import { prefersReducedMotion } from "./motion";
import { MetricValue } from "./ProposalSections";
import type { ProposalContent } from "./types";
import "./proposal.css";

const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR");

interface Slide {
  id: string;
  title: string;
  dark?: boolean;
  image?: string;
  body: React.ReactNode;
}

function buildSlides(p: ProposalContent): Slide[] {
  const inv = p.investment;
  const parcel = inv.total / inv.installments;
  const slides: Slide[] = [
    {
      id: "capa",
      title: p.hero.title,
      dark: true,
      image: HERO_IMAGE,
      body: (
        <div className="flex h-full flex-col justify-end gap-4">
          <p className="slide-kicker">{p.hero.eyebrow}</p>
          <h2 className="slide-title max-w-[22ch]">{p.hero.title}</h2>
          <p className="slide-lead max-w-[60ch]">{p.hero.subtitle}</p>
          <span className="slide-caption">{p.hero.imageCaption}</span>
        </div>
      ),
    },
    {
      id: "pergunta",
      title: "A pergunta",
      body: (
        <div className="grid h-full content-center gap-8">
          <h2 className="slide-title max-w-[28ch]">“{p.opening.question}”</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {p.opening.difficulties.map((d, i) => (
              <li key={d.title} className="slide-card">
                <span className="slide-num">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="slide-h3">{d.title}</h3>
                <p className="slide-small">{d.body}</p>
              </li>
            ))}
          </ol>
          <p className="slide-small">{p.opening.note}</p>
        </div>
      ),
    },
  ];
  if (p.track)
    slides.push({
      id: "numeros",
      title: p.track.title,
      body: (
        <div className="grid h-full content-center gap-8">
          <h2 className="slide-title">{p.track.title}</h2>
          <ul className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {p.track.items.map((m) => (
              <li key={m.label} className="proposal-track-item border-l-4 pl-4">
                <MetricValue metric={m} className="slide-metric" />
                <span className="slide-small block font-semibold">{m.label}</span>
              </li>
            ))}
          </ul>
          <p className="slide-lead max-w-[70ch]">{p.track.record}</p>
          <p className="slide-small">
            {p.track.source} {p.track.scope}
          </p>
        </div>
      ),
    });
  slides.push({
    id: "ciencia",
    title: p.science.title,
    body: (
      <div className="grid h-full content-center gap-6">
        <h2 className="slide-title">{p.science.title}</h2>
        {p.science.playbook ? (
          <div className="proposal-playbook flex flex-wrap items-center gap-6 rounded-2xl p-5">
            <p className="slide-metric proposal-on-dark-accent">
              +{p.science.playbook.studies.toLocaleString("pt-BR")}
            </p>
            <div className="min-w-0 flex-1">
              <p className="slide-lead">{p.science.playbook.statement}</p>
              <p className="slide-small opacity-80">
                {p.science.playbook.edition} · {p.science.playbook.attribution}
              </p>
            </div>
          </div>
        ) : null}
        <ul className="grid gap-3 md:grid-cols-5">
          {p.science.anchors.map((a) => (
            <li key={a.id} className="slide-card">
              <h3 className="slide-h3">{a.name}</h3>
              <p className="slide-small">{a.inProposal}</p>
              <p className="slide-small font-semibold proposal-accent-text">{a.statusLabel}</p>
            </li>
          ))}
        </ul>
      </div>
    ),
  });
  slides.push({
    id: "contexto",
    title: "O que a literatura e um caso mostram",
    body: (
      <div className="grid h-full content-center gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="slide-title">{p.literature?.title ?? "O que a literatura mostra"}</h2>
          {p.literature ? (
            <>
              <ul className="grid gap-4 sm:grid-cols-2">
                {p.literature.items.map((m) => (
                  <li key={m.label} className="slide-card">
                    <MetricValue metric={m} className="slide-metric proposal-accent-text" />
                    <p className="slide-small font-semibold">{m.label}</p>
                    <p className="slide-small">{m.detail}</p>
                  </li>
                ))}
              </ul>
              <p className="slide-small">{p.literature.note}</p>
            </>
          ) : null}
        </div>
        <div className="slide-card space-y-3">
          <p className="slide-kicker">Caso externo</p>
          <h3 className="slide-h3">{p.externalCase.title}</h3>
          <p className="slide-small">{p.externalCase.summary}</p>
          <p className="slide-small">{p.externalCase.note}</p>
        </div>
      </div>
    ),
  });
  slides.push({
    id: "exemplo",
    title: p.scenario.title,
    image: BAND_IMAGES.compreender,
    dark: true,
    body: (
      <div className="grid h-full content-end gap-5">
        <p className="slide-kicker">Exemplo fictício</p>
        <h2 className="slide-title max-w-[30ch]">
          {p.scenario.title.replace("Exemplo fictício · ", "")}
        </h2>
        <ol className="grid gap-3 md:grid-cols-4">
          {p.scenario.steps.map((s, i) => (
            <li key={s.label} className="slide-card slide-card-glass">
              <span className="slide-num">{i + 1}</span>
              <h3 className="slide-h3">{s.label}</h3>
              <p className="slide-small">{s.body}</p>
            </li>
          ))}
        </ol>
        <span className="slide-caption">{p.hero.imageCaption}</span>
      </div>
    ),
  });
  slides.push({
    id: "jornada",
    title: "Cinco etapas, cinco marcos",
    body: (
      <div className="grid h-full content-center gap-6">
        <h2 className="slide-title">Cinco etapas, cinco marcos</h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {p.journey.stages.map((s) => (
            <li key={s.id} className={`slide-card proposal-schedule-stage proposal-stage-${s.id}`}>
              <p className="slide-num">{s.code}</p>
              <h3 className="slide-h3">{s.verb}</h3>
              <p className="slide-small">{s.deliverable}</p>
            </li>
          ))}
        </ol>
        <p className="slide-small flex gap-2">
          <CircleDashed aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          {p.journey.sharedCondition}
        </p>
      </div>
    ),
  });
  slides.push({
    id: "cronograma",
    title: p.schedule.title,
    body: (
      <div className="grid h-full content-center gap-5">
        <h2 className="slide-title">{p.schedule.title}</h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {p.schedule.stages.map((st) => {
            const stage = p.journey.stages.find((s) => s.id === st.id)!;
            return (
              <li
                key={st.id}
                className={`slide-card proposal-schedule-stage proposal-stage-${st.id}`}
              >
                <h3 className="slide-h3">
                  {stage.code} · {stage.verb}
                </h3>
                <ul className="mt-2 space-y-1">
                  {st.months.map((m) => (
                    <li key={m.label} className="slide-small">
                      <span className="font-semibold">{m.label}</span> · {m.focus}
                      {m.conditioned ? (
                        <span className="sr-only"> (com etapa condicionada)</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="slide-small mt-2 flex items-center gap-1 font-semibold">
                  <Flag aria-hidden className="h-3.5 w-3.5 proposal-accent-icon" /> Marco{" "}
                  {brl(stage.installment)}
                </p>
              </li>
            );
          })}
        </ol>
        <p className="slide-small">{p.schedule.note}</p>
      </div>
    ),
  });
  slides.push({
    id: "investimento",
    title: "Investimento",
    body: (
      <div className="grid h-full content-center gap-6 lg:grid-cols-2">
        <div className="slide-card space-y-3">
          <p className="slide-kicker">Investimento da ISG</p>
          <p className="slide-metric">
            {brl(parcel)} <span className="slide-lead">por etapa</span>
          </p>
          <p className="slide-lead">
            Cerca de{" "}
            <strong className="proposal-accent-text">
              {brl(parcel / inv.monthsPerStage)} por mês
            </strong>
            , equivalente nos {inv.monthsPerStage} meses de cada etapa.
          </p>
          <p className="proposal-total slide-small rounded-xl px-3 py-2">
            Total do programa: <strong>{brl(inv.total)}</strong> em {inv.installments} parcelas, uma
            por marco aceito.
          </p>
        </div>
        <div className="slide-card space-y-3">
          <p className="slide-kicker">Contribuição técnica da ISG</p>
          <p className="slide-metric">{p.counterpart.hours} horas</p>
          <ul className="space-y-1">
            {p.counterpart.deliverables.map((d) => (
              <li key={d.title} className="slide-small">
                <strong>{d.title}.</strong> {d.body}
              </li>
            ))}
          </ul>
          <p className="slide-small">{p.counterpart.intro}</p>
        </div>
      </div>
    ),
  });
  slides.push({
    id: "equipe",
    title: p.team.title,
    body: (
      <div className="grid h-full content-center gap-6">
        <h2 className="slide-title">{p.team.title}</h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {p.team.members.map((m) => (
            <li key={m.name} className="slide-card flex flex-col items-center text-center">
              <img
                src={TEAM_PHOTOS[m.photo]}
                width={360}
                height={360}
                alt={`Retrato de ${m.name}`}
                className="h-28 w-28 rounded-full object-cover ring-4 proposal-photo-ring"
              />
              <h3 className="slide-h3 mt-3">{m.name}</h3>
              <p className="slide-small proposal-accent-text">{m.label}</p>
              <p className="slide-small mt-1 font-semibold">{m.role}</p>
            </li>
          ))}
        </ul>
        <p className="slide-small">{p.team.note}</p>
      </div>
    ),
  });
  slides.push({
    id: "proxima",
    title: p.nextSession.title,
    dark: true,
    image: BAND_IMAGES.evoluir,
    body: (
      <div className="grid h-full content-end gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div className="space-y-3">
          <p className="slide-kicker">Próxima conversa</p>
          <h2 className="slide-title">{p.nextSession.title}</h2>
          <p className="slide-lead">{p.nextSession.howTo}</p>
          <p className="slide-small">{p.nextSession.note}</p>
        </div>
        <ol className="slide-card slide-card-glass space-y-1">
          {p.nextSession.agenda.map((a, i) => (
            <li key={a} className="slide-small">
              {i + 1}. {a}
            </li>
          ))}
        </ol>
      </div>
    ),
  });
  return slides;
}

const readHash = (count: number) => {
  const m = /^#slide-(\d+)$/.exec(typeof window === "undefined" ? "" : window.location.hash);
  const n = m ? Number(m[1]) - 1 : 0;
  return Math.min(Math.max(n, 0), count - 1);
};

export function ProposalSlides({ p, onExit }: { p: ProposalContent; onExit: () => void }) {
  const slides = buildSlides(p);
  const total = slides.length;
  const [index, setIndex] = useState(() => readHash(total));
  const [stacked, setStacked] = useState(false);
  const [full, setFull] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (orientation: landscape)");
    const update = () => setStacked(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const go = useCallback(
    (n: number) =>
      setIndex((current) => Math.min(Math.max(typeof n === "number" ? n : current, 0), total - 1)),
    [total],
  );

  useEffect(() => {
    if (stacked) return;
    window.history.replaceState(null, "", `#slide-${index + 1}`);
    heading.current?.focus({ preventScroll: true });
  }, [index, stacked]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    onExit();
  }, [onExit]);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.current?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onFs = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("a, input, textarea, select")) return;
      if (e.key === "Escape") return exit();
      if (stacked) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(index + 1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(total - 1);
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFull();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exit, go, index, stacked, toggleFull, total]);

  const reduced = prefersReducedMotion();
  const toolbarButton =
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

  const renderSlide = (s: Slide, i: number, active: boolean) => (
    <section
      key={s.id}
      aria-roledescription="slide"
      aria-label={`${i + 1} de ${total}: ${s.title}`}
      className={`proposal-slide ${s.dark ? "is-dark" : ""} ${active && !reduced ? "is-entering" : ""}`}
    >
      {s.image ? (
        <>
          <img
            src={s.image}
            width={ILLUSTRATION.width}
            height={ILLUSTRATION.height}
            alt=""
            className="proposal-slide-image"
          />
          <div aria-hidden className="proposal-slide-scrim" />
        </>
      ) : null}
      <div className="proposal-slide-body">
        {!stacked ? (
          <h2 ref={active ? heading : undefined} tabIndex={-1} className="sr-only">
            {s.title}
          </h2>
        ) : null}
        {s.body}
      </div>
      <footer className="proposal-slide-footer">
        <span className="inline-flex items-center rounded bg-white px-1.5 py-0.5">
          <img
            src="/brand/instituto/instituto-full-original.png"
            width={1198}
            height={481}
            alt="Instituto Felicidade para Todos"
            className="h-6 w-auto"
          />
        </span>
        <VitalOSBrand variant="horizontal" size="sm" surface={s.dark ? "dark" : undefined} />
        <span className="ml-auto tabular-nums">
          {i + 1} / {total}
        </span>
      </footer>
    </section>
  );

  return (
    <div
      ref={stage}
      className="proposal proposal-slides"
      role="region"
      aria-roledescription="apresentação"
      aria-label="Proposta em modo apresentação"
    >
      <div className="proposal-slides-toolbar">
        <button type="button" onClick={exit} className={toolbarButton}>
          <X aria-hidden className="h-4 w-4" />
          Sair da apresentação
        </button>
        {!stacked ? (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={toggleFull}
              className={toolbarButton}
              aria-pressed={full}
            >
              {full ? (
                <Minimize aria-hidden className="h-4 w-4" />
              ) : (
                <Maximize aria-hidden className="h-4 w-4" />
              )}
              <span className="hidden md:inline">{full ? "Sair da tela cheia" : "Tela cheia"}</span>
            </button>
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className={toolbarButton}
              aria-label="Slide anterior"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === total - 1}
              className={toolbarButton}
              aria-label="Próximo slide"
            >
              <ArrowRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="ml-auto text-xs text-muted-foreground">
            Em tela estreita os slides ficam empilhados.
          </p>
        )}
      </div>
      {stacked ? (
        <div className="proposal-slides-stack">
          {slides.map((s, i) => renderSlide(s, i, false))}
        </div>
      ) : (
        <div className="proposal-slides-stage">
          {renderSlide(slides[index]!, index, true)}
          <div className="proposal-slides-progress" aria-hidden="true">
            <span style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>
          <p className="sr-only" aria-live="polite">
            Slide {index + 1} de {total}: {slides[index]!.title}
          </p>
        </div>
      )}
      <p className="proposal-slides-hint" aria-hidden={stacked}>
        {!stacked ? "Setas ou Espaço para avançar · F tela cheia · Esc sai" : null}
      </p>
    </div>
  );
}
