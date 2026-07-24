// Scanner auxiliar de claims comerciais órfãos (H2.1B MVP, §12). Complementa
// o registry — NUNCA autoriza. Varre texto público em busca de padrões de
// alto risco (percentuais, moedas, razões, "garantido", "validado",
// "chancela"...) e classifica cada achado:
//
//   governado  — o trecho pertence a uma variante de um claim approved do
//                registry (rastreável, com fonte e limitação).
//   suspeito   — bate um termo de risco, mas é uma exceção estrutural
//                conhecida (Q1/Q2, versão, data, contagem de itens/dimensões,
//                n≥5) — não é um overclaim, só ruído do regex.
//   órfão      — bate um termo de risco, não é governado nem é exceção
//                estrutural. É o único caso que falha o gate (§12: "somente
//                uso órfão em categoria de risco deve falhar").
//
// Regex é rede auxiliar, não fonte única de verdade (§12) — por isso a
// classificação sempre confere primeiro contra o registry real antes de
// decidir "órfão".

import { getCommercialClaimsRegistry } from "./commercial-claims-registry";

export type ScanClassification = "governed" | "suspicious" | "orphan";

export interface ScanFinding {
  term: string;
  match: string;
  context: string;
  classification: ScanClassification;
}

/** Termos de risco (§12) — cada um é testado independentemente contra o texto. */
const RISK_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "percentual", pattern: /\d+%/g },
  { label: "multiplicador", pattern: /\d+×/g },
  { label: "moeda", pattern: /R\$\s?[\d.,]+(?:\s?(?:mi|mil|tri|bi))?/gi },
  { label: "razão", pattern: /\b\d+:\d+\b/g },
  { label: "garantido", pattern: /garantid[oa]/gi },
  { label: "validado", pattern: /validad[oa]/gi },
  { label: "certificado", pattern: /certificad[oa]/gi },
  { label: "conformidade", pattern: /conformidade/gi },
  { label: "diagnóstico", pattern: /diagnóstico/gi },
  { label: "anonimato", pattern: /anonimato/gi },
  { label: "chancela", pattern: /chancela/gi },
  { label: "parceria", pattern: /parceria/gi },
  { label: "benchmark", pattern: /benchmark/gi },
  { label: "multa", pattern: /\bmulta/gi },
  { label: "por trabalhador", pattern: /por trabalhador/gi },
  { label: "pagar por si", pattern: /pagar por si/gi },
  { label: "retorno mensurável", pattern: /retorno mensurável/gi },
];

/** Exceções estruturais conhecidas (§12) — nunca viram "órfão". */
const SAFE_EXCEPTIONS: ReadonlyArray<RegExp> = [
  /^Q[1-5]$/,
  /^vers[ãa]o\s*1\.0$/i,
  /^\d{4}-\d{2}-\d{2}$/,
  /^41 itens$/i,
  /^41$/,
  /^14 dimens/i,
  /^14$/,
  /^12$/,
  /n\s*≥\s*5/i,
  /^k\s*[≥>=]\s*5$/i,
];

function contextAround(haystack: string, index: number, length: number): string {
  const start = Math.max(0, index - 30);
  const end = Math.min(haystack.length, index + length + 30);
  return haystack.slice(start, end);
}

/** Todas as variantes de todos os claims approved — texto "governado" por definição. */
function governedTexts(): string[] {
  const registry = getCommercialClaimsRegistry();
  return registry.claims
    .filter((c) => c.status === "approved")
    .flatMap((c) => Object.values(c.variants));
}

interface GovernedSpan {
  start: number;
  end: number;
}

/** Todas as posições [start,end) onde um texto de claim governado aparece dentro de `haystack`. */
function governedSpans(haystack: string, governed: string[]): GovernedSpan[] {
  const spans: GovernedSpan[] = [];
  for (const text of governed) {
    if (text.length === 0) continue;
    let from = 0;
    let idx: number;
    while ((idx = haystack.indexOf(text, from)) !== -1) {
      spans.push({ start: idx, end: idx + text.length });
      from = idx + text.length;
    }
  }
  return spans;
}

function matchIsWithinGovernedSpan(matchIndex: number, matchLength: number, spans: GovernedSpan[]): boolean {
  const matchEnd = matchIndex + matchLength;
  return spans.some((span) => matchIndex >= span.start && matchEnd <= span.end);
}

function isSafeException(matchText: string, context: string): boolean {
  return SAFE_EXCEPTIONS.some((re) => re.test(matchText) || re.test(context));
}

/**
 * Varre um texto (já extraído de uma superfície pública) e devolve os
 * achados classificados. Não lê arquivo nenhum sozinho — quem chama decide
 * qual texto é "superfície pública" (mesmo padrão do
 * findForbiddenClaimMatches do manifesto COPSOQ).
 *
 * "Governado" é decidido por SPAN, não por janela de contexto fixa: primeiro
 * localizamos onde cada texto aprovado do registry aparece literalmente
 * dentro do texto varrido, depois cada match de risco é governado só se cair
 * inteiramente dentro de um desses spans — não importa quão longa seja a
 * frase aprovada nem onde o match caia dentro dela.
 *
 * `governedTextsOverride` é só para teste (mesmo espírito do 2º parâmetro do
 * resolver) — nenhum caller real do MVP passa isso, sempre usa o registry
 * real via `governedTexts()`.
 */
export function scanCommercialSurfaceText(
  text: string,
  governedTextsOverride?: string[],
): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const spans = governedSpans(text, governedTextsOverride ?? governedTexts());

  for (const { label, pattern } of RISK_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const matchText = m[0];
      const context = contextAround(text, m.index, matchText.length);

      let classification: ScanClassification;
      if (matchIsWithinGovernedSpan(m.index, matchText.length, spans)) {
        classification = "governed";
      } else if (isSafeException(matchText, context)) {
        classification = "suspicious";
      } else {
        classification = "orphan";
      }

      findings.push({ term: label, match: matchText, context, classification });

      if (!re.global) break;
    }
  }

  return findings;
}

/** Achados que devem falhar o gate — só órfãos em categoria de risco (§12). */
export function orphanFindings(text: string, governedTextsOverride?: string[]): ScanFinding[] {
  return scanCommercialSurfaceText(text, governedTextsOverride).filter(
    (f) => f.classification === "orphan",
  );
}
