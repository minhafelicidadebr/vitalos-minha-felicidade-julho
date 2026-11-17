import type {
  PresentationCard,
  PresentationDeck,
  PresentationSlide,
} from "@/features/presentation/types";

const c = (
  label: string,
  title: string,
  body: string,
  icon: PresentationCard["icon"] = "book",
): PresentationCard => ({ label, title, body, icon });
const playbook = {
  label: "World Wellbeing Movement · Playbook 2.0",
  href: "https://worldwellbeingmovement.org/playbook-2025/",
};
const perma = {
  label: "Butler e Kern · PERMA-Profiler · 2016",
  href: "https://internationaljournalofwellbeing.org/index.php/ijow/article/view/526",
};
const gallup = {
  label: "Gallup · Meta-análise Q12 · 2024",
  href: "https://www.gallup.com/workplace/321725/gallup-meta-analysis-first-generation.aspx",
};
const heineken = {
  label: "Heineken Brasil · Felicidade e positividade",
  href: "https://www.heinekenbrasil.com.br/noticias/felicidade-x-positividade",
};
const brazil = {
  label: "Você RH · Jornada da Felicidade · 30/09/2026",
  href: "https://vocerh.abril.com.br/melhores-empresas/conheca-os-cases-vencedores-de-futuro-do-bem-estar-no-premio-da-voce-rh/",
};

