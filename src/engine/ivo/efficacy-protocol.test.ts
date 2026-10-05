import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  EFFICACY_PROTOCOL_CONTRACT,
  assessObservation,
  checkComparability,
  deriveEfficacyState,
  validateEfficacyProtocol,
  validateVerdict,
  windowStatus,
  type EfficacyObservation,
  type EfficacyProtocol,
  type PublicationRef,
  type VerdictInput,
} from "./efficacy-protocol";

// TODOS os dados abaixo são SINTÉTICOS e identificados: verificam o software, não a eficácia de intervenção real.

const ref = (cycleKey: string, over: Partial<PublicationRef> = {}): PublicationRef => ({
  cohortKey: "synthetic-coorte-a",
  cycleKey,
  instrumentVersion: "1.0.0",
  calculationVersion: "fibt-manifest/1.0.0",
  publicationState: "published",
  ...over,
});

const base: EfficacyProtocol = {
  contractVersion: EFFICACY_PROTOCOL_CONTRACT,
  revision: 1,
  objective: "Elevar o Fator Bem-Estar da coorte sintética A após a ação",
  indicator: { label: "Fator Bem-Estar (sintético)", kind: "resultado", origin: "leitura_publicada", unit: "pontos 0–4", direction: "aumentar" },
  baseline: { observedOn: "2026-06-30", population: "Coorte sintética A", source: "Leitura publicada sintética do T2", value: null, ref: ref("2026-T2") },
  target: { kind: "numerico", value: 3 },
  meaningfulDifference: 0.2,
  window: { start: "2026-10-01", end: "2026-12-31" },
  source: "Leitura publicada sintética do T4",
  comparisonRule: { sameCohort: true, sameInstrumentVersion: true, sameCalculationVersion: true, requirePublished: true },
  responsibleRole: "Coordenação de Operações (sintético)",
  reviewerRole: "Revisão metodológica (sintético)",
  limitations: ["Dados sintéticos"],
};

const obs = (over: Partial<EfficacyObservation> = {}): EfficacyObservation => ({ id: "obs-1", observedOn: "2026-11-15", value: null, ref: ref("2026-T4"), ...over });
const errorsOf = (p: EfficacyProtocol) => {
  const r = validateEfficacyProtocol(p);
  return r.ok ? [] : r.errors;
};

describe("protocolo de eficácia — validação prévia", () => {
  test("protocolo completo é aceito", () => {
    expect(validateEfficacyProtocol(base).ok).toBe(true);
  });

  test("indicador de resultado exige baseline, direção e meta", () => {
    expect(errorsOf({ ...base, baseline: null })).toContain("baseline_obrigatorio");
    expect(errorsOf({ ...base, indicator: { ...base.indicator, direction: null } })).toContain("direcao_obrigatoria");
    expect(errorsOf({ ...base, target: null })).toContain("meta_obrigatoria");
  });

  test("indicador de execução dispensa baseline e não vira claim de resultado", () => {
    const execution: EfficacyProtocol = {
      ...base,
      indicator: { label: "Encontros realizados (sintético)", kind: "execucao", origin: "medida_da_organizacao", unit: "encontros", direction: null },
      baseline: null,
      target: { kind: "numerico", value: 4 },
      comparisonRule: { ...base.comparisonRule, sameCohort: false, sameInstrumentVersion: false, sameCalculationVersion: false },
    };
    expect(validateEfficacyProtocol(execution).ok).toBe(true);
    const a = assessObservation({ protocol: execution, observation: obs({ ref: null, value: 4 }), baselineValue: null, observedValue: 4 });
    expect(a.claimScope).toBe("execucao");
    expect(a.observedChange).toBe("nao_comparavel"); // entrega não demonstra evolução quantitativa
    expect(a.targetReached).toBe(true);
  });

  test("revisor distinto do responsável, janela válida e baseline anterior à janela", () => {
    expect(errorsOf({ ...base, reviewerRole: base.responsibleRole })).toContain("revisor_igual_ao_responsavel");
    expect(errorsOf({ ...base, window: { start: "2026-12-31", end: "2026-10-01" } })).toContain("janela_invalida");
    expect(errorsOf({ ...base, baseline: { ...base.baseline!, observedOn: "2026-10-05" } })).toContain("baseline_posterior_a_janela");
  });

  test("valor de leitura publicada não é persistido: só referência", () => {
    expect(errorsOf({ ...base, baseline: { ...base.baseline!, value: 2.4 } })).toContain("baseline_com_valor_de_leitura_publicada");
    expect(errorsOf({ ...base, baseline: { ...base.baseline!, ref: null } })).toContain("baseline_sem_referencia");
  });

  test("comparação de leitura nativa exige mesmo recorte e mesmas versões; publicação não é configurável", () => {
    expect(errorsOf({ ...base, comparisonRule: { ...base.comparisonRule, sameInstrumentVersion: false } })).toContain("regra_de_comparacao_insuficiente");
    expect(errorsOf({ ...base, comparisonRule: { ...base.comparisonRule, requirePublished: false as unknown as true } })).toContain("exige_leitura_publicada");
  });

  test("meta qualitativa exige critério descrito", () => {
    expect(errorsOf({ ...base, target: { kind: "qualitativo", criterion: "ok" } })).toContain("criterio_qualitativo_curto");
  });
});

