// /vitrine — Vitrine do Bem-Comum (I-M6, Mensurar Vivo). DEMO v1 (blueprint §I: a própria
// spec recomenda rollout DEMO antes de institutional_offers real, porque depende de
// csr_pledges real — que ainda não existe; a economia de Sementes também é demo hoje).
//
// O indivíduo sai da posição de comprador: nada aqui tem preço, checkout ou saldo lido.
// Porta Aberta fica ACIMA do catálogo, sem condição — nunca dentro do sorteio.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Gift,
  HeartHandshake,
  Repeat,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { getVitrineConfig, type VitrineConfig } from "@/engine/gamification/gamification-engine";
import {
  computeEligiblePool,
  runCiranda,
  summarizeMirroredImpact,
  type InstitutionalOffer,
  type OfferCategory,
} from "@/engine/vitrine/vitrine-offer-engine";
import { MOCK_USER } from "@/mocks/colaborador-mock";
import {
  VITRINE_CIRANDA_SEED,
  VITRINE_CIRANDA_WINNER_COUNT,
  VITRINE_COPY,
  VITRINE_ELIGIBILITY_EVENTS,
  VITRINE_FULFILLED_COUNTS,
} from "@/mocks/vitrine-mock";

export const Route = createFileRoute("/vitrine")({
  head: () => ({ meta: [{ title: "Vitrine do Bem-Comum · Comunidade — VitalOS™" }] }),
  component: VitrinePage,
});

const ACCESS_MODE_LABEL: Record<InstitutionalOffer["accessMode"], string> = {
  collective: "Meta coletiva",
  lottery: "Ciranda",
  rotation: "Rodízio",
  universal_unlock: "Desbloqueio universal",
};

