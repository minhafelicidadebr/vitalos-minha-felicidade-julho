import { useId, useState } from "react";
import { ArrowRight, BookOpen, RotateCcw } from "lucide-react";
import { AddActionToPlanForm, type AddActionFormInput } from "./PlanComposition";
import type { EvidenceSubmitResult } from "./FibtActionLoop";
import { PrivatePracticeCase, type PracticeCase } from "./PrivatePracticeCase";
import type { LearningBinding } from "./LearningApplicationJourney";
import { learningReviewSource, matchesLearningApplication } from "@/lib/ivo/learning-application";
import { publishedActionSource } from "@/lib/ivo/published-action-source";
import { formatIsoDateLong } from "@/lib/ivo/local-date";
import type {
  EducationContentView,
  FibtActionPlanView,
  FibtActionView,
  IvoQ2View,
} from "@/lib/ivo/ivo-views";

const DIFFERENT_SHIFT: PracticeCase = {
  recall:
    "Antes de consultar a unidade, relembre o que ajuda uma equipe a pedir apoio e ser ouvida.",
  situation:
    "Na troca de turno, a equipe já sabe como pedir ajuda. O pedido chega, mas ninguém tem tempo reservado ou responsabilidade definida para responder.",
  question: "Qual próximo passo cabe nesse contexto?",
  options: [
    {
      label: "Repetir a orientação a todos.",
      feedback:
        "A equipe já conhece a orientação. Investigue o que impede a resposta durante a troca de turno.",
    },
    {
      label: "Combinar quem recebe o pedido e ajustar as demandas nesse horário.",
      feedback:
        "O ajuste atua nas condições da equipe. Na revisão, observe se houve quem pudesse responder e o que dificultou o combinado.",
    },
    {
      label: "Esperar as pessoas resolverem quando tiverem tempo.",
      feedback:
        "Sem tempo e responsabilidade pactuados, pode faltar oportunidade de testar o acordo. Leve essa barreira à coordenação.",
    },
  ],
};

const OPTIONS = [
  { id: "manter", label: "Manter a prática" },
  { id: "ajustar", label: "Ajustar e preparar uma nova aplicação" },
  { id: "interromper", label: "Interromper a prática" },
  { id: "aguardar", label: "Ainda não houve oportunidade de aplicar" },
] as const;
type Decision = (typeof OPTIONS)[number]["id"];

