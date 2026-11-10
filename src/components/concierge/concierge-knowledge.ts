// Base de conhecimento do Concierge VitalOS — respostas determinísticas (custo zero de tokens).
// Somente claims seguros: nada de conformidade automática, ROI garantido ou diagnóstico clínico.
export const WHATSAPP_NUMBER = "5561995648158";
export const CONTACT_EMAIL = "fluxo9d@gmail.com";
export const whatsappLink = (msg: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

export type Block =
  | { kind: "text"; text: string }
  | { kind: "steps"; title: string; items: { icon: string; label: string; detail: string }[] }
  | { kind: "table"; title: string; head: string[]; rows: string[][] }
  | { kind: "callout"; tone: "evidence" | "care"; text: string }
  | { kind: "cta"; label: string; intent: string };

export interface Topic {
  tag: string;
  title: string;
  keywords: string[];
  blocks: Block[];
  next: string[];
}

export const TOPICS: Topic[] = [
  {
    tag: "4Lentes",
    title: "As 4 Lentes VitalOS",
    keywords: ["lente", "lentes", "vitalos", "o que é", "sistema", "plataforma", "ivo"],
    blocks: [
      { kind: "text", text: "O VitalOS é o sistema operacional da vitalidade organizacional. Ele olha a organização por 4 lentes complementares:" },
      { kind: "table", title: "As 4 Lentes", head: ["Lente", "Pergunta central", "O que você enxerga"], rows: [
        ["EU", "Como cada pessoa está florescendo?", "Energia, propósito, forças"],
        ["NÓS", "Como as equipes convivem?", "Confiança, pertencimento, cooperação"],
        ["LIDERANÇA", "Como líderes sustentam o clima?", "Cuidado, clareza, autonomia"],
        ["ORGANIZAÇÃO", "O sistema favorece a vitalidade?", "Processos, cultura, ESG"],
      ] },
      { kind: "callout", tone: "care", text: "Leituras sempre agregadas (grupos ≥ 5 pessoas). Ninguém é exposto ou ranqueado." },
      { kind: "cta", label: "Quero ver as 4 Lentes na minha empresa", intent: "Quero entender as 4 Lentes aplicadas à minha empresa." },
    ],
    next: ["METE", "NR1", "Planos"],
  },
  {
    tag: "NR1",
    title: "NR-1 e riscos psicossociais",
    keywords: ["nr1", "nr-1", "copsoq", "psicossocial", "pgr", "risco", "lei", "norma"],
    blocks: [
      { kind: "text", text: "A NR-1 passou a exigir que riscos psicossociais entrem no gerenciamento de riscos. O VitalOS apoia a preparação da sua organização de forma educativa e organizada:" },
      { kind: "steps", title: "Como apoiamos a prontidão", items: [
        { icon: "🔎", label: "Escuta", detail: "Questionário COPSOQ II agregado e anônimo" },
        { icon: "🗂️", label: "Inventário", detail: "Fatores de risco organizados por dimensão" },
        { icon: "🛠️", label: "Plano de ação", detail: "Ações coletivas priorizadas e acompanhadas" },
        { icon: "📄", label: "Evidências", detail: "Registros para apoiar o PGR da empresa" },
      ] },
      { kind: "callout", tone: "evidence", text: "Ferramenta educativa: não substitui o PGR nem o profissional habilitado, e não garante conformidade automática." },
      { kind: "cta", label: "Avaliar a prontidão NR-1 com um consultor", intent: "Quero avaliar a prontidão da minha organização para a NR-1." },
    ],
    next: ["COPSOQ", "Planos", "4Lentes"],
  },
  {
    tag: "METE",
    title: "Ciclo M.E.T.E.",
    keywords: ["mete", "ciclo", "temporada", "metodologia", "método", "jornada", "como funciona"],
    blocks: [
      { kind: "text", text: "Nossa metodologia transforma medição em mudança real, em ciclos de 13 semanas:" },
      { kind: "steps", title: "M.E.T.E.", items: [
        { icon: "📏", label: "Mensurar", detail: "Aplicar o instrumento certo para a temporada" },
        { icon: "🎓", label: "Educar", detail: "Trilhas curtas na Academia do Florescimento" },
        { icon: "🔁", label: "Transformar", detail: "Experimentos no Culture Lab" },
        { icon: "📈", label: "Evoluir", detail: "Comparar ciclos e consolidar aprendizados" },
      ] },
      { kind: "cta", label: "Montar a jornada anual com um especialista", intent: "Quero montar uma jornada M.E.T.E. para minha organização." },
    ],
    next: ["PERMA", "VIAT", "Planos"],
  },
  {
    tag: "PERMA",
    title: "Florescimento (PERMA)",
    keywords: ["perma", "florescimento", "bem-estar", "bem estar", "felicidade", "engajamento"],
    blocks: [
      { kind: "text", text: "O florescimento no trabalho é medido com base no modelo PERMA, em pulses curtos de cerca de 60 segundos." },
      { kind: "table", title: "Dimensões", head: ["Letra", "Dimensão"], rows: [["P", "Emoções positivas"], ["E", "Engajamento"], ["R", "Relacionamentos"], ["M", "Significado"], ["A", "Realização"]] },
      { kind: "callout", tone: "evidence", text: "O índice é experimental e nunca é usado para avaliar desempenho, promoção ou remuneração." },
    ],
    next: ["VIAT", "METE"],
  },
  {
    tag: "VIAT",
    title: "Mapa de Forças (VIA-T)",
    keywords: ["via", "viat", "forças", "forcas", "talentos", "virtudes"],
    blocks: [
      { kind: "text", text: "O VIA-T mapeia 24 forças de caráter no contexto do trabalho, para que equipes usem mais o que têm de melhor." },
      { kind: "callout", tone: "care", text: "Versão exploratória e de desenvolvimento — não é teste de seleção nem de avaliação." },
    ],
    next: ["PERMA", "4Lentes"],
  },
  {
    tag: "COPSOQ",
    title: "COPSOQ II",
    keywords: ["copsoq", "questionário", "questionario", "escuta"],
    blocks: [
      { kind: "text", text: "O COPSOQ II é um questionário internacional sobre fatores psicossociais do trabalho. No VitalOS ele é aplicado de forma anônima e só mostrado de forma agregada." },
      { kind: "callout", tone: "evidence", text: "Resultados de grupos com menos de 5 respondentes ficam ocultos." },
    ],
    next: ["NR1", "Planos"],
  },
  {
    tag: "SeloEmpresaViva",
    title: "Selo Empresa Viva e ESG",
    keywords: ["selo", "esg", "ods", "certificação", "certificacao", "relatório", "relatorio", "gri"],
    blocks: [
      { kind: "text", text: "O Selo Empresa Viva é conquistado pela jornada, não comprado. Os dados agregados alimentam relatórios ESG, ODS e GRI com linguagem de 'mudança observada'." },
      { kind: "cta", label: "Quero conhecer o Selo e o relatório ESG", intent: "Quero conhecer o Selo Empresa Viva e o Relatório Global ESG." },
    ],
    next: ["Planos", "4Lentes"],
  },
  {
    tag: "Planos",
    title: "Planos e contratação",
    keywords: ["preço", "preco", "plano", "planos", "valor", "contratar", "custo", "proposta", "orçamento", "orcamento", "demo"],
    blocks: [
      { kind: "text", text: "Cada organização tem um momento diferente. Por isso, montamos a proposta junto com você:" },
      { kind: "table", title: "Níveis de jornada", head: ["Nível", "Para quem", "Inclui"], rows: [
        ["Diagnóstico", "Quem quer começar pela NR-1", "Escuta COPSOQ + relatório agregado"],
        ["Programa", "Quem quer transformar o clima", "Ciclos M.E.T.E. + Academia + Culture Lab"],
        ["Ecossistema", "Grupos e holdings", "Todas as lentes + ESG + Selo"],
      ] },
      { kind: "text", text: "Uma conversa de 20 minutos com um consultor já mostra o melhor ponto de partida." },
      { kind: "cta", label: "Falar com um consultor agora", intent: "Quero receber uma proposta do VitalOS." },
    ],
    next: ["NR1", "METE"],
  },
];

export function findTopic(query: string): Topic | null {
  const q = query.toLowerCase();
  let best: Topic | null = null;
  let score = 0;
  for (const t of TOPICS) {
    const s = t.keywords.reduce((n, k) => n + (q.includes(k) ? k.length : 0), 0) + (q.includes(t.tag.toLowerCase()) ? 10 : 0);
    if (s > score) { score = s; best = t; }
  }
  return best;
}
