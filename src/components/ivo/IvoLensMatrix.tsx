import type { IvoMatrix, IvoMatrixCell, LensResultState } from "@/engine/ivo/ivo-matrix";

// Matriz IVO 4 × 4 (spec ivo-dashboard.md). Mostra ESTADO, nunca pontuação:
// não existe índice composto nem mapeamento lente→dimensão aprovado.
//
// Cada célula responde três perguntas separadas, sempre em texto (não só cor):
//   Lente      — a lente existe neste produto?
//   Resultado  — a lente tem resultado nativo publicado, protegido, em coleta?
//   Dimensão   — o resultado conta para ESTA dimensão? (exige mapeamento aprovado)

const RESULT_TONE: Record<LensResultState, string> = {
  not_applicable: "border-dashed border-muted-foreground/40 text-muted-foreground",
  no_reading: "border-border text-foreground",
  no_data: "border-border text-foreground",
  collecting: "border-sky-600/40 text-foreground",
  protected: "border-amber-600/50 text-foreground",
  available: "border-emerald-600/50 text-foreground",
};

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function lensResultText(cell: IvoMatrixCell): string {
  const summary = cell.cohortSummary;
  switch (cell.resultState) {
    case "not_applicable":
      return "Não se aplica";
    case "no_reading":
      return "Sem leitura carregada";
    case "no_data":
      return "Sem participação registrada";
    case "collecting":
      return "Em coleta, sem resultado publicado";
    case "protected":
      return summary
        ? `Protegido em ${plural(summary.protected, "setor", "setores")} — nenhum valor exibido`
        : "Protegido — nenhum valor exibido";
    case "available": {
      if (!summary) return "Disponível";
      const base = `Disponível em ${summary.published} de ${plural(summary.total, "setor", "setores")}`;
      return summary.protected > 0 ? `${base}; ${summary.protected} protegido(s)` : base;
    }
  }
}

export function dimensionMappingText(cell: IvoMatrixCell): string {
  if (cell.availability === "planned") return "Lente planejada";
  if (cell.mapping === "none") return "Mapeamento dimensional pendente";
  if (cell.mapping === "proposed") return "Mapeamento proposto, aguardando aprovação";
  if (cell.evidence.length === 0) return "Mapeamento aprovado, sem leitura publicada";
  const cohorts = cell.evidence.reduce((total, e) => total + e.cohortKeys.length, 0);
  return `Evidência em ${plural(cohorts, "recorte publicado", "recortes publicados")}`;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("pt-BR");
}

function Cell({ cell }: { cell: IvoMatrixCell }) {
  const measured = formatDate(cell.lastMeasuredAt);
  return (
    <td className="align-top p-2">
      <div className={`min-h-28 rounded-md border bg-background p-3 text-sm ${RESULT_TONE[cell.resultState]}`}>
        <dl className="space-y-1.5">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Lente</dt>
            <dd className="font-medium">{cell.availability === "functional" ? "Disponível" : "Planejada"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Resultado da lente</dt>
            <dd>{lensResultText(cell)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Esta dimensão</dt>
            <dd>{dimensionMappingText(cell)}</dd>
          </div>
        </dl>
        {cell.instrumentVersion ? (
          <p className="mt-2 text-xs text-muted-foreground">Versão {cell.instrumentVersion}</p>
        ) : null}
        {measured ? <p className="text-xs text-muted-foreground">Leitura consultada em {measured}</p> : null}
        {cell.detailRoute && cell.availability === "functional" ? (
          <a
            href={cell.detailRoute}
            className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Abrir análise da lente
          </a>
        ) : null}
      </div>
    </td>
  );
}

export function IvoLensMatrix({ matrix }: { matrix: IvoMatrix }) {
  return (
    <section aria-labelledby="ivo-matrix-title" className="space-y-4">
      <div>
        <h2 id="ivo-matrix-title" className="font-serif text-2xl text-foreground">
          Matriz IVO 4 × 4
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Onde a vitalidade acontece (linhas) e como ela é observada ao longo do ano (colunas).
          A matriz mostra estado e evidência — não existe índice IVO composto aprovado.
        </p>
        {matrix.organizationId === null ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma organização selecionada: exibindo o catálogo de lentes.
          </p>
        ) : null}
      </div>

      {matrix.warnings.length > 0 ? (
        <div role="status" className="rounded-md border border-amber-600/50 bg-amber-50 p-3 text-sm text-foreground">
          <p className="font-medium">Leituras retidas por segurança</p>
          <ul className="mt-1 list-disc pl-5">
            {matrix.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto" tabIndex={0} aria-label="Matriz IVO, role horizontalmente em telas estreitas">
        <table className="w-full min-w-[760px] border-separate border-spacing-0">
          <caption className="sr-only">
            Matriz de quatro dimensões por quatro lentes trimestrais. Cada célula informa se a lente
            existe, o estado do resultado da lente e se há mapeamento aprovado para a dimensão.
          </caption>
          <thead>
            <tr>
              <td className="p-2" />
              {matrix.lenses.map((lens) => (
                <th key={lens.id} scope="col" className="p-2 text-left align-bottom">
                  <span className="block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {lens.quarter}
                  </span>
                  <span className="block font-medium text-foreground">{lens.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {lens.availability === "functional" ? "Disponível" : "Planejada"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.dimension.id}>
                <th scope="row" className="p-2 text-left align-top font-medium text-foreground">
                  {row.dimension.label}
                </th>
                {row.cells.map((cell) => (
                  <Cell key={`${cell.dimension}-${cell.lens}`} cell={cell} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
