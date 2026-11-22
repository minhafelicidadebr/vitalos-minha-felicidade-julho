import { CalendarClock, CircleDashed, CircleCheck } from "lucide-react";
import { Q3_PRECONDITIONS, isQ3Activatable } from "@/domain/ivo/q3-readiness";

// Q3 · PERMA+V — prontidão (informativo). Não é instrumento, não coleta, não pontua e não
// publica nada: mostra ao RH em que ponto está a lente planejada do 3º trimestre e o que
// falta decidir, derivado de src/domain/ivo/q3-readiness.ts (fonte única).
export function Q3ReadinessNotice() {
  const decided = Q3_PRECONDITIONS.filter((p) => p.status === "decided").length;
  const activatable = isQ3Activatable();
  return (
    <section
      aria-labelledby="q3-readiness-title"
      className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-6"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <CalendarClock aria-hidden="true" className="size-5 shrink-0" />
        Lente planejada · 3º trimestre
      </div>
      <h2 id="q3-readiness-title" className="font-serif text-xl">
        Q3 · PERMA+V — em preparação metodológica
      </h2>
      <p className="text-sm text-muted-foreground">
        {activatable
          ? "As decisões metodológicas estão registradas. A ativação da lente ainda depende de implementação e habilitação."
          : "Nada é medido, pontuado ou publicado nesta lente. Ela só fica disponível quando as decisões abaixo estiverem registradas pelos responsáveis."}
      </p>
      <p className="text-sm font-medium" aria-live="polite">
        {decided} de {Q3_PRECONDITIONS.length} decisões registradas
      </p>
      <ul className="space-y-2 text-sm">
        {Q3_PRECONDITIONS.map((p) => (
          <li key={p.id} className="flex items-start gap-2">
            {p.status === "decided" ? (
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : (
              <CircleDashed aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span>
              <span className="sr-only">{p.status === "decided" ? "Decidida: " : "Pendente: "}</span>
              {p.decision}
              <span className="block text-xs text-muted-foreground">Responsável: {p.owner}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Q3 é independente de Q1 e Q2: não reutiliza respostas, escores nem resultados das outras lentes.
      </p>
    </section>
  );
}
