import type { MeteAxis } from "./institutional-editorial";

export const MATRIX_VERSION = "0.1.0-sintetica";
type EsgAxis = "E" | "S" | "G";
type EvidenceState = "execution" | "partial" | "protected" | "absent";
interface PhaseEvent { phase: MeteAxis; eventRef: string; roles: readonly string[]; status: "planned" | "recorded" }
interface ProposedLink { axis: EsgAxis; status: "proposed" | "unsupported"; rationale: string }
export interface DescriptiveComparison {
  before: number; after: number; beforeVersion: string; afterVersion: string;
  unitBefore: string; unitAfter: string; desiredDirection: "increase" | "decrease";
}
export interface SyntheticMatrixCase {
  id: string; actionId: string; title: string; driver: string;
  state: EvidenceState; events: readonly PhaseEvent[]; links: readonly ProposedLink[];
  observation: string; source: string; limitation: string; nextStep: string;
  comparison?: DescriptiveComparison;
}

const format = (value: number) => value.toLocaleString("pt-BR", { maximumSignificantDigits: 12 });
/** Mudança na unidade original. Não estima efeito, precisão ou significância. */
export function describeObservedChange(input?: DescriptiveComparison) {
  if (!input) return { status: "not_estimable" as const, text: "Mudança não estimável: sem medidas comparáveis.", attribution: "Efeito atribuível não estimável." };
  if (!Number.isFinite(input.before) || !Number.isFinite(input.after) ||
    !input.beforeVersion.trim() || input.beforeVersion !== input.afterVersion ||
    !input.unitBefore.trim() || input.unitBefore !== input.unitAfter ||
    !["increase", "decrease"].includes(input.desiredDirection)) {
    return { status: "incompatible" as const, text: "Comparação indisponível: medidas ou versões incompatíveis.", attribution: "Efeito atribuível não estimável." };
  }
  const delta = input.after - input.before;
  if (!Number.isFinite(delta)) return { status: "incompatible" as const, text: "Comparação indisponível: resultado não finito.", attribution: "Efeito atribuível não estimável." };
  const direction = delta === 0 ? "sem variação observada" : (input.desiredDirection === "increase" ? delta > 0 : delta < 0) ? "sentido desejado" : "sentido contrário ao desejado";
  return {
    status: "descriptive" as const,
    text: `${format(input.before)} → ${format(input.after)} ${input.unitBefore}; Δ ${delta > 0 ? "+" : ""}${format(delta)} ${input.unitBefore} (${direction}).`,
    attribution: "Mudança descritiva sintética. Efeito atribuível e intervalo de confiança não estimáveis com estes dados.",
  };
}

const STATE_LABEL = { execution: "Execução registrada · exemplo", partial: "Informação parcial", protected: "Protegido", absent: "Sem medição de resultado" };
const ROLE_LABEL: Record<string, string> = {
  LIDER_EQUIPE: "Liderança de equipe", RH_ADMIN: "RH · administração",
  CHRO: "Direção de pessoas", COLABORADOR: "Colaborador", C_LEVEL: "Direção executiva",
};

/** Somente para fixtures. Não é autorização, mapeamento aprovado ou adaptador de produção. */
export function projectMatrixCase(row: SyntheticMatrixCase) {
  if (row.state === "protected") return {
    id: "retido", title: "Conteúdo protegido", driver: "Não exibido", state: STATE_LABEL.protected,
    phases: "Não exibidas", roles: "Não exibidos", links: "Não exibidos",
    observation: "Textos, valores, fontes e vínculos retidos.", source: "Não exibida",
    limitation: "Proteção não equivale a resultado zero.", nextStep: "Revisar somente a disponibilidade autorizada.",
    change: { status: "not_estimable" as const, text: "Mudança não exibida por proteção.", attribution: "Efeito e precisão não exibidos neste estado." },
  };
  return {
    id: row.id, title: row.title, driver: row.driver, state: STATE_LABEL[row.state],
    phases: row.events.map(e => `${e.phase}: ${e.status === "recorded" ? "registro sintético" : "planejado"}`).join(" · "),
    roles: [...new Set(row.events.flatMap(e => [...e.roles]))].map(role => ROLE_LABEL[role] ?? "Papel não reconhecido").join(" · "),
    links: row.links.map(link => `${link.axis} — ${link.status === "proposed" ? "vínculo proposto" : "sem sustentação"}: ${link.rationale}`).join(" | "),
    observation: row.observation, source: row.source, limitation: row.limitation, nextStep: row.nextStep,
    change: describeObservedChange(row.comparison),
  };
}

/** Conta eventos únicos de transformação visíveis; papel ou tema extra não soma execução. */
export function countVisibleExecutionEvents(rows: readonly SyntheticMatrixCase[]) {
  return new Set(rows.filter(row => row.state !== "protected")
    .flatMap(row => row.events.filter(e => e.phase === "Transformar" && e.status === "recorded").map(e => e.eventRef))).size;
}

