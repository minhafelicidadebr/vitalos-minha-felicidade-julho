// Fechamento demonstrativo do Q5: do caso fictício do Q2 a uma proposta para o próximo ciclo.
// Tudo aqui é ilustrativo: nenhuma decisão é registrada nem persistida, e o efeito segue sem avaliação.
// Responde quatro perguntas: prioridade e motivo; planejado e registrado; aprendizado e o que observar;
// proposta (manter, ajustar ou encerrar), responsável e ponto de revisão.
import { Link } from "@tanstack/react-router";

export interface Q5Practice {
  name: string;
  action: string;
  record: string;
  review: string;
  reason: string;
}

type Decision = "manter" | "ajustar" | "encerrar";
const DECISION_LABEL: Record<Decision, string> = { manter: "Manter", ajustar: "Ajustar", encerrar: "Encerrar" };
const DECISION_HINT: Record<Decision, string> = {
  manter: "continua no próximo ciclo, com nova revisão da equipe",
  ajustar: "muda o formato ou remove uma barreira antes de repetir",
  encerrar: "sai da rotina se a equipe concluir que não cabe",
};

/** Sugestão do caso: com execução registrada, manter; sem registro, ajustar. Encerrar permanece uma opção da equipe. */
export function suggestedDecision(recorded: boolean): Decision {
  return recorded ? "manter" : "ajustar";
}

export function Q5Synthesis({ practice, recorded }: { practice: Q5Practice; recorded: boolean }) {
  const suggestion = suggestedDecision(recorded);
  const rows: [string, React.ReactNode][] = [
    [
      "Qual prioridade foi escolhida e por quê?",
      <>
        <strong>{practice.name}</strong>. {practice.reason} Esta é a leitura do grupo do caso fictício.
      </>,
    ],
    [
      "O que foi planejado e o que tem execução registrada?",
      <>
        Planejado: {practice.action}{" "}
        {recorded ? `Execução registrada: ${practice.record}` : "Execução registrada: nenhuma até agora; a prática aguarda execução."}
      </>,
    ],
    [
      "O que aprendemos e o que ainda precisa ser observado?",
      <>
        {recorded
          ? `A execução foi registrada. A observar: ${practice.review}`
          : "Ainda não há o que aprender com a prática. Primeiro, entender o que impediu a execução."}{" "}
        <strong>Efeito ainda não avaliado.</strong> Uma nova leitura será necessária para investigar mudanças.
      </>,
    ],
  ];
  return (
    <section aria-labelledby="q5-synthesis-title" className="space-y-4">
      <h3 id="q5-synthesis-title" className="font-semibold text-foreground">
        Síntese do caso fictício
      </h3>
      <dl className="grid gap-3 sm:grid-cols-3">
        {rows.map(([question, answer]) => (
          <div key={question} className="rounded-xl bg-muted/50 p-3">
            <dt className="font-semibold">{question}</dt>
            <dd className="mt-1 text-sm">{answer}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
        <p className="font-semibold text-foreground">Qual é a proposta para o próximo ciclo, quem a revisa e quando?</p>
        <ul className="grid gap-2 sm:grid-cols-3" aria-label="Opções de decisão">
          {(Object.keys(DECISION_LABEL) as Decision[]).map((id) => (
            <li key={id} className={`rounded-lg border p-3 text-sm ${id === suggestion ? "border-primary bg-card" : "border-border"}`}>
              <p className="font-semibold">
                {DECISION_LABEL[id]}
                {id === suggestion ? <span className="ml-2 text-xs font-medium text-primary">· Sugestão para este caso</span> : null}
              </p>
              <p className="mt-1 text-muted-foreground">{DECISION_HINT[id]}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm">
          <span className="font-semibold">Quem assume o próximo passo:</span> o RH, com a liderança da equipe.{" "}
          <span className="font-semibold">Ponto de revisão:</span> na primeira semana do próximo ciclo, antes da nova leitura do grupo.
        </p>
        <p className="text-sm text-muted-foreground">
          Sugestão do caso ilustrativo: nenhuma decisão foi registrada. No Q1 do próximo ciclo, o RH prepara a nova escuta com o que a equipe decidir aqui.
        </p>
        <Link
          className="inline-flex min-h-11 items-center rounded-lg border border-primary/40 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          to="/guia-empresarial"
          search={{ etapa: "Q1", perfil: "rh" }}
        >
          Ver como o Q1 prepara a próxima escuta
        </Link>
      </div>
    </section>
  );
}
