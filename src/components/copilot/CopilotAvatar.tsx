import {
  Building,
  GraduationCap,
  HeartPulse,
  Landmark,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { CopilotAvatarSpec } from "@/mocks/copilot-knowledge";

// Marca de persona do copiloto — ESTILIZADA, não foto-realista (honestidade Fable 5:
// deve ser inequivocamente uma IA, nunca parecer um profissional/servidor real).
// Gradiente vem do branding do pack ativo; glifo do setor; iniciais do nome sugerido.
// Anel de "presença" anima só com motion-safe (respeita redução de movimento).

const GLYPHS: Record<CopilotAvatarSpec["glyph"], LucideIcon> = {
  sparkles: Sparkles,
  landmark: Landmark,
  building: Building,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
};

interface CopilotAvatarProps {
  spec: CopilotAvatarSpec;
  /** Nome da persona, para rótulo acessível. */
  name: string;
  size?: number;
  /** Mostra o anel de presença animado (motion-safe). */
  live?: boolean;
}

export function CopilotAvatar({ spec, name, size = 56, live = false }: CopilotAvatarProps) {
  const Glyph = GLYPHS[spec.glyph] ?? Sparkles;
  const gradientId = `copilot-grad-${spec.glyph}-${spec.initials}`;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Avatar da copilota ${name}`}
    >
      {live && (
        // Presença EMPÁTICA: respiração suave (calma), não "ping" de alerta. Um halo
        // que pulsa devagar transmite escuta presente — não notificação. Motion-safe.
        <span
          className="absolute -inset-1 rounded-full opacity-25 blur-md motion-safe:animate-pulse"
          style={{ background: spec.gradientTo }}
          aria-hidden
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        className="relative"
        aria-hidden
        focusable="false"
      >
        <defs>
          <radialGradient id={gradientId} cx="32%" cy="28%" r="78%">
            <stop offset="0%" stopColor={spec.gradientTo} />
            <stop offset="100%" stopColor={spec.gradientFrom} />
          </radialGradient>
        </defs>
        <circle cx="28" cy="28" r="27" fill={`url(#${gradientId})`} />
        <circle cx="28" cy="28" r="27" fill="none" stroke="white" strokeOpacity="0.25" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-white">
        <Glyph style={{ width: size * 0.42, height: size * 0.42 }} aria-hidden />
      </span>
    </span>
  );
}
