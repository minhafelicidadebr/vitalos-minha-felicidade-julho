import { describe, expect, test } from "bun:test";
import {
  buildPgrDocument,
  serializePgrDocumentMarkdown,
  type PgrDocumentMeta,
} from "./pgr-document-engine";
import { buildPgrPlan } from "./pgr-engine";
import { NR1_CROSSWALK, DEMO_COPSOQ_EXPOSURE } from "@/mocks/nr1-crosswalk-mock";
import { PGR_MEASURES } from "@/mocks/pgr-nr1-mock";
import {
  buildLongitudinalReading,
  type LongitudinalReading,
} from "../ai/capsule-longitudinal-engine";
import {
  buildMeasurementCapsule,
  type CapsuleDimensionInput,
} from "../ai/measurement-capsule-engine";

const plan = buildPgrPlan({
  registry: NR1_CROSSWALK,
  exposures: DEMO_COPSOQ_EXPOSURE,
  measures: PGR_MEASURES,
  generatedAt: "2026-06-23",
  currentWeek: 6,
  horizonWeeks: 13,
  topRisks: 5,
});

const meta: PgrDocumentMeta = {
  orgName: "Aurora Indústria S.A.",
  sectorLabel: "Operações",
  periodLabel: "T1 2026 · jan–mar",
  responsibleRole: "SESMT / Médico do Trabalho",
  documentId: "PGR-PSI-2026-T1-OPS",
};

function dim(id: string, label: string, load: number, risk: CapsuleDimensionInput["riskLevel"], isOutcome = false): CapsuleDimensionInput {
  return { dimensionId: id, label, loadScore: load, n: 403, visible: true, riskLevel: risk, isOutcome };
}

function reading(): LongitudinalReading {
  const c1 = buildMeasurementCapsule({
    capsuleId: "c1", packId: "enterprise", waveId: "w1", cohortId: "co1", closedOn: "2025-01-22",
    instrument: "COPSOQ", instrumentShort: "COPSOQ", domain: "B", participantCount: 403, kAnonymityMin: 5,
    dimensions: [dim("demands_quant", "Demandas quantitativas", 80, "critico"), dim("work_pace", "Ritmo", 60, "moderado")],
  });
  const c2 = buildMeasurementCapsule({
    capsuleId: "c2", packId: "enterprise", waveId: "w2", cohortId: "co2", closedOn: "2026-01-22",
    instrument: "COPSOQ", instrumentShort: "COPSOQ", domain: "B", participantCount: 403, kAnonymityMin: 5,
    dimensions: [dim("demands_quant", "Demandas quantitativas", 58, "moderado"), dim("work_pace", "Ritmo", 70, "alto")],
  });
  const r = buildLongitudinalReading({ capsules: [c1, c2] });
  if (!r.ok) throw new Error("reading fixture inválida");
  return r.reading;
}

// ─── Estrutura do documento ────────────────────────────────────────────────────

describe("buildPgrDocument — estrutura", () => {
  test("sem longitudinal: 6 seções (1 identificação … 7 assinatura, sem reavaliação)", () => {
    const doc = buildPgrDocument(plan, meta);
    expect(doc.hasReavaliacao).toBe(false);
    const ids = doc.sections.map((s) => s.id);
    expect(ids).toEqual([
      "identificacao",
      "sumario",
      "inventario",
      "medidas",
      "conclusao",
      "assinatura",
    ]);
  });

  test("com longitudinal: insere a seção de reavaliação antes da conclusão", () => {
    const doc = buildPgrDocument(plan, meta, reading());
    expect(doc.hasReavaliacao).toBe(true);
    const ids = doc.sections.map((s) => s.id);
    expect(ids).toContain("reavaliacao");
    expect(ids.indexOf("reavaliacao")).toBeLessThan(ids.indexOf("conclusao"));
  });

  test("identificação carrega org, setor, período e responsável (papel, não pessoa)", () => {
    const doc = buildPgrDocument(plan, meta);
    const ident = doc.sections.find((s) => s.id === "identificacao")!;
    const text = ident.body.join("\n");
    expect(text).toContain("Aurora Indústria S.A.");
    expect(text).toContain("Operações");
    expect(text).toContain("SESMT / Médico do Trabalho");
  });

  test("inventário tem uma linha de tabela por risco", () => {
    const doc = buildPgrDocument(plan, meta);
    const inv = doc.sections.find((s) => s.id === "inventario")!;
    const dataRows = inv.body.filter((l) => l.startsWith("| ") && !l.includes("---") && !l.includes("Fator de risco"));
    expect(dataRows.length).toBe(plan.risks.length);
  });
});

