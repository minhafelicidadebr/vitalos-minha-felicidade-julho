import { useCallback, useEffect, useState } from "react";

import { IvoLoading } from "@/components/ivo/IvoAccessNotice";
import { STATUS_LABEL } from "@/components/ivo/FibtActionLoop";
import { currentIvoAccessToken } from "@/components/ivo/ivo-session";
import { loadMemberPlanFeedbackFn } from "@/lib/api/ivo-action-loop.functions";
import type { MemberPlanFeedbackOutcome } from "@/lib/ivo/member-plan-feedback.server";

// C2 · "O que a organização está fazendo" — devolutiva coletiva para membros.
// Só a projeção fechada do servidor; nenhum dado de pessoa, nenhuma promessa de melhora.

type State = { kind: "loading" } | { kind: "network_error" } | { kind: "done"; outcome: MemberPlanFeedbackOutcome };

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1] ?? m}/${y}`;
}

/** `hideWhenUnavailable`: no Diário (todos os packs), some quando a conta/empresa não tem a lente. */
export function MemberPlanFeedback({ hideWhenUnavailable = false }: { hideWhenUnavailable?: boolean }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const accessToken = await currentIvoAccessToken();
      setState({ kind: "done", outcome: await loadMemberPlanFeedbackFn({ data: { accessToken } }) });
    } catch {
      setState({ kind: "network_error" });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (hideWhenUnavailable && state.kind === "done" && !state.outcome.ok && state.outcome.category !== "backend") return null;

  return (
    <section aria-labelledby="member-feedback-title" className="rounded-md border border-border bg-card p-4 text-sm">
      <h2 id="member-feedback-title" className="font-serif text-lg text-foreground">O que a organização está fazendo</h2>
      <p className="mt-1 text-muted-foreground">
        Estas ações partem de resultados coletivos publicados. Mostram o que está sendo feito, não uma melhora já medida.
      </p>

      <div aria-live="polite" className="mt-3">
        {state.kind === "loading" ? <IvoLoading label="Carregando as ações da organização…" /> : null}
        {state.kind === "network_error" || (state.kind === "done" && !state.outcome.ok && state.outcome.category === "backend") ? (
          <div role="alert" className="text-muted-foreground">
            <p>Não foi possível carregar as ações agora. Nada foi exibido no lugar.</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 min-h-11 rounded-md border border-border px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Tentar novamente
            </button>
          </div>
        ) : null}
        {state.kind === "done" && !state.outcome.ok && state.outcome.category !== "backend" ? (
          <p className="text-muted-foreground">As ações da organização não estão disponíveis para esta conta ou empresa.</p>
        ) : null}
        {state.kind === "done" && state.outcome.ok && state.outcome.plans.length === 0 ? (
          <p className="text-muted-foreground">Ainda não há ações em andamento a partir dos resultados publicados.</p>
        ) : null}
      </div>

      {state.kind === "done" && state.outcome.ok
        ? state.outcome.plans.map((plan) => (
            <div key={plan.cycle} className="mt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Ciclo {plan.cycle} · {plan.status === "active" ? "plano ativo" : "plano encerrado"}
              </p>
              <ul className="mt-2 space-y-2">
                {plan.actions.map((a, i) => (
                  <li key={`${plan.cycle}-${i}`} className="rounded-md border border-border p-3">
                    <p className="font-medium text-foreground">{a.title ?? `Ação sobre ${a.factorName}`}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.sectorLabel ? `${a.sectorLabel} · ` : ""}fator {a.factorName}
                    </p>
                    <p className="mt-1 text-xs text-foreground">
                      {STATUS_LABEL[a.status]}
                      {a.dueMonth ? ` · prazo ${formatMonth(a.dueMonth)}` : ""}
                      {a.hasExecutionRecord ? " · execução registrada" : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Eficácia ainda não avaliada.</p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        : null}
    </section>
  );
}
