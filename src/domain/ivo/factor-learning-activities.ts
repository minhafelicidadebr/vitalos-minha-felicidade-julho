// Exercícios TESTE preservados e primeira atividade Q2 PROPOSTA para D10.
// Aprovação da unidade não aprova a atividade; vínculo educativo não altera escore.
import type { LearningActivity } from "@/lib/ivo/learning-application";
import proposedActivity from "./q2-learning-activity-001.json";
import { getFactorContentCatalog, type FactorContent, type FactorContentStatus } from "./factor-content";
import { validateQ2LearningCuration, Q2_LEARNING_REGISTRIES, type LearningRegistries, type Q2LearningCuration } from "./q2-learning-curation";
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
export interface FactorLearningActivity extends LearningActivity {
  contentId: string;
  status: FactorContentStatus;
  evidenceCodes: readonly string[];
  safeClaimIds: readonly string[];
  curation: Q2LearningCuration | null;
}

export function validateFactorLearningActivities(
  entries: readonly FactorLearningActivity[],
  contents: readonly FactorContent[] = getFactorContentCatalog(),
  registries: LearningRegistries = Q2_LEARNING_REGISTRIES,
): readonly FactorLearningActivity[] {
  const ids = new Set<string>();
  const bindings = new Set<string>();
  return Object.freeze(entries.map((a) => {
    function fail(reason: string): never { throw new Error(`[q2-activity] ${a.id}: ${reason}`); }
    const content = contents.find((c) => c.id === a.contentId && c.version === a.contentVersion);
    const binding = `${a.contentId}@${a.contentVersion}`;
    if (!a.id?.trim() || ids.has(a.id) || bindings.has(binding)) fail("id ou vínculo duplicado");
    ids.add(a.id); bindings.add(binding);
    if (!content || !["TESTE", "PROPOSTO", "APROVADO"].includes(a.status)) fail("conteúdo/versão/status incompatível");
    if ((a.status === "TESTE") !== a.id.startsWith("TESTE-") || (a.status === "TESTE") !== (content.status === "TESTE")) fail("TESTE não pode ser convertido por herança");
    if (!a.practicePrompt?.trim() || !a.reviewPrompt?.trim() || !a.version?.trim()) fail("prática/revisão/versão ausente");
    if (a.status !== "TESTE" && (!a.recallPrompt?.trim() || a.checks.length < 3 || a.checks.length > 6)) fail("recuperação e 3–6 questões obrigatórias");
    if (!a.checks.length) fail("questões ausentes");
    const checkIds = new Set<string>();
    for (const check of a.checks) {
      const optionIds = check.options.map((o) => o.id);
      if (!check.id?.trim() || checkIds.has(check.id) || !check.question?.trim() || !check.explanation?.trim() ||
        optionIds.length < 2 || new Set(optionIds).size !== optionIds.length ||
        check.options.some((o) => !o.id?.trim() || !o.label?.trim()) || !optionIds.includes(check.correctOptionId)) fail("questão/alternativas inválidas");
      checkIds.add(check.id);
    }
    const curation = a.status === "TESTE" ? null : validateQ2LearningCuration({ ...a, status: a.status }, registries);
    if (a.status === "TESTE" && (a.evidenceCodes.length || a.safeClaimIds.length || a.curation)) fail("TESTE não recebe fontes/aprovação");
    if (a.status === "APROVADO" && (content.status !== "APROVADO" ||
      a.evidenceCodes.some((id) => !content.evidenceCodes.includes(id)) ||
      a.safeClaimIds.some((id) => !content.safeClaimIds.includes(id)))) fail("aprovação da atividade não cobre esta unidade");
    return Object.freeze({ ...a, curation,
      evidenceCodes: Object.freeze([...a.evidenceCodes]), safeClaimIds: Object.freeze([...a.safeClaimIds]),
      checks: Object.freeze(a.checks.map((check) => Object.freeze({ ...check,
        options: Object.freeze(check.options.map((option) => Object.freeze({ ...option }))),
      }))),
    });
  }));
}

const CATALOG = validateFactorLearningActivities([
  ...Object.entries(activities).map(([contentId, activity]) => ({
    ...activity, contentId, status: "TESTE" as const, evidenceCodes: [], safeClaimIds: [], curation: null,
  })),
  proposedActivity as FactorLearningActivity,
]);

// Consulta editorial inclui propostas; serviços de produto usam somente o resolvedor abaixo.
export function getFactorLearningActivity(
  contentId: string,
  contentVersion: string,
): FactorLearningActivity | undefined {
  return CATALOG.find((a) => a.contentId === contentId && a.contentVersion === contentVersion);
}

export function getAvailableFactorLearningActivity(
  content: FactorContent,
  testVisible: boolean,
  entries: readonly FactorLearningActivity[] = CATALOG,
): FactorLearningActivity | undefined {
  return entries.find((a) => a.contentId === content.id && a.contentVersion === content.version && (
    (content.status === "TESTE" && a.status === "TESTE" && testVisible) ||
    (content.status === "APROVADO" && a.status === "APROVADO" &&
      content.curation?.approval?.version === content.version && a.curation?.approval?.version === a.version)
  ));
}
