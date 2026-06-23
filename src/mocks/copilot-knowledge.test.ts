import { describe, expect, test } from "bun:test";
import { retrieveChunks } from "@/engine/ai/copilot-engine";
import {
  buildCopilotAvatar,
  buildCopilotKnowledge,
  buildCopilotPersona,
  suggestedQuestions,
} from "./copilot-knowledge";
import { canSeeCollective } from "./sector-audience";
import healthPack from "@/domain/packs/health/health.pack.json";
import healthIndex from "@/domain/packs/health/ivs-framework.json";

const kb = buildCopilotKnowledge(healthPack as never, healthIndex as never);

describe("copilot knowledge — cobertura do ecossistema", () => {
  test("inclui 4 lentes + 8 ecossistema + 12 drivers WWP (24 no total)", () => {
    // indice + 4 lentes + privacidade + agir + metodo + limites + pulse + dominio_b + provar + 12 drivers
    expect(kb.chunks.length).toBe(24);
  });

  test("recupera o chunk de risco psicossocial (Domínio B)", () => {
    const hits = retrieveChunks(kb, "vocês tratam risco psicossocial e NR-1?");
    expect(hits[0]!.chunk.id).toBe("dominio_b");
  });

  test("recupera o chunk de provar para uma pergunta sobre selo/evidência", () => {
    const hits = retrieveChunks(kb, "como funciona o selo e a evidência de impacto?");
    expect(hits.some((h) => h.chunk.id === "provar")).toBe(true);
  });
});

describe("copilot knowledge — ciência dos 12 drivers (Educar com citação)", () => {
  const driverProbes: { q: string; id: string }[] = [
    { q: "como melhorar a segurança psicológica do time?", id: "driver_seguranca_psicologica" },
    { q: "qual a melhor forma de reconhecimento e feedback?", id: "driver_reconhecimento" },
    { q: "como combater a exaustão e a fadiga, recuperando energia?", id: "driver_energia" },
    { q: "como aumentar o propósito e o significado no trabalho?", id: "driver_proposito" },
    { q: "como dar mais autonomia e controle às pessoas?", id: "driver_autonomia" },
    { q: "como fortalecer o pertencimento e a inclusão?", id: "driver_pertencimento" },
    { q: "como estimular crescimento e mentalidade de aprendizado?", id: "driver_crescimento" },
    { q: "como reduzir a ambiguidade de papel e dar clareza?", id: "driver_clareza" },
    { q: "como a liderança preventiva protege a equipe?", id: "driver_lideranca" },
    { q: "como garantir inclusão e proteção contra violência?", id: "driver_inclusao" },
    { q: "como construir realização coletiva com metas factíveis?", id: "driver_realizacao" },
    { q: "como a insegurança sobre o futuro afeta a saúde?", id: "driver_futuro" },
  ];

  for (const { q, id } of driverProbes) {
    test(`recupera ${id} e a resposta carrega fonte citável`, () => {
      const hits = retrieveChunks(kb, q);
      const hit = hits.find((h) => h.chunk.id === id);
      expect(hit).toBeDefined();
      expect(hit!.chunk.source.length).toBeGreaterThan(0);
    });
  }

  test("todo chunk de driver tem fonte (anti-alucinação, gate G1)", () => {
    const drivers = kb.chunks.filter((c) => c.id.startsWith("driver_"));
    expect(drivers.length).toBe(12);
    expect(drivers.every((c) => c.source.trim().length > 0)).toBe(true);
  });
});

describe("copilot knowledge — persona e avatar", () => {
  test("persona de saúde sugere Cora e cita a marca CuidarIA", () => {
    const persona = buildCopilotPersona(healthPack as never);
    expect(persona.suggestedName).toBe("Cora");
    expect(persona.aiName).toBe("CuidarIA");
  });

  test("avatar usa o branding do pack e iniciais da persona", () => {
    const avatar = buildCopilotAvatar(healthPack as never, {
      primary: "#0F5257",
      accent: "#E0A458",
    });
    expect(avatar.gradientFrom).toBe("#0F5257");
    expect(avatar.glyph).toBe("heart-pulse");
    expect(avatar.initials).toBe("CO");
  });
});

describe("copilot knowledge — sugestões por audiência", () => {
  test("gestão recebe sugestão sobre o resultado; participante não", () => {
    const gestao = suggestedQuestions(kb, true);
    const participante = suggestedQuestions(kb, false);
    expect(gestao.some((q) => /resultado/i.test(q))).toBe(true);
    expect(participante.some((q) => /resultado/i.test(q))).toBe(false);
    expect(participante.length).toBeGreaterThanOrEqual(4);
  });
});

describe("sector-audience — quem vê a leitura coletiva", () => {
  test("saúde: direção vê; profissional e residente não", () => {
    expect(canSeeCollective("health", "DIRETOR_CLINICO")).toBe(true);
    expect(canSeeCollective("health", "PROFISSIONAL_SAUDE")).toBe(false);
    expect(canSeeCollective("health", "RESIDENTE")).toBe(false);
  });

  test("governo e condomínio: gestão vê; participante não", () => {
    expect(canSeeCollective("government", "DIRIGENTE")).toBe(true);
    expect(canSeeCollective("government", "SERVIDOR")).toBe(false);
    expect(canSeeCollective("condominium", "SINDICO")).toBe(true);
    expect(canSeeCollective("condominium", "MORADOR")).toBe(false);
  });

  test("empresa: papéis participantes não veem; demais veem", () => {
    expect(canSeeCollective("enterprise", "COLABORADOR")).toBe(false);
    expect(canSeeCollective("enterprise", "RH_ADMIN")).toBe(true);
  });
});
