// Loader do Commercial Claims Registry (H2.1B MVP) — fail-closed, readonly,
// deep-frozen. Espelha a doutrina do copsoq-instrument-manifest.ts, mas com
// validação estrutural em RUNTIME (não só em teste): dado malformado nunca
// chega ao resolver.
//
// Decisão de design (documentada, §8 do super prompt pedia "rejeitar claim
// vencido" no loader): expiração NÃO é malformação estrutural — é estado
// temporal que muda sem nenhum deploy. Jogar o módulo inteiro fora no import
// assim que uma data vence tornaria o app frágil pelo motivo errado. Por
// isso: (1) o loader valida e recusa tudo que é estruturalmente inválido
// (schema, IDs duplicados, data incoerente, claim aprovado sem revisão), e
// (2) expiração é uma função pura (isClaimExpired) que o RESOLVER usa para
// recusar resolução de claim vencido — e um teste dedicado
// (commercial-claims-registry.test.ts) falha o gate se algum claim approved
// já estiver vencido. Duas camadas, cada uma no lugar certo.

import Ajv from "ajv";
import registryJson from "./commercial-claims-registry.json";
import registrySchema from "./commercial-claims-registry.schema.json";
import type {
  CommercialClaimEntry,
  CommercialClaimsRegistryFile,
} from "./commercial-claim-types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

function assertValidDate(field: string, claimId: string, value: string): void {
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(
      `[commercial-claims-registry] ${claimId}: campo "${field}" não é uma data ISO válida (recebido "${value}").`,
    );
  }
}

/** Valida um registry cru (JSON já parseado) e devolve o mesmo objeto, sem side effects. */
export function validateCommercialClaimsRegistry(
  raw: unknown,
): CommercialClaimsRegistryFile {
  // Ajv compiles schemas with `new Function`, which the production server runtime
  // forbids (EvalError). There the schema check is skipped; the same JSON is
  // schema-validated in tests/CI and the manual checks below still run.
  let validate: ReturnType<Ajv["compile"]> | null = null;
  try {
    validate = new Ajv({ allErrors: true, strict: false }).compile(registrySchema);
  } catch (error) {
    if (!(error instanceof EvalError)) throw error;
  }
  if (validate && !validate(raw)) {
    const messages = (validate!.errors ?? [])
      .map((e) => `${e.instancePath || "/"} ${e.message}`)
      .join("; ");
    throw new Error(`[commercial-claims-registry] schema inválido: ${messages}`);
  }

  const registry = raw as unknown as CommercialClaimsRegistryFile;

  const seenClaimIds = new Set<string>();
  for (const claim of registry.claims) {
    // ID duplicado.
    if (seenClaimIds.has(claim.claim_id)) {
      throw new Error(
        `[commercial-claims-registry] claim_id duplicado: "${claim.claim_id}".`,
      );
    }
    seenClaimIds.add(claim.claim_id);

    // Surface IDs duplicados dentro da MESMA entrada.
    const surfaceSet = new Set(claim.allowed_surface_ids);
    if (surfaceSet.size !== claim.allowed_surface_ids.length) {
      throw new Error(
        `[commercial-claims-registry] ${claim.claim_id}: allowed_surface_ids tem duplicata.`,
      );
    }

    // Variante vazia (schema já garante minLength, mas confere ao menos 1 chave).
    if (Object.keys(claim.variants).length === 0) {
      throw new Error(`[commercial-claims-registry] ${claim.claim_id}: sem nenhuma variante.`);
    }

    // Claim sem fonte (schema já garante minItems 1, mas confere não-vazio de fato).
    if (claim.source_refs.length === 0) {
      throw new Error(`[commercial-claims-registry] ${claim.claim_id}: sem source_refs.`);
    }

    // owner_role ausente (schema garante minLength 1; string vazia após trim ainda falha aqui).
    if (claim.owner_role.trim().length === 0) {
      throw new Error(`[commercial-claims-registry] ${claim.claim_id}: owner_role vazio.`);
    }

    // Datas válidas.
    assertValidDate("reviewed_at", claim.claim_id, claim.reviewed_at);
    assertValidDate("review_due_at", claim.claim_id, claim.review_due_at);

    // review_due_at < reviewed_at é sempre um erro de configuração.
    if (Date.parse(claim.review_due_at) < Date.parse(claim.reviewed_at)) {
      throw new Error(
        `[commercial-claims-registry] ${claim.claim_id}: review_due_at (${claim.review_due_at}) é anterior a reviewed_at (${claim.reviewed_at}).`,
      );
    }

    // Claim approved sem data de revisão coerente já foi coberto acima (schema exige
    // reviewed_at/review_due_at sempre presentes); aqui garantimos que um "approved"
    // não pode ter datas ausentes/zeradas por engano (defesa redundante e explícita).
    if (claim.status === "approved" && (!claim.reviewed_at || !claim.review_due_at)) {
      throw new Error(
        `[commercial-claims-registry] ${claim.claim_id}: status approved exige reviewed_at e review_due_at.`,
      );
    }
  }

  return registry;
}

const REGISTRY: CommercialClaimsRegistryFile = deepFreeze(
  validateCommercialClaimsRegistry(structuredClone(registryJson)),
);

/** O registry congelado — única porta de leitura. */
export function getCommercialClaimsRegistry(): CommercialClaimsRegistryFile {
  return REGISTRY;
}

export function findCommercialClaim(claimId: string): CommercialClaimEntry | undefined {
  return REGISTRY.claims.find((c) => c.claim_id === claimId);
}

/** Pura: vencido = review_due_at < agora (UTC, comparação por data). Nunca muta o registry. */
export function isClaimExpired(claim: CommercialClaimEntry, now: Date = new Date()): boolean {
  return Date.parse(claim.review_due_at) < now.getTime();
}
