// Testes de binding do H2.1B MVP (§14 "Binding") — prova que as 7
// superfícies migradas realmente vêm do Commercial Claims Registry (não são
// texto livre duplicado), que trocar a copy só é possível editando o
// registry (+ regenerar a projeção), e que nenhum claim resolve fora da
// superfície que autorizou.
//
// Fechamento H2.1B: landing-copy.ts consome resolvePublicCommercialClaim()
// (projeção mínima, sem Date()) — este arquivo de teste, rodando em
// Node/Bun (não navegador), pode usar o resolver COMPLETO e o registry
// diretamente para provar que a projeção pública não divergiu.

import { describe, expect, test } from "bun:test";
import * as LandingCopy from "./landing-copy";
import { resolveCommercialClaim, CommercialClaimResolutionError } from "@/domain/commercial-claims/commercial-claims-resolver";
import { resolvePublicCommercialClaim } from "@/domain/commercial-claims/commercial-claims-public-resolver";
import { PUBLIC_COMMERCIAL_BINDINGS } from "@/domain/commercial-claims/commercial-claims-public-bindings";
import { getCommercialClaimsRegistry } from "@/domain/commercial-claims/commercial-claims-registry";
import { COMMERCIAL_SURFACE_IDS } from "@/domain/commercial-claims/commercial-surface-ids";

const registry = getCommercialClaimsRegistry();

function rawVariant(claimId: string, variant: string): string {
  const claim = registry.claims.find((c) => c.claim_id === claimId);
  if (!claim) throw new Error(`fixture do teste: claim ${claimId} não existe no registry`);
  const text = claim.variants[variant];
  if (text === undefined) throw new Error(`fixture do teste: variant ${variant} não existe`);
  return text;
}

describe("H2.1B — as 7 superfícies migradas usam claim governado (não copy livre)", () => {
  test("VIA-T (LENSES_DEEP.pillars Q4.why) == variant default do registry, não string solta", () => {
    const bound = LandingCopy.LENSES_DEEP.pillars.find((l) => l.q.startsWith("Q4"))!.why;
    expect(bound).toBe(rawVariant("CLAIM-COM-VIAT-EXPLORATORY-001", "default"));
  });

  test("privacidade (METHOD_DEEP.stages Mensurar.what) contém a variant default do registry", () => {
    const bound = LandingCopy.METHOD_DEEP.stages.find((s) => s.title === "Mensurar")!.what;
    expect(bound).toContain(rawVariant("CLAIM-COM-PRIVACY-AGGREGATION-001", "default"));
  });

  test("baseline econômico (ECONOMIC_BASELINE.text) == variant default do registry", () => {
    expect(LandingCopy.ECONOMIC_BASELINE.text).toBe(
      rawVariant("CLAIM-COM-ECONOMIC-BASELINE-001", "default"),
    );
  });

  test("identidade do instrumento (NR1_LANDING.jornada.quarters T1) == variant short do registry", () => {
    const t1 = LandingCopy.NR1_LANDING.jornada.quarters.find((r) => r.q === "T1")!;
    expect(t1.instrument).toBe(rawVariant("CLAIM-COM-INSTRUMENT-LABEL-001", "short"));
  });

  test("sustentabilidade (NR1_LANDING.jornada.finale.text) contém a variant default do registry", () => {
    expect(LandingCopy.NR1_LANDING.jornada.finale.text).toContain(
      rawVariant("CLAIM-COM-SUSTAINABILITY-REPORT-001", "default"),
    );
  });

  test("sanções (NR1_LANDING.mudou.body) == variant default do registry", () => {
    expect(LandingCopy.NR1_LANDING.mudou.body).toBe(
      rawVariant("CLAIM-COM-SANCTIONS-ENFORCEMENT-001", "default"),
    );
  });

  test("papel no GRO/PGR (NR1_LANDING.hero.sub) contém a variant default do registry", () => {
    expect(LandingCopy.NR1_LANDING.hero.sub).toContain(
      rawVariant("CLAIM-COM-GRO-PGR-ROLE-001", "default"),
    );
  });
});

describe("H2.1B — mudar a copy só é possível editando o registry", () => {
  test("todo texto bindado é idêntico ao que resolveCommercialClaim (completo) devolve para o mesmo claim+variant+surface", () => {
    const t1 = LandingCopy.NR1_LANDING.jornada.quarters.find((r) => r.q === "T1")!;
    const resolved = resolveCommercialClaim({
      claimId: "CLAIM-COM-INSTRUMENT-LABEL-001",
      variant: "short",
      surfaceId: COMMERCIAL_SURFACE_IDS.NR1_JOURNEY_T1_INSTRUMENT_LABEL,
    });
    expect(t1.instrument).toBe(resolved.text);
  });

  test("landing-copy.ts consome exatamente o que resolvePublicCommercialClaim (projeção) devolve, não o registry completo direto", () => {
    const t1 = LandingCopy.NR1_LANDING.jornada.quarters.find((r) => r.q === "T1")!;
    const viaPublic = resolvePublicCommercialClaim(PUBLIC_COMMERCIAL_BINDINGS.nr1InstrumentLabelT1);
    expect(t1.instrument).toBe(viaPublic.text);
  });
});

describe("H2.1B — claim não resolve fora da superfície que o autorizou", () => {
  test("VIA-T não resolve numa surface qualquer não listada", () => {
    expect(() =>
      resolveCommercialClaim({
        claimId: "CLAIM-COM-VIAT-EXPLORATORY-001",
        variant: "default",
        surfaceId: "marketing.home.economic-baseline", // autorizada para OUTRO claim, não este
      }),
    ).toThrow(CommercialClaimResolutionError);
  });

  test("baseline econômico não resolve na surface do VIA-T", () => {
    expect(() =>
      resolveCommercialClaim({
        claimId: "CLAIM-COM-ECONOMIC-BASELINE-001",
        variant: "default",
        surfaceId: COMMERCIAL_SURFACE_IDS.MODAL_LENSES_DEEP_Q4_VIAT_WHY,
      }),
    ).toThrow(CommercialClaimResolutionError);
  });
});
