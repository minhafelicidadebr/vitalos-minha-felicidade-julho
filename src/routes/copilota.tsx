// Copiloto setorial ATERRADO em formato de chat. Pack-aware: persona, avatar,
// vocabulário e o índice trocam com o setor ativo. Respostas montadas pelo
// copilot-engine (só fonte real + métricas, com citações) — anti-alucinação.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  HeartHandshake,
  Lightbulb,
  Palette,
  Ruler,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/app/shell/AppShell";
import { CopilotAvatar } from "@/components/copilot/CopilotAvatar";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { usePack } from "@/engine/pack";
import { usePersona } from "@/app/identity/persona-store";
import { canSeeCollective } from "@/mocks/sector-audience";
import { buildTrend, type TrendPoint } from "@/engine/trend/trend-engine";
import { answerCopilot, type CopilotPov, type CopilotTurn } from "@/engine/ai/copilot-engine";
import {
  buildCopilotAvatar,
  buildCopilotKnowledge,
  buildCopilotPersona,
  suggestedQuestions,
  COPILOT_POV_SPECS,
  type PovSpec,
} from "@/mocks/copilot-knowledge";
import { getSectorData } from "@/mocks/sector-data";
import { MOMENTUM_COPY } from "@/mocks/trend-mock";

export const Route = createFileRoute("/copilota")({
  head: () => ({ meta: [{ title: "Copiloto setorial — VitalOS™" }] }),
  component: CopilotaPage,
});

const POV_ICONS: Record<PovSpec["icon"], LucideIcon> = {
  ruler: Ruler,
  palette: Palette,
  "heart-handshake": HeartHandshake,
  lightbulb: Lightbulb,
};

interface ChatMessage {
  id: number;
  author: "user" | "copilot";
  text?: string;
  turn?: CopilotTurn;
}

