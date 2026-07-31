// Testes canônicos da FIB-T (Furtado, C. A., 2020).
//
// A tabela abaixo é transcrita do PDF em docs/fibt-isg/references/, INDEPENDENTE
// do JSON: item→Fator vem das listas textuais do documento; item→Domínio vem da
// codificação POR COR da seção "DOMÍNIOS FIB" (extraída dos operadores de cor do
// PDF — pdftotext perde essa informação e o mapeamento anterior estava errado em
// 5 itens por causa disso).
//
// Se alguém editar o manifesto, é aqui que quebra. Um teste que só lesse o JSON
// e o comparasse consigo mesmo não provaria nada.

import { describe, expect, test } from "bun:test";
import {
  getFibtManifest,
  itemsOfDomain,
  itemsOfFactor,
  validateFibtManifest,
  fibtUsageAuthorizationRef,
  isFibtClaimAllowed,
  FibtManifestError,
} from "./fibt-instrument";
import {
  FIBT_TOTAL_DOMAINS,
  FIBT_TOTAL_FACTORS,
  FIBT_TOTAL_ITEMS,
  type FibtInstrumentManifest,
} from "./fibt-instrument-types";

const m = getFibtManifest();

/** Fonte: listas "FATOR 1/2/3" do documento. */
const FATOR_CANONICO: Record<string, number[]> = {
  padrao_de_vida: [1, 2, 6, 8, 16, 17, 18, 21, 23, 25, 27, 32],
  bem_estar: [7, 9, 10, 11, 14, 15, 19, 22, 24, 28, 30, 31],
  satisfacao_empresa: [3, 4, 5, 12, 13, 20, 26, 29],
};

/** Fonte: blocos coloridos da seção "DOMÍNIOS FIB". */
const DOMINIO_CANONICO: Record<string, number[]> = {
  padrao_vida: [1, 8, 16, 17, 18],
  educacao: [2, 6, 27, 32],
  cultura: [21, 23, 25],
  bem_estar_emocional: [7, 10, 14, 31],
  saude: [15, 24, 28, 30],
  uso_tempo: [9, 11],
  vitalidade_comunitaria: [19],
  meio_ambiente: [22],
  governanca: [3, 4, 5, 12, 13, 20, 26, 29],
};

const ANCORAS = [
  "Discordo totalmente",
  "Discordo parcialmente",
  "Nao concordo e nem discordo",
  "Concordo parcialmente",
  "Concordo totalmente",
];

const nums = (ids: { number: number }[]) => ids.map((i) => i.number).sort((a, b) => a - b);

