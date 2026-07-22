// Testes DOM do Evidence Explorer (LD-005, Fatia B) — happy-dom + Testing
// Library, mesmo padrão de DriverMindMapSvg.test.tsx. A lógica de fail-closed/
// busca/agregação já está travada em evidence-explorer-engine.test.ts (20
// testes); aqui verificamos só o comportamento de UI: interação, os 4 estados
// e a integração real com buildPassport/EvidencePassport.

import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { EvidenceExplorerCard } from "./EvidenceExplorerCard";
import type { EvidenceRegistry, EvidenceStudy } from "@/engine/evidence/passport-engine";
import { EVIDENCE_REGISTRY } from "@/domain/evidence/registries";

function study(overrides: Partial<EvidenceStudy> & Pick<EvidenceStudy, "study_id">): EvidenceStudy {
  return {
    aliases: [],
    canonical_citation: "Autor, A. (2020). Estudo de teste.",
    doi: "10.1000/teste",
    origin_driver: "Learning",
    access_type: "full_text",
    verification_status: "B2",
    operational_status: "V1",
    evidence_grade: "E3",
    claim_alignment: "C1",
    transposability: "T2",
    legal_status: "L0",
    safe_claim: "Claim seguro com pelo menos quarenta caracteres de comprimento útil.",
    prohibited_claims: [],
    mechanisms: ["mecanismo-teste"],
    nascente_candidates: ["nascente-teste"],
    profiles: [],
    last_verified: "2026-01-01",
    ...overrides,
  };
}

const LEARN_1 = study({
  study_id: "LEARN-001",
  origin_driver: "Learning",
  canonical_citation: "Silva, A. (2021). Aprendizagem no trabalho.",
  safe_claim: "A prática espaçada melhora retenção de aprendizagem no contexto de trabalho estudado.",
});

const LEARN_2 = study({
  study_id: "LEARN-002",
  origin_driver: "Learning",
  doi: null,
  canonical_citation: "Souza, B. (2019). Repetição e memória.",
  safe_claim: "A repetição espaçada está associada a maior retenção em contextos organizacionais.",
});

const LEAD_1 = study({
  study_id: "LEAD-001",
  origin_driver: "Leadership",
  claim_alignment: "C3",
  caveat: "Amostra pequena — resultado exploratório, não conclusivo para todos os contextos.",
  canonical_citation: "Costa, C. (2022). Liderança adaptativa.",
  safe_claim: "Lideranças adaptativas correlacionam com maior segurança psicológica percebida pela equipe.",
});

function registryWith(studies: EvidenceStudy[]): EvidenceRegistry {
  return {
    registry: "teste",
    version: "1.0.0-teste",
    frozen: true,
    global_prohibited_claims: [],
    excluded: [],
    studies,
  };
}

const FIXTURE_REGISTRY = registryWith([LEARN_1, LEARN_2, LEAD_1]);

describe("EvidenceExplorerCard — resumo e agregação", () => {
  test("mostra o resumo honesto: total confiável, eixos e ressalvas", () => {
    render(<EvidenceExplorerCard registry={FIXTURE_REGISTRY} />);
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("estudos verificados")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy(); // 2 eixos
    expect(screen.getByText("1")).toBeTruthy(); // 1 com ressalva
    expect(screen.getByText("com ressalva obrigatória")).toBeTruthy();
  });

  test("lista os três estudos por padrão, sem filtro ativo", () => {
    render(<EvidenceExplorerCard registry={FIXTURE_REGISTRY} />);
    expect(screen.getByText(LEARN_1.canonical_citation)).toBeTruthy();
    expect(screen.getByText(LEARN_2.canonical_citation)).toBeTruthy();
    expect(screen.getByText(LEAD_1.canonical_citation)).toBeTruthy();
  });
});

describe("EvidenceExplorerCard — filtro por eixo", () => {
  test("clicar num chip de eixo restringe a lista a esse eixo", () => {
    render(<EvidenceExplorerCard registry={FIXTURE_REGISTRY} />);
    fireEvent.click(screen.getByRole("button", { name: /Leadership \(1\)/ }));
    expect(screen.getByText(LEAD_1.canonical_citation)).toBeTruthy();
    expect(screen.queryByText(LEARN_1.canonical_citation)).toBeNull();
    expect(screen.queryByText(LEARN_2.canonical_citation)).toBeNull();
  });

  test("clicar de novo no mesmo chip desmarca o filtro (volta a 'Todos')", () => {
    render(<EvidenceExplorerCard registry={FIXTURE_REGISTRY} />);
    const chip = screen.getByRole("button", { name: /Leadership \(1\)/ });
    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(screen.getByText(LEARN_1.canonical_citation)).toBeTruthy();
  });
});

