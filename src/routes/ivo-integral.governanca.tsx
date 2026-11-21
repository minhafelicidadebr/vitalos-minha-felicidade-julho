import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/shell/AppShell";
import { IvoAccessNotice, IvoLoading } from "@/components/ivo/IvoAccessNotice";
import { IvoGovernanceView, type GovernanceView, type PrepareInput } from "@/components/ivo/IvoGovernanceView";
import { currentIvoAccessToken } from "@/components/ivo/ivo-session";
import { loadGovernanceFn, prepareGovernanceDecisionFn } from "@/lib/api/ivo-governance.functions";
import type { LoadGovernanceOutcome, PrepareGovernanceDecisionOutcome } from "@/lib/ivo/ivo-views";

// Governança metodológica do IVO (R8): consulta das decisões D1–D10 e dos
// mapeamentos M1–M6. Leitura exige sessão autorizada no servidor; preparar
// decisão exige a autoridade metodológica configurada e não grava nada.

export const Route = createFileRoute("/ivo-integral/governanca")({
  head: () => ({ meta: [{ title: "Governança metodológica — IVO integral" }] }),
  component: IvoGovernancaPage,
});

type PageState = { state: "loading" } | { state: "network_error" } | { state: "done"; outcome: LoadGovernanceOutcome };

function IvoGovernancaPage() {
  const [page, setPage] = useState<PageState>({ state: "loading" });

  const load = useCallback(async () => {
    setPage({ state: "loading" });
    try {
      const accessToken = await currentIvoAccessToken();
      setPage({ state: "done", outcome: await loadGovernanceFn({ data: { accessToken } }) });
    } catch {
      setPage({ state: "network_error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function prepare(input: PrepareInput): Promise<PrepareGovernanceDecisionOutcome> {
    const accessToken = await currentIvoAccessToken();
    return prepareGovernanceDecisionFn({ data: { accessToken, ...input } });
  }

  const view: GovernanceView | null = page.state === "done" && page.outcome.ok ? page.outcome : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <nav aria-label="Navegação da experiência IVO" className="flex flex-wrap gap-4 text-sm">
          <a href="/ivo-integral" className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline">
            ← Visão IVO
          </a>
          <a href="/ivo-integral/acoes" className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline">
            Ações do ciclo
          </a>
        </nav>
        <header>
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">Governança metodológica · R8</p>
          <h1 className="mt-2 font-serif text-3xl text-foreground">Decisões e mapeamentos do IVO</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tudo aqui começa como proposta. Proposta não é aprovação: enquanto não houver decisão registrada, nenhuma dimensão recebe valor e nenhuma conclusão metodológica é apresentada.
          </p>
        </header>

        {page.state === "loading" ? <IvoLoading label="Carregando o registro de governança…" /> : null}
        {page.state === "network_error" ? (
          <IvoAccessNotice
            category="backend"
            message="Falha de comunicação com o servidor. Nenhum dado foi exibido no lugar."
            redirectTo="/ivo-integral/governanca"
            onRetry={() => void load()}
          />
        ) : null}
        {page.state === "done" && !page.outcome.ok ? (
          <IvoAccessNotice category={page.outcome.category} message={page.outcome.error} redirectTo="/ivo-integral/governanca" onRetry={() => void load()} />
        ) : null}
        {view ? <IvoGovernanceView view={view} onPrepare={prepare} /> : null}
      </div>
    </AppShell>
  );
}
