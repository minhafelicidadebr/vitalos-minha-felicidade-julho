import { Network, Info } from "lucide-react";
import { buildSyntheticMatrix, reviewSyntheticMatrix } from "@/lib/reports/mete-esg-matrix";

export function MeteEsgMatrixPreview() {
  const matrix = buildSyntheticMatrix();
  return (
    <section aria-label="Matriz sintética METE e contribuição ESG" className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Protótipo sintético · matriz {matrix.version}</p>
      <h3 className="flex items-start gap-2 font-serif text-xl"><Network aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />Da ação à evidência: intersecções propostas</h3>
      <p className="text-sm leading-relaxed">{matrix.note} Papéis abaixo são ilustrativos; sua presença não concede acesso nem atribui mérito causal.</p>
      <p className="rounded-lg border border-border bg-muted/20 p-3 text-sm">{matrix.uniqueExecutionEvents} registros únicos de transformação visíveis no exemplo. Vários perfis ou temas ESG não duplicam uma execução. Não é uma taxa de impacto.</p>
      <section aria-label="Pré-revisão do contrato de evidência" className="space-y-3 rounded-lg border border-border p-3 text-sm">
        <h4 className="font-semibold">O que falta para revisar a emissão</h4>
        <p>Verificação estrutural sintética. Não autentica revisores, resolve fontes ou autoriza emissão. Cada eixo exige decisão própria; os exemplos não têm aprovação registrada.</p>
        <div className="grid gap-3 sm:grid-cols-2">{reviewSyntheticMatrix().map((item, index) => <div key={index} className="min-w-0 rounded-lg bg-muted/20 p-3"><p className="font-semibold">{item.title}</p>{item.reviews.map((review, i) => <div key={i} className="mt-2"><p className="font-medium">{review.axis} · {review.result.status === "protected" ? "Protegido" : "Revisão bloqueada"}</p><ul className="mt-1 list-disc space-y-1 pl-5">{review.result.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>)}</div>)}</div>
      </section>
      <div role="region" aria-label="Matriz resumida de cinco casos sintéticos" tabIndex={0} className="max-w-full overflow-x-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        <table className="w-full min-w-[46rem] text-left text-sm leading-relaxed"><caption className="pb-3 text-left text-muted-foreground">Relação temática, evidência e mudança são campos diferentes. Detalhes e fontes abaixo.</caption><thead><tr>{["Ação e driver", "Etapa e perfil", "Vínculo ESG", "Evidência e mudança"].map(label => <th scope="col" key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{matrix.rows.map((row,index) => <tr key={index} className="border-t border-border align-top"><th scope="row" className="p-3 font-medium">{row.title}<p className="mt-1 font-normal text-muted-foreground">{row.driver}</p></th><td className="p-3">{row.phases}<p className="mt-2 text-muted-foreground">{row.roles}</p></td><td className="p-3">{row.links}</td><td className="p-3">{row.state}<p className="mt-2">{row.change.text}</p></td></tr>)}</tbody></table>
      </div>
      <div className="space-y-3">{matrix.rows.map((row,index) => <details key={index} className="min-w-0 rounded-lg border border-border p-3 text-sm leading-relaxed"><summary className="min-h-11 cursor-pointer py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{row.title} · ficha analítica</summary><dl className="mt-3 grid gap-3 break-words sm:grid-cols-2 [&>div]:min-w-0 [&>div]:rounded-lg [&>div]:bg-muted/20 [&>div]:p-3"><div><dt className="font-semibold">Observação e fonte</dt><dd className="mt-1">{row.observation}<p className="mt-2">{row.source}</p></dd></div><div><dt className="font-semibold">Mudança e atribuição</dt><dd className="mt-1">{row.change.text}<p className="mt-2">{row.change.attribution}</p></dd></div><div><dt className="font-semibold">Limites</dt><dd className="mt-1">{row.limitation}</dd></div><div><dt className="font-semibold">Próxima revisão</dt><dd className="mt-1">{row.nextStep}</dd></div></dl></details>)}</div>
      <p className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm leading-relaxed"><Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />Magnitude de impacto e intervalo de confiança não são preenchidos por aproximação visual. Uma mudança descritiva pode ser mostrada na sua unidade, sem atribuição causal.</p>
    </section>
  );
}
