// Guard de honestidade do mapa driver→pilar (Fable 5 §8): prova que TODO pillarId referenciado
// existe de fato no framework do pack — zero referência pendente — e que todo driverId é um
// cartão real do baralho. Se alguém renomear um pilar no JSON e esquecer o mapa, este teste cai.

import { describe, expect, it } from "bun:test";
import { getDriverPillarLinks } from "./wwp-drivers-mock";
import { FLASHCARDS } from "./flashcard-mock";
import { PACK_REGISTRY, REGISTERED_PACK_IDS } from "@/domain/packs/registry";

/** Coleta todos os pillarId reais de um framework de pack. */
function realPillarIds(packId: string): Set<string> {
  const index = PACK_REGISTRY[packId]?.index as
    | { lenses?: { pillars?: { id: string }[] }[] }
    | null
    | undefined;
  const ids = new Set<string>();
  for (const lens of index?.lenses ?? []) {
    for (const pillar of lens.pillars ?? []) ids.add(pillar.id);
  }
  return ids;
}

const VALID_DRIVER_IDS = new Set(FLASHCARDS.map((c) => c.driverId));
const PACKS_WITH_MAP = REGISTERED_PACK_IDS.filter((id) => getDriverPillarLinks(id).length > 0);

describe("wwp-drivers-mock — integridade referencial", () => {
  it("os 5 packs registrados têm mapa de drivers", () => {
    expect(PACKS_WITH_MAP.sort()).toEqual(
      ["condominium", "enterprise", "government", "health", "school"].sort(),
    );
  });

  for (const packId of PACKS_WITH_MAP) {
    describe(`pack ${packId}`, () => {
      const links = getDriverPillarLinks(packId);
      const pillarIds = realPillarIds(packId);

      it("todo pillarId referenciado existe no framework do pack", () => {
        const dangling = links.flatMap((l) =>
          l.pillarIds.filter((pid) => !pillarIds.has(pid)).map((pid) => `${l.driverId}→${pid}`),
        );
        expect(dangling).toEqual([]);
      });

      it("todo driverId é um cartão real do baralho", () => {
        const unknown = links.map((l) => l.driverId).filter((d) => !VALID_DRIVER_IDS.has(d));
        expect(unknown).toEqual([]);
      });

      it("não há driver duplicado no mapa", () => {
        const ids = links.map((l) => l.driverId);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("todo driver mapeia ao menos um pilar (sem entrada vazia)", () => {
        expect(links.every((l) => l.pillarIds.length > 0)).toBe(true);
      });
    });
  }

  it("packs não registrados caem em [] (fallback honesto, sem prioridade presumida)", () => {
    expect(getDriverPillarLinks("inexistente")).toEqual([]);
  });
});
