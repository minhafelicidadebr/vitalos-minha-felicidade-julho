import { describe, expect, test } from "bun:test";
import { buildGroundedAnswer, type GroundingInput } from "./grounding-engine";

function base(over: Partial<GroundingInput> = {}): GroundingInput {
  return {
    ivoLabel: "IVO",
    ivoScore: 619,
    maturityName: "Organização Saudável",
    momentumLabel: "acelerando",
    slopePerCycle: 12,
    worstLens: { name: "LIDERANÇA", delta: -8 },
    topAlert: { title: "Discurso × prática divergem", evidence: "625 × 31 (k≥5)" },
    topMove: { label: "Rituais de reconhecimento", lift: 28 },
    ...over,
  };
}

describe("grounding — resposta citada", () => {
  test("toda afirmação tem uma fonte navegável", () => {
    const a = buildGroundedAnswer(base());
    expect(a.points.length).toBeGreaterThanOrEqual(3);
    for (const p of a.points) {
      expect(p.sourceRoute.startsWith("/")).toBe(true);
      expect(p.evidence.length).toBeGreaterThan(0);
    }
  });

  test("o IVO e a tendência sempre aparecem, citados", () => {
    const a = buildGroundedAnswer(base());
    expect(a.points[0]!.sourceRoute).toBe("/ivo");
    expect(a.points[1]!.sourceRoute).toBe("/evolucao");
    expect(a.points[0]!.evidence).toContain("619");
  });

  test("lente em queda só entra quando o delta é negativo", () => {
    const withDrop = buildGroundedAnswer(base());
    expect(withDrop.points.some((p) => p.sourceLabel.includes("lentes"))).toBe(true);
    const noDrop = buildGroundedAnswer(base({ worstLens: { name: "EU", delta: 5 } }));
    expect(noDrop.points.some((p) => p.sourceLabel.includes("lentes"))).toBe(false);
  });

  test("recomendação aponta para Prioridades quando há um movimento", () => {
    const a = buildGroundedAnswer(base());
    expect(a.recommendation?.sourceRoute).toBe("/prioridades");
    expect(a.recommendation?.text).toContain("Rituais de reconhecimento");
  });

  test("sem movimento → sem recomendação fabricada", () => {
    const a = buildGroundedAnswer(base({ topMove: null }));
    expect(a.recommendation).toBeNull();
  });

  test("o disclaimer de honestidade está sempre presente", () => {
    const a = buildGroundedAnswer(base());
    expect(a.disclaimer).toContain("não inventa");
  });
});
