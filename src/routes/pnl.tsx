import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/app/shell/AppShell";
import { IvoMethodHeader, IvoMethodSheet } from "@/components/ivo/IvoMethodHeader";
import { calculateOutcomeScenario } from "@/engine/pnl/outcome-scenario";

export const Route = createFileRoute("/pnl")({
  head: () => ({ meta: [{ title: "Custos e ponto de equilíbrio · VitalOS" }] }),
  component: PnLPage,
});

const OUTCOMES = {
  absence: { label: "Absências", unit: "dias de ausência", reference: "100", alternative: "75", unitValue: "300", actionCost: "6000" },
  turnover: { label: "Rotatividade", unit: "saídas", reference: "16", alternative: "12", unitValue: "1800", actionCost: "6000" },
  presenteeism: { label: "Presenteísmo", unit: "horas de trabalho estimadas", reference: "140", alternative: "100", unitValue: "40", actionCost: "6000" },
} as const;
type OutcomeId = keyof typeof OUTCOMES;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const units = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 });
const read = (value: string) => value.trim() === "" ? NaN : Number(value);
const inputClass = "mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function PnLPage() {
  const [outcomeId, setOutcomeId] = useState<OutcomeId>("absence");
  const [inputs, setInputs] = useState({
    reference: OUTCOMES.absence.reference as string,
    alternative: OUTCOMES.absence.alternative as string,
    unitValue: OUTCOMES.absence.unitValue as string,
    actionCost: OUTCOMES.absence.actionCost as string,
  });
  const outcome = OUTCOMES[outcomeId];
  const result = calculateOutcomeScenario({
    reference: read(inputs.reference), alternative: read(inputs.alternative),
    unitValue: read(inputs.unitValue), actionCost: read(inputs.actionCost),
  });
  const fields = [
    ["reference", `Referência (${outcome.unit})`, 1_000_000],
    ["alternative", `Cenário (${outcome.unit})`, 1_000_000],
    ["unitValue", "Valor efetivamente evitável por unidade (R$)", 10_000_000],
    ["actionCost", "Custo adicional da ação (R$)", 10_000_000],
  ] as const;

  const sensitivity = result ? [0, 0.5, 1].map((factor) => {
    const difference = result.delta * factor;
    const value = calculateOutcomeScenario({ reference: read(inputs.reference), alternative: read(inputs.reference) - difference, unitValue: read(inputs.unitValue), actionCost: read(inputs.actionCost) });
    return { factor, difference, value };
  }) : [];

  return (
    <AppShell>
      <div className="mx-auto min-w-0 max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <IvoMethodHeader view="pnl" title="Entenda o custo e o ponto de equilíbrio"
          description="Calcule quanto um desfecho precisaria mudar para cobrir o custo de uma ação. Compare hipóteses sobre o mesmo período."
          status="Simulação · exemplo editável · 12 meses · perspectiva da organização" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section aria-labelledby="pnl-input-title" className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 id="pnl-input-title" className="font-serif text-xl">Premissas do cenário</h2>
            <label className="block text-sm font-medium">Desfecho
              <select className={inputClass} value={outcomeId} onChange={(event) => {
                const selected = event.target.value as OutcomeId;
                const { reference, alternative, unitValue, actionCost } = OUTCOMES[selected];
                setOutcomeId(selected);
                setInputs({ reference, alternative, unitValue, actionCost });
              }}>
                {Object.entries(OUTCOMES).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
              </select>
            </label>
            {fields.map(([id, label, max]) => (
              <label key={id} className="block text-sm font-medium">{label}
                <input type="number" min={0} max={max} step="0.01" value={inputs[id]}
                  className={inputClass} onChange={(event) => setInputs({ ...inputs, [id]: event.target.value })} />
              </label>
            ))}
            <p className="text-sm text-muted-foreground">Os valores iniciais são fictícios. Use a mesma unidade e o mesmo período nos dois cenários.</p>
          </section>
          <section aria-labelledby="pnl-result-title" className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 id="pnl-result-title" className="font-serif text-xl">O que seria necessário</h2>
            {result ? <>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-3">
                  <dt className="text-sm text-muted-foreground">Para cobrir o custo da ação</dt>
                  <dd className="mt-1 break-words font-serif text-2xl">{result.breakEvenUnits === null ? "Indisponível" : `${units.format(result.breakEvenUnits)} unidades`}</dd>
                  <p className="mt-1 text-sm text-muted-foreground">{result.breakEvenUnits === null ? "Informe um valor evitável positivo por unidade." : `Valor aproximado em ${outcome.unit}.`}</p>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <dt className="text-sm text-muted-foreground">Resultado líquido do cenário</dt>
                  <dd className="mt-1 break-words font-serif text-2xl tabular-nums">{brl.format(result.netValue)}</dd>
                  <p className="mt-1 text-sm text-muted-foreground">Valor evitável bruto: {brl.format(result.avoidedValue)}.</p>
                </div>
              </dl>
              <table className="w-full table-fixed text-left text-sm">
                <caption className="mb-2 text-left font-medium">Sensibilidade à diferença entre cenários</caption>
                <thead><tr className="border-b border-border"><th scope="col" className="py-2">Hipótese</th><th scope="col">Diferença em unidades</th><th scope="col">Saldo em reais</th></tr></thead>
                <tbody>{sensitivity.map(({ factor, difference, value }) => (
                  <tr key={factor} className="border-b border-border">
                    <th scope="row" className="py-2 font-normal">{factor === 0 ? "Sem mudança" : factor === 0.5 ? "Metade" : "Informada"}</th>
                    <td className="break-words tabular-nums">{units.format(difference)}</td>
                    <td className="break-words tabular-nums">{value ? brl.format(value.netValue) : "Indisponível"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </> : <p role="status" className="text-sm text-muted-foreground">Preencha todos os campos com valores de zero até 1.000.000 unidades ou R$ 10.000.000, conforme o campo. O resultado fica indisponível até que a entrada seja válida.</p>}
            <p className="text-sm text-muted-foreground">A alteração informada é uma hipótese. Use apenas custos efetivamente evitáveis e evite contar a mesma perda em mais de um desfecho.</p>
          </section>
        </div>
        <IvoMethodSheet view="pnl">
          <p className="text-sm text-muted-foreground">Horizonte fixo de 12 meses, moeda BRL. Os valores unitários e o custo da ação são arredondados para centavos. O resultado bruto arredonda a multiplicação para centavos. A edição ocorre nesta página e os valores não são gravados.</p>
        </IvoMethodSheet>
      </div>
    </AppShell>
  );
}
