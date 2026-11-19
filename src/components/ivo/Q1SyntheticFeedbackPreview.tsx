import { useId, useState } from "react";
import { reviewLabels } from "@/domain/survey/q1-preparation";
import {
  syntheticPauseCase,
  syntheticQ1FeedbackExamples,
  type SyntheticFollowup,
} from "@/domain/survey/q1-synthetic-feedback";

export function Q1SyntheticFeedbackPreview() {
  const choiceId = useId();
  const [scenario, setScenario] = useState<keyof typeof syntheticQ1FeedbackExamples>("available");
  const [answer, setAnswer] = useState<"check" | "conclude" | null>(null);
  const feedback = syntheticQ1FeedbackExamples[scenario];
  return (
    <details className="rounded-xl border bg-card p-4">
      <summary className="min-h-11 cursor-pointer font-semibold">Ensaiar a devolutiva Q1</summary>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Cenário sintético · {feedback.cycle} · {feedback.label}
        </p>
        <label className="grid max-w-sm gap-1 text-sm font-medium">
          Cenário de divulgação
          <select
            className="min-h-11 rounded-md border bg-background px-3"
            value={scenario}
            onChange={(event) => {
              const value = event.target.value;
              if (value !== "available" && value !== "pending" && value !== "protected") return;
              setScenario(value);
              setAnswer(null);
            }}
          >
            <option value="available">Resultado coletivo publicado</option>
            <option value="pending">Publicação pendente</option>
            <option value="protected">Base insuficiente para divulgação</option>
          </select>
        </label>
        <div role="status" className="space-y-1 rounded-lg border bg-muted/40 p-3">
          <p className="font-semibold">
            {feedback.state === "available"
              ? "Leitura coletiva divulgável"
              : feedback.state === "awaiting_publication"
                ? "Aguardando publicação"
                : "Leitura protegida"}
          </p>
          {feedback.state === "available" && <p>{feedback.observation}</p>}
          <p>{feedback.guidance}</p>
        </div>
        {feedback.state === "available" && (
          <div className="space-y-4">
            <fieldset className="space-y-2 rounded-lg border p-3">
              <legend className="px-1 font-semibold">
                Educar · Qual é o próximo passo do gestor?
              </legend>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name={choiceId}
                  checked={answer === "conclude"}
                  onChange={() => setAnswer("conclude")}
                />
                Concluir que a medida de prevenção falhou.
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name={choiceId}
                  checked={answer === "check"}
                  onChange={() => setAnswer("check")}
                />
                Conferir a escala e ouvir a equipe sobre a cobertura das pausas.
              </label>
              <p role="status" className="text-sm">
                {answer === "check"
                  ? "Isso ajuda a identificar em qual horário falta cobertura e a escolher uma medida."
                  : answer === "conclude"
                    ? "A leitura aponta o que investigar. Confira as condições do turno antes de decidir."
                    : ""}
              </p>
            </fieldset>
            {answer === "check" && <SyntheticMeasure />}
          </div>
        )}
      </div>
    </details>
  );
}

const dateLabel = (isoDate: string) => isoDate.split("-").reverse().join("/");

function SyntheticMeasure() {
  const group = useId();
  const [outcome, setOutcome] = useState<SyntheticFollowup | null>(null);
  const control = syntheticPauseCase(outcome);
  const measure = control.measure!;
  const finding = control.verification?.finding;
  const review = control.reviews?.at(-1);

  return (
    <>
      <section aria-label="Exemplo de medida" className="space-y-2 rounded-lg border p-3">
        <h3 className="font-semibold">Transformar · {measure.action}</h3>
        {finding && "gap" in finding && <p className="text-sm">Lacuna conferida: {finding.gap}</p>}
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium">Responsável</dt>
            <dd>{measure.owner}</dd>
          </div>
          <div>
            <dt className="font-medium">Prazo fictício</dt>
            <dd>
              <time dateTime={measure.due}>{dateLabel(measure.due)}</time>
            </dd>
          </div>
          <div>
            <dt className="font-medium">Indicador</dt>
            <dd>{measure.indicator}</dd>
          </div>
          <div>
            <dt className="font-medium">Evidência esperada</dt>
            <dd>Escala revisada e confirmação coletiva da cobertura</dd>
          </div>
        </dl>
      </section>
      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 font-semibold">Evoluir · Acompanhar a medida</legend>
        <p className="text-sm">
          Compare dois desfechos fictícios para a primeira semana de acompanhamento.
        </p>
        {(["observed", "revisit"] as const).map((option) => (
          <label key={option} className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name={group}
              checked={outcome === option}
              onChange={() => setOutcome(option)}
            />
            {reviewLabels[option]}
          </label>
        ))}
        <div role="status" className="space-y-1 rounded-md bg-muted/40 p-3 text-sm">
          <p className="font-semibold">
            {review
              ? reviewLabels[review.result.outcome]
              : "Medida planejada · acompanhamento a registrar"}
          </p>
          {review && (
            <>
              <p>Evidência do ensaio: {review.evidence}</p>
              {review.result.outcome === "revisit" ? (
                <p>
                  Próxima revisão fictícia:{" "}
                  <time dateTime={review.result.nextDate}>{dateLabel(review.result.nextDate)}</time>
                  . Ajuste a escala e confira o dia descoberto com a equipe.
                </p>
              ) : (
                <p>
                  Na próxima revisão semanal, confira com a equipe se as pausas ocorreram de fato e
                  onde ainda houve interrupções.
                </p>
              )}
              <p className="text-muted-foreground">Eficácia ainda não avaliada.</p>
            </>
          )}
        </div>
      </fieldset>
    </>
  );
}
