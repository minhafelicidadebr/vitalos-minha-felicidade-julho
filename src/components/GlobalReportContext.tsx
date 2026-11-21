import { FileText, Database, Printer, Archive } from "lucide-react";

/** Descreve as fronteiras desta rota; habilitação não afirma sucesso de consulta. */
export function GlobalReportContext({ institutionalEnabled }: { institutionalEnabled: boolean }) {
  return (
    <section aria-label="Origem e operações do relatório global" className="min-w-0 space-y-4 break-words rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5 print:break-inside-avoid">
      <h2 className="text-base font-semibold">Como interpretar este relatório</h2>
      <dl className="grid gap-3 text-sm leading-relaxed sm:grid-cols-2 [&>div]:min-w-0 [&>div]:rounded-lg [&>div]:border [&>div]:border-border [&>div]:bg-background/60 [&>div]:p-3">
        <div><dt className="flex items-center gap-2 font-semibold"><FileText aria-hidden="true" className="size-4 shrink-0 text-primary" />Corpo demonstrativo</dt><dd className="mt-2 text-muted-foreground">Indicadores, jornada anual, experimentos e selo do corpo usam dados de exemplo. Não são resultados ou certificação da sua organização.</dd></div>
        <div><dt className="flex items-center gap-2 font-semibold"><Database aria-hidden="true" className="size-4 shrink-0 text-primary" />Anexo institucional separado</dt><dd className="mt-2 text-muted-foreground">{institutionalEnabled ? "Consulta institucional habilitada nesta sessão. Confira abaixo os estados de carregamento, erro e disponibilidade do anexo." : "Consulta institucional não habilitada nesta sessão. O corpo demonstrativo não substitui dados institucionais ausentes."} A origem institucional de um dado não homologa sua interpretação ou a asseguração do relatório.</dd></div>
        <div><dt className="flex items-center gap-2 font-semibold"><Printer aria-hidden="true" className="size-4 shrink-0 text-primary" />Impressão da página</dt><dd className="mt-2 text-muted-foreground">Abre a impressão do navegador, onde é possível salvar em PDF. Inclui o conteúdo exibido e seus avisos; não cria um snapshot no servidor.</dd></div>
        <div><dt className="flex items-center gap-2 font-semibold"><Archive aria-hidden="true" className="size-4 shrink-0 text-primary" />Registro de snapshot</dt><dd className="mt-2 text-muted-foreground">O botão do anexo solicita um registro ao servidor, sujeito às permissões e validações existentes. Abrir ou imprimir esta página não confirma essa gravação nem concede certificação.</dd></div>
      </dl>
    </section>
  );
}