export function Q2PracticeReview({
  plan,
  action,
  content,
  view,
  busy,
  onConfirm,
}: {
  plan: FibtActionPlanView;
  action: FibtActionView;
  content: EducationContentView;
  view: IvoQ2View | null;
  busy: boolean;
  onConfirm: (input: AddActionFormInput, binding: LearningBinding) => Promise<EvidenceSubmitResult>;
}) {
  const id = useId();
  const [decision, setDecision] = useState<Decision | null>(null);
  const activity = content.activity;
  if (
    content.status !== "APROVADO" ||
    !activity ||
    !matchesLearningApplication(
      action.description,
      { id: content.contentId, version: content.version },
      activity,
    )
  )
    return null;

  const source = action.source;
  const scopedView =
    view?.wave.id === source.waveId &&
    view.cycleKey === plan.cycleKeyCanonical &&
    publishedActionSource(view, source)
      ? {
          ...view,
          sectors: view.sectors
            .filter((sector) => sector.cohortId === source.cohortId)
            .map((sector) => ({
              ...sector,
              factors: sector.factors?.filter((factor) => factor.id === source.factorId) ?? null,
            })),
        }
      : null;
  const nextActions = plan.actions.filter(
    (item) => learningReviewSource(item.description) === action.id,
  );
  const originalId = learningReviewSource(action.description);
  const originalAction = plan.actions.find((item) => item.id === originalId);

  return (
    <details className="min-w-0 space-y-4 break-words rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
      <summary className="min-h-11 cursor-pointer rounded-md py-2 font-semibold focus-visible:outline-2 focus-visible:outline-ring">
        <RotateCcw aria-hidden="true" className="mr-2 inline size-4" />
        Revisar a aplicação
      </summary>
      <div className="space-y-2 text-sm">
        <p className="font-semibold">O que foi combinado</p>
        <p>
          {action.title}
          {action.owner ? ` · ${action.owner.roleLabel}` : ""}
          {action.dueOn ? ` · Prazo: ${formatIsoDateLong(action.dueOn)}` : ""}
        </p>
        {action.executionMetric && <p>Indicador de execução: {action.executionMetric.label}</p>}
        <p className="text-muted-foreground">
          {action.evidence.execution.length} registros de execução ·{" "}
          {action.evidence.learning.length} registros de aprendizagem.
        </p>
        <a
          className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4"
          href={`#execucao-registro-${action.id}`}
        >
          Consultar registros da ação <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </div>
      {originalAction && (
        <p className="text-sm">
          Ação revisada:{" "}
          <a className="underline underline-offset-4" href={`#acao-${originalAction.id}`}>
            {originalAction.title}
          </a>
        </p>
      )}
      {nextActions.length > 0 && (
        <div className="rounded-lg border border-border bg-background/60 p-3 text-sm">
          <p className="font-semibold">Aplicações planejadas após esta revisão</p>
          <ul className="mt-1 space-y-1">
            {nextActions.map((item) => (
              <li key={item.id}>
                <a
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                  href={`#acao-${item.id}`}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BookOpen aria-hidden="true" className="size-4" />O que muda em outro contexto?
      </p>
      <PrivatePracticeCase example={DIFFERENT_SHIFT} />
      <p className="text-sm text-muted-foreground">
        As escolhas do exercício ficam nesta tela. Para decidir sobre o trabalho, use os registros
        da equipe e identifique o que ainda precisa observar.
      </p>
      {plan.status !== "active" ? (
        <p role="note" className="text-sm">
          Revisão disponível para consulta. É preciso ter um plano ativo para registrar a próxima
          aplicação.
        </p>
      ) : (
        <>
          <fieldset className="min-w-0 space-y-1 rounded-lg border border-border bg-background/60 p-3 text-sm">
            <legend className="px-1 font-semibold">Qual decisão faz sentido agora?</legend>
            {OPTIONS.map((option) => (
              <label
                key={option.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name={id}
                  checked={decision === option.id}
                  disabled={busy}
                  onChange={() => setDecision(option.id)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          {decision === "aguardar" && (
            <p role="status" className="text-sm">
              A próxima revisão fica para quando houver oportunidade. Nenhuma ação foi incluída.
            </p>
          )}
          {(decision === "manter" || decision === "interromper") && (
            <div className="space-y-1 text-sm">
              <p>
                Registre a justificativa coletiva em Aprendizagem. Se precisar mudar o estado, use
                as transições disponíveis no cartão.
              </p>
              <div className="flex flex-wrap gap-x-4">
                <a
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                  href={`#aprendizagem-registro-${action.id}`}
                >
                  Abrir Aprendizagem
                </a>
                <a
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                  href={`#estado-acao-${action.id}`}
                >
                  Abrir Mudar estado
                </a>
              </div>
            </div>
          )}
          {decision === "ajustar" &&
            (scopedView ? (
              <AddActionToPlanForm
                plan={plan}
                view={scopedView}
                busy={busy}
                review
                idSuffix={`revisao-${action.id}`}
                initialSource={source}
                onSubmit={(_planId, input) =>
                  onConfirm(input, {
                    contentId: content.contentId,
                    contentVersion: content.version,
                    activityVersion: activity.version,
                  })
                }
              />
            ) : (
              <p role="note" className="text-sm">
                Carregue a leitura publicada da origem para incluir um ajuste.{" "}
                <a
                  className="underline underline-offset-4"
                  href={`/ivo-integral/acoes?wave=${encodeURIComponent(source.waveId)}#acao-${action.id}`}
                >
                  Voltar à leitura de origem
                </a>
                .
              </p>
            ))}
        </>
      )}
    </details>
  );
}
