// /diploma — Diploma Vivo (I2, Academia Viva 2.0). DEMO v1: elegibilidade computada
// de sinais fixos; o motor é o mesmo que servirá os dados reais (S6.5).
// O PDF premium só é gerável para o caso ELEGÍVEL — buildDiploma recusa o resto
// por construção. Consentimento de nome é confirmado por checkbox antes de emitir.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Download,
  ShieldCheck,
  Sprout,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import { getCredentialsConfig } from "@/engine/gamification/gamification-engine";
import {
  assessDiplomaEligibility,
  buildDiploma,
  type DiplomaCriterionResult,
} from "@/engine/academia/diploma-engine";
import { appliedPracticeCountByDriver } from "@/engine/learning/practice-journal-engine";
import { usePracticeJournal } from "@/engine/learning/practice-journal-store";
import { usePracticeJournalSync } from "@/app/identity/usePracticeJournalSync";
import { useParticipationSync } from "@/app/identity/useParticipationSync";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { useParticipationLedger } from "@/engine/gamification/participation-store";
import { hasParticipationEvidence } from "@/engine/gamification/participation-ledger";
import type { StoredCardState } from "@/lib/cloud/learning-adapter";
import { downloadDiplomaPdf } from "@/lib/pdf/diploma-pdf";
import { MOCK_USER } from "@/mocks/colaborador-mock";
import { DIPLOMA_AWARDED_ON, DIPLOMA_COPY, DIPLOMA_MOCK_CASES } from "@/mocks/diploma-mock";
import { PRACTICE_JOURNAL_SEED } from "@/mocks/practice-journal-mock";
import { LEARNING_PATHS } from "@/mocks/academia-mock";
import { FLASHCARDS } from "@/mocks/flashcard-mock";

export const Route = createFileRoute("/diploma")({
  head: () => ({ meta: [{ title: "Diploma Vivo · Academia — VitalOS™" }] }),
  component: DiplomaPage,
});

const CRITERION_ICON: Record<DiplomaCriterionResult["id"], typeof Brain> = {
  trilha: BookOpenCheck,
  retencao: Brain,
  pratica: Sprout,
};

// Correspondência SOURCED (nunca inventada): cardId → driverId vem do próprio
// catálogo de flashcards (Flashcard.driverId); pathTitle → pathId casa o texto
// já idêntico entre diploma-mock.ts e academia-mock.ts (mesma trilha, dois
// arquivos — não uma nova relação).
const CARD_DRIVER_BY_ID = new Map(FLASHCARDS.map((f) => [f.id, f.driverId]));
const PATH_ID_BY_TITLE = new Map(LEARNING_PATHS.map((p) => [p.title, p.id]));

