// Catálogo de lentes e dimensões do IVO (spec ivo-platform-foundation.md).
//
// Ordem e trimestre das lentes DERIVAM da jornada canônica
// (src/domain/journey.ts) — não existe segunda fonte da sequência. Só a FIB-T
// é funcional; as demais são contratos planejados, sem versão nem rota, para
// que nenhuma tela as apresente como medidas.
//
// Rótulos de lente são explícitos aqui por causa do conflito C2
// (methodology-governance.md): a jornada descreve T3 como "PERMA+V / IVO", e
// a matriz não pode sugerir que o IVO é produzido por uma única lente.

import { CANONICAL_JOURNEY, type JourneyStage } from "@/domain/journey";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { resolvePackBundle } from "@/domain/packs/registry";
import {
  IVO_DIMENSION_IDS,
  type IvoDimension,
  type IvoLensDescriptor,
  type IvoLensId,
  type IvoQuarter,
} from "@/engine/ivo/lens-contract";

const LENS_BY_JOURNEY_KEY: Record<JourneyStage["key"], { id: IvoLensId; label: string }> = {
  risco: { id: "copsoq", label: "COPSOQ" },
  bem_comum: { id: "fibt", label: "FIB-T" },
  florescimento: { id: "perma_v", label: "PERMA+V" },
  forcas: { id: "via_t", label: "VIA-T" },
};

/** Detalhe da lente Q2 dentro da experiência IVO — a única lente funcional. */
export const FIBT_LENS_ROUTE = "/ivo-integral/q2";

/** Centro de controle operacional da FIB-T (coleta, links, publicação protegida). */
export const FIBT_MANAGER_PANEL_ROUTE = "/fibt-piloto";

export function ivoLensCatalog(): IvoLensDescriptor[] {
  return [...CANONICAL_JOURNEY]
    .sort((a, b) => a.order - b.order)
    .map((stage) => {
      const identity = LENS_BY_JOURNEY_KEY[stage.key];
      const quarter = `Q${stage.order}` as IvoQuarter;
      if (identity.id === "fibt") {
        return {
          id: identity.id,
          quarter,
          label: identity.label,
          instrument: getFibtManifest().name,
          instrumentVersion: getFibtManifest().instrument_version,
          availability: "functional",
          route: FIBT_LENS_ROUTE,
        };
      }
      return {
        id: identity.id,
        quarter,
        label: identity.label,
        instrument: identity.label,
        instrumentVersion: null,
        availability: "planned",
        route: null,
      };
    });
}

/**
 * As 4 dimensões com o vocabulário do pack. Os índices de todos os packs
 * declaram 4 níveis na mesma ordem (pessoa, vínculos, gestão, instituição);
 * o rótulo vem do pack, o id é o canônico do IVO. Pack sem índice cai para os
 * rótulos do pack padrão.
 */
export function ivoDimensionsForPack(packId: string): IvoDimension[] {
  const index = (resolvePackBundle(packId).index ?? resolvePackBundle("enterprise").index) as unknown as {
    lenses: Array<{ id: string; name: string }>;
  };
  if (!index?.lenses || index.lenses.length !== IVO_DIMENSION_IDS.length) {
    throw new Error(`[ivo] índice do pack ${packId} não declara ${IVO_DIMENSION_IDS.length} dimensões`);
  }
  return IVO_DIMENSION_IDS.map((id, position) => ({ id, label: index.lenses[position]!.name }));
}
