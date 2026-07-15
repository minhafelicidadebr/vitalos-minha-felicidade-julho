// Ativos oficiais da marca VitalOS™ (ver docs/brand/vitalos/BRAND-ASSET-MAP.md).
// object-contain + width/height intrínsecos reservados — zero layout shift,
// zero distorção, zero recorte adicional em runtime.
//
// A logo horizontal tem texto embutido no PNG (branco na versão "on-dark",
// verde-escuro na "on-light") — sem `surface`, o componente reage ao MESMO
// mecanismo de tema já existente (classe `.dark` em <html>, ver
// src/app/shell/ThemeToggle.tsx:24) via dark:hidden/hidden:dark:block. Nunca
// cria estado de tema paralelo. `surface` só existe para contextos onde o
// fundo é fixo independente do tema do app (ex.: uma superfície sempre escura).

import { cn } from "@/lib/utils";

const HORIZONTAL_LIGHT = "/brand/vitalos/vitalos-logo-horizontal-on-light.png";
const HORIZONTAL_DARK = "/brand/vitalos/vitalos-logo-horizontal-on-dark.png";
const MARK_512 = "/brand/vitalos/vitalos-mark-512.png";
const MARK_256 = "/brand/vitalos/vitalos-mark-256.png";

const HORIZONTAL_INTRINSIC = { width: 1200, height: 299 };
const MARK_INTRINSIC = { width: 512, height: 512 };

export type VitalOSBrandSize = "sm" | "md" | "lg" | "ivo";

const HORIZONTAL_SIZE_CLASS: Record<VitalOSBrandSize, string> = {
  sm: "h-9 w-auto max-w-[175px]",
  md: "h-9 w-auto max-w-[175px] md:h-12 md:max-w-[220px]",
  lg: "h-11 w-auto max-w-[220px] md:h-14 md:max-w-[280px]",
  ivo: "h-9 w-auto max-w-[175px] md:h-12 md:max-w-[220px]",
};

const MARK_SIZE_CLASS: Record<VitalOSBrandSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  ivo: "h-[76px] w-[76px] md:h-[88px] md:w-[88px]",
};

export interface VitalOSBrandProps {
  variant?: "mark" | "horizontal";
  /** Força uma versão específica. Omitir = reage ao tema real do app. */
  surface?: "dark" | "light";
  size?: VitalOSBrandSize;
  /** true (default): alt="" + aria-hidden — use quando o rótulo acessível já
   * existe no elemento pai (ex.: aria-label no <Link>). false: exige `alt`. */
  decorative?: boolean;
  alt?: string;
  className?: string;
}

export function VitalOSBrand({
  variant = "horizontal",
  surface,
  size = "md",
  decorative = true,
  alt,
  className,
}: VitalOSBrandProps) {
  const a11y = decorative
    ? { alt: "", "aria-hidden": true as const }
    : { alt: alt ?? "Programa VitalOS" };

  if (variant === "mark") {
    const src = size === "sm" ? MARK_256 : MARK_512;
    return (
      <img
        src={src}
        {...MARK_INTRINSIC}
        {...a11y}
        className={cn("shrink-0 object-contain", MARK_SIZE_CLASS[size], className)}
      />
    );
  }

  const sizeClass = HORIZONTAL_SIZE_CLASS[size];

  if (surface) {
    const src = surface === "dark" ? HORIZONTAL_DARK : HORIZONTAL_LIGHT;
    return (
      <img
        src={src}
        {...HORIZONTAL_INTRINSIC}
        {...a11y}
        className={cn("object-contain", sizeClass, className)}
      />
    );
  }

  return (
    <>
      <img
        src={HORIZONTAL_LIGHT}
        {...HORIZONTAL_INTRINSIC}
        {...a11y}
        className={cn("object-contain dark:hidden", sizeClass, className)}
      />
      <img
        src={HORIZONTAL_DARK}
        {...HORIZONTAL_INTRINSIC}
        {...a11y}
        className={cn("hidden object-contain dark:block", sizeClass, className)}
      />
    </>
  );
}
