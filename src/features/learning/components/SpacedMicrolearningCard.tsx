// SpacedMicrolearningCard — microlearning espaçado privado (LD-013, LDX-2
// Fatia D). Unidades curtas com active recall que voltam ao longo dos dias,
// com agenda explicável, cadência ajustável e persistência PRIVADA opt-in.
//
// Doutrina: nada é gravado até a pessoa ativar ("neste aparelho"); nenhum
// streak coercitivo; "parar e apagar" a qualquer momento; honesto sobre ser
// uma agenda no app deste dispositivo — não notificação push, não conta, não
// indicador organizacional.

import { useEffect, useMemo, useState } from "react";
import { useSpacedMicrolearning } from "@/engine/learning/spaced-microlearning-store";
import {
  MICRO_CADENCES,
  summarizeMicroPlan,
  toDayString,
  type MicroCadence,
  type MicroUnit,
} from "@/engine/learning/spaced-microlearning-engine";

interface SpacedMicrolearningCardProps {
  units: readonly MicroUnit[];
  planVersion: string;
  resolveSourceLabel: (studyId: string) => string;
}

const RATINGS: { label: string; quality: 0 | 1 | 2 | 3 | 4 | 5; hint: string }[] = [
  { label: "Não lembrei", quality: 1, hint: "volta logo" },
  { label: "Com esforço", quality: 3, hint: "volta em breve" },
  { label: "Lembrei", quality: 4, hint: "espaça mais" },
  { label: "Fácil", quality: 5, hint: "espaça bastante" },
];

function formatDay(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

export function SpacedMicrolearningCard({
  units,
  planVersion,
  resolveSourceLabel,
}: SpacedMicrolearningCardProps) {
  const { enabled, plan, enable, hydratePlan, review, changeCadence, disableAndClear } =
    useSpacedMicrolearning();
  const [mounted, setMounted] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Evita mismatch de hidratação SSR (o store é client-only, localStorage).
  useEffect(() => setMounted(true), []);

  // Reconcilia o plano persistido com o conteúdo atual (unidades novas/removidas).
  useEffect(() => {
    if (mounted && enabled) hydratePlan(units, planVersion);
  }, [mounted, enabled, units, planVersion, hydratePlan]);

  const today = toDayString(new Date());
  const summary = useMemo(
    () => (plan ? summarizeMicroPlan(plan, today) : null),
    [plan, today],
  );

  const dueUnit = useMemo(() => {
    if (!plan) return null;
    const dueIds = Object.values(plan.progress)
      .filter((p) => p.dueOn <= today)
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
      .map((p) => p.unitId);
    const id = dueIds[0];
    return id ? units.find((u) => u.id === id) ?? null : null;
  }, [plan, today, units]);

  // ─── Antes do mount ou opt-out: convite honesto ao opt-in ─────────────────
  if (!mounted || !enabled || !plan || !summary) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <p className="text-sm font-medium text-card-foreground">
          Fixar o essencial com revisão espaçada
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {units.length} ideias-chave desta trilha voltam ao longo dos dias, no seu ritmo, para
          consolidar de verdade. O acompanhamento fica salvo só <strong>neste aparelho</strong>.
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          É uma agenda dentro do app — não notificação por push, não vai para a sua empresa, e você
          pode apagar quando quiser.
        </p>
        <button
          type="button"
          onClick={() => enable(units, planVersion, "alternada")}
          disabled={!mounted}
          className="mt-3 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40"
        >
          Acompanhar neste aparelho
        </button>
      </div>
    );
  }

  const activeCadence = plan.cadence;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{summary.due}</strong> para hoje
        </span>
        <span>
          <strong className="text-foreground">{summary.consolidated}</strong> consolidadas de{" "}
          {summary.total}
        </span>
        {summary.nextDueOn && summary.due === 0 && (
          <span>próxima em {formatDay(summary.nextDueOn)}</span>
        )}
      </div>

      {dueUnit ? (
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Revisar agora
          </p>
          <p className="mt-2 text-sm font-medium text-card-foreground">{dueUnit.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-card-foreground">
            {dueUnit.recallQuestion}
          </p>

          {!revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="mt-3 min-h-11 rounded-xl border border-border/70 bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Tentei de memória — mostrar resposta
            </button>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-r-lg border-l-4 border-primary bg-primary/5 px-3 py-2">
                <p className="text-xs leading-relaxed text-card-foreground">{dueUnit.recallAnswer}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Fonte: {resolveSourceLabel(dueUnit.sourceStudyId)}
                </p>
              </div>
              <div>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Quão fácil foi lembrar? (define quando volta — sem certo ou errado)
                </p>
                <div className="flex flex-wrap gap-2">
                  {RATINGS.map((r) => (
                    <button
                      key={r.quality}
                      type="button"
                      onClick={() => {
                        review(dueUnit.id, r.quality);
                        setRevealed(false);
                      }}
                      className="min-h-11 rounded-xl border border-border/70 bg-background px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <span className="font-medium">{r.label}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground">· {r.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card p-4" aria-live="polite">
          <p className="text-sm text-card-foreground">
            Tudo em dia por aqui. {summary.nextDueOn
              ? `A próxima revisão volta em ${formatDay(summary.nextDueOn)}.`
              : "Nada agendado no momento."}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sem pressa e sem sequência a manter — a revisão existe para ajudar, não para cobrar.
          </p>
        </div>
      )}

      {/* Cadência ajustável + controle de privacidade */}
      <div className="rounded-2xl border border-border/70 bg-background p-4">
        <p className="text-xs font-semibold text-foreground">Ritmo</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Ritmo de revisão">
          {MICRO_CADENCES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => changeCadence(c.id as MicroCadence)}
              aria-pressed={activeCadence === c.id}
              className={`min-h-11 rounded-xl border px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                activeCadence === c.id
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          O ritmo é o intervalo mínimo entre retornos — vale para as próximas revisões, não muda o
          que já está agendado.
        </p>
        <button
          type="button"
          onClick={() => {
            disableAndClear();
            setRevealed(false);
          }}
          className="mt-3 min-h-11 rounded-xl border border-border/70 bg-background px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Parar e apagar deste aparelho
        </button>
      </div>
    </div>
  );
}
