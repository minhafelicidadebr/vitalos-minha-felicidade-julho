import { getCopsoqManifest } from "@/domain/survey/copsoq-instrument-manifest";
import { FileCheck2, Fingerprint, ShieldAlert, ArrowRight } from "lucide-react";

// Preparação operacional de Q1. A confirmação informada pelo operador ainda
// precisa ser vinculada à fonte exata; o manifesto demonstrativo não a substitui.
export function CopsoqPreparationNotice() {
  const manifest = getCopsoqManifest();
  return (
    <section aria-labelledby="copsoq-preparation-title" className="min-w-0 space-y-5 rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-6">
      <div className="flex items-center gap-2 text-sm font-medium text-primary"><FileCheck2 aria-hidden="true" className="size-5 shrink-0" />Identidade e preparação</div>
      <h2 id="copsoq-preparation-title" className="font-serif text-xl">Q1 · COPSOQ — preparação da aplicação</h2>
      <p className="text-sm">A aplicação empresarial aguarda a correspondência entre a fonte brasileira aprovada e o instrumento servido.</p>
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Fingerprint aria-hidden="true" className="size-4 shrink-0" />O que o sistema serve hoje</h3>
      <dl className="grid gap-3 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2 [&>div]:min-w-0 [&>div]:break-words [&>div]:rounded-lg [&>div]:border [&>div]:border-border [&>div]:bg-muted/20 [&>div]:p-3 [&_dt]:mb-1 [&_dt]:block [&_dd]:block">
        <div><dt className="inline font-medium">Versão no sistema: </dt><dd className="inline">{manifest.version}</dd></div>
        <div><dt className="inline font-medium">Instrumento servido: </dt><dd className="inline">{manifest.served_name}</dd></div>
      </dl>
      <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert aria-hidden="true" className="size-4 shrink-0" />Conferência pendente e efeito na jornada</h3>
      <p role="note" className="text-sm leading-relaxed text-muted-foreground">
        A fonte exata deve permitir conferir itens, escalas, reversões, ausências, cálculo e atribuição.
        Enquanto essa conferência estiver pendente, coleta e publicação empresariais de Q1 permanecem indisponíveis nesta jornada.
        Você pode continuar a jornada Q2 independentemente de Q1.
      </p>
      </div>
      <a href="/ivo-integral/governanca" className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-md text-sm text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Consultar pendências metodológicas<ArrowRight aria-hidden="true" className="size-4 shrink-0" /></a>
    </section>
  );
}
