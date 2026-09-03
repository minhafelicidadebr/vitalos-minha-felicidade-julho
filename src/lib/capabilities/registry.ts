/**
 * Canonical application capability policy for the current beta.
 *
 * This module is intentionally pure: it imports no auth, Supabase, route, or
 * environment code. Production-backed optional modules remain disabled until
 * their database contracts are deliberately shipped and audited. A capability
 * being available is also not permission to start real FIB-T collection.
 */

export const CAPABILITY_IDS = [
    "FIBT_CORE",
    "ACTION_PLAN",
    "DEVOLUTIVA",
    "ESG_ASSURANCE_SNAPSHOT",
    "ESPELHO_REAL_PERSISTENCE",
    "ORGANIZATION_CYCLE",
    "VICTORY_RECORDS",
    "SURVEY_TELEMETRY",
] as const;

export type CapabilityId = (typeof CAPABILITY_IDS)[number];
export type OptionalCapabilityId = Exclude<CapabilityId, "FIBT_CORE">;

export type CapabilityMode = "core" | "production" | "demo" | "disabled";

export interface CapabilityDefinition {
    readonly id: CapabilityId;
    readonly available: boolean;
    readonly enabled: boolean;
    readonly realProductionCollectionEnabled: boolean;
    readonly demoAvailable: boolean;
    readonly mode: CapabilityMode;
    readonly reason: string;
}

const OPTIONAL_DISABLED_REASON =
    "Este módulo está temporariamente indisponível: o contrato de produção ainda não está habilitado neste beta.";

export const CAPABILITY_REGISTRY: Readonly<Record<CapabilityId, CapabilityDefinition>> = Object.freeze({
    FIBT_CORE: {
        id: "FIBT_CORE",
        available: true,
        enabled: true,
        realProductionCollectionEnabled: false,
        demoAvailable: true,
        mode: "core",
        reason: "Contrato FIB-T core disponível; coleta real continua sendo um gate humano G3.",
    },
    ACTION_PLAN: {
        id: "ACTION_PLAN",
        available: false,
        enabled: false,
        realProductionCollectionEnabled: false,
        demoAvailable: true,
        mode: "disabled",
        reason: OPTIONAL_DISABLED_REASON,
    },
    DEVOLUTIVA: {
        id: "DEVOLUTIVA",
        available: false,
        enabled: false,
        realProductionCollectionEnabled: false,
        demoAvailable: true,
        mode: "disabled",
        reason: OPTIONAL_DISABLED_REASON,
    },
    ESG_ASSURANCE_SNAPSHOT: {
        id: "ESG_ASSURANCE_SNAPSHOT",
        available: false,
        enabled: false,
        realProductionCollectionEnabled: false,
        demoAvailable: true,
        mode: "disabled",
        reason: OPTIONAL_DISABLED_REASON,
    },
    ESPELHO_REAL_PERSISTENCE: {
        id: "ESPELHO_REAL_PERSISTENCE",
        available: false,
        enabled: false,
        realProductionCollectionEnabled: false,
        demoAvailable: true,
        mode: "demo",
        reason: OPTIONAL_DISABLED_REASON,
    },
    ORGANIZATION_CYCLE: {
        id: "ORGANIZATION_CYCLE",
        available: false,
        enabled: false,
        realProductionCollectionEnabled: false,
        demoAvailable: true,
        mode: "disabled",
        reason: OPTIONAL_DISABLED_REASON,
    },
    VICTORY_RECORDS: {
        id: "VICTORY_RECORDS",
        available: false,
        enabled: false,
        realProductionCollectionEnabled: false,
        demoAvailable: true,
        mode: "disabled",
        reason: OPTIONAL_DISABLED_REASON,
    },
    SURVEY_TELEMETRY: {
        id: "SURVEY_TELEMETRY",
        available: false,
        enabled: false,
        realProductionCollectionEnabled: false,
        demoAvailable: false,
        mode: "disabled",
        reason: OPTIONAL_DISABLED_REASON,
    },
});

export interface CapabilityContext {
    cloudReady?: boolean;
    hasOrgSession?: boolean;
    isOrgAdmin?: boolean;
}

/**
 * Resolve the policy for a caller. Context is accepted for future policy
 * decisions and for route ergonomics, but cannot turn on an absent contract.
 */
export function resolveCapabilities(_context: CapabilityContext = {}): Readonly<Record<CapabilityId, CapabilityDefinition>> {
    return CAPABILITY_REGISTRY;
}

export function getCapability(
    id: CapabilityId,
    context: CapabilityContext = {},
): CapabilityDefinition {
    return resolveCapabilities(context)[id];
}

export function isCapabilityEnabled(id: CapabilityId, context: CapabilityContext = {}): boolean {
    return getCapability(id, context).enabled;
}

export const OPTIONAL_CAPABILITIES: readonly OptionalCapabilityId[] = CAPABILITY_IDS.filter(
    (id): id is OptionalCapabilityId => id !== "FIBT_CORE",
);

export const CAPABILITY_DISABLED_REASON = OPTIONAL_DISABLED_REASON;
