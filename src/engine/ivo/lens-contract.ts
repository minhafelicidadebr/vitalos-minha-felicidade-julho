// Contrato normalizado de lente do IVO (ADR-004, spec lens-contract.md).
//
// Engine PURO: sem React, sem I/O, sem @/domain. O catálogo de lentes, os
// rótulos de dimensão e os mapeamentos aprovados são injetados pela camada de
// domínio/composição.
//
// O contrato transporta apenas o que cada lente JÁ publicou com proteção. Ele
// não normaliza escala, não pondera e não compõe índice: a semântica de cada
// instrumento (ex.: Fatores FIB-T 0–4, escore bruto 0–12) viaja intacta em
// `constructs`, e estados protegidos viajam como estado — nunca como número.

export const IVO_LENS_READING_CONTRACT = "ivo-lens-reading/1" as const;

export const IVO_DIMENSION_IDS = ["eu", "nos", "lideranca", "organizacao"] as const;
export type IvoDimensionId = (typeof IVO_DIMENSION_IDS)[number];

export const IVO_LENS_IDS = ["copsoq", "fibt", "perma_v", "via_t"] as const;
export type IvoLensId = (typeof IVO_LENS_IDS)[number];

export const IVO_QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
export type IvoQuarter = (typeof IVO_QUARTERS)[number];

/** `planned` = contrato tipado apenas; nenhum dado é produzido para a lente. */
export type LensAvailability = "functional" | "planned";

export type LensPublicationState =
  | "planned"
  | "prepared"
  | "collecting"
  | "protected"
  | "published"
  | "concluded";

export interface IvoDimension {
  id: IvoDimensionId;
  label: string;
}

export interface IvoLensDescriptor {
  id: IvoLensId;
  quarter: IvoQuarter;
  label: string;
  instrument: string;
  /** null quando a lente ainda não tem manifesto versionado. */
  instrumentVersion: string | null;
  availability: LensAvailability;
  route: string | null;
}

/** Construto PUBLICADO do próprio instrumento, na escala do próprio instrumento. */
export interface LensConstruct {
  id: string;
  label: string;
  value: number;
  scaleMin: number;
  scaleMax: number;
}

export interface CohortLensReading {
  cohortKey: string;
  cohortLabel: string;
  publication: LensPublicationState;
  /** Sempre o rótulo já protegido: número só quando publicado, `<k`/`protegida` caso contrário. */
  countLabel: string;
  /** Somente quando `publication === "published"`. */
  constructs: readonly LensConstruct[] | null;
  /** Motivo legível quando a leitura está retida. */
  protectionReason: string | null;
}

export interface NormalizedLensReading {
  contractVersion: typeof IVO_LENS_READING_CONTRACT;
  organizationId: string;
  cycleKey: string;
  quarter: IvoQuarter;
  lens: IvoLensId;
  instrumentVersion: string;
  calculationVersion: string;
  cohortScope: "cohort";
  privacyStatus: "protected" | "published";
  kMin: number;
  publicationStatus: LensPublicationState;
  cohorts: readonly CohortLensReading[];
  evidenceReferences: readonly string[];
  generatedAt: string;
  /** Proibido por contrato: não existe índice composto aprovado. */
  compositeScore?: never;
}

export class LensContractViolation extends Error {
  constructor(message: string) {
    super(`[ivo-lens-contract] ${message}`);
    this.name = "LensContractViolation";
  }
}

const NUMERIC_LABEL = /^\d+$/;
const FORBIDDEN_COMPOSITE_KEYS = ["compositeScore", "ivoScore", "index", "score"];

/**
 * Valida uma leitura antes de ela entrar na matriz. Fail-closed: qualquer
 * coorte não publicada com valor, contagem exata abaixo do limiar ou campo de
 * índice composto invalida a leitura inteira.
 */
export function assertNormalizedLensReading(reading: NormalizedLensReading): NormalizedLensReading {
  if (reading.contractVersion !== IVO_LENS_READING_CONTRACT) {
    throw new LensContractViolation(`versão de contrato desconhecida: ${String(reading.contractVersion)}`);
  }
  if (!(IVO_LENS_IDS as readonly string[]).includes(reading.lens)) {
    throw new LensContractViolation(`lente desconhecida: ${String(reading.lens)}`);
  }
  if (!reading.organizationId) throw new LensContractViolation("organização ausente");
  if (!Number.isInteger(reading.kMin) || reading.kMin < 5) {
    throw new LensContractViolation("kMin deve ser inteiro >= 5");
  }
  const record = reading as unknown as Record<string, unknown>;
  for (const key of FORBIDDEN_COMPOSITE_KEYS) {
    if (key in record) throw new LensContractViolation(`campo de índice composto proibido: ${key}`);
  }

  for (const cohort of reading.cohorts) {
    const isPublished = cohort.publication === "published";
    if (!isPublished && cohort.constructs !== null) {
      throw new LensContractViolation(`coorte ${cohort.cohortKey} não publicada carrega valores`);
    }
    if (isPublished && (!cohort.constructs || cohort.constructs.length === 0)) {
      throw new LensContractViolation(`coorte ${cohort.cohortKey} publicada sem construtos`);
    }
    if (NUMERIC_LABEL.test(cohort.countLabel)) {
      const count = Number(cohort.countLabel);
      if (!isPublished && count > 0) {
        throw new LensContractViolation(`coorte ${cohort.cohortKey} não publicada expõe contagem exata`);
      }
      if (count > 0 && count < reading.kMin) {
        throw new LensContractViolation(`coorte ${cohort.cohortKey} expõe contagem abaixo de kMin`);
      }
    }
    for (const construct of cohort.constructs ?? []) {
      if (construct.value < construct.scaleMin || construct.value > construct.scaleMax) {
        throw new LensContractViolation(`construto ${construct.id} fora da escala declarada`);
      }
    }
  }

  const anyProtected = reading.cohorts.some((c) => c.publication !== "published");
  if (reading.privacyStatus === "published" && anyProtected) {
    throw new LensContractViolation("privacyStatus published com coorte protegida");
  }
  return reading;
}
