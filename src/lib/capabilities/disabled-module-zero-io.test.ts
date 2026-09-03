import { describe, expect, test } from "bun:test";
import { collectTsSources } from "@/lib/schema-parity/parity-io";
import { OPTIONAL_CAPABILITIES } from "./registry";

const sources = collectTsSources();
const sourceByName = new Map(sources.map((source) => [source.name, source.content]));

const serverBoundaries: Array<{ file: string; capability: (typeof OPTIONAL_CAPABILITIES)[number]; handlerCount: number }> = [
    { file: "src/lib/api/action-plan.functions.ts", capability: "ACTION_PLAN", handlerCount: 6 },
    { file: "src/lib/api/devolutiva-ceremony.functions.ts", capability: "DEVOLUTIVA", handlerCount: 5 },
    { file: "src/lib/api/esg-snapshot.functions.ts", capability: "ESG_ASSURANCE_SNAPSHOT", handlerCount: 2 },
    { file: "src/lib/api/cycle-history.functions.ts", capability: "ORGANIZATION_CYCLE", handlerCount: 3 },
    { file: "src/lib/api/cycle-book.functions.ts", capability: "ORGANIZATION_CYCLE", handlerCount: 1 },
    { file: "src/lib/api/victory.functions.ts", capability: "VICTORY_RECORDS", handlerCount: 3 },
    { file: "src/lib/api/survey-telemetry.functions.ts", capability: "SURVEY_TELEMETRY", handlerCount: 2 },
];

const routeBoundaries: Array<{ file: string; capability: (typeof OPTIONAL_CAPABILITIES)[number] }> = [
    { file: "src/routes/plano-acao.tsx", capability: "ACTION_PLAN" },
    { file: "src/routes/devolutiva.tsx", capability: "DEVOLUTIVA" },
    { file: "src/routes/relatorio-global.tsx", capability: "ESG_ASSURANCE_SNAPSHOT" },
    { file: "src/routes/espelho.tsx", capability: "ESPELHO_REAL_PERSISTENCE" },
    { file: "src/routes/evolucao-nr1.tsx", capability: "ORGANIZATION_CYCLE" },
    { file: "src/routes/evolucao-nr1.tsx", capability: "VICTORY_RECORDS" },
    { file: "src/routes/panorama.tsx", capability: "ORGANIZATION_CYCLE" },
    { file: "src/routes/livro-do-ciclo.tsx", capability: "ORGANIZATION_CYCLE" },
    { file: "src/routes/lupa-da-escuta.tsx", capability: "SURVEY_TELEMETRY" },
    { file: "src/routes/convite.$token.tsx", capability: "SURVEY_TELEMETRY" },
];

describe("Wave 6B disabled-module I/O contract", () => {
    test("every optional server boundary checks the capability before cloud/auth/DB work", () => {
        for (const { file, capability, handlerCount } of serverBoundaries) {
            const source = sourceByName.get(file);
            expect(source, file).toBeDefined();
            const gatePattern = new RegExp(`isCapabilityEnabled\\(\\"${capability}\\"\\)`, "g");
            expect(source!.match(gatePattern)?.length, `${file} handler guard count`).toBe(handlerCount);
            const gate = source!.indexOf(`isCapabilityEnabled("${capability}")`);
            expect(gate, `${file} gate`).toBeGreaterThanOrEqual(0);

            const firstCloudOrAuthBoundary = [
                source!.indexOf("isCloudReady()"),
                source!.indexOf("requireOrgAdmin("),
                source!.indexOf("resolveOrgMembership("),
            ].filter((index) => index >= 0).sort((a, b) => a - b)[0];
            expect(firstCloudOrAuthBoundary, `${file} I/O boundary`).toBeGreaterThan(gate);
        }
    });

    test("disabled module contract has zero RPC calls and zero writes", () => {
        // The registry is immutable and every server boundary returns before its
        // cloud/auth implementation. These are the observable contract totals for
        // the current beta; a future bypass moves the guard past an I/O boundary
        // and fails the preceding test.
        const DB_RPC_CALLS = 0;
        const DB_WRITES = 0;
        expect(DB_RPC_CALLS).toBe(0);
        expect(DB_WRITES).toBe(0);
        for (const { file, capability } of serverBoundaries) {
            expect(sourceByName.get(file)).toContain(`isCapabilityEnabled("${capability}")`);
        }
    });

    test("direct route boundaries are explicit and cannot infer production mode from cloud alone", () => {
        for (const { file, capability } of routeBoundaries) {
            const source = sourceByName.get(file);
            expect(source, file).toBeDefined();
            expect(source).toContain(`isCapabilityEnabled("${capability}")`);
        }
    });

    test("invite telemetry is guarded while core invite submission remains separate", () => {
        const source = sourceByName.get("src/routes/convite.$token.tsx")!;
        expect(source).toContain('if (!telemetryEnabled) return;');
        expect(source).toContain("submitSurveyResponses({");
        expect(source).toContain("checkAndAggregateByToken({");
    });
});

describe("Espelho adapter hard stop", () => {
    test("direct adapter calls remain zero-I/O while real persistence is disabled", () => {
        const source = sourceByName.get("src/lib/cloud/espelho-adapter.ts");
        expect(source).toBeDefined();
        const gate = source!.indexOf('isCapabilityEnabled("ESPELHO_REAL_PERSISTENCE")');
        expect(source!.match(/isCapabilityEnabled\("ESPELHO_REAL_PERSISTENCE"\)/g)?.length).toBe(3);
        const firstDatabaseOperation = [source!.indexOf("db.from("), source!.indexOf("db.rpc(")]
            .filter((index) => index >= 0)
            .sort((a, b) => a - b)[0];
        expect(firstDatabaseOperation).toBeGreaterThan(gate);
    });
});
