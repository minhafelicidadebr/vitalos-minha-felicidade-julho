// This module is delivered only by the authenticated API, never a static client import.
import {
  CommercialClaimResolutionError,
  resolveCommercialClaim,
} from "@/domain/commercial-claims/commercial-claims-resolver";
import type {
  PresentationCard,
  PresentationDeck,
  PresentationSlide,
} from "@/features/presentation/types";

export const PRESENTATION_CONTEXT_SURFACE = "marketing.presentation.enterprises.context";
export function resolvePresentationContext(): string | null {
  try {
    return resolveCommercialClaim({
      claimId: "CLAIM-COM-ECONOMIC-BASELINE-001",
      variant: "default",
      surfaceId: PRESENTATION_CONTEXT_SURFACE,
    }).text;
  } catch (error) {
    if (error instanceof CommercialClaimResolutionError) return null;
    throw error;
  }
}
const card = (
  label: string,
  title: string,
  body: string,
  icon: PresentationCard["icon"],
  status?: string,
): PresentationCard => ({ label, title, body, icon, ...(status ? { status } : {}) });
const who = {
  label: "OMS · Saúde mental no trabalho · referência global",
  href: "https://www.who.int/news-room/fact-sheets/detail/mental-health-at-work",
};
const institute = {
  label: "Instituto Felicidade para Todos",
  href: "https://www.felicidadeparatodos.com.br/#contato",
};
const slide = (value: PresentationSlide): PresentationSlide => value;

