// PGR Document Engine — engine PURO. O dossiê GRO/PGR que o auditor assina.
//
// Transforma o PgrPlan (inventário de riscos + medidas) num DOCUMENTO estruturado e
// serializável (Markdown portável → vira PDF na camada de export). Compõe a prova
// longitudinal (reavaliação cross-ciclo) quando há histórico: o documento mostra não
// só o plano, mas a EVIDÊNCIA de que as medidas surtiram (ou não).
//
// COMPOSIÇÃO (Fable 5 §5.1):
//   pgr-engine.buildPgrPlan          → inventário + medidas (hierarquia NR-1)  [injetado]
//   capsule-longitudinal-engine      → reavaliação antes/depois               [opcional]
//   ESTE engine                      → documento auditável + serialização
//
// HONESTIDADE (Fable 5 §6, §8 + NR-01):
//   - Risco residual é ESTIMATIVA, declarado como tal. Reavaliação é ASSOCIAÇÃO, não
//     causalidade. Disclaimers verbatim, sem overclaim de "blindagem jurídica".
//   - O documento NÃO é válido sem profissional habilitado: o bloco de assinatura
//     declara isso explicitamente — a ferramenta organiza a evidência, não substitui
//     o responsável técnico (SESMT/médico do trabalho).
//   - Zero dado individual: tudo agregado (k-anon a montante, garantido no plano).
//
// Engine puro: sem React, sem I/O, sem domain/. Determinístico.

import type { PgrPlan, PgrRisk, RiskLevel, ControlTier } from "./pgr-engine";
import type { LongitudinalReading } from "../ai/capsule-longitudinal-engine";

// ─── Metadados do documento ────────────────────────────────────────────────────

export interface PgrDocumentMeta {
  orgName: string;
  sectorLabel: string;
  /** Período de referência, ex.: "T1 2026 · jan–mar". */
  periodLabel: string;
  /** Papel do responsável técnico (NUNCA o nome de uma pessoa). */
  responsibleRole: string;
  /** Identificador do documento (auditoria). */
  documentId: string;
}

// ─── Estrutura do documento ────────────────────────────────────────────────────

export interface PgrDocumentSection {
  id: string;
  title: string;
  /** Parágrafos/linhas prontos para Markdown. */
  body: string[];
}

export interface PgrDocument {
  meta: PgrDocumentMeta;
  generatedAt: string;
  sections: PgrDocumentSection[];
  /** Aviso legal obrigatório no rodapé. */
  legalNotice: string;
  /** True quando o documento inclui evidência de reavaliação longitudinal. */
  hasReavaliacao: boolean;
}

const LEGAL_NOTICE =
  "Documento educativo de apoio à gestão de riscos psicossociais (NR-01). NÃO substitui o PGR " +
  "oficial nem o profissional legalmente habilitado (SESMT / médico do trabalho). O risco residual " +
  "é estimativa orientativa, não garantia de conformidade. Dados agregados e anonimizados (k≥5).";

const TIER_LABEL: Record<ControlTier, string> = {
  eliminacao: "Eliminação / redução na fonte",
  organizacao: "Organização do trabalho",
  administrativa: "Administrativa",
  monitoramento: "Monitoramento",
};

const RISK_PT: Record<RiskLevel, string> = {
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
  critico: "Crítico",
};

// ─── Construção ────────────────────────────────────────────────────────────────

/**
 * Monta o documento GRO/PGR a partir do plano. `longitudinal` (opcional) adiciona
 * a seção de reavaliação com a evidência cross-ciclo.
 */
export function buildPgrDocument(
  plan: PgrPlan,
  meta: PgrDocumentMeta,
  longitudinal?: LongitudinalReading,
): PgrDocument {
  const sections: PgrDocumentSection[] = [
    buildIdentificationSection(plan, meta),
    buildSummarySection(plan),
    buildInventorySection(plan),
    buildMeasuresSection(plan),
  ];

  const hasReavaliacao = !!longitudinal && longitudinal.comparableDimensions > 0;
  if (hasReavaliacao) sections.push(buildReavaliacaoSection(longitudinal!));

  sections.push(buildConclusionSection(plan), buildSignatureSection(meta));

  return {
    meta,
    generatedAt: plan.generatedAt,
    sections,
    legalNotice: LEGAL_NOTICE,
    hasReavaliacao,
  };
}

