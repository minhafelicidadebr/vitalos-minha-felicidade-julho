// Agent engine — puro. A evolução proativa da FlorescerIA: OBSERVA agregados já
// computados pelos demais motores (priority, evidence, IVO, season) e PROPÕE
// ações — cada uma exigindo aprovação humana (invariante) e operando só sobre
// agregados (guardrail por construção). Não computa métrica nova; transforma o
// estado em recomendações acionáveis. Nunca importa de domain/.

export type ProposalKind =
  | "ativar_prioridade"
  | "escalar_experimento"
  | "revisar_experimento"
  | "agir_pilar_em_queda"
  | "aproveitar_fase";

export type ProposalUrgency = "alta" | "media" | "baixa";

// ─── Observações (montadas pela rota a partir dos outros motores) ─────────────

export interface ObservedPriority {
  leverId: string;
  label: string;
  owner: string | null; // embaixadoria responsável
  lift: number;
  isQuickWin: boolean;
}

export interface ObservedExperiment {
  id: string;
  name: string;
  verdict: string; // do evidence-engine
  netEffect: number;
  reportable: boolean; // false = protegido por k-anon → nunca vira proposta
}

export interface ObservedDecliningPillar {
  pillarId: string;
  name: string;
  score: number;
  drop: number; // queda em pts desde o ciclo anterior (positivo = caiu)
}

export interface AgentObservations {
  topPriority?: ObservedPriority | null;
  experiments?: ObservedExperiment[];
  decliningPillars?: ObservedDecliningPillar[];
  phaseId?: string; // mensurar/educar/transformar/evoluir
  seasonName?: string;
}

// ─── Proposta ─────────────────────────────────────────────────────────────────

export interface AgentProposal {
  id: string;
  kind: ProposalKind;
  urgency: ProposalUrgency;
  trigger: string; // "O que observei"
  recommendation: string; // "O que sugiro"
  rationale: string; // por quê, com o número
  targetRoute: string; // para onde a aprovação leva
  requiresApproval: true; // human-in-the-loop — invariante, não opção
  guardrailsOk: true; // só agregados → passa por construção
}

const URGENCY_ORDER: Record<ProposalUrgency, number> = { alta: 0, media: 1, baixa: 2 };

export function proposeActions(obs: AgentObservations): AgentProposal[] {
  const out: AgentProposal[] = [];

  // 1) Prioridade de maior alavancagem → ativar como experimento.
  if (obs.topPriority) {
    const p = obs.topPriority;
    out.push({
      id: `prop-prioridade-${p.leverId}`,
      kind: "ativar_prioridade",
      urgency: p.isQuickWin ? "alta" : "media",
      trigger: `A maior alavancagem disponível hoje é “${p.label}” (+${p.lift} pts no IVO).`,
      recommendation: p.owner
        ? `Ativar como experimento, com ${p.owner} responsável.`
        : "Ativar como experimento com um responsável definido.",
      rationale: p.isQuickWin
        ? "Maior retorno por esforço no estado atual — vitória rápida."
        : "Maior alavancagem esperada no estado atual.",
      targetRoute: "/experimentos",
      requiresApproval: true,
      guardrailsOk: true,
    });
  }

  // 2) Pilares em queda desde o ciclo anterior → agir.
  for (const d of obs.decliningPillars ?? []) {
    out.push({
      id: `prop-queda-${d.pillarId}`,
      kind: "agir_pilar_em_queda",
      urgency: d.drop >= 20 ? "alta" : "media",
      trigger: `${d.name} caiu ${d.drop} pts desde o ciclo anterior (agora ${d.score}).`,
      recommendation: "Priorizar uma intervenção neste pilar antes da próxima aferição.",
      rationale: "Reverter cedo custa menos do que recuperar depois.",
      targetRoute: "/prioridades",
      requiresApproval: true,
      guardrailsOk: true,
    });
  }

  // 3) Experimentos concluídos e divulgáveis → escalar ou revisar.
  for (const e of obs.experiments ?? []) {
    if (!e.reportable) continue; // k-anon: nunca propor sobre dado protegido

    if (e.verdict === "confirmado" || e.verdict === "superou") {
      out.push({
        id: `prop-escalar-${e.id}`,
        kind: "escalar_experimento",
        urgency: "media",
        trigger: `O experimento “${e.name}” ${e.verdict === "superou" ? "superou a hipótese" : "confirmou efeito"} (líquido +${e.netEffect} pts).`,
        recommendation: "Escalar o protocolo para novas equipes.",
        rationale: "Funcionou nesta cultura — replicar amplia o efeito comprovado.",
        targetRoute: "/experimentos",
        requiresApproval: true,
        guardrailsOk: true,
      });
    } else if (e.verdict === "sem_efeito") {
      out.push({
        id: `prop-revisar-${e.id}`,
        kind: "revisar_experimento",
        urgency: "media",
        trigger: `“${e.name}” não mostrou efeito detectável (líquido ${e.netEffect >= 0 ? "+" : ""}${e.netEffect} pts).`,
        recommendation: "Revisar o protocolo ou trocar a alavanca antes de repetir.",
        rationale: "Aprender com o que não funcionou evita desperdiçar o próximo ciclo.",
        targetRoute: "/experimentos",
        requiresApproval: true,
        guardrailsOk: true,
      });
    }
  }

  // 4) Janela de fase: Transformar é a hora de rodar protocolos.
  if (obs.phaseId === "transformar") {
    out.push({
      id: "prop-fase-transformar",
      kind: "aproveitar_fase",
      urgency: "baixa",
      trigger: `Estamos na fase Transformar${obs.seasonName ? ` da ${obs.seasonName}` : ""}.`,
      recommendation: "Concentrar os experimentos agora, enquanto a janela está aberta.",
      rationale:
        "O ritmo M.E.T.E. reserva esta fase para intervir — aproveitá-la maximiza o ciclo.",
      targetRoute: "/temporada",
      requiresApproval: true,
      guardrailsOk: true,
    });
  }

  // Ordena por urgência (estável: preserva a ordem de geração nos empates).
  return out
    .map((p, i) => ({ p, i }))
    .sort((a, b) => URGENCY_ORDER[a.p.urgency] - URGENCY_ORDER[b.p.urgency] || a.i - b.i)
    .map(({ p }) => p);
}
