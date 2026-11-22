// Ajuda contextual com evidências — acionador ⓘ + diálogo em três camadas.
//
// Camada 1: resposta curta (sempre visível ao abrir).
// Camada 2: "Na sua função" — exemplo e próximo passo do papel; a troca de perspectiva é só
//           recurso de leitura, não muda acesso nem dado.
// Camada 3: "Fonte e alcance" — natureza de cada fonte rotulada; estudo só com claim do contexto.
// Usa o Dialog existente (Radix: foco preso, Escape, retorno ao acionador). Abrir e fechar a
// ajuda não altera nenhum estado da tela.

import { useId, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Info,
  Landmark,
  MessageCircleQuestion,
  Ear,
  Handshake,
  CalendarCheck,
  ShieldCheck,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePersona } from "@/app/identity/persona-store";
import {
  helpRoleFromPersona,
  resolveHelp,
  type ContextualHelpEntry,
  type HelpRole,
  type HelpSourceNature,
} from "@/engine/help/contextual-help-engine";
import { HELP_UI_COPY as COPY, resolveHelpEvidence } from "@/domain/help/contextual-help";

const FLOW_ICONS: LucideIcon[] = [Ear, Handshake, CalendarCheck];

const NATURE_STYLE: Record<HelpSourceNature, { icon: LucideIcon; className: string }> = {
  produto: { icon: Waypoints, className: "border-primary/30 bg-primary/8 text-primary" },
  orientacao_oficial: { icon: Landmark, className: "border-accent/50 bg-accent/12 text-foreground" },
  estudo: { icon: BookOpenCheck, className: "border-border bg-muted text-foreground" },
};

const ROLE_ORDER: HelpRole[] = ["colaborador", "lideranca", "rh", "sst", "direcao"];

function NatureBadge({ nature }: { nature: HelpSourceNature }) {
  const style = NATURE_STYLE[nature];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style.className}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {COPY.natureLabel[nature]}
    </span>
  );
}

