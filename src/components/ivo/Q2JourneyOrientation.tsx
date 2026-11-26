import { perspectiveForRole } from "@/domain/guide/guide-role";
import { Q2_ORIENTATION } from "@/domain/guide/q2-orientation";

export function Q2JourneyOrientation({ roleId = null }: { roleId?: string | null }) {
  const perspective = roleId ? perspectiveForRole(roleId) : null;
  const mine = perspective ? Q2_ORIENTATION.perspectives[perspective] : null;
  const labels = mine ? (mine.labels ?? (mine.mode === "atua" ? { first: "Sua parte", second: "Quem recebe depois" } : { first: "Quem atua", second: "O que você acompanha" })) : null;
  return (
    <details className="rounded-lg border border-border bg-card text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span aria-hidden="true">↳</span> Como a leitura vira uma ação?
      </summary>
      <div className="space-y-4 px-4 pb-4">
        <p className="text-muted-foreground">
          A equipe usa a leitura agregada para escolher uma prioridade. A intervenção depende do que o grupo observou e do que pode mudar na rotina.
        </p>
        {mine && labels ? (
          <div data-testid="q2-orientation-profile" className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
              <h3 className="text-xs font-semibold text-foreground">{labels.first}</h3>
              <p className="mt-1 text-muted-foreground">{mine.who}</p>
            </div>
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
              <h3 className="text-xs font-semibold text-foreground">{labels.second}</h3>
              <p className="mt-1 text-muted-foreground">{mine.receives}</p>
            </div>
          </div>
        ) : null}
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
          href={perspective ? `/ivo-integral/guia?etapa=Q2&perfil=${perspective}` : "/ivo-integral/guia?etapa=Q2"}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 py-2 font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Consultar a jornada Q2 por perfil
        </a>
        <p className="text-xs text-muted-foreground">O guia no dashboard exige acesso institucional.</p>
      </div>
    </details>
  );
}
