import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { operateQ1TechnicalReview } from "@/lib/api/q1-technical-review.functions";

type Target = { org: string; cycle: string };
type Assignment = Target & { sequence: number; reviewerId: string | null };
const field = "min-h-11 w-full rounded-md border bg-background px-3";
const uuid = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

export function Q1ReviewerAssignment({ accessToken }: { accessToken: string }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const pending = useRef(false);

  async function run(target: Target, change?: { reviewerId: string | null; base: number }) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setAssignment(null);
    setFeedback("");
    try {
      const call = (command: Parameters<typeof operateQ1TechnicalReview>[0]["data"]["command"]) =>
        operateQ1TechnicalReview({ data: { accessToken, cycle: target.cycle, command } });
      if (change) {
        const result = await call({ kind: "assign", org: target.org, ...change });
        if (result.status !== "ready") {
          setFeedback(
            result.status === "conflict"
              ? "O ciclo mudou em outra sessão. Consulte novamente."
              : "A alteração não foi confirmada. Confira o vínculo de SST e o ciclo.",
          );
          return;
        }
        setFeedback(change.reviewerId ? "Revisor designado." : "Designação revogada.");
      }
      const current = await call({ kind: "inspect", org: target.org });
      if (current.status === "ready" && "sequence" in current && current.sequence !== undefined) {
        setAssignment({
          ...target,
          sequence: current.sequence,
          reviewerId: current.reviewerId ?? null,
        });
      } else {
        setFeedback(
          change
            ? "Alteração registrada. Consulte novamente para conferir o estado atual."
            : "Não foi possível consultar o ciclo. Confira a empresa e a habilitação do Q1.",
        );
      }
    } catch {
      setFeedback("Não foi possível confirmar a solicitação. Consulte o ciclo novamente.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <details className="rounded-xl border p-4">
      <summary className="min-h-11 cursor-pointer font-semibold">
        Designação de revisor técnico Q1
      </summary>
      <p className="mb-3 text-sm text-muted-foreground">
        Vincule um profissional de SST da própria empresa à revisão técnica de um ciclo.
      </p>
      <form
        className="space-y-3"
        onChange={() => {
          setAssignment(null);
          setFeedback("");
        }}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void run({ org: String(data.get("org")), cycle: String(data.get("cycle")) });
        }}
      >
        <fieldset disabled={busy} className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            ID da empresa
            <input name="org" className={field} required pattern={uuid} />
          </label>
          <label className="grid gap-1 text-sm">
            Ciclo Q1
            <input
              name="cycle"
              className={field}
              required
              maxLength={7}
              pattern="(20[0-9]{2}|2100)-T[1-4]"
              placeholder="2027-T1"
            />
          </label>
          <Button type="submit" variant="outline" className="min-h-11">
            Consultar designação
          </Button>
        </fieldset>
      </form>
      {assignment && (
        <div className="mt-4 space-y-3 rounded-lg border p-3 [overflow-wrap:anywhere]">
          <p>
            Empresa {assignment.org} · ciclo {assignment.cycle}
          </p>
          <p>
            {assignment.reviewerId
              ? "Revisor atual: " + assignment.reviewerId
              : "Sem revisor designado."}
          </p>
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const reviewer = new FormData(event.currentTarget).get("reviewer");
              if (typeof reviewer === "string")
                void run(assignment, { reviewerId: reviewer, base: assignment.sequence });
            }}
          >
            <label className="grid gap-1 text-sm">
              ID do profissional de SST
              <input name="reviewer" className={field} required pattern={uuid} />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {assignment.reviewerId ? "Substituir revisor" : "Designar revisor"}
              </Button>
              {assignment.reviewerId && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(assignment, { reviewerId: null, base: assignment.sequence })
                  }
                >
                  Revogar designação
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
      <p role="status" className="mt-2 text-sm">
        {busy ? "Consultando ciclo…" : feedback}
      </p>
    </details>
  );
}
