/**
 * Pack types — contrato setor-agnóstico (alinhado ao domain-pack.schema.json).
 * NUNCA importar nada de domain/ aqui.
 */

export type PackId = string;

export interface HierarchyLevel {
  id: string;
  label: string;
  labelPlural: string;
  parent?: string;
  optional?: boolean;
}

export interface PackRole {
  id: string;
  label: string;
  scope: string;
  domain?: "A" | "B";
  readOnly?: boolean;
  temporary?: boolean;
}

export interface DomainPack {
  packId: PackId;
  packName: string;
  version: string;
  language: string;
  promise?: string;
  hierarchy: { levels: HierarchyLevel[] };
  labels: Record<string, string>;
  roles: PackRole[];
  rbacInvariants: string[];
  navigation: Array<{ id: string; label: string; roles: string[]; [k: string]: unknown }>;
  indexRef: unknown;
  gamificationRef: unknown;
  ai: unknown;
  branding: unknown;
  microcopy: unknown;
  [extension: string]: unknown;
}

export interface ProprietaryIndex {
  id: string;
  name: string;
  version: string;
  [k: string]: unknown;
}

export interface GamificationEconomy {
  version: string;
  ethicalPrinciples: string[];
  [k: string]: unknown;
}

export interface PackLoadError {
  code: "not_found" | "invalid_schema" | "parse_error" | "unknown";
  message: string;
  details?: unknown;
}

export type PackStatus =
  | { state: "idle" }
  | { state: "loading" }
  | {
      state: "ready";
      pack: DomainPack;
      index: ProprietaryIndex | null;
      gamification: GamificationEconomy | null;
      validation: { valid: boolean; errors: unknown[] | null };
    }
  | { state: "error"; error: PackLoadError };
