import { describe, expect, test } from "bun:test";
import {
  SYNTHESIS_DISCLAIMERS,
  SYNTHESIS_FORBIDDEN_CLAIMS,
  buildTrailSynthesis,
  synthesisBodyText,
  type TrailSynthesisInput,
} from "./trail-synthesis-engine";

const INPUT: TrailSynthesisInput = {
  trailTitle: "Voz Segura",
  mechanismLabel: "Redução do medo interpessoal",
  mechanismStatement: "Ambientes não punitivos favorecem comportamentos de aprendizagem.",
  sources: [
    {
      citation: "Edmondson, A. C. (1999).",
      note: "Associação correlacional entre segurança e aprendizagem — não experimento, não generaliza automaticamente.",
    },
    {
      citation: "Hammer, L. B. et al. (2021).",
      note: "Intervenção controlada; efeito condicionado à adesão do líder e ao contexto.",
    },
  ],
  practiced: ["Quiz adaptativo por dificuldade", "Simulador de decisões", "Microlearning espaçado"],
};

describe("buildTrailSynthesis", () => {
  test("estrutura mecanismo, fontes e prática, sempre com os disclaimers anexados", () => {
    const doc = buildTrailSynthesis(INPUT);
    expect(doc.title).toBe("Voz Segura");
    expect(doc.sources).toHaveLength(2);
    expect(doc.practiced).toHaveLength(3);
    expect(doc.disclaimers).toEqual([...SYNTHESIS_DISCLAIMERS]);
  });

  test("os disclaimers cobrem responsabilidade técnica e negam gerar PGR/conformidade", () => {
    const doc = buildTrailSynthesis(INPUT);
    const joined = doc.disclaimers.join(" ");
    expect(joined).toMatch(/profissional legalmente habilitado/i);
    expect(joined).toMatch(/não gera o pgr/i);
    expect(joined).toMatch(/não atesta conformidade/i);
  });

  test("NENHUMA claim proibida (LD-006) aparece no CORPO renderizável", () => {
    const doc = buildTrailSynthesis(INPUT);
    const text = synthesisBodyText(doc);
    for (const forbidden of SYNTHESIS_FORBIDDEN_CLAIMS) {
      expect(text).not.toMatch(forbidden);
    }
  });

  test("os disclaimers NOMEIAM as frases proibidas apenas na forma negada", () => {
    const doc = buildTrailSynthesis(INPUT);
    const joined = doc.disclaimers.join(" ");
    // Presença sancionada (negada) — o corpo é que nunca pode afirmá-las.
    expect(joined).toMatch(/não gera o pgr/i);
    expect(joined).toMatch(/não substitui|não o substitui/i);
  });

  test("não muta a entrada", () => {
    const snapshot = JSON.stringify(INPUT);
    buildTrailSynthesis(INPUT);
    expect(JSON.stringify(INPUT)).toBe(snapshot);
  });

  test("a lista de claims proibidas de fato reprova um texto contaminado (sanidade)", () => {
    const contaminated = "Este relatório gera o PGR e garante conformidade — laudo automático.";
    const hits = SYNTHESIS_FORBIDDEN_CLAIMS.filter((re) => re.test(contaminated));
    expect(hits.length).toBeGreaterThanOrEqual(3);
  });
});
