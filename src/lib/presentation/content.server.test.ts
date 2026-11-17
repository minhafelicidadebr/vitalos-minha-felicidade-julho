import { describe, expect, test } from "bun:test";
import { getPresentationDeck } from "./content.server";
import { presentationStatistics } from "./statistics.server";
import { resolveCommercialClaim } from "@/domain/commercial-claims/commercial-claims-resolver";
import { findCommercialClaim } from "@/domain/commercial-claims/commercial-claims-registry";
import { readFileSync } from "node:fs";
const deck = getPresentationDeck();
describe("new enterprise narrative and evidence boundaries", () => {
  test("15 canonical scenes and seven executive scenes share substantive content", () => {
    expect(deck.slides).toHaveLength(15);
    expect(new Set(deck.slides.map((s) => s.id)).size).toBe(15);
    expect(deck.slides.filter((s) => s.executive)).toHaveLength(7);
    for (const slide of deck.slides) {
      expect(slide.detail.blocks.length).toBeGreaterThan(1);
      expect(slide.note.length).toBeGreaterThan(25);
      for (const source of [...(slide.references ?? []), ...(slide.detail.sources ?? [])])
        expect(new URL(source.href).protocol).toBe("https:");
    }
    expect(new URL(deck.contact.href).hostname).toBe("www.felicidadeparatodos.com.br");
  });
  test("home authorization is not borrowed; presentation resolves only its own approved figures", () => {
    expect(() =>
      resolveCommercialClaim({
        claimId: "CLAIM-COM-ECONOMIC-BASELINE-001",
        variant: "default",
        surfaceId: "marketing.presentation.enterprises.context",
      }),
    ).toThrow();
    expect(presentationStatistics("context").map((m) => m.value)).toEqual([1, 12]);
    expect(presentationStatistics("benefits").map((m) => m.value)).toEqual([4, 59]);
    expect(JSON.stringify(deck)).not.toMatch(/300%|45%|16 tri|21%/);
  });
  test("retired, draft, expired and wrong-surface statements never deliver partial numeric groups", () => {
    const claim = findCommercialClaim("CLAIM-COM-PRESENTATION-WHO-001")!;
    for (const status of ["draft", "retired"] as const)
      expect(
        presentationStatistics("context", (input) =>
          resolveCommercialClaim(input, {
            findClaim: () => ({ ...claim, status }),
            isExpired: () => false,
          }),
        ),
      ).toEqual([]);
    expect(
      presentationStatistics("context", (input) =>
        resolveCommercialClaim(input, { findClaim: () => claim, isExpired: () => true }),
      ),
    ).toEqual([]);
    expect(
      presentationStatistics("context", (input) =>
        resolveCommercialClaim(input, {
          findClaim: () => ({ ...claim, allowed_surface_ids: ["other"] }),
          isExpired: () => false,
        }),
      ),
    ).toEqual([]);
  });
  test("lenses describe origin and scope in buyer language", () => {
    const lenses = deck.slides.find((s) => s.id === "lentes")!;
    expect(lenses.cards.map((c) => c.status)).toEqual([
      "Preparação para implantação",
      "Jornada demonstrada localmente",
      "Etapa prevista",
      "Etapa prevista",
    ]);
    expect(lenses.cards[2]!.detail!.introduction).toContain("Seligman");
    expect(lenses.cards[3]!.detail!.introduction).toContain("Peterson");
    expect(deck.slides.find((s) => s.id === "caso")!.note).toContain("externo");
    expect(deck.slides.find((s) => s.id === "jornada")!.note).toContain("fictícia");
    expect(JSON.stringify(deck)).not.toMatch(/RH_ADMIN|adaptador Q3|nesta fatia|em tratativa/);
  });
  test("browser code imports neither protected narrative nor claim registry", () => {
    for (const file of [
      "src/features/presentation/EnterprisePresentation.tsx",
      "src/features/presentation/PresentationVisual.tsx",
      "src/routes/apresentacao.empresas.tsx",
    ])
      expect(readFileSync(file, "utf8")).not.toMatch(
        /content\.server|statistics\.server|access\.server|commercial-claims-registry|VITALOS_PRESENTATION_VERIFIER/,
      );
  });
});
