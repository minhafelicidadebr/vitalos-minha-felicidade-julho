// Registro de mapeamentos lente → dimensão (methodology-governance.md).
//
// Fail-closed no carregamento, mesma disciplina do manifesto FIB-T: um
// registro malformado derruba o boot em vez de virar indicador silencioso.

import raw from "./dimension-mappings.json";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { IVO_DIMENSION_IDS, IVO_LENS_IDS } from "@/engine/ivo/lens-contract";
import { isMappingApproved, type DimensionMapping, type MappingStatus } from "@/engine/ivo/ivo-matrix";

interface RawMapping {
  id: string;
  version: string;
  lens: string;
  source_construct_id: string;
  dimension: string;
  status: string;
  rationale: string;
  owner: string | null;
  scientific_evidence: string[];
  approved_at: string | null;
}

interface RawRegistry {
  registry_version: string;
  mappings: RawMapping[];
}

const STATUSES: readonly MappingStatus[] = ["PROPOSTO", "APROVADO", "REJEITADO"];

export class DimensionMappingError extends Error {
  constructor(message: string) {
    super(`[ivo-dimension-mappings] ${message}`);
    this.name = "DimensionMappingError";
  }
}

function constructsForLens(lens: string): ReadonlySet<string> | null {
  if (lens === "fibt") return new Set(getFibtManifest().factors.map((f) => f.id));
  return null; // lentes planejadas não têm construtos versionados
}

export function validateDimensionMappings(registry: RawRegistry): DimensionMapping[] {
  if (!registry.registry_version) throw new DimensionMappingError("registry_version ausente");
  const ids = new Set<string>();
  return registry.mappings.map((m) => {
    if (!m.id || ids.has(m.id)) throw new DimensionMappingError(`id ausente ou duplicado: ${m.id}`);
    ids.add(m.id);
    if (!m.version) throw new DimensionMappingError(`${m.id}: versão ausente`);
    if (!(IVO_LENS_IDS as readonly string[]).includes(m.lens)) {
      throw new DimensionMappingError(`${m.id}: lente desconhecida ${m.lens}`);
    }
    if (!(IVO_DIMENSION_IDS as readonly string[]).includes(m.dimension)) {
      throw new DimensionMappingError(`${m.id}: dimensão desconhecida ${m.dimension}`);
    }
    if (!(STATUSES as readonly string[]).includes(m.status)) {
      throw new DimensionMappingError(`${m.id}: status inválido ${m.status}`);
    }
    if (!m.rationale?.trim()) throw new DimensionMappingError(`${m.id}: justificativa ausente`);
    const constructs = constructsForLens(m.lens);
    if (!constructs) {
      throw new DimensionMappingError(`${m.id}: lente ${m.lens} não tem construtos versionados`);
    }
    if (!constructs.has(m.source_construct_id)) {
      throw new DimensionMappingError(`${m.id}: construto ${m.source_construct_id} não existe na lente`);
    }
    const mapping: DimensionMapping = {
      id: m.id,
      version: m.version,
      lens: m.lens as DimensionMapping["lens"],
      sourceConstructId: m.source_construct_id,
      dimension: m.dimension as DimensionMapping["dimension"],
      status: m.status as MappingStatus,
      rationale: m.rationale,
      owner: m.owner,
      scientificEvidence: [...(m.scientific_evidence ?? [])],
      approvedAt: m.approved_at,
    };
    if (mapping.status === "APROVADO" && !isMappingApproved(mapping)) {
      throw new DimensionMappingError(`${m.id}: APROVADO exige responsável, evidência e data`);
    }
    return Object.freeze(mapping);
  });
}

const MAPPINGS = Object.freeze(validateDimensionMappings(raw as unknown as RawRegistry));

export function getDimensionMappings(): readonly DimensionMapping[] {
  return MAPPINGS;
}

export function getDimensionMappingRegistryVersion(): string {
  return (raw as unknown as RawRegistry).registry_version;
}
