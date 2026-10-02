import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/shell/AppShell";
import { IvoLensMatrix } from "@/components/ivo/IvoLensMatrix";
import { IvoAccessNotice, IvoLoading } from "@/components/ivo/IvoAccessNotice";
import { currentIvoAccessToken } from "@/components/ivo/ivo-session";
import { usePack } from "@/engine/pack";
import { buildIvoMatrix } from "@/engine/ivo/ivo-matrix";
import { getDimensionMappings } from "@/domain/ivo/dimension-mappings";
import { ivoDimensionsForPack, ivoLensCatalog } from "@/domain/ivo/lens-catalog";
import { loadIvoQ2Reading } from "@/lib/api/ivo-q2-reading.functions";
import type { IvoQ2Outcome } from "@/lib/ivo/ivo-views";

// Visão IVO (ADR-004, spec ivo-dashboard.md).
//
// DECISÃO DE ACESSO: o CATÁLOGO (4 dimensões × 4 lentes, estado e versão de
// cada lente) não contém dado de organização e continua visível a quem passa
// pelo AppShell (sessão real ou portão de demonstração). Ele NÃO é tratado
// como página pública separada. A LEITURA ORGANIZACIONAL é outra coisa: só
// aparece quando a server function autoriza a sessão no servidor — o
// AppShell e o portão de demonstração não autorizam nada.

export const Route = createFileRoute("/ivo-integral/")({
  head: () => ({ meta: [{ title: "IVO integral · 4 dimensões × 4 lentes — VitalOS™" }] }),
  component: IvoIntegralPage,
});

type ReadingState = { state: "loading" } | { state: "network_error" } | { state: "done"; outcome: IvoQ2Outcome };

const SUMMARY_LABEL = {
  available: "resultado publicado em parte dos setores",
  protected: "resultado protegido — nenhum setor publicado ainda",
  collecting: "em coleta, sem resultado publicado",
  no_data: "sem participação registrada",
} as const;

function IvoIntegralPage() {
  const { packId } = usePack();
  const [reading, setReading] = useState<ReadingState>({ state: "loading" });

  const load = useCallback(async () => {
    setReading({ state: "loading" });
    try {
      const accessToken = await currentIvoAccessToken();
      const outcome = await loadIvoQ2Reading({ data: { accessToken } });
      setReading({ state: "done", outcome });
    } catch {
      setReading({ state: "network_error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const view = reading.state === "done" && reading.outcome.ok && reading.outcome.state === "ready" ? reading.outcome.view : null;

  const matrix = useMemo(
    () =>
      buildIvoMatrix({
        organizationId: view ? view.reading.organizationId : null,
        dimensions: ivoDimensionsForPack(packId),
        lenses: ivoLensCatalog(),
        readings: view ? [view.reading] : [],
        mappings: getDimensionMappings(),
      }),
    [packId, view],
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header>
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            IVO · Índice de Vitalidade Organizacional
          </p>
          <h1 className="mt-2 font-serif text-3xl text-foreground">
            Vitalidade que conecta pessoas, vínculos, liderança e sistema institucional
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">medir • aprender • transformar • comprovar</p>
        </header>

        <section aria-labelledby="ivo-org-title" aria-live="polite" className="space-y-3">
          <h2 id="ivo-org-title" className="sr-only">Leitura da organização</h2>
          {reading.state === "loading" ? <IvoLoading label="Verificando sua sessão e a leitura Q2 da organização…" /> : null}
          {reading.state === "network_error" ? (
            <IvoAccessNotice
              category="backend"
              message="Falha de comunicação com o servidor. Nenhum dado foi exibido no lugar."
              redirectTo="/ivo-integral"
              onRetry={() => void load()}
            />
          ) : null}
          {reading.state === "done" && !reading.outcome.ok ? (
            <IvoAccessNotice
              category={reading.outcome.category}
              message={reading.outcome.error}
              redirectTo="/ivo-integral"
              onRetry={() => void load()}
            />
          ) : null}
          {reading.state === "done" && reading.outcome.ok && reading.outcome.state === "no_wave" ? (
            <div role="note" className="rounded-md border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium text-foreground">A organização ainda não tem onda FIB-T</p>
              <p className="mt-1 text-muted-foreground">
                Sem onda não há leitura Q2 — e ausência de dados não é zero. Crie a onda pelo painel administrativo.
              </p>
            </div>
          ) : null}
          {view ? (
            <div className="rounded-md border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">
                {view.organizationName} · ciclo {view.cycleKey}
              </p>
              <p className="mt-1 text-base text-foreground">
                Q2 · FIB-T {view.methodology.waveInstrumentVersion}: {SUMMARY_LABEL[view.overall]}.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href="/ivo-integral/q2"
                  className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Ver leitura Q2
                </a>
                <a
                  href="/ivo-integral/acoes"
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Prioridades e ações do ciclo
                </a>
              </div>
            </div>
          ) : null}
        </section>

        <IvoLensMatrix matrix={matrix} />
        <p className="text-xs text-muted-foreground">
          A FIB-T é a primeira lente funcional (Q2). COPSOQ, PERMA+V e VIA-T estão planejadas e não
          produzem leitura. Associações entre lentes e dimensões dependem de aprovação metodológica;
          enquanto não houver, nenhuma dimensão recebe valor.
        </p>
      </div>
    </AppShell>
  );
}
