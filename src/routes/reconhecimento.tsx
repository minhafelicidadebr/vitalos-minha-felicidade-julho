import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  HeartHandshake,
  LockKeyhole,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { useRecognition } from "@/app/gamification/use-recognition";
import { usePack } from "@/engine/pack";
import type {
  RecognitionEvent,
  RecognitionRecordReason,
  RecognitionVisibility,
} from "@/engine/recognition/recognition-engine";
import {
  MOCK_COLLEAGUES,
  MOCK_KUDOS_PILLARS,
  MOCK_KUDOS_RECEIVED,
  RECOGNITION_COPY,
  type MockKudo,
} from "@/mocks/colaborador-mock";

export const Route = createFileRoute("/reconhecimento")({
  head: () => ({ meta: [{ title: "Reconhecimento · Comunidade — VitalOS™" }] }),
  component: RecognitionPage,
});

const RESULT_COPY: Record<Exclude<RecognitionRecordReason, "recorded">, string> = {
  duplicate: "Este reconhecimento repete a mesma pessoa e categoria dentro da janela de proteção.",
  self_recognition: "Reconhecimento é relacional: não é possível enviar um Kudo para si.",
  budget_exhausted: "Seu orçamento semanal terminou. Uma nova cota abre na próxima semana.",
  visibility_not_allowed: "Esta visibilidade não é permitida pela política deste pack.",
  public_consent_required: "Confirme o consentimento antes de publicar este reconhecimento.",
  invalid_request: "Selecione uma pessoa e uma categoria válida antes de enviar.",
};