// ─── Honestidade e invariantes ─────────────────────────────────────────────────

describe("buildPgrDocument — honestidade", () => {
  test("o aviso legal nega substituição de PGR/profissional e declara residual como estimativa", () => {
    const doc = buildPgrDocument(plan, meta);
    expect(doc.legalNotice).toContain("NÃO substitui");
    expect(doc.legalNotice.toLowerCase()).toContain("estimativa");
  });

  test("o bloco de assinatura declara dependência de profissional habilitado", () => {
    const doc = buildPgrDocument(plan, meta);
    const sig = doc.sections.find((s) => s.id === "assinatura")!;
    expect(sig.body.join("\n")).toContain("profissional legalmente habilitado");
  });

  test("a reavaliação repassa o disclaimer de não-causalidade", () => {
    const doc = buildPgrDocument(plan, meta, reading());
    const re = doc.sections.find((s) => s.id === "reavaliacao")!;
    expect(re.body.join("\n")).toContain("causalidade");
  });

  test("medidas seguem a hierarquia NR-01 (fonte/organização aparece antes do indivíduo)", () => {
    const doc = buildPgrDocument(plan, meta);
    const med = doc.sections.find((s) => s.id === "medidas")!.body.join("\n");
    // O texto da seção declara a precedência da fonte/organização.
    expect(med).toContain("organização do trabalho antes do");
  });

  test("Onda T4: a matriz de risco é rotulada como transformação VitalOS, nunca como o COPSOQ II em si", () => {
    const doc = buildPgrDocument(plan, meta);
    const inv = doc.sections.find((s) => s.id === "inventario")!;
    expect(inv.title).toContain("transformação VitalOS");
    expect(inv.title).not.toMatch(/matriz NR-01\)$/); // não mais rotulada como se fosse o próprio instrumento
    const text = inv.body.join("\n");
    expect(text).toContain("CRITÉRIO DE GESTÃO DE RISCO NR-01");
    expect(text).toMatch(/não uma métrica nativa nem parte oficial do instrumento COPSOQ II/);
    // A exposição (camada do instrumento) segue distinta da classificação (camada de gestão).
    expect(text).toContain("bateria estruturada nas dimensões do COPSOQ II");
  });
});

// ─── Serialização Markdown ─────────────────────────────────────────────────────

describe("serializePgrDocumentMarkdown", () => {
  test("produz Markdown com título, todas as seções e o rodapé legal", () => {
    const md = serializePgrDocumentMarkdown(buildPgrDocument(plan, meta, reading()));
    expect(md).toContain("# Programa de Gerenciamento de Riscos Psicossociais (NR-01)");
    expect(md).toContain("### 1. Identificação");
    expect(md).toContain("### 5. Reavaliação longitudinal (evidência de eficácia)");
    expect(md).toContain("### 7. Responsável técnico");
    expect(md).toContain(LEGAL_FRAGMENT);
  });

  test("a tabela de inventário aparece como Markdown válido", () => {
    const md = serializePgrDocumentMarkdown(buildPgrDocument(plan, meta));
    expect(md).toContain("| Fator de risco | Camada | Nível |");
    expect(md).toContain("| --- |");
  });

  test("sem reavaliação, o Markdown não traz a seção 5 de reavaliação", () => {
    const md = serializePgrDocumentMarkdown(buildPgrDocument(plan, meta));
    expect(md).not.toContain("Reavaliação longitudinal");
  });
});

const LEGAL_FRAGMENT = "NÃO substitui o PGR";
