import { describe, expect, test } from "bun:test";
import {
  buildParticipationSnapshot,
  buildSectorLink,
  daysUntilExpiration,
  isSnapshotVisibleToManager,
  resolveSectorLink,
  suppressDifferentialInference,
  type SectorLink,
} from "./sector-link-engine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activeLink(overrides: Partial<SectorLink> = {}): SectorLink {
  return buildSectorLink({
    id: "test-link-001",
    tokenHash: "sha256-placeholder",
    expiresInDays: 30,
    createdAt: "2026-06-23T00:00:00.000Z",
    meteAnchor: "T3-2026",
    targetPopulation: 100,
    ...overrides,
  });
}

// ─── resolveSectorLink ────────────────────────────────────────────────────────

describe("resolveSectorLink — ciclo de vida", () => {
  test("token ativo e não expirado é válido", () => {
    const link = activeLink();
    const r = resolveSectorLink(link, "2026-07-01T00:00:00.000Z");
    expect(r.valid).toBe(true);
    expect(r.link).toBeDefined();
    expect(r.reason).toBeUndefined();
  });

  test("null retorna not_found", () => {
    expect(resolveSectorLink(null, "2026-07-01T00:00:00.000Z")).toEqual({
      valid: false,
      reason: "not_found",
    });
  });

  test("undefined retorna not_found", () => {
    expect(resolveSectorLink(undefined, "2026-07-01T00:00:00.000Z")).toEqual({
      valid: false,
      reason: "not_found",
    });
  });

  test("token expirado (expiresAt < now) é rejeitado", () => {
    const link = buildSectorLink({
      id: "l",
      tokenHash: "h",
      expiresInDays: 1,
      createdAt: "2026-06-01T00:00:00.000Z",
    });
    // expiresAt ≈ 2026-06-02
    const r = resolveSectorLink(link, "2026-06-10T00:00:00.000Z");
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("expired");
  });

  test("token exatamente no limite (expiresAt === now) é expirado", () => {
    const link = activeLink();
    // expiresAt = 2026-07-23
    const r = resolveSectorLink(link, link.expiresAt);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("expired");
  });

  test("token com status 'expired' explícito é rejeitado", () => {
    const link = { ...activeLink(), status: "expired" as const };
    const r = resolveSectorLink(link, "2026-06-24T00:00:00.000Z");
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("expired");
  });

  test("token revogado é rejeitado mesmo dentro da validade", () => {
    const link = { ...activeLink(), status: "revoked" as const, revokedAt: "2026-06-24T00:00:00.000Z" };
    const r = resolveSectorLink(link, "2026-06-25T00:00:00.000Z");
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("revoked");
  });

  test("token rotacionado é rejeitado com reason 'rotated'", () => {
    const link = { ...activeLink(), status: "rotated" as const, rotatedFromId: "antigo" };
    const r = resolveSectorLink(link, "2026-06-24T00:00:00.000Z");
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("rotated");
  });
});

// ─── buildSectorLink ──────────────────────────────────────────────────────────

describe("buildSectorLink — criação de estado inicial", () => {
  test("link criado com 30 dias expira no dia correto", () => {
    const link = buildSectorLink({
      id: "l1",
      tokenHash: "h1",
      expiresInDays: 30,
      createdAt: "2026-07-01T00:00:00.000Z",
    });
    expect(link.expiresAt).toBe("2026-07-31T00:00:00.000Z");
  });

  test("status padrão é 'active'", () => {
    const link = activeLink();
    expect(link.status).toBe("active");
  });

  test("accessMode padrão é 'shared_sector'", () => {
    const link = activeLink();
    expect(link.accessMode).toBe("shared_sector");
  });

  test("meteAnchor e targetPopulation são preservados", () => {
    const link = activeLink({ meteAnchor: "T3-2026", targetPopulation: 45 } as Partial<SectorLink>);
    // buildSectorLink ignora overrides no activeLink helper; testar direto
    const l = buildSectorLink({
      id: "l",
      tokenHash: "h",
      expiresInDays: 90,
      createdAt: "2026-06-23T00:00:00.000Z",
      meteAnchor: "T3-2026",
      targetPopulation: 45,
    });
    expect(l.meteAnchor).toBe("T3-2026");
    expect(l.targetPopulation).toBe(45);
  });
});

// ─── suppressDifferentialInference ───────────────────────────────────────────

