import { describe, expect, test } from "bun:test";
import {
  ARENA_STAGE_ORDER,
  canAdvanceFrom,
  goToStage,
  setPositionAfter,
  setPositionBefore,
  startArena,
  summarizeArena,
  toggleArgumentConsidered,
  validateDilemma,
  type ArenaDilemma,
  type ArgumentCard,
} from "./socratic-arena-engine";

function card(id: string, side: "A" | "B", overrides: Partial<ArgumentCard> = {}): ArgumentCard {
  return {
    id,
    side,
    text: `Carta ${id}`,
    basis: "evidencia_empirica",
    sourceStudyId: "TEST-001",
    ...overrides,
  };
}

const DILEMMA: ArenaDilemma = {
  id: "dilema-teste",
  title: "Dilema de teste",
  framing: "Enquadramento com regras de civilidade.",
  sideALabel: "Lado A",
  sideBLabel: "Lado B",
  cards: [
    card("a1", "A"),
    card("a2", "A"),
    card("b1", "B", { basis: "valor_operacional", sourceStudyId: undefined }),
    card("b2", "B", { basis: "valor_operacional", sourceStudyId: undefined }),
  ],
  closingSynthesis: "Síntese de trade-off honesta, sem vencedor.",
};

// ─── Modelo de domínio: validação estrutural ─────────────────────────────────

describe("validateDilemma", () => {
  test("dilema bem-formado não gera erros", () => {
    expect(validateDilemma(DILEMMA)).toEqual([]);
  });

  test("acusa lado vazio — 'ambos os lados com mérito real' começa aqui", () => {
    const onlyA: ArenaDilemma = { ...DILEMMA, cards: [card("a1", "A")] };
    const errors = validateDilemma(onlyA);
    expect(errors).toContain("Lado B sem cartas — ambos os lados precisam de mérito real");
  });

  test("acusa carta duplicada e carta sem texto", () => {
    const broken: ArenaDilemma = {
      ...DILEMMA,
      cards: [card("dup", "A"), card("dup", "A"), card("x", "B", { text: "  " })],
    };
    const errors = validateDilemma(broken);
    expect(errors).toContain("carta duplicada: dup");
    expect(errors).toContain("carta sem texto: x");
  });

  test("invariante 10 — evidência/síntese teórica exige sourceStudyId", () => {
    const errors = validateDilemma({
      ...DILEMMA,
      cards: [card("a1", "A", { sourceStudyId: undefined }), card("b1", "B", { basis: "valor_operacional", sourceStudyId: undefined })],
    });
    expect(errors).toContain("carta a1: evidência/síntese teórica exige sourceStudyId");
  });

  test("invariante 10 — valor_operacional NUNCA disfarçado de evidência (rejeita sourceStudyId)", () => {
    const errors = validateDilemma({
      ...DILEMMA,
      cards: [
        card("a1", "A"),
        card("b1", "B", { basis: "valor_operacional", sourceStudyId: "TEST-999" }),
      ],
    });
    expect(errors).toContain("carta b1: valor_operacional não deve citar sourceStudyId (evitaria disfarçar valor de evidência)");
  });
});

// ─── Estados e transições ────────────────────────────────────────────────────

describe("startArena", () => {
  test("começa no enquadramento, sem posição declarada, sem cartas consideradas", () => {
    const state = startArena(DILEMMA);
    expect(state.stage).toBe("enquadramento");
    expect(state.visitedStages).toEqual(["enquadramento"]);
    expect(state.consideredCardIds).toEqual([]);
    expect(state.positionBefore).toBeNull();
    expect(state.positionAfter).toBeNull();
  });
});