const science: PresentationSlide[] = [
  {
    id: "ciencia",
    chapter: "Ciência que orienta a prática",
    eyebrow: "Ciência da felicidade · curadoria responsável",
    title: "Conhecimento científico ganha valor quando ajuda a decidir o que fazer.",
    summary:
      "Investigar bem-estar é compreender experiências e condições de vida e trabalho. A proposta conecta referências, aprendizagem e práticas revisáveis.",
    kind: "learning",
    note: "Base bibliográfica, conteúdo curado e recuperação por IA são estágios distintos. Não se anuncia ingestão integral ou RAG operacional.",
    cards: [
      c(
        "Referências",
        "Conhecer a origem",
        "Autores, edição, contexto e limites acompanham a leitura.",
        "file",
      ),
      c(
        "Curadoria",
        "Escolher com critério",
        "O estudo precisa fazer sentido para o público e a situação.",
      ),
      c(
        "Aplicação",
        "Aprender e acompanhar",
        "Uma prática precisa de condições, responsáveis e revisão.",
        "compass",
      ),
    ],
    detailCta: "Como a ciência entra na jornada?",
    references: [playbook, perma],
    detail: {
      title: "Da referência à prática, com rastreabilidade",
      introduction:
        "O Playbook orienta a busca bibliográfica. A unidade Q2 0.1.0 é o exemplo educativo aprovado localmente; a expansão da curadoria é uma etapa própria.",
      blocks: [
        c(
          "01 · Fonte",
          "Identificar",
          "Registrar autoria, edição, URL/DOI e direitos aplicáveis.",
          "file",
        ),
        c(
          "02 · Estudo",
          "Interpretar",
          "Conferir população, desenho, comparação, desfecho e limitações.",
          "chart",
        ),
        c(
          "03 · Conteúdo",
          "Preparar",
          "Compatibilizar afirmação permitida, mecanismo, unidade, atividade e revisão.",
        ),
        c(
          "04 · Trabalho",
          "Aplicar e rever",
          "Combinar condições, registrar aplicação e discutir aprendizados. A etapa não comprova eficácia.",
          "compass",
        ),
      ],
      sources: [playbook, perma],
    },
  },
  {
    id: "playbook",
    chapter: "Ciência que orienta a prática",
    eyebrow: "Work Wellbeing Playbook 2.0",
    title: "Bem-estar também se constrói nas condições do trabalho.",
    summary:
      "Uma referência para expandir nossa curadoria: a World Wellbeing Movement reúne literatura sobre intervenções com apoio do Wellbeing Research Centre da Universidade de Oxford e da Indeed.",
    kind: "perspectives",
    note: "Referência bibliográfica externa. Autorização ampliada em tratativa, conforme informado; não se presume permissão já concedida.",
    cards: [
      c(
        "Desenvolvimento",
        "Aprender e ter segurança",
        "Oportunidades de desenvolvimento e estabilidade.",
      ),
      c("Relações", "Pertencer e cooperar", "Conexões de qualidade e apoio no cotidiano.", "users"),
      c(
        "Autonomia",
        "Ter flexibilidade",
        "Possibilidades de decisão e organização do trabalho.",
        "compass",
      ),
      c(
        "Realização",
        "Encontrar variedade e sentido",
        "Experiências e desafios significativos.",
        "spark",
      ),
      c(
        "Recursos",
        "Remuneração e benefícios",
        "Condições materiais fazem parte da conversa.",
        "building",
      ),
      c(
        "Proteção",
        "Saúde e segurança",
        "Riscos e condições seguras exigem resposta organizacional.",
        "shield",
      ),
    ],
    references: [playbook],
    detailCta: "Conhecer a referência e seus limites",
    detail: {
      title: "Pesquisa como ponto de partida para a gestão",
      introduction:
        "Síntese conceitual autoral dos temas da página pública do Playbook. A apresentação não reproduz seus slides, tabelas ou recomendações de intervenção.",
      blocks: [
        c(
          "Autoria da referência",
          "World Wellbeing Movement",
          "A colaboração acadêmica pertence ao Playbook; não representa parceria ou chancela da VitalOS.",
          "file",
        ),
        c(
          "Uso na plataforma",
          "Expansão da curadoria",
          "Cada artigo, prática e uso exige análise própria. A referência não aprova equivalências com dimensões IVO.",
        ),
        c(
          "Aplicação responsável",
          "Condições para agir",
          "A atuação pode envolver equipe, liderança, políticas, recursos e organização do trabalho.",
          "building",
        ),
      ],
      sources: [playbook],
    },
  },
  {
    id: "caso-brasil",
    chapter: "Ciência que orienta a prática",
    eyebrow: "Um exemplo brasileiro · referência externa",
    title: "Heineken: bem-estar como uma agenda de gestão no Brasil.",
    summary:
      "A Jornada da Felicidade ilustra a combinação de escuta recorrente, participação e atuação sobre o trabalho. A companhia descreve PERMA-V como referência de sua abordagem.",
    kind: "context",
    note: "Caso externo, sem vínculo com a VitalOS. Q3 PERMA+V permanece em evolução prevista; a operação local demonstrada é Q2.",
    cards: [
      c(
        "Escuta",
        "Acompanhar a experiência",
        "Pesquisas recorrentes sustentam uma conversa sobre o trabalho.",
        "chart",
      ),
      c(
        "Modelo",
        "PERMA-V na abordagem",
        "Bem-estar, relações, significado e vitalidade na agenda empresarial.",
        "heart",
      ),
      c(
        "Reconhecimento",
        "Caso premiado",
        "A Jornada da Felicidade foi reconhecida no prêmio da Você RH em 2026.",
        "spark",
      ),
    ],
    references: [heineken, brazil],
    detailCta: "Entender o caso e o que podemos aprender",
    detail: {
      title: "Práticas e aprendizados de um caso brasileiro",
      introduction:
        "Relato empresarial publicado pela organizadora do prêmio, complementado pelo texto institucional da Heineken. Não é experimento da VitalOS.",
      blocks: [
        c(
          "Prática",
          "Escuta com continuidade",
          "O caso relata pesquisas quinzenais e acompanhamento da participação. Adesão à pesquisa não é percentual de pessoas felizes.",
          "users",
        ),
        c(
          "Modelo",
          "PERMA e PERMA-V",
          "PERMA aborda emoções positivas, engajamento, relações, significado e realização; a abordagem ampliada inclui vitalidade.",
          "heart",
        ),
        c(
          "Instrumento",
          "Versões distintas",
          "PERMA-Profiler é um instrumento específico. Sua publicação não valida automaticamente adaptações ou o Q3 planejado na VitalOS.",
          "file",
        ),
        c(
          "Limite",
          "Inspiração com contexto",
          "Heineken não é cliente ou parceira apresentada da VitalOS. O caso não prova causalidade nem garante repetição dos resultados.",
          "shield",
        ),
      ],
      sources: [heineken, brazil, perma],
    },
  },
];

