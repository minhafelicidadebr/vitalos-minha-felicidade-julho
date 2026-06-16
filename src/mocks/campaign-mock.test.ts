// Consistência das ondas: a campanha NÃO pode divergir da jornada canônica (cada
// onda da empresa aplica um instrumento da jornada) e o agregado é honesto (total =
// soma dos recortes). Cobre também o seletor por setor (Mensurar é setor-agnóstico).

import { describe, expect, test } from "bun:test";
import {
  ENTERPRISE_WAVES,
  SCHOOL_WAVES,
  getActiveWave,
  getSectorWaves,
  ACTIVE_WAVE_INPUT,
} from "./campaign-mock";
import { computeWave, type MeasurementWaveInput } from "@/engine/campaign/campaign-engine";
import { CANONICAL_JOURNEY } from "@/domain/journey";

const JOURNEY_INSTRUMENTS = new Set(CANONICAL_JOURNEY.map((s) => s.instrumentShort));

function sumsAreHonest(w: MeasurementWaveInput) {
  const inv = w.segments.reduce((s, seg) => s + seg.invited, 0);
  const res = w.segments.reduce((s, seg) => s + seg.responded, 0);
  expect(w.invitedTotal).toBe(inv);
  expect(w.respondedTotal).toBe(res);
}

describe("campaign-mock — empresa segue a jornada canônica", () => {
  test("toda onda da empresa aplica um instrumento da jornada", () => {
    for (const w of ENTERPRISE_WAVES) {
      expect(JOURNEY_INSTRUMENTS.has(w.instrumentShort)).toBe(true);
    }
  });

  test("as 4 ondas cobrem os 4 instrumentos da jornada", () => {
    expect(new Set(ENTERPRISE_WAVES.map((w) => w.instrumentShort)).size).toBe(4);
  });

  test("o total de cada onda é a soma dos recortes (agregado honesto)", () => {
    for (const w of [...ENTERPRISE_WAVES, ...SCHOOL_WAVES]) sumsAreHonest(w);
  });
});

describe("campaign-mock — seletor por setor", () => {
  test("a onda ativa da empresa está aberta e é a do compat ACTIVE_WAVE_INPUT", () => {
    const active = getActiveWave("enterprise");
    expect(computeWave(active).state).toMatch(/aberta|encerrando/);
    expect(active.id).toBe(ACTIVE_WAVE_INPUT.id);
  });

  test("a Escola tem a sua própria onda ativa (IEV) — Mensurar é setor-agnóstico", () => {
    const active = getActiveWave("school");
    expect(active.instrumentShort).toBe("IEV");
    expect(computeWave(active).state).toMatch(/aberta|encerrando/);
  });

  test("setor desconhecido cai para a linha da empresa", () => {
    expect(getSectorWaves("inexistente")).toBe(ENTERPRISE_WAVES);
  });

  test("cada onda ativa tem um recorte com n<5 (prova a trava ao vivo)", () => {
    for (const id of ["enterprise", "school"]) {
      const active = getActiveWave(id);
      expect(active.segments.some((s) => s.responded < 5)).toBe(true);
    }
  });
});