describe("goToStage — navegação determinística", () => {
  test("avanço de 'tese' para 'antitese' é bloqueado sem carta do Lado A considerada", () => {
    let state = startArena(DILEMMA);
    state = goToStage(DILEMMA, state, "tese");
    expect(state.stage).toBe("tese");

    const blocked = goToStage(DILEMMA, state, "antitese");
    expect(blocked.stage).toBe("tese"); // no-op: continua em tese
    expect(blocked).toEqual(state);
  });

  test("considerar 1 carta do Lado A libera o avanço para 'antitese'", () => {
    let state = startArena(DILEMMA);
    state = goToStage(DILEMMA, state, "tese");
    state = toggleArgumentConsidered(state, "a1");
    const advanced = goToStage(DILEMMA, state, "antitese");
    expect(advanced.stage).toBe("antitese");
    expect(advanced.visitedStages).toEqual(["enquadramento", "tese", "antitese"]);
  });

  test("avanço de 'antitese' para 'evidencia' exige carta do Lado B", () => {
    let state = startArena(DILEMMA);
    state = goToStage(DILEMMA, state, "tese");
    state = toggleArgumentConsidered(state, "a1");
    state = goToStage(DILEMMA, state, "antitese");

    const blocked = goToStage(DILEMMA, state, "evidencia");
    expect(blocked.stage).toBe("antitese");

    state = toggleArgumentConsidered(state, "b1");
    const advanced = goToStage(DILEMMA, state, "evidencia");
    expect(advanced.stage).toBe("evidencia");
  });

  test("navegação para TRÁS (estágio já visitado) é sempre livre, mesmo sem cartas", () => {
    let state = startArena(DILEMMA);
    state = goToStage(DILEMMA, state, "tese");
    state = toggleArgumentConsidered(state, "a1");
    state = goToStage(DILEMMA, state, "antitese");

    const back = goToStage(DILEMMA, state, "tese");
    expect(back.stage).toBe("tese");
    expect(back.visitedStages).toEqual(["enquadramento", "tese", "antitese"]); // não duplica
  });

  test("estágio inválido é no-op", () => {
    const state = startArena(DILEMMA);
    // @ts-expect-error — testando entrada inválida deliberadamente
    const result = goToStage(DILEMMA, state, "estagio-inexistente");
    expect(result).toEqual(state);
  });

  test("canAdvanceFrom reflete exatamente a regra de goToStage", () => {
    let state = startArena(DILEMMA);
    state = goToStage(DILEMMA, state, "tese");
    expect(canAdvanceFrom(DILEMMA, state, "tese")).toBe(false);
    state = toggleArgumentConsidered(state, "a1");
    expect(canAdvanceFrom(DILEMMA, state, "tese")).toBe(true);
    // estágios sem regra de avanço mínimo sempre liberam.
    expect(canAdvanceFrom(DILEMMA, state, "evidencia")).toBe(true);
    expect(canAdvanceFrom(DILEMMA, state, "revisao")).toBe(true);
    expect(canAdvanceFrom(DILEMMA, state, "sintese")).toBe(true);
  });

  test("percurso completo determinístico: mesmas ações → exatamente o mesmo estado final", () => {
    function walkThrough(): ReturnType<typeof startArena> {
      let s = startArena(DILEMMA);
      s = goToStage(DILEMMA, s, "tese");
      s = toggleArgumentConsidered(s, "a1");
      s = toggleArgumentConsidered(s, "a2");
      s = goToStage(DILEMMA, s, "antitese");
      s = toggleArgumentConsidered(s, "b1");
      s = goToStage(DILEMMA, s, "evidencia");
      s = goToStage(DILEMMA, s, "revisao");
      s = setPositionAfter(s, "ladoA");
      s = goToStage(DILEMMA, s, "sintese");
      return s;
    }
    expect(walkThrough()).toEqual(walkThrough());
  });
});

describe("toggleArgumentConsidered — idempotente/reversível", () => {
  test("marca e desmarca a mesma carta", () => {
    let state = startArena(DILEMMA);
    state = toggleArgumentConsidered(state, "a1");
    expect(state.consideredCardIds).toEqual(["a1"]);
    state = toggleArgumentConsidered(state, "a1");
    expect(state.consideredCardIds).toEqual([]);
  });
});

describe("posição autodeclarada — nunca inferida", () => {
  test("setPositionBefore/After gravam exatamente o valor informado", () => {
    let state = startArena(DILEMMA);
    state = setPositionBefore(state, "indeciso");
    expect(state.positionBefore).toBe("indeciso");
    state = setPositionAfter(state, "ladoB");
    expect(state.positionAfter).toBe("ladoB");
  });

  test("reversível: chamar de novo corrige o valor anterior", () => {
    let state = startArena(DILEMMA);
    state = setPositionBefore(state, "ladoA");
    state = setPositionBefore(state, "ladoB");
    expect(state.positionBefore).toBe("ladoB");
  });
});

