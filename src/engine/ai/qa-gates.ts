// QA Gates do Copiloto — validador PURO de um turno contra as regras de qualidade do
// Work-Wellbeing Playbook 2.0 (§ gates de QA). Engine ≠ domínio: recebe um CopilotTurn já
// montado e devolve um laudo; não conhece setor, não faz I/O, é determinístico.
//
// Divisão de responsabilidade (doutrina anti-alucinação, Fable 5 §5.2/§8):
//   G1 — sem referência alucinada  → já garantido no copilot-engine (só responde de chunks reais).
//   G4 — k-anon/LGPD a montante     → já garantido (sinais n<5 chegam como visible=false).
//   G2/G3/G5 — formalizados AQUI, sobre o turno produzido. Hoje atestam o copiloto mock;
//   na Fase 2, são o contrato que a saída do LLM real terá de passar antes de chegar ao usuário.
//
// G2  Integridade de citação  — toda fonte é bem-formada e única; resposta de conhecimento cita.
// G3  Conformidade k-anon     — o texto não vaza indivíduo nem grupo sub-k (n<5).
// G5  Honestidade de método   — sem overclaim; sem afirmar "diagnóstico"/"ranking de pessoas";
//                               rodapé de honestidade sempre presente.

import type { CopilotTurn } from "./copilot-engine";

export type GateId = "G2" | "G3" | "G5";

export interface GateResult {
  gate: GateId;
  title: string;
  passed: boolean;
  /** Por que passou ou falhou (legível, para auditoria e telemetria da Fase 2). */
  detail: string;
}

export interface QaReport {
  passed: boolean;
  results: GateResult[];
  violations: GateResult[];
}

/** Texto visível ao usuário (o que precisa ser auditado). */
function visibleText(turn: CopilotTurn): string {
  return [turn.headline, turn.groundedLine, turn.body, turn.nextStep]
    .filter((s): s is string => Boolean(s && s.trim()))
    .join(" ");
}

/**
 * Um termo é AFIRMADO quando aparece sem uma negação imediatamente antes. Distingue
 * "não faço ranking de pessoas" (honesto) de "faço um ranking" (overclaim). Janela curta
 * antes da ocorrência, suficiente para o padrão "não/nunca/sem/jamais ... <termo>".
 */
function affirmsWithoutNegation(text: string, term: RegExp): boolean {
  const re = new RegExp(term.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, match.index - 28), match.index).toLowerCase();
    if (!/\b(n[ãa]o|nunca|sem|jamais|nenhum|nem)\b/.test(before)) return true;
  }
  return false;
}

// ─── G2 · Integridade de citação ──────────────────────────────────────────────
function gateG2(turn: CopilotTurn): GateResult {
  const base = { gate: "G2" as const, title: "Integridade de citação" };

  const malformed = turn.sources.filter((s) => !s.label?.trim() || !s.chunkId?.trim());
  if (malformed.length > 0) {
    return { ...base, passed: false, detail: "há fonte sem rótulo ou sem chunkId (citação vazia)." };
  }

  const ids = turn.sources.map((s) => s.chunkId);
  if (new Set(ids).size !== ids.length) {
    return { ...base, passed: false, detail: "há citação duplicada (mesmo chunk repetido)." };
  }

  // Resposta de conhecimento = não-recusa com confiança não-baixa. Toda alegação precisa de fonte.
  const isKnowledgeAnswer = turn.refusal === null && turn.confidence !== "baixa";
  if (isKnowledgeAnswer && turn.sources.length === 0) {
    return { ...base, passed: false, detail: "alegação sem citação (resposta sem nenhuma fonte)." };
  }

  return { ...base, passed: true, detail: "fontes bem-formadas, únicas e presentes quando há alegação." };
}

// ─── G3 · Conformidade k-anon (sem vazamento individual/sub-k) ──────────────────
const SUBK_REFERENCE =
  /\b[1-4]\s+(pessoas?|respondentes?|colaboradores?|servidores?|funcion[aá]rios?|moradores?|profissionais?|alunos?)\b/i;
const SMALL_N = /\bn\s*=\s*[1-4]\b/i;

function gateG3(turn: CopilotTurn): GateResult {
  const base = { gate: "G3" as const, title: "Conformidade k-anon" };
  const text = visibleText(turn);

  if (SMALL_N.test(text)) {
    return { ...base, passed: false, detail: "expõe recorte com n<5 (n=1..4) — viola k-anon." };
  }
  if (SUBK_REFERENCE.test(text)) {
    return { ...base, passed: false, detail: "referencia grupo de respondentes sub-k (1 a 4)." };
  }
  return { ...base, passed: true, detail: "fala só de agregados; nenhum recorte sub-k exposto." };
}

// ─── G5 · Honestidade de método (sem overclaim) ─────────────────────────────────
// Overclaim absoluto: nunca legítimo, mesmo negado. O corpus honesto jamais emite isto.
const OVERCLAIM_ABSOLUTE: readonly RegExp[] = [
  /infal[íi]vel/i,
  /\bmilagr\w*/i,
  /100\s*%\s*(de\s+)?(certeza|acerto|garantid\w*|precis\w*|efic\w*)/i,
  /garant\w*\s+(100|resultado|sucesso|cura|melhora|aumento)/i,
  /prev[êe]\s+(o\s+)?futuro/i,
  /cura\s+garantid\w*/i,
  /\bsempre\s+funciona\b/i,
];
// Overclaim contextual: proibido só quando AFIRMADO (a recusa honesta pode citá-los ao negar).
const OVERCLAIM_CONTEXTUAL: readonly { term: RegExp; label: string }[] = [
  { term: /diagn[óo]stic\w*/, label: "diagnóstico clínico" },
  { term: /ranking\s+(de\s+)?(pessoas?|colaboradores?|servidores?|funcion[aá]rios?)/, label: "ranking de pessoas" },
];

function gateG5(turn: CopilotTurn): GateResult {
  const base = { gate: "G5" as const, title: "Honestidade de método" };

  // Rodapé de honestidade é obrigatório em TODO turno (inclusive recusas).
  if (!turn.guardrailNotice?.trim()) {
    return { ...base, passed: false, detail: "rodapé de honestidade (guardrailNotice) ausente." };
  }

  // Recusas explicam limites e podem citar termos proibidos ao NEGÁ-los — não se aplica overclaim.
  if (turn.refusal !== null) {
    return { ...base, passed: true, detail: "recusa honesta; rodapé presente." };
  }

  const text = visibleText(turn);

  const absolute = OVERCLAIM_ABSOLUTE.find((re) => re.test(text));
  if (absolute) {
    return { ...base, passed: false, detail: `overclaim absoluto no texto (padrão ${absolute}).` };
  }

  const contextual = OVERCLAIM_CONTEXTUAL.find((o) => affirmsWithoutNegation(text, o.term));
  if (contextual) {
    return { ...base, passed: false, detail: `afirma "${contextual.label}" sem negação — overclaim.` };
  }

  return { ...base, passed: true, detail: "sem overclaim; método apresentado com honestidade." };
}

/** Avalia um turno do copiloto contra G2/G3/G5. Determinístico. */
export function evaluateTurn(turn: CopilotTurn): QaReport {
  const results = [gateG2(turn), gateG3(turn), gateG5(turn)];
  const violations = results.filter((r) => !r.passed);
  return { passed: violations.length === 0, results, violations };
}

/** Atalho booleano para uso em fluxo (Fase 2: barrar saída do LLM que não passe). */
export function turnPassesQa(turn: CopilotTurn): boolean {
  return evaluateTurn(turn).passed;
}
