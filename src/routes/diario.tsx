// /diario — Diário de Prática Viva (I7, Academia Viva 2.0). DEMO v1: registros
// da sessão vivem no browser (idioma seed-wallet: base mock + delta de sessão).
// Privado por default; consentimento POR REGISTRO; o agregado coletivo só conta
// registros consentidos e só aparece com k≥5 praticantes — tudo do engine puro.
// Composição I7 → I2: cada registro alimenta a terceira prova do Diploma Vivo.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  LockKeyhole,
  NotebookPen,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { usePack } from "@/engine/pack";
import type { GamificationEconomy } from "@/engine/pack/pack-types";
import {
  getPracticeJournalConfig,
  getPracticePairsConfig,
} from "@/engine/gamification/gamification-engine";
import {
  confirmPartnerEvidence,
  formPair,
  suggestPairs,
  type ConfirmReason,
} from "@/engine/learning/practice-pair-engine";
import { usePracticePairs } from "@/engine/learning/practice-pair-store";
import {
  MARINA_PAIR_PROFILE,
  PAIR_CANDIDATES,
  PAIR_STRENGTH_LABELS,
  PARTNER_PRACTICE_REF,
  PRACTICE_PAIR_COPY,
} from "@/mocks/practice-pair-mock";
import {
  recordPractice,
  buildPracticeAggregates,
  appliedPracticeCountByDriver,
  type PracticeEvidenceKind,
  type PracticeRecordReason,
} from "@/engine/learning/practice-journal-engine";
import { usePracticeJournal } from "@/engine/learning/practice-journal-store";
import { usePracticeJournalSync } from "@/app/identity/usePracticeJournalSync";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { MOCK_USER } from "@/mocks/colaborador-mock";
import { GAMIFICATION_TODAY } from "@/mocks/gamification-mock";
import {
  PRACTICE_DRIVER_LABELS,
  PRACTICE_JOURNAL_COPY,
  PRACTICE_JOURNAL_SEED,
} from "@/mocks/practice-journal-mock";

export const Route = createFileRoute("/diario")({
  head: () => ({ meta: [{ title: "Diário de Prática · Academia — VitalOS™" }] }),
  component: DiarioPage,
});

const RESULT_COPY: Record<Exclude<PracticeRecordReason, "recorded">, string> = {
  duplicate: "Este registro já existe.",
  invalid_request: "Escolha um driver, um tipo e escreva um resumo antes de registrar.",
  kind_not_enabled: "Este tipo de evidência não está habilitado neste pack.",
  summary_too_long: "O resumo passou do limite — o diário guarda práticas, não relatórios.",
};

