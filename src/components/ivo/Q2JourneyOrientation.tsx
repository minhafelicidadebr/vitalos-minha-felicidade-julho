export function Q2JourneyOrientation() {
  return (
    <details className="rounded-lg border border-border bg-card text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span aria-hidden="true">↳</span> Como a leitura vira uma ação?
      </summary>
      <div className="space-y-4 px-4 pb-4">
        <p className="text-muted-foreground">
          A equipe usa a leitura agregada para escolher uma prioridade. A intervenção depende do que o grupo observou e do que pode mudar na rotina.
        </p>
        <ol className="grid gap-2 sm:grid-cols-3">
          <li className="rounded-md bg-muted/40 p-3">
            <strong className="block text-foreground">1. Priorizar · RH</strong>
            <span className="text-muted-foreground">Lê os resultados do grupo, pactua uma prática e define quem conduz.</span>
          </li>
          <li className="rounded-md bg-muted/40 p-3">
            <strong className="block text-foreground">2. Executar · Liderança</strong>
            <span className="text-muted-foreground">Acompanha a ação atribuída e registra o que foi feito.</span>
          </li>
          <li className="rounded-md bg-muted/40 p-3">
            <strong className="block text-foreground">3. Devolver · RH e equipe</strong>
            <span className="text-muted-foreground">O RH compartilha a síntese coletiva e a equipe acompanha o que será mantido ou ajustado.</span>
          </li>
        </ol>
        <a
          href="/ivo-integral/guia?etapa=Q2"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 py-2 font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Consultar a jornada Q2 por perfil
        </a>
        <p className="text-xs text-muted-foreground">O guia no dashboard exige acesso institucional.</p>
      </div>
    </details>
  );
}
