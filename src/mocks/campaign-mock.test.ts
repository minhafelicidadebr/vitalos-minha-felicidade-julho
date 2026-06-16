// Consistência da onda: prova que a campanha NÃO pode divergir da jornada canônica
// (o instrumento de cada onda é um instrumento da jornada) e que o agregado é
// honesto (o total bate com a soma dos recortes — nada de número solto).

import { describe, expect, test } from "bun:test";
import { ACTIVE_WAVE_INPUT, PAST_WAVES } from "./campaign-mock";
import { CANONICAL_JOURNEY } from "@/domain/journey";

const JOURNEY_INSTRUMENTS = new Set(CANONICAL_JOURNEY.map((s) => s.instrumentShort));

describe("campaign-mock — fonte única (jornada canônica)", () => {
  test("o instrumento da onda ativa pertence à jornada canônica", () => {
    expect(JOURNEY_INSTRUMENTS.has(ACTIVE_WAVE_INPUT.instrumentShort)).toBe(true);
  });

  test("todo instrumento do histórico de ondas pertence à jornada", () => {
    for (const w of PAST_WAVES) {
      expect(JOURNEY_INSTRUMENTS.has(w.instrumentShort)).toBe(true);
    }
  });
});

describe("campaign-mock — agregado honesto (total = soma das partes)", () => {
  test("o total de convidados é a soma dos recortes", () => {
    const sum = ACTIVE_WAVE_INPUT.segments.reduce((s, seg) => s + seg.invited, 0);
    expect(ACTIVE_WAVE_INPUT.invitedTotal).toBe(sum);
  });

  test("o total de respondentes é a soma dos recortes", () => {
    const sum = ACTIVE_WAVE_INPUT.segments.reduce((s, seg) => s + seg.responded, 0);
    expect(ACTIVE_WAVE_INPUT.respondedTotal).toBe(sum);
  });

  test("há um recorte com n<5 para provar a trava de privacidade ao vivo", () => {
    expect(ACTIVE_WAVE_INPUT.segments.some((s) => s.responded < 5)).toBe(true);
  });
});