// ─── Síntese — invariantes centrais (sem vencedor, sem ranking, sem avaliação) ─

describe("summarizeArena", () => {
  test("conta estrutura: cartas por lado, estágios visitados, mudança de posição", () => {
    let state = startArena(DILEMMA);
    state = goToStage(DILEMMA, state, "tese");
    state = toggleArgumentConsidered(state, "a1");
    state = setPositionBefore(state, "indeciso");
    state = goToStage(DILEMMA, state, "antitese");
    state = toggleArgumentConsidered(state, "b1");
    state = goToStage(DILEMMA, state, "evidencia");
    state = goToStage(DILEMMA, state, "revisao");
    state = setPositionAfter(state, "ladoA");
    state = goToStage(DILEMMA, state, "sintese");

    const summary = summarizeArena(DILEMMA, state);
    expect(summary.sideACardsConsidered).toBe(1);
    expect(summary.sideBCardsConsidered).toBe(1);
    expect(summary.totalCardsConsidered).toBe(2);
    expect(summary.stagesVisited).toBe(ARENA_STAGE_ORDER.length);
    expect(summary.totalStages).toBe(ARENA_STAGE_ORDER.length);
    expect(summary.positionBefore).toBe("indeciso");
    expect(summary.positionAfter).toBe("ladoA");
    expect(summary.positionShifted).toBe(true);
    expect(summary.reachedSynthesis).toBe(true);
  });

  test("sem mudança de posição → positionShifted false", () => {
    let state = startArena(DILEMMA);
    state = setPositionBefore(state, "ladoA");
    state = setPositionAfter(state, "ladoA");
    expect(summarizeArena(DILEMMA, state).positionShifted).toBe(false);
  });

  test("posição incompleta (só 'antes' ou nenhuma) nunca conta como mudança", () => {
    let state = startArena(DILEMMA);
    expect(summarizeArena(DILEMMA, state).positionShifted).toBe(false);
    state = setPositionBefore(state, "ladoA");
    expect(summarizeArena(DILEMMA, state).positionShifted).toBe(false);
  });

  test("invariante — NUNCA existe campo de vencedor no resumo", () => {
    const summary = summarizeArena(DILEMMA, startArena(DILEMMA));
    expect("winner" in summary).toBe(false);
    expect("vencedor" in summary).toBe(false);
  });

  test("invariante — NUNCA existe pontuação/ranking de argumento", () => {
    const summary = summarizeArena(DILEMMA, startArena(DILEMMA));
    expect("score" in summary).toBe(false);
    expect("rank" in summary).toBe(false);
    expect("ranking" in summary).toBe(false);
  });

  test("invariante — NUNCA existe avaliação de qualidade do raciocínio do participante", () => {
    const summary = summarizeArena(DILEMMA, startArena(DILEMMA));
    // Só contagens estruturais são permitidas — nenhum campo de julgamento.
    const allowedKeys = [
      "dilemmaId",
      "stagesVisited",
      "totalStages",
      "sideACardsConsidered",
      "sideBCardsConsidered",
      "totalCardsConsidered",
      "positionBefore",
      "positionAfter",
      "positionShifted",
      "reachedSynthesis",
    ].sort();
    expect(Object.keys(summary).sort()).toEqual(allowedKeys);
  });

  test("sessão vazia: zeros honestos, sem NaN", () => {
    const summary = summarizeArena(DILEMMA, startArena(DILEMMA));
    expect(summary.sideACardsConsidered).toBe(0);
    expect(summary.sideBCardsConsidered).toBe(0);
    expect(summary.totalCardsConsidered).toBe(0);
    expect(summary.reachedSynthesis).toBe(false);
  });
});

// ─── Invariante estrutural: engine não tem campo de texto livre ─────────────

describe("invariante — sem campo de texto livre no estado do engine", () => {
  test("ArenaState não expõe nenhuma chave de rascunho/nota/texto", () => {
    const state = startArena(DILEMMA);
    const keys = Object.keys(state);
    expect(keys).toEqual([
      "dilemmaId",
      "stage",
      "visitedStages",
      "consideredCardIds",
      "positionBefore",
      "positionAfter",
    ]);
    for (const k of keys) {
      expect(k).not.toMatch(/nota|texto|rascunho|draft|note|comment/i);
    }
  });
});
