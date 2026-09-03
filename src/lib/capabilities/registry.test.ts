import { describe, expect, test } from "bun:test";
import {
    CAPABILITY_DISABLED_REASON,
    CAPABILITY_REGISTRY,
    CAPABILITY_IDS,
    OPTIONAL_CAPABILITIES,
    getCapability,
    isCapabilityEnabled,
    resolveCapabilities,
} from "./registry";

describe("Wave 6B canonical capability registry", () => {
    test("has exactly the required logical capabilities", () => {
        expect([...CAPABILITY_IDS]).toEqual([
            "FIBT_CORE",
            "ACTION_PLAN",
            "DEVOLUTIVA",
            "ESG_ASSURANCE_SNAPSHOT",
            "ESPELHO_REAL_PERSISTENCE",
            "ORGANIZATION_CYCLE",
            "VICTORY_RECORDS",
            "SURVEY_TELEMETRY",
        ]);
    });

    test("fails closed for every optional production-backed capability", () => {
        for (const id of OPTIONAL_CAPABILITIES) {
            const capability = getCapability(id);
            expect(capability.available).toBe(false);
            expect(capability.enabled).toBe(false);
            expect(capability.realProductionCollectionEnabled).toBe(false);
            expect(capability.reason).toBe(CAPABILITY_DISABLED_REASON);
            expect(isCapabilityEnabled(id)).toBe(false);
        }
    });

    test("session and cloud context cannot activate an absent contract", () => {
        const contexts = [
            {},
            { cloudReady: true },
            { cloudReady: true, hasOrgSession: true },
            { cloudReady: true, hasOrgSession: true, isOrgAdmin: true },
        ];
        for (const context of contexts) {
            const resolved = resolveCapabilities(context);
            expect(resolved.FIBT_CORE.enabled).toBe(true);
            for (const id of OPTIONAL_CAPABILITIES) expect(resolved[id].enabled).toBe(false);
        }
    });

    test("keeps demo Espelho local while forbidding real persistence", () => {
        const espelho = CAPABILITY_REGISTRY.ESPELHO_REAL_PERSISTENCE;
        expect(espelho.mode).toBe("demo");
        expect(espelho.demoAvailable).toBe(true);
        expect(espelho.realProductionCollectionEnabled).toBe(false);
        expect(espelho.enabled).toBe(false);
    });

    test("FIB-T core availability is not real collection authorization", () => {
        const core = CAPABILITY_REGISTRY.FIBT_CORE;
        expect(core.available).toBe(true);
        expect(core.enabled).toBe(true);
        expect(core.realProductionCollectionEnabled).toBe(false);
    });
});
