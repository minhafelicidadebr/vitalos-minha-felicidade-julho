import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminRoute = readFileSync(join(process.cwd(), "src/routes/admin.tsx"), "utf8");

describe("admin wave participation privacy", () => {
  test("uses the canonical k=5 protector for the total wave count", () => {
    expect(adminRoute).toContain("protectSectorParticipation(wave.responseCount)");
    expect(adminRoute).toContain("participation.countLabel");
  });

  test("does not reveal a below-threshold count through percentage or missing-count copy", () => {
    expect(adminRoute).toContain("const pct = hasEnough && wave.invitedCount > 0");
    expect(adminRoute).toContain('hasEnough ? `${pct}%` : "Protegido"');
    expect(adminRoute).not.toContain("5 - wave.responseCount");
  });
});
