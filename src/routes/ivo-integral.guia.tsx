import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/app/shell/AppShell";
import { IvoAccessNotice, IvoLoading } from "@/components/ivo/IvoAccessNotice";
import { currentIvoAccessToken } from "@/components/ivo/ivo-session";
import type { GuideLens, GuidePerspective } from "@/domain/guide/guide-types";
import { GuideJourney } from "@/features/guide/GuideJourney";
import { MyJourneyCard } from "@/features/guide/GuideOpening";
import { validateGuideSearch } from "@/features/guide/guide-search";
import { loadGuideJourneyFn } from "@/lib/api/guide.functions";
import type { GuideJourneyOutcome } from "@/lib/guide/guide-context.server";
import { resolveGuideEntry } from "@/lib/guide/guide-entry";

// "Guia da minha jornada" · entrada pelo painel autenticado. Papel, módulos, tarefas e
// ciclo ativo vêm do SERVIDOR; a perspectiva escolhida muda só a explicação.
export const Route = createFileRoute("/ivo-integral/guia")({
  validateSearch: validateGuideSearch,
  head: () => ({ meta: [{ title: "Guia da minha jornada — VitalOS™" }] }),
  component: MyJourneyPage,
});

type Page = { state: "loading" } | { state: "network_error" } | { state: "done"; outcome: GuideJourneyOutcome };

function MyJourneyPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/ivo-integral/guia" });
  const [page, setPage] = useState<Page>({ state: "loading" });
  const journeyRef = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    setPage({ state: "loading" });
    try {
      const accessToken = await currentIvoAccessToken();
      setPage({ state: "done", outcome: await loadGuideJourneyFn({ data: { accessToken } }) });
    } catch {
      setPage({ state: "network_error" });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const outcome = page.state === "done" ? page.outcome : null;
  const ready = outcome?.ok ? outcome : null;
  const entry = useMemo(() => resolveGuideEntry(ready?.context ?? null), [ready]);
  const defaultStage: GuideLens = entry.kind === "task" ? entry.task.lens : entry.kind === "stage" ? entry.lens : "Q2";
  const stage = search.etapa ?? defaultStage;
  const q2TaskPanel = stage === "Q2" && (
    (entry.kind === "task" && entry.task.lens === "Q2") ||
    (entry.kind === "map" && entry.reason === "several_tasks")
  );

  const change = (next: { stage?: GuideLens; perspective?: GuidePerspective }) =>
    navigate({ search: (prev) => ({ ...prev, ...(next.stage ? { etapa: next.stage } : {}), ...(next.perspective ? { perfil: next.perspective } : {}) }), replace: true });
  const open = (lens: GuideLens) => {
    void navigate({ search: (prev) => ({ ...prev, etapa: lens }), replace: true }).then(() => journeyRef.current?.scrollIntoView({ block: "start" }));
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <nav aria-label="Navegação da experiência IVO" className="text-sm">
          <a href="/ivo-integral" className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline">← Visão IVO</a>
        </nav>
        <div aria-live="polite">
          {page.state === "loading" ? <IvoLoading label="Verificando sua sessão e o seu momento no ciclo…" /> : null}
          {page.state === "network_error" ? (
            <IvoAccessNotice category="backend" message="Falha de comunicação com o servidor. Nenhum dado foi exibido no lugar." redirectTo="/ivo-integral/guia" onRetry={() => void load()} />
          ) : null}
          {outcome && !outcome.ok ? (
            <IvoAccessNotice category={outcome.category as never} message={outcome.error} redirectTo="/ivo-integral/guia" onRetry={() => void load()} />
          ) : null}
        </div>
        {ready ? (
          <>
            {stage !== "Q2" || q2TaskPanel ? <MyJourneyCard entry={entry} context={ready.context} onOpen={open} /> : <h1 className="sr-only">Guia da minha jornada</h1>}
            <div ref={journeyRef} className="scroll-mt-4">
              <GuideJourney
                content={ready.content}
                context={ready.context}
                environment={ready.context.environment}
                stage={stage}
                hasTaskPanel={q2TaskPanel}
                perspective={search.perfil ?? ready.context.perspective}
                onChange={change}
              />
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
