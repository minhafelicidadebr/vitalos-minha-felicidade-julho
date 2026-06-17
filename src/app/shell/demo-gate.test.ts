import { describe, expect, it } from "bun:test";
import { checkDemoPassword, DEMO_PASSWORD } from "./demo-gate";

describe("checkDemoPassword", () => {
  it("aceita a senha exata", () => {
    expect(checkDemoPassword("luzpazeamor")).toBe(true);
    expect(checkDemoPassword(DEMO_PASSWORD)).toBe(true);
  });

  it("é tolerante a espaços nas bordas e a caixa", () => {
    expect(checkDemoPassword("  luzpazeamor  ")).toBe(true);
    expect(checkDemoPassword("LuzPazEAmor")).toBe(true);
    expect(checkDemoPassword("LUZPAZEAMOR")).toBe(true);
  });

  it("rejeita senha errada, vazia ou parcial", () => {
    expect(checkDemoPassword("")).toBe(false);
    expect(checkDemoPassword("luz paz e amor")).toBe(false); // espaços internos contam
    expect(checkDemoPassword("luzpaz")).toBe(false);
    expect(checkDemoPassword("senha")).toBe(false);
  });
});
