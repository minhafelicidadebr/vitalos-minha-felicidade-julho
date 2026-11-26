// Orientação do Q2 dentro das telas "Leitura" e "Ações": explica a passagem da leitura à
// devolutiva e a parte de cada perfil. O texto vem do recorte client-safe Q2_ORIENTATION, que
// um teste mantém idêntico ao guia (o guia em si segue só no servidor). Não depende de dados carregados: aparece também sem onda, sem acesso ou em falha.
// O perfil é só perspectiva de leitura; nada aqui concede acesso nem busca dado.
import { Q2_ORIENTATION } from "@/domain/guide/q2-orientation";
import { perspectiveForRole } from "@/domain/guide/guide-role";
import type { GuideMatrixCell, GuidePerspective } from "@/domain/guide/guide-types";

export type Q2OrientationStage = "leitura" | "acoes";

const MODE_LABEL: Record<GuideMatrixCell["mode"], string> = {
  atua: "Você atua",
  acompanha: "Você acompanha",
  dependencia: "Depende de decisão",
};

const STAGE_STEPS: Record<Q2OrientationStage, number[]> = {
  leitura: [0, 1],
  acoes: [2, 3, 4],
};

function defaultLabels(mode: GuideMatrixCell["mode"]): { first: string; second: string } {
  if (mode === "atua") return { first: "Sua parte", second: "Quem recebe depois" };
  if (mode === "acompanha") return { first: "Quem atua", second: "O que você acompanha" };
  return { first: "Quem atua", second: "O que você recebe" };
}

export function Q2Orientation({ roleId, stage }: { roleId: string | null; stage: Q2OrientationStage }) {
  const perspective: GuidePerspective | null = roleId ? perspectiveForRole(roleId) : null;
  const entry = perspective ? Q2_ORIENTATION.perspectives[perspective] : null;
  const voice = entry?.voice ?? null;
  const cell = entry;
  const labels = cell ? (cell.labels ?? defaultLabels(cell.mode)) : null;
  const current = new Set(STAGE_STEPS[stage]);

  return (
    <details
      data-testid="q2-orientation"
      className="group rounded-md border border-border bg-card text-sm"
      aria-label="Da leitura à devolutiva"
    >
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="font-medium text-foreground">Da leitura à devolutiva</span>
        <span className="text-muted-foreground">
          {voice ?? "Veja como a leitura do grupo vira ação e devolutiva."}
        </span>
        <span aria-hidden="true" className="ml-auto text-xs text-primary group-open:hidden">Ver parte de cada perfil</span>
        <span aria-hidden="true" className="ml-auto hidden text-xs text-primary group-open:inline">Recolher</span>
      </summary>

      <div className="space-y-4 border-t border-border px-4 py-4">
        {cell && labels ? (
          <section aria-label="Sua parte neste percurso" className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{MODE_LABEL[cell.mode]}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-muted/40 p-3">
                <h3 className="text-xs font-semibold text-foreground">{labels.first}</h3>
                <p className="mt-1 text-muted-foreground">{cell.who}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-3">
                <h3 className="text-xs font-semibold text-foreground">{labels.second}</h3>
                <p className="mt-1 text-muted-foreground">{cell.receives}</p>
              </div>
            </div>
          </section>
        ) : (
          <p role="note" className="text-muted-foreground">
            Entre com sua conta para ver a parte do seu perfil. O percurso abaixo vale para todos.
          </p>
        )}

        <section aria-label="Percurso do Q2">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Q2_ORIENTATION.steps.map((step, index) => (
              <li
                key={step.label}
                aria-current={current.has(index) ? "step" : undefined}
                className={`rounded-md border p-3 ${current.has(index) ? "border-primary/60 bg-primary/5" : "border-border"}`}
              >
                <p className="text-xs font-semibold text-foreground">
                  {index + 1}. {step.label} <span className="font-normal text-muted-foreground">· {step.who}</span>
                </p>
              </li>
            ))}
          </ol>
        </section>

        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">O que fica registrado: </span>
          {Q2_ORIENTATION.evidence}
        </p>
        <a
          href={perspective ? `/guia-empresarial?etapa=Q2&perfil=${perspective}` : "/guia-empresarial?etapa=Q2"}
          className="inline-flex min-h-11 items-center text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Abrir o guia completo do Q2
        </a>
      </div>
    </details>
  );
}
