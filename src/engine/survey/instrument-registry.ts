// Instrument Registry — puro. A fonte única de verdade dos instrumentos de mensuração.
// Cada instrumento declara versão, status de validação, fonte citável, domínio (A/B),
// e contagem servida vs. integral. Garante, por reconciliação, que "documentado === ativo"
// (os itens do registro batem com os itens realmente aplicados no runtime) e impede que um
// subconjunto demonstrativo seja comunicado como instrumento validado.
//
// Assertividade por construção: nenhuma contagem ou alegação de validade existe sem uma
// fonte rastreável (Invariante "sem fonte, sem afirmação crítica"). Nunca importa de domain/.

/** Como o instrumento pode ser comunicado — governa a linguagem permitida na UI/IA. */
export type InstrumentValidationStatus =
  | "validado" // versão fiel de instrumento validado (ex.: FIB-T, Furtado 2020)
  | "validado_adaptado" // validado, com adaptação declarada (ex.: PERMA+V, validação BR 2026)
  | "exploratorio" // autoral/exploratório — nunca diagnóstico (ex.: VIA-T v1)
  | "demonstrativo"; // subconjunto educativo — NÃO é a versão validada (ex.: COPSOQ curto)

/** Domínio A = florescimento/forças; Domínio B = risco psicossocial. Nunca se misturam. */
export type InstrumentDomain = "A" | "B";

export interface InstrumentSource {
  citation: string; // referência citável (autor, ano, instrumento)
  url?: string;
}

export interface InstrumentRegistryEntry {
  id: string; // chave estável do registro (ex.: "perma_v")
  instrumentShort: string; // casa com SurveyDefinition.instrumentShort
  label: string;
  version: string; // versão semântica do CONTEÚDO do instrumento (itens/escala/cálculo)
  validationStatus: InstrumentValidationStatus;
  domain: InstrumentDomain;
  sources: InstrumentSource[]; // ≥ 1 — sem fonte, sem instrumento
  servedItemCount: number; // itens efetivamente aplicados no runtime hoje
  integralItemCount: number; // itens da forma integral/canônica do instrumento
  scoreRange: { min: number; max: number };
  /** true quando o runtime já serve a forma integral (served === integral). */
  isIntegralServed: boolean;
  /** Específico do COPSOQ: jamais alegar NCOPSII validada sobre um subconjunto curto. */
  isValidatedNCOPSII?: boolean;
  notes: string;
}

export interface InstrumentReconciliation {
  instrumentShort: string;
  /** O que o registro declara como verdade corrente (integral, ou subconjunto servido). */
  documented: number;
  /** Itens reais encontrados na SurveyDefinition ativa. */
  active: number;
  ok: boolean; // documented === active
  isIntegralServed: boolean;
  gapToIntegral: number; // integralItemCount - active (0 quando integral)
}

export interface RegistryViolation {
  instrumentShort: string;
  rule: string;
  detail: string;
}

/** Localiza um instrumento pelo short usado nas SurveyDefinitions. */
export function getInstrumentEntry(
  registry: InstrumentRegistryEntry[],
  instrumentShort: string,
): InstrumentRegistryEntry | null {
  return registry.find((entry) => entry.instrumentShort === instrumentShort) ?? null;
}

/**
 * Reconcilia o registro contra a contagem de itens REALMENTE servida pelo runtime.
 * `documented` é a forma integral quando o instrumento já é servido integralmente;
 * caso contrário, é a contagem do subconjunto declarado (servedItemCount).
 */
export function reconcileInstrument(
  entry: InstrumentRegistryEntry,
  activeItemCount: number,
): InstrumentReconciliation {
  const documented = entry.isIntegralServed ? entry.integralItemCount : entry.servedItemCount;
  return {
    instrumentShort: entry.instrumentShort,
    documented,
    active: activeItemCount,
    ok: documented === activeItemCount,
    isIntegralServed: entry.isIntegralServed,
    gapToIntegral: Math.max(0, entry.integralItemCount - activeItemCount),
  };
}

/**
 * Se a linguagem de "instrumento validado" é permitida para este instrumento.
 * Exploratório e demonstrativo NUNCA podem ser comunicados como validados.
 */
export function assertValidatedClaim(entry: InstrumentRegistryEntry): boolean {
  return entry.validationStatus === "validado" || entry.validationStatus === "validado_adaptado";
}

/**
 * Verifica a integridade interna do registro — independentemente do runtime.
 * Retorna a lista de violações (vazia = íntegro). Estas regras são a espinha da
 * "assertividade suprema": toda entrada precisa de fonte, contagens coerentes e
 * rótulos honestos.
 */
export function checkRegistryIntegrity(registry: InstrumentRegistryEntry[]): RegistryViolation[] {
  const violations: RegistryViolation[] = [];
  const seen = new Set<string>();

  for (const entry of registry) {
    const short = entry.instrumentShort;

    if (seen.has(short)) {
      violations.push({
        instrumentShort: short,
        rule: "unique",
        detail: "instrumentShort duplicado",
      });
    }
    seen.add(short);

    if (entry.sources.length === 0) {
      violations.push({
        instrumentShort: short,
        rule: "source",
        detail: "instrumento sem fonte citável",
      });
    }
    if (entry.servedItemCount < 1) {
      violations.push({ instrumentShort: short, rule: "served", detail: "servedItemCount < 1" });
    }
    if (entry.integralItemCount < entry.servedItemCount) {
      violations.push({
        instrumentShort: short,
        rule: "integral",
        detail: "integralItemCount < servedItemCount",
      });
    }
    if (entry.isIntegralServed !== (entry.servedItemCount === entry.integralItemCount)) {
      violations.push({
        instrumentShort: short,
        rule: "integral_flag",
        detail: "isIntegralServed não corresponde a served === integral",
      });
    }
    // Um instrumento demonstrativo jamais pode alegar validação NCOPSII.
    if (entry.validationStatus === "demonstrativo" && entry.isValidatedNCOPSII === true) {
      violations.push({
        instrumentShort: short,
        rule: "validated_claim",
        detail: "demonstrativo não pode declarar isValidatedNCOPSII: true",
      });
    }
    if (entry.scoreRange.max <= entry.scoreRange.min) {
      violations.push({ instrumentShort: short, rule: "scale", detail: "scoreRange inválido" });
    }
  }

  return violations;
}
