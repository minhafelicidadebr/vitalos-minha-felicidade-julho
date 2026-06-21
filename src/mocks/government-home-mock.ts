// Políticas de audiência da home de Governo (/governo). O motor (audience-engine)
// é setor-agnóstico: aqui injetamos o vocabulário e o mapeamento papel → política
// do serviço público. Falha fechada — papel não configurado cai no menor privilégio.
//
// Invariante (provada em government-home-mock.test.ts): toda persona de demonstração
// possui exatamente UMA política; só a gestão recebe índice/lentes/tendência coletivos;
// servidor e gestor de equipe nunca recebem capacidades de painel coletivo.

import {
  hasAudienceCapability,
  resolveAudiencePolicy,
  type AudiencePolicy,
  type AudienceResolution,
} from "@/engine/audience/audience-engine";

export type GovernmentAudienceCapability =
  | "collective_index"
  | "collective_lenses"
  | "collective_trend"
  | "wave_aggregate";

export type GovernmentHomeRoute = "/onda" | "/academia" | "/floresceria" | "/metodologia";

export interface GovernmentHomeAction {
  id: "wave" | "academy" | "ai" | "method";
  eyebrow: string;
  title: string;
  description: string;
  to: GovernmentHomeRoute;
}

export interface GovernmentAudiencePolicy extends AudiencePolicy<GovernmentAudienceCapability> {
  audienceLabel: string;
  eyebrow: string;
  title: string;
  lead: string;
  privacyTitle: string;
  privacyNote: string;
  actions: readonly GovernmentHomeAction[];
}

const PARTICIPANT_ACTIONS: readonly GovernmentHomeAction[] = [
  {
    id: "wave",
    eyebrow: "Mensurar · sua voz",
    title: "Participar da onda aberta",
    description:
      "Responda em poucos minutos. O conteúdo da sua resposta não aparece para a chefia, a gestão de pessoas ou colegas.",
    to: "/onda",
  },
  {
    id: "academy",
    eyebrow: "Educar · trilha do servidor",
    title: "Aprender com o contexto de agora",
    description:
      "Acesse experiências selecionadas para o seu papel — sem nota, sem ranking e sem uso em avaliação de desempenho.",
    to: "/academia",
  },
  {
    id: "ai",
    eyebrow: "Apoiar · CidadanIA",
    title: "Transformar uma dúvida em próximo passo",
    description:
      "Use a copilota com limites explícitos: orientação educativa dentro das regras da carreira, nunca diagnóstico ou decisão sobre pessoas.",
    to: "/floresceria",
  },
  {
    id: "method",
    eyebrow: "Confiar · método",
    title: "Entender o que é medido — e o que não é",
    description: "Veja como anonimato, agregação e limites científicos protegem cada servidor.",
    to: "/metodologia",
  },
];

export const GOVERNMENT_AUDIENCE_POLICIES: readonly GovernmentAudiencePolicy[] = [
  {
    id: "management",
    audienceLabel: "Alta direção e gestão de pessoas",
    roleIds: [
      "PLATFORM_ADMIN",
      "DIRIGENTE",
      "SECRETARIO",
      "GESTOR_ORGAO",
      "DGP_RH",
      "CONTROLE_INTERNO",
      "CIPA_SST_GOV",
      "CONSULTOR_GOV",
    ],
    capabilities: ["collective_index", "collective_lenses", "collective_trend", "wave_aggregate"],
    eyebrow: "Painel da Alta Direção · Vitalidade Governamental",
    title: "A vitalidade viva do seu órgão público",
    lead: "O IGV em quatro lentes — servidor, seção, gestão pública e instituição — lido pela direção em uma página: onde florescer, onde proteger e para onde a curva aponta.",
    privacyTitle: "Leitura institucional, nunca vigilância",
    privacyNote:
      "A direção recebe somente agregados protegidos. Respostas individuais e a identidade de quem não respondeu permanecem invisíveis. O IGV nunca alimenta avaliação de desempenho, progressão ou remuneração.",
    actions: [],
  },
  {
    id: "team_manager",
    audienceLabel: "Gestor(a) de equipe",
    roleIds: ["GESTOR_EQUIPE"],
    capabilities: [],
    eyebrow: "Meu espaço · liderança de equipe",
    title: "Liderar pessoas sem transformar cuidado em controle",
    lead: "Participe da escuta, acesse aprendizagem pertinente à liderança no serviço público e encontre próximos passos aplicáveis à rotina da equipe.",
    privacyTitle: "Este não é o painel da direção",
    privacyNote:
      "Você não recebe o IGV completo nem recortes de outras seções. Enquanto não houver agregado autorizado da sua própria equipe com n≥5, o sistema permanece no modo participante.",
    actions: PARTICIPANT_ACTIONS,
  },
  {
    id: "server",
    audienceLabel: "Servidor(a)",
    roleIds: ["SERVIDOR"],
    capabilities: [],
    eyebrow: "Meu espaço · voz e propósito público",
    title: "Sua experiência no serviço importa. Sua privacidade também.",
    lead: "Aqui você participa da escuta, encontra práticas para sustentar propósito e bem-estar no trabalho e entende como o órgão usa dados sem expor pessoas.",
    privacyTitle: "Nenhuma resposta vira avaliação",
    privacyNote:
      "Sua participação é voluntária. Respostas entram apenas em agregados protegidos e nunca alimentam avaliação de desempenho, progressão, processo disciplinar ou remuneração.",
    actions: PARTICIPANT_ACTIONS,
  },
  {
    id: "ambassador",
    audienceLabel: "Embaixador(a) do Bem-Viver",
    roleIds: ["EMBAIXADOR_GOV"],
    capabilities: [],
    eyebrow: "Meu espaço · cultura e mobilização",
    title: "Mobilizar o cuidado coletivo, sem acessar dado individual",
    lead: "Apoie a participação da sua seção, leve as trilhas adiante e use a CidadanIA para transformar escuta em convivência melhor — sempre sobre agregados protegidos.",
    privacyTitle: "Influência sem vigilância",
    privacyNote:
      "Embaixadores mobilizam cultura, não monitoram pessoas. Você não acessa o IGV completo nem respostas individuais.",
    actions: PARTICIPANT_ACTIONS,
  },
];

export const GOVERNMENT_SAFE_FALLBACK_POLICY: GovernmentAudiencePolicy = {
  id: "safe_fallback",
  audienceLabel: "Participante",
  roleIds: [],
  capabilities: [],
  eyebrow: "Espaço protegido · acesso mínimo",
  title: "Seu espaço está disponível em modo protegido",
  lead: "Este papel ainda não possui uma experiência específica. Por segurança, apenas recursos de participação e aprendizagem ficam disponíveis.",
  privacyTitle: "Menor acesso por padrão",
  privacyNote:
    "Quando uma permissão não está claramente configurada, o VitalOS™ não presume acesso a indicadores coletivos.",
  actions: PARTICIPANT_ACTIONS,
};

export function resolveGovernmentAudience(
  roleId: string,
): AudienceResolution<GovernmentAudiencePolicy> {
  return resolveAudiencePolicy(
    GOVERNMENT_AUDIENCE_POLICIES,
    roleId,
    GOVERNMENT_SAFE_FALLBACK_POLICY,
  );
}

export function canViewGovernmentAggregate(roleId: string): boolean {
  return hasAudienceCapability(resolveGovernmentAudience(roleId).policy, "wave_aggregate");
}
