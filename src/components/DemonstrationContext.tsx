import { FlaskConical, Database, Info } from "lucide-react";

const CONTEXT = {
  pnl: {
    source: "Valores iniciais e variação de IVO de demonstração. Os campos editáveis alteram os parâmetros da simulação nesta tela.",
    limit: "Editar os valores não transforma a estimativa em economia observada ou retorno garantido. As relações usadas pelo modelo precisam de validação para o contexto de uso.",
  },
  esg: {
    source: "Leitura de IVO e mapeamentos ESG de demonstração, usados para ilustrar a tradução entre indicadores e frameworks.",
    limit: "Pontuação, faixa e cobertura ilustram o modelo. Não atestam conformidade, certificação, impacto observado ou um relatório ESG homologado.",
  },
  reports: {
    source: "Evidências, requisitos do selo e relatórios de exemplo nesta galeria. Os estados apresentados pertencem à demonstração.",
    limit: "Esta galeria não comprova aprovação de evidências ou concessão de selo à sua organização. A ação de PDF é simulada e não gera um arquivo.",
  },
  priorities: {
    source: "Prioridades calculadas sobre dados e alavancas de demonstração.",
    limit: "A ordem e os pontos de alavancagem ilustram o modelo. Não são um diagnóstico da sua empresa nem uma promessa de melhora do IVO.",
  },
  experiments: {
    source: "Casos e resultados de exemplo, usados para demonstrar o acompanhamento de experimentos.",
    limit: "Hipótese, execução e resultado são etapas distintas. Um caso demonstrativo concluído não comprova eficácia na sua organização.",
  },
  trajectory: {
    source: "Cenários calculados com base, alavancas e parâmetros de demonstração.",
    limit: "As projeções de IVO, custo e ESG são ilustrativas. Não representam impacto observado, retorno garantido ou relatório ESG homologado.",
  },
} as const;

/** Transparência das superfícies legadas demonstrativas; não decide acesso ou método. */
export function DemonstrationContext({ kind }: { kind: keyof typeof CONTEXT }) {
  const context = CONTEXT[kind];
  return (
    <section aria-label="Origem e limites da demonstração" className="min-w-0 space-y-4 break-words rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground"><FlaskConical aria-hidden="true" className="size-5 shrink-0 text-primary" />Demonstração · como interpretar</h2>
      <dl className="grid gap-3 text-sm leading-relaxed sm:grid-cols-2 [&>div]:min-w-0 [&>div]:rounded-lg [&>div]:border [&>div]:border-border [&>div]:bg-background/60 [&>div]:p-3">
        <div><dt className="flex items-center gap-2 font-semibold"><Database aria-hidden="true" className="size-4 shrink-0 text-primary" />Origem dos dados</dt><dd className="mt-2 text-muted-foreground">{context.source}</dd></div>
        <div><dt className="flex items-center gap-2 font-semibold"><Info aria-hidden="true" className="size-4 shrink-0 text-primary" />Limites de interpretação</dt><dd className="mt-2 text-muted-foreground">{context.limit}</dd></div>
      </dl>
    </section>
  );
}