describe("comparabilidade e avaliação da observação", () => {
  test("recusa versão, recorte, publicação e ciclo iguais", () => {
    const rule = base.comparisonRule;
    expect(checkComparability(ref("2026-T2"), ref("2026-T4", { instrumentVersion: "1.1.0" }), rule).reasons).toContain("versao_do_instrumento_diferente");
    expect(checkComparability(ref("2026-T2"), ref("2026-T4", { calculationVersion: "x" }), rule).reasons).toContain("versao_do_calculo_diferente");
    expect(checkComparability(ref("2026-T2"), ref("2026-T4", { cohortKey: "outra" }), rule).reasons).toContain("recorte_diferente");
    expect(checkComparability(ref("2026-T2"), ref("2026-T4", { publicationState: "protected" }), rule).reasons).toContain("observacao_nao_publicada");
    expect(checkComparability(ref("2026-T2"), ref("2026-T2"), rule).reasons).toContain("mesmo_ciclo");
    expect(checkComparability(ref("2026-T2"), ref("2026-T4"), rule)).toEqual({ comparable: true, reasons: [] });
  });

  test("mudança observada respeita direção e diferença mínima do protocolo", () => {
    const improved = assessObservation({ protocol: base, observation: obs(), baselineValue: 2.4, observedValue: 3.1 });
    expect(improved).toMatchObject({ observedChange: "melhorou", targetReached: true, changeIsDescriptiveOnly: false });
    expect(improved.delta).toBeCloseTo(0.7, 10);
    expect(assessObservation({ protocol: base, observation: obs(), baselineValue: 2.4, observedValue: 2.5 }).observedChange).toBe("sem_mudanca");
    expect(assessObservation({ protocol: base, observation: obs(), baselineValue: 2.4, observedValue: 2.0 }).observedChange).toBe("piorou");
    const decrease = { ...base, indicator: { ...base.indicator, direction: "diminuir" as const }, target: { kind: "numerico" as const, value: 2 } };
    const d = assessObservation({ protocol: decrease, observation: obs(), baselineValue: 3, observedValue: 1.9 });
    expect(d).toMatchObject({ observedChange: "melhorou", targetReached: true });
  });

  test("sem diferença mínima definida a mudança é só descritiva", () => {
    const a = assessObservation({ protocol: { ...base, meaningfulDifference: null }, observation: obs(), baselineValue: 2.4, observedValue: 2.45 });
    expect(a.changeIsDescriptiveOnly).toBe(true);
  });

  test("valor ausente ou suprimido nunca vira zero", () => {
    const a = assessObservation({ protocol: base, observation: obs({ ref: ref("2026-T4", { publicationState: "protected" }) }), baselineValue: 2.4, observedValue: null });
    expect(a.delta).toBeNull();
    expect(a.observedChange).toBe("nao_comparavel");
    expect(a.targetReached).toBeNull();
    expect(a.reasons).toContain("valor_observado_ausente");
  });

  test("observação fora da janela não conta", () => {
    const a = assessObservation({ protocol: base, observation: obs({ observedOn: "2027-01-10" }), baselineValue: 2.4, observedValue: 3.5 });
    expect(a.inWindow).toBe(false);
    expect(a.observedChange).toBe("nao_comparavel");
    expect(a.targetReached).toBeNull();
  });
});