function VitrinePage() {
  const { status, gamification, reload } = usePack();

  const vitrine = useMemo(
    () => (gamification ? getVitrineConfig(gamification) : null),
    [gamification],
  );

  if (status.state === "idle" || status.state === "loading") {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6" aria-busy="true">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-44 animate-pulse rounded-[2rem] bg-muted/70" />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-3xl bg-muted/60" />
            <div className="h-64 animate-pulse rounded-3xl bg-muted/60" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (status.state === "error" || !vitrine) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
              Vitrine indisponível
            </p>
            <h1 className="mt-3 font-serif text-2xl text-foreground">
              {status.state === "error"
                ? "A configuração deste pack não pôde ser carregada."
                : "Este pack ainda não declara uma Vitrine do Bem-Comum."}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma oferta foi presumida.</p>
            {status.state === "error" && (
              <button
                type="button"
                onClick={reload}
                className="mt-6 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  return <VitrineContent vitrine={vitrine} />;
}

function VitrineContent({ vitrine }: { vitrine: VitrineConfig }) {
  const eligiblePool = useMemo(
    () => computeEligiblePool(VITRINE_ELIGIBILITY_EVENTS),
    [],
  );
  const iAmEligible = eligiblePool.includes(MOCK_USER.id);

  const ciranda = useMemo(
    () =>
      runCiranda({
        eligibleUserIds: eligiblePool,
        winnerCount: VITRINE_CIRANDA_WINNER_COUNT,
        seed: VITRINE_CIRANDA_SEED,
      }),
    [eligiblePool],
  );
  const iWon = ciranda.winners.includes(MOCK_USER.id);

  const mirroredImpact = useMemo(
    () => summarizeMirroredImpact(vitrine.offers, VITRINE_FULFILLED_COUNTS),
    [vitrine.offers],
  );

  const categoryLabelById = useMemo(
    () => new Map(vitrine.categories.map((c) => [c.id, c.label])),
    [vitrine.categories],
  );

  const offersByCategory = useMemo(() => {
    const map = new Map<OfferCategory, InstitutionalOffer[]>();
    for (const offer of vitrine.offers) {
      const list = map.get(offer.category) ?? [];
      list.push(offer);
      map.set(offer.category, list);
    }
    return map;
  }, [vitrine.offers]);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[2rem] border border-primary/18 bg-gradient-to-br from-primary/14 via-card to-accent/10 p-6 shadow-sm sm:p-8"
        >
          <div
            className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {VITRINE_COPY.eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              {VITRINE_COPY.title}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {VITRINE_COPY.lead}
            </p>
            <p className="mt-4 max-w-2xl text-sm italic leading-relaxed text-primary/90">
              {VITRINE_COPY.contractLine}
            </p>
          </div>
        </motion.header>

        {/* Porta Aberta — SEMPRE acima do catálogo, sem condição alguma (F3.2, redline). */}
        <section
          aria-labelledby="porta-aberta-title"
          className="rounded-3xl border-2 border-emerald-400/40 bg-emerald-50/50 p-5 shadow-sm dark:bg-emerald-950/15 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <HeartHandshake className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Direito, não prêmio
              </p>
              <h2 id="porta-aberta-title" className="mt-1 font-serif text-xl text-foreground">
                {vitrine.portaAberta.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {vitrine.portaAberta.description}
              </p>
              <p className="mt-3 text-sm font-medium text-foreground">
                {vitrine.portaAberta.howToAccess}
              </p>
            </div>
          </div>
        </section>

        {/* Catálogo — nunca inclui Porta Aberta; agrupado por categoria do pack. */}
        <section aria-labelledby="catalogo-title" className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Catálogo do ciclo
            </p>
            <h2 id="catalogo-title" className="mt-1 font-serif text-xl text-foreground">
              Ofertas declaradas pela instituição
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[...offersByCategory.entries()].flatMap(([category, offers]) =>
              offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  categoryLabel={categoryLabelById.get(category) ?? category}
                />
              )),
            )}
          </div>
        </section>

        {/* Ciranda — sorteio determinístico auditável (F2.2). */}
        <section
          aria-labelledby="ciranda-title"
          className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Ciranda deste ciclo
              </p>
              <h2 id="ciranda-title" className="mt-1 font-serif text-xl text-foreground">
                Chance igual para quem participou
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatBlock icon={Users} label="Elegíveis neste ciclo" value={String(eligiblePool.length)} />
            <StatBlock
              icon={Ticket}
              label="Vagas sorteadas"
              value={String(VITRINE_CIRANDA_WINNER_COUNT)}
            />
            <div
              className={`rounded-2xl border p-4 ${
                !iAmEligible
                  ? "border-border/60 bg-background/45"
                  : iWon
                    ? "border-emerald-400/50 bg-emerald-50/50 dark:bg-emerald-950/15"
                    : "border-border/60 bg-background/45"
              }`}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Sua situação (privada)
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {!iAmEligible
                  ? "Você ainda não participou deste ciclo."
                  : iWon
                    ? "Você foi sorteado nesta Ciranda! 🎉"
                    : "Você está elegível — não foi sorteado desta vez."}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-background/35 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">{VITRINE_COPY.auditNote}</p>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              seed: <span className="text-foreground">{ciranda.seed}</span> · hash:{" "}
              <span className="text-foreground">{ciranda.resultHash}</span>
            </p>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {VITRINE_COPY.eligibilityNote}
          </p>
        </section>

        {/* Oferta Espelhada — todo resgate individual espelha uma contribuição coletiva. */}
        <section
          aria-labelledby="espelhada-title"
          className="rounded-3xl border border-accent/25 bg-accent/5 p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-primary">
              <Repeat className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Oferta Espelhada
              </p>
              <h2 id="espelhada-title" className="mt-1 font-serif text-xl text-foreground">
                O que já voltou para o coletivo
              </h2>
            </div>
          </div>
          <ul className="mt-4 space-y-3">
            {mirroredImpact.map((impact) => (
              <li
                key={impact.offerId}
                className="rounded-2xl border border-border/55 bg-background/45 p-4"
              >
                <p className="text-sm text-foreground">{impact.mirroredPledge}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {impact.timesFulfilled === 0
                    ? "Ainda não cumprida neste ciclo."
                    : `Cumprida ${impact.timesFulfilled}× neste ciclo.`}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-serif text-xl text-foreground">Isto não é uma loja</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Nunca há checkout, estoque ou pagamento. Nenhuma oferta individual existe sem
                uma contrapartida coletiva declarada. Vencedor público só com consentimento.
              </p>
              <Link
                to="/confianca"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
              >
                Ver quem pode acessar cada dado
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {VITRINE_COPY.demoNote}
        </p>
      </div>
    </AppShell>
  );
}

function OfferCard({ offer, categoryLabel }: { offer: InstitutionalOffer; categoryLabel: string }) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {categoryLabel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
          {offer.accessMode === "lottery" ? (
            <Ticket className="h-3 w-3" aria-hidden />
          ) : (
            <Sparkles className="h-3 w-3" aria-hidden />
          )}
          {ACCESS_MODE_LABEL[offer.accessMode]}
        </span>
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <Gift className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        {offer.title}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{offer.description}</p>
      <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-[11px] leading-relaxed text-foreground">
        <span className="font-medium">Espelha:</span> {offer.mirroredPledge}
      </p>
      {offer.capacity !== undefined && (
        <p className="mt-2 text-[11px] text-muted-foreground">{offer.capacity} vagas neste ciclo</p>
      )}
    </article>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
      <Icon className="h-4 w-4 text-primary" aria-hidden />
      <p className="mt-2 font-serif text-2xl font-semibold text-foreground tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
