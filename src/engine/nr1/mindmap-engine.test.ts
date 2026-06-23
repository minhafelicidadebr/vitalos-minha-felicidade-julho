import { describe, expect, it } from "bun:test";
import { buildDriverMindMap } from "./mindmap-engine";
import { NR1_CROSSWALK as R, DEMO_COPSOQ_EXPOSURE } from "@/mocks/nr1-crosswalk-mock";

describe("mindmap-engine · buildDriverMindMap", () => {
  it("monta grafo completo para 'carga' (1 driver + 4 COPSOQ + 3 FIB-T + 2 pilares = 10 nós)", () => {
    const map = buildDriverMindMap(R, "carga", DEMO_COPSOQ_EXPOSURE);
    expect(map).not.toBeNull();
    expect(map!.nodes.length).toBe(10);
    expect(map!.edges.length).toBe(9);
    expect(map!.driverId).toBe("carga");
    expect(map!.driverLabel).toBe("Carga & Recuperação");
  });

  it("driver inexistente → null", () => {
    expect(buildDriverMindMap(R, "nao_existe")).toBeNull();
  });

  it("todos os nós dentro do viewBox", () => {
    const map = buildDriverMindMap(R, "carga")!;
    for (const n of map.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(map.viewBox.width);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeLessThanOrEqual(map.viewBox.height);
    }
  });

  it("COPSOQ à esquerda do centro, FIB-T à direita", () => {
    const map = buildDriverMindMap(R, "carga")!;
    const center = map.nodes.find((n) => n.type === "driver")!;
    for (const n of map.nodes.filter((n) => n.instrument === "copsoq"))
      expect(n.x).toBeLessThan(center.x);
    for (const n of map.nodes.filter((n) => n.instrument === "fibt"))
      expect(n.x).toBeGreaterThan(center.x);
  });

  it("pilares abaixo do centro", () => {
    const map = buildDriverMindMap(R, "carga")!;
    const center = map.nodes.find((n) => n.type === "driver")!;
    const pillars = map.nodes.filter((n) => n.type === "pillar");
    expect(pillars.length).toBe(2);
    for (const p of pillars) expect(p.y).toBeGreaterThan(center.y);
  });

  it("propaga prioridade e critical dos sinais canônicos", () => {
    const map = buildDriverMindMap(R, "carga")!;
    const node = map.nodes.find((n) => n.id === "dim_demands_quant")!;
    expect(node.priority).toBe("P0");
    const edge = map.edges.find((e) => e.targetId === "dim_demands_quant")!;
    expect(edge.priority).toBe("P0");
  });

  it("propaga exposição medida para nós de dimensão", () => {
    const map = buildDriverMindMap(R, "carga", DEMO_COPSOQ_EXPOSURE)!;
    expect(map.nodes.find((n) => n.id === "dim_demands_quant")!.exposure).toBe(72);
  });

  it("sem exposição → dimensões sem campo exposure", () => {
    const map = buildDriverMindMap(R, "carga")!;
    expect(map.nodes.find((n) => n.id === "dim_demands_quant")!.exposure).toBeUndefined();
  });

  it("tamanho do nó proporcional à força", () => {
    const map = buildDriverMindMap(R, "carga")!;
    const strong = map.nodes.find((n) => n.id === "dim_demands_quant")!;
    const weak = map.nodes.find((n) => n.id === "dim_influence")!;
    expect(strong.size).toBeGreaterThan(weak.size);
  });

  it("determinístico: mesma entrada → mesma saída", () => {
    const a = buildDriverMindMap(R, "carga", DEMO_COPSOQ_EXPOSURE);
    const b = buildDriverMindMap(R, "carga", DEMO_COPSOQ_EXPOSURE);
    expect(a).toEqual(b);
  });

  it("funciona para todos os 12 drivers", () => {
    for (const driver of R.drivers) {
      const map = buildDriverMindMap(R, driver.id);
      expect(map).not.toBeNull();
      expect(map!.nodes.length).toBeGreaterThan(1);
      expect(map!.edges.length).toBe(map!.nodes.length - 1);
    }
  });

  it("nenhum par de nós se sobrepõe (distância mínima ≥ 15)", () => {
    for (const driver of R.drivers) {
      const map = buildDriverMindMap(R, driver.id)!;
      for (let i = 0; i < map.nodes.length; i++) {
        for (let j = i + 1; j < map.nodes.length; j++) {
          const a = map.nodes[i], b = map.nodes[j];
          const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
          expect(dist).toBeGreaterThanOrEqual(15);
        }
      }
    }
  });

  it("arestas referenciam apenas nós existentes", () => {
    const map = buildDriverMindMap(R, "carga")!;
    const ids = new Set(map.nodes.map((n) => n.id));
    for (const e of map.edges) {
      expect(ids.has(e.sourceId)).toBe(true);
      expect(ids.has(e.targetId)).toBe(true);
    }
  });
});
