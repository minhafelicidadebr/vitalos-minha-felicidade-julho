import type { IVOInput } from "../engine/index/ivo-engine";

export const DEMO_ORG = {
  name: "TechCorp Ltda",
  totalCollaborators: 480,
  participationRate: 78,
} as const;

// Current cycle T1/2026
// Expected IVO ≈ 619 — "Organização Saudável"
// inclusao_equidade: n=3 → k-anonymity (hidden, uses mean=3.0 neutro no cálculo)
// Críticos: equilibrio_autonomia (≈475pts), condicoes_carga (≈450pts)
// Fortes: proposito_significado, crescimento_maestria, sustentabilidade_bem_comum (≈775pts)
export const ivoCurrentCycle: IVOInput = {
  organizationId: "techcorp-ltda",
  cycleId: "T1-2026",
  aggregates: [
    // EU — Indivíduo
    { pillarId: "energia_vitalidade", mean: 3.5, n: 52 },
    { pillarId: "proposito_significado", mean: 4.1, n: 48 },
    { pillarId: "crescimento_maestria", mean: 4.1, n: 55 },
    { pillarId: "equilibrio_autonomia", mean: 2.9, n: 49 },
    // NÓS — Equipes & Relações
    { pillarId: "seguranca_psicologica", mean: 3.9, n: 61 },
    { pillarId: "cooperacao_confianca", mean: 3.6, n: 58 },
    { pillarId: "reconhecimento_pares", mean: 3.2, n: 45 },
    { pillarId: "comunicacao_pertencimento", mean: 3.6, n: 53 },
    // LIDERANÇA — Gestão
    { pillarId: "clareza_direcao", mean: 3.6, n: 47 },
    { pillarId: "justica_coerencia", mean: 3.2, n: 51 },
    { pillarId: "desenvolvimento_pessoas", mean: 3.3, n: 44 },
    { pillarId: "cuidado_ativo", mean: 3.1, n: 38 },
    // ORGANIZAÇÃO — Cultura & Sistema
    { pillarId: "condicoes_carga", mean: 2.8, n: 62 },
    { pillarId: "cultura_bem_estar", mean: 3.6, n: 56 },
    { pillarId: "inclusao_equidade", mean: 3.7, n: 3 }, // k-anonymity: oculto na UI
    { pillarId: "sustentabilidade_bem_comum", mean: 4.1, n: 42 },
  ],
};

// Previous cycle T4/2025
// Expected IVO ≈ 568 — delta vs atual: ≈ +51 pts
export const ivoPreviousCycle: IVOInput = {
  organizationId: "techcorp-ltda",
  cycleId: "T4-2025",
  aggregates: [
    { pillarId: "energia_vitalidade", mean: 3.3, n: 48 },
    { pillarId: "proposito_significado", mean: 3.8, n: 45 },
    { pillarId: "crescimento_maestria", mean: 3.9, n: 51 },
    { pillarId: "equilibrio_autonomia", mean: 2.7, n: 44 },
    { pillarId: "seguranca_psicologica", mean: 3.7, n: 57 },
    { pillarId: "cooperacao_confianca", mean: 3.4, n: 54 },
    { pillarId: "reconhecimento_pares", mean: 2.9, n: 41 },
    { pillarId: "comunicacao_pertencimento", mean: 3.3, n: 49 },
    { pillarId: "clareza_direcao", mean: 3.4, n: 43 },
    { pillarId: "justica_coerencia", mean: 3.0, n: 47 },
    { pillarId: "desenvolvimento_pessoas", mean: 3.1, n: 40 },
    { pillarId: "cuidado_ativo", mean: 2.8, n: 34 },
    { pillarId: "condicoes_carga", mean: 2.6, n: 58 },
    { pillarId: "cultura_bem_estar", mean: 3.2, n: 52 },
    { pillarId: "inclusao_equidade", mean: 3.5, n: 38 },
    { pillarId: "sustentabilidade_bem_comum", mean: 3.9, n: 39 },
  ],
};
