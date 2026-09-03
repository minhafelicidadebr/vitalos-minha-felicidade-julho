export const SECTOR_PRIVACY_THRESHOLD = 5;

export type SectorLinkState = "active" | "expired" | "revoked";

export interface SectorLinkStateInput {
  status: string;
  expiresAt: string;
  revokedAt?: string | null;
}

export interface SectorParticipation {
  reportable: boolean;
  countLabel: string;
}

/** Stable key used by both wave_cohorts.key and sector_links.sector_label. */
export function normalizeSectorKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function isValidSectorKey(value: string): boolean {
  return /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(value) && value.length >= 2 && value.length <= 40;
}

export function classifySectorLink(
  input: SectorLinkStateInput,
  now: Date = new Date(),
): SectorLinkState {
  if (input.status !== "active" || input.revokedAt) return "revoked";

  const expiresAt = Date.parse(input.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return "expired";

  return "active";
}

export function protectSectorParticipation(count: number): SectorParticipation {
  const safeCount = Number.isInteger(count) && count > 0 ? count : 0;
  if (safeCount < SECTOR_PRIVACY_THRESHOLD) {
    return { reportable: false, countLabel: `<${SECTOR_PRIVACY_THRESHOLD}` };
  }
  return { reportable: true, countLabel: String(safeCount) };
}
