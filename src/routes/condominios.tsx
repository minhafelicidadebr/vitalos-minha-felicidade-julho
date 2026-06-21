// Home setorial de Condomínio (ConvivIA) — espelha o cânone de /escola.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CircleHelp,
  ShieldCheck,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { hasAudienceCapability } from "@/engine/audience/audience-engine";
import { buildIndividualView } from "@/engine/campaign/campaign-engine";
import { calculateIVO, type LensResult } from "@/engine/index/ivo-engine";
import { usePack } from "@/engine/pack";
import { usePersona } from "@/app/identity/persona-store";
import { useWaveResponses } from "@/engine/survey/survey-store";
import { buildTrend, type TrendPoint } from "@/engine/trend/trend-engine";
import { getActiveWave, WAVE_STATE_STYLE } from "@/mocks/campaign-mock";
import { getSectorData } from "@/mocks/sector-data";
import {
  resolveCondominiumAudience,
  type CondominiumAudiencePolicy,
  type CondominiumHomeAction,
} from "@/mocks/condominium-home-mock";
import { CONDO_INTRO } from "@/mocks/condominium-mock";
import { MOMENTUM_COPY } from "@/mocks/trend-mock";

export const Route = createFileRoute("/condominios")({
  head: () => ({ meta: [{ title: "Vitalidade Comunitária — ConvivIA" }] }),
  component: CondominiosPage,
});

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

const ACTION_ICONS: Record<CondominiumHomeAction["id"], LucideIcon> = {
  wave: Waves,
  academy: BookOpen,
  ai: Bot,
  method: CircleHelp,
};

interface LensFramework {
  id: string;
  guidingQuestion?: string;
  color?: string;
}

function CondominiosPage() {
  const { roleId } = usePersona();
  const { status, reload } = usePack();
  const audience = resolveCondominiumAudience(roleId);
  const managementView = hasAudienceCapability(audience.policy, "collective_index");

  return (
    <AppShell>
      {status.state === "loading" || status.state === "idle" ? (
        <CondominiosLoading />
      ) : status.state === "error" ? (
        <CondominiosError onRetry={reload} />
      ) : managementView ? (
        <ManagementCondominiosHome />
      ) : (
        <ParticipantCondominiosHome
          profile={audience.policy}
          conservativeFallback={audience.reason !== "matched"}
        />
      )}
    </AppShell>
  );
}

function CondominiosLoading() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="Carregando espaço do condomínio"
    >
      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      <div className="h-40 animate-pulse rounded-[2rem] bg-muted/70" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-3xl bg-muted/60" />
        <div className="h-40 animate-pulse rounded-3xl bg-muted/60" />
      </div>
    </div>
  );
}

