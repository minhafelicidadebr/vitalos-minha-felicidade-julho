// Registro mock-first dos questionários de onda. O runtime é universal
// (survey-engine); instrumento, escala, itens e disclaimers são domínio injetado.
// As respostas ficam somente na sessão e nunca são transformadas em score individual.

import type { SurveyDefinition, SurveyItem, SurveyScale } from "@/engine/survey/survey-engine";
import enterprisePack from "@/domain/packs/enterprise/enterprise.pack.json";
import ivoFramework from "@/domain/packs/enterprise/ivo-framework.json";
import ievFramework from "@/domain/packs/school/iev-framework.json";
import { FIBT_INSTRUMENT, FIBT_INTRO } from "@/mocks/fibt-mock";
import { VIAT_DEMO_ITEMS, VIAT_INTRO, VIAT_ITEM_TEXT } from "@/mocks/viat-mock";

const AGREEMENT_SCALE: SurveyScale = {
  presentation: "buttons",
  options: [
    { value: 1, label: "Discordo totalmente" },
    { value: 2, label: "Discordo" },
    { value: 3, label: "Neutro" },
    { value: 4, label: "Concordo" },
    { value: 5, label: "Concordo totalmente" },
  ],
  minLabel: "Discordo totalmente",
  maxLabel: "Concordo totalmente",
};

const FREQUENCY_SCALE: SurveyScale = {
  presentation: "buttons",
  options: [
    { value: 1, label: "Nunca" },
    { value: 2, label: "Raramente" },
    { value: 3, label: "Às vezes" },
    { value: 4, label: "Frequentemente" },
    { value: 5, label: "Sempre" },
  ],
  minLabel: "Nunca",
  maxLabel: "Sempre",
};

const FIBT_SCALE: SurveyScale = {
  presentation: "buttons",
  options: [
    { value: 0, label: "0 — menor aderência" },
    { value: 1, label: "1 de 4" },
    { value: 2, label: "2 de 4 — ponto intermediário" },
    { value: 3, label: "3 de 4" },
    { value: 4, label: "4 — maior aderência" },
  ],
  minLabel: "0 — menor aderência",
  maxLabel: "4 — maior aderência",
};

const VIAT_SCALE: SurveyScale = {
  presentation: "slider",
  options: Array.from({ length: 11 }, (_, value) => ({
    value,
    label: value === 0 ? "Nunca descreve" : value === 10 ? "Descreve muito" : `${value} de 10`,
  })),
  minLabel: "0 — Nunca descreve",
  maxLabel: "10 — Descreve muito",
};

export const PERMA_ITEMS: SurveyItem[] = [
  {
    id: "p-eng-1",
    pillarId: "proposito_significado",
    section: "EU",
    text: "Sinto que o meu trabalho tem propósito e significado.",
  },
  {
    id: "p-eng-2",
    pillarId: "crescimento_maestria",
    section: "EU",
    text: "Tenho oportunidades de aprender e crescer aqui.",
  },
  {
    id: "p-eng-3",
    pillarId: "energia_vitalidade",
    section: "EU",
    text: "Na maior parte dos dias, chego ao fim com energia razoável.",
  },
  {
    id: "p-eng-4",
    pillarId: "equilibrio_autonomia",
    section: "EU",
    text: "Consigo equilibrar as demandas do trabalho com a minha vida.",
  },
  {
    id: "p-nos-1",
    pillarId: "seguranca_psicologica",
    section: "NÓS",
    text: "Sinto-me seguro(a) para expor ideias e admitir erros.",
  },
  {
    id: "p-nos-2",
    pillarId: "cooperacao_confianca",
    section: "NÓS",
    text: "Há cooperação e confiança entre as pessoas da minha equipe.",
  },
  {
    id: "p-nos-3",
    pillarId: "reconhecimento_pares",
    section: "NÓS",
    text: "O bom trabalho costuma ser reconhecido entre os pares.",
  },
  {
    id: "p-nos-4",
    pillarId: "comunicacao_pertencimento",
    section: "NÓS",
    text: "Sinto que pertenço e que a comunicação é clara.",
  },
  {
    id: "p-lid-1",
    pillarId: "clareza_direcao",
    section: "LIDERANÇA",
    text: "Tenho clareza sobre a direção e o que se espera de mim.",
  },
  {
    id: "p-lid-2",
    pillarId: "justica_coerencia",
    section: "LIDERANÇA",
    text: "As decisões da liderança são justas e coerentes.",
  },
  {
    id: "p-org-1",
    pillarId: "condicoes_carga",
    section: "ORGANIZAÇÃO",
    text: "Minha carga de trabalho é sustentável na maioria das semanas.",
  },
  {
    id: "p-org-2",
    pillarId: "cultura_bem_estar",
    section: "ORGANIZAÇÃO",
    text: "A cultura daqui leva o bem-estar a sério, na prática.",
  },
];

