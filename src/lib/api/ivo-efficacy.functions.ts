// Server functions do protocolo de eficácia (IVO C8): rascunho → registrado →
// observação → parecer. Todas POST, todas `.strict()` (orgId e referências de
// leitura publicada do cliente são recusados), todas exigem a sessão.
// Regras em src/lib/ivo/efficacy-protocol.server.ts. Fora da allowlist HML.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const token = z.string().min(10).optional();
const itemId = z.string().uuid();
const isoDate = z.string().date();
const text = (max: number) => z.string().trim().max(max);

// NÃO há baselineRef aqui: a referência da leitura publicada é derivada no servidor
// (useSourceAsBaseline), nunca declarada pelo cliente.
const draftFields = z
  .object({
    objective: text(500).nullable(),
    indicatorLabel: text(120).nullable(),
    indicatorKind: z.enum(["execucao", "resultado"]).nullable(),
    indicatorOrigin: z.enum(["leitura_publicada", "medida_da_organizacao"]).nullable(),
    unit: text(40).nullable(),
    direction: z.enum(["aumentar", "diminuir"]).nullable(),
    baselineObservedOn: isoDate.nullable(),
    baselinePopulation: text(200).nullable(),
    baselineSource: text(200).nullable(),
    baselineValue: z.number().finite().nullable(),
    targetKind: z.enum(["numerico", "qualitativo"]).nullable(),
    targetValue: z.number().finite().nullable(),
    targetCriterion: text(500).nullable(),
    meaningfulDifference: z.number().finite().min(0).nullable(),
    windowStart: isoDate.nullable(),
    windowEnd: isoDate.nullable(),
    source: text(200).nullable(),
    comparisonRule: z
      .object({ sameCohort: z.boolean(), sameInstrumentVersion: z.boolean(), sameCalculationVersion: z.boolean() })
      .strict()
      .nullable(),
    responsibleRole: text(80).nullable(),
    reviewerRole: text(80).nullable(),
    limitations: z.array(text(300)).max(10),
  })
  .partial()
  .strict();

export const ivoEfficacySchemas = {
  load: z.object({ accessToken: token }).strict(),
  saveDraft: z
    .object({ accessToken: token, itemId, fields: draftFields, useSourceAsBaseline: z.boolean().optional() })
    .strict(),
  itemOnly: z.object({ accessToken: token, itemId }).strict(),
  observation: z
    .object({ accessToken: token, itemId, observedOn: isoDate, value: z.number().finite(), note: text(500).optional() })
    .strict(),
  verdict: z
    .object({
      accessToken: token,
      itemId,
      verdict: z.enum(["meta_atingida", "meta_nao_atingida", "inconclusiva"]),
      evidenceGrade: z.enum(["descritiva", "pre_pos", "comparacao_referencia", "desenho_causal"]),
      attribution: z
        .object({ status: z.enum(["nao_avaliada", "nao_sustentada", "sustentada_por_desenho"]), design: text(1000).optional() })
        .strict()
        .optional(),
      reason: text(1000).optional(),
      limitations: z.array(text(300)).max(10).optional(),
      qualitativeTargetReached: z.boolean().nullable().optional(),
    })
    .strict(),
};

async function efficacy() {
  return import("@/lib/ivo/efficacy-protocol.server");
}

export const loadEfficacyFn = createServerFn({ method: "POST" })
  .inputValidator(ivoEfficacySchemas.load)
  .handler(async ({ data }) => (await efficacy()).loadEfficacyForSession(data));

export const saveEfficacyDraftFn = createServerFn({ method: "POST" })
  .inputValidator(ivoEfficacySchemas.saveDraft)
  .handler(async ({ data }) => (await efficacy()).saveEfficacyDraft(data as Parameters<Awaited<ReturnType<typeof efficacy>>["saveEfficacyDraft"]>[0]));

export const startEfficacyRevisionFn = createServerFn({ method: "POST" })
  .inputValidator(ivoEfficacySchemas.itemOnly)
  .handler(async ({ data }) => (await efficacy()).startEfficacyRevision(data));

export const registerEfficacyProtocolFn = createServerFn({ method: "POST" })
  .inputValidator(ivoEfficacySchemas.itemOnly)
  .handler(async ({ data }) => (await efficacy()).registerEfficacyProtocol(data));

export const recordEfficacyObservationFn = createServerFn({ method: "POST" })
  .inputValidator(ivoEfficacySchemas.observation)
  .handler(async ({ data }) => (await efficacy()).recordEfficacyObservation(data));

export const recordEfficacyVerdictFn = createServerFn({ method: "POST" })
  .inputValidator(ivoEfficacySchemas.verdict)
  .handler(async ({ data }) => (await efficacy()).recordEfficacyVerdict(data));
