import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/shell/AppShell";
import { IvoAccessNotice, IvoLoading } from "@/components/ivo/IvoAccessNotice";
import { IvoQ2Detail } from "@/components/ivo/IvoQ2Detail";
import { MemberPlanFeedback } from "@/components/ivo/MemberPlanFeedback";
import { currentIvoAccessToken } from "@/components/ivo/ivo-session";
import { loadIvoQ2Reading } from "@/lib/api/ivo-q2-reading.functions";
import type { IvoQ2Outcome } from "@/lib/ivo/ivo-views";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { Q2Orientation } from "@/features/guide/Q2Orientation";

// Detalhe da lente Q2 (FIB-T) dentro da experiência IVO. Leitura autorizada
// no servidor (R5); somente o estado já publicado.

export const Route = createFileRoute("/ivo-integral/q2")({
  head: () => ({ meta: [{ title: "Q2 · FIB-T — IVO integral" }] }),
  component: IvoQ2Page,
});

type PageState = { state: "loading" } | { state: "network_error" } | { state: "done"; outcome: IvoQ2Outcome };

function IvoQ2Page() {
  const [page, setPage] = useState<PageState>({ state: "loading" });
  const session = useRealOrgSession();

  const load = useCallback(async () => {
    setPage({ state: "loading" });
    try {
      const accessToken = await currentIvoAccessToken();
      setPage({ state: "done", outcome: await loadIvoQ2Reading({ data: { accessToken } }) });
    } catch {
      setPage({ state: "network_error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const outcome = page.state === "done" ? page.outcome : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <nav aria-label="Navegação da experiência IVO" className="text-sm">
          <a href="/ivo-integral" className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline">
            ← Visão IVO
          </a>
        </nav>
        <header>
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">Lente Q2 · FIB-T</p>
          <h1 className="mt-2 font-serif text-3xl text-foreground">
            {outcome?.ok && outcome.state === "ready" ? outcome.view.organizationName : "Leitura Q2 da organização"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Resultado nativo da FIB-T: fatores e escore bruto, como publicados. Não é índice IVO.
          </p>
        </header>

        <Q2Orientation roleId={session.org?.role ?? null} stage="leitura" />

        <div aria-live="polite">
          {page.state === "loading" ? <IvoLoading label="Carregando a leitura protegida da FIB-T…" /> : null}
          {page.state === "network_error" ? (
            <IvoAccessNotice
              category="backend"
              message="Falha de comunicação com o servidor. Nenhum dado foi exibido no lugar."
              redirectTo="/ivo-integral/q2"
              onRetry={() => void load()}
            />
          ) : null}
          {outcome && !outcome.ok ? (
            <IvoAccessNotice
              category={outcome.category}
              message={outcome.error}
              memberPath={outcome.memberPath}
              redirectTo="/ivo-integral/q2"
              onRetry={() => void load()}
            />
          ) : null}
          {outcome && !outcome.ok && outcome.memberPath ? (
            <div className="mt-4">
              <MemberPlanFeedback roleId={session.org?.role ?? null} />
            </div>
          ) : null}
          {outcome?.ok && outcome.state === "no_wave" ? (
            <div role="note" className="rounded-md border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium text-foreground">Nenhuma onda FIB-T nesta organização</p>
              <p className="mt-1 text-muted-foreground">Ausência de dados não é zero: não há o que exibir.</p>
            </div>
          ) : null}
        </div>

        {outcome?.ok && outcome.state === "ready" ? (
          <>
            <IvoQ2Detail view={outcome.view} />
            <a
              href="/ivo-integral/acoes"
              className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ir para prioridades e ações do ciclo
            </a>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
