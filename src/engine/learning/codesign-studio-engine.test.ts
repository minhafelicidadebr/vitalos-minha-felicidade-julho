import { describe, expect, test } from "bun:test";
import {
  buildTraceableExport,
  readyForReview,
  setDeadline,
  setField,
  setIndicator,
  setMeasureTarget,
  setOwnerRole,
  setScope,
  startDraft,
  toggleAdverseEffect,
  validateDraft,
  type CodesignDraft,
} from "./codesign-studio-engine";

const REQUIRED = [
  "hypothesis",
  "eligible_context",
  "process_metrics",
  "outcome_metrics",
  "adverse_effects_monitored",
  "stop_rule",
] as const;

const WATCHLIST = [
  "intensificação do trabalho",
  "exclusão de quem não participa",
] as const;

/** Rascunho completo e válido (escopo de equipe, alvo processo). */
function validDraft(): CodesignDraft {
  let d = startDraft("projeto_equipe");
  d = setScope(d, "equipe");
  d = setMeasureTarget(d, "processo");
  for (const key of REQUIRED) d = setField(d, key, `valor de ${key}`);
  d = setIndicator(d, { label: "Horas extras", baseline: "6h", target: "3h", unit: "h/semana" });
  d = setOwnerRole(d, "LIDER_EQUIPE");
  d = setDeadline(d, "2026-09-30");
  d = toggleAdverseEffect(d, WATCHLIST[0]);
  return d;
}

describe("startDraft", () => {
  test("nasce vazio com o padrão carimbado", () => {
    const d = startDraft("experimento_cultural");
    expect(d.patternId).toBe("experimento_cultural");
    expect(d.scope).toBeNull();
    expect(d.fields).toEqual({});
    expect(d.acknowledgedAdverseEffects).toEqual([]);
  });
});

describe("validateDraft — campos obrigatórios", () => {
  test("um rascunho completo é válido", () => {
    const v = validateDraft(validDraft(), REQUIRED, WATCHLIST);
    expect(v.valid).toBe(true);
    expect(v.errors).toEqual([]);
    expect(v.guardrailErrors).toEqual([]);
  });

  test("acusa cada campo obrigatório ausente do padrão", () => {
    let d = startDraft("projeto_equipe");
    d = setScope(d, "equipe");
    d = setMeasureTarget(d, "processo");
    const v = validateDraft(d, REQUIRED, WATCHLIST);
    for (const key of REQUIRED) {
      expect(v.errors).toContain(`campo obrigatório ausente: ${key}`);
    }
  });

  test("indicador exige baseline e alvo", () => {
    let d = validDraft();
    d = setIndicator(d, { label: "x", baseline: "", target: "", unit: "u" });
    const v = validateDraft(d, REQUIRED, WATCHLIST);
    expect(v.errors).toContain("indicador sem baseline");
    expect(v.errors).toContain("indicador sem alvo");
  });

  test("exige reconhecer ao menos um efeito adverso da watchlist", () => {
    let d = validDraft();
    d = toggleAdverseEffect(d, WATCHLIST[0]); // desmarca o único reconhecido
    const v = validateDraft(d, REQUIRED, WATCHLIST);
    expect(v.errors).toContain(
      "nenhum efeito adverso reconhecido — reveja a watchlist antes de prosseguir",
    );
  });
});

