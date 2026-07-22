import { describe, expect, test } from "bun:test";
import {
  explorerSummary,
  filterStudies,
  groupByAxis,
  normalizeForSearch,
  toExplorerRow,
} from "./evidence-explorer-engine";
import type { EvidenceStudy } from "./passport-engine";

function study(overrides: Partial<EvidenceStudy> & { study_id: string }): EvidenceStudy {
  return {
    aliases: [],
    canonical_citation: `Citação de ${overrides.study_id}`,
    doi: "10.0000/base",
    origin_driver: "Trust",
    access_type: "abstract_and_metadata",
    verification_status: "B2",
    operational_status: "V1",
    evidence_grade: "E3",
    claim_alignment: "C2",
    transposability: "T2",
    legal_status: "L1",
    safe_claim: "Claim seguro registrado.",
    prohibited_claims: [],
    mechanisms: [],
    nascente_candidates: [],
    ...overrides,
  } as EvidenceStudy;
}

/** Confiável, sem ressalva. */
const TRUSTED = study({
  study_id: "TRU-001",
  origin_driver: "Trust",
  canonical_citation: "Edmondson, A. C. (1999). Psychological safety.",
  safe_claim: "Associação entre segurança e aprendizagem.",
  aliases: ["ALT-001"],
  mechanisms: ["reducao_medo"],
});

/** Confiável, mas EXIGE ressalva (C3 com caveat registrado). */
const NEEDS_CAVEAT = study({
  study_id: "LRN-002",
  origin_driver: "Learning",
  claim_alignment: "C3",
  caveat: "Extrapolação — ler com ressalva.",
});

/** REPROVADO: C3 sem caveat registrado (fail-closed). */
const BLOCKED = study({
  study_id: "BLK-003",
  origin_driver: "Learning",
  claim_alignment: "C3",
});

/** Sem DOI no registro — nunca deve ganhar placeholder. */
const NO_DOI = study({ study_id: "NOD-004", origin_driver: "Purpose", doi: null });

const CORPUS = [TRUSTED, NEEDS_CAVEAT, BLOCKED, NO_DOI];

describe("normalizeForSearch", () => {
  test("é insensível a caixa e acento, e colapsa espaços", () => {
    expect(normalizeForSearch("  Segurança   PSICOLÓGICA ")).toBe("seguranca psicologica");
    expect(normalizeForSearch("Ação")).toBe(normalizeForSearch("acao"));
  });
});

describe("filterStudies — fail-closed por padrão", () => {
  test("sem filtros, remove o reprovado no trustGate", () => {
    const ids = filterStudies(CORPUS).map((s) => s.study_id);
    expect(ids).not.toContain("BLK-003");
    expect(ids).toEqual(["TRU-001", "LRN-002", "NOD-004"]);
  });

  test("onlyTrusted:false é a ÚNICA forma de ver o reprovado (escape explícito)", () => {
    const ids = filterStudies(CORPUS, { onlyTrusted: false }).map((s) => s.study_id);
    expect(ids).toContain("BLK-003");
    expect(ids).toHaveLength(4);
  });

  test("preserva a ordem de entrada (determinístico, nunca embaralha)", () => {
    const ids = filterStudies(CORPUS, { onlyTrusted: false }).map((s) => s.study_id);
    expect(ids).toEqual(["TRU-001", "LRN-002", "BLK-003", "NOD-004"]);
  });
});

