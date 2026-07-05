import { describe, expect, test } from "bun:test";
import {
  buildCeremonyAgenda,
  buildCoCreationPauta,
  castVote,
  CEREMONY_QUORUM,
  closeCeremony,
  markAttendance,
  meetsQuorum,
  type CeremonyDriverCandidate,
  type CeremonyState,
} from "./devolutiva-ceremony-engine";

function openState(over: Partial<CeremonyState> = {}): CeremonyState {
  return { status: "open", attendanceCount: 0, votesByDriver: {}, ...over };
}

const CANDIDATES: CeremonyDriverCandidate[] = [
  { driverId: "a", label: "Alavanca A", rank: 1 },
  { driverId: "b", label: "Alavanca B", rank: 2 },
  { driverId: "c", label: "Alavanca C", rank: 3 },
];

describe("meetsQuorum", () => {
  test("abaixo do quórum é falso", () => {
    expect(meetsQuorum(4)).toBe(false);
  });
  test("no quórum exato é verdadeiro", () => {
    expect(meetsQuorum(CEREMONY_QUORUM)).toBe(true);
  });
  test("acima do quórum é verdadeiro", () => {
    expect(meetsQuorum(12)).toBe(true);
  });
  test("aceita quórum customizado", () => {
    expect(meetsQuorum(3, 3)).toBe(true);
    expect(meetsQuorum(2, 3)).toBe(false);
  });
});

describe("castVote", () => {
  test("incrementa a contagem do driver votado", () => {
    const s1 = castVote(openState(), "a");
    expect(s1.votesByDriver.a).toBe(1);
    const s2 = castVote(s1, "a");
    expect(s2.votesByDriver.a).toBe(2);
  });

  test("votos em drivers diferentes não se misturam", () => {
    const s = castVote(castVote(openState(), "a"), "b");
    expect(s.votesByDriver).toEqual({ a: 1, b: 1 });
  });

  test("ignora voto quando a cerimônia já fechou", () => {
    const closed: CeremonyState = { status: "closed", attendanceCount: 5, votesByDriver: {} };
    const s = castVote(closed, "a");
    expect(s.votesByDriver).toEqual({});
  });

  test("ignora driverId vazio", () => {
    const s = castVote(openState(), "  ");
    expect(s.votesByDriver).toEqual({});
  });

  test("não muta o estado original (imutabilidade)", () => {
    const original = openState();
    castVote(original, "a");
    expect(original.votesByDriver).toEqual({});
  });
});

describe("markAttendance", () => {
  test("define a contagem de presentes enquanto aberta", () => {
    const s = markAttendance(openState(), 8);
    expect(s.attendanceCount).toBe(8);
  });

  test("ignora quando a cerimônia já fechou", () => {
    const closed: CeremonyState = { status: "closed", attendanceCount: 0, votesByDriver: {} };
    const s = markAttendance(closed, 10);
    expect(s.attendanceCount).toBe(0);
  });

  test("ignora contagem negativa", () => {
    const s = markAttendance(openState({ attendanceCount: 3 }), -1);
    expect(s.attendanceCount).toBe(3);
  });

  test("trunca frações para inteiro", () => {
    const s = markAttendance(openState(), 7.9);
    expect(s.attendanceCount).toBe(7);
  });
});

describe("closeCeremony", () => {
  test("transiciona de open para closed", () => {
    const s = closeCeremony(openState());
    expect(s.status).toBe("closed");
  });

  test("fechar uma cerimônia já fechada é idempotente", () => {
    const closed: CeremonyState = { status: "closed", attendanceCount: 6, votesByDriver: { a: 2 } };
    const s = closeCeremony(closed);
    expect(s).toEqual(closed);
  });
});

describe("buildCoCreationPauta", () => {
  test("não publica abaixo do quórum — ranking vazio mesmo com votos", () => {
    const state = openState({ attendanceCount: 4, votesByDriver: { a: 3, b: 1 } });
    const pauta = buildCoCreationPauta(state, CANDIDATES);
    expect(pauta.published).toBe(false);
    expect(pauta.rankedDriverIds).toEqual([]);
    expect(pauta.totalVotes).toBe(4);
  });

  test("publica no quórum exato", () => {
    const state = openState({ attendanceCount: 5, votesByDriver: { a: 3, b: 1, c: 1 } });
    const pauta = buildCoCreationPauta(state, CANDIDATES);
    expect(pauta.published).toBe(true);
  });

  test("ranqueia por contagem de votos, maior primeiro", () => {
    const state = openState({ attendanceCount: 5, votesByDriver: { a: 1, b: 4, c: 2 } });
    const pauta = buildCoCreationPauta(state, CANDIDATES);
    expect(pauta.rankedDriverIds).toEqual(["b", "c", "a"]);
  });

  test("desempata por ordem original da fila quando os votos empatam", () => {
    const state = openState({ attendanceCount: 5, votesByDriver: { a: 2, b: 2, c: 2 } });
    const pauta = buildCoCreationPauta(state, CANDIDATES);
    expect(pauta.rankedDriverIds).toEqual(["a", "b", "c"]);
  });

  test("candidato com zero votos aparece no fim, nunca é omitido", () => {
    const state = openState({ attendanceCount: 5, votesByDriver: { c: 3 } });
    const pauta = buildCoCreationPauta(state, CANDIDATES);
    expect(pauta.rankedDriverIds).toEqual(["c", "a", "b"]);
  });

  test("totalVotes soma todos os drivers, publicado ou não", () => {
    const state = openState({ attendanceCount: 5, votesByDriver: { a: 2, b: 3 } });
    const pauta = buildCoCreationPauta(state, CANDIDATES);
    expect(pauta.totalVotes).toBe(5);
  });
});

describe("buildCeremonyAgenda", () => {
  const narrative = [
    { kicker: "Medimos", title: "T", body: "B" },
    { kicker: "Aprendemos", title: "T", body: "B" },
  ];

  test("anexa o bloco de votação preservando a narrativa original", () => {
    const agenda = buildCeremonyAgenda(narrative, CANDIDATES);
    expect(agenda).toHaveLength(3);
    expect(agenda[0]).toEqual(narrative[0]);
    expect(agenda[1]).toEqual(narrative[1]);
    expect(agenda[2]!.kicker).toBe("Votamos");
  });

  test("menciona a contagem de candidatos no corpo do bloco", () => {
    const agenda = buildCeremonyAgenda(narrative, CANDIDATES);
    expect(agenda[2]!.body).toContain("3 intervenções");
  });

  test("mensagem honesta quando não há candidatos", () => {
    const agenda = buildCeremonyAgenda(narrative, []);
    expect(agenda[2]!.title).toBe("Nenhuma intervenção candidata nesta cerimônia");
  });
});
