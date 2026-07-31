// Painel FIB-T alimentado por PERSISTENCIA REAL (FIBT-1).
//
// Diferenca deliberada em relacao a /fibt: aquela rota mostra um agregado
// ficticio de demonstracao; esta le o banco. As duas nunca se misturam --
// nao existe caminho em que esta tela caia para FIBT_ORG_RESULT ou qualquer
// outro mock. Se o backend falhar, a tela diz que falhou.

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/app/shell/AppShell";
import {
  loadFibtCohortReport,
  loadWaveCohorts,
  type CohortRef,
} from "@/lib/api/fibt-cohort.functions";
import type { FibtCohortReport } from "@/lib/fibt/fibt-cohort-report";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { findInstrumentAuthorization } from "@/domain/instruments/instrument-usage-authorization";

export const Route = createFileRoute("/fibt-piloto")({
  head: () => ({ meta: [{ title: "FIB-T · Piloto (dados reais) — 4 Lentes VitalOS™" }] }),
  component: FibtPilotoPage,
});

type Estado =
  | { t: "carregando" }
  | { t: "vazio"; motivo: string }
  | { t: "erro"; motivo: string }
  | { t: "ok"; coortes: CohortRef[]; relatorios: Record<string, FibtCohortReport> };

function FibtPilotoPage() {
  const [waveId, setWaveId] = useState("");
  const [estado, setEstado] = useState<Estado>({ t: "vazio", motivo: "Informe a onda para carregar." });
  const manifest = getFibtManifest();
  const auth = findInstrumentAuthorization("fib_t");

  const carregar = useCallback(async (id: string) => {
    if (!id.trim()) {
      setEstado({ t: "vazio", motivo: "Informe a onda para carregar." });
      return;
    }
    setEstado({ t: "carregando" });

    const cohorts = await loadWaveCohorts(id.trim());
    if (cohorts.estado !== "ok") {
      setEstado({ t: "erro", motivo: cohorts.motivo });
      return;
    }
    if (cohorts.coortes.length === 0) {
      setEstado({ t: "vazio", motivo: "Esta onda ainda nao tem coortes registradas." });
      return;
    }

    const relatorios: Record<string, FibtCohortReport> = {};
    for (const c of cohorts.coortes) {
      const r = await loadFibtCohortReport(id.trim(), c.id);
      if (r.estado !== "ok") {
        setEstado({ t: "erro", motivo: r.motivo });
        return;
      }
      relatorios[c.id] = r.relatorio;
    }
    setEstado({ t: "ok", coortes: cohorts.coortes, relatorios });
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("wave");
    if (q) {
      setWaveId(q);
      void carregar(q);
    }
  }, [carregar]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            FIB-T · piloto · dados reais
          </p>
          <h1 className="mt-1 font-serif text-3xl text-foreground">Resultado por coorte</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Lido da persistencia real, com supressao aplicada no proprio banco. Esta tela nao
            usa dados de demonstracao: se o backend falhar, ela informa a falha.
          </p>
        </header>

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void carregar(waveId);
          }}
        >
          <div className="flex-1">
            <label htmlFor="wave" className="text-xs text-muted-foreground">
              Identificador da onda
            </label>
            <input
              id="wave"
              value={waveId}
              onChange={(e) => setWaveId(e.target.value)}
              placeholder="UUID da onda"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Carregar
          </button>
        </form>

        {estado.t === "carregando" && (
          <p role="status" className="text-sm text-muted-foreground">
            Carregando resultado da onda...
          </p>
        )}

        {estado.t === "vazio" && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">{estado.motivo}</p>
          </div>
        )}

        {estado.t === "erro" && (
          <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
            <p className="text-sm font-medium text-destructive">Nao foi possivel carregar</p>
            <p className="mt-1 text-xs text-muted-foreground">{estado.motivo}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Nenhum dado de demonstracao foi exibido no lugar do resultado real.
            </p>
          </div>
        )}

        {estado.t === "ok" &&
          estado.coortes.map((c) => {
            const r = estado.relatorios[c.id]!;
            return (
              <section
                key={c.id}
                className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
                data-testid={`coorte-${c.key}`}
              >
                <h2 className="font-serif text-lg text-foreground">{c.label}</h2>

                {r.status === "suprimido" && (
                  <div className="mt-2 rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground" data-testid="suprimido">
                      {r.motivo}
                    </p>
                  </div>
                )}

                {r.status === "incompleto" && (
                  <div className="mt-2 rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">{r.motivo}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Itens sem valor valido: {r.itensAusentes.join(", ")}
                    </p>
                  </div>
                )}

                {r.status === "ok" && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">
                      Escore bruto · {r.n} respostas
                    </p>
                    <p className="font-serif text-4xl text-foreground">
                      {r.resultado.escoreBruto}
                      <span className="text-base text-muted-foreground"> / 12</span>
                    </p>
                    <ul className="mt-3 space-y-1">
                      {r.resultado.factors.map((f) => (
                        <li key={f.id} className="flex justify-between text-sm">
                          <span className="text-card-foreground">{f.name}</span>
                          <span className="text-muted-foreground">{f.mean} / 4</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })}

        <div className="rounded-r-xl border-l-4 border-amber-400 bg-amber-50/60 px-5 py-4 dark:bg-amber-950/20" role="note">
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            FIB-T (Furtado, 2020), manifesto {manifest.instrument_version}. Escore bruto de 0 a 12,
            soma das medias dos 3 Fatores. O instrumento nao define faixa interpretativa nem indice
            normalizado. Resultados sempre agregados, com supressao de grupos pequenos.
            {auth ? ` Coleta operacional: ${auth.operational_real_collection_status}.` : ""}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
