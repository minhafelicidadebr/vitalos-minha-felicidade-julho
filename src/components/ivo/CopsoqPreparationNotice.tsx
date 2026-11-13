import { getCopsoqManifest } from "@/domain/survey/copsoq-instrument-manifest";

// Preparação operacional de Q1. A confirmação informada pelo operador ainda
// precisa ser vinculada à fonte exata; o manifesto demonstrativo não a substitui.
export function CopsoqPreparationNotice() {
  const manifest = getCopsoqManifest();
  return (
    <section aria-labelledby="copsoq-preparation-title" className="space-y-3 rounded-md border border-border bg-card p-4 text-card-foreground">
      <h2 id="copsoq-preparation-title" className="font-serif text-xl">Q1 · COPSOQ — preparação da aplicação</h2>
      <p className="text-sm">A aplicação empresarial aguarda a correspondência entre a fonte brasileira aprovada e o instrumento servido.</p>
      <dl className="space-y-1 text-sm text-muted-foreground">
        <div><dt className="inline font-medium">Versão no sistema: </dt><dd className="inline">{manifest.version}</dd></div>
        <div><dt className="inline font-medium">Instrumento servido: </dt><dd className="inline">{manifest.served_name}</dd></div>
      </dl>
      <p role="note" className="text-sm text-muted-foreground">
        A fonte exata deve permitir conferir itens, escalas, reversões, ausências, cálculo e atribuição.
        Enquanto essa conferência estiver pendente, coleta e publicação empresariais de Q1 permanecem indisponíveis nesta jornada.
        Você pode continuar a jornada Q2 independentemente de Q1.
      </p>
      <a href="/ivo-integral/governanca" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Consultar pendências metodológicas</a>
    </section>
  );
}