function buildIdentificationSection(plan: PgrPlan, meta: PgrDocumentMeta): PgrDocumentSection {
  return {
    id: "identificacao",
    title: "1. Identificação",
    body: [
      `**Organização:** ${meta.orgName}`,
      `**Setor / recorte:** ${meta.sectorLabel}`,
      `**Período de referência:** ${meta.periodLabel}`,
      `**Responsável técnico:** ${meta.responsibleRole}`,
      `**Documento:** ${meta.documentId}`,
      `**Gerado em:** ${plan.generatedAt}`,
      `**Horizonte do plano:** ${plan.horizonWeeks} semanas (semana atual ${plan.currentWeek})`,
    ],
  };
}

function buildSummarySection(plan: PgrPlan): PgrDocumentSection {
  const s = plan.summary;
  const coveragePct = Math.round(s.coverage * 100);
  return {
    id: "sumario",
    title: "2. Sumário executivo",
    body: [
      `Riscos inventariados: **${s.total}** (críticos ${s.critico}, altos ${s.alto}, moderados ${s.moderado}, baixos ${s.baixo}).`,
      `Medidas de controle: **${s.measuresTotal}** — implementadas ${s.measuresImplemented} (cobertura ${coveragePct}%).`,
      `Maior risco residual remanescente: **${RISK_PT[s.topResidual]}**.`,
      `Riscos que ainda exigem ação: **${s.requiresActionCount}**; toleráveis: ${s.tolerableCount}.`,
      plan.hiddenRiskCount > 0
        ? `_${plan.hiddenRiskCount} driver(es) com exposição registrada não detalhados neste recorte (priorização)._`
        : "",
    ].filter(Boolean),
  };
}

function buildInventorySection(plan: PgrPlan): PgrDocumentSection {
  const header = [
    "| Fator de risco | Camada | Nível | Prob.×Sev. | Prazo legal | Decisão | Residual |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  const rows = plan.risks.map(
    (r) =>
      `| ${r.label} | ${r.macroLayer} | ${RISK_PT[r.riskLevel]} | ${r.probability}×${r.severity} (${r.riskScore}) | ${r.deadlineLabel} | ${decisionLabel(r)} | ${RISK_PT[r.residual]} |`,
  );
  return {
    id: "inventario",
    title: "3. Classificação de risco (critério de gestão NR-01 — transformação VitalOS)",
    body: [
      "A exposição por dimensão vem da bateria estruturada nas dimensões do COPSOQ II (ver o " +
        "manifesto do instrumento). A classificação abaixo — matriz probabilidade × severidade " +
        "(Guia MTE 2026) — é um CRITÉRIO DE GESTÃO DE RISCO NR-01: uma transformação VitalOS sobre " +
        "essa exposição, não uma métrica nativa nem parte oficial do instrumento COPSOQ II.",
      "",
      ...header,
      ...rows,
    ],
  };
}

function buildMeasuresSection(plan: PgrPlan): PgrDocumentSection {
  const body: string[] = [
    "Hierarquia de controle NR-01 (precedência: a fonte/organização do trabalho antes do " +
      "indivíduo). Medida que isola/culpa a pessoa nunca é a primeira linha.",
    "",
  ];
  for (const r of plan.risks) {
    if (r.measures.length === 0) continue;
    body.push(`**${r.label}** — risco ${RISK_PT[r.riskLevel]} → residual ${RISK_PT[r.residual]}`);
    for (const m of r.measures) {
      body.push(
        `- [${statusMark(m.status)}] _${TIER_LABEL[m.tier]}_: ${m.action} ` +
          `(resp.: ${m.responsible}, prazo sem. ${m.dueWeek}${m.evidence ? `, evidência: ${m.evidence}` : ""})`,
      );
    }
    body.push("");
  }
  return { id: "medidas", title: "4. Medidas de controle (hierarquia NR-01)", body };
}

