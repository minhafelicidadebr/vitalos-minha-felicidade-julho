export function requiresFibtCampaignSelection(
  hmlEnabled: string | undefined,
  waveId: string | null | undefined,
): boolean {
  return hmlEnabled !== "true" && !waveId;
}
