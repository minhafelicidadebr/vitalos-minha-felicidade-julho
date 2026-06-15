import { describe, expect, test } from "bun:test";
import { getNudgeLibrary, selectNudges, type NudgeDef } from "./nudge-engine";
import type { GamificationEconomy } from "../pack/pack-types";

// ─── getNudgeLibrary (leitura do pack) ────────────────────────────────────────

describe("getNudgeLibrary", () => {
  const economy = {
    version: "1",
    nudgeLibrarySeed: [
      { id: "n1", pillar: "energia", copy: "Faça uma pausa." },
      {
        id: "n2",
        pillar: "reconhecimento",
        copy: "Reconheça um colega.",
        channel: "email",
        frequencyCapPerWeek: 3,
        optInRequired: true,
        targetRole: "LIDER_EQUIPE",
      },
    ],
  } as unknown as GamificationEconomy;

  test("mapeia pillar → pillarId e aplica defaults", () => {
    const lib = getNudgeLibrary(economy);
    const n1 = lib.find((n) => n.id === "n1")!;
    expect(n1.pillarId).toBe("energia");
    expect(n1.channel).toBe("in_app");
    expect(n1.frequencyCapPerWeek).toBe(1);
    expect(n1.optInRequired).toBe(false);
  });

  test("preserva campos opcionais explícitos", () => {
    const n2 = getNudgeLibrary(economy).find((n) => n.id === "n2")!;
    expect(n2.channel).toBe("email");
    expect(n2.frequencyCapPerWeek).toBe(3);
    expect(n2.optInRequired).toBe(true);
    expect(n2.targetRole).toBe("LIDER_EQUIPE");
  });

  test("biblioteca ausente → lista vazia", () => {
    expect(getNudgeLibrary({ version: "1" } as GamificationEconomy)).toEqual([]);
  });
});

// ─── selectNudges (targeting + opt-in + frequency cap) ────────────────────────

function nudge(over: Partial<NudgeDef> & Pick<NudgeDef, "id" | "pillarId">): NudgeDef {
  return {
    copy: "…",
    channel: "in_app",
    frequencyCapPerWeek: 1,
    optInRequired: false,
    ...over,
  };
}

describe("selectNudges", () => {
  test("targeting por papel: nudge com targetRole só vai para aquele papel", () => {
    const lib = [nudge({ id: "lider", pillarId: "p", targetRole: "LIDER_EQUIPE" })];
    expect(
      selectNudges(lib, {
        role: "COLABORADOR",
        optedInNudgeIds: new Set(),
        deliveredThisWeek: new Map(),
      }),
    ).toHaveLength(0);
    expect(
      selectNudges(lib, {
        role: "LIDER_EQUIPE",
        optedInNudgeIds: new Set(),
        deliveredThisWeek: new Map(),
      }),
    ).toHaveLength(1);
  });

  test("opt-in: nudge optInRequired só é entregue com consentimento", () => {
    const lib = [nudge({ id: "sens", pillarId: "p", optInRequired: true })];
    expect(
      selectNudges(lib, { role: "X", optedInNudgeIds: new Set(), deliveredThisWeek: new Map() }),
    ).toHaveLength(0);
    expect(
      selectNudges(lib, {
        role: "X",
        optedInNudgeIds: new Set(["sens"]),
        deliveredThisWeek: new Map(),
      }),
    ).toHaveLength(1);
  });

  test("frequency cap: não entrega quando já atingiu o limite semanal", () => {
    const lib = [nudge({ id: "cap", pillarId: "p", frequencyCapPerWeek: 2 })];
    expect(
      selectNudges(lib, {
        role: "X",
        optedInNudgeIds: new Set(),
        deliveredThisWeek: new Map([["cap", 2]]),
      }),
    ).toHaveLength(0);
    expect(
      selectNudges(lib, {
        role: "X",
        optedInNudgeIds: new Set(),
        deliveredThisWeek: new Map([["cap", 1]]),
      }),
    ).toHaveLength(1);
  });

  test("respeita o máximo de entregas", () => {
    const lib = [
      nudge({ id: "a", pillarId: "p" }),
      nudge({ id: "b", pillarId: "p" }),
      nudge({ id: "c", pillarId: "p" }),
    ];
    const out = selectNudges(lib, {
      role: "X",
      optedInNudgeIds: new Set(),
      deliveredThisWeek: new Map(),
      max: 2,
    });
    expect(out).toHaveLength(2);
    expect(out.every((d) => d.reason === "scheduled")).toBe(true);
  });

  test("combina todos os filtros corretamente", () => {
    const lib = [
      nudge({ id: "ok", pillarId: "p" }), // passa
      nudge({ id: "wrongrole", pillarId: "p", targetRole: "CHRO" }), // bloqueado por papel
      nudge({ id: "needsoptin", pillarId: "p", optInRequired: true }), // bloqueado por opt-in
      nudge({ id: "capped", pillarId: "p" }), // bloqueado por cap
    ];
    const out = selectNudges(lib, {
      role: "COLABORADOR",
      optedInNudgeIds: new Set(),
      deliveredThisWeek: new Map([["capped", 1]]),
      max: 5,
    });
    expect(out.map((d) => d.nudge.id)).toEqual(["ok"]);
  });
});