interface IndexFrameworkLike {
  mandatoryDisclaimer: string;
  lenses: Array<{
    name: string;
    pillars: Array<{ id: string; name: string; sampleItems: string[] }>;
  }>;
}

function itemsFromIndex(framework: IndexFrameworkLike): SurveyItem[] {
  return framework.lenses.flatMap((lens) =>
    lens.pillars.flatMap((pillar) =>
      pillar.sampleItems.slice(0, 1).map((text, itemIndex) => ({
        id: `${pillar.id}-${itemIndex + 1}`,
        pillarId: pillar.id,
        section: lens.name.split(" — ")[0] ?? lens.name,
        text,
      })),
    ),
  );
}

const IEV_ITEMS = itemsFromIndex(ievFramework as IndexFrameworkLike);

const COPSOQ_ITEMS: SurveyItem[] = [
  {
    id: "cop-demanda",
    pillarId: "demandas_quantitativas",
    section: "Organização do trabalho",
    text: "Com que frequência o volume de trabalho exige um ritmo difícil de sustentar?",
  },
  {
    id: "cop-influencia",
    pillarId: "influencia_desenvolvimento",
    section: "Autonomia",
    text: "Com que frequência você consegue influenciar decisões relacionadas ao seu trabalho?",
  },
  {
    id: "cop-sentido",
    pillarId: "sentido_trabalho",
    section: "Sentido",
    text: "Com que frequência você percebe sentido e utilidade no trabalho que realiza?",
  },
  {
    id: "cop-comprometimento",
    pillarId: "comprometimento",
    section: "Vínculo",
    text: "Com que frequência você se sente comprometido(a) com o seu local de trabalho?",
  },
  {
    id: "cop-previsibilidade",
    pillarId: "previsibilidade",
    section: "Organização do trabalho",
    text: "Com que frequência mudanças importantes são comunicadas com antecedência suficiente?",
  },
  {
    id: "cop-lideranca",
    pillarId: "transparencia_lideranca",
    section: "Liderança",
    text: "Com que frequência a liderança explica decisões e prioridades de forma transparente?",
  },
  {
    id: "cop-suporte",
    pillarId: "suporte_social",
    section: "Relações",
    text: "Com que frequência você recebe apoio de colegas ou liderança quando precisa?",
  },
  {
    id: "cop-feedback",
    pillarId: "feedback",
    section: "Desenvolvimento",
    text: "Com que frequência você recebe feedback útil sobre o seu trabalho?",
  },
  {
    id: "cop-interface",
    pillarId: "interface_trabalho_familia",
    section: "Trabalho e vida",
    text: "Com que frequência as exigências do trabalho prejudicam sua vida fora dele?",
  },
];

const FIBT_ITEMS: SurveyItem[] = FIBT_INSTRUMENT.items.map((item) => ({
  id: item.id,
  pillarId: item.domainId,
  section: FIBT_INSTRUMENT.domains.find((domain) => domain.id === item.domainId)?.name,
  text: item.text,
}));

const VIAT_ITEMS: SurveyItem[] = VIAT_DEMO_ITEMS.map((item) => ({
  id: item.itemId,
  pillarId: item.itemId.startsWith("icuft_") ? "icuft" : item.section,
  section: item.section,
  text: VIAT_ITEM_TEXT[item.itemId] ?? item.itemId,
}));

const DOMAIN_B_DISCLAIMER = (
  enterprisePack.domainB as {
    mandatoryDisclaimer: string;
  }
).mandatoryDisclaimer;

const IVO_DISCLAIMER = (ivoFramework as IndexFrameworkLike).mandatoryDisclaimer;
const IEV_DISCLAIMER = (ievFramework as IndexFrameworkLike).mandatoryDisclaimer;