function CondominiosError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
          Espaço do condomínio indisponível
        </p>
        <h1 className="mt-3 font-serif text-2xl text-foreground">
          Não foi possível carregar as permissões deste setor.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Nenhum indicador foi presumido. Tente recarregar o pack para restaurar a experiência.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function ParticipantCondominiosHome({
  profile,
  conservativeFallback,
}: {
  profile: CondominiumAudiencePolicy;
  conservativeFallback: boolean;
}) {
  const { packId } = usePack();
  const waveInput = getActiveWave(packId);
  const responded = useWaveResponses((state) => state.hasResponded(waveInput.id));
  const waveView = useMemo(
    () => buildIndividualView(waveInput, responded ? "respondeu" : "pendente"),
    [responded, waveInput],
  );
  const waveStyle = WAVE_STATE_STYLE[waveView.state]!;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-gradient-to-br from-primary/12 via-card to-accent/10 p-6 shadow-sm sm:p-8"
      >
        <div
          className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {profile.eyebrow}
            </p>
            <span className="rounded-full border border-border/70 bg-card/75 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur">
              {profile.audienceLabel}
            </span>
          </div>
          <h1 className="mt-4 max-w-2xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
            {profile.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {profile.lead}
          </p>
        </div>
      </motion.header>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Onda em andamento
              </p>
              <h2 className="mt-2 font-serif text-2xl text-foreground">
                {waveView.instrumentLabel}
              </h2>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${waveStyle.cls}`}>
              {waveStyle.label}
            </span>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-muted/35 p-4">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                responded
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-primary/10 text-primary"
              }`}
              aria-hidden
            >
              {responded ? "✓" : "✎"}
            </span>
            <div>
              <p className="text-sm font-semibold text-card-foreground">
                {responded ? "Sua participação foi registrada" : "Sua voz está aberta"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{waveView.cta}</p>
            </div>
          </div>

          <Link
            to={waveView.canRespond ? "/responder" : "/onda"}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            {waveView.canRespond ? "Responder agora" : "Ver a onda"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <aside className="rounded-3xl border border-accent/25 bg-accent/8 p-5 sm:p-6">
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl bg-card text-primary shadow-sm"
            aria-hidden
          >
            <ShieldCheck className="h-5 w-5" />
          </span>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Confiança por desenho
          </p>
          <h2 className="mt-2 font-serif text-xl text-foreground">{profile.privacyTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {profile.privacyNote}
          </p>
          {conservativeFallback && (
            <p className="mt-3 rounded-xl border border-border/60 bg-card/65 px-3 py-2 text-xs text-muted-foreground">
              A configuração deste papel não foi encontrada de forma inequívoca. O acesso mínimo foi
              aplicado automaticamente.
            </p>
          )}
        </aside>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Próximos passos
          </p>
          <h2 className="mt-1 font-serif text-2xl text-foreground">
            Uma jornada adequada ao seu papel
          </h2>
        </div>

        {profile.actions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-card/40 p-8 text-center">
            <p className="font-serif text-xl text-foreground">Nenhuma ação publicada agora</p>
            <p className="mt-2 text-sm text-muted-foreground">
              O VitalOS™ não reaproveita permissões de outro papel apenas para preencher a tela.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.actions.map((action, index) => (
              <CondominiosActionCard key={action.id} action={action} delay={0.05 * index} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Compromissos de confiança">
        <TrustPromise title="Participação voluntária" text="Sem penalidade por não responder." />
        <TrustPromise title="Agregação protegida" text="Publicação coletiva somente com n≥5." />
        <TrustPromise
          title="Fora de cobranças"
          text="Nunca alimenta processo, advertência ou ação contra a sua unidade."
        />
      </section>
    </div>
  );
}

function CondominiosActionCard({
  action,
  delay,
}: {
  action: CondominiumHomeAction;
  delay: number;
}) {
  const Icon = ACTION_ICONS[action.id];

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="group rounded-3xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
            {action.eyebrow}
          </p>
          <h3 className="mt-1 font-serif text-xl text-foreground">{action.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{action.description}</p>
          <Link
            to={action.to}
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
          >
            Abrir
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function TrustPromise({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/25 px-4 py-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function ManagementCondominiosHome() {
  const { index, packId, t } = usePack();

  const data = useMemo(() => {
    if (!index) return null;
    const sector = getSectorData(packId);
    const current = calculateIVO(sector.currentCycle, index);
    const previous = calculateIVO(sector.previousCycle, index);

    const points: TrendPoint[] = sector.trendCycles.map((cycle) => {
      const result = calculateIVO(cycle, index);
      return {
        cycleId: result.cycleId,
        label: result.cycleId,
        ivo: result.ivoScore,
        lenses: result.lenses.map((lens) => ({
          id: lens.lensId,
          name: lens.lensName,
          score: lens.score,
        })),
      };
    });
    const trend = buildTrend(points);

    const lensFramework = (index.lenses as LensFramework[]) ?? [];
    const questionFor = (id: string) =>
      lensFramework.find((lens) => lens.id === id)?.guidingQuestion ?? "";
    const focus = [...current.lenses].sort((a, b) => a.score - b.score)[0] ?? null;

    return { current, previous, trend, org: sector.org, questionFor, focus };
  }, [index, packId]);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
        <div className="rounded-3xl border border-dashed border-border/70 bg-card/40 p-8">
          <p className="font-serif text-2xl text-foreground">IVC ainda não publicado</p>
          <p className="mt-2 text-sm text-muted-foreground">
            A gestão verá a leitura coletiva quando o framework e os agregados protegidos estiverem
            disponíveis.
          </p>
        </div>
      </div>
    );
  }

  const { current, previous, trend, org, questionFor, focus } = data;
  const delta = current.ivoScore - previous.ivoScore;
  const momentum = MOMENTUM_COPY[trend.momentum]!;
  const indexLabel = t("index", "IVC");

  return (
    <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {CONDO_INTRO.eyebrow}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">
          {CONDO_INTRO.title}
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {CONDO_INTRO.lead}
        </p>
      </motion.header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:col-span-1">
          <p className="text-xs text-muted-foreground">
            {indexLabel} · {org.name}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-serif text-5xl font-semibold text-foreground">
              {current.ivoScore}
            </span>
            <span
              className={`text-sm font-medium ${
                delta >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {signed(delta)}
            </span>
          </div>
          <p className="text-sm font-medium text-primary">{current.maturityLevel.name}</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-xs text-muted-foreground">Participação</p>
          <p className="mt-1 font-serif text-3xl text-foreground">{org.participationRate}%</p>
          <p className="text-xs text-muted-foreground">da comunidade condominial</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-xs text-muted-foreground">Momentum</p>
          <p className={`mt-1 font-serif text-2xl ${momentum.color}`}>
            <span aria-hidden>{momentum.icon}</span> {momentum.label}
          </p>
          <p className="text-xs text-muted-foreground">{signed(trend.slopePerCycle)} pts/ciclo</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl text-foreground">As quatro lentes do condomínio</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {current.lenses.map((lens) => (
            <LensCard
              key={lens.lensId}
              lens={lens}
              prev={
                previous.lenses.find((previousLens) => previousLens.lensId === lens.lensId)
                  ?.score ?? lens.score
              }
              question={questionFor(lens.lensId)}
            />
          ))}
        </div>
      </section>

      {focus && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-primary">
            {CONDO_INTRO.focusLabel}
          </p>
          <h3 className="mt-1 font-serif text-xl text-foreground">
            {focus.lensName.split(" — ")[0]}
          </h3>
          <p className="mt-1 text-base leading-relaxed text-card-foreground">
            “{questionFor(focus.lensId)}”
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{CONDO_INTRO.focusNote}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/ivo"
              className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Abrir o {indexLabel} completo
            </Link>
            <Link
              to="/evolucao"
              className="rounded-xl border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              Ver a evolução
            </Link>
          </div>
        </section>
      )}

      <div
        className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
        role="note"
      >
        <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
          {current.disclaimer}
        </p>
      </div>
    </div>
  );
}

function LensCard({ lens, prev, question }: { lens: LensResult; prev: number; question: string }) {
  const diff = lens.score - prev;
  const pct = Math.round((lens.score / 1000) * 100);

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {lens.lensName.split(" — ")[0]}
          </p>
          {question && (
            <p className="mt-1 text-sm leading-snug text-card-foreground">“{question}”</p>
          )}
        </div>
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ background: lens.color }}
          aria-hidden
        />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-serif text-2xl font-semibold text-card-foreground">{lens.score}</span>
        <span
          className={`text-xs font-medium ${
            diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {signed(diff)} vs anterior
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: lens.color }} />
      </div>
    </article>
  );
}
