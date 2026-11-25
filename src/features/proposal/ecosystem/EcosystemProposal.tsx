// Proposta para o ecossistema ISG (/proposta/ecossistema). Mesma porta e sessão da proposta
// original; conteúdo próprio em /api/proposta/ecossistema. Três vistas do MESMO conteúdo:
// leitura vertical (com impressão), modo Apresentar (palco compartilhado) e roteiro do apresentador
// (?vista=roteiro, separado da projeção e sincronizado com o slide atual).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, LogOut, MonitorPlay, Printer, ScrollText } from "lucide-react";
import { InstitutoMark } from "../ProposalV3";
import { ProposalGate } from "../ProposalGate";
import { SlideDeck, type DeckSlide } from "../SlideDeck";
import { EcosystemScene, isDarkScene, pad } from "./EcosystemScene";
import type { EcoScene, EcosystemProposal } from "./types";
import "../proposal.css";
import "./ecosystem.css";

export const ECOSYSTEM_ENDPOINT = "/api/proposta/ecossistema";
const CHANNEL = "vitalos-proposta-ecossistema";

export type EcoMode = "executivo" | "completo";
export const MODE_LABEL: Record<EcoMode, string> = {
  executivo: "Percurso executivo",
  completo: "Apresentação completa",
};

export const scenesFor = (scenes: EcoScene[], mode: EcoMode) =>
  mode === "executivo" ? scenes.filter((s) => s.executive) : scenes;

const readMode = (): EcoMode =>
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("modo") === "completo"
    ? "completo"
    : "executivo";

/** "#slide-07" → 7 (link direto a uma cena do modo Apresentar). */
const readSlideHash = () => {
  const m = /^#slide-(\d{1,2})$/.exec(typeof window === "undefined" ? "" : window.location.hash);
  return m ? Number(m[1]) : null;
};