function DiplomaPage() {
  const { status, gamification, reload } = usePack();
  const credentials = useMemo(
    () => (gamification ? getCredentialsConfig(gamification) : null),
    [gamification],
  );
  const [nameConsent, setNameConsent] = useState(false);
  const sessionEntries = usePracticeJournal((state) => state.entries);

  // Sessão real (fecha a composição I7→I2 de verdade): Diário real hidrata,
  // trilha real vem do ledger de participação (S5), retenção real vem do
  // sm2_card_state (S5) — as MESMAS infraestruturas reais já existentes,
  // nenhuma migration nova.
  const { isRealSession } = usePracticeJournalSync();
  useParticipationSync();
  const { org } = useRealOrgSession();
  const participationEvents = useParticipationLedger((state) => state.events);
  const authorId = isRealSession && org ? org.userId : MOCK_USER.id;

  const [realCardStates, setRealCardStates] = useState<StoredCardState[]>([]);
  useEffect(() => {
    if (!isRealSession || !org) return;
    let active = true;
    import("@/lib/cloud/learning-adapter").then(({ loadCardStates }) => {
      loadCardStates(org.userId).then((states) => active && setRealCardStates(states));
    });
    return () => {
      active = false;
    };
  }, [isRealSession, org]);

  // Composição I7 → I2: a terceira prova (prática aplicada) vem do Diário de
  // Prática Viva — base demonstrativa + registros criados nesta sessão; em
  // sessão real, só os registros REAIS da própria pessoa.
  const cases = useMemo(() => {
    const practiceCounts = appliedPracticeCountByDriver(
      isRealSession ? sessionEntries : [...PRACTICE_JOURNAL_SEED, ...sessionEntries],
      authorId,
    );

    if (!isRealSession) {
      return DIPLOMA_MOCK_CASES.map((c) => ({
        ...c,
        eligibility: assessDiplomaEligibility({
          ...c.signals,
          appliedPracticeCount: practiceCounts[c.driverId] ?? 0,
        }),
      }));
    }

    // Retenção real: intervalos dos cartões do PRÓPRIO driver, via o mesmo
    // catálogo de flashcards (cardId → driverId), nunca uma correspondência nova.
    const intervalsByDriver = new Map<string, number[]>();
    for (const state of realCardStates) {
      const driverId = CARD_DRIVER_BY_ID.get(state.cardId);
      if (!driverId) continue;
      const list = intervalsByDriver.get(driverId) ?? [];
      list.push(state.schedule.intervalDays);
      intervalsByDriver.set(driverId, list);
    }

    return DIPLOMA_MOCK_CASES.map((c) => {
      const pathId = PATH_ID_BY_TITLE.get(c.pathTitle);
      const pathCompleted = pathId
        ? hasParticipationEvidence(participationEvents, "learning_path", pathId)
        : false;
      return {
        ...c,
        eligibility: assessDiplomaEligibility({
          pathCompleted,
          cardIntervalsDays: intervalsByDriver.get(c.driverId) ?? [],
          appliedPracticeCount: practiceCounts[c.driverId] ?? 0,
        }),
      };
    });
  }, [isRealSession, sessionEntries, authorId, realCardStates, participationEvents]);

  if (status.state === "idle" || status.state === "loading") {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6" aria-busy="true">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-44 animate-pulse rounded-[2rem] bg-muted/70" />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-3xl bg-muted/60" />
            <div className="h-72 animate-pulse rounded-3xl bg-muted/60" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (status.state === "error" || !credentials) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
              Diploma indisponível
            </p>
            <h1 className="mt-3 font-serif text-2xl text-foreground">
              {status.state === "error"
                ? "A configuração deste pack não pôde ser carregada."
                : "Este pack ainda não declara credenciais."}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma emissão foi presumida.</p>
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

  const recipientDisplayName =
    isRealSession && org ? (org.displayName ?? org.orgName) : MOCK_USER.name;

  function emitDiploma(caseIndex: number) {
    const demoCase = cases[caseIndex];
    if (!credentials) return;
    const result = buildDiploma({
      eligibility: demoCase.eligibility,
      recipientName: nameConsent ? recipientDisplayName : "",
      credentialTitle: credentials.credentialTitle,
      issuerName: credentials.issuerName,
      driverLabel: demoCase.driverLabel,
      pathTitle: demoCase.pathTitle,
      awardedOn: isRealSession ? new Date().toISOString().slice(0, 10) : DIPLOMA_AWARDED_ON,
    });
    if (!result.ok) return;
    downloadDiplomaPdf(
      result.award,
      result.verificationCode,
      credentials.disclaimer,
      `diploma-vivo-${demoCase.driverId}.pdf`,
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[2rem] border border-accent/25 bg-gradient-to-br from-primary/12 via-card to-accent/10 p-6 shadow-sm sm:p-8"
        >
          <div
            className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {DIPLOMA_COPY.eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              {DIPLOMA_COPY.title}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {DIPLOMA_COPY.lead}
            </p>
          </div>
        </motion.header>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <input
            type="checkbox"
            checked={nameConsent}
            onChange={(event) => setNameConsent(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            Autorizo que meu nome ({recipientDisplayName}) apareça no documento emitido.{" "}
            {DIPLOMA_COPY.consentNote}
          </span>
        </label>

        <section className="grid gap-5 lg:grid-cols-2">
          {cases.map((demoCase, index) => (
            <article
              key={demoCase.driverId}
              className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
                demoCase.eligibility.granted
                  ? "border-accent/40 bg-card"
                  : "border-border/70 bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {demoCase.pathTitle}
                  </p>
                  <h2 className="mt-1 font-serif text-xl text-foreground">{demoCase.driverLabel}</h2>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
                    demoCase.eligibility.granted
                      ? "bg-accent/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Award className="h-3.5 w-3.5" aria-hidden />
                  {demoCase.eligibility.granted ? "Elegível" : "Em jornada"}
                </span>
              </div>

              <ul className="mt-5 space-y-3">
                {demoCase.eligibility.criteria.map((criterion) => {
                  const Icon = CRITERION_ICON[criterion.id];
                  const met = criterion.status === "cumprido";
                  return (
                    <li
                      key={criterion.id}
                      className="flex items-start gap-3 rounded-2xl border border-border/55 bg-background/45 p-3"
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                          met ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                        aria-hidden
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          {criterion.label}
                          {met ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                          ) : (
                            <XCircle
                              className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {criterion.value} · alvo: {criterion.target}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {demoCase.eligibility.granted ? (
                <button
                  type="button"
                  onClick={() => emitDiploma(index)}
                  disabled={!nameConsent}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  {nameConsent ? "Emitir Diploma Vivo (PDF)" : "Confirme o consentimento acima"}
                </button>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-border/60 bg-background/35 p-4">
                  <p className="text-xs font-medium text-foreground">O que falta:</p>
                  <ul className="mt-1 space-y-1">
                    {demoCase.eligibility.gaps.map((gap) => (
                      <li key={gap} className="text-[11px] leading-relaxed text-muted-foreground">
                        {gap}
                      </li>
                    ))}
                  </ul>
                  {demoCase.eligibility.criteria.some(
                    (c) => c.id === "pratica" && c.status !== "cumprido",
                  ) && (
                    <Link
                      to="/diario"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      Registrar uma prática no Diário →
                    </Link>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-serif text-xl text-foreground">O que este documento não é</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {credentials.disclaimer} O código de verificação impresso deriva do conteúdo da
                credencial: qualquer alteração produz um código diferente.
              </p>
              <Link
                to="/academia"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
              >
                Ir para as trilhas da Academia
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {DIPLOMA_COPY.scienceNote}{" "}
          {isRealSession
            ? "Elegibilidade calculada com seus dados reais: prática do seu Diário, retenção dos seus cartões e trilhas concluídas."
            : DIPLOMA_COPY.demoNote}
        </p>
      </div>
    </AppShell>
  );
}