/** Editorial assembly on the server. No statistical claim approval is granted here. */
export function applyNarrativeV2(deck: PresentationDeck): PresentationDeck {
  return {
    ...deck,
    edition: "Apresentação empresarial V2 · novembro 2026",
    slides: deck.slides.flatMap((slide): PresentationSlide[] => {
      if (slide.id === "desafios")
        return [
          {
            ...slide,
            eyebrow: "O valor para sua empresa",
            title:
              "Transformar informação dispersa em uma jornada que a gestão consegue acompanhar.",
            summary:
              "A VitalOS ajuda a conectar escuta, aprendizagem e ações acompanhadas — com método, responsabilidades e evidências para orientar decisões.",
            cards: [
              c(
                "Clareza",
                "Priorizar com contexto",
                "Uma leitura publicada ajuda a formular uma pergunta de gestão.",
                "chart",
              ),
              c(
                "Capacidade",
                "Aprender para aplicar",
                "Uma prática contextualizada prepara o próximo acordo de trabalho.",
              ),
              c(
                "Continuidade",
                "Acompanhar e prestar contas",
                "Responsável, condições, prazo e revisão tornam o combinado visível.",
                "compass",
              ),
            ],
            note: "Benefícios esperados pelo desenho do serviço; ainda não são resultados medidos em clientes da VitalOS.",
            detailCta: "Explorar os ganhos e sua evidência",
            references: [gallup],
            detail: {
              title: "O que receber, por que importa e como acompanhar",
              introduction:
                "A literatura ajuda a justificar a agenda. O serviço precisa combinar entregas e critérios próprios.",
              blocks: [
                c(
                  "Entrega",
                  "Leitura → prioridade",
                  "RH e direção podem discutir uma prioridade explicável, com origem e limites.",
                  "chart",
                ),
                c(
                  "Entrega",
                  "Aprendizagem → aplicação",
                  "A equipe amplia repertório e combina uma prática. Compreensão e execução são verificadas separadamente.",
                ),
                c(
                  "Entrega",
                  "Registro → revisão",
                  "A gestão identifica aplicação, barreiras e decisões para o próximo ciclo.",
                  "compass",
                ),
                c(
                  "Referência externa",
                  "Engajamento e desempenho",
                  "A meta-análise Q12 compara unidades com níveis distintos de engajamento. Associação não estima o retorno de contratar a VitalOS.",
                  "file",
                ),
              ],
              sources: [gallup],
            },
          },
        ];
      if (slide.id === "papeis") return [...science, slide];
      if (slide.id === "contexto") return [{ ...slide, references: slide.detail.sources }];
      if (slide.id === "lentes")
        return [
          {
            ...slide,
            detail: {
              ...slide.detail,
              blocks: [
                ...slide.detail.blocks,
                c(
                  "PERMA",
                  "Modelo, instrumento e aplicação",
                  "PERMA tem cinco pilares. PERMA-Profiler e adaptações com vitalidade são distintos. O caso Heineken não valida o adaptador Q3.",
                  "heart",
                ),
              ],
              sources: [perma],
            },
          },
        ];
      if (slide.id === "relatorio")
        return [
          {
            ...slide,
            references: [
              { label: "ONU · ODS 3 e meta 3.4", href: "https://sdgs.un.org/goals/goal3" },
              { label: "ONU · ODS 8 e meta 8.8", href: "https://sdgs.un.org/goals/goal8" },
            ],
            detail: {
              ...slide.detail,
              blocks: [
                ...slide.detail.blocks,
                c(
                  "ODS 3.4 / 8.8",
                  "Referências temáticas",
                  "Saúde mental e condições seguras de trabalho podem orientar a conversa. Não são equivalência com indicadores oficiais, certificação ou impacto atribuível.",
                  "file",
                ),
              ],
            },
          },
        ];
      return [slide];
    }),
  };
}
