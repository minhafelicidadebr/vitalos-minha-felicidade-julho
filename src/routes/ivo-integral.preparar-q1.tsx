import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { AppShell } from "@/app/shell/AppShell";
import { Q1PreparationWorkspace } from "@/components/ivo/Q1PreparationWorkspace";
import { Q1TechnicalReviewPanel } from "@/components/ivo/Q1TechnicalReviewPanel";
import { cycleOfInstant, formatCycleKey } from "@/domain/ivo/cycle-key";
import { cycleSchema, prepMessages } from "@/domain/survey/q1-preparation";

export const Route = createFileRoute("/ivo-integral/preparar-q1")({
  validateSearch: z.object({ cycle: z.string().optional() }),
  head: () => ({ meta: [{ title: "Preparar avaliação Q1 · VitalOS" }] }),
  component: PreparationPage,
});
function PreparationPage() {
  const session = useRealOrgSession();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [currentCycle] = useState(() => formatCycleKey(cycleOfInstant(new Date().toISOString())));
  const cycle = search.cycle ?? currentCycle;
  const validCycle = cycleSchema.safeParse(cycle).success;
  const [error, setError] = useState("");
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:py-10">
        <Link
          to={session.org?.role === "RH_ADMIN" ? "/rh" : "/painel"}
          className="inline-flex min-h-11 items-center rounded-md text-sm text-primary underline"
        >
          Voltar ao painel
        </Link>
        <header className="space-y-2">
          <h1 className="font-serif text-3xl">Preparar avaliação Q1</h1>
          <p className="text-muted-foreground">
            Organize a comunicação com a equipe e confira os controles existentes antes da coleta
            COPSOQ. Nesta etapa, o representante autorizado organiza os registros da empresa. A
            revisão técnica de SST é uma etapa distinta.
          </p>
        </header>
        {session.loading ? (
          <p role="status">Conferindo vínculo institucional…</p>
        ) : session.status === "unavailable" ? (
          <div role="alert">
            <p>{prepMessages.unavailable}</p>
            <button className="min-h-11 underline" onClick={session.retry}>
              Consultar vínculo novamente
            </button>
          </div>
        ) : session.org?.orgPackId !== "enterprise" ? (
          <div role="alert" className="space-y-2 rounded-lg border bg-muted/40 p-4">
            <p>{prepMessages.forbidden}</p>
            {session.org?.orgPackId === "enterprise" && session.org.role === "SST_PROFISSIONAL" && (
              <p>A revisão técnica por SST ainda não está disponível nesta área.</p>
            )}
          </div>
        ) : (
          <>
            {import.meta.env.DEV && (
              <aside className="rounded-xl border bg-primary/5 p-4">
                <h2 className="font-semibold">Precisa de apoio técnico para o Q1?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Conheça como a Rede VitalOS pode ajudar uma empresa a encontrar apoio para avaliar
                  as condições de trabalho.
                </p>
                <Link
                  to="/"
                  hash="rede-vitalos"
                  className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
                >
                  Conhecer a prévia da rede
                </Link>
              </aside>
            )}
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = cycleSchema.safeParse(new FormData(e.currentTarget).get("cycle"));
                if (parsed.success) {
                  void navigate({ search: { cycle: parsed.data }, resetScroll: false });
                  setError("");
                } else setError("Informe o ano e o trimestre no formato 2027-T1.");
              }}
            >
              <label className="grid gap-1 text-sm font-medium">
                Ciclo de preparação
                <input
                  name="cycle"
                  key={cycle}
                  required
                  maxLength={7}
                  defaultValue={cycle}
                  aria-describedby="cycle-help"
                  className="min-h-11 rounded-md border bg-background px-3"
                />
              </label>
              <button className="min-h-11 rounded-md border px-4 font-medium" type="submit">
                Abrir ciclo
              </button>
            </form>
            <p id="cycle-help" className="text-sm text-muted-foreground">
              Use o ano e o trimestre, por exemplo 2027-T1.
            </p>
            {(error || !validCycle) && (
              <p role="alert">
                {error ||
                  "O ciclo do endereço é inválido. Informe o ciclo de preparação para continuar."}
              </p>
            )}
            {validCycle && (
              <div
                key={[session.org.userId, session.org.orgId, cycle].join("/")}
                className="space-y-5"
              >
                <Q1TechnicalReviewPanel scope={session.org.orgId} cycle={cycle} />
                <Q1PreparationWorkspace scope={session.org.orgId} cycle={cycle} />
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