export function ContextualHelp({
  entry,
  stateKey,
  visibleLabel,
  size = "md",
  roleId,
}: {
  entry: ContextualHelpEntry;
  /** Estado atual da tela, quando a entrada declara estados. */
  stateKey?: string | null;
  /** Rótulo de texto ao lado do ícone, quando o ícone sozinho não dá contexto. */
  visibleLabel?: string;
  size?: "md" | "sm";
  /** Papel da sessão institucional real; sem ele, usa a persona demonstrativa. */
  roleId?: string | null;
}) {
  const { roleId: demoRoleId } = usePersona();
  const personaRole = helpRoleFromPersona(roleId ?? demoRoleId);
  const [viewRole, setViewRole] = useState<HelpRole | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sourcesId = useId();

  const role = viewRole ?? personaRole;
  const help = useMemo(
    () => resolveHelp(entry, role, { stateKey, resolveEvidence: resolveHelpEvidence }),
    [entry, role, stateKey],
  );

  // Colaborador sempre aparece: sem texto próprio, ele lê a variação geral.
  const roleTabs = ROLE_ORDER.filter((r) => r === personaRole || r === "colaborador" || entry.roles[r]);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setViewRole(null);
          setSourcesOpen(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={entry.question}
          className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            visibleLabel ? "min-h-11 px-3 text-sm font-medium" : "h-11 w-11"
          }`}
        >
          <Info className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
          {visibleLabel && <span>{visibleLabel}</span>}
        </button>
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          titleRef.current?.focus();
        }}
        // Fundo acima do concierge (z-60) e conteúdo acima do fundo: o lançador fica
        // escurecido atrás da ajuda, como no diálogo de método do IVO (z-79/z-80).
        overlayClassName="z-[69] motion-reduce:animate-none"
        className="z-[70] flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 motion-reduce:animate-none"
      >
        {/* Uma só área rolável (cabeçalho incluído): no celular, o cabeçalho não come a tela. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Camada 1 · resposta curta */}
        <header className="border-b border-border/70 bg-gradient-to-br from-primary/10 via-card to-accent/10 px-5 pb-5 pt-6 sm:px-7">
          <p className="flex items-center gap-1.5 pr-10 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <MessageCircleQuestion className="h-4 w-4" aria-hidden />
            {COPY.eyebrow}
          </p>
          <DialogTitle
            ref={titleRef}
            tabIndex={-1}
            className="mt-2 pr-8 font-serif text-2xl leading-snug text-foreground focus:outline-none"
          >
            {entry.question}
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-[62ch] text-base leading-relaxed text-foreground/85">
            {entry.summary}
          </DialogDescription>
          {entry.demoNotice && (
            <p className="mt-3 flex max-w-[62ch] items-start gap-2 rounded-xl border border-accent/50 bg-accent/10 px-3 py-2 text-sm leading-relaxed text-foreground">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" aria-hidden />
              <span>
                <span className="font-semibold">{COPY.demoBadge}.</span> {entry.demoNotice}
              </span>
            </p>
          )}
        </header>

        <div className="px-5 py-5 sm:px-7">
          {help.state && (
            <section className="mb-5 rounded-xl border-l-4 border-primary bg-primary/5 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {COPY.stateHeading} · {help.state.label}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{help.state.meaning}</p>
            </section>
          )}

          {(entry.dataScope || entry.afterwards || entry.whyItMatters) && (
            <dl className="mb-6 grid gap-3 sm:grid-cols-3">
              {(
                [
                  [COPY.dataScopeHeading, entry.dataScope],
                  [COPY.afterwardsHeading, entry.afterwards],
                  [COPY.whyHeading, entry.whyItMatters],
                ] as const
              )
                .filter(([, text]) => !!text)
                .map(([heading, text]) => (
                  <div key={heading} className="rounded-xl border border-border/70 bg-background/60 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                      {heading}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-foreground/85">{text}</dd>
                  </div>
                ))}
            </dl>
          )}

          <div className="grid gap-6 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              {/* Camada 2 · na sua função */}
              <section aria-labelledby={`${sourcesId}-role`}>
                <h3 id={`${sourcesId}-role`} className="font-serif text-lg text-foreground">
                  {COPY.roleHeading}
                </h3>
                {roleTabs.length > 1 && (
                  <div className="mt-2" role="group" aria-label={COPY.roleSwitchLabel}>
                    <p className="text-xs text-muted-foreground">{COPY.roleSwitchLabel}</p>
                    <p className="text-xs text-muted-foreground">{COPY.roleSwitchHint}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {roleTabs.map((r) => (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={role === r}
                          onClick={() => setViewRole(r)}
                          className={`min-h-11 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            role === r
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:border-primary/50"
                          }`}
                        >
                          {COPY.roleLabel[r]}
                          {r === personaRole && (
                            <span className={role === r ? "text-primary-foreground/80" : "text-muted-foreground"}>
                              {" "}· {COPY.yourRole}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                  {!help.roleSpecific && role !== "colaborador" && (
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{COPY.generalRole}</p>
                  )}
                  <p className="text-sm leading-relaxed text-card-foreground">{help.variant.example}</p>
                  <div className="mt-3 border-t border-border/60 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                      {COPY.nextStep}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">{help.variant.nextStep}</p>
                    {help.variant.link && (
                      <Link
                        to={help.variant.link.to}
                        className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                      >
                        {help.variant.link.label}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    )}
                  </div>
                </div>
              </section>

              {entry.flow && (
                <section>
                  <h3 className="font-serif text-lg text-foreground">{COPY.flowHeading}</h3>
                  <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                    {entry.flow.map((step, i) => {
                      const Icon = FLOW_ICONS[i] ?? Info;
                      return (
                        <li
                          key={step.verb}
                          className="relative rounded-xl border border-border/70 bg-muted/30 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-primary">
                              <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              <span className="sr-only">{COPY.stepPrefix(i + 1)}</span>
                              {step.verb}
                            </span>
                          </div>
                          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                            {step.who}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-foreground/85">{step.text}</p>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}
            </div>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                  {COPY.limitsHeading}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {entry.limits.map((limit) => (
                    <li key={limit} className="flex gap-2 text-sm leading-relaxed text-foreground/85">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />
                      {limit}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Camada 3 · fonte e alcance */}
              <section className="rounded-2xl border border-border/70 bg-card">
                <h3>
                  <button
                    type="button"
                    aria-expanded={sourcesOpen}
                    aria-controls={`${sourcesId}-sources`}
                    onClick={() => setSourcesOpen((v) => !v)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{COPY.sourcesHeading}</span>
                      <span className="block text-xs text-muted-foreground">{COPY.sourcesHint}</span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${sourcesOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                </h3>
                <div id={`${sourcesId}-sources`} hidden={!sourcesOpen} className="space-y-3 px-4 pb-4">
                  {entry.sources.map((source, i) => (
                    <div key={`${source.title}-${i}`} className="border-t border-border/60 pt-3">
                      <NatureBadge nature={source.nature} />
                      <p className="mt-1.5 text-sm font-medium text-foreground">{source.title}</p>
                      {source.locator && <p className="text-xs text-muted-foreground">{source.locator}</p>}
                      <p className="mt-1 text-sm leading-relaxed text-foreground/85">
                        <span className="font-medium">{COPY.supports}:</span> {source.supports}
                      </p>
                      {source.href && (
                        <a
                          href={source.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4"
                        >
                          {source.nature === "orientacao_oficial" ? COPY.openOfficial : COPY.openStudy}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          <span className="sr-only">{COPY.newTab}</span>
                        </a>
                      )}
                      {source.to && (
                        <Link
                          to={source.to}
                          className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4"
                        >
                          {COPY.openInApp}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      )}
                    </div>
                  ))}
                  {help.evidence ? (
                    <div className="border-t border-border/60 pt-3">
                      <NatureBadge nature="estudo" />
                      <p className="mt-1.5 text-sm leading-relaxed text-foreground">{help.evidence.text}</p>
                      {help.evidence.caveat && (
                        <p className="mt-1 text-xs text-muted-foreground">{help.evidence.caveat}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">{help.evidence.citation}</p>
                      {help.evidence.href && (
                        <a
                          href={help.evidence.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4"
                        >
                          {COPY.openStudy}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          <span className="sr-only">{COPY.newTab}</span>
                        </a>
                      )}
                    </div>
                  ) : entry.evidence ? (
                    <p className="border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
                      {COPY.studyPending}
                    </p>
                  ) : null}
                  <p className="border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                    {COPY.reviewLine(entry.version)}
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </div>

        </div>

        <footer className="flex justify-end border-t border-border/70 bg-card px-5 py-3 sm:px-7">
          <DialogClose asChild>
            <button
              type="button"
              className="min-h-11 rounded-xl border border-border bg-background px-5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {COPY.close}
            </button>
          </DialogClose>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