function DiarioPage() {
  const { status, gamification, reload } = usePack();
  const journal = useMemo(
    () => (gamification ? getPracticeJournalConfig(gamification) : null),
    [gamification],
  );

  // Sessão real (I7 real): hidrata o store com os registros persistidos da
  // pessoa e liga a sincronização fire-and-forget. Demo: 100% efêmero.
  const { isRealSession } = usePracticeJournalSync();
  const { org } = useRealOrgSession();

  const sessionEntries = usePracticeJournal((state) => state.entries);
  const append = usePracticeJournal((state) => state.append);

  const [driverId, setDriverId] = useState("");
  const [kind, setKind] = useState<PracticeEvidenceKind | "">("");
  const [summary, setSummary] = useState("");
  const [shareConsent, setShareConsent] = useState(false);
  const [result, setResult] = useState<PracticeRecordReason | null>(null);

  // Sessão real: só os registros REAIS da pessoa (nunca compor o mock da
  // demo — mesma disciplina do branch real do /rh). Demo: base mock + delta.
  const authorId = isRealSession && org ? org.userId : MOCK_USER.id;
  const allEntries = useMemo(
    () => (isRealSession ? sessionEntries : [...PRACTICE_JOURNAL_SEED, ...sessionEntries]),
    [isRealSession, sessionEntries],
  );
  const myEntries = useMemo(
    () => allEntries.filter((e) => e.authorId === authorId),
    [allEntries, authorId],
  );
  const myCounts = useMemo(
    () => appliedPracticeCountByDriver(allEntries, authorId),
    [allEntries, authorId],
  );
  const aggregates = useMemo(
    () => (journal ? buildPracticeAggregates(allEntries, journal.policy) : []),
    [allEntries, journal],
  );

  if (status.state === "idle" || status.state === "loading") {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6" aria-busy="true">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-44 animate-pulse rounded-[2rem] bg-muted/70" />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-80 animate-pulse rounded-3xl bg-muted/60" />
            <div className="h-80 animate-pulse rounded-3xl bg-muted/60" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (status.state === "error" || !journal) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
              Diário indisponível
            </p>
            <h1 className="mt-3 font-serif text-2xl text-foreground">
              {status.state === "error"
                ? "A configuração deste pack não pôde ser carregada."
                : "Este pack ainda não declara o Diário de Prática."}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">Nenhum registro foi presumido.</p>
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

  const charsRemaining = journal.policy.summaryMaxChars - summary.length;

  function register() {
    if (!journal || !driverId || !kind) return;
    const response = recordPractice(
      allEntries,
      {
        id: `pj-session-${authorId}-${sessionEntries.length + 1}-${driverId}`,
        authorId,
        driverId,
        kind,
        summary,
        shareConsent,
        // Real: a data de HOJE de verdade (o registro persiste na conta).
        // Demo: a constante determinística de sempre.
        occurredOn: isRealSession
          ? new Date().toISOString().slice(0, 10)
          : GAMIFICATION_TODAY,
      },
      journal.policy,
    );
    setResult(response.reason);
    if (response.reason === "recorded" && response.entry) {
      append(response.entry);
      setDriverId("");
      setKind("");
      setSummary("");
      setShareConsent(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[2rem] border border-primary/18 bg-gradient-to-br from-primary/12 via-card to-accent/8 p-6 shadow-sm sm:p-8"
        >
          <div
            className="absolute -left-16 -bottom-20 h-56 w-56 rounded-full bg-primary/8 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {PRACTICE_JOURNAL_COPY.eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              {PRACTICE_JOURNAL_COPY.title}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {PRACTICE_JOURNAL_COPY.lead}
            </p>
          </div>
        </motion.header>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"
                aria-hidden
              >
                <NotebookPen className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Registrar prática
                </p>
                <h2 className="mt-1 font-serif text-xl text-foreground">
                  O que você aplicou de verdade?
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Driver praticado">
                <select
                  value={driverId}
                  onChange={(event) => {
                    setDriverId(event.target.value);
                    setResult(null);
                  }}
                  className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Selecione um driver…</option>
                  {Object.entries(PRACTICE_DRIVER_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <fieldset>
                <legend className="text-xs font-medium text-foreground">Tipo de evidência</legend>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de evidência">
                  {journal.policy.enabledKinds.map((enabledKind) => (
                    <button
                      key={enabledKind}
                      type="button"
                      role="radio"
                      aria-checked={kind === enabledKind}
                      onClick={() => {
                        setKind(enabledKind);
                        setResult(null);
                      }}
                      className={`min-h-11 rounded-xl border px-4 py-2 text-sm transition-colors ${
                        kind === enabledKind
                          ? "border-primary bg-primary/8 text-foreground"
                          : "border-border/60 text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      {journal.kindLabels[enabledKind]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <Field label="Resumo da prática">
                <textarea
                  value={summary}
                  onChange={(event) =>
                    setSummary(event.target.value.slice(0, journal.policy.summaryMaxChars))
                  }
                  rows={3}
                  placeholder="O que você fez, com quem, e o que mudou?"
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground"
                />
                <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span>Privado por default — este texto é seu.</span>
                  <span className="tabular-nums">{charsRemaining}</span>
                </div>
              </Field>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <input
                  type="checkbox"
                  checked={shareConsent}
                  onChange={(event) => setShareConsent(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Consinto que ESTE registro entre na contagem coletiva (só o número — o texto
                  nunca sai daqui). Sem marcar, ele continua contando só para o seu Diploma.
                </span>
              </label>

              {result && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    result === "recorded"
                      ? "border border-emerald-300/60 bg-emerald-50/60 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                      : "border border-amber-300/60 bg-amber-50/60 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300"
                  }`}
                  role="status"
                >
                  {result === "recorded"
                    ? `Prática registrada. ${PRACTICE_JOURNAL_COPY.demoNote}`
                    : RESULT_COPY[result]}
                </div>
              )}

              <button
                type="button"
                onClick={register}
                disabled={!driverId || !kind || !summary.trim()}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <BookOpenCheck className="h-4 w-4" aria-hidden />
                Registrar prática
              </button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="font-serif text-xl text-foreground">Suas práticas por driver</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {PRACTICE_JOURNAL_COPY.diplomaNote}
              </p>
              <ul className="mt-4 space-y-2">
                {Object.entries(myCounts).map(([driver, count]) => (
                  <li
                    key={driver}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/55 bg-background/45 px-4 py-3"
                  >
                    <span className="text-sm text-foreground">
                      {PRACTICE_DRIVER_LABELS[driver] ?? driver}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
                      {count} {count === 1 ? "registro" : "registros"}
                    </span>
                  </li>
                ))}
                {Object.keys(myCounts).length === 0 && (
                  <li className="rounded-2xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
                    Nenhuma prática registrada ainda.
                  </li>
                )}
              </ul>
              <Link
                to="/diploma"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
              >
                Ver meu Diploma Vivo
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="font-serif text-xl text-foreground">
                  Prática no coletivo · k≥{journal.policy.kAnonymityMin}
                </h2>
              </div>
              <div className="mt-4 space-y-3">
                {aggregates.map((aggregate) => (
                  <div
                    key={aggregate.driverId}
                    className="rounded-2xl border border-border/55 bg-background/45 p-4"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {PRACTICE_DRIVER_LABELS[aggregate.driverId] ?? aggregate.driverId}
                    </p>
                    {aggregate.visible ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-serif text-xl font-semibold text-primary tabular-nums">
                          {aggregate.sharedCount}
                        </span>{" "}
                        práticas compartilhadas · {aggregate.uniquePractitioners} praticantes
                      </p>
                    ) : (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        🔒 Menos de {journal.policy.kAnonymityMin} praticantes consentiram;
                        contagem protegida.
                      </p>
                    )}
                  </div>
                ))}
                {aggregates.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
                    Nenhum registro consentido ainda.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
              <LockKeyhole className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="mt-3 font-serif text-xl text-foreground">Privado por construção</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {PRACTICE_JOURNAL_COPY.privacyNote}
              </p>
            </div>
          </aside>
        </section>

        {myEntries.length > 0 && (
          <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Seu diário
            </p>
            <h2 className="mt-1 font-serif text-xl text-foreground">Registros desta pessoa</h2>
            <ol className="mt-5 space-y-2">
              {[...myEntries].reverse().map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-border/55 bg-background/45 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {PRACTICE_DRIVER_LABELS[entry.driverId] ?? entry.driverId}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                        {journal.kindLabels[entry.kind]}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                        {entry.shareConsent ? "Conta no coletivo" : "Privado"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {entry.summary}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{entry.occurredOn}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Duplas de Prática ainda são demo (pessoas mock) — nunca exibidas
            numa sessão real como se fossem colegas de verdade. */}
        {gamification && !isRealSession && <PairSection economy={gamification} />}

        <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-serif text-xl text-foreground">Prática não é vigilância</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                O diário jamais alimenta desempenho, promoção ou remuneração. O conteúdo dos
                registros nunca entra em métricas — só contagens consentidas, sempre com
                proteção k-anônima.
              </p>
            </div>
          </div>
        </section>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {PRACTICE_JOURNAL_COPY.scienceNote}{" "}
          {isRealSession
            ? "Seus registros ficam salvos na sua conta — só você lê o conteúdo, e você pode apagá-los quando quiser."
            : PRACTICE_JOURNAL_COPY.demoNote}
        </p>
      </div>
    </AppShell>
  );
}

const CONFIRM_COPY: Record<Exclude<ConfirmReason, "confirmed">, string> = {
  invalid_request: "Confirmação inválida — atualize a página e tente de novo.",
  not_pair_member: "Só membros da dupla confirmam evidência um do outro.",
  self_confirmation: "Você não confirma a própria evidência — só a do seu par.",
  duplicate: "Esta confirmação já foi registrada.",
  entry_already_confirmed: "Esta prática já foi confirmada.",
  weekly_limit_reached: "A dupla já usou a confirmação desta semana — volta a abrir na próxima.",
};

/** Duplas de Prática (I6) — só aparece quando o pack declara `practicePairs`. */
function PairSection({ economy }: { economy: GamificationEconomy }) {
  const config = useMemo(() => getPracticePairsConfig(economy), [economy]);
  const pairs = usePracticePairs((state) => state.pairs);
  const confirmations = usePracticePairs((state) => state.confirmations);
  const appendPair = usePracticePairs((state) => state.appendPair);
  const appendConfirmation = usePracticePairs((state) => state.appendConfirmation);
  const [confirmResult, setConfirmResult] = useState<ConfirmReason | null>(null);

  const suggestions = useMemo(() => suggestPairs(MARINA_PAIR_PROFILE, PAIR_CANDIDATES), []);
  const myPair = pairs.find((p) => p.memberIds.includes(MARINA_PAIR_PROFILE.personId)) ?? null;

  if (!config) return null;

  function accept(candidateId: string) {
    const candidate = PAIR_CANDIDATES.find((c) => c.personId === candidateId);
    if (!candidate) return;
    // O candidato já optou por participar (mock opt-in); o clique é o aceite da Marina —
    // com os dois aceites explícitos, o engine forma a dupla (bilateral por construção).
    const result = formPair(pairs, {
      id: `pair-session-${candidate.personId}`,
      a: MARINA_PAIR_PROFILE,
      b: candidate,
      aAccepted: true,
      bAccepted: true,
      formedOn: GAMIFICATION_TODAY,
    });
    if (result.reason === "formed" && result.pair) appendPair(result.pair);
  }

  function confirmPartner() {
    if (!myPair || !config) return;
    const result = confirmPartnerEvidence(
      confirmations,
      {
        id: `conf-session-${confirmations.length + 1}`,
        pairId: myPair.id,
        confirmerId: MARINA_PAIR_PROFILE.personId,
        partnerId: PARTNER_PRACTICE_REF.ownerId,
        entryId: PARTNER_PRACTICE_REF.entryId,
        occurredOn: GAMIFICATION_TODAY,
      },
      myPair,
      config.policy,
    );
    setConfirmResult(result.reason);
    if (result.reason === "confirmed" && result.confirmation) {
      appendConfirmation(result.confirmation);
    }
  }

  const partnerName =
    PAIR_CANDIDATES.find((c) => myPair?.memberIds.includes(c.personId))?.displayName ?? null;

  return (
    <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"
          aria-hidden
        >
          <Users className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {config.label}
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground">{PRACTICE_PAIR_COPY.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {PRACTICE_PAIR_COPY.lead}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/55 bg-background/45 px-4 py-3">
        <p className="text-xs font-medium text-foreground">Forças que você escolheu compartilhar</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MARINA_PAIR_PROFILE.sharedStrengthIds.map((id) => (
            <span key={id} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] text-primary">
              {PAIR_STRENGTH_LABELS[id] ?? id}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {PRACTICE_PAIR_COPY.consentNote}
        </p>
      </div>

      {!myPair ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Sugestões (mesmo driver em foco + forças complementares)
          </p>
          {suggestions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum colega opt-in com forças complementares no seu driver em foco por enquanto.
            </p>
          )}
          {suggestions.map((s) => (
            <div
              key={s.candidate.personId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/55 bg-background/45 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{s.candidate.displayName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Complementa você com:{" "}
                  {s.complementaryStrengthIds
                    .map((id) => PAIR_STRENGTH_LABELS[id] ?? id)
                    .join(", ")}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Já sinalizou aceite — a dupla só se forma com o seu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => accept(s.candidate.personId)}
                className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Aceitar formar dupla
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              Dupla ativa: você e {partnerName ?? "seu par"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Formada em {myPair.formedOn} · driver em foco:{" "}
              {PRACTICE_DRIVER_LABELS[myPair.focusDriverId] ?? myPair.focusDriverId}
            </p>
          </div>

          <div className="rounded-2xl border border-border/55 bg-background/45 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Evidência do seu par esta semana
            </p>
            <p className="mt-2 text-sm text-foreground">
              {partnerName ?? "Seu par"} registrou uma prática em{" "}
              {PRACTICE_DRIVER_LABELS[PARTNER_PRACTICE_REF.driverId] ?? PARTNER_PRACTICE_REF.driverId}{" "}
              ({PARTNER_PRACTICE_REF.kindLabel}, {PARTNER_PRACTICE_REF.occurredOn}).
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Você confirma que a prática aconteceu — o conteúdo do registro é dele e nunca é
              exibido aqui.
            </p>
            <button
              type="button"
              onClick={confirmPartner}
              className="mt-3 min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Confirmar prática do par
            </button>
            {confirmResult === "confirmed" && (
              <p className="mt-2 text-xs font-medium text-primary" role="status">
                Confirmação registrada — a evidência do seu par agora tem validação recíproca.
              </p>
            )}
            {confirmResult && confirmResult !== "confirmed" && (
              <p className="mt-2 text-xs font-medium text-destructive" role="alert">
                {CONFIRM_COPY[confirmResult]}
              </p>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {PRACTICE_PAIR_COPY.antiColusionNote}
          </p>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        {PRACTICE_PAIR_COPY.demoNote}
      </p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
