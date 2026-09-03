import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260812120000_one_active_sector_link_per_cohort.sql"),
  "utf8",
);
const sectorLinkServer = readFileSync(
  join(process.cwd(), "src/lib/survey/sector-link.server.ts"),
  "utf8",
);

describe("one active sector link migration", () => {
  test("aborts if the current staging data already violates the invariant", () => {
    expect(migration).toContain("HAVING COUNT(*) > 1");
    expect(migration).toContain("duplicate active sector links must be reconciled first");
  });

  test("enforces uniqueness by wave and exact cohort key only for active links", () => {
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS sector_links_one_active_per_wave_cohort\s+ON public\.sector_links \(wave_id, sector_label\)\s+WHERE status = 'active'/,
    );
  });

  test("is transactional", () => {
    expect(migration.trimStart().includes("BEGIN;")).toBe(true);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
  });

  test("binds every new link to the authenticated wave tenant and exact cohort key", () => {
    expect(migration).toMatch(
      /FOREIGN KEY \(wave_id, org_id\)\s+REFERENCES public\.waves\(id, org_id\)\s+NOT VALID/,
    );
    expect(migration).toMatch(
      /FOREIGN KEY \(wave_id, sector_label\)\s+REFERENCES public\.wave_cohorts\(wave_id, key\)\s+NOT VALID/,
    );
  });

  test("keeps legacy anomalies for explicit reconciliation while enforcing new writes", () => {
    expect(migration.match(/NOT VALID/g)).toHaveLength(2);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.sector_links/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.sector_links/i);
  });

  test("resolves the wave through the new tenant-bound FK without an ambiguous embed", () => {
    expect(sectorLinkServer).toContain("waves!sector_links_wave_org_fk(");
    expect(sectorLinkServer).not.toContain('"waves(org_id, instrument');
  });
});
