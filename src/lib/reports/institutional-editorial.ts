// Modelo editorial puro: não consulta banco, não aprova método e não agrega instrumentos.
export const EDITORIAL_VERSION = "0.1.0-prototipo";
export const REPORT_STATES = {
  available: "Disponível", partial: "Parcial", protected: "Protegido",
  absent: "Sem evidência", pending: "Método pendente", unavailable: "Consulta indisponível",
  historical: "Referência histórica", not_applicable: "Não aplicável",
} as const;
export type ReportState = keyof typeof REPORT_STATES;
export type EditorialEvidence =
  | { state: "available" | "partial" | "historical"; label: string; text: string; source: string; limitation: string }
  | { state: "protected" | "absent" | "pending" | "unavailable" | "not_applicable"; label: string };
export type MeteAxis = "Mensurar" | "Educar" | "Transformar" | "Evoluir";
export interface EditorialBlock {
  axis: MeteAxis;
  question: string;
  evidence: EditorialEvidence;
  interpretation: string;
  nextStep: string;
}
export interface InstitutionalEditorial {
  mode: "synthetic";
  version: string;
  organization: string;
  period: string;
  cutoff: string;
  blocks: EditorialBlock[];
  commitments: Array<{ action: string; role: string; timing: string; evidence: string }>;
}

// Whitelist de projeção: mesmo um objeto malformado com campos extras não expõe
// valor, fonte, texto ou contagem quando o estado exige retenção.
export function projectEditorialEvidence(evidence: EditorialEvidence) {
  const state = evidence.state;
  if (state === "available" || state === "partial" || state === "historical") {
    return { label: evidence.label, state: REPORT_STATES[state], text: evidence.text, source: evidence.source, limitation: evidence.limitation };
  }
  return {
    label: evidence.label, state: REPORT_STATES[state],
    text: state === "protected" ? "Conteúdo retido por proteção. Nenhum valor ou contagem é exibido." : "Não há resultado disponível para apresentar neste estado.",
    source: "Não exibida neste bloco.",
    limitation: "Ausência, proteção e pendência não representam resultado zero.",
  };
}

// Instituição e contatos fornecidos pelo operador; não são dados do cliente.
export const REPORT_INSTITUTION = {
  name: "Instituto Felicidade para Todos",
  mission: "Ativar e animar ecossistemas sustentáveis de felicidade humana, socioambiental e organizacional.",
  attribution: "Organização idealizadora — informação fornecida pelo responsável institucional.",
  address: "Impact HUB Brasília — SGAN 601, Lote H, Ed. Íon, Ala Amarela, Asa Norte, Brasília/DF",
  phone: "(61) 3550-8779",
  site: "https://www.felicidadeparatodos.com.br/",
  instagram: "@felicidadeparatodosbr",
  version: "2026-11-15-operador",
} as const;

// Fixture exclusivamente sintética. Nenhum vínculo implícito com organização logada.
export const SYNTHETIC_EDITORIAL: InstitutionalEditorial = {
  mode: "synthetic", version: EDITORIAL_VERSION,
  organization: "Organização Exemplo · fictícia", period: "Ciclo ilustrativo · 2026", cutoff: "2026-11-15",
  blocks: [
    { axis: "Mensurar", question: "O que está disponível para orientar a leitura?", evidence: { state: "protected", label: "Recorte ilustrativo protegido" }, interpretation: "Este exemplo demonstra retenção de dados. Não permite classificar o resultado ou deduzir o tamanho do grupo.", nextStep: "Revisar a disponibilidade da leitura pelos contratos de publicação, sem revelar recortes protegidos." },
    { axis: "Educar", question: "Que aprendizagem foi oferecida e o que foi observado?", evidence: { state: "partial", label: "Prática de equipe · exemplo", text: "Uma atividade sintética foi oferecida. Não há avaliação de retenção ou transferência disponível.", source: "Fixture editorial EDU-01 · versão 0.1.0", limitation: "Oferta e participação não comprovam aprendizagem. Conteúdo deste protótipo não é recomendação científica." }, interpretation: "Há informação sobre a oferta; não há base para afirmar domínio ou mudança no trabalho.", nextStep: "Definir como revisar compreensão e aplicação, com privacidade e critérios aprovados." },
    { axis: "Transformar", question: "O que foi executado e quais barreiras apareceram?", evidence: { state: "available", label: "Aplicação organizacional · exemplo", text: "Um encontro sintético foi executado. O registro descreve falta de tempo autorizado para a continuidade.", source: "Fixture editorial ACAO-01 · versão 0.1.0", limitation: "Exemplo de execução e barreira organizacional; não é evidência de eficácia ou resultado de um cliente." }, interpretation: "A entrega foi registrada, mas a condição para sustentá-la permanece insuficiente. Não atribuir a barreira à pessoa.", nextStep: "Combinar tempo e apoio antes de repetir a aplicação." },
    { axis: "Evoluir", question: "O que pode ser concluído e qual decisão vem a seguir?", evidence: { state: "pending", label: "Avaliação do ciclo · inconclusiva" }, interpretation: "Não há parecer conclusivo. Uma sequência visual de atividades não estabelece causalidade entre mensuração, educação e intervenção.", nextStep: "Revisar comparabilidade, método e evidências antes de qualquer conclusão de eficácia." },
  ],
  commitments: [
    { action: "Revisar condições de continuidade", role: "Gestão · papel ilustrativo", timing: "Próxima revisão pactuada", evidence: "Registro das condições acordadas e das barreiras remanescentes" },
    { action: "Preparar avaliação de aplicação", role: "Curadoria · papel ilustrativo", timing: "Antes de uma aplicação futura", evidence: "Rubrica e protocolo aprovados para o contexto" },
  ],
};
