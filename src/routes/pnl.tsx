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
  absence: { label: "Absências", unit: "dias de ausência", detail: "Estime o custo evitável de dias de trabalho perdidos.", reference: "100", alternative: "75", unitValue: "300", actionCost: "6000" },
  turnover: { label: "Rotatividade", unit: "saídas", detail: "Explore o custo evitável de substituir pessoas que saem da equipe.", reference: "16", alternative: "12", unitValue: "1800", actionCost: "6000" },
  presenteeism: { label: "Presenteísmo", unit: "horas de produtividade perdida", detail: "Explore a perda estimada de produtividade enquanto a pessoa está trabalhando.", reference: "140", alternative: "100", unitValue: "40", actionCost: "6000" },
} as const;
type OutcomeId = keyof typeof OUTCOMES;
type Inputs = Record<"reference" | "alternative" | "unitValue" | "actionCost", string>;

function exampleInputs(id: OutcomeId): Inputs {
  const { reference, alternative, unitValue, actionCost } = OUTCOMES[id];
  return { reference, alternative, unitValue, actionCost };
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const units = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 });
const read = (value: string) => value.trim() === "" ? NaN : Number(value);
const inputClass = "mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function PnLPage() {
  const [outcomeId, setOutcomeId] = useState<OutcomeId>("absence");
  const [inputs, setInputs] = useState<Inputs>(() => exampleInputs("absence"));
  const [edited, setEdited] = useState<Partial<Record<keyof Inputs, true>>>({});
  const outcome = OUTCOMES[outcomeId];
  function loadExample(id: OutcomeId) {
    setOutcomeId(id);
    setInputs(exampleInputs(id));
    setEdited({});
  }
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
        <fieldset className="min-w-0 space-y-3">
          <legend className="font-serif text-xl">Escolha um exemplo</legend>
          <p className="text-sm text-muted-foreground">Cada opção carrega quatro premissas fictícias para 12 meses. Você pode editar os valores abaixo.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(OUTCOMES) as OutcomeId[]).map((id) => (
              <label key={id} className="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
                <input type="radio" name="outcome" value={id} checked={outcomeId === id}
                  onChange={() => loadExample(id)} className="mt-0.5 size-4 shrink-0 accent-primary" />
                <span className="min-w-0">
                  <span className="block font-semibold">{OUTCOMES[id].label}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{OUTCOMES[id].detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section aria-labelledby="pnl-input-title" className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 id="pnl-input-title" className="font-serif text-xl">Premissas do cenário</h2>
            {fields.map(([id, label, max]) => (
              <div key={id}>
                <label htmlFor={`pnl-${id}`} className="text-sm font-medium">{label}</label>
                <input id={`pnl-${id}`} type="number" min={0} max={max} step="0.01" value={inputs[id]}
                  aria-describedby={`pnl-source-${id}`} className={inputClass} onChange={(event) => {
                    setInputs({ ...inputs, [id]: event.target.value });
                    setEdited({ ...edited, [id]: true });
                  }} />
                <p id={`pnl-source-${id}`} className="mt-1 text-xs text-muted-foreground">{edited[id] ? "Editado por você" : "Valor fictício do exemplo"}</p>
              </div>
            ))}
            <button type="button" onClick={() => loadExample(outcomeId)} className="min-h-11 text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
              Restaurar valores do exemplo
            </button>
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
              <div className="rounded-xl bg-muted/35 p-3 text-sm">
                <h3 className="font-semibold">Confira a conta</h3>
                <p className="mt-1 break-words text-muted-foreground">
                  A diferença é de {units.format(result.delta)} em {outcome.unit}. Multiplique pelo valor evitável por unidade para obter {brl.format(result.avoidedValue)} de valor bruto. Desconte o custo da ação para chegar a {brl.format(result.netValue)}.
                </p>
              </div>
              <table className="w-full table-fixed text-left text-sm">
                <caption className="mb-2 text-left font-medium">Sensibilidade à diferença entre cenários</caption>
                <thead><tr className="border-b border-border"><th scope="col" className="py-2">Hipótese</th><th scope="col">Diferença em unidades</th><th scope="col">Saldo em reais</th></tr></thead>
                <tbody>{sensitivity.map(({ factor, difference, value }) => (
                  <tr key={factor} className="border-b border-border">
                    <th scope="row" className="py-2 font-normal">{factor === 0 ? "Sem mudança" : factor === 0.5 ? "Metade da diferença" : "Diferença informada"}</th>
                    <td className="break-words tabular-nums">{units.format(difference)}</td>
                    <td className="break-words tabular-nums">{value ? brl.format(value.netValue) : "Indisponível"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </> : <p role="status" className="text-sm text-muted-foreground">Preencha todos os campos com valores de zero até 1.000.000 unidades ou R$ 10.000.000, conforme o campo. O resultado fica indisponível até que a entrada seja válida.</p>}
            <p className="text-sm text-muted-foreground">O saldo depende da mudança hipotética informada. Para evitar dupla contagem, calcule um desfecho por vez e considere apenas custos efetivamente evitáveis.</p>
          </section>
        </div>
        <IvoMethodSheet view="pnl">
          <p className="text-sm text-muted-foreground">Horizonte fixo de 12 meses, moeda BRL. Os valores unitários e o custo da ação são arredondados para centavos. O resultado bruto arredonda a multiplicação para centavos. A edição ocorre nesta página e os valores não são gravados.</p>
        </IvoMethodSheet>
      </div>
    </AppShell>
  );
}
