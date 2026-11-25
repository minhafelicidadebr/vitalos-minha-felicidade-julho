// Palco de slides compartilhado pelas apresentações da proposta (original e ecossistema).
// Teclado: ← → PageUp PageDown Espaço Home End, G capítulos, F tela cheia, Esc sai (ou fecha a
// janela aberta). Em tela estreita ou em pé, empilha na vertical. Janelas "Entenda" abrem dentro do
// palco (também em tela cheia) e, abertas, ficam com o teclado.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, List, Maximize, Minimize, X } from "lucide-react";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import { ILLUSTRATION } from "./media";
import { prefersReducedMotion } from "./motion";
import { InstitutoMark } from "./ProposalV3";
import { DeckNav, DialogContainer } from "./proposal-shared";
import "./proposal.css";

export interface DeckSlide {
  id: string;
  chapter: string;
  title: string;
  dark?: boolean;
  image?: string;
  /** Slide de capítulo: imagem em tela cheia, título e uma frase. */
  divider?: boolean;
  /** Malha geométrica sutil com degradê da marca (poucas aberturas de capítulo). */
  mesh?: boolean;
  /** Classe extra do slide (variações visuais de uma apresentação). */
  className?: string;
  /** Texto curto no rodapé (fonte), ao lado do progresso. */
  footnote?: React.ReactNode;
  body: React.ReactNode;
}

const readHash = (count: number) => {
  const m = /^#slide-(\d+)$/.exec(typeof window === "undefined" ? "" : window.location.hash);
  const n = m ? Number(m[1]) - 1 : 0;
  return Math.min(Math.max(n, 0), count - 1);
};
const dialogOpen = () =>
  Boolean(document.querySelector("[data-proposal-dialog][data-state='open']"));

