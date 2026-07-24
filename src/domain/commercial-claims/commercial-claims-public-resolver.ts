// Resolver PÚBLICO — o único que código client-reachable (landing-copy.ts,
// bundlado tanto no servidor quanto no navegador) pode importar. Fechamento
// H2.1B §3/§4: lê SÓ a projeção mínima já resolvida em build-time
// (commercial-claims-public-projection.json — {claimId, variant, surfaceId,
// text}, nunca limitations/source_refs/owner_role/datas), e NUNCA importa
// o registry completo nem chama `new Date()`.
//
// Determinístico por construção: mesmo input sempre devolve o mesmo
// resultado, independente do relógio do dispositivo, porque não há relógio
// envolvido — é busca em um array estático congelado no build.
//
// Expiração é responsabilidade do GATE (bun test roda
// commercial-claims-registry.test.ts, que falha se um claim approved
// estiver vencido) e da GERAÇÃO da projeção (scripts/generate-commercial-
// claims-public-projection.ts, que usa o resolver COMPLETO — esse sim com
// Date() — mas roda em Node/Bun no build, nunca no navegador). Se o gate
// passou e a projeção foi regenerada, o que está aqui já é aprovado.

import projectionJson from "./commercial-claims-public-projection.json";

export interface PublicCommercialClaimText {
  readonly claimId: string;
  readonly variant: string;
  readonly surfaceId: string;
  readonly text: string;
}

interface ProjectionEntry {
  claimId: string;
  variant: string;
  surfaceId: string;
  text: string;
}

interface ProjectionFile {
  schema_version: string;
  generated_from_registry_version: string;
  entries: ProjectionEntry[];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

const PROJECTION: ProjectionFile = deepFreeze(structuredClone(projectionJson) as ProjectionFile);

export class PublicCommercialClaimNotFoundError extends Error {
  constructor(message: string) {
    super(`[commercial-claims-public-resolver] ${message}`);
    this.name = "PublicCommercialClaimNotFoundError";
  }
}

export interface ResolvePublicCommercialClaimInput {
  claimId: string;
  variant: string;
  surfaceId: string;
}

/**
 * Busca determinística na projeção já resolvida — nenhum I/O, nenhum
 * relógio, nenhum acesso ao registry completo. Fail-closed: combinação
 * ausente da projeção lança (nunca string vazia/fallback).
 */
export function resolvePublicCommercialClaim(
  input: ResolvePublicCommercialClaimInput,
): PublicCommercialClaimText {
  const entry = PROJECTION.entries.find(
    (e) =>
      e.claimId === input.claimId &&
      e.variant === input.variant &&
      e.surfaceId === input.surfaceId,
  );

  if (!entry) {
    throw new PublicCommercialClaimNotFoundError(
      `nenhuma entrada na projeção pública para claimId="${input.claimId}" variant="${input.variant}" surfaceId="${input.surfaceId}". ` +
        `Rode "bun run scripts/generate-commercial-claims-public-projection.ts" se o binding é novo.`,
    );
  }

  return Object.freeze({
    claimId: entry.claimId,
    variant: entry.variant,
    surfaceId: entry.surfaceId,
    text: entry.text,
  });
}
