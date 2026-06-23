// Registro mock-first dos questionários de onda. O runtime é universal
// (survey-engine); instrumento, escala, itens e disclaimers são domínio injetado.
// As respostas ficam somente na sessão e nunca são transformadas em score individual.

import type { SurveyDefinition, SurveyItem, SurveyScale } from "@/engine/survey/survey-engine";
import enterprisePack from "@/domain/packs/enterprise/enterprise.pack.json";
import ivoFramework from "@/domain/packs/enterprise/ivo-framework.json";
import ievFramework from "@/domain/packs/school/iev-framework.json";
import { FIBT_INSTRUMENT, FIBT_INTRO } from "@/mocks/fibt-mock";
import { VIAT_INSTRUMENT, VIAT_INTRO, VIAT_ITEM_TEXT } from "@/mocks/viat-mock";

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

// PERMA+V — 15 itens validados (P/E/R/M/A). Fonte: Seligman (2011) + validação brasileira 2026.
// A bateria nativa do PERMA-Profiler é 0–10; aqui o IVO administra na escala unificada 1–5 do
// framework (responseScale do ivo-framework.json) — adaptação declarada. pillarId mapeia ao pilar
// IVO primário (ver PERMA_TRABALHO.md), cobrindo as 4 lentes EU/NÓS/LIDERANÇA/ORGANIZAÇÃO.
export const PERMA_ITEMS: SurveyItem[] = [
  // P — Emoções Positivas
  {
    id: "perma-p1",
    pillarId: "energia_vitalidade",
    section: "Emoções Positivas",
    text: "No trabalho, com que frequência você se sente bem?",
  },
  {
    id: "perma-p2",
    pillarId: "energia_vitalidade",
    section: "Emoções Positivas",
    text: "No trabalho, com que frequência você se sente positivo/a?",
  },
  {
    id: "perma-p3",
    pillarId: "energia_vitalidade",
    section: "Emoções Positivas",
    text: "No trabalho, em que medida você se sente satisfeito/a?",
  },
  // E — Engajamento
  {
    id: "perma-e1",
    pillarId: "crescimento_maestria",
    section: "Engajamento",
    text: "No trabalho, com que frequência você se envolve no que está fazendo?",
  },
  {
    id: "perma-e2",
    pillarId: "crescimento_maestria",
    section: "Engajamento",
    text: "Até que ponto você se sente animado e interessado no seu trabalho?",
  },
  {
    id: "perma-e3",
    pillarId: "equilibrio_autonomia",
    section: "Engajamento",
    text: "No trabalho, com que frequência o tempo passa rápido quando você faz algo de que gosta?",
  },
  // R — Relacionamentos
  {
    id: "perma-r1",
    pillarId: "cooperacao_confianca",
    section: "Relacionamentos",
    text: "Até que ponto você recebe ajuda e apoio dos colegas de trabalho quando precisa?",
  },
  {
    id: "perma-r2",
    pillarId: "reconhecimento_pares",
    section: "Relacionamentos",
    text: "Até que ponto você se sente apreciado pelos seus colegas de trabalho?",
  },
  {
    id: "perma-r3",
    pillarId: "comunicacao_pertencimento",
    section: "Relacionamentos",
    text: "Quão satisfeito você está com suas relações profissionais?",
  },
  // M — Significado
  {
    id: "perma-m1",
    pillarId: "proposito_significado",
    section: "Significado",
    text: "Até que ponto o seu trabalho tem propósito e significado?",
  },
  {
    id: "perma-m2",
    pillarId: "proposito_significado",
    section: "Significado",
    text: "Em geral, até que ponto você acha que o que faz no trabalho vale a pena?",
  },
  {
    id: "perma-m3",
    pillarId: "cultura_bem_estar",
    section: "Significado",
    text: "De maneira geral, até que ponto você sente que tem um senso de direção no trabalho?",
  },
  // A — Realização
  {
    id: "perma-a1",
    pillarId: "crescimento_maestria",
    section: "Realização",
    text: "Com que frequência você sente que está progredindo rumo aos seus objetivos no trabalho?",
  },
  {
    id: "perma-a2",
    pillarId: "crescimento_maestria",
    section: "Realização",
    text: "Com que frequência você alcança as metas de trabalho importantes que definiu para si?",
  },
  {
    id: "perma-a3",
    pillarId: "desenvolvimento_pessoas",
    section: "Realização",
    text: "No trabalho, com que frequência você se sente capaz?",
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

// VIA-T integral: 24 forças × 2 itens (48), derivado da definição canônica VIAT_INSTRUMENT.
// O ICUFT (10 itens de contexto organizacional) acompanha a bateria como módulo separado.
const VIAT_VIRTUE_NAME: Record<string, string> = Object.fromEntries(
  VIAT_INSTRUMENT.virtues.map((virtue) => [virtue.id, virtue.name]),
);
const VIAT_ITEMS: SurveyItem[] = VIAT_INSTRUMENT.strengths.flatMap((strength) =>
  strength.itemIds.map((itemId) => ({
    id: itemId,
    pillarId: strength.id,
    section: VIAT_VIRTUE_NAME[strength.virtueId] ?? strength.virtueId,
    text: VIAT_ITEM_TEXT[itemId] ?? itemId,
  })),
);

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
        "Quinze perguntas do PERMA+V (validação BR 2026), poucos minutos. Não há resposta certa — " +
        "só a sua percepção honesta. Tudo entra no agregado (n≥5).",
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
        "A bateria completa percorre as 24 forças de caráter no trabalho (48 itens). Responda pela " +
        "sua percepção — nada vira diagnóstico, ranking ou comparação individual.",
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
