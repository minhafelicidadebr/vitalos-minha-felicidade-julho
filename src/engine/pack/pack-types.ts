/**
 * Pack types — contrato setor-agnóstico.
 * NUNCA importar nada de domain/ aqui.
 *
 * Um "Pack" é a configuração de domínio que descreve um setor/cliente:
 * vocabulário, módulos habilitados, frameworks, economia de gamificação, etc.
 * A engine apenas consome este contrato.
 */

export type PackId = string;

export interface PackMeta {
  id: PackId;
  name: string;
  version: string;
  sector?: string;
  locale?: string;
  description?: string;
}

export interface PackVocabulary {
  // Termos de domínio injetados na UI (ex.: "colaborador" vs "atleta" vs "operador")
  [token: string]: string;
}

export interface PackModuleFlags {
  rbac?: boolean;
  index?: boolean;
  gamification?: boolean;
  nudges?: boolean;
  lab?: boolean;
  signals?: boolean;
  trust?: boolean;
  pnl?: boolean;
  ai?: boolean;
  esg?: boolean;
  [key: string]: boolean | undefined;
}

export interface DomainPack {
  meta: PackMeta;
  vocabulary?: PackVocabulary;
  modules?: PackModuleFlags;
  // Sub-configurações tipadas como unknown — validadas por schema no boot
  ivoFramework?: unknown;
  gamificationEconomy?: unknown;
  [extension: string]: unknown;
}

export interface PackLoadError {
  code: "not_found" | "invalid_schema" | "parse_error" | "unknown";
  message: string;
  details?: unknown;
}

export type PackStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; pack: DomainPack }
  | { state: "error"; error: PackLoadError };
