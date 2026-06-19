import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { usePersona } from "@/app/identity/persona-store";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { buildTrend, type Momentum } from "@/engine/trend/trend-engine";
import { rankPriorities } from "@/engine/priority/priority-engine";
import {
  buildDevolutiva,
  buildStrengthsDevolutiva,
  type DevolutivaLens,
  type Devolutiva,
  type DevolutivaBlock,
} from "@/engine/educar/devolutiva-engine";
import { getSectorData } from "@/mocks/sector-data";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";
import { getActiveWave } from "@/mocks/campaign-mock";
import { ORG_VIAT_RESULT } from "@/mocks/viat-mock";

export const Route = createFileRoute("/devolutiva")({
  head: () => ({ meta: [{ title: "Devolutiva da Onda · Educar — 4 Lentes VitalOS™" }] }),
  component: DevolutivaPage,
});

const INDIVIDUAL_ROLES = new Set(["COLABORADOR", "EMBAIXADOR", "ESTUDANTE", "FAMILIA"]);
const MOMENTUM_LABEL: Record<Momentum, string> = {
  acelerando: "acelerando",
  subindo: "subindo",
  estavel: "estável",
  caindo: "em queda",
};

interface LensFx {
  id: string;
  guidingQuestion?: string;
}

function DevolutivaPage() {
  const { index, packId, t } = usePack();
  const { roleId } = usePersona();
  const audience = INDIVIDUAL_ROLES.has(roleId) ? "individual" : "coletivo";

  const devolutiva = useMemo(() => {
    if (!index) return null;
    const activeWave = getActiveWave(packId);
    const sector = getSectorData(packId);
    const current = calculateIVO(sector.currentCycle, index);

    const points = sector.trendCycles.map((c) => {
      const r = calculateIVO(c, index);
      return {
        cycleId: r.cycleId,
        label: r.cycleId,
        ivo: r.ivoScore,
        lenses: r.lenses.map((l) => ({ id: l.lensId, name: l.lensName, score: l.score })),
      };
    });
    const trend = buildTrend(points);

    const lensFx = (index.lenses as LensFx[]) ?? [];
    const questionFor = (id: string) => lensFx.find((l) => l.id === id)?.guidingQuestion;
    const sorted = [...current.lenses].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const low = sorted[sorted.length - 1];
    const shortName = (n: string) => n.split(" — ")[0] ?? n;

    const highlightLens: DevolutivaLens | null = top
      ? { name: shortName(top.lensName), score: top.score }
      : null;
    const focusLens: DevolutivaLens | null = low
      ? { name: shortName(low.lensName), score: low.score, question: questionFor(low.lensId) }
      : null;

    const pillars = pillarsFromIvo(current);
    const topItem =
      rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" }).items[0] ?? null;
    const topMove =
      topItem && topItem.expectedIvoLift > 0
        ? { label: topItem.label, lift: topItem.expectedIvoLift }
        : null;

    return buildDevolutiva(
      {
        instrumentLabel: activeWave.instrumentLabel,
        instrumentShort: activeWave.instrumentShort,
        season: activeWave.season,
        indexLabel: t("index", "IVO"),
        indexScore: current.ivoScore,
        maturityName: current.maturityLevel.name,
        momentumLabel: MOMENTUM_LABEL[trend.momentum],
        highlightLens,
        focusLens,
        topMove,
        learningRoute: "/academia",
      },
      audience,
    );
  }, [index, packId, t, audience]);

  // Devolutiva de FORÇAS (VIA-T) — só na empresa (ORG_VIAT_RESULT é da empresa).
  const forcas = useMemo<Devolutiva | null>(() => {
    if (packId !== "enterprise") return null;
    const top10 = ORG_VIAT_RESULT.top10 as Array<{ name: string; avgScore: number }>;
    const visibleAsc = [
      ...(ORG_VIAT_RESULT.strengths as Array<{ name: string; avgScore: number; visible: boolean }>),
    ]
      .filter((s) => s.visible)
      .sort((a, b) => a.avgScore - b.avgScore);
    const emerging = visibleAsc[0] ?? null;
    return buildStrengthsDevolutiva(
      {
        instrumentLabel: "VIA-T v1 · Forças de caráter",
        season: "Forças em Cultura",
        signatureStrength: top10[0] ? { name: top10[0].name, score: top10[0].avgScore } : null,
        topStrengths: top10.slice(0, 3).map((s) => ({ name: s.name, score: s.avgScore })),
        emergingStrength: emerging ? { name: emerging.name, score: emerging.avgScore } : null,
        developmentRoute: "/academia",
      },
      audience,
    );
  }, [packId, audience]);

  if (!devolutiva) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="animate-pulse text-muted-foreground">Preparando a devolutiva…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Educar · Devolutiva da Onda
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">
            {devolutiva.headline}
          </h1>
        </motion.header>

        <BlockList blocks={devolutiva.blocks} />

        <HonestyNote text={devolutiva.honestyNote} />

        {/* Devolutiva de Forças (VIA-T) — Educar da Camada 3 */}
        {forcas && (
          <section className="space-y-3 border-t border-border/50 pt-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Educar · Devolutiva de Forças
              </p>
              <h2 className="mt-1 font-serif text-2xl text-foreground">{forcas.headline}</h2>
            </div>
            <BlockList blocks={forcas.blocks} />
            <HonestyNote text={forcas.honestyNote} />
          </section>
        )}

        <p className="text-center text-xs text-muted-foreground">
          A devolutiva fecha o eixo <span className="font-medium">Educar</span> e abre o{" "}
          <Link to="/onda" className="underline underline-offset-2 hover:text-foreground">
            ciclo da próxima onda
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}

function BlockList({ blocks }: { blocks: DevolutivaBlock[] }) {
  return (
    <ol className="space-y-3">
      {blocks.map((b, i) => (
        <motion.li
          key={b.kicker}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 + i * 0.05 }}
          className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
              {i + 1}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {b.kicker}
            </span>
          </div>
          <p className="mt-2 font-serif text-lg text-foreground">{b.title}</p>
          <p className="mt-1 text-base leading-relaxed text-muted-foreground">{b.body}</p>
          {b.cta && (
            <Link
              to={b.cta.route}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {b.cta.label} →
            </Link>
          )}
        </motion.li>
      ))}
    </ol>
  );
}

function HonestyNote({ text }: { text: string }) {
  return (
    <div
      className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20"
      role="note"
    >
      <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">{text}</p>
    </div>
  );
}
