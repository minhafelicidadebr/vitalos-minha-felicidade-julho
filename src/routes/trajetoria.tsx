import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AppShell } from "@/app/shell/AppShell";
import { IvoMethodHeader, IvoMethodSheet } from "@/components/ivo/IvoMethodHeader";
import { usePack } from "@/engine/pack";
import { calculateIVO } from "@/engine/index/ivo-engine";
import { projectForecast, SCENARIO_FACTOR, type ForecastScenario } from "@/engine/forecast/forecast-engine";
import { compareForecastScenarios } from "@/engine/forecast/scenario-comparison";
import { ivoCurrentCycle } from "@/mocks/ivo-mock";
import { FORECAST_LEVERS, pillarsFromIvo } from "@/mocks/forecast-mock";

export const Route = createFileRoute("/trajetoria")({
  head: () => ({ meta: [{ title: "Cenários de evolução · VitalOS" }] }),
  component: TrajetoriaPage,
});

const SCENARIOS: { id: ForecastScenario; label: string }[] = [
  { id: "conservador", label: "Conservador" }, { id: "medio", label: "Médio" }, { id: "otimista", label: "Otimista" },
];
const signed = (value: number) => value > 0 ? `+${value}` : String(value);
const weightFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 10 });
const selectClass = "mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function TrajetoriaPage() {
  const { index, status } = usePack();
  const [active, setActive] = useState<string[]>(["energia_carga", "reconhecimento"]);
  const [scenario, setScenario] = useState<ForecastScenario>("medio");
  const [seasons, setSeasons] = useState(4);
  const pillars = useMemo(() => index ? pillarsFromIvo(calculateIVO(ivoCurrentCycle, index)) : null, [index]);
  const forecast = useMemo(() => {
    if (!pillars) return null;
    return projectForecast({
      pillars,
      levers: FORECAST_LEVERS, activeLeverIds: active, seasons, scenario,
    });
  }, [pillars, active, seasons, scenario]);
  const rows = forecast ? compareForecastScenarios(forecast) : [];
  const final = rows.at(-1);

  return (
    <AppShell>
      <div className="mx-auto min-w-0 max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <IvoMethodHeader view="trajectory" title="Explore cenários de evolução"
          description="Compare uma referência de estabilidade com hipóteses de ação. Veja quais premissas mudam a trajetória."
          status="Simulação ilustrativa · dados sintéticos · escala demonstrativa de 0 a 1.000" />
        {status.state === "loading" || status.state === "idle" ? <p role="status">Carregando métricas de demonstração…</p> :
          status.state === "error" ? <p role="alert">A configuração do índice ficou indisponível. Recarregue a página para tentar novamente.</p> :
          !forecast || !final ? <p role="status">Este segmento ainda não tem um índice para simular.</p> : <>
          <section aria-labelledby="traj-controls" className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 id="traj-controls" className="font-serif text-xl">Monte o cenário alternativo</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Intensidade suposta
                <select className={selectClass} value={scenario} onChange={(event) => setScenario(event.target.value as ForecastScenario)}>
                  {SCENARIOS.map(({ id, label }) => <option key={id} value={id}>{label} · ×{SCENARIO_FACTOR[id].toLocaleString("pt-BR")}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">Horizonte
                <select className={selectClass} value={seasons} onChange={(event) => setSeasons(Number(event.target.value))}>
                  {[2, 4, 8].map((n) => <option key={n} value={n}>{n} temporadas</option>)}
                </select>
              </label>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Ações incluídas</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {FORECAST_LEVERS.map((lever) => <label key={lever.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary/65 has-[:checked]:bg-primary/5">
                  <input className="mt-1 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2" type="checkbox" checked={active.includes(lever.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setActive((previous) => checked ? [...previous, lever.id] : previous.filter((id) => id !== lever.id));
                    }} />
                  <span><strong className="block">{lever.label}</strong><span className="text-muted-foreground">{lever.description}</span></span>
                </label>)}
              </div>
              <button type="button" onClick={() => setActive([])} className="mt-2 min-h-11 text-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">Usar hipótese de ausência de efeito</button>
            </fieldset>
          </section>
          <section aria-labelledby="traj-results" className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 id="traj-results" className="font-serif text-xl">Compare as duas trajetórias</h2>
            <p aria-live="polite" className="text-sm text-muted-foreground">Temporada {seasons}: {final.reference} pontos na referência, {final.alternative} na alternativa ({signed(final.alternative - final.reference)} pontos). Ambos são cenários de demonstração.</p>
            <div aria-hidden="true" className="h-48 min-w-0 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ left: 0, right: 12, top: 8, bottom: 3 }}>
                  <XAxis dataKey="season" tickLine={false} />
                  <YAxis domain={[0, 1000]} width={42} tickLine={false} />
                  <Line dataKey="reference" stroke="var(--muted-foreground)" strokeDasharray="6 5" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="alternative" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground">Linha tracejada: referência. Linha contínua com pontos: alternativa.</p>
            <details className="rounded-lg border border-border p-3">
              <summary className="flex min-h-11 cursor-pointer items-center font-medium focus-visible:outline-2 focus-visible:outline-offset-2">Ver tabela de pontos por temporada</summary>
              <table className="w-full table-fixed text-left text-sm">
                <caption className="sr-only">Cenários sintéticos na escala de 0 a 1.000</caption>
                <thead><tr><th scope="col">Temporada</th><th scope="col">Referência</th><th scope="col">Alternativa</th></tr></thead>
                <tbody>{rows.map((row) => <tr className="border-t border-border" key={row.season}><th scope="row" className="py-1.5 font-normal">{row.season === 0 ? "Base" : row.season}</th><td>{row.reference}</td><td>{row.alternative}</td></tr>)}</tbody>
              </table>
            </details>
          </section>
        </>}
        <IvoMethodSheet view="trajectory">
          <p className="text-sm text-muted-foreground">As diferenças dependem de alavancas, pesos e hipóteses internas. Esta tela não calcula intervalos probabilísticos. Para acompanhar uma organização, abra a leitura por lente.</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {FORECAST_LEVERS.map((lever) => <li key={lever.id}>{lever.label}: {lever.pointsPerSeason} pontos base por temporada nos pilares {lever.targetPillarIds.map((id) => id.replaceAll("_", " ")).join(", ")}.</li>)}
          </ul>
          {pillars && <details className="rounded-lg border border-border p-3">
            <summary className="flex min-h-11 cursor-pointer items-center font-medium focus-visible:outline-2 focus-visible:outline-offset-2">Ver valores e pesos da base sintética</summary>
            <p className="mb-2 text-sm text-muted-foreground">A cada temporada, multiplique os pontos de cada pilar pelo peso e arredonde a soma. Pilares protegidos conservam o valor neutro fixo de 500 nesta demonstração.</p>
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Valores iniciais e pesos sintéticos</caption>
              <thead><tr><th scope="col" className="w-1/2">Pilar</th><th scope="col">Pontos</th><th scope="col">Peso</th></tr></thead>
              <tbody>{pillars.map((pillar) => <tr className="border-t border-border" key={pillar.pillarId}><th scope="row" className="py-1.5 pr-2 font-normal">{pillar.name}</th><td>{pillar.visible ? pillar.score : "Protegido"}</td><td>{weightFormat.format(pillar.weight)}</td></tr>)}</tbody>
            </table>
          </details>}
          <div className="flex flex-wrap gap-4">
            <Link to="/ivo-integral" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">Abrir Visão IVO</Link>
            <Link to="/pnl" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">Simular um desfecho econômico</Link>
          </div>
        </IvoMethodSheet>
      </div>
    </AppShell>
  );
}
