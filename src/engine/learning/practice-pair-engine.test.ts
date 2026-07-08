import { describe, expect, test } from "bun:test";
import {
  confirmPartnerEvidence,
  confirmationsForPartner,
  DEFAULT_PAIR_POLICY,
  formPair,
  suggestPairs,
  validatePairProfile,
  type PairConfirmation,
  type PairProfile,
  type PracticePair,
} from "./practice-pair-engine";

const MARINA: PairProfile = {
  personId: "u-marina",
  displayName: "Marina",
  focusDriverId: "energia",
  sharedStrengthIds: ["curiosidade", "gratidao"],
};

const CAIO: PairProfile = {
  personId: "u-caio",
  displayName: "Caio",
  focusDriverId: "energia",
  sharedStrengthIds: ["autorregulacao", "perseveranca"],
};

const PAIR: PracticePair = {
  id: "pair-1",
  memberIds: ["u-marina", "u-caio"],
  focusDriverId: "energia",
  formedOn: "2026-07-06",
};

const CONFIRMATION: PairConfirmation = {
  id: "conf-1",
  pairId: "pair-1",
  confirmerId: "u-caio",
  partnerId: "u-marina",
  entryId: "entry-1",
  occurredOn: "2026-07-07",
};

describe("practice-pair — validatePairProfile (consentimento por schema)", () => {
  test("perfil válido dentro do limite → ok", () => {
    expect(validatePairProfile(MARINA).reason).toBe("ok");
  });

  test("compartilhar zero forças não é consentimento — recusado", () => {
    expect(validatePairProfile({ ...MARINA, sharedStrengthIds: [] }).reason).toBe(
      "no_strengths_shared",
    );
  });

  test("mais forças que o limite do pack → recusado (nunca o perfil inteiro)", () => {
    const tooMany = { ...MARINA, sharedStrengthIds: ["a", "b", "c", "d"] };
    expect(validatePairProfile(tooMany).reason).toBe("too_many_strengths");
    // política default limita a 3
    expect(DEFAULT_PAIR_POLICY.maxSharedStrengths).toBe(3);
  });

  test("campos vazios → invalid_request", () => {
    expect(validatePairProfile({ ...MARINA, personId: " " }).reason).toBe("invalid_request");
    expect(validatePairProfile({ ...MARINA, focusDriverId: "" }).reason).toBe("invalid_request");
  });

  test("política customizada do pack é respeitada", () => {
    const policy = { maxSharedStrengths: 1, weeklyConfirmationLimit: 1 };
    expect(validatePairProfile(MARINA, policy).reason).toBe("too_many_strengths");
  });
});

describe("practice-pair — suggestPairs (complementar, mesmo driver, determinístico)", () => {
  test("candidato com mesmo driver e forças complementares é sugerido", () => {
    const suggestions = suggestPairs(MARINA, [CAIO]);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0]!.candidate.personId).toBe("u-caio");
    expect(suggestions[0]!.complementaryStrengthIds).toEqual(["autorregulacao", "perseveranca"]);
  });

  test("driver diferente → fora, mesmo com forças complementares", () => {
    const other = { ...CAIO, focusDriverId: "clareza" };
    expect(suggestPairs(MARINA, [other])).toEqual([]);
  });

  test("sem nenhuma força complementar → fora (dupla espelho não agrega)", () => {
    const mirror = { ...CAIO, sharedStrengthIds: ["curiosidade"] };
    expect(suggestPairs(MARINA, [mirror])).toEqual([]);
  });

  test("nunca sugere a própria pessoa", () => {
    expect(suggestPairs(MARINA, [MARINA])).toEqual([]);
  });

  test("ordena por mais complementos; empate por personId (determinístico)", () => {
    const one = { ...CAIO, personId: "u-bbb", sharedStrengthIds: ["perseveranca"] };
    const two = { ...CAIO, personId: "u-aaa", sharedStrengthIds: ["perseveranca"] };
    const three = { ...CAIO, personId: "u-ccc" }; // 2 complementos
    const result = suggestPairs(MARINA, [one, three, two]);
    expect(result.map((s) => s.candidate.personId)).toEqual(["u-ccc", "u-aaa", "u-bbb"]);
  });
});