describe("suppressDifferentialInference — prevenção de inferência por subtração", () => {
  test("sem grupos ocultos não suprime", () => {
    // todos n≥5
    expect(suppressDifferentialInference([{ count: 10 }, { count: 8 }, { count: 7 }], 5)).toBe(
      false,
    );
  });

  test("1 grupo oculto e todos os demais visíveis → suprime (inferência por subtração)", () => {
    // oculto=3, visíveis=10+8=18 — gestor calcula: total=21−18=3
    expect(suppressDifferentialInference([{ count: 10 }, { count: 8 }, { count: 3 }], 5)).toBe(
      true,
    );
  });

  test("2 grupos ocultos → não suprime (gestor não consegue isolar cada um)", () => {
    expect(suppressDifferentialInference([{ count: 10 }, { count: 2 }, { count: 3 }], 5)).toBe(
      false,
    );
  });

  test("k=10 (contexto sensível) aplica limiar maior", () => {
    // 7 < 10 → oculto; 12 visível → inferência por subtração
    expect(suppressDifferentialInference([{ count: 12 }, { count: 7 }], 10)).toBe(true);
  });

  test("segmento único não pode ser diferencial", () => {
    expect(suppressDifferentialInference([{ count: 3 }], 5)).toBe(false);
  });

  test("dois grupos visíveis e um oculto em lista de 3 → suprime", () => {
    expect(suppressDifferentialInference([{ count: 15 }, { count: 12 }, { count: 2 }], 5)).toBe(
      true,
    );
  });
});

// ─── buildParticipationSnapshot ──────────────────────────────────────────────

describe("buildParticipationSnapshot — participação agregada com k-anon", () => {
  test("taxa de participação calculada corretamente", () => {
    const snap = buildParticipationSnapshot({
      linkId: "l1",
      completions: 20,
      opens: 35,
      starts: 28,
      targetPopulation: 50,
    });
    expect(snap.participationPct).toBe(40); // 20/50 = 40%
  });

  test("meetsKAnonymity falso quando completions < kMin", () => {
    const snap = buildParticipationSnapshot({
      linkId: "l1",
      completions: 3,
      opens: 5,
      starts: 4,
      targetPopulation: 30,
      kAnonymityMin: 5,
    });
    expect(snap.meetsKAnonymity).toBe(false);
  });

  test("meetsKAnonymity verdadeiro quando completions >= kMin", () => {
    const snap = buildParticipationSnapshot({
      linkId: "l1",
      completions: 5,
      opens: 8,
      starts: 6,
      targetPopulation: 30,
      kAnonymityMin: 5,
    });
    expect(snap.meetsKAnonymity).toBe(true);
  });

  test("suppressedDifferential ativo quando inferência por subtração possível", () => {
    const snap = buildParticipationSnapshot(
      { linkId: "l1", completions: 7, opens: 10, starts: 8, targetPopulation: 45 },
      [20, 3], // irmãos: 20 (visível) e 3 (oculto) — o 3 seria inferível
    );
    // grupos: [7(este), 20, 3] → 3 < 5, e os outros dois ≥ 5 → supprime
    expect(snap.suppressedDifferential).toBe(true);
  });

  test("sem irmãos — sem supressão diferencial", () => {
    const snap = buildParticipationSnapshot({
      linkId: "l1",
      completions: 3,
      opens: 5,
      starts: 4,
      targetPopulation: 30,
    });
    // 1 segmento só — não pode ter inferência diferencial
    expect(snap.suppressedDifferential).toBe(false);
  });

  test("targetPopulation zero não divide por zero", () => {
    const snap = buildParticipationSnapshot({
      linkId: "l1",
      completions: 5,
      opens: 6,
      starts: 5,
      targetPopulation: 0,
    });
    expect(snap.participationPct).toBe(0);
  });
});

// ─── isSnapshotVisibleToManager ───────────────────────────────────────────────

describe("isSnapshotVisibleToManager — guard de visualização", () => {
  test("snapshot k-anon e sem supressão diferencial é visível", () => {
    const snap = buildParticipationSnapshot({
      linkId: "l1",
      completions: 10,
      opens: 15,
      starts: 12,
      targetPopulation: 40,
    });
    expect(isSnapshotVisibleToManager(snap)).toBe(true);
  });

  test("snapshot abaixo de k não é visível ao gestor", () => {
    const snap = buildParticipationSnapshot({
      linkId: "l1",
      completions: 3,
      opens: 5,
      starts: 4,
      targetPopulation: 40,
    });
    expect(isSnapshotVisibleToManager(snap)).toBe(false);
  });

  test("snapshot com inferência diferencial não é visível mesmo com k-anon", () => {
    const snap = buildParticipationSnapshot(
      { linkId: "l1", completions: 8, opens: 10, starts: 9, targetPopulation: 40 },
      [15, 3], // 3 < 5 → inferível
    );
    expect(isSnapshotVisibleToManager(snap)).toBe(false);
  });
});

// ─── daysUntilExpiration ──────────────────────────────────────────────────────

describe("daysUntilExpiration — utilidade de prazo", () => {
  test("link com 30 dias restantes retorna ~30", () => {
    const link = buildSectorLink({
      id: "l",
      tokenHash: "h",
      expiresInDays: 30,
      createdAt: "2026-07-01T00:00:00.000Z",
    });
    const days = daysUntilExpiration(link, "2026-07-01T00:00:00.000Z");
    expect(days).toBe(30);
  });

  test("link expirado retorna negativo", () => {
    const link = buildSectorLink({
      id: "l",
      tokenHash: "h",
      expiresInDays: 1,
      createdAt: "2026-06-01T00:00:00.000Z",
    });
    const days = daysUntilExpiration(link, "2026-06-10T00:00:00.000Z");
    expect(days).toBeLessThan(0);
  });
});
