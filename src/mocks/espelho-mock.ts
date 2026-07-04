// Espelho Vivo — config de domínio + dados demonstrativos DETERMINÍSTICOS.
// Aqui vive o que o motor NÃO pode saber (Engine ≠ Domínio): quais itens
// compõem cada fator PERMA+V, os nomes das faixas, os rótulos de pilar, os
// disclaimers verbatim e a copy do Contrato de Reciprocidade e dos Dois
// Trilhos. O motor (personal-assessment-engine) só faz a conta.

import type {
  PersonalAssessmentRecord,
  PersonalBandDef,
  PersonalFactorDef,
  PersonalScaleDef,
} from "@/engine/espelho/personal-assessment-engine";
import type { LearningSignal } from "@/engine/academia/academia-engine";

// ─── A bateria PERMA+V pessoal (mesmos 15 itens do survey-mock, fatorados) ──
// Fonte do agrupamento: docs/instrumentos/PERMA_TRABALHO.md (Seligman 2011,
// validação BR 2026). pillarIds = pilares IVO que cada fator informa — é o que
// liga a necessidade pessoal à Bússola (trilhas + missões).

export const ESPELHO_FACTORS: PersonalFactorDef[] = [
  {
    id: "p",
    name: "Emoções Positivas",
    itemIds: ["perma-p1", "perma-p2", "perma-p3"],
    pillarIds: ["energia_vitalidade"],
  },
  {
    id: "e",
    name: "Engajamento",
    itemIds: ["perma-e1", "perma-e2", "perma-e3"],
    pillarIds: ["crescimento_maestria", "equilibrio_autonomia"],
  },
  {
    id: "r",
    name: "Relacionamentos",
    itemIds: ["perma-r1", "perma-r2", "perma-r3"],
    pillarIds: ["cooperacao_confianca", "reconhecimento_pares", "comunicacao_pertencimento"],
  },
  {
    id: "m",
    name: "Significado",
    itemIds: ["perma-m1", "perma-m2", "perma-m3"],
    pillarIds: ["proposito_significado", "cultura_bem_estar"],
  },
  {
    id: "a",
    name: "Realização",
    itemIds: ["perma-a1", "perma-a2", "perma-a3"],
    pillarIds: ["crescimento_maestria", "desenvolvimento_pessoas"],
  },
];

// Faixas (§5.7 — vocabulário, nunca nota crua como veredito). Escala 1–5.
export const ESPELHO_BANDS: PersonalBandDef[] = [
  { id: "atencao", label: "Pede cuidado", min: 1 },
  { id: "construindo", label: "Construindo", min: 2.6 },
  { id: "cultivando", label: "Cultivando", min: 3.4 },
  { id: "florescendo", label: "Florescendo", min: 4.2 },
];

export const ESPELHO_SCALE: PersonalScaleDef = { min: 1, max: 5 };

export const ESPELHO_SCALE_OPTIONS = [
  { value: 1, label: "Quase nunca" },
  { value: 2, label: "Raramente" },
  { value: 3, label: "Às vezes" },
  { value: 4, label: "Frequentemente" },
  { value: 5, label: "Quase sempre" },
];

/** Cadência mínima entre re-testes (guarda anti re-testagem obsessiva). */
export const ESPELHO_MIN_RETAKE_DAYS = 28;

export const ESPELHO_TODAY = "2026-07-04";

// Rótulos de pilar exibidos na Bússola (vocabulário do domínio enterprise).
export const ESPELHO_PILLAR_LABELS: Record<string, string> = {
  energia_vitalidade: "Energia & Vitalidade",
  crescimento_maestria: "Crescimento & Maestria",
  equilibrio_autonomia: "Equilíbrio & Autonomia",
  cooperacao_confianca: "Cooperação & Confiança",
  reconhecimento_pares: "Reconhecimento entre Pares",
  comunicacao_pertencimento: "Comunicação & Pertencimento",
  proposito_significado: "Propósito & Significado",
  cultura_bem_estar: "Cultura de Bem-Estar",
  desenvolvimento_pessoas: "Desenvolvimento de Pessoas",
};

