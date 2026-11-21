import { describe, expect, test } from "bun:test";
import { checkModule, moduleForInstrument } from "./module-access.server";
import { moduleSchemas, type ModuleState } from "./module-contract";
describe("Habilitação independente da empresa", () => {
  for (const q1 of [false, true])
    for (const q2 of [false, true]) {
      test(`Q1=${q1}, Q2=${q2}: contrato e método independentes`, async () => {
        const read = async (): Promise<ModuleState[]> => [
          { module: "Q1", enabled: q1, revision: 1 },
          { module: "Q2", enabled: q2, revision: 1 },
        ];
        const first = await checkModule("alfa", "Q1", read);
        expect(first.ok).toBe(false);
        if (!first.ok) expect(first.reason).toBe(q1 ? "method_pending" : "disabled");
        expect((await checkModule("alfa", "Q2", read)).ok).toBe(q2);
      });
    }
  test("ausência, erro e exceção negam; nova leitura observa desabilitação", async () => {
    expect((await checkModule("alfa", "Q2", async () => [])).ok).toBe(false);
    expect((await checkModule("alfa", "Q2", async () => null)).ok).toBe(false);
    expect(
      (
        await checkModule("alfa", "Q2", async () => {
          throw new Error("offline");
        })
      ).ok,
    ).toBe(false);
    let enabled = true;
    const read = async (): Promise<ModuleState[]> => [{ module: "Q2", enabled, revision: 1 }];
    expect((await checkModule("alfa", "Q2", read)).ok).toBe(true);
    enabled = false;
    expect((await checkModule("alfa", "Q2", read)).ok).toBe(false);
  });
  test("contrato não aceita autoridade, papel ou lente alternativa do cliente", () => {
    expect(moduleForInstrument("FIB_T")).toBe("Q2");
    expect(moduleForInstrument("COPSOQ")).toBe("Q1");
    expect(moduleForInstrument("fibt")).toBe(null);
    expect(
      moduleSchemas.list.safeParse({ accessToken: "session-local", orgId: "alheia" }).success,
    ).toBe(false);
  });
});