describe("estados da avaliação", () => {
  test("sequência sem protocolo → aguardando → em avaliação → parecer", () => {
    expect(deriveEfficacyState({ protocol: null, observations: [], verdict: null })).toBe("sem_protocolo");
    expect(deriveEfficacyState({ protocol: base, observations: [], verdict: null })).toBe("aguardando_observacao");
    expect(deriveEfficacyState({ protocol: base, observations: [{ observedOn: "2027-02-01" }], verdict: null })).toBe("aguardando_observacao");
    expect(deriveEfficacyState({ protocol: base, observations: [{ observedOn: "2026-11-15" }], verdict: null })).toBe("em_avaliacao");
    for (const verdict of ["meta_atingida", "meta_nao_atingida", "inconclusiva"] as const) {
      expect(deriveEfficacyState({ protocol: base, observations: [{ observedOn: "2026-11-15" }], verdict: { verdict, protocolRevision: 1 } })).toBe(verdict);
    }
  });

  test("revisar o protocolo não reescreve o parecer antigo: a nova revisão volta a aguardar", () => {
    const revised = { ...base, revision: 2 };
    expect(deriveEfficacyState({ protocol: revised, observations: [], verdict: { verdict: "meta_atingida", protocolRevision: 1 } })).toBe("aguardando_observacao");
  });

  test("o estado da ação não é entrada e não altera a avaliação", () => {
    const input = { protocol: base, observations: [{ observedOn: "2026-11-15" }], verdict: null };
    const before = deriveEfficacyState(input);
    // @ts-expect-error — campo de estado da ação é deliberadamente inexistente no contrato de entrada
    const after = deriveEfficacyState({ ...input, actionStatus: "concluida" });
    expect(after).toBe(before);
    expect(deriveEfficacyState({ protocol: null, observations: [], verdict: null })).toBe("sem_protocolo");
  });

  test("janela: não iniciada, aberta, encerrada", () => {
    expect(windowStatus(base, "2026-09-30")).toBe("nao_iniciada");
    expect(windowStatus(base, "2026-10-01")).toBe("aberta");
    expect(windowStatus(base, "2027-01-01")).toBe("encerrada");
  });

  test("módulo não importa índice IVO nem máquina de estados da ação", () => {
    const source = readFileSync(join(process.cwd(), "src/engine/ivo/efficacy-protocol.ts"), "utf8");
    for (const forbidden of ["calculateIVO", "ivo-engine", "action-log-engine", "PlanActionStatus", "expected_ivo_lift"]) {
      expect(source.includes(forbidden)).toBe(false);
    }
  });
});

