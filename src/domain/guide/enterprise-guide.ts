// Guia da Jornada Empresarial · conteúdo editorial (V2.1, docs/vitalos/guia/GUIA_JORNADA_EMPRESARIAL_V2_1.md).
//
// SÓ O SERVIDOR importa este módulo, depois de validar a senha editorial ou a sessão
// institucional. O caso é FICTÍCIO (Centro de distribuição Serra Azul). Afirmações
// operacionais apontam para o registro de disponibilidade (`capability`).
import type { GuideContent } from "./guide-types";

const DEP = "dependencia" as const;
const Q2_EXAMPLE =
  "A leitura da Expedição ajuda o RH a escolher um tema coletivo: a passagem de turno. O RH define a ação, a liderança registra o alinhamento em 7 de 10 dias e a equipe acompanha a devolutiva. Na revisão, o RH decide adaptar o horário.";

export const ENTERPRISE_GUIDE: GuideContent = {
  version: "2.1.0",
  caseLabel: "Exemplo construído · Centro de distribuição Serra Azul (fictício)",
  opening: {
    title: "Guia da Jornada Empresarial",
    text: "Escolha uma etapa e um perfil para entender sua parte, quem recebe depois e quais ferramentas consultar.",
    example: {
      title: "Acompanhe um exemplo, da preparação à síntese",
      text: "Depois de ouvir a equipe, como saber o que a empresa fez a respeito? A VitalOS organiza escuta, decisão, ação e devolutiva em ciclos trimestrais. O exemplo é a troca de turno num centro de distribuição.",
    },
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
      instrument: "COPSOQ II-Br · Condições de trabalho",
      question: "O que precisa estar pronto antes de escutar a equipe?",
      journey: {
        flow: { steps: ["Preparar", "Revisar"], arrows: true, note: "Coleta oficial: em preparação, fora deste fluxo." },
        example: "A Expedição tem dois turnos. O RH prepara um comunicado para ambos. O SST recomenda reservar tempo na jornada e explicar como a escuta será usada.",
        evidence: "Comunicado e revisão técnica da preparação.",
        checkId: "revisao-abre-coleta",
        stageNotice: "A coleta oficial está em preparação. Consulte como organizar e revisar a escuta.",
      },
      handoffs: [
        { id: "preparar", verb: "Preparar o ciclo", owner: "RH", perspective: "rh", evidence: "Comunicado do ciclo registrado e preparação encaminhada." },
        { id: "revisar", verb: "Revisar a preparação", owner: "SST designado", perspective: "sst", evidence: "Revisão técnica devolvida ao RH, que decide os ajustes." },
        { id: "comunicar", verb: "Acompanhar o comunicado", owner: "Equipe, liderança e direção", perspective: "colaborador", also: ["lideranca", "direcao"], follow: true, evidence: "Comunicado e orientações pelo canal combinado. A coleta oficial segue em preparação." },
      ],
      phase: "Mensurar · preparação",
      cyclePhase: "Mensurar",
      scene: [
        { label: "Contexto", who: "Equipe", text: "Na passagem entre o turno da manhã e o da tarde, as prioridades da Expedição chegam incompletas." },
        { label: "Comunicado", who: "RH", text: "O RH registra o comunicado do ciclo e encaminha a preparação para revisão técnica." },
        { label: "Revisão técnica", who: "SST designado", text: "O SST devolve com uma recomendação: a escuta chega aos dois turnos, dentro da jornada de cada um, e o comunicado diz que a passagem de turno é tema da conversa coletiva, nunca da avaliação de alguém." },
        { label: "Coleta", who: "Em preparação", text: "A coleta oficial ainda não está liberada. O exemplo mostra como a preparação acontece." },
      ],
      guardrails: [
        "Nenhuma resposta individual é exibida a ninguém.",
        "Resultados futuros só aparecem para grupos com 5 ou mais respostas.",
        "Domínio B, educativo: não substitui o PGR nem profissional habilitado. Hoje não há resultados, porque a coleta está bloqueada.",
      ],
      voices: {
        rh: "Prepare o ciclo, registre o comunicado e encaminhe para a revisão técnica.",
        sst: "Revise a preparação que foi encaminhada a você.",
        colaborador: "Entenda por que a empresa está preparando a escuta.",
        lideranca: "Acompanhe a preparação e apoie os turnos quando houver delegação.",
        direcao: "Acompanhe a preparação do ciclo.",
        plataforma: "Confira as condições de habilitação, designação e delegação do Q1.",
      },
      matrix: {
        rh: { mode: "atua", who: "Preparar o ciclo, registrar o comunicado e encaminhar a preparação ao SST designado", receives: "O SST designado recebe a preparação. A equipe recebe o comunicado pelo canal combinado.", condition: "RH com o Q1 habilitado", capability: "q1.preparacao" },
        sst: { mode: "atua", who: "Ler a preparação e devolver a revisão técnica ao RH", receives: "O RH recebe a revisão e decide os ajustes.", condition: "Designação no ciclo, perfil SST da mesma empresa e Q1 habilitado. A área de preparação fica fechada para o SST.", capability: "q1.preparacao" },
        lideranca: { mode: "acompanha", who: "O RH prepara e o SST revisa. Você pode apoiar os turnos se receber a delegação.", receives: "Você recebe o comunicado e as orientações pertinentes à sua equipe.", condition: "Delegação concedida pela plataforma, quando houver", labels: { first: "Sua orientação", second: "O que você recebe" } },
        colaborador: { mode: "acompanha", who: "O RH prepara e o SST revisa.", receives: "Você acompanha o comunicado e as orientações sobre proteção das respostas.", condition: "Ver o comunicado dentro do app: a confirmar. Coleta oficial em preparação.", labels: { first: "Sua orientação", second: "O que você acompanha" } },
        direcao: { mode: "acompanha", who: "O RH prepara e o SST revisa.", receives: "RH e SST conduzem a preparação e a revisão técnica. O que a direção acompanha chega pelo relatório (Q5).", condition: "Escopo da direção no Q1 a confirmar", labels: { first: "Sua orientação", second: "O que você acompanha" } },
        plataforma: { mode: "atua", who: "Habilitar o Q1, designar o SST revisor e conceder a delegação", receives: "A organização recebe a configuração prevista para seus perfis.", condition: "Administração da plataforma" },
      },
    },
    {
      lens: "Q2",
      title: "Q2 · Da leitura à devolutiva",
      instrument: "FIB-T · Bem-estar coletivo",
      question: "Como uma leitura do grupo vira uma ação acompanhada e uma devolutiva?",
      journey: {
        example: Q2_EXAMPLE,
        evidence: "A execução foi registrada. A melhora ainda não foi avaliada.",
        checkId: "quem-recebe",
      },
      phase: "Mensurar → Educar → Transformar → Evoluir",
      cyclePhase: "Transformar",
      scene: [
        { label: "Leitura agregada", who: "RH", text: "No setor Expedição, com 12 respostas, o fator Satisfação com a Empresa aparece abaixo dos demais. O setor Manutenção, com 3 respostas, fica protegido." },
        { label: "Atividade aprovada", who: "RH", text: "Uma prática de aprendizagem em equipe sobre um tema coletivo. O tema é a passagem de turno." },
        { label: "Plano", who: "RH", text: "O plano é ativado e a liderança da Expedição é designada para a ação “alinhamento de 10 minutos na troca de turno, por duas semanas”." },
        { label: "Execução", who: "Liderança", text: "A liderança combina o alinhamento com a equipe e registra o que aconteceu, inclusive os dias em que não coube na rotina." },
        { label: "Aprendizagem e revisão", who: "RH", text: "Em três dias o caminhão atrasou; o RH decide adaptar o horário." },
        { label: "Devolutiva coletiva", who: "Equipe", text: "Depois do aviso, a equipe vê o título, o setor, o fator, o estado, o mês do prazo e “execução registrada”. Não vê responsável, indicador nem evidência." },
      ],
      ivoScene: {
        eu: "A liderança pensa em como ela mesma chega ao turno.",
        nos: "A liderança cuida do combinado da equipe.",
        organizacao: "O RH acompanha a ação pelo plano do ciclo.",
      },
      guardrails: [
        "A leitura só aparece para setor com 5 ou mais respostas. Setor protegido não sustenta ação.",
        "A devolutiva é uma projeção fechada no servidor: sem responsável, indicador, evidência ou linha do tempo.",
        "O título só aparece para ações escritas depois do aviso ao RH.",
        "Execução, mudança observada e eficácia são coisas diferentes.",
      ],
      voices: {
        rh: "Escolha a prioridade da equipe e acompanhe a ação.",
        lideranca: "Combine a prática com a equipe e registre o que aconteceu.",
        colaborador: "Veja o que a equipe decidiu fazer e acompanhe o retorno.",
        sst: "Acompanhe a devolutiva coletiva como membro da organização.",
        direcao: "O RH conduz o plano. A direção acompanha o que foi executado e decidido pelo relatório.",
        plataforma: "A habilitação do Q2 e o primeiro acesso de RH são feitos aqui.",
      },
      matrix: {
        rh: { mode: "atua", who: "Consulte a leitura do grupo, escolha uma prática aprovada, ative o plano, designe a liderança e revise o andamento", receives: "A liderança recebe a ação. A equipe acompanha a devolutiva coletiva.", condition: "Administração da organização com o Q2 habilitado", capability: "q2.leitura_plano" },
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
      instrument: "PERMA+V · Florescimento e vitalidade",
      question: "Como a equipe experimenta uma prática educativa e decide se ela cabe na rotina?",
      journey: {
        flow: { steps: ["Convidar", "Experimentar", "Revisar"], arrows: true },
        example: "Durante duas semanas, a equipe pode experimentar uma pausa curta entre reuniões. Na revisão, decide manter, adaptar ou encerrar a prática.",
        evidence: "No exemplo, fica a decisão coletiva sobre a rotina. A prática é voluntária.",
        checkId: "encerrar-vale",
        stageChip: "Exemplo educativo",
      },
      handoffs: [
        { id: "convidar", verb: "Convidar", owner: "RH", perspective: "rh", evidence: "Convite à prática, sem avaliar quem participa." },
        { id: "experimentar", verb: "Experimentar", owner: "Equipe", perspective: "colaborador", evidence: "Quem quiser marca no quadro da equipe, sem nomes." },
        { id: "revisar", verb: "Revisar e decidir", owner: "Equipe e liderança", perspective: "lideranca", also: ["rh"], evidence: "Decisão coletiva: manter, adaptar ou encerrar a prática." },
      ],
      phase: "Educar → Transformar",
      cyclePhase: "Educar",
      scene: [
        { label: "Convite", who: "RH", text: "A prática Vitalidade 001 propõe uma pausa curta entre reuniões seguidas, voluntária." },
        { label: "Duas semanas", who: "Equipe", text: "Quem quiser marca no quadro da equipe se a pausa aconteceu: sim, em parte ou não. Sem nomes." },
        { label: "Revisão", who: "Equipe e liderança", text: "A equipe decide manter, adaptar ou encerrar. Encerrar também é um resultado válido." },
      ],
      guardrails: [
        "Vitalidade não tem item, escore nem ranking. Os registros são coletivos e sem nomes.",
        "A mensuração PERMA oficial segue bloqueada (autorização, regras de cálculo e de ausências).",
        "Esta lente é independente: não depende do Q2.",
      ],
      voices: {
        rh: "Ofereça a prática de vitalidade como um convite.",
        lideranca: "Ajude a equipe a combinar a prática e o momento da revisão.",
        colaborador: "Se quiser participar, experimente a prática e contribua para a revisão coletiva.",
        sst: "Entenda o propósito educativo da prática.",
        direcao: "Acompanhe a oferta da prática no exemplo de síntese.",
        plataforma: "Consulte a disponibilidade da prática nesta organização.",
      },
      matrix: {
        rh: { mode: "atua", who: "Oferecer a prática Vitalidade 001 como convite, sem avaliar quem participa", receives: "A equipe recebe a proposta e decide como participar.", condition: "Exemplo da jornada: ainda sem habilitação empresarial do Q3", capability: "q3.vitalidade_001" },
        lideranca: { mode: "atua", who: "Facilitar a combinação e a revisão, sem acompanhar quem participou", receives: "A equipe e o RH recebem uma visão coletiva da experiência no exemplo.", condition: "Exemplo da jornada", capability: "q3.vitalidade_001" },
        colaborador: { mode: "atua", who: "Participar se quiser e marcar no quadro da equipe, sem nome", receives: "A equipe recebe um retorno coletivo, sem identificação de quem participou.", condition: "Participação voluntária", capability: "q3.vitalidade_001" },
        sst: { mode: "acompanha", who: "A equipe e a liderança conduzem a prática, que não substitui a gestão de riscos (Domínio B).", receives: "Você acompanha sua relação com as condições de trabalho dentro de sua finalidade.", condition: "Exemplo da jornada", labels: { first: "Sua orientação", second: "O que você acompanha" } },
        direcao: { mode: "acompanha", who: "A equipe conduz a prática.", receives: "O registro descreve a atividade oferecida e os aprendizados coletivos disponíveis.", condition: "Exemplo da jornada", labels: { first: "Sua orientação", second: "O que você acompanha" } },
        plataforma: { mode: DEP, who: "Consultar se a prática está disponível nesta organização.", receives: "O guia apresenta o percurso educativo correspondente ao estado verificado.", condition: "Habilitar o Q3 exige um módulo que ainda não existe", labels: { first: "Sua orientação", second: "O que você acompanha" } },
      },
    },
    {
      lens: "Q4",
      title: "Q4 · Uma força no trabalho",
      instrument: "VIA-T · Forças de caráter",
      question: "Como aplicar uma força em uma situação concreta de trabalho?",
      journey: {
        flow: { steps: ["Escolher uma força", "Experimentar no trabalho", "Refletir"], arrows: false, note: "Trilha individual: nada é enviado ao RH, à liderança ou a um painel da equipe." },
        example: "Uma pessoa escolhe curiosidade e testa fazer uma pergunta de esclarecimento na troca de turno. Depois, reflete sobre o que mudou na conversa.",
        evidence: "O registro de reflexão pertence à própria pessoa.",
        checkId: "rh-recebe-reflexao",
        stageChip: "Exemplo educativo",
      },
      handoffs: [
        { id: "escolher", verb: "Escolher uma força", owner: "A própria pessoa", perspective: "colaborador", also: ["lideranca", "sst"], evidence: "Leitura sobre uma força de caráter, sem registro para a empresa." },
        { id: "experimentar", verb: "Experimentar no trabalho", owner: "A própria pessoa", perspective: "colaborador", also: ["lideranca", "sst"], evidence: "Um jeito de aplicar a força numa situação concreta." },
        { id: "refletir", verb: "Refletir", owner: "Só a pessoa", perspective: "colaborador", also: ["lideranca", "sst"], evidence: "A reflexão fica com a pessoa. Compartilhar é uma escolha dela." },
      ],
      phase: "Educar → Transformar (individual)",
      cyclePhase: "Educar",
      scene: [
        { label: "Leitura", who: "A própria pessoa", text: "Uma pessoa da Expedição lê sobre uma força de caráter." },
        { label: "Aplicação", who: "A própria pessoa", text: "Ela escolhe, sozinha, um jeito de aplicá-la na troca de turno e revisa por conta própria." },
        { label: "Privacidade", who: "Só a pessoa", text: "Ninguém mais vê o que ela registrou." },
      ],
      guardrails: [
        "O percurso é individual: nada vai para a empresa, a liderança ou o RH.",
        "Visão coletiva exige contrato próprio de finalidade, fonte, papéis, publicação e proteção de recortes.",
        "Um perfil da equipe nunca é feito pela soma de rankings individuais.",
      ],
      voices: {
        colaborador: "Escolha uma força, experimente aplicá-la e reflita sobre a experiência.",
        lideranca: "Você pode refletir sobre uma força no seu próprio percurso.",
        rh: "Oriente sobre a proposta educativa, conforme a disponibilidade.",
        sst: "Se quiser, faça o percurso para sua própria reflexão.",
        direcao: "Conheça a finalidade da atividade educativa.",
        plataforma: "Consulte quais percursos estão disponíveis.",
      },
      matrix: {
        colaborador: { mode: "atua", who: "Refletir sobre uma força e escolher uma aplicação no trabalho", receives: "A reflexão fica com você. Compartilhar é uma escolha sua.", condition: "Percurso individual, exemplo da jornada", capability: "q4.percurso_individual", labels: { first: "Sua parte", second: "O que fica com você" } },
        lideranca: { mode: "acompanha", who: "Cada pessoa atua para si. Você também, no seu próprio percurso.", receives: "Cada pessoa mantém a própria reflexão. A liderança não recebe registros individuais da equipe.", condition: "Sem visão de equipe", labels: { first: "Sua orientação", second: "O que fica com cada pessoa" } },
        rh: { mode: "acompanha", who: "Cada pessoa atua para si.", receives: "Cada pessoa conduz sua reflexão. O RH acompanha apenas a oferta da atividade quando isso estiver previsto.", condition: "Sem visão de equipe", labels: { first: "Sua orientação", second: "O que fica com cada pessoa" } },
        sst: { mode: "atua", who: "Refletir sobre a própria força, como qualquer pessoa", receives: "Sua experiência é individual.", condition: "Percurso individual, exemplo da jornada", capability: "q4.percurso_individual", labels: { first: "Sua parte", second: "O que fica com você" } },
        direcao: { mode: "acompanha", who: "Cada pessoa atua para si.", receives: "No exemplo de síntese, aparece somente a oferta da atividade.", condition: "Sem visão de equipe", labels: { first: "Sua orientação", second: "O que você acompanha" } },
        plataforma: { mode: DEP, who: "Consultar quais percursos estão disponíveis.", receives: "A apresentação de uma prática no guia segue a disponibilidade verificada.", condition: "Não há módulo empresarial do Q4", labels: { first: "Sua orientação", second: "O que você acompanha" } },
      },
    },
    {
      lens: "Q5",
      title: "Q5 · Síntese anual · Relatório Global ESG",
      instrument: "Relatório Global ESG · Síntese anual",
      question: "Como o que aprendemos vira compromisso para o próximo ciclo?",
      journey: {
        flow: { steps: ["Síntese do ano", "Próximo compromisso"], arrows: true },
        example: "A liderança registrou a rotina de passagem de turno. O RH documentou a decisão de ajustar o horário. A síntese indica o que foi observado e quais efeitos ainda precisariam ser avaliados.",
        evidence: "Execução, decisão, mudança observada e efeito avaliado aparecem separados, cada um com sua origem.",
        checkId: "registro-vs-efeito",
        stageNotice: "Exemplo de síntese anual. Os registros abaixo são fictícios.",
      },
      handoffs: [
        { id: "consolidar", verb: "Consolidar a síntese", owner: "RH", perspective: "rh", evidence: "Síntese com a origem e os limites de cada informação." },
        { id: "ler", verb: "Ler as evidências", owner: "Direção", perspective: "direcao", also: ["sst"], follow: true, evidence: "Leitura da síntese. O papel da direção na pactuação do próximo ciclo segue a definir." },
        { id: "retorno", verb: "Acompanhar o retorno", owner: "Liderança e equipe", perspective: "lideranca", also: ["colaborador"], follow: true, evidence: "Registros que compõem a síntese e retorno pelo canal previsto para cada perfil." },
      ],
      phase: "Evoluir",
      cyclePhase: "Evoluir",
      scene: [
        { label: "Origem", who: "RH", text: "O caso da troca de turno chega ao relatório com a origem de cada informação." },
        { label: "Leitura", who: "Direção", text: "O relatório separa o que foi executado, o que foi decidido, o que mudou e o que foi avaliado." },
      ],
      guardrails: [
        "Cada conclusão cita sua origem.",
        "Ausência de dado, dado suprimido e ausência de mudança são estados diferentes.",
        "Vínculos ESG aparecem como propostos enquanto não forem aprovados.",
        "Os dados são sintéticos até haver contrato de fonte institucional.",
      ],
      voices: {
        rh: "Consolide o que aconteceu e prepare prioridades para o próximo ciclo.",
        direcao: "Leia as evidências e acompanhe os compromissos do próximo ciclo.",
        lideranca: "Revise a ação que acompanhou e indique o que vale manter ou ajustar.",
        colaborador: "Acompanhe a devolutiva coletiva da equipe.",
        sst: "Acompanhe as informações da frente de riscos no escopo técnico aplicável.",
        plataforma: "Consulte as condições de emissão e publicação do relatório.",
      },
      matrix: {
        rh: { mode: "atua", who: "Revisar a síntese e decidir os compromissos do próximo ciclo", receives: "A direção recebe a síntese, com origem e limites de cada informação.", condition: "Hoje, só o exemplo sintético", capability: "q5.relatorio" },
        direcao: { mode: "acompanha", who: "O RH consolida a síntese.", receives: "Você acompanha a síntese: execução, decisão, mudança observada e efeito avaliado, separados. O papel da direção ao pactuar prioridades, responsáveis e revisão segue a definir.", condition: "Exemplo da jornada", capability: "q5.relatorio", labels: { first: "Sua orientação", second: "O que você acompanha" } },
        lideranca: { mode: "acompanha", who: "O RH consolida a síntese.", receives: "O RH recebe os registros que compõem a síntese.", condition: "Exemplo da jornada", labels: { first: "Sua orientação", second: "Quem recebe" } },
        colaborador: { mode: DEP, who: "O RH consolida a síntese.", receives: "Você recebe o retorno pelo canal previsto para seu perfil.", condition: "Acesso ao relatório anual depende da regra de publicação (a decidir)", labels: { first: "Sua orientação", second: "O que você acompanha" } },
        sst: { mode: "acompanha", who: "O RH consolida a síntese.", receives: "A origem dos registros e os limites de leitura aparecem na síntese, com o Domínio B separado.", condition: "Exemplo da jornada", labels: { first: "Sua orientação", second: "O que você acompanha" } },
        plataforma: { mode: DEP, who: "Consultar as condições de emissão e publicação do relatório.", receives: "O guia apresenta exemplo ou acesso institucional conforme o contrato vigente.", condition: "A emissão institucional depende de contrato", labels: { first: "Sua orientação", second: "O que você acompanha" } },
      },
    },
  ],
  handoffs: [
    { id: "leitura", verb: "Ler o grupo", owner: "Equipe e RH", perspective: "rh", evidence: "Leitura agregada publicada (grupos com 5 ou mais respostas)." },
    { id: "decisao", verb: "Decidir e designar", owner: "RH", perspective: "rh", evidence: "Plano ativo com a ação e a pessoa responsável." },
    { id: "acao", verb: "Combinar e registrar", owner: "Liderança", perspective: "lideranca", evidence: "Registro de execução: dias realizados e dias em que não coube." },
    { id: "retorno", verb: "Acompanhar o retorno", owner: "Equipe e SST", perspective: "colaborador", also: ["sst"], follow: true, evidence: "Devolutiva coletiva com o estado da ação e “execução registrada”." },
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
  resolvedExample: Q2_EXAMPLE,
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
      id: "revisao-abre-coleta",
      question: "A revisão técnica já abre a coleta?",
      options: [
        { id: "sim", label: "Sim, depois da revisão a coleta começa.", feedback: "Ainda não. A revisão registra a preparação; a coleta oficial é uma etapa distinta e segue em preparação." },
        { id: "nao", label: "Não. Ela registra a revisão da preparação.", feedback: "Isso. A coleta oficial é uma etapa distinta." },
        { id: "rh", label: "Sim, quando o RH decidir.", feedback: "Ainda não. A decisão do RH ajusta a preparação, mas não libera a coleta oficial." },
      ],
      correctOptionId: "nao",
    },
    {
      id: "encerrar-vale",
      question: "Encerrar a prática é uma decisão válida?",
      options: [
        { id: "so-manter", label: "Não. O objetivo é sempre manter a prática.", feedback: "Ainda não. A revisão decide se a prática cabe no contexto, e encerrar é uma das saídas." },
        { id: "sim", label: "Sim. A revisão serve para decidir se a prática cabe no contexto.", feedback: "Isso. Manter, adaptar ou encerrar são decisões válidas da equipe." },
        { id: "lideranca", label: "Só se a liderança aprovar.", feedback: "Ainda não. A equipe decide na revisão coletiva; a prática é voluntária." },
      ],
      correctOptionId: "sim",
    },
    {
      id: "rh-recebe-reflexao",
      question: "O RH recebe a reflexão individual?",
      options: [
        { id: "resumo", label: "Sim, em um resumo por equipe.", feedback: "Ainda não. Um perfil da equipe nunca é feito pela soma de reflexões individuais." },
        { id: "sim", label: "Sim, para orientar as ações.", feedback: "Ainda não. A reflexão pertence à pessoa e não segue para o RH." },
        { id: "nao", label: "Não. A pessoa decide se quer compartilhar algo.", feedback: "Isso. O percurso é individual e o compartilhamento é uma escolha da pessoa." },
      ],
      correctOptionId: "nao",
    },
    {
      id: "registro-vs-efeito",
      question: "Registrar uma ação é o mesmo que avaliar seu efeito?",
      options: [
        { id: "mesmo", label: "Sim. Se a ação foi registrada, o efeito está comprovado.", feedback: "Ainda não. O registro mostra que a ação aconteceu; não mostra o que mudou por causa dela." },
        { id: "nao", label: "Não. O registro mostra execução; avaliar efeito exige evidência e método adequados.", feedback: "Isso. Execução, mudança observada e efeito avaliado são informações diferentes, cada uma com sua origem." },
        { id: "parcial", label: "Em parte. Basta ter registrado a maioria dos dias.", feedback: "Ainda não. Executar a maior parte dos dias descreve a rotina, não o efeito." },
      ],
      correctOptionId: "nao",
    },
  ],
  whatNext:
    "Depois da revisão, a decisão volta à equipe na devolutiva coletiva. O exemplo de relatório anual (Q5) mostra a origem de cada informação.",
  readingNotice:
    "Ler este guia não registra execução, consentimento, conclusão de treinamento nem certificação.",
};
