// Guia da Jornada Empresarial · conteúdo editorial (V2.1, docs/vitalos/guia/GUIA_JORNADA_EMPRESARIAL_V2_1.md).
//
// SÓ O SERVIDOR importa este módulo, depois de validar a senha editorial ou a sessão
// institucional. O caso é FICTÍCIO (Centro de distribuição Serra Azul). Afirmações
// operacionais apontam para o registro de disponibilidade (`capability`).
import type { GuideContent } from "./guide-types";

const DEP = "dependencia" as const;

export const ENTERPRISE_GUIDE: GuideContent = {
  version: "2.1.0",
  caseLabel: "Exemplo construído · Centro de distribuição Serra Azul (fictício)",
  opening: {
    title: "Depois de ouvir a equipe, como saber o que a empresa fez a respeito?",
    text: "A VitalOS organiza escuta, decisão, ação e devolutiva em ciclos trimestrais. Veja um exemplo construído: a troca de turno num centro de distribuição.",
    receives: {
      title: "Você recebe",
      text: "Os serviços previstos no plano contratado: preparação da avaliação, análise e leitura agregada dos resultados, devolutiva, apoio à elaboração do plano de ação e treinamento. Cada plano descreve as lentes e as entregas que inclui.",
    },
    mobilizes: {
      title: "Sua empresa mobiliza",
      text: "Uma pessoa que coordena o ciclo, lideranças que acompanham as ações combinadas, um profissional de SST com perfil na empresa para a revisão técnica do Q1 e tempo da equipe para participar.",
    },
    consult: {
      title: "Você poderá consultar",
      items: [
        { label: "Preparação da avaliação do Q1", capability: "q1.preparacao" },
        {
          label: "Coleta oficial do COPSOQ II-Br",
          fixed: "Em preparação",
          note: "A aplicação do COPSOQ II-Br ainda não está liberada. Hoje é possível preparar a avaliação.",
        },
        { label: "Leitura agregada, plano, execução e devolutiva do Q2", capability: "q2.leitura_plano" },
        { label: "Relatório com a origem de cada informação", fixed: "Exemplo da jornada" },
      ],
    },
    billing: "A contratação remunera os serviços previstos no plano. O questionário COPSOQ II-Br não tem cobrança separada.",
    disclaimer:
      "Apoio educativo e organizacional: não substitui o PGR nem profissional habilitado e não garante conformidade com a NR-1.",
    primaryCta: "Ver a jornada por perfil",
    secondaryCta: { label: "Conversar sobre a VitalOS", href: "https://www.felicidadeparatodos.com.br/" },
  },
  perspectives: [
    { id: "rh", label: "RH" },
    { id: "lideranca", label: "Liderança" },
    { id: "colaborador", label: "Colaborador" },
    { id: "sst", label: "SST" },
    { id: "direcao", label: "Direção" },
    { id: "plataforma", label: "Plataforma" },
  ],
  maps: {
    lenses: "Lentes da jornada anual: em que momento estamos?",
    cycle: "Ciclo de trabalho: o que fazemos com o que aprendemos? Mensurar → Educar → Transformar → Evoluir.",
    perspectives: "Perspectivas do IVO: de onde olhamos? EU · NÓS · LIDERANÇA · ORGANIZAÇÃO. São olhares de leitura, não papéis de acesso.",
    scene:
      "No Q2 (lente), a equipe da Expedição está em Transformar (ciclo): a liderança combina o alinhamento de troca de turno. A mesma liderança pensa em como chega ao turno (EU) e cuida do combinado da equipe (NÓS). O RH acompanha pela ORGANIZAÇÃO.",
    ivoDefinition:
      "IVO, Índice de Vitalidade Organizacional: organiza a leitura em quatro perspectivas. Nesta versão, ele não é calculado no guia.",
  },
  lenses: [
    {
      lens: "Q1",
      title: "Q1 · Preparar a escuta",
      instrument: "COPSOQ II-Br",
      question: "Como a empresa prepara uma escuta adequada às condições de trabalho?",
      phase: "Mensurar · preparação",
      scene: [
        "Na passagem entre o turno da manhã e o da tarde, as prioridades da Expedição chegam incompletas.",
        "O RH registra o comunicado do ciclo e encaminha a preparação para revisão técnica.",
        "O SST designado devolve com uma recomendação: a escuta deve chegar aos dois turnos, dentro da jornada de cada um, e o comunicado deve dizer que a passagem de turno é tema da conversa coletiva, nunca da avaliação de alguém.",
        "Coleta oficial em preparação. O exemplo mostra como a preparação acontece.",
      ],
      guardrails: [
        "Nenhuma resposta individual é exibida a ninguém.",
        "Resultados futuros só aparecem para grupos com 5 ou mais respostas.",
        "Domínio B, educativo: não substitui o PGR nem profissional habilitado. Hoje não há resultados, porque a coleta está bloqueada.",
      ],
      voices: {
        rh: "Prepare o ciclo, registre o comunicado e encaminhe a revisão técnica antes de abrir a escuta.",
        sst: "Sua leitura técnica ajuda a decidir se a escuta está adequada às condições de trabalho, aos horários de cada turno e à forma de comunicar o tema.",
        colaborador: "Antes de qualquer pergunta, a empresa explica o motivo da escuta e como as respostas são protegidas.",
        lideranca: "Você pode receber da plataforma a delegação para ajudar na preparação. A escuta é coletiva: ninguém avalia a sua equipe por ela.",
        direcao: "O RH conduz a preparação e o SST revisa. O que a direção acompanha chega pelo relatório.",
        plataforma: "A habilitação do Q1, a designação do SST revisor e a delegação da preparação são feitas aqui.",
      },
      matrix: {
        rh: { mode: "atua", who: "Preparar o ciclo, registrar o comunicado e encaminhar a revisão técnica", receives: "O SST designado (revisão) e a equipe (comunicado)", condition: "RH com o Q1 habilitado", capability: "q1.preparacao" },
        sst: { mode: "atua", who: "Ler a preparação e devolver a revisão técnica", receives: "O RH, que ajusta e reencaminha", condition: "Designação no ciclo, perfil SST da mesma empresa e Q1 habilitado. A área de preparação fica fechada para o SST.", capability: "q1.preparacao" },
        lideranca: { mode: "acompanha", who: "O RH prepara; você pode receber a delegação da preparação", receives: "O comunicado do ciclo", condition: "Delegação concedida pela plataforma, quando houver" },
        colaborador: { mode: "acompanha", who: "O RH prepara", receives: "O comunicado do ciclo, pelo canal escolhido pela empresa", condition: "Ver o comunicado dentro do app: a confirmar. Coleta oficial em preparação." },
        direcao: { mode: "acompanha", who: "O RH conduz e o SST revisa", receives: "O relatório (Q5)", condition: "Escopo da direção no Q1 a confirmar" },
        plataforma: { mode: "atua", who: "Habilitar o Q1, designar o SST revisor e conceder a delegação", receives: "A empresa", condition: "Administração da plataforma" },
      },
    },
    {
      lens: "Q2",
      title: "Q2 · Da leitura à devolutiva",
      instrument: "FIB-T",
      question: "Como uma leitura do grupo vira uma ação acompanhada e uma devolutiva?",
      phase: "Mensurar → Educar → Transformar → Evoluir",
      scene: [
        "Leitura agregada (RH): no setor Expedição, com 12 respostas, o fator Satisfação com a Empresa aparece abaixo dos demais. O setor Manutenção, com 3 respostas, fica protegido.",
        "Atividade aprovada (RH): uma prática de aprendizagem em equipe sobre um tema coletivo. O tema é a passagem de turno.",
        "Plano (RH): o plano é ativado e a liderança da Expedição é designada para a ação “alinhamento de 10 minutos na troca de turno, por duas semanas”.",
        "Execução (liderança): a liderança combina o alinhamento com a equipe e registra o que aconteceu, inclusive os dias em que não coube na rotina.",
        "Aprendizagem e revisão (RH): em três dias o caminhão atrasou; o RH decide adaptar o horário.",
        "Devolutiva coletiva (equipe): depois do aviso, a equipe vê o título, o setor, o fator, o estado, o mês do prazo e “execução registrada”. Não vê responsável, indicador nem evidência.",
      ],
      guardrails: [
        "A leitura só aparece para setor com 5 ou mais respostas. Setor protegido não sustenta ação.",
        "A devolutiva é uma projeção fechada no servidor: sem responsável, indicador, evidência ou linha do tempo.",
        "O título só aparece para ações escritas depois do aviso ao RH.",
        "Execução, mudança observada e eficácia são coisas diferentes.",
      ],
      voices: {
        rh: "Escolha uma prioridade, designe quem acompanha e combine quando voltar ao assunto. A equipe verá o que foi decidido.",
        lideranca: "Seu papel é combinar a prática com a equipe e registrar o que de fato aconteceu. Se o encontro não coube na rotina, registre também: isso orienta a revisão do RH.",
        colaborador: "Quem trabalha no turno conhece os detalhes. Sua resposta entra numa leitura do grupo, nunca individual. Veja qual mudança a equipe decidiu experimentar e onde acompanhar o retorno.",
        sst: "No Q2 você não registra nem decide ações. Acompanha a devolutiva coletiva como membro da organização.",
        direcao: "O RH conduz o plano. A direção acompanha o que foi executado e decidido pelo relatório.",
        plataforma: "A habilitação do Q2 e o primeiro acesso de RH são feitos aqui.",
      },
      matrix: {
        rh: { mode: "atua", who: "Ler a leitura publicada, escolher a atividade aprovada, criar e ativar o plano, designar o responsável, revisar e encerrar", receives: "A liderança (ação), todos os membros (devolutiva) e a direção (Q5)", condition: "Administração da organização com o Q2 habilitado", capability: "q2.leitura_plano" },
        lideranca: { mode: "atua", who: "Mudar o estado e registrar a evidência de execução da própria ação, no plano ativo", receives: "O RH, que usa o registro na revisão", condition: "Ser a pessoa responsável pela ação; plano ativo", capability: "q2.execucao_lideranca" },
        colaborador: { mode: "acompanha", who: "RH e liderança atuam", receives: "A devolutiva coletiva: título (depois do aviso), setor, fator, estado, mês do prazo e “execução registrada”", condition: "Membro da organização com o Q2 habilitado", capability: "q2.devolutiva_coletiva" },
        sst: { mode: "acompanha", who: "RH e liderança atuam", receives: "A devolutiva coletiva, como membro", condition: "Sem autoridade sobre ações; a página de ações é negada", capability: "q2.devolutiva_coletiva" },
        direcao: { mode: DEP, who: "O RH atua", receives: "O relatório (Q5)", condition: "Papel da direção no plano a decidir. Até lá, o guia trata a direção como leitora." },
        plataforma: { mode: "atua", who: "Habilitar o Q2 e criar o primeiro acesso de RH", receives: "A empresa", condition: "Administração da plataforma" },
      },
    },
    {
      lens: "Q3",
      title: "Q3 · Uma prática de vitalidade",
      instrument: "PERMA+V",
      question: "Como uma prática educativa voluntária pode ser combinada e revisada?",
      phase: "Educar → Transformar",
      scene: [
        "A prática Vitalidade 001 propõe uma pausa curta entre reuniões seguidas, voluntária.",
        "Por duas semanas, quem quiser marca no quadro da equipe se a pausa aconteceu: sim, em parte ou não. Sem nomes.",
        "Na revisão, a equipe decide manter, adaptar ou encerrar. Encerrar também é um resultado válido.",
      ],
      guardrails: [
        "Vitalidade não tem item, escore nem ranking. Os registros são coletivos e sem nomes.",
        "A mensuração PERMA oficial segue bloqueada (autorização, regras de cálculo e de ausências).",
        "Esta lente é independente: não depende do Q2.",
      ],
      voices: {
        rh: "Ofereça a prática como convite. Ninguém é avaliado por participar.",
        lideranca: "Você facilita a combinação e a revisão; não acompanha quem participou.",
        colaborador: "Participar é voluntário. Ninguém registra seu nome nem avalia sua participação.",
        sst: "A prática é educativa e não substitui a gestão de riscos psicossociais.",
        direcao: "No relatório, a prática aparece como conteúdo oferecido, não como resultado.",
        plataforma: "Ainda não existe habilitação empresarial do Q3.",
      },
      matrix: {
        rh: { mode: "atua", who: "Oferecer a prática Vitalidade 001", receives: "A equipe", condition: "Exemplo da jornada: ainda sem habilitação empresarial do Q3", capability: "q3.vitalidade_001" },
        lideranca: { mode: "atua", who: "Facilitar a combinação e a revisão, sem acompanhar quem participou", receives: "O RH, na revisão coletiva", condition: "Exemplo da jornada", capability: "q3.vitalidade_001" },
        colaborador: { mode: "atua", who: "Participar se quiser e marcar no quadro da equipe, sem nome", receives: "A equipe", condition: "Participação voluntária", capability: "q3.vitalidade_001" },
        sst: { mode: "acompanha", who: "Equipe e liderança conduzem", receives: "A prática, que não substitui a gestão de riscos (Domínio B)", condition: "Exemplo da jornada" },
        direcao: { mode: "acompanha", who: "A equipe conduz", receives: "O relatório (Q5), só como conteúdo oferecido", condition: "Exemplo da jornada" },
        plataforma: { mode: DEP, who: "—", receives: "—", condition: "Habilitar o Q3 exige um módulo que ainda não existe" },
      },
    },
    {
      lens: "Q4",
      title: "Q4 · Uma força no trabalho",
      instrument: "VIA-T",
      question: "Como uma pessoa reflete sobre uma força e experimenta aplicá-la no trabalho?",
      phase: "Educar → Transformar (individual)",
      scene: [
        "Uma pessoa da Expedição lê sobre uma força de caráter.",
        "Ela escolhe, sozinha, um jeito de aplicá-la na troca de turno e revisa por conta própria.",
        "Ninguém mais vê o que ela registrou.",
      ],
      guardrails: [
        "O percurso é individual: nada vai para a empresa, a liderança ou o RH.",
        "Visão coletiva exige contrato próprio de finalidade, fonte, papéis, publicação e proteção de recortes.",
        "Um perfil da equipe nunca é feito pela soma de rankings individuais.",
      ],
      voices: {
        colaborador: "O que você descobre aqui é seu. A empresa não vê as suas forças.",
        lideranca: "Você pode fazer o seu próprio percurso. Não vê as forças da sua equipe.",
        rh: "Cada pessoa atua para si. O RH não recebe dado individual.",
        sst: "Como qualquer pessoa, você pode fazer o seu percurso individual.",
        direcao: "Não há dado de forças da equipe nesta lente.",
        plataforma: "Ainda não existe habilitação empresarial do Q4.",
      },
      matrix: {
        colaborador: { mode: "atua", who: "Refletir sobre uma força e escolher uma aplicação no trabalho", receives: "A própria pessoa", condition: "Percurso individual, exemplo da jornada", capability: "q4.percurso_individual" },
        lideranca: { mode: "acompanha", who: "Cada pessoa atua para si (você também, no seu percurso)", receives: "Nada da equipe: não vê forças de ninguém", condition: "Sem visão de equipe" },
        rh: { mode: "acompanha", who: "Cada pessoa atua para si", receives: "Nenhum dado individual", condition: "Sem visão de equipe" },
        sst: { mode: "atua", who: "Refletir sobre a própria força, como qualquer pessoa", receives: "A própria pessoa", condition: "Percurso individual, exemplo da jornada", capability: "q4.percurso_individual" },
        direcao: { mode: "acompanha", who: "Cada pessoa atua para si", receives: "Nenhum dado; no relatório, só a menção de que a lente foi oferecida", condition: "Sem visão de equipe" },
        plataforma: { mode: DEP, who: "—", receives: "—", condition: "Não há módulo empresarial do Q4" },
      },
    },
    {
      lens: "Q5",
      title: "Q5 · Síntese anual · Relatório Global ESG",
      instrument: "Relatório Global",
      question: "Como a organização lê o percurso do ano e decide os próximos compromissos?",
      phase: "Evoluir",
      scene: [
        "O caso da troca de turno chega ao relatório com a origem de cada informação.",
        "O relatório separa o que foi executado, o que foi decidido, o que mudou e o que foi avaliado.",
      ],
      guardrails: [
        "Cada conclusão cita sua origem.",
        "Ausência de dado, dado suprimido e ausência de mudança são estados diferentes.",
        "Vínculos ESG aparecem como propostos enquanto não forem aprovados.",
        "Os dados são sintéticos até haver contrato de fonte institucional.",
      ],
      voices: {
        rh: "Revise a síntese e decida os compromissos do próximo ciclo.",
        direcao: "O relatório mostra o que foi executado, o que foi decidido e o que ainda não se sabe, com a origem de cada informação.",
        lideranca: "Você encontra o extrato da ação que acompanhou.",
        colaborador: "A devolutiva coletiva já é o canal da equipe. O acesso ao relatório anual ainda está em decisão.",
        sst: "O extrato mostra o Domínio B separado das demais lentes.",
        plataforma: "A emissão institucional do relatório depende de contrato.",
      },
      matrix: {
        rh: { mode: "atua", who: "Revisar a síntese e decidir os compromissos", receives: "A direção", condition: "Hoje, só o exemplo sintético", capability: "q5.relatorio" },
        direcao: { mode: "acompanha", who: "O RH consolida", receives: "O relatório: execução, decisão, mudança observada e efeito avaliado, separados", condition: "Exemplo da jornada", capability: "q5.relatorio" },
        lideranca: { mode: "acompanha", who: "O RH consolida", receives: "O extrato da ação que acompanhou", condition: "Exemplo da jornada" },
        colaborador: { mode: DEP, who: "O RH consolida", receives: "A devolutiva coletiva continua sendo o canal da equipe", condition: "Acesso ao relatório anual depende da regra de publicação (a decidir)" },
        sst: { mode: "acompanha", who: "O RH consolida", receives: "O extrato, com o Domínio B separado", condition: "Exemplo da jornada" },
        plataforma: { mode: DEP, who: "—", receives: "—", condition: "A emissão institucional depende de contrato" },
      },
    },
  ],
  handoffs: [
    { id: "leitura", verb: "Ler o grupo", owner: "Equipe e RH", perspective: "rh", evidence: "Leitura agregada publicada (grupos com 5 ou mais respostas)." },
    { id: "decisao", verb: "Decidir e designar", owner: "RH", perspective: "rh", evidence: "Plano ativo com a ação e a pessoa responsável." },
    { id: "acao", verb: "Combinar e registrar", owner: "Liderança", perspective: "lideranca", evidence: "Registro de execução: dias realizados e dias em que não coube." },
    { id: "retorno", verb: "Acompanhar o retorno", owner: "Colaborador", perspective: "colaborador", evidence: "Devolutiva coletiva com o estado da ação e “execução registrada”." },
  ],
  q5Extract: {
    rows: [
      { kind: "Execução registrada", text: "A liderança registrou o alinhamento em 7 de 10 dias.", origin: "Registro de execução da ação (Q2)" },
      { kind: "Decisão documentada", text: "O RH decidiu adaptar o horário para depois da chegada do caminhão.", origin: "Revisão do plano (Q2)" },
      { kind: "Mudança observada", text: "Sem leitura comparável depois da ação; mudança não estimável.", origin: "Leitura do ciclo seguinte (ausente)" },
      { kind: "Efeito avaliado", text: "Não avaliado: não houve desenho de avaliação.", origin: "—" },
    ],
    note: "Dado sintético. Ausência de dado, dado suprimido e ausência de mudança são estados diferentes. Vínculos ESG aparecem como propostos enquanto não forem aprovados.",
  },
  resolvedExample:
    "A leitura da Expedição mostra Satisfação com a Empresa abaixo dos demais fatores. O RH não conclui que a liderança causou isso. Escolhe um tema coletivo (a passagem de turno), designa quem acompanha e marca a revisão. A leitura agregada indica onde conversar, não quem é responsável pelo número.",
  checks: [
    {
      id: "quem-recebe",
      question: "A liderança registrou que o alinhamento aconteceu em 7 de 10 dias. Quem usa esse registro a seguir?",
      options: [
        { id: "rh", label: "O RH, para decidir a continuidade.", feedback: "Isso. O RH decide manter, adaptar ou encerrar, e a decisão volta à equipe na devolutiva." },
        { id: "direcao", label: "A direção, para avaliar a liderança.", feedback: "Ainda não. O registro mostra se a prática aconteceu; não serve para avaliar pessoas, e a VitalOS não o liga a desempenho." },
        { id: "ninguem", label: "Ninguém; o registro termina na liderança.", feedback: "Ainda não. O registro segue para o RH, que decide a continuidade." },
      ],
      correctOptionId: "rh",
    },
    {
      id: "o-que-concluir",
      question: "O relatório diz: “execução registrada em 7 de 10 dias”. O que você pode afirmar?",
      options: [
        { id: "executou", label: "A prática aconteceu na maior parte dos dias.", feedback: "Isso. Mudança pede leitura comparável; efeito pede desenho de avaliação." },
        { id: "melhorou", label: "A clareza das prioridades melhorou.", feedback: "Ainda não. Melhora é mudança observada e precisa de uma leitura depois da ação." },
        { id: "falhou", label: "A prática não funcionou, porque faltaram 3 dias.", feedback: "Ainda não. A execução parcial é informação sobre a rotina, não um julgamento da prática." },
      ],
      correctOptionId: "executou",
    },
  ],
  whatNext:
    "Depois da revisão, a decisão volta à equipe na devolutiva coletiva e entra no relatório do ano com a origem de cada informação.",
  readingNotice:
    "Ler este guia não registra execução, consentimento, conclusão de treinamento nem certificação.",
};
