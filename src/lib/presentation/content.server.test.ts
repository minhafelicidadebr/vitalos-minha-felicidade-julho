import { describe, expect, test } from "bun:test";
import {
  getPresentationDeck,
  PRESENTATION_CONTEXT_SURFACE,
  resolvePresentationContext,
} from "./content.server";
import { resolveCommercialClaim } from "@/domain/commercial-claims/commercial-claims-resolver";
import { readFileSync } from "node:fs";

describe("enterprise presentation editorial boundaries", () => {
  const deck = getPresentationDeck();
  test("15 unique chapters have substantive details and institutional destination", () => {
    expect(deck.slides).toHaveLength(15);
    expect(new Set(deck.slides.map((s) => s.id)).size).toBe(15);
    for (const s of deck.slides) {
      expect(s.cards.length).toBeGreaterThan(1);
      expect(s.detail.blocks.length).toBeGreaterThan(1);
      expect(s.note.length).toBeGreaterThan(30);
    }
    expect(new URL(deck.contact.href).hostname).toBe("www.felicidadeparatodos.com.br");
  });
  test("a home economic claim cannot inherit authorization on this new surface", () => {
    expect(() =>
      resolveCommercialClaim({
        claimId: "CLAIM-COM-ECONOMIC-BASELINE-001",
        variant: "default",
        surfaceId: PRESENTATION_CONTEXT_SURFACE,
      }),
    ).toThrow();
    expect(resolvePresentationContext()).toBeNull();
    expect(JSON.stringify(deck)).not.toMatch(/16%|15%|US\$|R\$/);
  });
  test("the slides distinguish local learning, future lenses and demonstrative ESG", () => {
    const lenses = deck.slides.find((s) => s.id === "lentes")!;
    expect(lenses.cards[0]!.status).toBe("Preparação metodológica");
    expect(lenses.cards[1]!.status).toBe("Demonstração local");
    expect(lenses.cards[2]!.status).toBe("Evolução prevista");
    expect(deck.slides.find((s) => s.id === "aprendizagem")!.note).toContain("ensaio local");
    expect(deck.slides.find((s) => s.id === "relatorio")!.note).toContain(
      "Não é relatório de impacto ESG auditado",
    );
  });
  test("browser files never import protected deck, registry or access implementation", () => {
    for (const path of [
      "src/features/presentation/EnterprisePresentation.tsx",
      "src/features/presentation/PresentationVisual.tsx",
      "src/routes/apresentacao.empresas.tsx",
    ]) {
      expect(readFileSync(path, "utf8")).not.toMatch(
        /content\.server|access\.server|commercial-claims-registry|VITALOS_PRESENTATION_VERIFIER/,
      );
    }
  });
});
