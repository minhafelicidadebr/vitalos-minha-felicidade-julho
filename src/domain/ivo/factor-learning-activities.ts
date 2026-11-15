// Exercícios editoriais TESTE sobre os roteiros sintéticos existentes.
// Sem estudo/claim fictício, equivalência dimensional, promessa científica ou aprovação D10.
import type { LearningActivity } from "@/lib/ivo/learning-application";
const activities: Record<string, LearningActivity> = {
  "TESTE-bem_estar-001": {
    id: "TESTE-pratica-bem-estar",
    version: "0.0.1-teste",
    contentVersion: "0.0.1-teste",
    checks: [
      {
        id: "recuperar",
        question: "Sem consultar o roteiro: o que deve ser combinado com a equipe?",
        options: [
          { id: "acordo", label: "Uma pequena mudança e o registro do que foi aprendido." },
          { id: "promessa", label: "Uma garantia de melhora do bem-estar após o encontro." },
        ],
        correctOptionId: "acordo",
        explanation:
          "O roteiro de TESTE propõe combinar uma pequena mudança. Ele não afirma efeito nem garante resultado.",
      },
      {
        id: "aplicar",
        question: "A equipe não tem tempo autorizado para o encontro. Como preparar a aplicação?",
        options: [
          { id: "individual", label: "Tratar a ausência como falha individual de aprendizagem." },
          {
            id: "condicao",
            label: "Registrar a necessidade de tempo e combinar apoio da gestão antes de executar.",
          },
        ],
        correctOptionId: "condicao",
        explanation:
          "Neste exercício, a condição de execução precisa ser combinada. O registro não deve atribuir à pessoa um impedimento organizacional.",
      },
    ],
    practicePrompt:
      "Prepare uma mudança pequena com a equipe. Descreva tempo, apoio e recursos necessários, sem nomes ou relatos pessoais.",
    reviewPrompt:
      "Depois da aplicação, volte ao roteiro: o que foi executado, o que foi aprendido e que barreiras permaneceram?",
  },
  "TESTE-satisfacao_empresa-001": {
    id: "TESTE-pratica-metas",
    version: "0.0.1-teste",
    contentVersion: "0.0.1-teste",
    checks: [
      {
        id: "recuperar",
        question: "Qual sequência consta no checklist de TESTE?",
        options: [
          {
            id: "lista",
            label:
              "Listar metas, identificar as conhecidas e combinar como compartilhar as demais.",
          },
          { id: "nota", label: "Dar uma nota individual a quem não conhece as metas." },
        ],
        correctOptionId: "lista",
        explanation:
          "O checklist organiza uma combinação de equipe. Ele não cria avaliação individual.",
      },
      {
        id: "aplicar",
        question: "Algumas metas ainda não foram comunicadas. O que preparar?",
        options: [
          { id: "garantir", label: "Garantir que a comunicação aumentará a satisfação." },
          {
            id: "combinar",
            label: "Combinar a comunicação e acompanhar o que ocorreu, sem prometer efeito.",
          },
        ],
        correctOptionId: "combinar",
        explanation:
          "Comunicar é uma prática verificável. Melhora de satisfação ou causalidade não são comprovadas por sua execução.",
      },
    ],
    practicePrompt:
      "Planeje como compartilhar as metas, quem apoiará e que condição de trabalho precisa ser combinada. Não registre nomes de participantes.",
    reviewPrompt:
      "Retome sem consulta o checklist e diferencie comunicação realizada, aprendizagem e eventual mudança observada.",
  },
};
export function getFactorLearningActivity(
  contentId: string,
  contentVersion: string,
): LearningActivity | undefined {
  const activity = activities[contentId];
  return activity?.contentVersion === contentVersion ? activity : undefined;
}
