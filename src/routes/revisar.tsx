// /revisar — modo focado de Revisão Espaçada (sessão efêmera, como /responder e
// /quiosque). Compõe o motor SM-2 + flashcard-session, materializando a dinâmica D2 da
// Academia. ADAPTATIVO: o IVO/IEV agregado prioriza os cartões dos pilares com maior
// necessidade coletiva (Medir → Educar). Rota fora do nav principal: alcançável por link
// contextual da Academia.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Layers, Target } from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { calculateIVO } from "@/engine/index/ivo-engine";
import {
  orderByDriverNeed,
  priorityDriverIds,
  rankDriversByNeed,
  type PillarSignal,
} from "@/engine/learning/driver-pillar-bridge";
import { FlashcardDeck } from "@/app/academia/FlashcardDeck";
import { getFlashcardSession } from "@/mocks/flashcard-mock";
import { getDriverPillarLinks } from "@/mocks/wwp-drivers-mock";
import { getSectorData } from "@/mocks/sector-data";

export const Route = createFileRoute("/revisar")({
  head: () => ({ meta: [{ title: "Revisão Espaçada — 4 Lentes VitalOS™" }] }),
  component: RevisarPage,
});

function RevisarPage() {
  const { t, index, packId } = usePack();
  const academyName = t("academy", "Academia do Florescimento");
  const indexLabel = t("index", packId === "school" ? "IEV" : "IVO");

  // Educar dirigido pelo Medir: ordena os cartões pelos pilares de menor leitura agregada.
  const { cards, priorityIds, topPillarName } = useMemo(() => {
    const base = getFlashcardSession();
    const links = getDriverPillarLinks(packId);
    if (!index || links.length === 0) {
      return { cards: base, priorityIds: new Set<string>(), topPillarName: null as string | null };
    }
    const ivo = calculateIVO(getSectorData(packId).currentCycle, index);
    const signals: PillarSignal[] = ivo.lenses
      .flatMap((lens) => lens.pillars)
      .map((p) => ({
        pillarId: p.pillarId,
        name: p.pillarName,
        score: p.score,
        visible: p.visible,
      }));
    const needs = rankDriversByNeed(links, signals);
    const top = needs.find((n) => n.priority && n.matchedPillars.length > 0);
    return {
      cards: orderByDriverNeed(base, needs),
      priorityIds: priorityDriverIds(needs),
      topPillarName: top?.matchedPillars[0]?.name ?? null,
    };
  }, [index, packId]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            to="/academia"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {academyName}
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Repetição espaçada · SM-2
            </p>
          </div>
          <h1 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl">
            Revise no momento certo de esquecer
          </h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Cartões curtos de ciência do florescimento. Você avalia a própria recordação e o sistema
            agenda quando cada um deve voltar — nem antes, nem tarde demais.
          </p>
        </motion.header>

        {priorityIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/[0.04] px-4 py-3"
            role="note"
          >
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Ordenado pelo seu {indexLabel}.</span>{" "}
              Começamos pelos temas dos pilares com maior necessidade coletiva
              {topPillarName ? ` — como ${topPillarName}` : ""}. É orientação de estudo a partir de
              dados agregados, nunca avaliação de pessoas.
            </p>
          </motion.div>
        )}

        {cards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
            <p className="font-serif text-xl text-foreground">Nada a revisar agora</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Você está em dia com este baralho. Os cartões reaparecem conforme o agendamento de
              cada um.
            </p>
          </div>
        ) : (
          <FlashcardDeck cards={cards} priorityDriverIds={priorityIds} />
        )}
      </div>
    </AppShell>
  );
}
