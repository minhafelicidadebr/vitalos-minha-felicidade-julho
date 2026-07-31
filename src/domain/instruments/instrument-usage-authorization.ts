// Registro de autorizacao de USO de instrumentos — generico, fail-closed.
//
// Duas perguntas distintas, deliberadamente em campos distintos:
//
//   instrument_usage_authorization.status
//     "Temos direito de aplicar este instrumento?"
//     Muda por decisao do responsavel/licenciante.
//
//   operational_real_collection_status
//     "A plataforma esta pronta para coletar dado real de pessoas?"
//     Muda por gates de producao, backup, restauracao, seguranca e release.
//
// Colapsar as duas em um unico booleano (`authorized_for_real_collection`) foi
// um erro de modelagem: fazia um bloqueio de engenharia parecer pendencia de
// licenca, e faria uma licenca confirmada parecer autorizacao para coletar.

import raw from "./instrument-usage-authorization.json";

export type UsageAuthorizationStatus = "confirmed" | "pending" | "denied";
export type UsagePermission = "allowed" | "not_allowed";

/** Estados operacionais. Só `released` permite coleta real. */
export type OperationalCollectionStatus =
  | "blocked_until_release_gate"
  | "released"
  | "suspended";

export interface InstrumentUsageAuthorization {
  status: UsageAuthorizationStatus;
  source: string;
  confirmed_by: string;
  confirmed_at: string | null;
  digital_implementation: UsagePermission;
  institutional_application: UsagePermission;
  aggregated_reporting: UsagePermission;
  evidence_reference: string | null;
  evidence_reference_status: string;
  evidence_note: string;
}

export interface InstrumentAuthorizationEntry {
  instrument_id: string;
  instrument_label: string;
  instrument_usage_authorization: InstrumentUsageAuthorization;
  operational_real_collection_status: OperationalCollectionStatus;
  operational_gates_pending: string[];
  operational_note: string;
}

export interface UsageAuthorizationRegistry {
  registry_version: string;
  note: string;
  second_note: string;
  authorizations: InstrumentAuthorizationEntry[];
}

export class UsageAuthorizationError extends Error {
  constructor(message: string) {
    super(`[instrument-usage-authorization] ${message}`);
    this.name = "UsageAuthorizationError";
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const k of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[k]);
    }
  }
  return value;
}

const VALID_STATUS = new Set<string>(["confirmed", "pending", "denied"]);
const VALID_OPERATIONAL = new Set<string>([
  "blocked_until_release_gate",
  "released",
  "suspended",
]);

export function validateUsageAuthorizationRegistry(r: UsageAuthorizationRegistry): void {
  if (r.authorizations.length === 0) throw new UsageAuthorizationError("registro vazio");

  const seen = new Set<string>();
  for (const e of r.authorizations) {
    if (seen.has(e.instrument_id)) {
      throw new UsageAuthorizationError(`instrumento duplicado: ${e.instrument_id}`);
    }
    seen.add(e.instrument_id);

    const a = e.instrument_usage_authorization;
    if (!VALID_STATUS.has(a.status)) {
      throw new UsageAuthorizationError(`status invalido para ${e.instrument_id}: ${a.status}`);
    }
    if (!VALID_OPERATIONAL.has(e.operational_real_collection_status)) {
      throw new UsageAuthorizationError(
        `status operacional invalido para ${e.instrument_id}: ${e.operational_real_collection_status}`,
      );
    }
    if (a.status === "confirmed") {
      if (!a.source.trim()) {
        throw new UsageAuthorizationError(`${e.instrument_id}: autorizacao confirmada exige origem`);
      }
      if (!a.confirmed_by.trim()) {
        throw new UsageAuthorizationError(`${e.instrument_id}: autorizacao confirmada exige responsavel`);
      }
    }
    // Coleta real liberada exige AMBOS: direito de uso e gates operacionais vencidos.
    if (e.operational_real_collection_status === "released") {
      if (a.status !== "confirmed") {
        throw new UsageAuthorizationError(
          `${e.instrument_id}: coleta real liberada sem autorizacao de uso confirmada`,
        );
      }
      if (e.operational_gates_pending.length > 0) {
        throw new UsageAuthorizationError(
          `${e.instrument_id}: coleta real liberada com ${e.operational_gates_pending.length} gate(s) pendente(s)`,
        );
      }
    }
  }
}

const registry = raw as unknown as UsageAuthorizationRegistry;
validateUsageAuthorizationRegistry(registry);
deepFreeze(registry);

export function getUsageAuthorizationRegistry(): UsageAuthorizationRegistry {
  return registry;
}

export function findInstrumentAuthorization(
  instrumentId: string,
): InstrumentAuthorizationEntry | undefined {
  return registry.authorizations.find((a) => a.instrument_id === instrumentId);
}

/** Temos direito de aplicar o instrumento? (nao diz nada sobre prontidao operacional) */
export function isInstrumentUsageAuthorized(instrumentId: string): boolean {
  return findInstrumentAuthorization(instrumentId)?.instrument_usage_authorization.status === "confirmed";
}

/** A plataforma pode coletar dado real de pessoas? Fail-closed: desconhecido = nao. */
export function isRealCollectionOperationallyReleased(instrumentId: string): boolean {
  return findInstrumentAuthorization(instrumentId)?.operational_real_collection_status === "released";
}
