// Trail Synthesis Engine — síntese técnica DETERMINÍSTICA de uma trilha
// (LD-006, LDX-2 Fatia E). Estrutura o que a trilha cobriu — mecanismo,
// fontes com desenho e limite, o que foi praticado — para um PDF que a pessoa
// pode levar consigo.
//
// Doutrina (LD-006, risco R3_HIGH): NUNCA "gera o PGR", "garante conformidade"
// ou "laudo automático". Carrega disclaimer de responsabilidade técnica.
// A síntese só reafirma o que já está no registro de evidência congelado
// (desenho + limite de cada estudo) — não cria claim novo, não infere efeito.
// Engine puro: sem React, sem I/O, sem import de src/domain.

export interface SynthesisSource {
  citation: string;
  /** O que a fonte AUTORIZA afirmar — o safe_claim registrado (congelado), que
   * já traz desenho e limite. Reproduzido, nunca reescrito para mais forte. */
  note: string;
}

export interface TrailSynthesisInput {
  trailTitle: string;
  mechanismLabel: string;
  mechanismStatement: string;
  sources: readonly SynthesisSource[];
  /** O que a trilha praticou (quiz, cenários, microlearning) — em texto curto. */
  practiced: readonly string[];
}

export interface TrailSynthesisDocument {
  title: string;
  mechanism: { label: string; statement: string };
  sources: readonly SynthesisSource[];
  practiced: readonly string[];
  disclaimers: readonly string[];
}

/** Frases que esta superfície NUNCA pode conter (LD-006). Exportadas para o
 * teste travar a regressão por construção. */
export const SYNTHESIS_FORBIDDEN_CLAIMS: readonly RegExp[] = [
  /gera o pgr/i,
  /garante conformidade/i,
  /laudo autom[aá]tico/i,
  /substitui (o )?profissional/i,
];

/** Disclaimers obrigatórios da síntese técnica — responsabilidade técnica e
 * natureza educativa. Ficam no documento por construção, sempre. */
export const SYNTHESIS_DISCLAIMERS: readonly string[] = [
  "Este documento é uma síntese educativa da trilha — organiza mecanismo, fontes e prática. Não é laudo, não gera o PGR e não atesta conformidade com a NR-1.",
  "A elaboração do PGR e a avaliação de riscos psicossociais nos termos da NR-1 exigem profissional legalmente habilitado; esta síntese apoia esse trabalho, não o substitui.",
  "As fontes são reproduzidas com o desenho e os limites registrados — associações observadas, nunca garantia de resultado nem generalização automática.",
];

/** Monta a síntese determinística. Os disclaimers são anexados sempre —
 * omiti-los não é uma opção da API. */
export function buildTrailSynthesis(input: TrailSynthesisInput): TrailSynthesisDocument {
  return {
    title: input.trailTitle,
    mechanism: { label: input.mechanismLabel, statement: input.mechanismStatement },
    sources: input.sources.map((s) => ({ ...s })),
    practiced: [...input.practiced],
    disclaimers: [...SYNTHESIS_DISCLAIMERS],
  };
}

/** Texto do CORPO (mecanismo, fontes, prática) — SEM os disclaimers. É aqui
 * que uma claim proibida jamais pode aparecer. Os disclaimers são o único
 * lugar sancionado a NOMEAR essas frases, e sempre na forma negada ("não gera
 * o PGR"), por isso ficam fora desta varredura. */
export function synthesisBodyText(doc: TrailSynthesisDocument): string {
  return [
    doc.title,
    doc.mechanism.label,
    doc.mechanism.statement,
    ...doc.sources.flatMap((s) => [s.citation, s.note]),
    ...doc.practiced,
  ].join(" ");
}