export const SYNTHETIC_MATRIX_CASES: readonly SyntheticMatrixCase[] = [
  {
    id: "SYN-01", actionId: "SYN-ACAO-01", title: "Acordo de voz e escuta", driver: "Segurança psicológica",
    state: "execution", events: [{ phase: "Transformar", eventRef: "SYN-EVENTO-01", roles: ["LIDER_EQUIPE", "RH_ADMIN"], status: "recorded" }],
    links: [{ axis: "S", status: "proposed", rationale: "condições de participação" }, { axis: "G", status: "proposed", rationale: "processo de resposta ainda a verificar" }],
    observation: "Um encontro foi registrado no exemplo; não há avaliação do funcionamento posterior do acordo.",
    source: "Fixture SYN-01; nenhum estudo ou evento de cliente é representado.",
    limitation: "Encontro e participação não demonstram segurança psicológica ou ausência de retaliação.",
    nextStep: "Definir observação das condições de escuta e de resposta, com proteção aos participantes.",
  },
  {
    id: "SYN-02", actionId: "SYN-ACAO-02", title: "Revisão de um fluxo de decisão", driver: "Autonomia",
    state: "execution", events: [{ phase: "Mensurar", eventRef: "SYN-MEDIDA-02", roles: ["RH_ADMIN"], status: "recorded" }, { phase: "Transformar", eventRef: "SYN-EVENTO-02", roles: ["LIDER_EQUIPE", "RH_ADMIN"], status: "recorded" }, { phase: "Evoluir", eventRef: "SYN-REVISAO-02", roles: ["CHRO"], status: "planned" }],
    links: [{ axis: "S", status: "proposed", rationale: "condições de trabalho" }, { axis: "G", status: "proposed", rationale: "fluxo de decisão" }],
    observation: "Tempo médio de espera passou de 10 para 12 horas por demanda no exemplo.",
    source: "Médias sintéticas SYN-02; definição de medida v1, mesma unidade; sem comparador ou variância.",
    limitation: "A variação é contrária ao objetivo; composição, volume de trabalho e outros fatores podem explicá-la.",
    nextStep: "Investigar a barreira e a comparabilidade; não atribuir a mudança à intervenção.",
    comparison: { before: 10, after: 12, beforeVersion: "v1", afterVersion: "v1", unitBefore: "horas por demanda", unitAfter: "horas por demanda", desiredDirection: "decrease" },
  },
  {
    id: "SYN-03", actionId: "SYN-ACAO-03", title: "Revisão de acesso", driver: "Inclusão", state: "protected",
    events: [], links: [], observation: "", source: "", limitation: "", nextStep: "",
  },
  {
    id: "SYN-04", actionId: "SYN-ACAO-04", title: "Prática de aprendizagem aplicada", driver: "Crescimento",
    state: "partial", events: [{ phase: "Educar", eventRef: "SYN-EDU-04", roles: ["COLABORADOR", "LIDER_EQUIPE"], status: "recorded" }, { phase: "Evoluir", eventRef: "SYN-RETORNO-04", roles: ["RH_ADMIN"], status: "planned" }],
    links: [{ axis: "S", status: "proposed", rationale: "desenvolvimento e condições de aplicação" }],
    observation: "Prática oferecida no exemplo, sem avaliação de retenção ou transferência.",
    source: "Fixture SYN-04; sem resposta ou nota individual.",
    limitation: "Oferta não comprova aprendizagem. Não autoriza decisão de desempenho de pessoas.",
    nextStep: "Definir avaliação apropriada e apoio para aplicação; manter respostas privadas.",
  },
  {
    id: "SYN-05", actionId: "SYN-ACAO-05", title: "Proposta de uso responsável de recursos", driver: "Futuro e bem comum",
    state: "absent", events: [{ phase: "Mensurar", eventRef: "SYN-PLANO-05", roles: ["CHRO", "C_LEVEL"], status: "planned" }],
    links: [{ axis: "E", status: "unsupported", rationale: "sem baseline físico ou medição ambiental" }],
    observation: "Há uma proposta sintética, mas não há dados de consumo, resíduos ou emissões.",
    source: "Fixture SYN-05; planejamento apenas.",
    limitation: "Vitalidade humana e intenção ambiental não equivalem a economia de energia ou redução de emissões.",
    nextStep: "Definir desfecho físico e fonte adequada antes de estimar qualquer efeito ambiental.",
  },
];

export function buildSyntheticMatrix() {
  return {
    mode: "synthetic" as const, version: MATRIX_VERSION,
    rows: SYNTHETIC_MATRIX_CASES.map(projectMatrixCase),
    uniqueExecutionEvents: countVisibleExecutionEvents(SYNTHETIC_MATRIX_CASES),
    note: "Cinco cenários sintéticos independentes para revisão, sem representar totais do ciclo. Vínculos propostos não são mapeamentos aprovados, nota ESG, certificação ou estimativa causal.",
  };
}
