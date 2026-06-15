// FIB-T — instrumento e dados de domínio. Estrutura científica: Furtado, C. A.
// (2020), "Escala de Felicidade Interna Bruta do Trabalhador" — 32 itens (0–4),
// 3 Fatores agrupando 9 Domínios FIB. Dados de org são agregados fictícios (n≥5).
// O motor é agnóstico; toda a metodologia vive aqui.

import {
  scoreFibt,
  type FibtInstrumentDef,
  type FibtItemResponse,
} from "@/engine/fibt/fibt-engine";

export const FIBT_INSTRUMENT: FibtInstrumentDef = {
  factors: [
    {
      id: "padrao_de_vida",
      name: "Padrão de Vida",
      domainIds: ["padrao_vida", "educacao", "cultura"],
    },
    {
      id: "bem_estar",
      name: "Bem-Estar",
      domainIds: [
        "bem_estar_emocional",
        "saude",
        "uso_tempo",
        "vitalidade_comunitaria",
        "meio_ambiente",
      ],
    },
    {
      id: "satisfacao_empresa",
      name: "Satisfação com a Empresa",
      domainIds: ["governanca"],
    },
  ],
  domains: [
    { id: "padrao_vida", name: "Padrão de Vida" },
    { id: "educacao", name: "Educação" },
    { id: "cultura", name: "Cultura" },
    { id: "bem_estar_emocional", name: "Bem-Estar Emocional" },
    { id: "saude", name: "Saúde" },
    { id: "uso_tempo", name: "Uso do Tempo" },
    { id: "vitalidade_comunitaria", name: "Vitalidade Comunitária" },
    { id: "meio_ambiente", name: "Meio Ambiente" },
    { id: "governanca", name: "Governança" },
  ],
  items: [
    // ── Fator 1 — Padrão de Vida (Padrão de Vida, Educação, Cultura) ───────────
    {
      id: "q1",
      text: "A casa em que moro é própria.",
      factorId: "padrao_de_vida",
      domainId: "padrao_vida",
    },
    {
      id: "q2",
      text: "Nos últimos 12 meses experimentei realização pessoal.",
      factorId: "padrao_de_vida",
      domainId: "padrao_vida",
    },
    {
      id: "q6",
      text: "Nos últimos 12 meses assisti a filmes e/ou documentários.",
      factorId: "padrao_de_vida",
      domainId: "cultura",
    },
    {
      id: "q8",
      text: "Consigo realizar projetos de longo prazo que envolvem investimento (curso, viagem, bem material).",
      factorId: "padrao_de_vida",
      domainId: "padrao_vida",
    },
    {
      id: "q16",
      text: "Nos últimos 12 meses fiz ao menos uma viagem de lazer.",
      factorId: "padrao_de_vida",
      domainId: "padrao_vida",
    },
    {
      id: "q17",
      text: "Meu rendimento atual me permite viver com dignidade.",
      factorId: "padrao_de_vida",
      domainId: "padrao_vida",
    },
    {
      id: "q18",
      text: "Nos últimos 12 meses realizei atividades voluntárias de cunho social.",
      factorId: "padrao_de_vida",
      domainId: "cultura",
    },
    {
      id: "q21",
      text: "Nos últimos 12 meses adquiri e/ou li livros.",
      factorId: "padrao_de_vida",
      domainId: "cultura",
    },
    {
      id: "q23",
      text: "Nos últimos 12 meses desfrutei de festas populares (Carnaval, São João).",
      factorId: "padrao_de_vida",
      domainId: "cultura",
    },
    {
      id: "q25",
      text: "Nos últimos 12 meses fui a exposições de arte.",
      factorId: "padrao_de_vida",
      domainId: "cultura",
    },
    {
      id: "q27",
      text: "Nos últimos 12 meses participei de treinamento de desenvolvimento pessoal.",
      factorId: "padrao_de_vida",
      domainId: "educacao",
    },
    {
      id: "q32",
      text: "Nos últimos 12 meses estive engajado em treinamento formal (escola, curso, faculdade, idioma).",
      factorId: "padrao_de_vida",
      domainId: "educacao",
    },

    // ── Fator 2 — Bem-Estar (Psicológico, Saúde, Uso do Tempo, Comunitária, Ambiente)
    {
      id: "q5",
      text: "Tenho uma rede de apoio social e afetivo caso enfrente um problema.",
      factorId: "bem_estar",
      domainId: "vitalidade_comunitaria",
    },
    {
      id: "q7",
      text: "Considero-me uma pessoa feliz.",
      factorId: "bem_estar",
      domainId: "bem_estar_emocional",
    },
    {
      id: "q9",
      text: "Em geral, minhas horas de sono são suficientes para meu repouso.",
      factorId: "bem_estar",
      domainId: "saude",
    },
    {
      id: "q10",
      text: "Em minha rotina atual, experimento mais emoções positivas que negativas.",
      factorId: "bem_estar",
      domainId: "bem_estar_emocional",
    },
    {
      id: "q11",
      text: "Sei administrar meu tempo, mantendo uma rotina equilibrada.",
      factorId: "bem_estar",
      domainId: "uso_tempo",
    },
    {
      id: "q14",
      text: "Estou satisfeito com minha saúde emocional.",
      factorId: "bem_estar",
      domainId: "bem_estar_emocional",
    },
    {
      id: "q15",
      text: "Meu peso é considerado saudável.",
      factorId: "bem_estar",
      domainId: "saude",
    },
    {
      id: "q19",
      text: "Minha rotina prevê tempo para estar com os amigos.",
      factorId: "bem_estar",
      domainId: "vitalidade_comunitaria",
    },
    {
      id: "q22",
      text: "Tenho práticas diárias de responsabilidade ambiental (água, energia, coleta seletiva).",
      factorId: "bem_estar",
      domainId: "meio_ambiente",
    },
    {
      id: "q24",
      text: "O estresse não compromete meu bem-estar.",
      factorId: "bem_estar",
      domainId: "bem_estar_emocional",
    },
    {
      id: "q28",
      text: "Realizo exercícios físicos regularmente.",
      factorId: "bem_estar",
      domainId: "saude",
    },
    {
      id: "q30",
      text: "Nos últimos 12 meses estive saudável.",
      factorId: "bem_estar",
      domainId: "saude",
    },
    {
      id: "q31",
      text: "Tenho um propósito maior em minha vida.",
      factorId: "bem_estar",
      domainId: "bem_estar_emocional",
    },

    // ── Fator 3 — Satisfação com a Empresa (Governança) ───────────────────────
    {
      id: "q3",
      text: "A empresa valoriza a conduta ética de seus colaboradores.",
      factorId: "satisfacao_empresa",
      domainId: "governanca",
    },
    {
      id: "q4",
      text: "Confio nos gestores da empresa.",
      factorId: "satisfacao_empresa",
      domainId: "governanca",
    },
    {
      id: "q12",
      text: "Estou satisfeito com as oportunidades de treinamento oferecidas pela empresa.",
      factorId: "satisfacao_empresa",
      domainId: "governanca",
    },
    {
      id: "q13",
      text: "Meu horário de trabalho é flexível caso enfrente situações emergenciais.",
      factorId: "satisfacao_empresa",
      domainId: "governanca",
    },
    {
      id: "q20",
      text: "Considero a comunicação interna da empresa eficaz.",
      factorId: "satisfacao_empresa",
      domainId: "governanca",
    },
    {
      id: "q26",
      text: "Os gestores compartilham estratégias, metas e realizações.",
      factorId: "satisfacao_empresa",
      domainId: "governanca",
    },
    {
      id: "q29",
      text: "Tenho direito de liberdade de expressão e opinião na empresa.",
      factorId: "satisfacao_empresa",
      domainId: "governanca",
    },
  ],
};