describe("validateDraft — GUARDRAIL central (R3_HIGH)", () => {
  test("escopo organizacional + medida individualizante é RECUSA estrutural", () => {
    let d = validDraft();
    d = setScope(d, "organizacional");
    d = setMeasureTarget(d, "individuo");
    const v = validateDraft(d, REQUIRED, WATCHLIST);
    expect(v.valid).toBe(false);
    expect(v.guardrailErrors.some((e) => e.includes("não admite medida individualizante"))).toBe(
      true,
    );
    // É guardrail, não "campo faltando" — precisa vir separado para a UI.
    expect(v.errors).not.toContain(v.guardrailErrors[0]);
  });

  test("escopo organizacional com alvo de PROCESSO/POLÍTICA/AMBIENTE é permitido", () => {
    for (const target of ["processo", "politica", "ambiente"] as const) {
      let d = validDraft();
      d = setScope(d, "organizacional");
      d = setMeasureTarget(d, target);
      const v = validateDraft(d, REQUIRED, WATCHLIST);
      expect(v.guardrailErrors).toEqual([]);
    }
  });

  test("medida individualizante é permitida quando o escopo NÃO é organizacional", () => {
    let d = validDraft();
    d = setScope(d, "lideranca");
    d = setMeasureTarget(d, "individuo");
    const v = validateDraft(d, REQUIRED, WATCHLIST);
    expect(v.guardrailErrors).toEqual([]);
  });

  test("dono com cara de nome de pessoa é recusado como guardrail", () => {
    for (const name of ["Ana Souza", "João da Silva", "Marina"]) {
      let d = validDraft();
      d = setOwnerRole(d, name);
      const v = validateDraft(d, REQUIRED, WATCHLIST);
      expect(v.guardrailErrors.some((e) => e.includes("deve ser um PAPEL"))).toBe(true);
    }
  });

  test("papéis canônicos do pack passam sem disparar o guardrail de nome", () => {
    for (const role of ["LIDER_EQUIPE", "RH_ADMIN", "CHRO", "SST_PROFISSIONAL", "RH"]) {
      let d = validDraft();
      d = setOwnerRole(d, role);
      const v = validateDraft(d, REQUIRED, WATCHLIST);
      expect(v.guardrailErrors).toEqual([]);
    }
  });
});

describe("readyForReview + buildTraceableExport", () => {
  test("rascunho válido fica pronto para revisão", () => {
    expect(readyForReview(validDraft(), REQUIRED, WATCHLIST)).toBe(true);
  });

  test("rascunho incompleto nunca fica pronto", () => {
    expect(readyForReview(startDraft("projeto_equipe"), REQUIRED, WATCHLIST)).toBe(false);
  });

  test("export só sai de rascunho válido, e carimba padrão + revisor + timestamp", () => {
    const exp = buildTraceableExport(
      validDraft(),
      REQUIRED,
      WATCHLIST,
      "RH_ADMIN",
      "2026-07-21T10:00:00.000Z",
    );
    expect(exp).not.toBeNull();
    expect(exp!.patternId).toBe("projeto_equipe");
    expect(exp!.reviewedByRole).toBe("RH_ADMIN");
    expect(exp!.reviewedAt).toBe("2026-07-21T10:00:00.000Z");
    expect(exp!.scope).toBe("equipe");
    expect(exp!.indicator.baseline).toBe("6h");
  });

  test("export de rascunho inválido devolve null (nunca exporta meio-plano)", () => {
    const exp = buildTraceableExport(
      startDraft("projeto_equipe"),
      REQUIRED,
      WATCHLIST,
      "RH_ADMIN",
      "2026-07-21T10:00:00.000Z",
    );
    expect(exp).toBeNull();
  });

  test("export exige revisor não-vazio (revisão humana)", () => {
    const exp = buildTraceableExport(
      validDraft(),
      REQUIRED,
      WATCHLIST,
      "  ",
      "2026-07-21T10:00:00.000Z",
    );
    expect(exp).toBeNull();
  });

  test("guardrail violado bloqueia o export mesmo com todos os campos preenchidos", () => {
    let d = validDraft();
    d = setScope(d, "organizacional");
    d = setMeasureTarget(d, "individuo");
    const exp = buildTraceableExport(d, REQUIRED, WATCHLIST, "RH_ADMIN", "2026-07-21T10:00:00.000Z");
    expect(exp).toBeNull();
  });
});

describe("imutabilidade e determinismo", () => {
  test("os setters não mutam o rascunho anterior", () => {
    const base = startDraft("projeto_equipe");
    setScope(base, "equipe");
    setField(base, "hypothesis", "x");
    toggleAdverseEffect(base, WATCHLIST[0]);
    expect(base.scope).toBeNull();
    expect(base.fields).toEqual({});
    expect(base.acknowledgedAdverseEffects).toEqual([]);
  });

  test("buildTraceableExport não chama o relógio por dentro (now injetado)", () => {
    const a = buildTraceableExport(validDraft(), REQUIRED, WATCHLIST, "RH", "2026-01-01T00:00:00Z");
    const b = buildTraceableExport(validDraft(), REQUIRED, WATCHLIST, "RH", "2026-01-01T00:00:00Z");
    expect(a).toEqual(b);
  });
});
