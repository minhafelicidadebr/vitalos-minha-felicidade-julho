import { describe, expect, test } from "bun:test";
import { SM2_MATURE_INTERVAL_DAYS } from "../learning/sm2-engine";
import {
  assessDiplomaEligibility,
  buildDiploma,
  diplomaVerificationCode,
  DEFAULT_DIPLOMA_CONFIG,
  type DiplomaAward,
  type DiplomaEligibilityInput,
} from "./diploma-engine";

const ELIGIBLE: DiplomaEligibilityInput = {
  pathCompleted: true,
  cardIntervalsDays: [28, 35],
  appliedPracticeCount: 1,
};

describe("diploma-engine — elegibilidade computada (nunca comprada)", () => {
  test("as 3 provas cumpridas → concedido, sem gaps", () => {
    const result = assessDiplomaEligibility(ELIGIBLE);
    expect(result.granted).toBe(true);
    expect(result.gaps).toEqual([]);
    expect(result.criteria.map((c) => c.status)).toEqual(["cumprido", "cumprido", "cumprido"]);
  });

  test("trilha incompleta → não concedido, gap nomeia a trilha", () => {
    const result = assessDiplomaEligibility({ ...ELIGIBLE, pathCompleted: false });
    expect(result.granted).toBe(false);
    expect(result.gaps.some((g) => g.includes("Trilha"))).toBe(true);
  });

  test("retenção imatura (nenhum cartão ≥21d) → não concedido", () => {
    const result = assessDiplomaEligibility({ ...ELIGIBLE, cardIntervalsDays: [7, 14] });
    expect(result.granted).toBe(false);
    expect(result.criteria.find((c) => c.id === "retencao")!.status).toBe("nao_cumprido");
  });

  test("1 cartão maduro quando o mínimo é 2 → não concedido (retenção parcial não certifica)", () => {
    const result = assessDiplomaEligibility({ ...ELIGIBLE, cardIntervalsDays: [30, 7] });
    expect(result.granted).toBe(false);
  });

  test("zero cartões estudados → não concedido (sem prova de retenção não há diploma)", () => {
    const result = assessDiplomaEligibility({ ...ELIGIBLE, cardIntervalsDays: [] });
    expect(result.granted).toBe(false);
  });

  test("sem prática aplicada → não concedido (certifica prática, não presença)", () => {
    const result = assessDiplomaEligibility({ ...ELIGIBLE, appliedPracticeCount: 0 });
    expect(result.granted).toBe(false);
    expect(result.criteria.find((c) => c.id === "pratica")!.status).toBe("nao_cumprido");
  });

  test("maturidade usa a MESMA constante SM2 do app inteiro (limite inclusivo)", () => {
    expect(DEFAULT_DIPLOMA_CONFIG.matureIntervalDays).toBe(SM2_MATURE_INTERVAL_DAYS);
    const atBoundary = assessDiplomaEligibility({
      ...ELIGIBLE,
      cardIntervalsDays: [SM2_MATURE_INTERVAL_DAYS, SM2_MATURE_INTERVAL_DAYS],
    });
    expect(atBoundary.granted).toBe(true);
    const justBelow = assessDiplomaEligibility({
      ...ELIGIBLE,
      cardIntervalsDays: [SM2_MATURE_INTERVAL_DAYS - 1, SM2_MATURE_INTERVAL_DAYS - 1],
    });
    expect(justBelow.granted).toBe(false);
  });

  test("config customizada é respeitada", () => {
    const strict = assessDiplomaEligibility(ELIGIBLE, {
      matureIntervalDays: 40,
      minMatureCards: 2,
      minAppliedPractice: 1,
    });
    expect(strict.granted).toBe(false); // 28 e 35 < 40
  });

  test("os valores exibidos citam os números reais medidos", () => {
    const result = assessDiplomaEligibility(ELIGIBLE);
    expect(result.criteria.find((c) => c.id === "retencao")!.value).toContain("2 cartão");
    expect(result.criteria.find((c) => c.id === "pratica")!.value).toContain("1 registro");
  });
});

describe("diploma-engine — buildDiploma (só existe com prova + consentimento)", () => {
  const base = {
    eligibility: assessDiplomaEligibility(ELIGIBLE),
    recipientName: "Marina Santos",
    credentialTitle: "Diploma Vivo",
    issuerName: "Academia do Florescimento",
    driverLabel: "Energia & Vitalidade",
    pathTitle: "Energia que se Renova",
    awardedOn: "2026-07-07",
  };

  test("elegível + nome consentido → diploma com código de verificação", () => {
    const result = buildDiploma(base);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.award.recipientName).toBe("Marina Santos");
      expect(result.verificationCode).toMatch(/^DV-[0-9A-F]{8}$/);
    }
  });

  test("não elegível → o documento simplesmente não existe", () => {
    const result = buildDiploma({
      ...base,
      eligibility: assessDiplomaEligibility({ ...ELIGIBLE, appliedPracticeCount: 0 }),
    });
    expect(result).toEqual({ ok: false, reason: "not_eligible" });
  });

  test("sem nome consentido → recusa (nome só aparece com consentimento explícito)", () => {
    const result = buildDiploma({ ...base, recipientName: "   " });
    expect(result).toEqual({ ok: false, reason: "missing_recipient_consent" });
  });
});

describe("diploma-engine — código de verificação por conteúdo", () => {
  const award: DiplomaAward = {
    recipientName: "Marina Santos",
    credentialTitle: "Diploma Vivo",
    issuerName: "Academia do Florescimento",
    driverLabel: "Energia & Vitalidade",
    pathTitle: "Energia que se Renova",
    awardedOn: "2026-07-07",
    criteria: assessDiplomaEligibility(ELIGIBLE).criteria,
  };

  test("determinístico: a mesma credencial canônica → o mesmo código, sempre", () => {
    expect(diplomaVerificationCode(award)).toBe(diplomaVerificationCode({ ...award }));
  });

  test("qualquer campo alterado muda o código (a integridade é verificável)", () => {
    const original = diplomaVerificationCode(award);
    expect(diplomaVerificationCode({ ...award, recipientName: "Outra Pessoa" })).not.toBe(original);
    expect(diplomaVerificationCode({ ...award, awardedOn: "2026-07-08" })).not.toBe(original);
    expect(diplomaVerificationCode({ ...award, driverLabel: "Outro Driver" })).not.toBe(original);
  });
});