// Prioridade coletiva demonstrativa (no S6.75, vem da série real do Cofre de
// Ciclos). A Bússola compõe pessoal + coletivo — pessoal primeiro.
export const ESPELHO_COLLECTIVE_PRIORITY: LearningSignal[] = [
  { id: "equilibrio_autonomia", label: "Equilíbrio & Autonomia" },
  { id: "reconhecimento_pares", label: "Reconhecimento entre Pares" },
];

// Leitura anterior demonstrativa — dá vida à linha do tempo já na 1ª visita
// (rotulada como exemplo; a re-testagem real respeita a cadência).
export const ESPELHO_HISTORY_SEED: PersonalAssessmentRecord[] = [
  {
    assessmentId: "espelho-demo-t1",
    instrument: "perma_personal",
    instrumentVersion: "br-2026-15itens",
    engineVersion: "1.0.0",
    takenAt: "2026-04-06",
    result: {
      factors: [
        { id: "p", name: "Emoções Positivas", score: 3.3, bandId: "construindo", bandLabel: "Construindo", answered: 3, total: 3, pillarIds: ["energia_vitalidade"] },
        { id: "e", name: "Engajamento", score: 3.7, bandId: "cultivando", bandLabel: "Cultivando", answered: 3, total: 3, pillarIds: ["crescimento_maestria", "equilibrio_autonomia"] },
        { id: "r", name: "Relacionamentos", score: 4.0, bandId: "cultivando", bandLabel: "Cultivando", answered: 3, total: 3, pillarIds: ["cooperacao_confianca", "reconhecimento_pares", "comunicacao_pertencimento"] },
        { id: "m", name: "Significado", score: 3.0, bandId: "construindo", bandLabel: "Construindo", answered: 3, total: 3, pillarIds: ["proposito_significado", "cultura_bem_estar"] },
        { id: "a", name: "Realização", score: 3.7, bandId: "cultivando", bandLabel: "Cultivando", answered: 3, total: 3, pillarIds: ["crescimento_maestria", "desenvolvimento_pessoas"] },
      ],
      global: 3.5,
      globalBandId: "cultivando",
      globalBandLabel: "Cultivando",
      completeness: 100,
      takenAt: "2026-04-06",
    },
  },
];

// ─── Copy — o Contrato de Reciprocidade e os Dois Trilhos ────────────────────

export const ESPELHO_COPY = {
  eyebrow: "Espelho Vivo · Trilho Pessoal",
  title: "O seu retrato de florescimento — seu, privado, apagável",
  lead:
    "Uma autoavaliação de 3 minutos devolve o que nenhuma pesquisa coletiva pode: o SEU perfil, " +
    "em faixas honestas, com recomendações feitas para você.",
  contract:
    "Todo dado que você dá devolve algo a você: um recibo honesto, um espelho seu se você quiser, " +
    "uma recomendação sua, e uma retribuição da instituição ao coletivo. Medir aqui nunca é extração — é troca.",
  twoTracks:
    "Este espelho nasce de um caminho separado e opcional. Suas respostas às pesquisas da organização " +
    "são anônimas por arquitetura — o banco não tem onde guardar um perfil seu — e NUNCA alimentam esta tela.",
  yourData:
    "Seu dado é seu: exporte quando quiser, apague quando quiser. Nenhum gestor vê este espelho.",
  demoNote:
    "Demonstração: este espelho fica salvo apenas neste aparelho (localStorage) e a leitura anterior é um exemplo.",
  // Disclaimers verbatim (fonte: ivo-framework.json, survey-mock, devolutiva-engine)
  disclaimers: [
    "PERMA+V exploratório — não substitui avaliação psicométrica formal.",
    "VIA-T v1 exploratório — não é diagnóstico, não é ranking de pessoas e não se usa para seleção, promoção, remuneração ou desligamento.",
    "O IVO é um índice experimental: não é instrumento clínico, não mede felicidade individual e não diagnostica transtornos.",
  ],
} as const;