function buildReavaliacaoSection(reading: LongitudinalReading): PgrDocumentSection {
  const trendWord =
    reading.overallDirection === "melhorando"
      ? "redução agregada de exposição"
      : reading.overallDirection === "piorando"
        ? "aumento agregado de exposição"
        : "estabilidade agregada";
  const header = [
    "| Dimensão | 1º ciclo | Último ciclo | Variação | Tendência |",
    "| --- | --- | --- | --- | --- |",
  ];
  const rows = reading.exposures.map((e) => {
    const sign = e.improvement > 0 ? "−" : e.improvement < 0 ? "+" : "±";
    return `| ${e.label} | ${e.firstLoad} | ${e.lastLoad} | ${sign}${Math.abs(e.improvement)} | ${e.direction} |`;
  });
  return {
    id: "reavaliacao",
    title: "5. Reavaliação longitudinal (evidência de eficácia)",
    body: [
      `Comparação entre ${reading.cycleCount} ciclos (${reading.cycleLabels.join(" → ")}): ${trendWord}. ` +
        `${reading.improvedCount} dimensões melhoraram, ${reading.worsenedCount} pioraram.`,
      "",
      ...header,
      ...rows,
      "",
      `> ${reading.disclaimer}`,
    ],
  };
}

function buildConclusionSection(plan: PgrPlan): PgrDocumentSection {
  const s = plan.summary;
  const verdict =
    s.requiresActionCount === 0
      ? "Todos os riscos inventariados estão em patamar tolerável com as medidas em curso."
      : `${s.requiresActionCount} risco(s) ainda exige(m) ação prioritária — ver prazos no inventário.`;
  return {
    id: "conclusao",
    title: "6. Conclusão e próximos passos",
    body: [
      verdict,
      `O programa será reavaliado ao fim do próximo ciclo de medição (M.E.T.E.), comparando a ` +
        `exposição agregada para aferir a eficácia das medidas implementadas.`,
      plan.disclaimer,
    ],
  };
}

function buildSignatureSection(meta: PgrDocumentMeta): PgrDocumentSection {
  return {
    id: "assinatura",
    title: "7. Responsável técnico",
    body: [
      "Este documento organiza a evidência psicossocial agregada para apoiar o PGR. Sua validade " +
        "depende de revisão e assinatura do profissional legalmente habilitado.",
      "",
      `Função responsável: **${meta.responsibleRole}**`,
      "",
      "Nome: ______________________________  Registro: ____________",
      "",
      "Assinatura: _________________________  Data: ____/____/______",
    ],
  };
}

// ─── Serialização Markdown ─────────────────────────────────────────────────────

/** Serializa o documento em Markdown portável (base para export PDF na Fase 2). */
export function serializePgrDocumentMarkdown(doc: PgrDocument): string {
  const lines: string[] = [
    `# Programa de Gerenciamento de Riscos Psicossociais (NR-01)`,
    `## ${doc.meta.orgName} — ${doc.meta.sectorLabel}`,
    "",
  ];
  for (const section of doc.sections) {
    lines.push(`### ${section.title}`, "");
    for (const line of section.body) lines.push(line);
    lines.push("");
  }
  lines.push("---", "", `_${doc.legalNotice}_`);
  return lines.join("\n");
}

// ─── Utilitários ───────────────────────────────────────────────────────────────

function decisionLabel(r: PgrRisk): string {
  switch (r.decision) {
    case "acao_imediata":
      return "Ação imediata";
    case "adotar_acoes":
      return "Adotar ações";
    case "tolerável":
      return "Tolerável";
  }
}

function statusMark(status: PgrRisk["measures"][number]["status"]): string {
  if (status === "implementada") return "x";
  if (status === "em_andamento") return "~";
  return " ";
}
