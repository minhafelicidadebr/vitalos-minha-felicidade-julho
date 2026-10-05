import { DIMENSION_COVERAGE_LABEL, type DimensionCoverageState, type IvoCoverage } from "@/engine/ivo/ivo-coverage";

// Cobertura por dimensão (ADR-005). Mostra ESTADO e MOTIVO, nunca número: enquanto
// não houver mapeamento aprovado e método aprovado, o IVO não tem valor. Estado é
// sempre texto (não só cor); "sem número" é dito, não presumido.
const TONE: Record<DimensionCoverageState, string> = {
  sem_medicao: "border-border",
  suprimido: "border-amber-600/50",
  nao_coberto: "border-dashed border-muted-foreground/50",
  mapeamento_pendente: "border-sky-600/40",
  metodo_pendente: "border-sky-600/40",
  desatualizado: "border-amber-600/50",
  elegivel: "border-emerald-600/50",
};

export function IvoCoveragePanel({ coverage }: { coverage: IvoCoverage }) {
  return (
    <section aria-labelledby="ivo-cobertura-title" className="space-y-3 rounded-md border border-border bg-background p-4">
      <div>
        <h2 id="ivo-cobertura-title" className="font-serif text-xl text-foreground">
          Cobertura por dimensão
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mostra o que a leitura publicada permite afirmar sobre cada dimensão. Ausência, proteção e pendência não são zero.
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {coverage.dimensions.map((d) => (
          <li key={d.dimension} className={`rounded-md border p-3 text-sm ${TONE[d.state]}`}>
            <p className="font-medium text-foreground">{d.label}</p>
            <p className="mt-1 text-foreground">
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Situação: </span>
              {DIMENSION_COVERAGE_LABEL[d.state]}
            </p>
            <p className="mt-1 text-muted-foreground">{d.reason}</p>
          </li>
        ))}
      </ul>
      <div role="note" className="rounded-md border border-dashed border-muted-foreground/40 p-3 text-sm">
        <p className="font-medium text-foreground">
          {coverage.indexEligible ? "Índice IVO: elegível para cálculo pelo método aprovado" : "Índice IVO: sem número"}
        </p>
        {coverage.indexBlockers.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
            {coverage.indexBlockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {coverage.stalenessPolicy === "nao_definida"
            ? "A janela de validade das leituras ainda não foi definida; nenhuma leitura é tratada como desatualizada."
            : "Janela de validade definida pelo método vigente."}
        </p>
      </div>
    </section>
  );
}
