import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { usePack } from "@/engine/pack";
import { usePersona } from "@/app/identity/persona-store";
import { useRealOrgSession } from "@/app/identity/useRealOrgSession";
import { Q5Synthesis } from "./Q5Synthesis";

const practices = {
  decisao: {
    name: "Compartilhar decisões",
    reason: "A equipe relatou dificuldade para acompanhar decisões.",
    action: "A liderança sintetiza as decisões da reunião e abre um canal para dúvidas.",
    record: "O resumo foi compartilhado e a equipe recebeu um canal para dúvidas.",
    review: "Perguntar à equipe se ficou mais fácil encontrar as decisões.",
  },
  escuta: {
    name: "Reservar tempo para escuta",
    reason: "A equipe relatou dificuldade para dar sugestões.",
    action: "A liderança reserva dez minutos na reunião para ouvir sugestões e combinar um retorno.",
    record: "A rodada de escuta aconteceu e a liderança combinou quando dará retorno.",
    review: "Consultar a equipe sobre a utilidade do retorno às sugestões.",
  },
} as const;

type DemoSearch = { percurso?: "q2"; pratica?: keyof typeof practices; registro?: "feito" | "pendente" };

export function parseQ2DemoSearch(input: Record<string, unknown>): DemoSearch {
  const pratica = input.pratica === "decisao" || input.pratica === "escuta" ? input.pratica : undefined;
  const registro = input.registro === "feito" || input.registro === "pendente" ? input.registro : undefined;
  return { percurso: input.percurso === "q2" ? "q2" : undefined, pratica, registro };
}

type Props = { step: "entrada" | "rh" | "lider" | "equipe" | "q5"; search?: ReturnType<typeof parseQ2DemoSearch> };
const linkStyle = "inline-flex min-h-11 items-center rounded-lg border border-primary/40 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring";

export function Q2DemoWalkthrough(props: Props) {
  const { status } = useRealOrgSession();
  return <Q2DemoJourney {...props} anonymous={status === "anonymous"} />;
}

export function Q2DemoJourney({ anonymous, ...props }: Props & { anonymous: boolean }) {
  const { pack } = usePack();
  if (!anonymous || pack?.packId !== "enterprise") return null;
  if (props.step !== "entrada" && props.search?.percurso !== "q2") return null;
  return <Walkthrough {...props} />;
}

function Walkthrough({ step, search }: Props) {
  const title = useRef<HTMLHeadingElement>(null);
  const [hasReading, setHasReading] = useState(true);
  const setRole = usePersona(s => s.setRole);
  useEffect(() => {
    if (step !== "entrada") {
      if (step !== "q5") setRole({ rh: "RH_ADMIN", lider: "LIDER_EQUIPE", equipe: "COLABORADOR" }[step]);
      title.current?.focus();
    }
  }, [step, setRole]);
  const key = search?.pratica;
  const practice = key && practices[key];
  const recorded = search?.registro === "feito";
  const restart = <Link className={linkStyle} to="/rh" search={{ percurso: "q2" }}>Começar pelo RH</Link>;
  const heading = { entrada: "Da pesquisa à devolutiva", rh: "Escolha uma prática para a equipe", lider: "Registre o andamento da prática", equipe: "Veja a devolutiva da equipe", q5: "Decisão para o próximo ciclo" }[step];
  return (
    <section aria-labelledby="q2-demo-title" className="mx-auto my-6 max-w-6xl px-4 sm:px-6">
      <div className="space-y-4 rounded-2xl border border-primary/25 bg-card p-5 sm:p-7">
        <p className="text-sm font-medium text-primary">{step === "q5" ? "Q5 · Caso fictício do Q2" : "Demonstração Q2 · Empresa fictícia"}</p>
        <h2 ref={title} tabIndex={-1} id="q2-demo-title" className="font-serif text-2xl text-foreground">{heading}</h2>
        {step === "entrada" ? <>
          <p>Experimente o mesmo caso em três papéis. O RH escolhe uma prática, a liderança registra o andamento e a equipe recebe a devolutiva.</p>
          {restart}
        </> : step === "rh" ? <>
          <label className="flex min-h-11 flex-wrap items-center gap-2 text-sm font-medium">Cenário da leitura
            <select className="min-h-11 max-w-full rounded-md border border-border bg-background px-2" value={hasReading ? "publicada" : "pendente"} onChange={e => setHasReading(e.target.value === "publicada")}>
              <option value="publicada">Leitura publicada</option>
              <option value="pendente">Aguardando publicação</option>
            </select>
          </label>
          {hasReading ? <>
          <p><strong>Leitura do grupo.</strong> Neste exemplo, a equipe relata dificuldade para acompanhar decisões e dar sugestões. Qual prática o RH vai combinar com a liderança?</p>
          <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(practices) as Array<keyof typeof practices>).map(id =>
            <div key={id} className="space-y-2 rounded-xl border border-border p-4">
              <p className="text-sm">{practices[id].action}</p>
              <Link className={linkStyle} to="/lider" search={{ percurso: "q2", pratica: id }}>{practices[id].name}</Link>
            </div>)}</div></> : <p role="status">A equipe aguarda a leitura agregada. O RH poderá escolher uma prioridade quando o resultado for publicado.</p>}
        </> : !practice || ((step === "equipe" || step === "q5") && !search?.registro) ? <>
          <p>Este percurso ainda precisa de uma escolha do RH e de um registro da liderança para compor a devolutiva.</p>{restart}
        </> : step === "lider" ? <>
          <p><strong>Prática combinada pelo RH.</strong> {practice.action}</p>
          <p>Escolha o andamento que deseja simular e acompanhe o que chega à equipe.</p>
          <div className="flex flex-wrap gap-2">{(["feito", "pendente"] as const).map(registro =>
            <Link key={registro} className={linkStyle} to="/colaborador" search={{ percurso: "q2", pratica: key, registro }}>{registro === "feito" ? "Simular prática realizada" : "Simular prática pendente"}</Link>)}</div>
        </> : <>
          {step === "q5" ? <Q5Synthesis practice={practice} recorded={recorded} /> : <>
          <p className="font-medium">{practice.name}</p>
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              [recorded ? "Execução registrada" : "Execução prevista", recorded ? practice.record : "A prática está combinada e aguarda execução."],
              ["Aprendizagem a observar", recorded ? practice.review : "A revisão com a equipe poderá ocorrer depois da prática."],
              ["Efeito no indicador", "Ainda sem avaliação. Uma nova leitura será necessária para investigar mudanças."],
            ].map(([label, value]) => <div key={label} className="rounded-xl bg-muted/50 p-3"><dt className="font-semibold">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>)}
          </dl></>}
          <details open={step === "q5" || undefined} className="rounded-xl border border-border p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Como isso entra no plano do próximo ciclo?</summary>
            <p className="mt-3"><strong>Q5 · Consolidar.</strong> {recorded
              ? "RH e liderança revisam o registro com a equipe e decidem se vale manter ou ajustar a prática."
              : "RH e liderança identificam o que impediu a execução e decidem se vale remover a barreira, ajustar a prática ou substituí-la."}</p>
            <p className="mt-2">No plano seguinte, registrem a decisão, quem assume a ação e quando será feita uma nova leitura do grupo.</p>
          </details>
          <div className="flex flex-wrap gap-2">
            {step === "equipe" && <Link className={linkStyle} to="/relatorio-global" search={search}>Abrir exemplo no relatório global</Link>}
            {step === "q5" && <Link className={linkStyle} to="/colaborador" search={search}>Voltar à devolutiva</Link>}
            {restart}
          </div>
        </>}
      </div>
    </section>
  );
}