export function SlideDeck({
  slides,
  onExit,
  label = "Proposta em modo apresentação",
  initialIndex,
  hashOf = (_s, i) => `#slide-${i + 1}`,
  onIndexChange,
  toolbarExtra,
}: {
  slides: DeckSlide[];
  onExit: () => void;
  label?: string;
  initialIndex?: number;
  hashOf?: (slide: DeckSlide, index: number) => string;
  onIndexChange?: (index: number, slide: DeckSlide) => void;
  toolbarExtra?: React.ReactNode;
}) {
  const total = slides.length;
  const chapters = useMemo(() => {
    const list: { name: string; index: number }[] = [];
    slides.forEach((s, i) => {
      if (!list.some((c) => c.name === s.chapter)) list.push({ name: s.chapter, index: i });
    });
    return list;
  }, [slides]);
  const [index, setIndex] = useState(() =>
    initialIndex === undefined ? readHash(total) : Math.min(Math.max(initialIndex, 0), total - 1),
  );
  const [stacked, setStacked] = useState(false);
  const [full, setFull] = useState(false);
  const [menu, setMenu] = useState(false);
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (orientation: landscape)");
    const update = () => setStacked(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const go = useCallback((n: number) => setIndex(Math.min(Math.max(n, 0), total - 1)), [total]);

  useEffect(() => {
    onIndexChange?.(index, slides[index]!);
    if (stacked) return;
    window.history.replaceState(null, "", hashOf(slides[index]!, index));
    heading.current?.focus({ preventScroll: true });
    // hashOf e onIndexChange são estáveis por apresentação; o efeito segue o slide atual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, stacked, slides]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    onExit();
  }, [onExit]);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageEl?.requestFullscreen?.();
  }, [stageEl]);

  useEffect(() => {
    const onFs = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      // Com uma janela aberta, o teclado é dela (Esc fecha a janela, não a apresentação).
      if (menu || dialogOpen()) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("a, input, textarea, select, [role='radiogroup']")) return;
      if (e.key === " " && target?.closest("button")) return;
      if (e.key === "Escape") return exit();
      if (stacked) return;
      const key = e.key.toLowerCase();
      if (["arrowright", "pagedown", " "].includes(key)) {
        e.preventDefault();
        go(index + 1);
      } else if (["arrowleft", "pageup"].includes(key)) {
        e.preventDefault();
        go(index - 1);
      } else if (key === "home") {
        e.preventDefault();
        go(0);
      } else if (key === "end") {
        e.preventDefault();
        go(total - 1);
      } else if (key === "f") {
        e.preventDefault();
        toggleFull();
      } else if (key === "g") {
        e.preventDefault();
        setMenu(true);
      }
    };
    // Captura no window: roda antes da janela (Radix) fechar, então "há janela aberta" ainda é verdade.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [exit, go, index, menu, stacked, toggleFull, total]);

  const reduced = prefersReducedMotion();
  const toolbarButton =
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";
  const chapterOf = (i: number) => chapters.filter((c) => c.index <= i).length;

  const renderSlide = (s: DeckSlide, i: number, active: boolean) => (
    <section
      key={s.id}
      aria-roledescription="slide"
      aria-label={`${i + 1} de ${total}: ${s.title}`}
      className={`proposal-slide ${s.dark ? "is-dark" : ""} ${s.divider ? "is-divider" : ""} ${s.mesh ? "is-mesh" : ""} ${s.className ?? ""} ${active && !reduced ? "is-entering" : ""}`}
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
        <InstitutoMark surface={s.dark ? "dark" : "light"} className="slide-footer-logo" />
        <VitalOSBrand variant="horizontal" size="sm" surface={s.dark ? "dark" : "light"} />
        {s.footnote ? <span className="proposal-slide-footnote">{s.footnote}</span> : null}
        <span className="ml-auto tabular-nums">
          {s.chapter} · {i + 1} / {total}
        </span>
      </footer>
    </section>
  );

  return (
    <DeckNav.Provider
      value={{
        next: () =>
          stacked
            ? document.getElementById(`slide-${slides[index + 1]?.id}`)?.scrollIntoView()
            : go(index + 1),
      }}
    >
      <DialogContainer.Provider value={stageEl}>
        <div
          ref={setStageEl}
          className="proposal proposal-slides"
          role="region"
          aria-roledescription="apresentação"
          aria-label={label}
        >
          <div className="proposal-slides-toolbar">
            <button type="button" onClick={exit} className={toolbarButton}>
              <X aria-hidden className="h-4 w-4" />
              <span className="hidden sm:inline">Sair da apresentação</span>
              <span className="sm:hidden">Sair</span>
            </button>
            <DialogPrimitive.Root open={menu} onOpenChange={setMenu}>
              <DialogPrimitive.Trigger className={toolbarButton}>
                <List aria-hidden className="h-4 w-4" />
                Capítulos
              </DialogPrimitive.Trigger>
              <DialogPrimitive.Portal container={stageEl ?? undefined}>
                <DialogPrimitive.Overlay className="proposal-dialog-overlay" />
                <DialogPrimitive.Content data-proposal-dialog className="proposal-dialog proposal">
                  <DialogPrimitive.Title className="font-serif text-2xl">
                    Capítulos
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-sm text-muted-foreground">
                    Ir direto a uma parte da apresentação.
                  </DialogPrimitive.Description>
                  <ol className="mt-4 space-y-1">
                    {chapters.map((c, n) => (
                      <li key={c.name}>
                        <button
                          type="button"
                          onClick={() => {
                            setMenu(false);
                            if (stacked)
                              document
                                .getElementById(`slide-${slides[c.index]!.id}`)
                                ?.scrollIntoView();
                            else go(c.index);
                          }}
                          className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="tabular-nums text-muted-foreground">{n + 1}</span>
                          <span className="font-semibold">{c.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            slide {c.index + 1}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  <DialogPrimitive.Close className="mt-4 inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Fechar
                  </DialogPrimitive.Close>
                </DialogPrimitive.Content>
              </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
            {toolbarExtra}
            {!stacked ? (
              <div className="ml-auto flex items-center gap-1">
                <span className="hidden text-xs text-muted-foreground lg:inline">
                  Capítulo {chapterOf(index)} de {chapters.length}
                </span>
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
                  <span className="hidden md:inline">
                    {full ? "Sair da tela cheia" : "Tela cheia"}
                  </span>
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
              {slides.map((s, i) => (
                <div key={s.id} id={`slide-${s.id}`}>
                  {renderSlide(s, i, false)}
                </div>
              ))}
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
            {!stacked ? "Setas ou Espaço avançam · G capítulos · F tela cheia · Esc sai" : null}
          </p>
        </div>
      </DialogContainer.Provider>
    </DeckNav.Provider>
  );
}
