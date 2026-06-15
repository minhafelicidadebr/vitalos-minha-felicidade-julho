// Teste de integração ponta-a-ponta — prova que a INTEGRAÇÃO dos motores se
// sustenta (a tese do genesis: "a disrupção é a integração, não uma feature").
// Encadeia os motores com os mocks reais e verifica invariantes cruzados:
// IVO → priority → forecast → P&L → ESG → evidence → benchmark → signals →
// panorama → agent → consent. Se uma composição quebrar, este teste pega.

import { describe, expect, test } from "bun:test";
import ivoFramework from "./domain/packs/enterprise/ivo-framework.json";
import type { ProprietaryIndex } from "./engine/pack/pack-types";

import { calculateIVO } from "./engine/index/ivo-engine";
import { rankPriorities } from "./engine/priority/priority-engine";
import { projectForecast } from "./engine/forecast/forecast-engine";
import { calculatePnL, DEFAULT_INPUTS } from "./engine/pnl/pnl-engine";
import { deriveEsgReadiness, type PillarScore } from "./engine/esg/esg-engine";
import { evaluateEvidence } from "./engine/lab/evidence-engine";
import { buildBenchmark } from "./engine/benchmark/benchmark-engine";
import { reconcileSignals } from "./engine/signals/signals-engine";
import { buildPanorama } from "./engine/panorama/panorama-engine";
import { proposeActions } from "./engine/ai/agent-engine";
import {
  orgChannelAvailable,
  partitionByConsent,
  usableChannelIds,
} from "./engine/trust/consent-engine";

import { ivoCurrentCycle, ivoPreviousCycle } from "./mocks/ivo-mock";
import { FORECAST_LEVERS, MATURITY_BANDS, pillarsFromIvo } from "./mocks/forecast-mock";
import { ESG_MAPPING } from "./mocks/esg-mock";
import { EXPERIMENT_CASES } from "./mocks/experiment-mock";
import { SECTOR_COHORTS, orgMetricsFromIvo } from "./mocks/benchmark-mock";
import { PERCEPTION_BEHAVIOR_INPUT } from "./mocks/signals-mock";
import { CONSENT_CHANNELS, SIGNAL_ALERT } from "./mocks/consent-mock";

const index = ivoFramework as unknown as ProprietaryIndex;
const ivo = calculateIVO(ivoCurrentCycle, index);
const ivoPrev = calculateIVO(ivoPreviousCycle, index);
const pillars = pillarsFromIvo(ivo);
const toScore = (p: (typeof pillars)[number]): PillarScore => ({
  pillarId: p.pillarId,
  name: p.name,
  score: p.score,
  visible: p.visible,
});

// ─── O elo base ───────────────────────────────────────────────────────────────

describe("integração — IVO é a fonte", () => {
  test("IVO calcula em faixa válida com 16 pilares", () => {
    expect(ivo.ivoScore).toBeGreaterThanOrEqual(0);
    expect(ivo.ivoScore).toBeLessThanOrEqual(1000);
    expect(pillars).toHaveLength(16);
    expect(ivo.maturityLevel.name.length).toBeGreaterThan(0);
  });
});

// ─── Priorização → forecast → P&L → ESG ──────────────────────────────────────

describe("integração — agir → projetar → traduzir", () => {
  const priorities = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });

  test("prioridades ranqueadas por alavancagem, todas derivadas do IVO", () => {
    expect(priorities.items.length).toBe(FORECAST_LEVERS.length);
    const lifts = priorities.items.map((i) => i.expectedIvoLift);
    for (let i = 1; i < lifts.length; i++) expect(lifts[i - 1]!).toBeGreaterThanOrEqual(lifts[i]!);
  });

  test("forecast projeta a partir dos pilares e P&L traduz o delta", () => {
    const forecast = projectForecast({
      pillars,
      levers: FORECAST_LEVERS,
      activeLeverIds: ["energia_carga", "reconhecimento"],
      seasons: 4,
      scenario: "medio",
      maturityLevels: MATURITY_BANDS,
    });
    expect(forecast.steps).toHaveLength(4);
    expect(forecast.finalIvo).toBeGreaterThanOrEqual(0);
    expect(forecast.finalIvo).toBeLessThanOrEqual(1000);

    const pnl = calculatePnL(DEFAULT_INPUTS, Math.max(0, forecast.ivoDelta), "médio");
    expect(pnl.avoidedCost).toBeGreaterThanOrEqual(0);

    // ESG move junto com os pilares projetados
    const esgNow = deriveEsgReadiness(pillars.map(toScore), ESG_MAPPING);
    const esgNext = deriveEsgReadiness(forecast.projectedPillars.map(toScore), ESG_MAPPING);
    expect(esgNext.overallScore ?? 0).toBeGreaterThanOrEqual(esgNow.overallScore ?? 0);
  });
});

// ─── Evidência ────────────────────────────────────────────────────────────────

describe("integração — comprovar", () => {
  test("todo experimento concluído produz um veredito; n<5 fica protegido", () => {
    const concluded = EXPERIMENT_CASES.filter((c) => c.status === "concluido" && c.observed);
    expect(concluded.length).toBeGreaterThan(0);
    for (const c of concluded) {
      const v = evaluateEvidence(c.observed!);
      expect(v.verdict).toBeDefined();
      if (c.observed!.n < 5) {
        expect(v.verdict).toBe("protegido");
        expect(v.reportable).toBe(false);
      }
    }
  });
});