describe("parecer do revisor", () => {
  const assessFavorable = () => assessObservation({ protocol: base, observation: obs(), baselineValue: 2.4, observedValue: 3.1 });
  const verdictFor = (over: Partial<VerdictInput> = {}): VerdictInput => ({
    protocolRevision: 1,
    verdict: "meta_atingida",
    evidenceGrade: "pre_pos",
    observedChange: "melhorou",
    targetReached: true,
    attribution: { status: "nao_avaliada" },
    reason: "",
    reviewerRole: base.reviewerRole,
    limitations: ["Dados sintéticos"],
    ...over,
  });

  test("desfecho favorável coerente com o cálculo", () => {
    expect(validateVerdict(base, assessFavorable(), verdictFor())).toEqual([]);
  });

  test("desfecho desfavorável coerente com o cálculo", () => {
    const a = assessObservation({ protocol: base, observation: obs(), baselineValue: 2.4, observedValue: 2.6 });
    expect(a.targetReached).toBe(false);
    expect(validateVerdict(base, a, verdictFor({ verdict: "meta_nao_atingida", observedChange: "melhorou", targetReached: false }))).toEqual([]);
  });

  test("revisor não contradiz o cálculo nem declara meta sem base", () => {
    const errors = validateVerdict(base, assessFavorable(), verdictFor({ targetReached: false }));
    expect(errors).toContain("meta_divergente_do_calculo");
    expect(errors).toContain("parecer_incoerente_com_meta");
    expect(validateVerdict(base, assessFavorable(), verdictFor({ observedChange: "piorou" }))).toContain("mudanca_divergente_do_calculo");
  });

  test("não comparável só admite parecer inconclusivo, com motivo", () => {
    const a = assessObservation({ protocol: base, observation: obs({ ref: ref("2026-T4", { instrumentVersion: "2.0.0" }) }), baselineValue: 2.4, observedValue: 3.5 });
    expect(a.comparability.comparable).toBe(false);
    expect(validateVerdict(base, a, verdictFor())).toContain("nao_comparavel");
    const inconclusive = verdictFor({ verdict: "inconclusiva", observedChange: "nao_comparavel", targetReached: null, evidenceGrade: "descritiva", reason: "Versão do instrumento mudou entre as leituras" });
    expect(validateVerdict(base, a, inconclusive)).toEqual([]);
    expect(validateVerdict(base, a, { ...inconclusive, reason: "" })).toContain("motivo_obrigatorio");
  });

  test("atribuição causal nunca é padrão e exige desenho descrito", () => {
    const sustained = verdictFor({ attribution: { status: "sustentada_por_desenho" } });
    const errors = validateVerdict(base, assessFavorable(), sustained);
    expect(errors).toContain("desenho_obrigatorio_para_atribuicao");
    expect(errors).toContain("atribuicao_exige_desenho_causal");
    const ok = verdictFor({ evidenceGrade: "desenho_causal", attribution: { status: "sustentada_por_desenho", design: "Grupo de comparação sintético pré-registrado" } });
    expect(validateVerdict(base, assessFavorable(), ok)).toEqual([]);
    expect(verdictFor().attribution.status).toBe("nao_avaliada");
  });

  test("revisor do parecer é o do protocolo e a revisão confere", () => {
    expect(validateVerdict(base, assessFavorable(), verdictFor({ reviewerRole: base.responsibleRole }))).toContain("revisor_diferente_do_protocolo");
    expect(validateVerdict(base, assessFavorable(), verdictFor({ protocolRevision: 2 }))).toContain("revisao_divergente");
  });

  test("parecer sobre execução só tem grau descritivo", () => {
    const execution: EfficacyProtocol = {
      ...base,
      indicator: { label: "Encontros realizados (sintético)", kind: "execucao", origin: "medida_da_organizacao", unit: "encontros", direction: null },
      baseline: null,
      target: { kind: "numerico", value: 4 },
    };
    const a = assessObservation({ protocol: execution, observation: obs({ ref: null, value: 4 }), baselineValue: null, observedValue: 4 });
    const v = verdictFor({ evidenceGrade: "pre_pos", observedChange: "nao_comparavel" });
    expect(validateVerdict(execution, a, v)).toContain("execucao_so_grau_descritivo");
    expect(validateVerdict(execution, a, { ...v, evidenceGrade: "descritiva" })).toEqual([]);
  });
});