// Ponte FIB-T → dimensão ESG (compõe com o /esg). E = ambiental, S = social, G = governança.
export const DOMAIN_TO_ESG: Record<string, "E" | "S" | "G"> = {
  meio_ambiente: "E",
  padrao_vida: "S",
  educacao: "S",
  cultura: "S",
  bem_estar_emocional: "S",
  saude: "S",
  uso_tempo: "S",
  vitalidade_comunitaria: "S",
  governanca: "G",
};

export const ESG_DIM_COPY: Record<string, { label: string; color: string }> = {
  E: { label: "Ambiental", color: "#16A34A" },
  S: { label: "Social", color: "#2563EB" },
  G: { label: "Governança", color: "#CA8A04" },
};

// Agregado organizacional fictício (n=312) — perfil "saudável".
const ORG_AVG: Record<string, number> = {
  q1: 2.6,
  q2: 3.0,
  q6: 3.2,
  q8: 2.4,
  q16: 2.8,
  q17: 2.9,
  q18: 1.8,
  q21: 2.5,
  q23: 2.7,
  q25: 1.6,
  q27: 2.8,
  q32: 2.6,
  q5: 3.1,
  q7: 2.9,
  q9: 2.4,
  q10: 2.7,
  q11: 2.2,
  q14: 2.6,
  q15: 2.5,
  q19: 2.3,
  q22: 2.4,
  q24: 2.1,
  q28: 2.2,
  q30: 2.8,
  q31: 3.2,
  q3: 3.0,
  q4: 2.6,
  q12: 2.3,
  q13: 2.7,
  q20: 2.2,
  q26: 2.4,
  q29: 2.8,
};

const ORG_RESPONSES: FibtItemResponse[] = Object.entries(ORG_AVG).map(([itemId, value]) => ({
  itemId,
  value,
}));

export const FIBT_ORG_N = 312;
export const FIBT_ORG_RESULT = scoreFibt(ORG_RESPONSES, FIBT_INSTRUMENT);

export const FIBT_CLASS_COPY: Record<string, { label: string; color: string; bg: string }> = {
  florescente: {
    label: "Florescente",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  saudavel: {
    label: "Saudável",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  em_desenvolvimento: {
    label: "Em desenvolvimento",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  fragil: {
    label: "Frágil",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
};

export const FACTOR_COLOR: Record<string, string> = {
  padrao_de_vida: "#0EA5E9",
  bem_estar: "#10B981",
  satisfacao_empresa: "#CA8A04",
};

export const FIBT_INTRO = {
  eyebrow: "FIB-T · Lente de Ecossistema · Furtado (2020)",
  title: "A felicidade que o sistema sustenta",
  lead:
    "A Felicidade Interna Bruta do Trabalhador mede o que o IVO e o COPSOQ não alcançam: o " +
    "ecossistema de vida em volta do trabalho — padrão de vida, saúde, tempo, comunidade, " +
    "cultura, ambiente e governança. A saúde da pessoa é inseparável da saúde do sistema.",
  disclaimer:
    "FIB-T (Furtado, 2020) — instrumento anônimo de 32 itens em 3 Fatores e 9 Domínios FIB. " +
    "Lente de ecossistema e bem-comum: não é diagnóstico clínico nem ranking moral de pessoas " +
    "ou organizações. Resultados sempre agregados (n≥5).",
};
