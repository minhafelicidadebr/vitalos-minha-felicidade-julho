import { describe, expect, test } from "bun:test";
import {
  getCircleScript,
  openCircleSession,
  sessionsByEmbassy,
  DEFAULT_CIRCLE_POLICY,
  type CircleScript,
} from "./circle-engine";

const CATALOG: CircleScript[] = [
  {
    driverId: "energia",
    title: "Círculo da Energia",
    openingPrompt: "O que te dá energia nesta semana?",
    discussionPrompts: ["Onde você sentiu cansaço evitável?", "O que um microdescanso mudaria?"],
    closingPrompt: "Um compromisso de descanso real para os próximos 7 dias.",
    citation: "Edmondson (1999)",
  },
];

const VALID = {
  id: "circ-1",
  embassyId: "amb-energia",
  facilitatorId: "u-embaixador-01",
  driverId: "energia",
  occurredOn: "2026-06-18",
  presenceCount: 6,
};

describe("circle-engine — getCircleScript", () => {
  test("encontra o roteiro pelo driverId", () => {
    expect(getCircleScript(CATALOG, "energia")?.title).toBe("Círculo da Energia");
  });

  test("retorna undefined quando não há roteiro para o driver", () => {
    expect(getCircleScript(CATALOG, "sem_roteiro")).toBeUndefined();
  });
});

describe("circle-engine — openCircleSession (privacidade por schema)", () => {
  test("registro válido é aceito e ecoa os campos exatamente", () => {
    const result = openCircleSession([], VALID, CATALOG);
    expect(result.reason).toBe("recorded");
    expect(result.session).toEqual(VALID);
  });

  test("o tipo da sessão não tem NENHUM campo de conteúdo ou lista de participantes", () => {
    const result = openCircleSession([], VALID, CATALOG);
    const keys = Object.keys(result.session!);
    expect(keys).toEqual(["id", "embassyId", "facilitatorId", "driverId", "occurredOn", "presenceCount"]);
  });

  test("campos vazios → invalid_request", () => {
    expect(openCircleSession([], { ...VALID, id: "" }, CATALOG).reason).toBe("invalid_request");
    expect(openCircleSession([], { ...VALID, facilitatorId: "  " }, CATALOG).reason).toBe(
      "invalid_request",
    );
  });

  test("id duplicado é replay — não registra de novo", () => {
    const first = openCircleSession([], VALID, CATALOG);
    const second = openCircleSession(first.sessions, VALID, CATALOG);
    expect(second.reason).toBe("duplicate");
    expect(second.sessions.length).toBe(1);
  });

  test("presença abaixo do mínimo (5) é recusada", () => {
    const result = openCircleSession([], { ...VALID, presenceCount: 4 }, CATALOG);
    expect(result.reason).toBe("presence_out_of_range");
  });

  test("presença acima do máximo (8) é recusada", () => {
    const result = openCircleSession([], { ...VALID, presenceCount: 9 }, CATALOG);
    expect(result.reason).toBe("presence_out_of_range");
  });

  test("presença no limite mínimo e máximo é aceita (limites inclusivos)", () => {
    expect(openCircleSession([], { ...VALID, id: "c-min", presenceCount: 5 }, CATALOG).reason).toBe(
      "recorded",
    );
    expect(openCircleSession([], { ...VALID, id: "c-max", presenceCount: 8 }, CATALOG).reason).toBe(
      "recorded",
    );
  });

  test("limites customizados do pack são respeitados", () => {
    const result = openCircleSession([], { ...VALID, presenceCount: 6 }, CATALOG, {
      minPresence: 8,
      maxPresence: 12,
    });
    expect(result.reason).toBe("presence_out_of_range");
  });

  test("sem roteiro para o driver → recusado, mesmo com presença válida", () => {
    const result = openCircleSession([], { ...VALID, driverId: "sem_roteiro" }, CATALOG);
    expect(result.reason).toBe("no_script_for_driver");
  });

  test("política default é 5-8", () => {
    expect(DEFAULT_CIRCLE_POLICY).toEqual({ minPresence: 5, maxPresence: 8 });
  });
});

describe("circle-engine — sessionsByEmbassy", () => {
  test("filtra só as sessões da embaixadoria pedida, nunca expõe outras", () => {
    const a = openCircleSession([], VALID, CATALOG).session!;
    const b = openCircleSession([a], { ...VALID, id: "circ-2", embassyId: "amb-clareza" }, CATALOG)
      .session!;
    const sessions = [a, b];
    expect(sessionsByEmbassy(sessions, "amb-energia")).toEqual([a]);
    expect(sessionsByEmbassy(sessions, "amb-clareza")).toEqual([b]);
  });

  test("embaixadoria sem sessões retorna lista vazia", () => {
    expect(sessionsByEmbassy([], "amb-inexistente")).toEqual([]);
  });
});

describe("circle-engine — determinismo", () => {
  test("mesma entrada → mesma saída", () => {
    const a = openCircleSession([], VALID, CATALOG);
    const b = openCircleSession([], VALID, CATALOG);
    expect(a).toEqual(b);
  });
});
