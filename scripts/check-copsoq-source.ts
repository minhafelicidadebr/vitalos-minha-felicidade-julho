import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  getCopsoqManifest,
  type CopsoqInstrumentManifest,
} from "../src/domain/survey/copsoq-instrument-manifest";
import { aggregateValidatedResponses } from "../src/engine/aggregation/response-aggregation-engine";
import { validateBlindSubmission } from "../src/engine/survey/response-capture-engine";
import {
  isAllowedSurveyValue,
  type SurveyDefinition,
  type SurveyScaleOption,
} from "../src/engine/survey/survey-engine";
import { getWaveSurvey } from "../src/mocks/survey-mock";

const id = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/i);
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const locator = z.string().trim().min(1);

const itemSchema = z
  .object({
    sourceId: id,
    id,
    dimensionId: id,
    kind: z.enum(["exposure", "outcome"]),
    reverse: z.boolean(),
    textSha256: sha256,
    optionsSha256: sha256,
  })
  .strict();

const scoringCaseSchema = z
  .object({
    id,
    responses: z.array(z.array(z.number().finite().nullable()).min(1)).min(1),
    expected: z
      .record(id, z.object({ mean: z.number().finite(), n: z.number().int().positive() }).strict())
      .nullable(),
  })
  .strict();
type ScoringCase = z.infer<typeof scoringCaseSchema>;