function RecognitionPage() {
  const { status, reload } = usePack();
  const recognition = useRecognition();
  const [recipientId, setRecipientId] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [visibility, setVisibility] = useState<RecognitionVisibility>("private");
  const [publicationConsent, setPublicationConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<RecognitionRecordReason | null>(null);

  const recipientById = useMemo(
    () => new Map(MOCK_COLLEAGUES.map((colleague) => [colleague.id, colleague])),
    [],
  );
  const pillarById = useMemo(
    () => new Map(MOCK_KUDOS_PILLARS.map((pillar) => [pillar.id, pillar])),
    [],
  );

  if (status.state === "idle" || status.state === "loading") {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6" aria-busy="true">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-44 animate-pulse rounded-[2rem] bg-muted/70" />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-96 animate-pulse rounded-3xl bg-muted/60" />
            <div className="h-96 animate-pulse rounded-3xl bg-muted/60" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (status.state === "error" || !recognition.policy) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
          <div className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
              Reconhecimento indisponível
            </p>
            <h1 className="mt-3 font-serif text-2xl text-foreground">
              A política social deste pack não pôde ser carregada.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum envio foi presumido ou registrado.
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-6 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const policy = recognition.policy;
  const publicReceived = MOCK_KUDOS_RECEIVED.filter((kudo) => kudo.isPublic);
  const privateReceived = MOCK_KUDOS_RECEIVED.filter((kudo) => !kudo.isPublic);
  const charsRemaining = policy.messageMaxChars - message.length;

  function send() {
    const response = recognition.send({
      recipientId,
      pillarId,
      visibility,
      publicationConsent,
    });
    if (!response) return;
    setResult(response.reason);

    if (response.reason === "recorded") {
      setRecipientId("");
      setPillarId("");
      setVisibility("private");
      setPublicationConsent(false);
      setMessage("");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[2rem] border border-primary/18 bg-gradient-to-br from-primary/14 via-card to-rose-500/5 p-6 shadow-sm sm:p-8"
        >
          <div
            className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-rose-400/10 blur-3xl"
            aria-hidden
          />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_0.42fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {RECOGNITION_COPY.eyebrow}
              </p>
              <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                {RECOGNITION_COPY.title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
                {RECOGNITION_COPY.lead}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/75 p-4 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Orçamento semanal
              </p>
              <p className="mt-2 font-serif text-3xl font-semibold text-foreground">
                {recognition.remainingBudget}/{policy.weeklyBudget}
              </p>
              <p className="text-xs text-muted-foreground">Kudos disponíveis para enviar</p>
            </div>
          </div>
        </motion.header>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"
                aria-hidden
              >
                <HeartHandshake className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Enviar reconhecimento
                </p>
                <h2 className="mt-1 font-serif text-xl text-foreground">
                  Específico, sincero e consentido
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Pessoa">
                <select
                  value={recipientId}
                  onChange={(event) => {
                    setRecipientId(event.target.value);
                    setResult(null);
                  }}
                  className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Selecione uma pessoa…</option>
                  {MOCK_COLLEAGUES.map((colleague) => (
                    <option key={colleague.id} value={colleague.id}>
                      {colleague.name} · {colleague.team}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Contribuição reconhecida">
                <select
                  value={pillarId}
                  onChange={(event) => {
                    setPillarId(event.target.value);
                    setResult(null);
                  }}
                  className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Selecione uma categoria…</option>
                  {MOCK_KUDOS_PILLARS.map((pillar) => (
                    <option key={pillar.id} value={pillar.id}>
                      {pillar.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Mensagem">
                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value.slice(0, policy.messageMaxChars))
                  }
                  rows={4}
                  placeholder="O que a pessoa fez e qual foi o efeito positivo?"
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground"
                />
                <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span>Texto transitório: não entra no ledger.</span>
                  <span className="tabular-nums">{charsRemaining}</span>
                </div>
              </Field>

              <fieldset>
                <legend className="text-xs font-medium text-foreground">Visibilidade</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <VisibilityOption
                    value="private"
                    selected={visibility === "private"}
                    icon={EyeOff}
                    title="Privado"
                    text="Somente as pessoas envolvidas."
                    onSelect={() => {
                      setVisibility("private");
                      setPublicationConsent(false);
                      setResult(null);
                    }}
                  />
                  <VisibilityOption
                    value="public"
                    selected={visibility === "public"}
                    icon={Eye}
                    title="Público"
                    text="Pode aparecer no mural da comunidade."
                    onSelect={() => {
                      setVisibility("public");
                      setResult(null);
                    }}
                  />
                </div>
              </fieldset>

              {visibility === "public" && (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <input
                    type="checkbox"
                    checked={publicationConsent}
                    onChange={(event) => {
                      setPublicationConsent(event.target.checked);
                      setResult(null);
                    }}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Confirmo que quero publicar este reconhecimento no mural demonstrativo.
                  </span>
                </label>
              )}

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
                    ? "Kudo enviado. O texto foi entregue apenas na simulação e não foi persistido."
                    : RESULT_COPY[result]}
                </div>
              )}

              <button
                type="button"
                onClick={send}
                disabled={
                  !recipientId || !pillarId || !message.trim() || recognition.remainingBudget === 0
                }
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Send className="h-4 w-4" aria-hidden />
                Enviar Kudo
              </button>
            </div>
          </div>

          <aside className="space-y-4">
            <TrustCard
              icon={LockKeyhole}
              title="Mensagem fora da telemetria"
              text={RECOGNITION_COPY.noMessagePersistence}
            />
            <TrustCard
              icon={EyeOff}
              title="Privado por padrão"
              text={RECOGNITION_COPY.privateNote}
            />
            <TrustCard
              icon={Eye}
              title="Publicação consentida"
              text={RECOGNITION_COPY.publicNote}
            />
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <SentLedger
            events={recognition.events}
            recipientById={recipientById}
            pillarById={pillarById}
          />
          <ReceivedRecognition privateItems={privateReceived} publicItems={publicReceived} />
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Fluxo coletivo · k≥{policy.kAnonymityMin}
              </p>
              <h2 className="mt-1 font-serif text-xl text-foreground">
                O que a comunidade tem reconhecido
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">sem nomes ou mensagens</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recognition.aggregates.map((aggregate) => (
              <div
                key={aggregate.pillarId}
                className="rounded-2xl border border-border/60 bg-background/45 p-4"
              >
                <p className="text-sm font-medium text-foreground">{aggregate.pillarLabel}</p>
                {aggregate.visible ? (
                  <>
                    <p className="mt-3 font-serif text-2xl font-semibold text-primary">
                      {aggregate.recognitionCount}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      reconhecimentos · {aggregate.uniqueContributors} participantes
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    🔒 Menos de {policy.kAnonymityMin} participantes; métrica protegida.
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-serif text-xl text-foreground">Reconhecimento não é avaliação</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Volume de Kudos, pessoas reconhecidas e XP jamais alimentam desempenho, promoção ou
                remuneração. Métricas coletivas só aparecem com proteção k-anônima.
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
      </div>
    </AppShell>
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

function VisibilityOption({
  value,
  selected,
  icon: Icon,
  title,
  text,
  onSelect,
}: {
  value: RecognitionVisibility;
  selected: boolean;
  icon: typeof Eye;
  title: string;
  text: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-value={value}
      onClick={onSelect}
      className={`min-h-24 rounded-2xl border p-4 text-left transition-colors ${
        selected ? "border-primary bg-primary/8" : "border-border/60 hover:bg-muted/30"
      }`}
    >
      <Icon className="h-4 w-4 text-primary" aria-hidden />
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{text}</p>
    </button>
  );
}

function TrustCard({ icon: Icon, title, text }: { icon: typeof Eye; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
      <Icon className="h-5 w-5 text-primary" aria-hidden />
      <h2 className="mt-3 font-serif text-xl text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function SentLedger({
  events,
  recipientById,
  pillarById,
}: {
  events: RecognitionEvent[];
  recipientById: Map<string, (typeof MOCK_COLLEAGUES)[number]>;
  pillarById: Map<string, (typeof MOCK_KUDOS_PILLARS)[number]>;
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Seus envios
      </p>
      <h2 className="mt-1 font-serif text-xl text-foreground">Metadados mínimos</h2>
      {events.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border/60 p-5 text-center">
          <p className="text-sm text-muted-foreground">Nenhum Kudo enviado nesta demonstração.</p>
        </div>
      ) : (
        <ol className="mt-5 space-y-2">
          {[...events].reverse().map((event) => {
            const recipient = recipientById.get(event.recipientId);
            const pillar = pillarById.get(event.pillarId);
            return (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded-2xl border border-border/55 bg-background/45 px-4 py-3"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                  aria-hidden
                >
                  {recipient?.initials ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {recipient?.name ?? "Pessoa reconhecida"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {pillar?.name ?? "Categoria"} · {event.occurredOn}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                  {event.visibility === "public" ? "Público" : "Privado"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ReceivedRecognition({
  privateItems,
  publicItems,
}: {
  privateItems: MockKudo[];
  publicItems: MockKudo[];
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Para você
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground">Reconhecimentos recebidos</h2>
        </div>
        <Users className="h-5 w-5 text-primary" aria-hidden />
      </div>
      <div className="mt-5 space-y-3">
        {[...privateItems, ...publicItems].map((kudo) => (
          <article
            key={kudo.id}
            className="rounded-2xl border border-border/55 bg-background/45 p-4"
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
                aria-hidden
              >
                {kudo.fromInitials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{kudo.fromName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {kudo.pillarName} · {kudo.date}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                {kudo.isPublic ? "Público" : "Privado"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{kudo.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
