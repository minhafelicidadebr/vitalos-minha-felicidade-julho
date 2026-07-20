// Gate do manifesto canônico do COPSOQ (Onda T2) — quatro amarras:
// 1. o manifesto valida contra o próprio schema (Ajv);
// 2. paridade integral manifesto × bateria REALMENTE servida (ids, hashes, reversos, dimensões);
// 3. o Instrument Registry deriva do manifesto (nenhuma duplicação divergente);
// 4. fail-closed: demonstrativo jamais autoriza linguagem de "validado", e o
//    detector de claims proibidos funciona (caixa/acento-insensível).
// Se a bateria servida mudar sem regenerar (e revisar) o manifesto, este arquivo quebra o gate.

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import Ajv from "ajv";

import manifestJson from "./copsoq-instrument-manifest.json";
import manifestSchema from "./copsoq-instrument-manifest.schema.json";
import {
  findForbiddenClaimMatches,
  getCopsoqManifest,
  isValidatedLanguageAllowed,
} from "./copsoq-instrument-manifest";
import { getWaveSurvey } from "@/mocks/survey-mock";
import { INSTRUMENT_REGISTRY } from "@/mocks/instrument-registry-mock";

const manifest = getCopsoqManifest();
const survey = getWaveSurvey("enterprise", "COPSOQ");

function sha256Nfc(text: string): string {
  return createHash("sha256").update(text.normalize("NFC"), "utf8").digest("hex");
}

describe("copsoq-instrument-manifest — schema", () => {
  test("manifesto valida contra o schema canônico", () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(manifestSchema);
    const valid = validate(manifestJson);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  test("manifesto está congelado (frozen: true) e deep-frozen no runtime", () => {
    expect(manifest.frozen).toBe(true);
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.dimensions)).toBe(true);
    expect(Object.isFrozen(manifest.item_hashes)).toBe(true);
    expect(() => {
      (manifest as unknown as { validation_status: string }).validation_status = "validado";
    }).toThrow();
  });
});

describe("copsoq-instrument-manifest — paridade com a bateria servida", () => {
  test("a bateria enterprise:COPSOQ existe no runtime", () => {
    expect(survey).not.toBeNull();
  });

  test("contagens: item_count e dimensões batem com o servido", () => {
    expect(manifest.item_count).toBe(survey!.items.length);
    expect(manifest.dimension_count).toBe(manifest.dimensions.length);
    expect(
      manifest.exposure_dimension_count + manifest.outcome_dimension_count,
    ).toBe(manifest.dimension_count);
    const servedDimensionIds = new Set(survey!.items.map((item) => item.pillarId));
    expect(manifest.dimensions.map((d) => d.id).sort()).toEqual(
      [...servedDimensionIds].sort(),
    );
  });

  test("item_hashes: cada item servido bate 1:1 com o hash registrado (sha-256/NFC)", () => {
    const hashed = manifest.item_hashes;
    expect(Object.keys(hashed).length).toBe(survey!.items.length);
    for (const item of survey!.items) {
      expect(hashed[item.id]).toBe(sha256Nfc(item.text));
    }
  });

  test("reversed_items espelha exatamente os itens reverse: true da bateria", () => {
    const servedReversed = survey!.items
      .filter((item) => item.reverse === true)
      .map((item) => item.id)
      .sort();
    expect([...manifest.reversed_items].sort()).toEqual(servedReversed);
  });

  test("dimensions: item_ids e kind (exposure/outcome) batem com o servido", () => {
    const outcomeIds = new Set(manifest.outcome_dimension_ids);
    for (const dimension of manifest.dimensions) {
      const servedIds = survey!.items
        .filter((item) => item.pillarId === dimension.id)
        .map((item) => item.id);
      expect([...dimension.item_ids]).toEqual(servedIds);
      expect(dimension.kind).toBe(outcomeIds.has(dimension.id) ? "outcome" : "exposure");
    }
  });

  test("desfechos nunca são maioria nem se misturam: 12 exposição + 2 desfechos", () => {
    expect(manifest.exposure_dimension_count).toBe(12);
    expect(manifest.outcome_dimension_count).toBe(2);
  });
});

describe("copsoq-instrument-manifest — registry deriva do manifesto", () => {
  const entry = INSTRUMENT_REGISTRY.find((candidate) => candidate.id === "copsoq");

  test("entrada copsoq existe e espelha versão/status/contagens/escala do manifesto", () => {
    expect(entry).toBeDefined();
    expect(entry!.version).toBe(manifest.version);
    expect(entry!.validationStatus).toBe(manifest.validation_status);
    expect(entry!.servedItemCount).toBe(manifest.item_count);
    expect(entry!.integralItemCount).toBe(manifest.item_count);
    expect(entry!.scoreRange).toEqual({
      min: manifest.scoring.scale_min,
      max: manifest.scoring.scale_max,
    });
    expect(entry!.sources.map((s) => s.citation)).toEqual(
      manifest.sources.map((s) => s.citation),
    );
  });

  test("isValidatedNCOPSII é derivado fail-closed — false enquanto demonstrativo", () => {
    expect(entry!.isValidatedNCOPSII).toBe(false);
    expect(entry!.isValidatedNCOPSII).toBe(isValidatedLanguageAllowed(manifest));
  });
});

describe("copsoq-instrument-manifest — fail-closed na linguagem", () => {
  test("demonstrativo: linguagem de validado NÃO é permitida", () => {
    expect(manifest.validation_status).toBe("demonstrativo");
    expect(isValidatedLanguageAllowed(manifest)).toBe(false);
  });

  test("nenhuma allowed_claim contém linguagem de validação enquanto demonstrativo", () => {
    for (const claim of manifest.allowed_claims) {
      expect(claim.toLowerCase()).not.toContain("validado");
      expect(claim.toLowerCase()).not.toContain("validada");
    }
  });

  test("forbidden_claims cobre os P0 da auditoria", () => {
    const forbidden = manifest.forbidden_claims.map((claim) => claim.toLowerCase());
    expect(forbidden).toContain("copsoq ii validado");
    expect(forbidden).toContain("aplica o copsoq ii");
    expect(forbidden).toContain("anonimato garantido");
    expect(forbidden).toContain("blindagem jurídica");
    expect(forbidden).toContain("laudo automático");
  });

  test("detector de claims proibidos: pega caixa e acento diferentes", () => {
    expect(findForbiddenClaimMatches("O VitalOS APLICA O COPSOQ II hoje")).toContain(
      "aplica o COPSOQ II",
    );
    expect(findForbiddenClaimMatches("com ANONIMATO GARANTIDO por lei")).toContain(
      "anonimato garantido",
    );
    expect(findForbiddenClaimMatches("oferece blindagem juridica total")).toContain(
      "blindagem jurídica",
    );
  });

  test("detector: texto com linguagem autorizada passa limpo", () => {
    const cleanText =
      "O VitalOS usa uma bateria estruturada nas dimensões do COPSOQ II, com anonimato " +
      "operacional por token e agregação k≥5, e entrega evidência agregada que fundamenta o " +
      "PGR — interpretação por profissional legalmente habilitado.";
    expect(findForbiddenClaimMatches(cleanText)).toEqual([]);
  });

  test("licença: sem licença de versão validada registrada, o status não pode ser validado", () => {
    if (manifest.licence.status === "sem_licenca_de_versao_validada") {
      expect(["validado", "validado_adaptado"]).not.toContain(manifest.validation_status);
    }
  });
});
