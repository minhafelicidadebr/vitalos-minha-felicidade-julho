import continuityEditorial from "@/assets/proposal/continuity-editorial.webp";
// Mídia da proposta. Ilustrações: geradas, pessoas fictícias, procedência em
// docs/vitalos/artifacts/PRESENTATION_V4_IMAGES_2026-11-17.json. Retratos: enviados e autorizados pelo
// fundador em 23/11/2026 (src/assets/proposal/team/PROCEDENCIA.md), recortados em 360×360.
import heroImage from "@/assets/presentation/v4-hero.jpg";
import compreender from "@/assets/presentation/v4-compreender.jpg";
import agir from "@/assets/presentation/v4-agir.jpg";
import evoluir from "@/assets/presentation/v4-evoluir.jpg";
import joaoPaulo from "@/assets/proposal/team/cofundador-joao-paulo.webp";
import anaPaula from "@/assets/proposal/team/cofundadora-ana-paula.webp";
import olga from "@/assets/proposal/team/cofundadora-olga.webp";
import type { BandImage, TeamPhoto } from "./types";

export const ILLUSTRATION = { width: 1672, height: 941 } as const;
export const HERO_IMAGE = heroImage;
export const BAND_IMAGES: Record<BandImage, string> = { compreender, agir, evoluir };
export const TEAM_PHOTOS: Record<TeamPhoto, string> = {
  "joao-paulo": joaoPaulo,
  "ana-paula": anaPaula,
  olga,
};

export const CONTINUITY_IMAGE = continuityEditorial;