describe("EvidenceExplorerCard — busca", () => {
  test("busca por trecho da citação encontra o estudo certo", () => {
    render(<EvidenceExplorerCard registry={FIXTURE_REGISTRY} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "adaptativa" } });
    expect(screen.getByText(LEAD_1.canonical_citation)).toBeTruthy();
    expect(screen.queryByText(LEARN_1.canonical_citation)).toBeNull();
  });

  test("busca é acento-insensível", () => {
    render(<EvidenceExplorerCard registry={FIXTURE_REGISTRY} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "lideranca" } });
    expect(screen.getByText(LEAD_1.canonical_citation)).toBeTruthy();
  });

  test("busca sem resultado mostra o estado vazio com botão de limpar", () => {
    render(<EvidenceExplorerCard registry={FIXTURE_REGISTRY} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz-inexistente" } });
    expect(screen.getByText(/Nenhum estudo encontrado/)).toBeTruthy();
    fireEvent.click(screen.getByText("Limpar filtros"));
    expect(screen.getByText(LEARN_1.canonical_citation)).toBeTruthy();
  });
});

describe("EvidenceExplorerCard — ressalva obrigatória visível", () => {
  test("estudo C3/caveat mostra o badge no card fechado; estudo sem ressalva não mostra", () => {
    render(<EvidenceExplorerCard registry={FIXTURE_REGISTRY} />);
    const leadCard = screen.getByText(LEAD_1.canonical_citation).closest("li")!;
    expect(within(leadCard).getByText("Ressalva obrigatória")).toBeTruthy();
    const learnCard = screen.getByText(LEARN_1.canonical_citation).closest("li")!;
    expect(within(learnCard).queryByText("Ressalva obrigatória")).toBeNull();
  });
});

describe("EvidenceExplorerCard — expandir mostra o passaporte completo", () => {
  test("expandir um card renderiza o Evidence Passport (nível humano por padrão)", () => {
    render(<EvidenceExplorerCard registry={FIXTURE_REGISTRY} />);
    const toggle = screen.getByText(LEARN_1.canonical_citation).closest("button")!;
    fireEvent.click(toggle);
    expect(screen.getByText("Confiança")).toBeTruthy();
    expect(screen.getByText("Passaporte de Evidência")).toBeTruthy();
  });

  test("estudo com ressalva expandido mostra o texto da ressalva no passaporte", () => {
    render(<EvidenceExplorerCard registry={FIXTURE_REGISTRY} />);
    const toggle = screen.getByText(LEAD_1.canonical_citation).closest("button")!;
    fireEvent.click(toggle);
    expect(screen.getByText(/Ressalva obrigatória:/)).toBeTruthy();
    expect(screen.getByText(new RegExp(LEAD_1.caveat!.slice(0, 20)))).toBeTruthy();
  });

  test("nível de leitura Auditoria muda as linhas exibidas ao expandir", () => {
    render(<EvidenceExplorerCard registry={FIXTURE_REGISTRY} />);
    fireEvent.click(screen.getByRole("button", { name: "Auditoria" }));
    const toggle = screen.getByText(LEARN_1.canonical_citation).closest("button")!;
    fireEvent.click(toggle);
    expect(screen.getByText("Códigos")).toBeTruthy();
    expect(screen.getByText("Última verificação")).toBeTruthy();
  });
});

describe("EvidenceExplorerCard — estado de erro (registro inválido)", () => {
  test("registro descongelado/corrompido não renderiza a lista, mostra o motivo", () => {
    const broken: EvidenceRegistry = { ...FIXTURE_REGISTRY, frozen: false };
    render(<EvidenceExplorerCard registry={broken} />);
    expect(screen.getByText("Corpus indisponível")).toBeTruthy();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByText(LEARN_1.canonical_citation)).toBeNull();
  });
});

describe("EvidenceExplorerCard — integração com o registro congelado real", () => {
  test("renderiza sem lançar contra o corpus de 46 estudos e reflete o resumo real", () => {
    render(<EvidenceExplorerCard registry={EVIDENCE_REGISTRY} />);
    expect(screen.getByText("estudos verificados")).toBeTruthy();
    expect(screen.getByText("com ressalva obrigatória")).toBeTruthy();
  });
});
