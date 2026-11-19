import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { operateQ1TechnicalReview } from "@/lib/api/q1-technical-review.functions";
import { coverageLabels, reviewLabels, sourceLabels } from "@/domain/survey/q1-preparation";
import { currentIvoAccessToken } from "./ivo-session";

type Command = Parameters<typeof operateQ1TechnicalReview>[0]["data"]["command"];
type Reply = Awaited<ReturnType<typeof operateQ1TechnicalReview>>;
type View = Extract<Reply, { memory: unknown }>;
type Draft = {
  key: string;
  decision: "" | "changes_requested" | "review_recorded";
  rationale: string;
};
const emptyDraft: Draft = { key: "", decision: "", rationale: "" };
const reviewMessages: Record<string, string> = {
  forbidden: "A sessão não tem mais acesso a esta revisão.",
  stale: "A preparação mudou. Abra a versão vigente antes de registrar uma devolução.",
  conflict: "Outra operação alterou a revisão. Confira o estado atualizado.",
  invalid: "Confira a decisão e a justificativa antes de enviar.",
  unavailable: "Não foi possível confirmar a operação. Confira o estado e tente novamente.",
};

export function Q1TechnicalReviewPanel({ cycle, scope }: { cycle: string; scope: string }) {
  const [view, setView] = useState<View | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const epoch = useRef(0);
  const pending = useRef(false);
  const invalidate = useCallback(() => {
    epoch.current++;
  }, []);

  const run = useCallback(
    async (command: Command = { kind: "read" }) => {
      if (pending.current) return;
      const request = ++epoch.current;
      const mutation = command.kind !== "read";
      if (mutation) pending.current = true;
      setBusy(true);
      setMessage("");
      if (!mutation) setView(null);
      try {
        const accessToken = await currentIvoAccessToken();
        if (!accessToken) {
          if (request === epoch.current) {
            setView(null);
            setDraft(emptyDraft);
          }
          return;
        }
        const execute = (next: Command) =>
          operateQ1TechnicalReview({
            data: { accessToken, cycle, expectedScope: scope, command: next },
          });
        const result = await execute(command);
        if (request !== epoch.current) return;
        const current = mutation ? await execute({ kind: "read" }) : result;
        if (request !== epoch.current) return;
        setView(current.status === "ready" && "memory" in current ? current : null);
        if (
          current.status === "forbidden" ||
          (current.status === "ready" &&
            "memory" in current &&
            (!current.memory || current.feedback))
        )
          setDraft(emptyDraft);
        if (mutation)
          setMessage(result.status === "ready" ? "Registro salvo." : reviewMessages[result.status]);
        else if (result.status === "unavailable")
          setMessage("Revisão técnica indisponível. Tente novamente.");
      } catch {
        if (request === epoch.current) {
          setView(null);
          setMessage("Não foi possível consultar a revisão técnica.");
        }
      } finally {
        if (mutation) pending.current = false;
        if (request === epoch.current) setBusy(false);
      }
    },
    [cycle, scope],
  );

  useEffect(() => {
    const refresh = () => void run();
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      invalidate();
      window.removeEventListener("focus", refresh);
    };
  }, [invalidate, run]);

  if (!view && !message) return null;
  const revision = view?.preparationRevision ?? 0;
  const draftKey = JSON.stringify([scope, cycle, revision, view?.sequence]);
  const currentDraft = draft.key === draftKey ? draft : emptyDraft;
  return (
    <section
      aria-label="Revisão técnica do ciclo"
      className="space-y-3 rounded-xl border bg-card p-4 sm:p-5"
    >
      <h2 className="font-serif text-xl">Revisão técnica do ciclo</h2>
      {view && (
        <p>
          Revisão {revision} ·{" "}
          {view.feedback
            ? "Devolução registrada"
            : view.submitted
              ? "Aguardando devolução"
              : view.reviewerId
                ? "Aguardando encaminhamento"
                : "Revisor a definir"}
        </p>
      )}
      {view?.memory && (
        <details className="rounded-lg border p-3">
          <summary className="min-h-11 cursor-pointer font-medium">Ler memória encaminhada</summary>
          {view.memory.notice && (
            <p>
              Canal institucional: {view.memory.notice.contact} · Devolutiva:{" "}
              {view.memory.notice.returnChannel}
            </p>
          )}
          <ul className="mt-2 space-y-3">
            {view.memory.controls.map((control) => (
              <li key={control.id} className="rounded-md bg-muted/40 p-3 [overflow-wrap:anywhere]">
                <p className="font-semibold">
                  {control.label} · {control.scope}
                </p>
                {control.verification ? (
                  <>
                    <p>
                      {coverageLabels[control.verification.finding.coverage]} ·{" "}
                      {sourceLabels[control.verification.source]}
                    </p>
                    <p>{control.verification.evidence}</p>
                    {"gap" in control.verification.finding && (
                      <p>Lacuna: {control.verification.finding.gap}</p>
                    )}
                  </>
                ) : (
                  <p>Cobertura a conferir.</p>
                )}
                {control.measure && (
                  <>
                    <p>Medida: {control.measure.action}</p>
                    <p>
                      Função: {control.measure.owner} · Prazo: {control.measure.due}
                    </p>
                    <p>Indicador: {control.measure.indicator}</p>
                  </>
                )}
                {control.reviews?.map((review, index) => (
                  <div key={index}>
                    <p>
                      {reviewLabels[review.result.outcome]} · {review.evidence}
                    </p>
                    {review.result.outcome === "revisit" && (
                      <p>Próxima revisão: {review.result.nextDate}</p>
                    )}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </details>
      )}
      {view?.feedback && (
        <div className="rounded-lg border p-3 [overflow-wrap:anywhere]">
          <p className="font-semibold">
            {view.feedback.decision === "changes_requested"
              ? "Ajustes solicitados"
              : "Revisão registrada"}
          </p>
          <p>{view.feedback.rationale}</p>
        </div>
      )}
      {view?.memory && !view.feedback && (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            const value = fields.get("decision");
            if (value !== "changes_requested" && value !== "review_recorded") return;
            void run({
              kind: "respond",
              preparationRevision: revision,
              decision: value,
              rationale: String(fields.get("rationale") ?? "").trim(),
            });
          }}
        >
          <label className="grid gap-1">
            Devolução
            <select
              name="decision"
              required
              value={currentDraft.decision}
              onChange={(event) => {
                const decision = event.target.value;
                if (
                  decision === "" ||
                  decision === "changes_requested" ||
                  decision === "review_recorded"
                )
                  setDraft({ ...currentDraft, key: draftKey, decision });
              }}
              className="min-h-11 rounded-md border bg-background p-2"
            >
              <option value="" disabled>
                Selecione a devolução
              </option>
              <option value="changes_requested">Solicitar ajustes</option>
              <option value="review_recorded">Registrar revisão</option>
            </select>
          </label>
          <label className="grid gap-1">
            Justificativa técnica
            <textarea
              name="rationale"
              required
              minLength={10}
              maxLength={1500}
              value={currentDraft.rationale}
              onChange={(event) =>
                setDraft({ ...currentDraft, key: draftKey, rationale: event.target.value })
              }
              className="rounded-md border bg-background p-2"
            />
          </label>
          <Button type="submit" disabled={busy}>
            Registrar devolução
          </Button>
        </form>
      )}
      {view?.canSubmit && view.reviewerId && !view.submitted && revision > 0 && (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            if (view.reviewerId)
              void run({
                kind: "submit",
                reviewerId: view.reviewerId,
                preparationRevision: revision,
              });
          }}
        >
          Encaminhar revisão {revision}
        </Button>
      )}
      <p role="status">{busy ? "Consultando revisão técnica…" : message}</p>
      {view && (
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void run()}>
          Atualizar revisão
        </Button>
      )}
      {message && !view && (
        <Button type="button" variant="outline" disabled={busy} onClick={() => void run()}>
          Tentar novamente
        </Button>
      )}
    </section>
  );
}