export function getPresentationDeck(): PresentationDeck {
  const context = resolvePresentationContext();
  return {
    edition: "Apresentação empresarial · novembro 2026",
    contact: { label: "Conversar com o Instituto", href: institute.href },
    slides: [
      slide({
        id: "vitalidade",
        chapter: "A oportunidade",
        eyebrow: "Pessoas que florescem. Organizações que aprendem.",
        title: "O próximo passo do bem-estar é fazer parte do trabalho.",
        summary:
          "Da escuta à aprendizagem. Da intenção à prática. A VitalOS conecta uma jornada de desenvolvimento organizacional com evidências para decidir melhor.",
        kind: "hero",
        note: "Apresentação da proposta e de demonstrações locais. A oferta é delimitada com cada organização.",
        cards: [
          card("01", "Enxergar", "Dar sentido aos sinais coletivos.", "chart"),
          card("02", "Desenvolver", "Aprender e experimentar no cotidiano.", "book"),
          card("03", "Acompanhar", "Revisar ações com origem e contexto.", "compass"),
        ],
        detailCta: "Conhecer a proposta",
        detail: {
          title: "Um ecossistema para dar continuidade ao cuidado",
          introduction:
            "A plataforma organiza o ciclo; as pessoas e a gestão constroem as condições para colocá-lo em prática.",
          blocks: [
            card(
              "O desafio",
              "Continuidade",
              "Conectar escuta, repertório, responsáveis e revisão numa mesma jornada.",
              "arrow",
            ),
            card(
              "O papel da tecnologia",
              "Apoiar decisões",
              "Apresentar informação, orientar a aplicação e organizar registros, preservando os limites de cada evidência.",
              "compass",
            ),
            card(
              "O papel da organização",
              "Criar condições",
              "Definir tempo, recursos, participação e responsabilidades. O software não substitui essas decisões.",
              "building",
            ),
          ],
        },
      }),
      slide({
        id: "contexto",
        chapter: "A oportunidade",
        eyebrow: "O contexto importa",
        title: "A saúde mental também é uma questão de como o trabalho acontece.",
        summary:
          "Carga, autonomia, relações e condições de trabalho merecem atenção da gestão. Uma resposta consistente combina prevenção, participação e acompanhamento.",
        kind: "context",
        note: "Referência externa global; não representa prevalência ou perdas de sua empresa, nem resultados da VitalOS.",
        cards: [
          card(
            "Pessoas",
            "Trabalho e saúde",
            "A agenda começa nas condições em que as pessoas trabalham.",
            "heart",
          ),
          card(
            "Gestão",
            "Condições e recursos",
            "A atuação também precisa alcançar organização do trabalho e práticas de gestão.",
            "building",
          ),
          card(
            "Decisão",
            "Contexto antes da promessa",
            context ?? "Consulte as estimativas globais e seus períodos na fonte original da OMS.",
            "chart",
          ),
        ],
        detailCta: "Consultar a base do contexto",
        detail: {
          title: "Escala global não é diagnóstico da empresa",
          introduction:
            "A OMS reúne estimativas e orientações sobre saúde mental no trabalho. Seu uso exige preservar população, período, unidade e limites.",
          blocks: [
            card(
              "Fonte",
              "OMS",
              "Referência consultada em novembro de 2026. Os números completos estão na publicação original.",
              "file",
            ),
            card(
              "Interpretação",
              "Sem extrapolação",
              "Estimativas globais não calculam perdas, retorno ou benefício individual de uma organização.",
              "chart",
            ),
            card(
              "Aplicação",
              "Perguntas locais",
              "Compreender o contexto da empresa e suas condições antecede qualquer plano de serviço.",
              "target",
            ),
          ],
          sources: [who],
        },
      }),
      slide({
        id: "desafios",
        chapter: "A oportunidade",
        eyebrow: "Reconheça o cenário",
        title: "Entre ouvir e agir, a continuidade costuma se perder.",
        summary:
          "Resultados precisam encontrar perguntas úteis, pessoas responsáveis e espaço real para aprender. Que ligação faz mais falta na sua organização?",
        kind: "gaps",
        note: "Situações ilustrativas para conversa; não há coleta de informações pessoais nesta apresentação.",
        cards: [
          card(
            "Sinal disperso",
            "O que priorizar?",
            "Pesquisas e iniciativas podem existir sem uma leitura comum.",
            "chart",
          ),
          card(
            "Ação isolada",
            "Quem dá continuidade?",
            "Uma campanha não define, sozinha, responsável, recurso e revisão.",
            "users",
          ),
          card(
            "Registro incompleto",
            "O que aprendemos?",
            "Contar atividades não explica como a prática foi aplicada.",
            "file",
          ),
        ],
        detailCta: "Levar três perguntas à conversa",
        detail: {
          title: "Onde começar a conversa",
          introduction:
            "Use estas perguntas em reunião. Não inclua nomes, relatos de saúde ou respostas individuais.",
          blocks: [
            card(
              "Prioridade",
              "Que decisão precisa de apoio?",
              "Escolha uma necessidade de gestão reconhecível, sem presumir sua causa.",
              "target",
            ),
            card(
              "Condições",
              "Que recursos já existem?",
              "Tempo, autonomia e responsáveis tornam uma aplicação possível.",
              "clock",
            ),
            card(
              "Revisão",
              "Que evidência seria útil?",
              "Defina o que observar e quando discutir o próximo passo.",
              "compass",
            ),
          ],
        },
      }),
      slide({
        id: "ciclo",
        chapter: "O framework",
        eyebrow: "Mensurar → Educar → Transformar → Evoluir",
        title: "Um ciclo. Quatro movimentos que se conectam.",
        summary:
          "A proposta une a leitura do contexto ao desenvolvimento de repertório, à aplicação no trabalho e à revisão dos registros.",
        kind: "cycle",
        note: "O ciclo é a arquitetura do serviço; a disponibilidade de cada módulo precisa ser conferida no escopo.",
        cards: [
          card(
            "01 · Mensurar",
            "Ler o contexto",
            "Resultado e limites para formular uma prioridade.",
            "chart",
          ),
          card(
            "02 · Educar",
            "Ampliar repertório",
            "Compreensão, recuperação e prática contextualizada.",
            "book",
          ),
          card(
            "03 · Transformar",
            "Aplicar no trabalho",
            "Acordo com responsável, condições e acompanhamento.",
            "spark",
          ),
          card(
            "04 · Evoluir",
            "Revisar e decidir",
            "Registros, barreiras e aprendizados orientam o próximo ciclo.",
            "compass",
          ),
        ],
        detailCta: "Explorar as quatro etapas",
        detail: {
          title: "Da pergunta ao próximo passo",
          introduction:
            "Cada movimento produz um tipo de registro. Nenhum substitui a avaliação dos demais.",
          blocks: [
            card(
              "Mensurar",
              "O que a leitura permite dizer?",
              "Preservar instrumento, recorte, origem e proteção; ausência não vira zero.",
              "chart",
            ),
            card(
              "Educar",
              "O que precisamos compreender?",
              "Usar repertório e verificar interpretação antes da aplicação.",
              "book",
            ),
            card(
              "Transformar",
              "O que foi combinado e executado?",
              "Registrar aplicação coletiva confirmada, sem transportar respostas privadas.",
              "spark",
            ),
            card(
              "Evoluir",
              "O que rever agora?",
              "Distinguir execução, aprendizagem relatada e resultados ainda não avaliados.",
              "compass",
            ),
          ],
        },
      }),
      slide({
        id: "perspectivas",
        chapter: "O framework",
        eyebrow: "O IVO organiza o olhar",
        title: "A experiência é individual. As condições também são coletivas.",
        summary:
          "EU, NÓS, LIDERANÇA e ORGANIZAÇÃO ajudam a conversar sobre o trabalho em níveis complementares, sem reduzir tudo a uma nota.",
        kind: "perspectives",
        note: "Perspectivas conceituais. Mapeamentos entre lentes, dimensões e um índice composto continuam pendentes.",
        cards: [
          card(
            "EU",
            "A experiência da pessoa",
            "Recursos, sentido e possibilidades de participação.",
            "heart",
          ),
          card(
            "NÓS",
            "A vida em equipe",
            "Cooperação, relações e condições para aprender juntos.",
            "users",
          ),
          card(
            "LIDERANÇA",
            "A prática da gestão",
            "Clareza, escuta, decisões e organização da carga.",
            "compass",
          ),
          card(
            "ORGANIZAÇÃO",
            "O sistema de trabalho",
            "Políticas, recursos e responsabilidade institucional.",
            "building",
          ),
        ],
        detailCta: "Ver situações do trabalho",
        detail: {
          title: "Quatro perguntas sobre a mesma situação",
          introduction:
            "Exemplo conceitual: uma equipe quer melhorar suas condições para pedir ajuda.",
          blocks: [
            card(
              "EU",
              "Posso participar sem me expor?",
              "A pessoa pode passar a vez e preservar relatos privados.",
              "heart",
            ),
            card(
              "NÓS",
              "Como conversamos sobre dificuldades?",
              "O grupo pode combinar uma forma de solicitar apoio.",
              "users",
            ),
            card(
              "LIDERANÇA",
              "Existe tempo e apoio?",
              "A gestão pode revisar carga e remover barreiras.",
              "compass",
            ),
            card(
              "ORGANIZAÇÃO",
              "O acordo tem condições de durar?",
              "Políticas e recursos precisam sustentar a prática.",
              "building",
            ),
          ],
        },
      }),
      slide({
        id: "lentes",
        chapter: "O framework",
        eyebrow: "Quatro lentes. Leituras distintas.",
        title: "Uma arquitetura anual, com métodos e estágios próprios.",
        summary:
          "Cada lente ilumina uma parte do contexto. Elas não são escalas equivalentes nem autorizam, por si, uma pontuação global do IVO.",
        kind: "lenses",
        note: "Matriz conceitual de organização; as células não representam relações metodológicas aprovadas.",
        cards: [
          card(
            "Q1",
            "COPSOQ",
            "Correspondência exata da fonte brasileira com a implementação ainda pendente.",
            "shield",
            "Preparação metodológica",
          ),
          card(
            "Q2",
            "FIB-T",
            "Leitura nativa e jornada educativa administrativa exercitadas localmente.",
            "chart",
            "Demonstração local",
          ),
          card(
            "Q3",
            "PERMA+V",
            "Integra a arquitetura de evolução. Disponibilidade específica a validar.",
            "heart",
            "Evolução prevista",
          ),
          card(
            "Q4",
            "VIA-T",
            "Integra a arquitetura de evolução, com limites próprios de uso.",
            "spark",
            "Evolução prevista",
          ),
        ],
        detailCta: "Entender métodos e disponibilidade",
        detail: {
          title: "Disponibilidade não é igual entre as lentes",
          introduction:
            "A demonstração Q2 pode avançar independentemente da correspondência documental específica de Q1.",
          blocks: [
            card(
              "Q1",
              "Fonte e implementação",
              "A confirmação informada de uso foi preservada; vincular itens, escalas e regras à fonte exata continua necessário.",
              "file",
            ),
            card(
              "Q2",
              "Leitura nativa",
              "Fatores de 0 a 4 e bruto de 0 a 12 não se convertem aqui em índice composto ou diagnóstico clínico.",
              "chart",
            ),
            card(
              "Q3 / Q4",
              "Arquitetura de evolução",
              "Não se apresenta o mesmo grau de operação ou validação de Q2 para as demais jornadas.",
              "compass",
            ),
          ],
        },
      }),
      slide({
        id: "papeis",
        chapter: "A jornada empresarial",
        eyebrow: "Participação com responsabilidade",
        title: "Papéis claros fazem a jornada acontecer.",
        summary:
          "Quem administra a plataforma, quem coordena a empresa e quem participa têm responsabilidades diferentes. Público do serviço e permissão de acesso são coisas distintas.",
        kind: "roles",
        note: "RH_ADMIN é o perfil educativo demonstrado nesta fatia. Não se promete dashboard equivalente para cada persona.",
        cards: [
          card(
            "Plataforma",
            "Habilitar com legitimidade",
            "Convite inicial e módulos da empresa, sob autoridade própria.",
            "lock",
            "Prova local",
          ),
          card(
            "RH_ADMIN",
            "Coordenar a jornada",
            "Consultar leitura publicada, prática educativa e plano de ações autorizados.",
            "compass",
            "Prova local",
          ),
          card(
            "RH · SST · Direção",
            "Definir prioridades",
            "Públicos do serviço e da conversa de escopo; interfaces específicas a confirmar.",
            "building",
            "Escopo a combinar",
          ),
          card(
            "Equipes e lideranças",
            "Construir a aplicação",
            "Participar dos acordos e criar condições para a prática.",
            "users",
            "Participação proposta",
          ),
        ],
        detailCta: "Explorar responsabilidades e acessos",
        detail: {
          title: "Um papel no serviço não cria permissão no sistema",
          introduction:
            "A jornada empresarial depende de acordos entre pessoas, além dos controles do software.",
          blocks: [
            card(
              "Autoridade",
              "Plataforma ≠ empresa",
              "A autoridade de plataforma não é concedida por um perfil administrativo da empresa.",
              "lock",
            ),
            card(
              "Coordenação",
              "Ambiente da empresa",
              "O administrador acessa o vínculo autorizado e os módulos habilitados para a organização.",
              "building",
            ),
            card(
              "Participação",
              "Escopo claro",
              "Quem vê, participa e acompanha precisa ser definido antes de uma operação real.",
              "users",
            ),
          ],
        },
      }),
      slide({
        id: "leitura",
        chapter: "A jornada empresarial",
        eyebrow: "Mensurar · exemplo sintético Q2",
        title: "Uma leitura útil abre uma pergunta de trabalho.",
        summary:
          "No ensaio Alfa, a leitura publicada é o ponto de partida para discutir uma prioridade coletiva. O resultado não identifica quem respondeu e não determina uma causa.",
        kind: "reading",
        note: "Alfa/Beta são empresas fictícias. Esta prévia não consulta banco nem representa resultado de cliente.",
        cards: [
          card(
            "Origem",
            "Leitura publicada",
            "Instrumento, setor e momento acompanham o resultado autorizado.",
            "file",
          ),
          card(
            "Interpretação",
            "Prioridade coletiva",
            "Escolher um tema para conversar, sem atribuir a dificuldade a uma pessoa.",
            "target",
          ),
          card(
            "Proteção",
            "Recorte protegido",
            "Quando a leitura não está disponível, não a substituir por uma nota zero.",
            "shield",
          ),
        ],
        detailCta: "Entender o caminho da leitura",
        detail: {
          title: "O que se preserva antes de agir",
          introduction:
            "O exemplo explica o fluxo. Não acrescenta resultados numéricos fictícios nem uma classificação de risco.",
          blocks: [
            card(
              "Fonte",
              "Resultado elegível",
              "A leitura depende de publicação e dos controles do recorte, não apenas da quantidade de respostas.",
              "file",
            ),
            card(
              "Pergunta",
              "Qual condição podemos discutir?",
              "A ligação com a prática é editorial; ela não demonstra causalidade.",
              "target",
            ),
            card(
              "Destino",
              "Plano existente",
              "A origem publicada acompanha a aplicação sem duplicar a organização ou o plano.",
              "arrow",
            ),
          ],
        },
      }),
      slide({
        id: "aprendizagem",
        chapter: "A jornada empresarial",
        eyebrow: "Educar · unidade e atividade 0.1.0",
        title: "Aprender para aplicar. Recuperar antes de receber o feedback.",
        summary:
          "A primeira unidade Q2 trabalha a interpretação de uma leitura coletiva e as condições para uma conversa de equipe sobre pedir ajuda.",
        kind: "learning",
        note: "Síntese da unidade aprovada para ensaio local. Não é a atividade completa nem amplia sua liberação para clientes.",
        cards: [
          card(
            "Compreender",
            "Leitura e limites",
            "Reconhecer o que um resultado coletivo permite concluir.",
            "book",
          ),
          card(
            "Recuperar",
            "Tentar antes de consultar",
            "Recordar proteção, interpretação e limite da evidência.",
            "compass",
          ),
          card(
            "Aplicar",
            "Um acordo viável",
            "Combinar uma prática com tempo, proteção e possibilidade de passar a vez.",
            "users",
          ),
        ],
        detailCta: "Conhecer o desenho da atividade",
        detail: {
          title: "Repertório que encontra uma situação real de trabalho",
          introduction:
            "A versão 0.1.0 tem revisão editorial registrada para o contexto local. Esta apresentação mostra uma síntese do desenho.",
          blocks: [
            card(
              "01",
              "Interpretar",
              "Escolher um tema coletivo sem identificar respondentes ou concluir causa pela média.",
              "chart",
            ),
            card(
              "02",
              "Proteger",
              "Combinar condições de participação; interromper diante de risco de exposição ou retaliação.",
              "shield",
            ),
            card(
              "03",
              "Transferir com cuidado",
              "Compartilhar apenas o acordo coletivo confirmado. Respostas pedagógicas privadas não são enviadas ao plano.",
              "arrow",
            ),
            card(
              "04",
              "Revisar",
              "Participação, acerto e ação concluída não comprovam domínio, eficácia ou impacto ESG.",
              "compass",
            ),
          ],
        },
      }),
      slide({
        id: "aplicacao",
        chapter: "A jornada empresarial",
        eyebrow: "Transformar · exemplo sintético",
        title: "Um acordo sai da conversa e ganha acompanhamento.",
        summary:
          "Definir uma aplicação pequena, uma função responsável e condições de execução permite acompanhar o que aconteceu — inclusive barreiras e interrupções.",
        kind: "action",
        note: "Timeline ilustrativa. A apresentação não cria nem altera ações nas empresas fictícias.",
        cards: [
          card(
            "Combinar",
            "Uma condição de trabalho",
            "Escolher um ajuste viável para facilitar o pedido de ajuda.",
            "target",
          ),
          card(
            "Preparar",
            "Responsável e recursos",
            "Combinar tempo, apoio e momento da revisão.",
            "clock",
          ),
          card(
            "Executar",
            "Registrar o que ocorreu",
            "Acompanhar a ação e suas barreiras sem relatos pessoais.",
            "check",
          ),
          card(
            "Revisar",
            "Aprendizagem separada",
            "Retomar o acordo e distinguir observação de hipótese.",
            "compass",
          ),
        ],
        detailCta: "Ver os registros de acompanhamento",
        detail: {
          title: "Execução e aprendizagem têm registros distintos",
          introduction:
            "Ações podem estar planejadas, em execução, concluídas, em vigilância ou interrompidas, conforme o fluxo existente.",
          blocks: [
            card(
              "Execução",
              "O que foi feito?",
              "Descrever a ocorrência da aplicação e as condições encontradas.",
              "check",
            ),
            card(
              "Aprendizagem",
              "O que a revisão revelou?",
              "Registrar o aprendizado compartilhável, preservando a experiência privada.",
              "book",
            ),
            card(
              "Eficácia",
              "O que ainda exige avaliação?",
              "Concluir uma ação não demonstra melhora do indicador ou impacto causado pela intervenção.",
              "chart",
            ),
          ],
        },
      }),
      slide({
        id: "evolucao",
        chapter: "Evidências e confiança",
        eyebrow: "Evoluir · revisar para decidir",
        title: "A evidência mais útil é a que esclarece a próxima decisão.",
        summary:
          "Acompanhar execução e aprendizagem ajuda a revisar a prática. Avaliar mudança e eficácia pede um desenho próprio, com contexto e limites.",
        kind: "evidence",
        note: "Critérios de eficácia e inferências causais não são aprovados por esta demonstração.",
        cards: [
          card("Registro", "Aconteceu?", "Ação e execução documentadas.", "check"),
          card(
            "Aprendizagem",
            "O que compreendemos?",
            "Revisão e aplicação relatadas, com limites.",
            "book",
          ),
          card(
            "Avaliação",
            "O que mudou e por quê?",
            "Pergunta que exige método e acompanhamento específicos.",
            "chart",
            "Avaliação própria",
          ),
        ],
        detailCta: "O que podemos concluir?",
        detail: {
          title: "Quatro níveis de afirmação",
          introduction: "A narrativa deve acompanhar a força da evidência disponível.",
          blocks: [
            card(
              "Observação",
              "Registro descritivo",
              "Há um registro de que uma prática ocorreu, no contexto indicado.",
              "file",
            ),
            card(
              "Relato",
              "Experiência informada",
              "Uma aprendizagem relatada não é medida independente de transferência.",
              "book",
            ),
            card(
              "Associação",
              "Relação observada",
              "Duas medidas podem variar juntas sem que uma tenha causado a outra.",
              "chart",
            ),
            card(
              "Causalidade",
              "Exigência adicional",
              "Atribuir efeitos exige desenho, comparação e análise apropriados.",
              "shield",
            ),
          ],
        },
      }),
      slide({
        id: "relatorio",
        chapter: "Evidências e confiança",
        eyebrow: "Prestação de contas · prévia demonstrativa",
        title: "Uma narrativa institucional que mostra origem, aplicação e limites.",
        summary:
          "O relatório global organiza o ciclo para apoiar uma conversa de governança: o que foi lido, desenvolvido, aplicado e revisado.",
        kind: "report",
        note: "Prévia editorial sintética. Não é relatório de impacto ESG auditado nem certificação.",
        cards: [
          card("Mensurar", "Fonte e contexto", "Leitura, período e recortes autorizados.", "chart"),
          card(
            "Educar",
            "Repertório e aplicação",
            "Conteúdo, prática e seus limites de uso.",
            "book",
          ),
          card(
            "Transformar",
            "Ações e execução",
            "Acordos, responsáveis e registros descritivos.",
            "spark",
          ),
          card(
            "Evoluir",
            "Revisão e próximos passos",
            "Aprendizagens, ausências e avaliação pendente.",
            "compass",
          ),
        ],
        detailCta: "Explorar a lógica do relatório",
        detail: {
          title: "ESG requer vínculos e evidências específicos",
          introduction:
            "Uma boa apresentação não transforma um registro operacional em impacto comprovado.",
          blocks: [
            card(
              "Social",
              "Relação a examinar",
              "Ações sobre condições de trabalho podem ser discutidas por seu tema, sem atribuir impacto causal.",
              "users",
            ),
            card(
              "Governança",
              "Processo a evidenciar",
              "Decisões e responsabilidades só sustentam uma alegação quando o processo é demonstrado.",
              "building",
            ),
            card(
              "Ambiental",
              "Sem atalho temático",
              "Uma atividade de bem-estar não recebe automaticamente relação ambiental.",
              "shield",
            ),
            card(
              "Ausência",
              "Sem evidência ≠ zero",
              "Proteção, pendência e dado ausente precisam continuar visíveis no documento.",
              "file",
            ),
          ],
        },
      }),
      slide({
        id: "confianca",
        chapter: "Evidências e confiança",
        eyebrow: "Pessoas antes da exposição",
        title: "Confiança se constrói nas escolhas de acesso e uso.",
        summary:
          "Isolamento entre empresas, recortes autorizados e separação entre respostas privadas e registros compartilhados fazem parte da jornada local demonstrada.",
        kind: "trust",
        note: "O escopo comprovado é local. Políticas de operação e tratamento de dados precisam ser definidas antes de uso real.",
        cards: [
          card(
            "Empresa",
            "Vínculo correto",
            "Acesso institucional depende da identidade e organização autorizadas.",
            "building",
          ),
          card(
            "Leitura",
            "Proteção do recorte",
            "Resultados protegidos não são substituídos por dados individuais.",
            "shield",
          ),
          card(
            "Aprendizagem",
            "Compartilhar por escolha",
            "Somente a aplicação coletiva confirmada segue para o plano.",
            "lock",
          ),
        ],
        detailCta: "Entender as proteções e seus limites",
        detail: {
          title: "Controle técnico e responsabilidade operacional",
          introduction:
            "Nenhum controle isolado permite prometer proteção absoluta ou conformidade jurídica automática.",
          blocks: [
            card(
              "Acesso",
              "Permissão verificada",
              "A autoridade da plataforma e o vínculo administrativo da empresa são distintos.",
              "lock",
            ),
            card(
              "Dados",
              "Finalidade e minimização",
              "Definir quais registros são necessários, quem acessa e como serão mantidos.",
              "file",
            ),
            card(
              "Operação",
              "Acordos necessários",
              "Retenção, descarte, suporte e resposta a incidentes precisam de responsáveis e decisões próprias.",
              "compass",
            ),
          ],
        },
      }),
      slide({
        id: "inicio",
        chapter: "O próximo passo",
        eyebrow: "Começar com clareza",
        title: "A melhor entrada é uma jornada com escopo combinado.",
        summary:
          "Primeiro compreender a necessidade. Depois delimitar papéis, recursos, dados e critérios de revisão. A implantação e a operação dependem desse acordo.",
        kind: "onboarding",
        note: "Percurso proposto, sujeito a definição. Nenhum prazo, preço ou piloto real está autorizado por esta apresentação.",
        cards: [
          card("01", "Alinhar", "Necessidade, finalidade e pessoas responsáveis.", "target"),
          card("02", "Preparar", "Ambiente, acessos, dados e suporte.", "shield"),
          card("03", "Percorrer", "Jornada delimitada com acompanhamento.", "users"),
          card("04", "Revisar", "Decidir continuar, corrigir ou interromper.", "compass"),
        ],
        detailCta: "O que combinar na primeira conversa?",
        detail: {
          title: "Uma conversa para avaliar a aderência",
          introduction:
            "A equipe pode discutir a proposta sem fornecer dados individuais de empregados.",
          blocks: [
            card(
              "Contexto",
              "Qual problema de gestão?",
              "Finalidade e condições para uma primeira jornada.",
              "target",
            ),
            card(
              "Pessoas",
              "Quem coordena e participa?",
              "Responsáveis, recursos e forma de acompanhamento.",
              "users",
            ),
            card(
              "Proteção",
              "Quais limites e critérios?",
              "Dados, participação, suporte e decisões de revisão.",
              "shield",
            ),
          ],
        },
      }),
      slide({
        id: "conversa",
        chapter: "O próximo passo",
        eyebrow: "VitalOS™ · Instituto Felicidade para Todos",
        title: "Qual é o próximo passo de vitalidade para sua organização?",
        summary:
          "Vamos conversar sobre como conectar escuta, aprendizagem e ação no seu contexto — com clareza sobre o que será entregue e acompanhado.",
        kind: "closing",
        note: "O contato abre o canal institucional. Nenhum dado ou mensagem é enviado automaticamente.",
        cards: [
          card("Compreender", "Seu contexto", "Prioridades e condições de trabalho.", "heart"),
          card("Desenhar", "Uma jornada viável", "Papéis, recursos e limites acordados.", "users"),
          card(
            "Acompanhar",
            "Decisões com evidência",
            "Registros e revisão ao longo da aplicação.",
            "compass",
          ),
        ],
        detailCta: "Conhecer o Instituto",
        detail: {
          title: "Instituto Felicidade para Todos",
          introduction:
            "Organização idealizadora, conforme informação institucional fornecida. Missão: ativar e animar ecossistemas sustentáveis de felicidade humana, socioambiental e organizacional.",
          blocks: [
            card(
              "Propósito",
              "Desenvolvimento humano",
              "Conectar bem-estar, aprendizagem e transformação organizacional.",
              "heart",
            ),
            card(
              "Contato",
              "Uma conversa institucional",
              "O canal do Instituto permite discutir necessidade e escopo antes de uma proposta.",
              "users",
            ),
          ],
          sources: [institute],
        },
      }),
    ],
  };
}
