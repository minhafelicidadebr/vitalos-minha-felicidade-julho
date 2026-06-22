// Catálogo das 9 dinâmicas de aprendizagem — vocabulário + pedagogia (mock-first).
//
// Destilado do Work-Wellbeing Playbook 2.0 (Gamified Learning OS), reescrito na voz
// VitalOS e SEM nomes de marca de terceiros. O learning-dynamics engine recebe este
// catálogo como parâmetro e nunca o conhece de antemão (engine ≠ domínio).
//
// Cada dinâmica enriquece uma rota que JÁ existe — compor, não acumular:
//   Educar     → /academia, /trajetoria
//   Transformar→ /plano-acao? (via /prioridades), /experimentos (Culture Lab), /lab
// As citações são da literatura de ciência da aprendizagem; conteúdo de driver e DOIs
// específicos entram pela base do Copiloto (grounding com citações — gate G1).

import type { LearningDynamic } from "@/engine/learning/learning-dynamics";

export const LEARNING_DYNAMICS: LearningDynamic[] = [
  {
    id: "D1",
    kind: "quiz",
    title: "Quiz de Verificação",
    tagline: "Responda para descobrir o que já sabe — e o que falta.",
    axis: "educar",
    pedagogyPt:
      "Testar a recordação (e não apenas reler) consolida a memória de longo prazo: o esforço de buscar a resposta fortalece o traço mnemônico. O feedback imediato corrige equívocos antes que se fixem.",
    citation: "Roediger & Karpicke (2006) — Test-enhanced learning, Psychological Science",
    enrichesRoute: "/academia",
  },
  {
    id: "D2",
    kind: "flashcard",
    title: "Cartões com Repetição Espaçada",
    tagline: "Revise no momento certo de esquecer — nem antes, nem tarde demais.",
    axis: "educar",
    pedagogyPt:
      "Distribuir as revisões ao longo do tempo (em vez de empilhar) combate a curva do esquecimento. O motor SM-2 agenda cada cartão pela autoavaliação de recordação, alongando o intervalo conforme a memória consolida.",
    citation: "Ebbinghaus (1885); Woźniak (1990) — SuperMemo 2; Cepeda et al. (2006)",
    enrichesRoute: "/academia",
  },
  {
    id: "D3",
    kind: "video",
    title: "Videolab Guiado",
    tagline: "Assista a um vídeo curto e curado, depois responda em seguida.",
    axis: "educar",
    pedagogyPt:
      "Vídeo curto e segmentado respeita os limites da carga cognitiva; uma pergunta logo após transforma a recepção passiva em recuperação ativa, aumentando a retenção do que foi assistido.",
    citation: "Mayer (2009) — Cognitive Theory of Multimedia Learning; Sweller (1988)",
    enrichesRoute: "/academia",
  },
  {
    id: "D4",
    kind: "evidence",
    title: "Explorador de Evidências",
    tagline: "Veja a ciência por trás de cada recomendação, com a fonte aberta.",
    axis: "educar",
    pedagogyPt:
      "Expor a evidência citável (estudo, ano, DOI) por trás de cada prática constrói confiança epistêmica e ensina a distinguir o que é validado do que é exploratório. Anti-alucinação por design: sem fonte, sem alegação.",
    citation: "Work-Wellbeing Playbook 2.0 — catálogo de evidências (12 drivers)",
    enrichesRoute: "/academia",
  },
  {
    id: "D6",
    kind: "reflection",
    title: "Pausa Reflexiva",
    tagline: "Um texto curto para conectar a ideia à sua própria experiência.",
    axis: "educar",
    pedagogyPt:
      "A reflexão elaborativa — relacionar um conceito novo à experiência pessoal — aprofunda a codificação e dá sentido afetivo ao conteúdo, sustentando a transferência para a vida real.",
    citation: "Craik & Lockhart (1972) — Levels of processing; Boud et al. (1985)",
    enrichesRoute: "/academia",
  },
  {
    id: "D5",
    kind: "plan",
    title: "Plano de 90 Dias",
    tagline: "Transforme o que aprendeu em um compromisso datado e revisável.",
    axis: "transformar",
    pedagogyPt:
      'Intenções de implementação ("se X, então farei Y") convertem conhecimento em ação. Metas específicas e datadas, ligadas a uma prioridade coletiva, elevam a taxa de execução em relação a boas intenções genéricas.',
    citation: "Gollwitzer (1999) — Implementation intentions; Locke & Latham (2002)",
    enrichesRoute: "/prioridades",
  },
  {
    id: "X1",
    kind: "scenario",
    title: "Simulador de Decisões",
    tagline: "Tome decisões num cenário seguro e veja as consequências.",
    axis: "transformar",
    pedagogyPt:
      "A prática deliberada em cenários realistas, sem risco real, desenvolve julgamento situado. O erro vira aprendizado — nunca exposição de pessoa. Anti-dano: cenários sobre o sistema, não sobre indivíduos identificáveis.",
    citation: "Ericsson (2008) — Deliberate practice; Kolb (1984) — Experiential learning",
    enrichesRoute: "/trajetoria",
  },
  {
    id: "X2",
    kind: "builder",
    title: "Estúdio de Co-design",
    tagline: "Monte uma intervenção a partir de blocos validados.",
    axis: "transformar",
    pedagogyPt:
      "Construir uma intervenção combinando blocos baseados em evidência (aprendizagem construcionista) gera apropriação e ajuste ao contexto, ponte direta para o desenho de experimentos do Culture Lab.",
    citation: "Papert (1980) — Constructionism; Edmondson (1999) — Psychological safety",
    enrichesRoute: "/experimentos",
  },
  {
    id: "X3",
    kind: "debate",
    title: "Arena Socrática",
    tagline: "Argumente os dois lados de um dilema e revise sua posição.",
    axis: "transformar",
    pedagogyPt:
      "Defender posições opostas (argumentação dialógica) reduz vieses de confirmação e aprofunda a compreensão de trade-offs culturais. Foco em ideias e evidências — nunca em julgar pessoas.",
    citation: "Kuhn (1991) — The skills of argument; Nussbaum (2008)",
    enrichesRoute: "/lab",
  },
];

/** Catálogo das dinâmicas de aprendizagem WWP, na ordem narrativa por eixo. */
export function getLearningDynamics(): LearningDynamic[] {
  return LEARNING_DYNAMICS;
}
