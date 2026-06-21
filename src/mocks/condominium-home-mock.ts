// Políticas de audiência da home de Condomínio (/condominios). O motor
// (audience-engine) é setor-agnóstico: aqui injetamos o vocabulário e o mapeamento
// papel → política da comunidade condominial. Falha fechada — papel não configurado
// cai no menor privilégio.
//
// Invariante (provada em condominium-home-mock.test.ts): toda persona de demonstração
// possui exatamente UMA política; só a gestão (síndico, conselho, administradora)
// recebe índice/lentes/tendência coletivos; morador e equipe nunca recebem painel coletivo.

import {
  hasAudienceCapability,
  resolveAudiencePolicy,
  type AudiencePolicy,
  type AudienceResolution,
} from "@/engine/audience/audience-engine";

export type CondominiumAudienceCapability =
  | "collective_index"
  | "collective_lenses"
  | "collective_trend"
  | "wave_aggregate";

export type CondominiumHomeRoute = "/onda" | "/academia" | "/floresceria" | "/metodologia";

export interface CondominiumHomeAction {
  id: "wave" | "academy" | "ai" | "method";
  eyebrow: string;
  title: string;
  description: string;
  to: CondominiumHomeRoute;
}

export interface CondominiumAudiencePolicy extends AudiencePolicy<CondominiumAudienceCapability> {
  audienceLabel: string;
  eyebrow: string;
  title: string;
  lead: string;
  privacyTitle: string;
  privacyNote: string;
  actions: readonly CondominiumHomeAction[];
}

const PARTICIPANT_ACTIONS: readonly CondominiumHomeAction[] = [
  {
    id: "wave",
    eyebrow: "Mensurar · sua voz",
    title: "Participar da onda aberta",
    description:
      "Responda em poucos minutos. O conteúdo da sua resposta não aparece para o síndico, o conselho ou os vizinhos.",
    to: "/onda",
  },
  {
    id: "academy",
    eyebrow: "Educar · convivência saudável",
    title: "Aprender a conviver melhor",
    description:
      "Acesse experiências sobre boa vizinhança, normas e bem-viver — sem exposição de unidades nem uso punitivo.",
    to: "/academia",
  },
  {
    id: "ai",
    eyebrow: "Apoiar · ConvivIA",
    title: "Transformar uma dúvida em próximo passo",
    description:
      "Use a copilota com limites explícitos: orientação para convivência e bem-estar, nunca diagnóstico ou decisão sobre pessoas.",
    to: "/floresceria",
  },
  {
    id: "method",
    eyebrow: "Confiar · método",
    title: "Entender o que é medido — e o que não é",
    description:
      "Veja como anonimato, agregação e limites científicos protegem cada morador e cada unidade.",
    to: "/metodologia",
  },
];

export const CONDOMINIUM_AUDIENCE_POLICIES: readonly CondominiumAudiencePolicy[] = [
  {
    id: "management",
    audienceLabel: "Gestão condominial",
    roleIds: [
      "PLATFORM_ADMIN",
      "SINDICO",
      "SUBSINDICO",
      "CONSELHO",
      "CONSELHO_FISCAL",
      "ADMINISTRADORA",
      "GESTOR_CARTEIRA",
      "CONSULTOR_COND",
    ],
    capabilities: ["collective_index", "collective_lenses", "collective_trend", "wave_aggregate"],
    eyebrow: "Painel da Síndica · Vitalidade Comunitária",
    title: "A vitalidade viva da sua comunidade condominial",
    lead: "O IVC em quatro lentes — morador, comunidade, liderança e condomínio — lido pela gestão em uma página: onde florescer, onde proteger e para onde a curva aponta.",
    privacyTitle: "Leitura coletiva, nunca vigilância",
    privacyNote:
      "A gestão recebe somente agregados protegidos. Respostas individuais e a identidade da unidade permanecem invisíveis. O IVC nunca alimenta processo disciplinar, cobrança ou ação contra moradores.",
    actions: [],
  },
  {
    id: "staff",
    audienceLabel: "Equipe do condomínio",
    roleIds: ["ZELADOR", "FUNCIONARIO_COND"],
    capabilities: [],
    eyebrow: "Meu espaço · cuidado do dia a dia",
    title: "Cuidar da convivência sem virar alvo de avaliação",
    lead: "Participe da escuta, acesse aprendizagem sobre boa convivência e encontre próximos passos aplicáveis à rotina do condomínio.",
    privacyTitle: "Este não é o painel da gestão",
    privacyNote:
      "Você não recebe o IVC completo nem recortes por torre. Sua participação entra apenas em agregados protegidos e nunca alimenta avaliação ou processo disciplinar.",
    actions: PARTICIPANT_ACTIONS,
  },
  {
    id: "resident",
    audienceLabel: "Morador(a)",
    roleIds: ["MORADOR"],
    capabilities: [],
    eyebrow: "Meu espaço · voz e pertencimento",
    title: "Sua convivência importa. Sua privacidade também.",
    lead: "Aqui você participa da escuta, encontra práticas para conviver melhor e entende como o condomínio usa dados sem expor pessoas nem unidades.",
    privacyTitle: "Nenhuma resposta identifica sua unidade",
    privacyNote:
      "Sua participação é voluntária. Respostas entram apenas em agregados protegidos e nunca alimentam cobrança, processo, advertência ou qualquer ação contra a sua unidade.",
    actions: PARTICIPANT_ACTIONS,
  },
  {
    id: "ambassador",
    audienceLabel: "Embaixador(a) da Boa Vizinhança",
    roleIds: ["EMBAIXADOR_COND"],
    capabilities: [],
    eyebrow: "Meu espaço · cultura e mobilização",
    title: "Mobilizar a boa convivência, sem acessar dado individual",
    lead: "Apoie a participação dos vizinhos, leve as trilhas adiante e use a ConvivIA para transformar escuta em convivência melhor — sempre sobre agregados protegidos.",
    privacyTitle: "Influência sem vigilância",
    privacyNote:
      "Embaixadores mobilizam cultura, não monitoram moradores. Você não acessa o IVC completo nem respostas individuais.",
    actions: PARTICIPANT_ACTIONS,
  },
];

export const CONDOMINIUM_SAFE_FALLBACK_POLICY: CondominiumAudiencePolicy = {
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

export function resolveCondominiumAudience(
  roleId: string,
): AudienceResolution<CondominiumAudiencePolicy> {
  return resolveAudiencePolicy(
    CONDOMINIUM_AUDIENCE_POLICIES,
    roleId,
    CONDOMINIUM_SAFE_FALLBACK_POLICY,
  );
}

export function canViewCondominiumAggregate(roleId: string): boolean {
  return hasAudienceCapability(resolveCondominiumAudience(roleId).policy, "wave_aggregate");
}
