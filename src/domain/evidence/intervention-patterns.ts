// Loader do Intervention Pattern Registry (LD-009, Fatia B) — primeiro
// consumidor de src/domain/evidence/intervention-patterns.json.
//
// ARQUITETURA (Engine ≠ Domínio, testada em engine-domain-boundary.test.ts):
// o motor do Estúdio de Co-design (src/engine/learning/codesign-studio-engine.ts)
// é agnóstico de domínio — recebe os campos obrigatórios e a watchlist como
// DADOS. Este módulo vive em src/domain/ (não em engine/) justamente porque
// importa o JSON de domínio; mesma disciplina de registries.ts. Ele só CARREGA
// e tipa — não decide nada, não valida trust, não gera nada.

import interventionPatternsJson from "./intervention-patterns.json";

/** Um padrão de intervenção (bloco validado que o Estúdio compõe). `scope` e
 * `supervision` são TEXTO descritivo do padrão — não confundir com o enum
 * InterventionScope do motor, que é o escopo DECLARADO pelo autor no rascunho. */
export interface InterventionPattern {
  pattern_id: string;
  name: string;
  scope: string;
  supervision: string;
  /** Só alguns padrões têm regra explícita (ex.: projeto_lideranca). */
  rule?: string;
}

export interface Plan90dPhase {
  days: string;
  focus: string;
}

export interface InterventionPatternRegistry {
  registry: string;
  version: string;
  description: string;
  required_fields: string[];
  plan_90d_default: {
    phases: Plan90dPhase[];
    adverse_effects_watchlist: string[];
  };
  patterns: InterventionPattern[];
}

export const INTERVENTION_PATTERNS =
  interventionPatternsJson as unknown as InterventionPatternRegistry;

// ─── Acessores (o que o motor/UI precisam, sem reimportar o JSON) ────────────

export function getInterventionPatterns(): readonly InterventionPattern[] {
  return INTERVENTION_PATTERNS.patterns;
}

export function getInterventionPatternById(id: string): InterventionPattern | null {
  return INTERVENTION_PATTERNS.patterns.find((p) => p.pattern_id === id) ?? null;
}

/** As 6 chaves de campos obrigatórios — alimentam validateDraft do motor. */
export function getRequiredFieldKeys(): readonly string[] {
  return INTERVENTION_PATTERNS.required_fields;
}

/** A watchlist de efeitos adversos — o autor precisa reconhecer ao menos um. */
export function getAdverseEffectsWatchlist(): readonly string[] {
  return INTERVENTION_PATTERNS.plan_90d_default.adverse_effects_watchlist;
}

/** As fases do plano 90d default — referência de cronograma para a UI. */
export function getPlan90dPhases(): readonly Plan90dPhase[] {
  return INTERVENTION_PATTERNS.plan_90d_default.phases;
}