describe("practice-pair — formPair (bilateral por construção, nunca designada)", () => {
  const REQUEST = {
    id: "pair-1",
    a: MARINA,
    b: CAIO,
    aAccepted: true,
    bAccepted: true,
    formedOn: "2026-07-06",
  };

  test("aceite dos dois lados → dupla formada", () => {
    const result = formPair([], REQUEST);
    expect(result.reason).toBe("formed");
    expect(result.pair?.memberIds).toEqual(["u-marina", "u-caio"]);
  });

  test("sem o aceite de UM dos lados a dupla não existe (gestor não designa)", () => {
    expect(formPair([], { ...REQUEST, bAccepted: false }).reason).toBe("not_bilateral");
    expect(formPair([], { ...REQUEST, aAccepted: false }).reason).toBe("not_bilateral");
  });

  test("dupla consigo mesmo → recusada", () => {
    expect(formPair([], { ...REQUEST, b: MARINA }).reason).toBe("self_pair");
  });

  test("drivers em foco diferentes → recusada", () => {
    const other = { ...CAIO, focusDriverId: "clareza" };
    expect(formPair([], { ...REQUEST, b: other }).reason).toBe("driver_mismatch");
  });

  test("pessoa já em outra dupla → recusada (uma dupla ativa por pessoa)", () => {
    const first = formPair([], REQUEST);
    const third: PairProfile = {
      personId: "u-ana",
      displayName: "Ana",
      focusDriverId: "energia",
      sharedStrengthIds: ["bondade"],
    };
    const second = formPair(first.pairs, {
      ...REQUEST,
      id: "pair-2",
      a: third,
      b: CAIO,
    });
    expect(second.reason).toBe("already_paired");
    expect(second.pairs.length).toBe(1);
  });
});

describe("practice-pair — confirmPartnerEvidence (confirmação por par, anti-conluio)", () => {
  test("membro confirma evidência do parceiro → registrada", () => {
    const result = confirmPartnerEvidence([], CONFIRMATION, PAIR);
    expect(result.reason).toBe("confirmed");
    expect(result.confirmations.length).toBe(1);
  });

  test("quem não é membro da dupla não confirma nada", () => {
    const outsider = { ...CONFIRMATION, confirmerId: "u-intruso" };
    expect(confirmPartnerEvidence([], outsider, PAIR).reason).toBe("not_pair_member");
  });

  test("autoconfirmação → recusada (confirmador nunca é o dono da evidência)", () => {
    const selfConfirm = { ...CONFIRMATION, partnerId: "u-caio" };
    expect(confirmPartnerEvidence([], selfConfirm, PAIR).reason).toBe("self_confirmation");
  });

  test("id duplicado é replay — não registra de novo", () => {
    const first = confirmPartnerEvidence([], CONFIRMATION, PAIR);
    const second = confirmPartnerEvidence(first.confirmations, CONFIRMATION, PAIR);
    expect(second.reason).toBe("duplicate");
    expect(second.confirmations.length).toBe(1);
  });

  test("a mesma evidência não é confirmada duas vezes", () => {
    const first = confirmPartnerEvidence([], CONFIRMATION, PAIR);
    const again = { ...CONFIRMATION, id: "conf-2", occurredOn: "2026-07-20" };
    expect(confirmPartnerEvidence(first.confirmations, again, PAIR).reason).toBe(
      "entry_already_confirmed",
    );
  });

  test("anti-conluio: o mesmo par não se valida 2× na mesma semana", () => {
    const first = confirmPartnerEvidence([], CONFIRMATION, PAIR);
    // mesma semana (2026-07-07 é terça; 2026-07-09 é quinta da MESMA semana ISO)
    const reverse = {
      id: "conf-2",
      pairId: "pair-1",
      confirmerId: "u-marina",
      partnerId: "u-caio",
      entryId: "entry-2",
      occurredOn: "2026-07-09",
    };
    expect(confirmPartnerEvidence(first.confirmations, reverse, PAIR).reason).toBe(
      "weekly_limit_reached",
    );
  });

  test("semana seguinte reabre o limite", () => {
    const first = confirmPartnerEvidence([], CONFIRMATION, PAIR);
    const nextWeek = {
      id: "conf-2",
      pairId: "pair-1",
      confirmerId: "u-marina",
      partnerId: "u-caio",
      entryId: "entry-2",
      occurredOn: "2026-07-14",
    };
    expect(confirmPartnerEvidence(first.confirmations, nextWeek, PAIR).reason).toBe("confirmed");
  });

  test("pairId que não bate com a dupla → invalid_request", () => {
    const wrongPair = { ...CONFIRMATION, pairId: "pair-999" };
    expect(confirmPartnerEvidence([], wrongPair, PAIR).reason).toBe("invalid_request");
  });
});

describe("practice-pair — confirmationsForPartner + determinismo", () => {
  test("filtra só as confirmações recebidas pela pessoa", () => {
    const a = CONFIRMATION;
    const b: PairConfirmation = {
      id: "conf-2",
      pairId: "pair-1",
      confirmerId: "u-marina",
      partnerId: "u-caio",
      entryId: "entry-2",
      occurredOn: "2026-07-14",
    };
    expect(confirmationsForPartner([a, b], "u-marina")).toEqual([a]);
    expect(confirmationsForPartner([a, b], "u-caio")).toEqual([b]);
  });

  test("determinístico: mesma entrada → mesma saída", () => {
    expect(confirmPartnerEvidence([], CONFIRMATION, PAIR)).toEqual(
      confirmPartnerEvidence([], CONFIRMATION, PAIR),
    );
    expect(suggestPairs(MARINA, [CAIO])).toEqual(suggestPairs(MARINA, [CAIO]));
  });
});