// A ficha pode documentar uma fonte parcial. Só a ficha completa pode passar na comparação.
export const copsoqSourceReferenceSchema = z
  .object({
    artifactSha256: sha256,
    edition: z.enum(["II", "III"]),
    sourceForm: id,
    sourceLocator: locator,
    itemCount: z.number().int().positive().optional(),
    uniformOptions: z.boolean().optional(),
    target: z
      .object({ version: id, form: id, locale: z.literal("pt-BR"), attributionSha256: sha256 })
      .strict()
      .optional(),
    items: z
      .array(itemSchema)
      .min(1)
      .refine(
        (items) =>
          new Set(items.map((item) => item.id)).size === items.length &&
          new Set(items.map((item) => item.sourceId)).size === items.length,
      )
      .optional(),
    scoring: z
      .object({
        rulesLocator: locator,
        cases: z
          .array(scoringCaseSchema)
          .min(2)
          .refine((cases) => new Set(cases.map((example) => example.id)).size === cases.length),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (reference) =>
      reference.itemCount === undefined ||
      !reference.items ||
      reference.itemCount === reference.items.length,
  );
type SourceReference = z.infer<typeof copsoqSourceReferenceSchema>;

interface Finding {
  check: string;
  id?: string;
}

export function textHash(text: string): string {
  return createHash("sha256").update(text.normalize("NFC"), "utf8").digest("hex");
}

export function optionsHash(options: readonly SurveyScaleOption[]): string {
  return textHash(
    JSON.stringify(options.map(({ value, label }) => [value, label.normalize("NFC")])),
  );
}

function matchesCase(example: ScoringCase, survey: SurveyDefinition): boolean {
  const submissions = example.responses.map((row, index) => ({
    submissionId: `synthetic-${index}`,
    waveId: "synthetic-q1",
    surveyId: survey.id,
    answers: row.flatMap((value, position) =>
      value === null ? [] : [{ itemId: survey.items[position].id, value }],
    ),
  }));

  if (submissions.some((submission) => !validateBlindSubmission(submission, survey).valid)) {
    return example.expected === null;
  }

  const values = survey.scale.options.map((option) => option.value);
  const items = survey.items.map(({ id: itemId, pillarId, reverse }) => ({
    itemId,
    pillarId,
    reverse,
  }));
  const result = aggregateValidatedResponses(submissions, items, {
    min: Math.min(...values),
    max: Math.max(...values),
  });
  const expected = example.expected;
  return (
    result.valid &&
    expected !== null &&
    result.privatePillars.length === Object.keys(expected).length &&
    result.privatePillars.every(
      ({ pillarId, mean, n }) => expected[pillarId]?.mean === mean && expected[pillarId]?.n === n,
    )
  );
}

export function compareCopsoqSource(
  reference: SourceReference,
  artifactSha256: string,
  survey: SurveyDefinition,
  manifest: CopsoqInstrumentManifest,
) {
  const differences: Finding[] = [];
  const incomplete: string[] = [];
  let scoringCasesCompared = 0;
  const referenceItemCount = reference.items?.length ?? reference.itemCount;

  if (reference.artifactSha256 !== artifactSha256) {
    differences.push({ check: "artefato_sha256" });
  } else {
    const servedEdition = /\bCOPSOQ\s+(III|II)\b/i.exec(manifest.official_name)?.[1]?.toUpperCase();
    if (reference.edition !== servedEdition) differences.push({ check: "edicao" });
    if (referenceItemCount !== undefined && referenceItemCount !== survey.items.length) {
      differences.push({ check: "quantidade_de_itens" });
    }
    // SurveyDefinition disponibiliza uma única sequência de opções para todos os itens.
    if (reference.uniformOptions === false) differences.push({ check: "opcoes_por_item" });

    if (!reference.target) incomplete.push("vinculo_ao_manifesto");
    else {
      if (
        reference.target.version !== manifest.version ||
        reference.target.form !== manifest.form ||
        reference.target.locale !== manifest.locale
      ) {
        differences.push({ check: "identidade_do_manifesto" });
      }
      if (reference.target.attributionSha256 !== textHash(manifest.attribution)) {
        differences.push({ check: "atribuicao" });
      }
    }

    if (!reference.items) incomplete.push("conferencia_item_a_item");
    else {
      const kinds = new Map(
        manifest.dimensions.map(({ id: dimensionId, kind }) => [dimensionId, kind]),
      );
      const servedOptions = optionsHash(survey.scale.options);
      for (const [position, item] of reference.items.entries()) {
        const served = survey.items[position];
        if (!served || item.id !== served.id) {
          differences.push({ check: "item_ou_ordem", id: item.sourceId });
          continue;
        }
        if (item.textSha256 !== textHash(served.text))
          differences.push({ check: "texto", id: item.sourceId });
        if (item.dimensionId !== served.pillarId || item.kind !== kinds.get(served.pillarId)) {
          differences.push({ check: "dimensao", id: item.sourceId });
        }
        if (item.reverse !== (served.reverse === true))
          differences.push({ check: "reversao", id: item.sourceId });
        if (item.optionsSha256 !== servedOptions)
          differences.push({ check: "opcoes", id: item.sourceId });
      }
    }

    const cases = reference.scoring?.cases;
    if (!cases || differences.length > 0 || incomplete.length > 0) {
      incomplete.push("casos_de_pontuacao");
    } else {
      if (
        !cases.some(
          ({ responses, expected }) =>
            expected !== null && responses.every((row) => !row.includes(null)),
        ) ||
        !cases.some(({ responses }) => responses.some((row) => row.includes(null)))
      ) {
        incomplete.push("cobertura_de_pontuacao");
      }
      for (const example of cases) {
        if (
          example.responses.some(
            (row) =>
              row.length !== survey.items.length ||
              row.some((value) => value !== null && !isAllowedSurveyValue(survey.scale, value)),
          )
        ) {
          differences.push({ check: "formato_do_caso", id: example.id });
          continue;
        }
        scoringCasesCompared++;
        if (!matchesCase(example, survey)) differences.push({ check: "pontuacao", id: example.id });
      }
    }
  }

  return {
    result: differences.length
      ? "DIVERGENTE"
      : incomplete.length
        ? "INCOMPLETO"
        : "CASOS_COMPATIVEIS",
    source: {
      edition: reference.edition,
      form: reference.sourceForm,
      items: referenceItemCount ?? null,
    },
    served: {
      version: manifest.version,
      form: manifest.form,
      items: survey.items.length,
      dimensions: manifest.dimension_count,
    },
    differences,
    incomplete,
    scoringCasesCompared,
  };
}

if (import.meta.main) {
  const [referencePath, artifactPath, ...rest] = process.argv.slice(2);
  if (!referencePath || !artifactPath || rest.length > 0) {
    console.error(
      "Uso: bun --no-env-file scripts/check-copsoq-source.ts <ficha.json> <artefato-fonte>",
    );
    process.exit(2);
  }
  try {
    const reference = copsoqSourceReferenceSchema.parse(
      JSON.parse(readFileSync(referencePath, "utf8")),
    );
    const artifactSha256 = createHash("sha256").update(readFileSync(artifactPath)).digest("hex");
    const survey = getWaveSurvey("enterprise", "COPSOQ");
    if (!survey) throw new Error("bateria_ausente");
    const report = compareCopsoqSource(reference, artifactSha256, survey, getCopsoqManifest());
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.result === "CASOS_COMPATIVEIS" ? 0 : 1;
  } catch {
    console.error("Entrada inválida: confira a ficha JSON, o documento e a bateria servida.");
    process.exitCode = 2;
  }
}