describe("FIB-T — estrutura do instrumento", () => {
  test("32 itens, 3 Fatores, 9 Domínios", () => {
    expect(m.items).toHaveLength(FIBT_TOTAL_ITEMS);
    expect(m.factors).toHaveLength(FIBT_TOTAL_FACTORS);
    expect(m.domains).toHaveLength(FIBT_TOTAL_DOMAINS);
  });

  test("itens numerados de 1 a 32, sem buraco nem repetição", () => {
    expect(nums(m.items)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  });

  test("distribuição por Fator é 12 / 12 / 8", () => {
    expect(itemsOfFactor("padrao_de_vida")).toHaveLength(12);
    expect(itemsOfFactor("bem_estar")).toHaveLength(12);
    expect(itemsOfFactor("satisfacao_empresa")).toHaveLength(8);
  });

  test("cada item cai no Fator que o documento indica", () => {
    for (const [factorId, expected] of Object.entries(FATOR_CANONICO)) {
      expect(nums(itemsOfFactor(factorId))).toEqual(expected);
    }
  });

  test("o item 5 pertence ao Fator 3 (Governança), não ao Fator 2", () => {
    // Regressão do P0 desta onda: com o item 5 no Fator 2, o Fator 2 dividia
    // por 13 e o Fator 3 por 7 — o escore bruto saía errado.
    const q5 = m.items.find((i) => i.number === 5)!;
    expect(q5.factor_id).toBe("satisfacao_empresa");
    expect(q5.domain_id).toBe("governanca");
  });

  test("cada item cai no Domínio que a codificação por cor indica", () => {
    for (const [domainId, expected] of Object.entries(DOMINIO_CANONICO)) {
      expect(nums(itemsOfDomain(domainId))).toEqual(expected);
    }
  });

  test("os 5 itens que estavam no Domínio errado antes da FIBT-0", () => {
    const domainOf = (n: number) => m.items.find((i) => i.number === n)!.domain_id;
    expect(domainOf(2)).toBe("educacao");
    expect(domainOf(6)).toBe("educacao");
    expect(domainOf(18)).toBe("padrao_vida");
    expect(domainOf(9)).toBe("uso_tempo");
    expect(domainOf(24)).toBe("saude");
  });

  test("todo Domínio pertence ao Fator que o declara", () => {
    for (const d of m.domains) {
      const f = m.factors.find((x) => x.id === d.factor_id)!;
      expect(f.domain_ids).toContain(d.id);
    }
  });

  test("a soma dos itens dos 9 Domínios cobre os 32 itens exatamente uma vez", () => {
    const todos = Object.values(DOMINIO_CANONICO).flat().sort((a, b) => a - b);
    expect(todos).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  });
});

describe("FIB-T — escala de resposta", () => {
  test("0 a 4 com as cinco âncoras textuais do documento", () => {
    expect(m.response_scale.min).toBe(0);
    expect(m.response_scale.max).toBe(4);
    expect(m.response_scale.anchors.map((a) => a.label)).toEqual(ANCORAS);
  });

  test("cada âncora tem o valor da sua posição", () => {
    m.response_scale.anchors.forEach((a, i) => expect(a.value).toBe(i));
  });
});

describe("FIB-T — cálculo documentado", () => {
  test("subíndice de Fator vai de 0 a 4; escore bruto de 0 a 12", () => {
    expect(m.scoring.factor_range).toEqual({ min: 0, max: 4 });
    expect(m.scoring.raw_score_range).toEqual({ min: 0, max: 12 });
  });

  test("escore bruto é a soma das médias dos três Fatores", () => {
    expect(m.scoring.raw_score_formula.toLowerCase()).toContain("media do fator 1");
    expect(m.scoring.raw_score_formula.toLowerCase()).toContain("media do fator 3");
  });
});

describe("FIB-T — o que o documento NÃO define fica bloqueado", () => {
  test("normalização (índice 0–1000) não é autorizada", () => {
    expect(m.normalization.authorized).toBe(false);
    expect(m.normalization.status).toBe("NOT_DOCUMENTED");
  });

  test("faixas interpretativas não são autorizadas e a lista está vazia", () => {
    expect(m.interpretation_rules.authorized).toBe(false);
    expect(m.interpretation_rules.bands).toHaveLength(0);
  });

  test("imputação de resposta ausente é proibida (fail-closed)", () => {
    expect(m.missing_data_rules.imputation_allowed).toBe(false);
    expect(m.missing_data_rules.policy).toBe("FAIL_CLOSED");
  });

  test("não há item reverso nem peso declarado", () => {
    expect(m.scoring.reverse_scored_items).toHaveLength(0);
    expect(m.scoring.weights).toBeNull();
  });

  test("não há fórmula de subíndice por Domínio", () => {
    expect(m.scoring.domain_formula).toBeNull();
    expect(m.scoring.domain_formula_status).toBe("NOT_DOCUMENTED");
  });

  test("psicometria não é afirmada — o PDF não traz validade nem confiabilidade", () => {
    expect(m.psychometrics.validity_evidence).toBeNull();
    expect(m.psychometrics.reliability).toBeNull();
  });
});

describe("FIB-T — claims", () => {
  test("nenhum claim autorizado menciona índice 0–1000 ou faixa interpretativa", () => {
    const proibido = /0\s*[-–]\s*1000|florescente|em desenvolvimento|fr[aá]gil|saud[aá]vel/i;
    for (const claim of m.allowed_claims) {
      expect(claim).not.toMatch(proibido);
    }
  });

  test("nenhum claim autorizado promete anonimato absoluto ou diagnóstico", () => {
    const proibido = /anonimato (absoluto|garantido)|diagn[oó]stico|ranking|conformidade autom/i;
    for (const claim of m.allowed_claims) {
      expect(claim).not.toMatch(proibido);
    }
  });

  test("a lista de claims proibidos cobre índice, faixas, diagnóstico e ranking", () => {
    const juntos = m.forbidden_claims.join(" | ").toLowerCase();
    expect(juntos).toContain("0 a 1000");
    expect(juntos).toContain("fragil");
    expect(juntos).toContain("diagnostico clinico");
    expect(juntos).toContain("ranking");
  });

  test("claim fora da lista é recusado — não existe 'parecido o bastante'", () => {
    expect(isFibtClaimAllowed(m.allowed_claims[0]!)).toBe(true);
    expect(isFibtClaimAllowed("A FIB-T comprova aumento de produtividade.")).toBe(false);
  });
});

describe("FIB-T — governança e privacidade", () => {
  test("o manifesto metodológico NÃO decide direito de uso nem coleta real", () => {
    // Separação deliberada: colapsar as duas coisas num booleano fazia um
    // bloqueio de engenharia parecer pendência de licença.
    expect(m).not.toHaveProperty("authorized_for_real_collection");
    expect(m).not.toHaveProperty("license_status");
    expect(fibtUsageAuthorizationRef()).toContain("instrument-usage-authorization");
  });

  test("k-anonimato mínimo 5 e escore individual proibido", () => {
    expect(m.privacy.k_anonymity_min).toBeGreaterThanOrEqual(5);
    expect(m.privacy.individual_score_allowed).toBe(false);
  });

  test("a proveniência da fonte está registrada por hash", () => {
    expect(m.source_document_sha256).toHaveLength(64);
    expect(m.source_document).toContain("FIB-T_Furtado_2020.pdf");
  });

  test("as perguntas metodológicas em aberto continuam registradas", () => {
    expect(m.governance.approval_status).toBe("PENDING_HUMAN_METHODOLOGICAL_APPROVAL");
    expect(m.governance.open_questions.length).toBeGreaterThan(0);
  });
});

describe("FIB-T — o loader recusa manifesto adulterado", () => {
  const clone = (): FibtInstrumentManifest =>
    JSON.parse(JSON.stringify(m)) as FibtInstrumentManifest;

  test("recusa índice normalizado ligado", () => {
    const bad = clone();
    (bad.normalization as { authorized: boolean }).authorized = true;
    expect(() => validateFibtManifest(bad)).toThrow(FibtManifestError);
  });

  test("recusa faixa interpretativa introduzida", () => {
    const bad = clone();
    (bad.interpretation_rules as { bands: unknown[] }).bands = [{ label: "florescente" }];
    expect(() => validateFibtManifest(bad)).toThrow(FibtManifestError);
  });

  test("recusa imputação de resposta ausente", () => {
    const bad = clone();
    (bad.missing_data_rules as { imputation_allowed: boolean }).imputation_allowed = true;
    expect(() => validateFibtManifest(bad)).toThrow(FibtManifestError);
  });

  test("recusa item movido para um Domínio de outro Fator", () => {
    const bad = clone();
    bad.items.find((i) => i.number === 5)!.factor_id = "bem_estar";
    expect(() => validateFibtManifest(bad)).toThrow(FibtManifestError);
  });

  test("recusa contagem de itens que não bate com o Fator", () => {
    const bad = clone();
    bad.items = bad.items.filter((i) => i.number !== 32);
    expect(() => validateFibtManifest(bad)).toThrow(FibtManifestError);
  });

  test("recusa ponteiro de autorização que não aponta para o registro certo", () => {
    const bad = clone();
    bad.usage_authorization_ref = "algum-lugar-qualquer.json";
    expect(() => validateFibtManifest(bad)).toThrow(FibtManifestError);
  });

  test("recusa âncora de escala apagada", () => {
    const bad = clone();
    bad.response_scale.anchors[2]!.label = "  ";
    expect(() => validateFibtManifest(bad)).toThrow(FibtManifestError);
  });
});