const CONFIDENCE_STYLE: Record<CopilotTurn["confidence"], { label: string; cls: string }> = {
  alta: {
    label: "confiança alta",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  media: {
    label: "confiança média",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  baixa: { label: "fora do meu escopo", cls: "bg-muted text-muted-foreground" },
};

function CopilotaPage() {
  const { status, reload } = usePack();

  return (
    <AppShell>
      {status.state === "loading" || status.state === "idle" ? (
        <CopilotaLoading />
      ) : status.state === "error" ? (
        <CopilotaError onRetry={reload} />
      ) : (
        <CopilotaChat />
      )}
    </AppShell>
  );
}

function CopilotaLoading() {
  return (
    <div
      className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="Carregando copiloto"
    >
      <div className="h-20 animate-pulse rounded-3xl bg-muted/70" />
      <div className="h-10 w-2/3 animate-pulse rounded-full bg-muted/60" />
      <div className="h-40 animate-pulse rounded-3xl bg-muted/50" />
    </div>
  );
}

function CopilotaError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
          Copiloto indisponível
        </p>
        <h1 className="mt-3 font-serif text-2xl text-foreground">
          Não foi possível carregar o setor ativo.
        </h1>
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

function CopilotaChat() {
  const { pack, index, packId } = usePack();
  const { roleId } = usePersona();
  const canSee = canSeeCollective(packId, roleId);

  const persona = useMemo(() => buildCopilotPersona(pack as never), [pack]);
  const avatar = useMemo(
    () =>
      buildCopilotAvatar(
        pack as never,
        (pack as { branding?: { primary?: string; accent?: string } })?.branding,
      ),
    [pack],
  );
  const kb = useMemo(() => buildCopilotKnowledge(pack as never, index as never), [pack, index]);

  const facts = useMemo(() => {
    const sector = getSectorData(packId);
    if (!index) {
      return {
        indexLabel: kb.indexLabel,
        score: 0,
        maturityName: "—",
        momentumLabel: "—",
        slopePerCycle: 0,
        focusLensName: null,
        focusLensQuestion: null,
        participationRate: sector.org.participationRate,
        orgName: sector.org.name,
      };
    }
    const current = calculateIVO(sector.currentCycle, index);
    const points: TrendPoint[] = sector.trendCycles.map((c) => {
      const r = calculateIVO(c, index);
      return {
        cycleId: r.cycleId,
        label: r.cycleId,
        ivo: r.ivoScore,
        lenses: r.lenses.map((l) => ({ id: l.lensId, name: l.lensName, score: l.score })),
      };
    });
    const trend = buildTrend(points);
    const focus = [...current.lenses].sort((a, b) => a.score - b.score)[0] ?? null;
    return {
      indexLabel: kb.indexLabel,
      score: current.ivoScore,
      maturityName: current.maturityLevel.name,
      momentumLabel: MOMENTUM_COPY[trend.momentum]?.label ?? "—",
      slopePerCycle: trend.slopePerCycle,
      focusLensName: focus ? (focus.lensName.split(" — ")[0] ?? focus.lensName) : null,
      focusLensQuestion: null,
      participationRate: sector.org.participationRate,
      orgName: sector.org.name,
    };
  }, [index, packId, kb.indexLabel]);

  const [pov, setPov] = useState<CopilotPov>("tecnico");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [seq, setSeq] = useState(0);

  const suggestions = suggestedQuestions(kb, canSee);

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    const userMsg: ChatMessage = { id: seq, author: "user", text: q };
    const turn = answerCopilot(kb, facts, { question: q, pov, canSeeCollective: canSee });
    const botMsg: ChatMessage = { id: seq + 1, author: "copilot", turn };
    setMessages((m) => [...m, userMsg, botMsg]);
    setSeq((s) => s + 2);
    setInput("");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col px-4 py-8 sm:px-6">
      {/* Cabeçalho de persona */}
      <header className="flex items-start gap-4 rounded-3xl border border-border/70 bg-gradient-to-br from-primary/8 via-card to-accent/8 p-5 shadow-sm sm:p-6">
        <CopilotAvatar spec={avatar} name={persona.suggestedName} size={64} live />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="font-serif text-2xl text-foreground">{persona.suggestedName}</h1>
            <span className="rounded-full border border-border/70 bg-card/70 px-2 py-0.5 text-[11px] text-muted-foreground">
              {persona.aiName}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{persona.tagline}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Leio {kb.indexFull} de {facts.orgName} — só agregados, com fontes citadas.
          </p>
        </div>
      </header>

      {/* Seletor de ponto de vista */}
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Ponto de vista
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Ponto de vista do copiloto"
        >
          {COPILOT_POV_SPECS.map((spec) => {
            const Icon = POV_ICONS[spec.icon];
            const active = pov === spec.id;
            return (
              <button
                key={spec.id}
                role="radio"
                aria-checked={active}
                onClick={() => setPov(spec.id)}
                title={spec.description}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "border-primary/40 bg-primary text-primary-foreground"
                    : "border-border/60 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {spec.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversa */}
      <div className="mt-5 flex-1 space-y-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-card/40 p-6">
            <p className="font-serif text-lg text-foreground">Comece por uma pergunta</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Respondo com base no ecossistema do app e cito as fontes. Quando não sei, eu digo.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-xl border border-border/60 bg-card px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-primary/30 hover:bg-muted/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) =>
            m.author === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  {m.text}
                </p>
              </div>
            ) : (
              <CopilotBubble
                key={m.id}
                turn={m.turn!}
                persona={persona.suggestedName}
                avatar={avatar}
              />
            ),
          )
        )}
      </div>

      {/* Entrada */}
      <form
        className="sticky bottom-4 mt-5 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <label htmlFor="copilot-input" className="sr-only">
          Sua pergunta para {persona.suggestedName}
        </label>
        <textarea
          id="copilot-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          rows={1}
          placeholder={`Pergunte à ${persona.suggestedName}…`}
          className="min-h-11 flex-1 resize-none rounded-2xl border border-border/70 bg-card px-4 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          aria-label="Enviar pergunta"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Respostas mockadas e determinísticas, ancoradas nos dados e no método do app — a Fase 2
        conecta o modelo real usando este mesmo aterramento como contexto.
      </p>
    </div>
  );
}

function CopilotBubble({
  turn,
  persona,
  avatar,
}: {
  turn: CopilotTurn;
  persona: string;
  avatar: Parameters<typeof CopilotAvatar>[0]["spec"];
}) {
  const conf = CONFIDENCE_STYLE[turn.confidence];
  return (
    <div className="flex items-start gap-3">
      <CopilotAvatar spec={avatar} name={persona} size={36} />
      <div
        className={`min-w-0 flex-1 rounded-2xl rounded-tl-sm border bg-card p-4 shadow-sm ${
          turn.refusal ? "border-amber-300/60" : "border-border/70"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-serif text-base text-foreground">{turn.headline}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${conf.cls}`}>
            {conf.label}
          </span>
        </div>

        {turn.groundedLine && (
          <p className="mt-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-card-foreground">
            📊 {turn.groundedLine}
          </p>
        )}

        <p className="mt-2 text-sm leading-relaxed text-card-foreground">{turn.body}</p>

        {turn.nextStep && (
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            <span className="font-medium">→ </span>
            {turn.nextStep}
          </p>
        )}

        {turn.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Fontes
            </span>
            {turn.sources.map((s) => (
              <span
                key={s.chunkId}
                className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {s.label}
              </span>
            ))}
          </div>
        )}

        <p className="mt-3 border-t border-border/50 pt-2 text-[10px] leading-snug text-muted-foreground">
          {turn.guardrailNotice}
        </p>
      </div>
    </div>
  );
}
