/**
 * Referência dos tokens semânticos do design system 4 Lentes VITA.
 * As cores reais são definidas em src/styles.css (oklch).
 * Esta lista existe para uso por documentação e pelo showcase.
 */
export const SEMANTIC_COLORS = [
  { token: "background", description: "Superfície base — clara quente / tinta escura" },
  { token: "foreground", description: "Texto principal sobre background" },
  { token: "card", description: "Superfície de cards e painéis" },
  { token: "card-foreground", description: "Texto sobre cards" },
  { token: "primary", description: "Verde profundo institucional" },
  { token: "primary-foreground", description: "Texto sobre primary" },
  { token: "secondary", description: "Verde suave de apoio" },
  { token: "secondary-foreground", description: "Texto sobre secondary" },
  { token: "accent", description: "Dourado institucional" },
  { token: "accent-foreground", description: "Texto sobre accent" },
  { token: "muted", description: "Superfície neutra" },
  { token: "muted-foreground", description: "Texto secundário / metadados" },
  { token: "destructive", description: "Erros e ações destrutivas" },
  { token: "border", description: "Bordas e separadores" },
  { token: "ring", description: "Anel de foco — WCAG focus-visible" },
] as const;

export const SPACING_SCALE = [1, 2, 3, 4, 6, 8, 12, 16] as const;

export const RADII = ["sm", "md", "lg", "xl", "2xl", "3xl"] as const;