describe("filterStudies — eixo e busca", () => {
  test("filtra por eixo exato", () => {
    expect(filterStudies(CORPUS, { axis: "Trust" }).map((s) => s.study_id)).toEqual(["TRU-001"]);
  });

  test("eixo vazio/ausente não filtra nada", () => {
    expect(filterStudies(CORPUS, { axis: "  " })).toHaveLength(3);
    expect(filterStudies(CORPUS, {})).toHaveLength(3);
  });

  test("busca varre citação, claim, eixo, id, aliases e mecanismos", () => {
    expect(filterStudies(CORPUS, { query: "edmondson" }).map((s) => s.study_id)).toEqual(["TRU-001"]);
    expect(filterStudies(CORPUS, { query: "aprendizagem" }).map((s) => s.study_id)).toEqual(["TRU-001"]);
    expect(filterStudies(CORPUS, { query: "ALT-001" }).map((s) => s.study_id)).toEqual(["TRU-001"]);
    expect(filterStudies(CORPUS, { query: "reducao_medo" }).map((s) => s.study_id)).toEqual(["TRU-001"]);
  });

  test("busca ignora acento e caixa, nos dois sentidos", () => {
    // Consulta SEM acento encontra texto COM acento ("segurança" no safe_claim).
    expect(filterStudies(CORPUS, { query: "SEGURANCA" }).map((s) => s.study_id)).toEqual(["TRU-001"]);
    // Consulta COM acento também normaliza ("Associação" no safe_claim).
    expect(filterStudies(CORPUS, { query: "Associação" }).map((s) => s.study_id)).toEqual(["TRU-001"]);
    // E a mesma consulta sem o acento encontra o mesmo estudo.
    expect(filterStudies(CORPUS, { query: "associacao" }).map((s) => s.study_id)).toEqual(["TRU-001"]);
  });

  test("busca sem correspondência devolve lista vazia (nunca 'corrige' o termo)", () => {
    expect(filterStudies(CORPUS, { query: "termo-inexistente" })).toEqual([]);
  });

  test("eixo e busca combinam (AND)", () => {
    expect(filterStudies(CORPUS, { axis: "Trust", query: "aprendizagem" })).toHaveLength(1);
    expect(filterStudies(CORPUS, { axis: "Purpose", query: "aprendizagem" })).toHaveLength(0);
  });

  test("o filtro nunca alcança um estudo reprovado, nem por busca direta pelo id", () => {
    expect(filterStudies(CORPUS, { query: "BLK-003" })).toEqual([]);
  });
});

describe("groupByAxis", () => {
  test("conta por eixo e ordena por contagem, empate alfabético", () => {
    const grouped = groupByAxis([TRUSTED, NEEDS_CAVEAT, BLOCKED, NO_DOI]);
    expect(grouped).toEqual([
      { axis: "Learning", count: 2 },
      { axis: "Purpose", count: 1 },
      { axis: "Trust", count: 1 },
    ]);
  });

  test("corpus vazio devolve lista vazia", () => {
    expect(groupByAxis([])).toEqual([]);
  });
});

describe("explorerSummary — honestidade do corpus", () => {
  test("separa confiáveis, os que exigem ressalva e os bloqueados", () => {
    const s = explorerSummary(CORPUS);
    expect(s.total).toBe(4);
    expect(s.trusted).toBe(3);
    expect(s.requiringCaveat).toBe(1); // NEEDS_CAVEAT
    expect(s.blocked).toBe(1); // BLOCKED
    expect(s.axes).toBe(3);
  });

  test("withDoi conta só quem declara DOI — a diferença fica visível, não disfarçada", () => {
    const s = explorerSummary(CORPUS);
    expect(s.withDoi).toBe(3); // NO_DOI fora
    expect(s.total - s.withDoi).toBe(1);
  });

  test("corpus vazio: zeros honestos, sem NaN", () => {
    const s = explorerSummary([]);
    expect(s).toEqual({
      total: 0,
      trusted: 0,
      requiringCaveat: 0,
      blocked: 0,
      withDoi: 0,
      axes: 0,
    });
  });
});

describe("toExplorerRow — NENHUM DOI inventado (acceptanceCriteria)", () => {
  test("DOI ausente permanece null — jamais placeholder", () => {
    const row = toExplorerRow(NO_DOI);
    expect(row.doi).toBeNull();
    // Nada de "n/a", "—", "sem DOI" ou string vazia se passando por dado.
    expect(typeof row.doi).not.toBe("string");
  });

  test("DOI presente é reproduzido tal e qual", () => {
    expect(toExplorerRow(TRUSTED).doi).toBe("10.0000/base");
  });

  test("carrega a ressalva obrigatória quando o registro exige", () => {
    expect(toExplorerRow(NEEDS_CAVEAT).requiredCaveat).toBe("Extrapolação — ler com ressalva.");
    expect(toExplorerRow(TRUSTED).requiredCaveat).toBeNull();
  });

  test("reproduz citação e eixo sem reescrever", () => {
    const row = toExplorerRow(TRUSTED);
    expect(row.citation).toBe("Edmondson, A. C. (1999). Psychological safety.");
    expect(row.axis).toBe("Trust");
    expect(row.studyId).toBe("TRU-001");
  });
});
