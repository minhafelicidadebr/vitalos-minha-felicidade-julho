// Q3 · PERMA+V — contrato de prontidão (fundação neutra, 19/11/2026).
//
// O Q3 é uma lente independente. Este arquivo NÃO define instrumento, itens, escala,
// cálculo, pontuação, mapeamento para dimensões IVO nem equivalência com Q1/Q2.
// Ele só registra as pré-condições que precisam de decisão humana registrada antes
// que qualquer tela, rota, módulo ou persistência trate o PERMA+V como mensuração.
//
// Enquanto houver pré-condição pendente, o catálogo deve manter `perma_v` como
// "planned", sem versão e sem rota (teste em q3-readiness.test.ts). Fechar uma
// pré-condição = trocar o status para "decided" COM referência ao registro de decisão
// (arquivo em docs/vitalos/decisions/), nunca por inferência do agente.

export type Q3PreconditionStatus = "pending" | "decided";

export interface Q3Precondition {
  id: string;
  /** O que precisa ser decidido. */
  decision: string;
  /** Papel responsável (não nome de pessoa). */
  owner: "responsável metodológico" | "operador" | "operador e responsável metodológico";
  status: Q3PreconditionStatus;
  /** Obrigatório quando `decided`: caminho do registro de decisão. */
  decisionRecord: string | null;
}

export const Q3_PRECONDITIONS: readonly Q3Precondition[] = [
  { id: "Q3-01", decision: "Instrumento oficial: nome, autoria, edição/forma, idioma e o significado do “+V” em PERMA+V", owner: "responsável metodológico", status: "decided", decisionRecord: "docs/vitalos/decisions/DECISOES_Q3_FUNDADOR_2026-11-19.md" },
  { id: "Q3-02", decision: "Fonte e versão da adaptação brasileira (referência, DOI ou arquivo com hash) e permissão de uso", owner: "responsável metodológico", status: "pending", decisionRecord: null },
  { id: "Q3-03", decision: "Itens, escala, polaridade, regras de ausência e cálculo por fator, com casos esperados", owner: "responsável metodológico", status: "pending", decisionRecord: null },
  { id: "Q3-04", decision: "Limiar de publicação agregada e proteção de recortes (k mínimo, lote protegido)", owner: "operador e responsável metodológico", status: "decided", decisionRecord: "docs/vitalos/decisions/DECISOES_Q3_FUNDADOR_2026-11-19.md" },
  { id: "Q3-05", decision: "Mapeamento para dimensões IVO (ou decisão de não mapear) — sem índice composto", owner: "responsável metodológico", status: "pending", decisionRecord: null },
  { id: "Q3-06", decision: "Habilitação empresarial: módulo Q3 em org_module_entitlements (exige migration autorizada)", owner: "operador", status: "decided", decisionRecord: "docs/vitalos/decisions/DECISOES_Q3_FUNDADOR_2026-11-19.md" },
  { id: "Q3-07", decision: "Papéis: quem aplica, lê agregado, conduz devolutiva e ações; nenhum acesso a respostas individuais", owner: "operador", status: "decided", decisionRecord: "docs/vitalos/decisions/DOSSIE_DECISOES_Q3_LINHAGEM_PILOTO_2026-11-19.md" },
  { id: "Q3-08", decision: "Conteúdo educativo de referência (unidade/atividade versionada) e sua revisão editorial", owner: "operador e responsável metodológico", status: "decided", decisionRecord: "docs/vitalos/decisions/DECISOES_Q3_FUNDADOR_2026-11-19.md" },
];

/** O Q3 só pode deixar de ser "planned" quando TODAS as pré-condições estiverem decididas e registradas. */
export function isQ3Activatable(preconditions: readonly Q3Precondition[] = Q3_PRECONDITIONS): boolean {
  return preconditions.length > 0 && preconditions.every((p) => p.status === "decided" && !!p.decisionRecord);
}
