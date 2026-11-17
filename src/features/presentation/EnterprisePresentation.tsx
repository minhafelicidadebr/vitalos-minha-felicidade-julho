import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  ExternalLink,
  List,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Maximize,
  ShieldCheck,
  X,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { VitalOSBrand } from "@/components/brand/VitalOSBrand";
import { PresentationCardView, PresentationVisual } from "./PresentationVisual";
import type { PresentationDeck, PresentationReply, PresentationSlide } from "./types";
import "./presentation.css";

type Screen = "loading" | "locked" | "unavailable" | "limited" | "error";
const messages: Record<Exclude<Screen, "loading" | "locked">, string> = {
  unavailable:
    "A apresentação ainda não está disponível neste ambiente. Solicite à equipe responsável a configuração do acesso.",
  limited: "Muitas tentativas em pouco tempo. Aguarde um minuto antes de tentar novamente.",
  error: "Não conseguimos confirmar o acesso. Confira sua conexão e tente novamente.",
};

function PresentationModal({
  children,
  focusTarget,
}: {
  children: React.ReactNode;
  focusTarget?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="presentation-modal-overlay" />
      <DialogPrimitive.Content
        className="presentation-modal"
        onCloseAutoFocus={(event) => {
          if (focusTarget) {
            event.preventDefault();
            document.getElementById(focusTarget)?.focus({ preventScroll: true });
          }
        }}
      >
        {children}
        <DialogPrimitive.Close className="presentation-modal-close" aria-label="Fechar painel">
          <X size={21} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function Slide({
  slide,
  number,
  total,
  continuous,
  contact,
}: {
  slide: PresentationSlide;
  number: number;
  total: number;
  continuous: boolean;
  contact: PresentationDeck["contact"];
}) {
  const dark = slide.kind === "hero" || slide.kind === "closing";
  const Heading = continuous ? "h2" : "h1";
  return (
    <article
      id={`capitulo-${slide.id}`}
      className={`presentation-slide presentation-slide--${slide.kind} ${dark ? "presentation-slide--dark" : ""}`}
      aria-labelledby={`titulo-${slide.id}`}
    >
      <div className="presentation-slide-top">
        <span>{slide.chapter}</span>
        <span>
          {String(number).padStart(2, "0")} / {total}
        </span>
      </div>
      <div className="presentation-composition">
        <div className="presentation-copy">
          <p className="presentation-eyebrow">{slide.eyebrow}</p>
          <Heading id={`titulo-${slide.id}`} tabIndex={-1}>
            {slide.title}
          </Heading>
          <p className="presentation-summary">{slide.summary}</p>
          <div className="presentation-slide-actions">
            {slide.kind === "closing" && (
              <a
                href={contact.href}
                target="_blank"
                rel="noopener noreferrer"
                className="presentation-button presentation-button--gold"
              >
                {contact.label}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            )}
            <Dialog>
              <DialogTrigger className="presentation-detail-button">
                {slide.detailCta}
                <ChevronRight size={18} aria-hidden="true" />
              </DialogTrigger>
              <PresentationModal>
                <p className="presentation-panel-eyebrow">{slide.chapter} · Em detalhe</p>
                <DialogTitle className="presentation-panel-title">{slide.detail.title}</DialogTitle>
                <DialogDescription className="presentation-panel-introduction">
                  {slide.detail.introduction}
                </DialogDescription>
                <div className="presentation-panel-grid">
                  {slide.detail.blocks.map((card) => (
                    <PresentationCardView card={card} key={card.label} />
                  ))}
                </div>
                {slide.detail.sources && (
                  <div className="presentation-sources">
                    <h3>Fontes e referências</h3>
                    {slide.detail.sources.map((source) => (
                      <a
                        key={source.href}
                        href={source.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.label}
                        <ExternalLink size={15} aria-hidden="true" />
                        <span className="sr-only"> (abre em outra aba)</span>
                      </a>
                    ))}
                  </div>
                )}
                <p className="presentation-panel-note">
                  <ShieldCheck size={17} aria-hidden="true" />
                  {slide.note}
                </p>
              </PresentationModal>
            </Dialog>
          </div>
        </div>
        <div className="presentation-visual">
          <PresentationVisual slide={slide} />
        </div>
      </div>
      <div className="presentation-slide-bottom">
        <p>
          <ShieldCheck size={15} aria-hidden="true" />
          {slide.note}
        </p>
        {dark && (
          <div className="presentation-institute">
            <span>Uma iniciativa do</span>
            <img
              src="/brand/instituto/instituto-full-original.png"
              alt="Instituto Felicidade para Todos"
              width="1198"
              height="481"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </article>
  );
}

export function EnterprisePresentation() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [ttl, setTtl] = useState(0);
  const [index, setIndex] = useState(0);
  const [continuous, setContinuous] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const requestId = useRef(0);
  const headingFocus = useRef(false);
  const passwordInput = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearDeck = useCallback((state: Screen) => {
    requestId.current++;
    clearTimeout(expiry.current);
    setDeck(null);
    setTtl(0);
    setScreen(state);
  }, []);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const response = await fetch("/api/apresentacao", {
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      const value = (await response.json()) as PresentationReply;
      if (id !== requestId.current) return;
      if (value.state === "ready" && response.ok && value.ttlMs > 0) {
        setDeck(value.deck);
        setTtl(value.ttlMs);
        setNotice("");
        clearTimeout(expiry.current);
        expiry.current = setTimeout(() => {
          clearDeck("locked");
          setNotice("Seu acesso expirou. Informe a senha para retomar o capítulo.");
        }, value.ttlMs);
      } else {
        clearDeck(
          value.state === "unavailable"
            ? "unavailable"
            : value.state === "limited"
              ? "limited"
              : "locked",
        );
      }
    } catch {
      if (id === requestId.current) clearDeck("error");
    }
  }, [clearDeck]);

  useEffect(() => {
    const lifecycle = requestId;
    void load();
    const check = () => {
      if (document.visibilityState !== "hidden") void load();
    };
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      lifecycle.current++;
      clearTimeout(expiry.current);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [load]);

  useEffect(() => {
    if (!deck) return;
    const readHash = () => {
      const selected = deck.slides.findIndex((slide) => `#${slide.id}` === window.location.hash);
      setIndex(Math.max(0, selected));
    };
    readHash();
    window.addEventListener("popstate", readHash);
    window.addEventListener("hashchange", readHash);
    return () => {
      window.removeEventListener("popstate", readHash);
      window.removeEventListener("hashchange", readHash);
    };
  }, [deck]);

  useEffect(() => {
    if (!deck || !headingFocus.current) return;
    headingFocus.current = false;
    const heading = document.getElementById(`titulo-${deck.slides[index]!.id}`);
    heading?.focus({ preventScroll: true });
    if (continuous) heading?.scrollIntoView({ block: "start", behavior: "instant" });
    else root.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [deck, index, continuous]);

  const select = (next: number) => {
    if (!deck || next < 0 || next >= deck.slides.length) return;
    headingFocus.current = true;
    setIndex(next);
    window.history.pushState(null, "", `#${deck.slides[next]!.id}`);
    setContentsOpen(false);
    // Selecting the same slide still restores its heading after the dialog closes.
    requestAnimationFrame(() => {
      if (!document.querySelector('[role="dialog"]'))
        document.getElementById(`titulo-${deck.slides[next]!.id}`)?.focus();
    });
  };

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const password = passwordInput.current?.value ?? "";
    if (passwordInput.current) passwordInput.current.value = "";
    setBusy(true);
    setNotice("");
    const id = ++requestId.current;
    try {
      const result = await fetch("/api/apresentacao", {
        method: "POST",
        credentials: "same-origin",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(12000),
      });
      if (id !== requestId.current) return;
      if (result.ok) {
        headingFocus.current = true;
        await load();
      } else {
        const body = (await result.json()) as PresentationReply;
        clearDeck(
          body.state === "limited"
            ? "limited"
            : body.state === "unavailable"
              ? "unavailable"
              : "locked",
        );
        setNotice(result.status === 401 ? "Senha não reconhecida. Confira e tente novamente." : "");
        passwordInput.current?.focus();
      }
    } catch {
      clearDeck("error");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    clearDeck("loading");
    setNotice("");
    setBusy(true);
    try {
      const result = await fetch("/api/apresentacao", {
        method: "DELETE",
        credentials: "same-origin",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      clearDeck("locked");
      setNotice(
        result.ok
          ? "Acesso encerrado."
          : "Não foi possível confirmar a saída no servidor. Tente encerrar novamente.",
      );
    } catch {
      clearDeck("error");
      setNotice("Não foi possível confirmar a saída no servidor. Tente encerrar novamente.");
    } finally {
      setBusy(false);
    }
  }

  const active = deck?.slides[index];
  return (
    <div className="enterprise-presentation" ref={root}>
      <a href="#apresentacao-conteudo" className="presentation-skip">
        Ir para o conteúdo
      </a>
      <header className="presentation-header">
        <a href="/" aria-label="VitalOS · página inicial">
          <VitalOSBrand size="md" />
        </a>
        <span className="presentation-header-caption">
          <span /> Apresentação empresarial
        </span>
        {deck && (
          <div className="presentation-header-actions">
            <button
              className="presentation-tool"
              aria-label={continuous ? "Usar modo de slides" : "Usar leitura contínua"}
              onClick={() => {
                headingFocus.current = true;
                setContinuous(!continuous);
              }}
            >
              <BookOpen size={18} aria-hidden="true" />
              <span>{continuous ? "Slides" : "Leitura"}</span>
            </button>
            <button
              className="presentation-tool presentation-fullscreen"
              aria-label="Alternar tela cheia"
              onClick={() => {
                if (document.fullscreenElement)
                  void document
                    .exitFullscreen()
                    .catch(() =>
                      setNotice("Use os controles do navegador para sair da tela cheia."),
                    );
                else
                  void root.current
                    ?.requestFullscreen()
                    .catch(() =>
                      setNotice(
                        "Tela cheia indisponível. A apresentação continua acessível nesta janela.",
                      ),
                    );
              }}
            >
              <Maximize size={18} aria-hidden="true" />
            </button>
            <button
              className="presentation-tool"
              onClick={() => void signOut()}
              disabled={busy}
              aria-label="Sair"
            >
              <LogOut size={18} aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </header>
      {!deck ? (
        <main id="apresentacao-conteudo" className="presentation-access">
          <div className="presentation-access-story">
            <p className="presentation-eyebrow">VitalOS™ para empresas</p>
            <h1>
              Uma nova conversa
              <br />
              sobre o futuro
              <br />
              <em>do trabalho.</em>
            </h1>
            <p>
              Conheça uma proposta que conecta pessoas, aprendizagem e transformação organizacional.
            </p>
            <div className="presentation-access-signature">
              <img
                src="/brand/instituto/instituto-full-original.png"
                alt="Instituto Felicidade para Todos"
                width="1198"
                height="481"
              />
              <span>Organização idealizadora</span>
            </div>
          </div>
          <div className="presentation-access-card">
            <span className="presentation-access-lock">
              <LockKeyhole size={24} aria-hidden="true" />
            </span>
            <p className="presentation-eyebrow">Acesso reservado</p>
            <h2>Vamos começar?</h2>
            <p>
              Informe a senha compartilhada pela equipe para abrir a apresentação institucional.
            </p>
            {screen === "loading" ? (
              <p role="status" className="presentation-loading">
                <LoaderCircle size={20} aria-hidden="true" /> Verificando acesso…
              </p>
            ) : (
              <form onSubmit={(event) => void signIn(event)}>
                <label htmlFor="presentation-password">Senha da apresentação</label>
                <input
                  ref={passwordInput}
                  id="presentation-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={256}
                  disabled={busy}
                  aria-describedby="presentation-access-note"
                />
                <button type="submit" className="presentation-button" disabled={busy}>
                  {busy ? "Abrindo…" : "Abrir apresentação"}
                  {busy ? (
                    <LoaderCircle size={18} aria-hidden="true" />
                  ) : (
                    <ArrowRight size={18} aria-hidden="true" />
                  )}
                </button>
              </form>
            )}
            {notice && (
              <p role="status" className="presentation-access-notice">
                {notice}
              </p>
            )}
            {screen !== "loading" && screen !== "locked" && (
              <div className="presentation-access-notice" role="alert">
                <p>{messages[screen]}</p>
                <button onClick={() => void load()} className="presentation-text-button">
                  Verificar novamente
                </button>
              </div>
            )}
            {notice.includes("saída no servidor") && (
              <button
                className="presentation-text-button"
                onClick={() => void signOut()}
                disabled={busy}
              >
                Tentar encerrar novamente
              </button>
            )}
            <p id="presentation-access-note" className="presentation-access-footnote">
              <ShieldCheck size={16} aria-hidden="true" />
              Este acesso abre somente a apresentação. Para o ambiente da sua empresa,{" "}
              <a href="/entrar">use o acesso institucional</a>.
            </p>
          </div>
        </main>
      ) : (
        <>
          <main
            id="apresentacao-conteudo"
            className="presentation-main"
            aria-label="Apresentação institucional empresarial"
            onKeyDown={(event) => {
              if (
                continuous ||
                document.querySelector('[role="dialog"]') ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                (event.target as HTMLElement).closest(
                  "input, textarea, select, button, a, [contenteditable]",
                )
              )
                return;
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                select(index + (event.key === "ArrowRight" ? 1 : -1));
              }
            }}
          >
            {continuous ? (
              <>
                <h1 className="sr-only">VitalOS · Proposta empresarial</h1>
                {deck.slides.map((slide, i) => (
                  <Slide
                    key={slide.id}
                    slide={slide}
                    number={i + 1}
                    total={deck.slides.length}
                    continuous
                    contact={deck.contact}
                  />
                ))}
              </>
            ) : (
              active && (
                <Slide
                  key={active.id}
                  slide={active}
                  number={index + 1}
                  total={deck.slides.length}
                  continuous={false}
                  contact={deck.contact}
                />
              )
            )}
          </main>
          <nav className="presentation-navigation" aria-label="Navegação da apresentação">
            <div className="presentation-progress" aria-hidden="true">
              <span style={{ width: `${((index + 1) / deck.slides.length) * 100}%` }} />
            </div>
            <button
              className="presentation-nav-arrow"
              onClick={() => select(index - 1)}
              disabled={index === 0}
              aria-label="Slide anterior"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
            <Dialog open={contentsOpen} onOpenChange={setContentsOpen}>
              <DialogTrigger className="presentation-index-button">
                <List size={19} aria-hidden="true" />
                <span>
                  <strong>{active?.chapter}</strong>
                  <span aria-live="polite" aria-atomic="true">
                    Slide {index + 1} de {deck.slides.length}
                  </span>
                </span>
              </DialogTrigger>
              <PresentationModal focusTarget={active ? `titulo-${active.id}` : undefined}>
                <p className="presentation-panel-eyebrow">Escolha seu percurso</p>
                <DialogTitle className="presentation-panel-title">
                  Uma visão completa. No seu ritmo.
                </DialogTitle>
                <DialogDescription className="presentation-panel-introduction">
                  Siga a narrativa ou vá direto ao tema da sua conversa.
                </DialogDescription>
                <ol className="presentation-chapter-list">
                  {deck.slides.map((slide, i) => (
                    <li key={slide.id}>
                      <button
                        onClick={() => select(i)}
                        aria-current={i === index ? "step" : undefined}
                      >
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <small>{slide.chapter}</small>
                          <strong>{slide.title}</strong>
                        </div>
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ol>
              </PresentationModal>
            </Dialog>
            <span className="presentation-navigation-hint">
              Explore a proposta
              <br />
              <small>no seu ritmo</small>
            </span>
            <button
              className="presentation-button presentation-next"
              onClick={() => select(index + 1)}
              disabled={index === deck.slides.length - 1}
            >
              Próximo<span className="sr-only"> slide</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </nav>
          <footer className="presentation-footer">
            <span>{deck.edition}</span>
            <span>Acesso reservado · Sessão de até {Math.ceil(ttl / 60_000)} min</span>
          </footer>
          {notice && (
            <p role="status" className="presentation-floating-notice">
              {notice}
            </p>
          )}
        </>
      )}
    </div>
  );
}