const DEFINITIONS: Record<string, SurveyDefinition> = {
  "enterprise:COPSOQ": {
    id: "copsoq-demo",
    instrumentShort: "COPSOQ",
    items: COPSOQ_ITEMS,
    scale: FREQUENCY_SCALE,
    intro: {
      eyebrow: "Onda Ativa · Domínio B · Responder",
      lead:
        "Nove perguntas demonstrativas sobre organização do trabalho. O conteúdo individual não " +
        "é mostrado à gestão e somente agregados com n≥5 podem ser publicados.",
      disclaimer:
        `${DOMAIN_B_DISCLAIMER} Os itens desta demonstração representam as dimensões da versão ` +
        "curta; não substituem a aplicação profissional da NCOPSII validada.",
      thanksTitle: "Obrigado — sua participação foi registrada",
      thanksBody:
        "Sua resposta seguirá somente para o agregado protegido da onda. A interpretação para " +
        "fins de GRO/PGR permanece responsabilidade de profissional legalmente habilitado.",
    },
    completionRoute: "/devolutiva",
    completionLabel: "Ver a devolutiva educativa",
  },
  "enterprise:FIB-T": {
    id: "fibt-32",
    instrumentShort: "FIB-T",
    items: FIBT_ITEMS,
    scale: FIBT_SCALE,
    intro: {
      eyebrow: "Onda Ativa · Bem-Comum · Responder",
      lead:
        "Os 32 itens percorrem nove domínios do ecossistema de vida e trabalho. Responda de acordo " +
        "com sua realidade; não há resposta certa.",
      disclaimer: FIBT_INTRO.disclaimer,
      thanksTitle: "Obrigado — sua leitura do ecossistema foi registrada",
      thanksBody:
        "As respostas entram apenas no agregado da FIB-T. A devolutiva mostra tendências " +
        "coletivas, nunca julgamento individual.",
    },
    completionRoute: "/devolutiva",
    completionLabel: "Ver a devolutiva",
  },
  "enterprise:PERMA+V / IVO": {
    id: "ivo-demo",
    instrumentShort: "PERMA+V / IVO",
    items: PERMA_ITEMS,
    scale: AGREEMENT_SCALE,
    intro: {
      eyebrow: "Onda Ativa · Florescimento · Responder",
      lead:
        "Doze perguntas demonstrativas, poucos minutos. Não há resposta certa — só a sua " +
        "percepção honesta. Tudo entra no agregado (n≥5).",
      disclaimer: IVO_DISCLAIMER,
      thanksTitle: "Obrigado — sua voz foi registrada",
      thanksBody:
        "Sua resposta entra no agregado da onda. No fechamento, a devolutiva mostra o que a " +
        "comunidade aprendeu e qual é o próximo movimento.",
    },
    completionRoute: "/devolutiva",
    completionLabel: "Ver a devolutiva",
  },
  "enterprise:VIA-T": {
    id: "viat-demo",
    instrumentShort: "VIA-T",
    items: VIAT_ITEMS,
    scale: VIAT_SCALE,
    intro: {
      eyebrow: "Onda Ativa · Forças · Responder",
      lead:
        "Este recorte demonstrativo percorre forças percebidas e condições de uso das forças. A " +
        "bateria recomendada completa possui 48 itens mais ICUFT.",
      disclaimer: VIAT_INTRO.disclaimer,
      thanksTitle: "Obrigado — seu mapa demonstrativo foi registrado",
      thanksBody:
        "A devolutiva usa linguagem de autodesenvolvimento, sem diagnóstico, comparação ou uso em " +
        "decisões individuais de RH.",
    },
    completionRoute: "/viat",
    completionLabel: "Ver a devolutiva de forças",
  },
  "school:IEV": {
    id: "iev-demo",
    instrumentShort: "IEV",
    items: IEV_ITEMS,
    scale: AGREEMENT_SCALE,
    intro: {
      eyebrow: "Onda Ativa · Vitalidade Escolar · Responder",
      lead:
        "Perguntas sobre pertencimento, aprendizagem, convivência, educadores e escola. A voz de " +
        "cada pessoa entra apenas na leitura protegida da comunidade escolar.",
      disclaimer: IEV_DISCLAIMER,
      thanksTitle: "Obrigado — sua voz fortalece a comunidade escolar",
      thanksBody:
        "Sua resposta entra somente no agregado do IEV. A escola vê tendências e caminhos de ação, " +
        "nunca respostas individuais.",
    },
    completionRoute: "/devolutiva",
    completionLabel: "Ver a devolutiva escolar",
  },
};

export function getWaveSurvey(packId: string, instrumentShort: string): SurveyDefinition | null {
  return DEFINITIONS[`${packId}:${instrumentShort}`] ?? null;
}

export function getRegisteredWaveSurveyKeys(): string[] {
  return Object.keys(DEFINITIONS);
}