function ModeSwitch({
  mode,
  onChange,
  compact,
}: {
  mode: EcoMode;
  onChange: (m: EcoMode) => void;
  compact?: boolean;
}) {
  const refs = useRef<Record<EcoMode, HTMLButtonElement | null>>({
    executivo: null,
    completo: null,
  });
  const order: EcoMode[] = ["executivo", "completo"];
  return (
    <div role="radiogroup" aria-label="Modo da proposta" className="eco-mode">
      {order.map((m) => (
        <button
          key={m}
          ref={(el) => {
            refs.current[m] = el;
          }}
          type="button"
          role="radio"
          aria-checked={mode === m}
          tabIndex={mode === m ? 0 : -1}
          onClick={() => onChange(m)}
          onKeyDown={(e) => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
            e.preventDefault();
            const next = order[(order.indexOf(m) + 1) % order.length]!;
            onChange(next);
            refs.current[next]?.focus();
          }}
          className="eco-mode-option"
        >
          {compact ? (m === "executivo" ? "Executivo" : "Completa") : MODE_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

function VersionSelector() {
  return (
    <nav aria-label="Versão da proposta" className="eco-version">
      <span className="eco-version-label">Versão da proposta</span>
      <a href="/proposta" className="eco-version-option">
        Proposta original
      </a>
      <a href="/proposta/ecossistema" aria-current="page" className="eco-version-option">
        Proposta para o ecossistema
      </a>
    </nav>
  );
}

function Deck({
  p,
  mode,
  setMode,
  start,
  onExit,
}: {
  p: EcosystemProposal;
  mode: EcoMode;
  setMode: (m: EcoMode) => void;
  start: number;
  onExit: () => void;
}) {
  const scenes = useMemo(() => scenesFor(p.scenes, mode), [p.scenes, mode]);
  const channel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(CHANNEL);
    channel.current = ch;
    return () => {
      if (channel.current === ch) channel.current = null;
      ch.close();
    };
  }, []);
  // Aviso ao roteiro do apresentador: nunca derruba a apresentação (canal ausente ou fechado).
  const announce = (number?: number) => {
    try {
      channel.current?.postMessage({ number });
    } catch {
      /* roteiro é opcional */
    }
  };
  const slides: DeckSlide[] = useMemo(
    () =>
      scenes.map((s) => ({
        id: `cena-${pad(s.number)}`,
        chapter: s.chapter,
        title: s.title,
        dark: isDarkScene(s),
        className: `eco-slide eco-slide-${s.layout}`,
        footnote: s.sources?.length
          ? `Fonte: ${s.sources.map((x) => x.label).join(" · ")}`
          : undefined,
        body: <EcosystemScene scene={s} demo={p.demo} contact={p.contact} slide />,
      })),
    [scenes, p.demo, p.contact],
  );
  const startIndex = Math.max(
    0,
    scenes.findIndex((s) => s.number === start),
  );
  const toolbarButton =
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <SlideDeck
      key={mode}
      slides={slides}
      label={`Proposta para o ecossistema · ${MODE_LABEL[mode]}`}
      initialIndex={startIndex}
      hashOf={(_s, i) => `#slide-${pad(scenes[i]!.number)}`}
      onIndexChange={(i) => announce(scenes[i]?.number)}
      onExit={onExit}
      toolbarExtra={
        <>
          <ModeSwitch mode={mode} onChange={setMode} compact />
          <a
            href="/proposta/ecossistema?vista=roteiro"
            target="vitalos-roteiro"
            className={toolbarButton}
            aria-label="Roteiro do apresentador (abre em outra janela)"
          >
            <ScrollText aria-hidden className="h-4 w-4" />
            <span className="hidden xl:inline">Roteiro</span>
          </a>
        </>
      }
    />
  );
}

export function EcosystemView({
  p,
  onLogout,
  startAt,
}: {
  p: EcosystemProposal;
  onLogout?: () => void;
  /** Cena inicial do modo Apresentar (padrão: link direto #slide-NN). */
  startAt?: number | null;
}) {
  const [mode, setModeState] = useState<EcoMode>(readMode);
  const [presenting, setPresenting] = useState<number | null>(() =>
    startAt === undefined ? readSlideHash() : startAt,
  );
  const presentButton = useRef<HTMLButtonElement>(null);

  const setMode = useCallback((m: EcoMode) => {
    setModeState(m);
    const url = new URL(window.location.href);
    if (m === "completo") url.searchParams.set("modo", "completo");
    else url.searchParams.delete("modo");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  // Link direto a uma cena fora do percurso executivo abre a apresentação completa.
  useEffect(() => {
    if (presenting === null) return;
    const scene = p.scenes.find((s) => s.number === presenting);
    if (scene && !scene.executive && mode === "executivo") setMode("completo");
  }, [presenting, p.scenes, mode, setMode]);

  const visible = useMemo(
    () => new Set(scenesFor(p.scenes, mode).map((s) => s.number)),
    [p.scenes, mode],
  );
  const chapters = useMemo(() => {
    const list: { name: string; number: number }[] = [];
    p.scenes
      .filter((s) => visible.has(s.number))
      .forEach((s) => {
        if (!list.some((c) => c.name === s.chapter))
          list.push({ name: s.chapter, number: s.number });
      });
    return list;
  }, [p.scenes, visible]);

  if (presenting !== null)
    return (
      <Deck
        p={p}
        mode={mode}
        setMode={setMode}
        start={presenting}
        onExit={() => {
          setPresenting(null);
          requestAnimationFrame(() => presentButton.current?.focus());
        }}
      />
    );

  const focusScene = (n: number) => {
    const el = document.getElementById(`cena-${pad(n)}`);
    el?.scrollIntoView({ block: "start" });
    document.getElementById(`titulo-cena-${pad(n)}`)?.focus({ preventScroll: true });
  };
  const firstVisible = p.scenes.find((s) => visible.has(s.number))?.number ?? 1;
  const nextAfter = (n: number) =>
    p.scenes.find((s) => s.number > n && visible.has(s.number))?.number;

  const button =
    "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="proposal eco-root min-h-dvh text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2"
      >
        Ir para o conteúdo
      </a>
      <header className="proposal-topbar eco-topbar sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <InstitutoMark className="h-9 w-auto sm:h-11" />
          <div className="proposal-no-print flex flex-wrap items-center gap-1">
            <button
              ref={presentButton}
              type="button"
              onClick={() => setPresenting(firstVisible)}
              className={`${button} bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              <MonitorPlay aria-hidden className="h-4 w-4" />
              Apresentar
            </button>
            <a
              href="/proposta/ecossistema?vista=roteiro"
              target="vitalos-roteiro"
              className={button}
            >
              <ScrollText aria-hidden className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Roteiro do apresentador</span>
            </a>
            <button type="button" onClick={() => window.print()} className={button}>
              <Printer aria-hidden className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Imprimir ou PDF</span>
            </button>
            {onLogout ? (
              <button type="button" onClick={onLogout} className={button}>
                <LogOut aria-hidden className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Sair</span>
              </button>
            ) : null}
          </div>
        </div>
        <div className="proposal-no-print mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-2">
          <VersionSelector />
          <ModeSwitch mode={mode} onChange={setMode} />
        </div>
        <nav
          aria-label="Capítulos"
          className="proposal-no-print eco-chapters mx-auto max-w-6xl px-2"
        >
          <ul>
            {chapters.map((c) => (
              <li key={c.name}>
                <a
                  href={`#cena-${pad(c.number)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    focusScene(c.number);
                  }}
                >
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="conteudo" tabIndex={-1} className="eco-main mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <h1 className="sr-only">
          {p.title} · {p.recipient}
        </h1>
        <p className="proposal-print-only eco-print-head">
          Proposta para o ecossistema · {p.recipient} · {p.version} · circulação restrita
        </p>
        <p className="eco-mode-note proposal-no-print">
          {mode === "executivo"
            ? `${MODE_LABEL.executivo}: ${visible.size} de ${p.scenes.length} cenas. As demais estão na ${MODE_LABEL.completo.toLowerCase()}.`
            : `${MODE_LABEL.completo}: ${p.scenes.length} cenas. As marcadas como “${MODE_LABEL.executivo}” formam a versão curta.`}
        </p>
        <ol className="eco-scene-list">
          {p.scenes.map((s) => (
            <li
              key={s.id}
              id={`cena-${pad(s.number)}`}
              className={`eco-page-scene ${isDarkScene(s) ? "is-dark" : ""} ${visible.has(s.number) ? "" : "eco-print-extra"}`}
              aria-labelledby={`titulo-cena-${pad(s.number)}`}
            >
              {mode === "completo" && s.executive ? (
                <span className="eco-exec-badge proposal-no-print">{MODE_LABEL.executivo}</span>
              ) : null}
              <EcosystemScene
                scene={s}
                demo={p.demo}
                contact={p.contact}
                headingId={`titulo-cena-${pad(s.number)}`}
                onExplore={() => {
                  const n = nextAfter(s.number);
                  if (n) focusScene(n);
                }}
              />
              <button
                type="button"
                onClick={() => setPresenting(s.number)}
                className="eco-present-from proposal-no-print"
                aria-label={`Apresentar a partir da cena ${pad(s.number)}`}
              >
                <MonitorPlay aria-hidden className="h-4 w-4" />
                Apresentar daqui
                <ArrowRight aria-hidden className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
        <footer className="eco-page-footer">
          <p>
            Imagens marcadas como “Ilustração gerada” foram criadas para esta proposta e mostram
            pessoas fictícias. Fontes abrem em nova aba.
          </p>
          <p>Instituto Felicidade para Todos · VitalOS · {p.version}</p>
        </footer>
      </main>
    </div>
  );
}

/** Roteiro do apresentador: falas por cena, separado da projeção, segue o slide atual. */
export function PresenterScript({ p }: { p: EcosystemProposal }) {
  const [current, setCurrent] = useState<number | null>(null);
  const [mode, setMode] = useState<EcoMode>(readMode);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e: MessageEvent<{ number?: number }>) => {
      if (typeof e.data?.number === "number") setCurrent(e.data.number);
    };
    return () => ch.close();
  }, []);
  useEffect(() => {
    if (current === null) return;
    document.getElementById(`roteiro-${pad(current)}`)?.scrollIntoView({ block: "center" });
  }, [current]);
  const scenes = scenesFor(p.scenes, mode);
  return (
    <div className="proposal eco-root eco-script min-h-dvh text-foreground">
      <header className="eco-topbar sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <h1 className="font-serif text-xl">Roteiro do apresentador</h1>
          <div className="proposal-no-print flex flex-wrap items-center gap-2">
            <ModeSwitch mode={mode} onChange={setMode} compact />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Printer aria-hidden className="h-4 w-4" />
              Imprimir ou PDF
            </button>
          </div>
        </div>
        <p
          className="proposal-no-print mx-auto max-w-3xl px-4 pb-2 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {current === null
            ? "Abra o modo Apresentar em outra janela: o roteiro acompanha a cena projetada."
            : `Cena projetada: ${pad(current)}.`}
        </p>
      </header>
      <ol className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        {scenes.map((s) => (
          <li
            key={s.id}
            id={`roteiro-${pad(s.number)}`}
            className={`eco-script-item ${current === s.number ? "is-current" : ""}`}
            aria-current={current === s.number ? "step" : undefined}
          >
            <p className="eco-kicker">
              <span className="tabular-nums">{pad(s.number)}</span> · {s.chapter}
              {s.executive ? ` · ${MODE_LABEL.executivo}` : ""}
            </p>
            <h2 className="font-serif text-lg leading-snug">{s.title}</h2>
            <p className="eco-script-speech">“{s.speech}”</p>
            {s.understand ? (
              <p className="text-sm text-muted-foreground">Entenda · {s.understand.question}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function EcosystemProposalPage() {
  const script =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("vista") === "roteiro";
  return (
    <ProposalGate<EcosystemProposal>
      endpoint={ECOSYSTEM_ENDPOINT}
      title="Proposta para o ecossistema"
      render={(content, logout) =>
        script ? <PresenterScript p={content} /> : <EcosystemView p={content} onLogout={logout} />
      }
    />
  );
}
