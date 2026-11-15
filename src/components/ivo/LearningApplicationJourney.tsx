import { useState } from "react";
import { gradeQuiz } from "@/engine/learning/trail-engine";
import { AddActionToPlanForm, type AddActionFormInput } from "./PlanComposition";
import { learningApplicationTrace } from "@/lib/ivo/learning-application";
import type {
  EducationContentView,
  FibtActionPlanView,
  FibtActionView,
  IvoQ2View,
} from "@/lib/ivo/ivo-views";
import type { EvidenceSubmitResult } from "./FibtActionLoop";

export interface LearningBinding {
  contentId: string;
  contentVersion: string;
  activityVersion: string;
}
export function LearningApplicationJourney({
  content,
  action,
  plan,
  view,
  busy,
  onSubmit,
}: {
  content: EducationContentView;
  action: FibtActionView;
  plan: FibtActionPlanView;
  view: IvoQ2View | null;
  busy: boolean;
  onSubmit: (
    planId: string,
    application: AddActionFormInput,
    binding: LearningBinding,
  ) => Promise<EvidenceSubmitResult>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const activity = content.activity;
  if (!activity) return null;
  const grade = gradeQuiz(activity.checks, answers);
  const sourceAvailable =
    view?.wave.id === action.source.waveId &&
    view.sectors.some(
      (s) =>
        s.cohortId === action.source.cohortId &&
        s.group === "available" &&
        s.factors?.some((f) => f.id === content.factorId),
    );
  return (
    <section
      aria-label={`Praticar e aplicar: ${content.title}`}
      className="space-y-4 rounded-md border border-primary/30 p-4"
    >
      <h5 className="font-semibold">Compreender, praticar e preparar uma aplicação</h5>
      <p className="text-sm text-muted-foreground">
        Esta atividade se relaciona ao fator {action.source.factorName}, selecionado na leitura
        publicada de {action.source.cohortLabel ?? "seu setor"}. Isso não prova a causa do resultado
        nem indica uma deficiência individual.
      </p>
      <p className="text-sm">
        {content.status === "TESTE"
          ? "Exercício de TESTE, sem recomendação científica aprovada. "
          : ""}
        Respostas ficam somente nesta sessão e não são enviadas à empresa. Preparar a aplicação não
        comprova conclusão, domínio ou eficácia.
      </p>
      {activity.checks.map((check) => (
        <fieldset key={check.id} className="space-y-2 rounded border p-3">
          <legend className="px-1 text-sm font-medium">{check.question}</legend>
          {check.options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name={`${action.id}-${content.contentId}-${check.id}`}
                checked={answers[check.id] === option.id}
                onChange={() => {
                  setAnswers((a) => ({ ...a, [check.id]: option.id }));
                  setReady(false);
                }}
              />
              {option.label}
            </label>
          ))}
          {answers[check.id] && (
            <p role="status" className="text-sm">
              {answers[check.id] === check.correctOptionId
                ? "Alinhado ao roteiro. "
                : "Revise o roteiro. "}
              {check.explanation}
            </p>
          )}
        </fieldset>
      ))}
      <p className="text-sm">{activity.practicePrompt}</p>
      <p className="text-sm text-muted-foreground">
        {activity.reviewPrompt} Você pode retornar aqui em outra sessão; as respostas serão
        reiniciadas. Combine o momento da revisão conforme o contexto, sem intervalo universal
        presumido.
      </p>
      <button
        type="button"
        className="min-h-11 rounded border px-3 text-sm focus-visible:ring-2"
        onClick={() => {
          setAnswers({});
          setReady(false);
        }}
      >
        Revisar sem consulta
      </button>
      {!sourceAvailable && (
        <p role="note">
          Para preparar a aplicação, abra a leitura publicada da origem desta ação.{" "}
          <a
            className="underline"
            href={`/ivo-integral/acoes?wave=${encodeURIComponent(action.source.waveId)}`}
          >
            Abrir origem
          </a>
          . Fontes protegidas não permitem novas aplicações.
        </p>
      )}
      {grade.allAnswered && sourceAvailable && plan.status !== "closed" && (
        <label className="flex min-h-11 items-start gap-2 text-sm">
          <input type="checkbox" checked={ready} onChange={(e) => setReady(e.target.checked)} />
          Quero preparar uma aplicação compartilhada no plano. Somente o formulário confirmado será
          registrado; não inclua nomes ou relatos pessoais. Tempo, apoio e recursos devem ser
          combinados com a gestão.
        </label>
      )}
      {ready && sourceAvailable && (
        <AddActionToPlanForm
          plan={plan}
          view={view}
          busy={busy}
          idSuffix={`${action.id}-${content.contentId}`}
          initialSource={{ cohortId: action.source.cohortId, factorId: action.source.factorId }}
          onSubmit={(planId, input) =>
            onSubmit(planId, input, {
              contentId: content.contentId,
              contentVersion: content.version,
              activityVersion: activity.version,
            })
          }
        />
      )}
      {plan.status === "closed" && (
        <p role="note">
          Plano encerrado: você pode revisar o conteúdo; novas aplicações não são aceitas.
        </p>
      )}
    </section>
  );
}

export function LearningApplicationTrace({ action }: { action: FibtActionView }) {
  const trace = learningApplicationTrace(action);
  if (!trace) return null;
  return (
    <section
      aria-label="Rastreabilidade da aplicação"
      className="space-y-2 rounded border p-3 text-sm"
    >
      <h5 className="font-semibold">Aplicação de aprendizagem planejada</h5>
      <p>
        Conteúdo versão {trace.content.version}
        {trace.content.test
          ? " — TESTE; curadoria pendente"
          : " — referência histórica; consulte a curadoria vigente"}
        . Origem: {action.source.factorName} · {action.source.cohortLabel ?? "setor"}.
      </p>
      <p>
        {trace.executionRecords} registros de execução · {trace.learningRecords} registros de
        aprendizagem.
      </p>
      <p>{trace.statement}</p>
      <p>{trace.nextStep}</p>
      <p className="text-muted-foreground">
        Prévia descritiva para prestação de contas. Não é relatório ESG homologado e não contém
        respostas pedagógicas individuais.
      </p>
    </section>
  );
}
