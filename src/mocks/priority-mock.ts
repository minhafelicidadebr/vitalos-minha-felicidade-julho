// Priority — config de domínio (não é engine). Liga cada pilar do IVO ao seu
// agente humano (Embaixadoria), à sua lente, e compõe a prontidão ESG que a
// intervenção destrava. É a camada narrativa do Diagnóstico Integrado: traduz
// "qual alavanca puxar" em "quem assume, em que lente, e o que isso prova".

import { AMBASSADORSHIPS } from "./embaixadorias-mock";
import { ESG_MAPPING } from "./esg-mock";

// Pilar → Embaixadoria responsável (agente humano do protocolo).
// IDs de embaixadoria de embaixadorias-mock; cultura_bem_estar não tem
// embaixadoria dedicada (cai em fallback na UI).
const PILLAR_TO_AMB_ID: Record<string, string> = {
  energia_vitalidade: "amb-energia",
  proposito_significado: "amb-proposito",
  crescimento_maestria: "amb-aprendizagem",
  equilibrio_autonomia: "amb-equilibrio",
  seguranca_psicologica: "amb-seguranca",
  cooperacao_confianca: "amb-cooperacao",
  reconhecimento_pares: "amb-reconhecimento",
  comunicacao_pertencimento: "amb-pertencimento",
  clareza_direcao: "amb-clareza",
  justica_coerencia: "amb-justica",
  desenvolvimento_pessoas: "amb-desenvolvimento",
  cuidado_ativo: "amb-cuidado",
  condicoes_carga: "amb-condicoes",
  inclusao_equidade: "amb-inclusao",
  sustentabilidade_bem_comum: "amb-sustentabilidade",
};

export interface AmbassadorshipRef {
  id: string;
  name: string;
  emoji: string;
}

export function ambassadorshipForPillar(pillarId: string): AmbassadorshipRef | null {
  const ambId = PILLAR_TO_AMB_ID[pillarId];
  if (!ambId) return null;
  const amb = AMBASSADORSHIPS.find((a) => a.id === ambId);
  return amb ? { id: amb.id, name: amb.name, emoji: amb.emoji } : null;
}

// Pilar → Lente do IVO (cores espelham ivo-framework.json).
export interface LensRef {
  id: string;
  label: string;
  color: string;
}

const LENS_EU: LensRef = { id: "eu", label: "EU", color: "#2563EB" };
const LENS_NOS: LensRef = { id: "nos", label: "NÓS", color: "#16A34A" };
const LENS_LID: LensRef = { id: "lideranca", label: "LIDERANÇA", color: "#CA8A04" };
const LENS_ORG: LensRef = { id: "organizacao", label: "ORGANIZAÇÃO", color: "#7C3AED" };

const PILLAR_LENS: Record<string, LensRef> = {
  energia_vitalidade: LENS_EU,
  proposito_significado: LENS_EU,
  crescimento_maestria: LENS_EU,
  equilibrio_autonomia: LENS_EU,
  seguranca_psicologica: LENS_NOS,
  cooperacao_confianca: LENS_NOS,
  reconhecimento_pares: LENS_NOS,
  comunicacao_pertencimento: LENS_NOS,
  clareza_direcao: LENS_LID,
  justica_coerencia: LENS_LID,
  desenvolvimento_pessoas: LENS_LID,
  cuidado_ativo: LENS_LID,
  condicoes_carga: LENS_ORG,
  cultura_bem_estar: LENS_ORG,
  inclusao_equidade: LENS_ORG,
  sustentabilidade_bem_comum: LENS_ORG,
};

export function lensForPillar(pillarId: string): LensRef | null {
  return PILLAR_LENS[pillarId] ?? null;
}

// Composição ESG: quais indicadores de mercado uma intervenção destrava,
// dado o conjunto de pilares que ela movimenta.
export interface EsgUnlock {
  count: number;
  codes: string[]; // ex.: ["ESRS S1-14", "ODS 3", "GRI 403"]
}

export function esgUnlockedBy(pillarIds: string[]): EsgUnlock {
  const set = new Set(pillarIds);
  const codes: string[] = [];
  for (const fw of ESG_MAPPING.frameworks) {
    for (const dp of fw.datapoints) {
      if (dp.pillars.some((pid) => set.has(pid))) codes.push(dp.code);
    }
  }
  return { count: codes.length, codes };
}

export const PRIORITY_INTRO = {
  eyebrow: "Diagnóstico Integrado · Fila de Prioridades",
  title: "Por onde começar a agir",
  lead:
    "O diagnóstico vira plano. Cada intervenção do Playbook é ranqueada pela alavancagem " +
    "esperada no IVO, ligada à Embaixadoria que a executa e aos indicadores ESG que destrava. " +
    "Não é opinião — é o retorno por esforço, derivado do estado atual.",
  disclaimer:
    "Priorização orientativa derivada do IVO corrente e de premissas de efeito calibráveis " +
    "(retornos decrescentes, k-anonimato). Indica onde o retorno por esforço tende a ser maior — " +
    "não garante resultado. A decisão e a execução permanecem humanas.",
};

export const EFFORT_COPY: Record<string, { label: string; color: string }> = {
  baixo: { label: "Esforço baixo", color: "#16A34A" },
  medio: { label: "Esforço médio", color: "#CA8A04" },
  alto: { label: "Esforço alto", color: "#DC2626" },
};

export const EVIDENCE_COPY: Record<string, string> = {
  "meta-analise": "Meta-análise",
  rct: "Ensaio controlado",
  "quasi-experimental": "Quase-experimental",
  observacional: "Observacional",
};
