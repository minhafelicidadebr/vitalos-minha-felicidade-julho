import type { IvoMatrix, IvoMatrixCell } from "@/engine/ivo/ivo-matrix";
import type { LensPublicationState } from "@/engine/ivo/lens-contract";

// Matriz IVO 4 × 4 (spec ivo-dashboard.md). Mostra ESTADO, nunca pontuação:
// não existe índice composto nem mapeamento lente→dimensão aprovado.

const STATE_LABEL: Record<LensPublicationState, string> = {
  planned: "Planejada",
  prepared: "Preparada",
  collecting: "Em coleta",
  protected: "Protegida",
  published: "Publicada",
  concluded: "Concluída",
};

const STATE_TONE: Record<LensPublicationState, string> = {
  planned: "border-dashed border-muted-foreground/40 text-muted-foreground",
  prepared: "border-border text-foreground",
  collecting: "border-sky-600/40 text-foreground",
  protected: "border-amber-600/50 text-foreground",
  published: "border-emerald-600/50 text-foreground",
  concluded: "border-border text-muted-foreground",
};

function evidenceText(cell: IvoMatrixCell): string {
  if (cell.availability === "planned") return "Lente ainda não disponível";
  if (cell.mapping === "none") return "Sem mapeamento aprovado para esta dimensão";
  if (cell.mapping === "proposed") return "Mapeamento proposto, aguardando aprovação";
  if (cell.evidence.length === 0) return "Mapeamento aprovado, sem leitura publicada";
  const cohorts = cell.evidence.reduce((total, e) => total + e.cohortKeys.length, 0);
  return `Evidência em ${cohorts} ${cohorts === 1 ? "recorte publicado" : "recortes publicados"}`;
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
      <div className={`min-h-24 rounded-md border bg-background p-3 text-sm ${STATE_TONE[cell.publicationState]}`}>
        <p className="font-medium">{STATE_LABEL[cell.publicationState]}</p>
        {cell.instrumentVersion ? (
          <p className="mt-1 text-xs text-muted-foreground">Versão {cell.instrumentVersion}</p>
        ) : null}
        {measured ? <p className="mt-1 text-xs text-muted-foreground">Última leitura: {measured}</p> : null}
        <p className="mt-2 text-xs text-muted-foreground">{evidenceText(cell)}</p>
        {cell.detailRoute && cell.availability === "functional" ? (
          <a
            href={cell.detailRoute}
            className="mt-2 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0">
          <caption className="sr-only">
            Matriz de quatro dimensões por quatro lentes trimestrais, com o estado de cada lente.
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
