import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/app/shell/AppShell";
import { IvoAccessNotice, IvoLoading } from "@/components/ivo/IvoAccessNotice";
import {
  FibtActionPlanSection,
  PriorityPlanner,
  type ActionCallbacks,
  type EvidenceSubmitResult,
  type PriorityDraft,
} from "@/components/ivo/FibtActionLoop";
import { currentIvoAccessToken } from "@/components/ivo/ivo-session";
import { loadIvoQ2Reading } from "@/lib/api/ivo-q2-reading.functions";
import {
  activateFibtActionPlanFn,
  createFibtPriorityActionsFn,
  loadFibtActionLoopFn,
  recordFibtActionEvidenceFn,
  recordFibtActionStatusFn,
  setFibtActionAccountabilityFn,
} from "@/lib/api/ivo-action-loop.functions";
import type { IvoQ2Outcome, LedgerWriteOutcome, LoadFibtActionLoopOutcome } from "@/lib/ivo/ivo-views";
import { todayInSaoPaulo } from "@/lib/ivo/local-date";

// Prioridades e ações do ciclo a partir do resultado FIB-T publicado (R6).
// Toda escrita passa pelo servidor, que confere sessão, papel, organização,
// capability e posse do item. Recarregar a página relê tudo do banco.

const searchSchema = z.object({
  wave: z.string().uuid().optional(),
  setor: z.string().uuid().optional(),
  fator: z.string().regex(/^[a-z][a-z_]{0,39}$/).optional(),
});

export const Route = createFileRoute("/ivo-integral/acoes")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Ações do ciclo · FIB-T — IVO integral" }] }),
  component: IvoAcoesPage,
});

type Loaded = { q2: IvoQ2Outcome; loop: LoadFibtActionLoopOutcome };
type PageState = { state: "loading" } | { state: "network_error" } | { state: "done"; data: Loaded };
type Feedback = { tone: "ok" | "error"; text: string } | null;

function IvoAcoesPage() {
  const search = Route.useSearch();
  const [page, setPage] = useState<PageState>({ state: "loading" });
  const [token, setToken] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const today = todayInSaoPaulo();

  const load = useCallback(async () => {
    try {
      const accessToken = await currentIvoAccessToken();
      setToken(accessToken);
      const [q2, loop] = await Promise.all([
        loadIvoQ2Reading({ data: { accessToken, waveId: search.wave } }),
        loadFibtActionLoopFn({ data: { accessToken } }),
      ]);
      setPage({ state: "done", data: { q2, loop } });
    } catch {
      setPage({ state: "network_error" });
    }
  }, [search.wave]);

  useEffect(() => {
    void load();
  }, [load]);

  // `inline`: o desfecho volta ao formulário que enviou (sucesso/erro junto dele, com
  // anúncio próprio) em vez de ir para a faixa global no topo da página.
  async function write(run: () => Promise<LedgerWriteOutcome>, okText: string, options?: { inline?: boolean }): Promise<EvidenceSubmitResult> {
    setBusy(true);
    if (!options?.inline) setFeedback(null);
    let outcome: EvidenceSubmitResult;
    try {
      const r = await run();
      if (!r.ok) outcome = { ok: false, message: r.error };
      else if (!r.accepted) outcome = { ok: false, message: r.message };
      else outcome = { ok: true, message: okText };
      await load();
    } catch {
      outcome = { ok: false, message: "Falha de comunicação com o servidor. Nada foi confirmado." };
    } finally {
      setBusy(false);
    }
    if (!options?.inline) setFeedback({ tone: outcome.ok ? "ok" : "error", text: outcome.message });
    return outcome;
  }

  const callbacks: ActionCallbacks = {
    onAccountability: (itemId, input) =>
      void write(() => setFibtActionAccountabilityFn({ data: { accessToken: token, itemId, ...input } }), "Responsável, prazo e indicador salvos."),
    onStatus: (itemId, toStatus) =>
      void write(() => recordFibtActionStatusFn({ data: { accessToken: token, itemId, toStatus } }), "Estado atualizado."),
    onEvidence: (itemId, input) =>
      write(
        () => recordFibtActionEvidenceFn({ data: { accessToken: token, itemId, ...input } }),
        input.scope === "aprendizagem" ? "Aprendizagem registrada." : "Evidência de execução registrada.",
        { inline: true },
      ),
  };

  const data = page.state === "done" ? page.data : null;
  const view = data?.q2.ok && data.q2.state === "ready" ? data.q2.view : null;
  const plans = data?.loop.ok ? data.loop.plans : [];
  const hasPlanForCycle = !!view && plans.some((p) => p.cycleKeyCanonical === view.cycleKey);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <nav aria-label="Navegação da experiência IVO" className="flex flex-wrap gap-4 text-sm">
          <a href="/ivo-integral" className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline">
            ← Visão IVO
          </a>
          <a href="/ivo-integral/q2" className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline">
            Leitura Q2 · FIB-T
          </a>
        </nav>
        <header>
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">Resultado → prioridade → ação → evidência → aprendizagem</p>
          <h1 className="mt-2 font-serif text-3xl text-foreground">Ações do ciclo a partir da FIB-T</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Evidência de execução mostra que a ação aconteceu. Ela não comprova melhora do indicador nem causalidade.
          </p>
        </header>

        <div role="status" aria-live="polite" className="min-h-6 text-sm">
          {feedback ? (
            <p className={feedback.tone === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>{feedback.text}</p>
          ) : null}
        </div>

        {page.state === "loading" ? <IvoLoading label="Carregando leitura publicada e ações do ciclo…" /> : null}
        {page.state === "network_error" ? (
          <IvoAccessNotice
            category="backend"
            message="Falha de comunicação com o servidor. Nenhum dado foi exibido no lugar."
            redirectTo="/ivo-integral/acoes"
            onRetry={() => void load()}
          />
        ) : null}

        {data && !data.loop.ok ? (
          <IvoAccessNotice category={data.loop.category} message={data.loop.error} redirectTo="/ivo-integral/acoes" onRetry={() => void load()} />
        ) : null}
        {data && data.loop.ok && !data.q2.ok ? (
          <IvoAccessNotice category={data.q2.category} message={data.q2.error} redirectTo="/ivo-integral/acoes" onRetry={() => void load()} />
        ) : null}

        {data?.loop.ok && view && !hasPlanForCycle ? (
          <PriorityPlanner
            view={view}
            preselect={{ cohortId: search.setor, factorId: search.fator }}
            busy={busy}
            onCreate={(priorities: PriorityDraft[]) =>
              void write(
                () => createFibtPriorityActionsFn({ data: { accessToken: token, waveId: view.wave.id, priorities } }),
                "Plano do ciclo criado em rascunho.",
              )
            }
          />
        ) : null}

        {data?.loop.ok && plans.length === 0 && !view ? (
          <p className="text-sm text-muted-foreground">Nenhuma ação de origem FIB-T registrada.</p>
        ) : null}

        {plans.map((plan) => (
          <FibtActionPlanSection
            key={plan.id}
            plan={plan}
            busy={busy}
            today={today}
            onActivate={(planId) => void write(() => activateFibtActionPlanFn({ data: { accessToken: token, planId } }), "Plano ativado.")}
            callbacks={callbacks}
          />
        ))}
      </div>
    </AppShell>
  );
}
