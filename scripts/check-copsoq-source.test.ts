import { describe, expect, test } from "bun:test";
import { getCopsoqManifest } from "../src/domain/survey/copsoq-instrument-manifest";
import { getWaveSurvey } from "../src/mocks/survey-mock";
import {
  compareCopsoqSource,
  copsoqSourceReferenceSchema,
  optionsHash,
  textHash,
} from "./check-copsoq-source";

const current = getCopsoqManifest();
const catalogSurvey = getWaveSurvey("enterprise", "COPSOQ")!;
const artifactHash = "a".repeat(64);
const fixture = {
  ...catalogSurvey,
  id: "prova-sintetica",
  items: [
    { id: "fic1", pillarId: "carga", text: "Situação A, apenas sintética." },
    { id: "fic2", pillarId: "carga", text: "Situação B, apenas sintética.", reverse: true },
  ],
};
const syntheticManifest = {
  ...current,
  dimensions: [{ id: "carga", item_ids: ["fic1", "fic2"], kind: "exposure" as const }],
  dimension_count: 1,
};
const screening = {
  artifactSha256: artifactHash,
  edition: "II",
  sourceForm: "ensaio-sintetico",
  sourceLocator: "Documento fictício de teste",
};
const referenceInput = {
  ...screening,
  target: {
    version: current.version,
    form: current.form,
    locale: "pt-BR",
    attributionSha256: textHash(current.attribution),
  },
  items: [
    {
      sourceId: "S1",
      id: "fic1",
      dimensionId: "carga",
      kind: "exposure",
      reverse: false,
      textSha256: textHash("Situação A, apenas sintética."),
      optionsSha256: optionsHash(fixture.scale.options),
    },
    {
      sourceId: "S2",
      id: "fic2",
      dimensionId: "carga",
      kind: "exposure",
      reverse: true,
      textSha256: textHash("Situação B, apenas sintética."),
      optionsSha256: optionsHash(fixture.scale.options),
    },
  ],
  scoring: {
    rulesLocator: "Regras sintéticas de teste",
    cases: [
      // Após reversão, a primeira linha tem média 1 e a segunda 4,5. A média do grupo é 2,75.
      {
        id: "completa",
        responses: [
          [1, 5],
          [4, 1],
        ],
        expected: { carga: { mean: 2.75, n: 2 } },
      },
      { id: "ausencia", responses: [[1, null]], expected: null },
    ],
  },
};

function evaluate(input: unknown = referenceInput, hash = artifactHash) {
  return compareCopsoqSource(
    copsoqSourceReferenceSchema.parse(input),
    hash,
    fixture,
    syntheticManifest,
  );
}