// ─── Benchmark (k-anon entre tenants) ────────────────────────────────────────

describe("integração — benchmark e k-anon entre tenants", () => {
  test("coorte cheio compara; coorte com <5 orgs fica protegido", () => {
    const metrics = orgMetricsFromIvo(ivo);
    const full = SECTOR_COHORTS.find((c) => c.nOrgs >= 5)!;
    const thin = SECTOR_COHORTS.find((c) => c.nOrgs < 5)!;

    const ok = buildBenchmark(metrics, full);
    expect(ok.available).toBe(true);
    expect(ok.overall).not.toBeNull();

    const protectedR = buildBenchmark(metrics, thin);
    expect(protectedR.available).toBe(false);
    expect(protectedR.rows).toHaveLength(0);
  });
});

// ─── Sinais Vivos (percepção × comportamento) ────────────────────────────────

describe("integração — percepção × comportamento", () => {
  test("reconciliação usa percepção do IVO ao vivo e dá índice válido", () => {
    const perceptionByPillar = new Map(
      ivo.lenses.flatMap((l) => l.pillars.map((p) => [p.pillarId, p.score] as const)),
    );
    const pairs = PERCEPTION_BEHAVIOR_INPUT.map((p) => ({
      pillarId: p.pillarId,
      pillarName: p.pillarName,
      perceptionScore: perceptionByPillar.get(p.pillarId) ?? p.perceptionScore,
      behaviorValue: p.behaviorValue,
    }));
    const recon = reconcileSignals(pairs);
    expect(recon.alignmentIndex).toBeGreaterThanOrEqual(0);
    expect(recon.alignmentIndex).toBeLessThanOrEqual(100);
    expect(recon.pairs).toHaveLength(pairs.length);
  });
});

// ─── Panorama: síntese de tudo ───────────────────────────────────────────────

describe("integração — síntese executiva", () => {
  test("panorama compõe IVO, prioridade, projeção, ESG, prova e ritmo", () => {
    const priorities = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });
    const top = priorities.items[0]!;
    const forecast = projectForecast({
      pillars,
      levers: FORECAST_LEVERS,
      activeLeverIds: ["energia_carga", "reconhecimento"],
      seasons: 4,
      scenario: "medio",
      maturityLevels: MATURITY_BANDS,
    });
    const verdicts = EXPERIMENT_CASES.filter((c) => c.status === "concluido" && c.observed).map(
      (c) => evaluateEvidence(c.observed!),
    );
    const confirmed = verdicts.filter(
      (v) => v.verdict === "confirmado" || v.verdict === "superou",
    ).length;

    const panorama = buildPanorama({
      ivoScore: ivo.ivoScore,
      ivoDelta: ivo.ivoScore - ivoPrev.ivoScore,
      maturityName: ivo.maturityLevel.name,
      respondents: ivo.totalRespondents,
      participationPct: 72,
      topPriorityLabel: top.label,
      topPriorityOwner: null,
      topPriorityLift: top.expectedIvoLift,
      projectedIvo: forecast.finalIvo,
      projectedDelta: forecast.ivoDelta,
      avoidedCostLabel: "R$ 1 mi",
      esgNow: 540,
      esgNext: 600,
      experimentsConcluded: verdicts.length,
      experimentsConfirmed: confirmed,
      seasonName: "Primavera da Vitalidade",
      phaseLabel: "Transformar",
    });
    expect(["avancando", "estavel", "atencao", "risco"]).toContain(panorama.tone);
    expect(panorama.heroMetrics).toHaveLength(4);
    expect(panorama.arc.map((a) => a.id)).toEqual(["medir", "agir", "projetar", "provar"]);
  });
});

// ─── FlorescerIA proativa × consentimento (invariantes) ──────────────────────

describe("integração — IA proativa governada por consentimento", () => {
  const priorities = rankPriorities(pillars, FORECAST_LEVERS, { scenario: "medio" });
  const top = priorities.items[0]!;
  const proposals = proposeActions({
    topPriority: {
      leverId: top.leverId,
      label: top.label,
      owner: null,
      lift: top.expectedIvoLift,
      isQuickWin: top.isQuickWin,
    },
    signalAlert: SIGNAL_ALERT,
    phaseId: "transformar",
    seasonName: "Primavera da Vitalidade",
  });

  test("toda proposta exige aprovação humana e passa guardrails", () => {
    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals.every((p) => p.requiresApproval === true)).toBe(true);
    expect(proposals.every((p) => p.guardrailsOk === true)).toBe(true);
  });

  test("consentimento particiona propostas sem perder nenhuma", () => {
    const usable = usableChannelIds(CONSENT_CHANNELS);
    const { allowed, blocked } = partitionByConsent(proposals, usable);
    expect(allowed.length + blocked.length).toBe(proposals.length);
  });

  test("Sinais Vivos disponíveis no nível da org (consentimento coletivo atingido)", () => {
    const signals = CONSENT_CHANNELS.find((c) => c.id === "signals")!;
    expect(orgChannelAvailable(signals)).toBe(true);
  });
});