describe("conferência offline da fonte Q1", () => {
  test("pares sintéticos compatíveis comprovam os casos de reversão e ausência", () => {
    expect(evaluate()).toMatchObject({
      result: "CASOS_COMPATIVEIS",
      differences: [],
      incomplete: [],
      scoringCasesCompared: 2,
    });
    expect(textHash("Situação".normalize("NFD"))).toBe(textHash("Situação"));
  });

  test("contagem igual no runtime continua incompleta; formatos por item e edição III divergem", () => {
    const checkCatalog = (input: unknown) =>
      compareCopsoqSource(
        copsoqSourceReferenceSchema.parse(input),
        artifactHash,
        catalogSurvey,
        current,
      );
    expect(checkCatalog({ ...screening, itemCount: 41 })).toMatchObject({
      result: "INCOMPLETO",
      incomplete: ["vinculo_ao_manifesto", "conferencia_item_a_item", "casos_de_pontuacao"],
    });
    expect(checkCatalog({ ...screening, itemCount: 40 }).differences).toEqual([
      { check: "quantidade_de_itens" },
    ]);
    const alternate = checkCatalog({ ...screening, edition: "III", uniformOptions: false });
    expect(alternate).toMatchObject({
      result: "DIVERGENTE",
      differences: [{ check: "edicao" }, { check: "opcoes_por_item" }],
      scoringCasesCompared: 0,
    });
  });

  test("hash do documento errado impede o uso da transcrição e dos casos", () => {
    expect(evaluate(referenceInput, "b".repeat(64))).toMatchObject({
      result: "DIVERGENTE",
      differences: [{ check: "artefato_sha256" }],
      scoringCasesCompared: 0,
    });
  });

  test("detecta texto, opção, inversão e dimensão mesmo com os mesmos IDs e contagem", () => {
    const modified = {
      ...referenceInput.items[0],
      dimensionId: "desfecho",
      reverse: true,
      textSha256: textHash("Paráfrase"),
      optionsSha256: optionsHash([...fixture.scale.options].reverse()),
    };
    const result = evaluate({ ...referenceInput, items: [modified, referenceInput.items[1]] });
    expect(result.differences.map(({ check }) => check)).toEqual([
      "texto",
      "dimensao",
      "reversao",
      "opcoes",
    ]);
    expect(result.scoringCasesCompared).toBe(0);
    expect(JSON.stringify(result)).not.toContain("Paráfrase");
  });

  test("identidade, atribuição e ordem precisam corresponder ao manifesto e à coleta", () => {
    const result = evaluate({
      ...referenceInput,
      target: {
        ...referenceInput.target,
        version: "outra-versao",
        attributionSha256: "c".repeat(64),
      },
      items: [...referenceInput.items].reverse(),
    });
    expect(result.differences.map(({ check }) => check)).toEqual([
      "identidade_do_manifesto",
      "atribuicao",
      "item_ou_ordem",
      "item_ou_ordem",
    ]);
  });

  test("pontuação diferente e aceitação de ausência incompatível são resultados distintos do caso positivo", () => {
    const result = evaluate({
      ...referenceInput,
      scoring: {
        ...referenceInput.scoring,
        cases: [
          { ...referenceInput.scoring.cases[0], expected: { carga: { mean: 43.75, n: 2 } } },
          { ...referenceInput.scoring.cases[1], expected: { carga: { mean: 1, n: 1 } } },
        ],
      },
    });
    expect(result).toMatchObject({
      result: "DIVERGENTE",
      scoringCasesCompared: 2,
      differences: [
        { check: "pontuacao", id: "completa" },
        { check: "pontuacao", id: "ausencia" },
      ],
    });
  });

  test("ausência explícita não pode mascarar valores ou comprimentos fora do instrumento", () => {
    for (const row of [
      [null, 8],
      [1, null, 5],
    ]) {
      const input = {
        ...referenceInput,
        scoring: {
          ...referenceInput.scoring,
          cases: [
            referenceInput.scoring.cases[0],
            { ...referenceInput.scoring.cases[1], responses: [row] },
          ],
        },
      };
      expect(evaluate(input).differences).toEqual([{ check: "formato_do_caso", id: "ausencia" }]);
    }
  });

  test("recusa registro duplicado e divergência interna na contagem", () => {
    for (const duplicate of [
      { ...referenceInput.items[1], sourceId: "S1" },
      { ...referenceInput.items[1], id: "fic1" },
    ]) {
      expect(
        copsoqSourceReferenceSchema.safeParse({
          ...referenceInput,
          items: [referenceInput.items[0], duplicate],
        }).success,
      ).toBe(false);
    }
    expect(copsoqSourceReferenceSchema.safeParse({ ...referenceInput, itemCount: 3 }).success).toBe(
      false,
    );
    const positive = referenceInput.scoring.cases[0];
    const result = evaluate({
      ...referenceInput,
      scoring: { ...referenceInput.scoring, cases: [positive, { ...positive, id: "completa-2" }] },
    });
    expect(result).toMatchObject({ result: "INCOMPLETO", incomplete: ["cobertura_de_pontuacao"] });
  });
});
