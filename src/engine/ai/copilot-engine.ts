/**
 * Copilot engine — copiloto setorial ATERRADO, setor-agnóstico e puro.
 *
 * Anti-alucinação por desenho (doutrina Fable 5 §5.2, §8): o motor só monta a
 * resposta a partir de (1) chunks de conhecimento recuperados de uma base real
 * (injetada pelo domínio) e (2) métricas já computadas pelos motores. Não há
 * geração livre. Abaixo do limiar de relevância → recusa honesta ("não sei").
 * Intenções que violariam guardrails (dado individual, ranking, punição) →
 * recusa citando o limite. Toda resposta carrega CITAÇÕES e um rodapé de guardrail.
 *
 * Lei de ferro: este arquivo nunca importa de domain/. O KB, as métricas e os
 * guardrails chegam como parâmetro. (Fase 2: o mesmo KB vira contexto do LLM.)
 *
 * GROUNDING DE MENSURAÇÃO (Bloco 2B-2): para perguntas de risco psicossocial /
 * NR-1, o copiloto pode receber um MeasurementContextCapsule selado — o ÚNICO
 * contrato válido entre dados de survey e a IA. O capsule NUNCA bypassa os
 * guardrails (a recusa por desenho roda primeiro) e impõe seus próprios
 * disclaimers obrigatórios. Sem capsule, o comportamento é idêntico ao da Fase 1.
 */

import {
  groundFromCapsule,
  type MeasurementContextCapsule,
} from "./measurement-capsule-engine";
import {
  groundLongitudinalReading,
  type LongitudinalReading,
} from "./capsule-longitudinal-engine";

export type CopilotPov = "tecnico" | "criativo" | "empatico" | "inovador";

export const COPILOT_POVS: readonly CopilotPov[] = ["tecnico", "criativo", "empatico", "inovador"];

/** Um fato citável do ecossistema. `topics` são as âncoras de recuperação. */
export interface KnowledgeChunk {
  id: string;
  topics: readonly string[];
  title: string;
  body: string;
  /** Rótulo de citação exibido ao usuário (a "fonte"). */
  source: string;
}

export interface CopilotKnowledgeBase {
  packId: string;
  indexLabel: string;
  indexFull: string;
  /** Tópicos cobertos — usados na mensagem honesta de fora-de-escopo. */
  coveredTopics: readonly string[];
  chunks: readonly KnowledgeChunk[];
}

/** Métricas já computadas pelos motores (o "mostre a conta"). */
export interface GroundingFacts {
  origin?: "demonstration";
  indexLabel: string;
  score: number;
  maturityName: string;
  momentumLabel: string;
  slopePerCycle: number;
  focusLensName: string | null;
  focusLensQuestion: string | null;
  participationRate: number;
  orgName: string;
}

export interface CopilotQuery {
  question: string;
  pov: CopilotPov;
  /**
   * Se o interlocutor pode ver a leitura COLETIVA (números do índice). Falso para
   * participantes (servidor/morador/profissional) — coerente com a home por audiência:
   * a IA não revela o score coletivo a quem não tem essa capacidade. Default: true.
   */
  canSeeCollective?: boolean;
}

export interface CopilotSource {
  label: string;
  chunkId: string;
}

export type CopilotConfidence = "alta" | "media" | "baixa";

export interface CopilotTurn {
  pov: CopilotPov;
  headline: string;
  /** Frase ancorada na métrica real (pode ser null se a pergunta não pede números). */
  groundedLine: string | null;
  body: string;
  sources: readonly CopilotSource[];
  nextStep: string | null;
  confidence: CopilotConfidence;
  /** Preenchido quando a pergunta é fora de escopo ou violaria um guardrail. */
  refusal: string | null;
  /** Rodapé de honestidade — sempre presente. */
  guardrailNotice: string;
  /**
   * Linha aterrada na MEDIÇÃO real (capsule), quando a pergunta é sobre risco
   * psicossocial/NR-1 e um MeasurementContextCapsule foi fornecido. Null quando
   * não há capsule ou a pergunta não pede leitura de exposição. Distinta de
   * `groundedLine` (que ancora no índice de florescimento — IVO). Opcional: o
   * engine sempre o preenche (string ou null); literais de teste podem omiti-lo.
   */
  capsuleLine?: string | null;
  /**
   * Linha aterrada na EVOLUÇÃO real (leitura longitudinal cross-ciclo), quando a
   * pergunta é sobre progresso/comparação temporal e uma LongitudinalReading foi
   * fornecida. Null quando ausente ou a pergunta não pede evolução. Distinta de
   * `capsuleLine` (estado de um ciclo) — esta fala do antes/depois entre ciclos.
   */
  longitudinalLine?: string | null;
}

const STOPWORDS = new Set([
  "a",
  "o",
  "as",
  "os",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "um",
  "uma",
  "para",
  "por",
  "com",
  "que",
  "no",
  "na",
  "nos",
  "nas",
  "se",
  "ao",
  "à",
  "é",
  "qual",
  "quais",
  "como",
  "quanto",
  "quando",
  "onde",
  "meu",
  "minha",
  "seu",
  "sua",
  "the",
  "of",
  "to",
  "is",
  "what",
  "how",
  "sobre",
  "posso",
  "pode",
  "ser",
  "está",
]);

/** Tokeniza pt-BR de forma simples e determinística (sem acento, minúsculo). */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function normalizeTopic(topic: string): string {
  return topic.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export interface ScoredChunk {
  chunk: KnowledgeChunk;
  score: number;
}

/**
 * Recuperação determinística: sobreposição entre tokens da pergunta e tópicos do
 * chunk (peso 2) + ocorrências dos tópicos no título/corpo (peso 1). Estável e
 * testável — a base do grounding.
 */
export function retrieveChunks(kb: CopilotKnowledgeBase, question: string, max = 3): ScoredChunk[] {
  const qTokens = new Set(tokenize(question));
  if (qTokens.size === 0) return [];

  const scored = kb.chunks.map((chunk) => {
    let score = 0;
    for (const topic of chunk.topics) {
      const t = normalizeTopic(topic);
      if (qTokens.has(t)) score += 2;
      // Casamento parcial conservador: só por PREFIXO e com 4+ caracteres, para
      // evitar coincidências espúrias (ex.: "cotacao" conter "acao").
      else if (
        [...qTokens].some(
          (q) => (q.length >= 4 && t.startsWith(q)) || (t.length >= 4 && q.startsWith(t)),
        )
      ) {
        score += 1;
      }
    }
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, max);
}

// ─── Detecção de intenção que viola guardrails (recusa por desenho) ───────────

interface GuardrailRule {
  /** Padrão de intenção a barrar. */
  match: RegExp;
  /** Por que a IA não faz isso. */
  reason: string;
}

const GUARDRAIL_RULES: readonly GuardrailRule[] = [
  {
    match:
      /(quem respond|fulano|individual|individuais|pessoa espec[ií]f|cada pessoa|identidade de quem|dados pessoais|endere[çc]o de|telefone de|quem faltou|lista de quem|nome de quem|nomes? d[aeo]s? (pessoa|colaborador|funcion|respondente|servidor|morador|aluno|empregad|trabalhador)|me d[aá] o nome|diz o nome|qual o nome de quem|quais os nomes|quem é a pessoa)/i,
    reason:
      "não acesso nem revelo respostas individuais — só agregados protegidos (k≥5). A identidade de quem respondeu é invisível por desenho.",
  },
  {
    match: /(rank|ranking|os melhores|os piores|comparar pessoas|pontuar pessoa)/i,
    reason: "não faço ranking de pessoas. O índice é coletivo e orienta cuidado, não competição.",
  },
  {
    match:
      /(demit|demiss|punir|puni[çc]|advert[eê]nc|desliga|promo[çc][aã]o|desempenho|remunera|sal[aá]rio|credenciament)/i,
    reason:
      "o índice nunca alimenta avaliação de desempenho, promoção, punição, credenciamento ou remuneração. Usá-lo assim quebra a confiança que torna a medição honesta.",
  },
  {
    match: /(diagn[oó]stic|transtorno|depress[aã]o|doen[çc]a de|sa[uú]de de algu[eé]m)/i,
    reason:
      "não faço diagnóstico clínico nem avalio a saúde de indivíduos. Para isso, procure um profissional habilitado / saúde ocupacional.",
  },
];

function detectGuardrailViolation(question: string): string | null {
  for (const rule of GUARDRAIL_RULES) {
    if (rule.match.test(question)) return rule.reason;
  }
  return null;
}

// ─── Vozes por ponto de vista (POV) ───────────────────────────────────────────

interface PovVoice {
  headline: (kb: CopilotKnowledgeBase) => string;
  /** Conector que antecede o corpo, dando o tom do POV. */
  lead: string;
}

const POV_VOICE: Record<CopilotPov, PovVoice> = {
  tecnico: {
    headline: (kb) => `Leitura técnica do ${kb.indexLabel}`,
    lead: "Do ponto de vista técnico, com base nos dados e na metodologia:",
  },
  criativo: {
    headline: () => "Um olhar criativo sobre o que os dados sugerem",
    lead: "Vendo de forma criativa, há caminhos possíveis aqui:",
  },
  empatico: {
    headline: () => "Antes dos números, as pessoas",
    lead: "Com cuidado e escuta, o que isso costuma significar para quem vive o dia a dia:",
  },
  inovador: {
    headline: () => "E se transformássemos isso num experimento?",
    lead: "Numa chave inovadora, dá para testar uma hipótese concreta:",
  },
};

function groundedLineFor(pov: CopilotPov, facts: GroundingFacts): string {
  if (facts.origin === "demonstration") {
    return `Exemplo sintético de demonstração: ${facts.indexLabel} de ${facts.score} pontos, participação de ${facts.participationRate}%.`;
  }
  const base = `${facts.indexLabel} em ${facts.score} (${facts.maturityName}), momentum ${facts.momentumLabel.toLowerCase()} (${facts.slopePerCycle >= 0 ? "+" : ""}${facts.slopePerCycle} pts/ciclo), participação ${facts.participationRate}%`;
  const focus = facts.focusLensName ? `; lente mais aberta hoje: ${facts.focusLensName}` : "";
  if (pov === "empatico") {
    return facts.focusLensName
      ? `Os dados agregados apontam ${facts.focusLensName} como a área que mais pede atenção agora — sem expor ninguém.`
      : `Os dados são agregados e protegidos: falam de tendência coletiva, não de pessoas.`;
  }
  return base + focus + ".";
}

function nextStepFor(
  pov: CopilotPov,
  facts: GroundingFacts,
  topChunk: KnowledgeChunk | null,
): string | null {
  if (pov === "inovador") {
    return facts.focusLensName
      ? `Próximo passo: defina um experimento para "${facts.focusLensName}" e combine o que registrar na execução e na reavaliação (Culture Lab).`
      : "Próximo passo: defina um experimento e combine o que registrar na execução e na reavaliação.";
  }
  if (pov === "empatico") {
    return "Próximo passo: leve isso à equipe como escuta — pergunte o que ajudaria, sem cobrar quem respondeu.";
  }
  if (topChunk) {
    return `Próximo passo: aprofunde em "${topChunk.title}" e conecte com um plano de ação mensurável.`;
  }
  return null;
}

const GUARDRAIL_NOTICE =
  "Respostas ancoradas nos dados e no método do app, com fontes citadas. Só falo de agregados (k≥5), nunca de pessoas, e não substituo profissional habilitado.";

/** A pergunta pede leitura de exposição/risco psicossocial (Domínio B / NR-1)? */
function wantsExposureRead(question: string): boolean {
  return /\b(risco|riscos|psicossoci|exposi[çc][aã]o|copsoq|nr-?1|nr ?1|psicol[oó]gic|ergon[oô]mic|carga|exig[êe]nc|press[aã]o|ass[eé]dio|burnout|esgotament|sobrecarga)\b/i.test(
    question,
  );
}

/**
 * A pergunta pede leitura de EVOLUÇÃO/comparação temporal entre ciclos?
 * Stems com fronteira só à ESQUERDA (\b…) para casar flexões: "evolu" → "evoluiu",
 * "evoluímos"; "melhor" → "melhorou". Fronteira dupla quebraria o match de prefixo.
 */
function wantsEvolutionRead(question: string): boolean {
  return /\b(evolu|melhor|pior|progress|avan[çc]|compar|antes|depois|hist[oó]ric|longitudin|ao longo|ciclo passad|trimestre passad|desde|tend[êe]nci|funcion|deu certo|adiantou|mudou)/i.test(
    question,
  );
}

/**
 * Monta a linha aterrada na EVOLUÇÃO real, a partir de uma leitura longitudinal.
 * Honesta por construção: a leitura já exclui dimensões suprimidas (k-anon), separa
 * desfechos de drivers e carrega o disclaimer de não-causalidade. Aqui só compomos
 * a headline + a maior melhora/piora citável.
 */
function buildLongitudinalLine(reading: LongitudinalReading): string {
  const g = groundLongitudinalReading(reading);
  if (reading.comparableDimensions === 0) return g.headline;
  const highlights = g.claims.map((c) => c.text).join(" ");
  return highlights ? `${g.headline} ${highlights}` : g.headline;
}

/**
 * Compõe as linhas de medição (capsule/longitudinal) e os disclaimers de cada
 * fonte ativa. Único ponto que conhece a forma do grounding de medição — usado
 * tanto na montagem normal quanto quando a medição é a ÚNICA fonte disponível.
 */
function composeMeasurementGrounding(
  capsule: MeasurementContextCapsule | undefined,
  useCapsule: boolean,
  longitudinal: LongitudinalReading | undefined,
  useLongitudinal: boolean,
): { capsuleLine: string | null; longitudinalLine: string | null; guardrailNotice: string } {
  const capsuleLine = useCapsule ? buildCapsuleLine(capsule!) : null;
  const longitudinalLine = useLongitudinal ? buildLongitudinalLine(longitudinal!) : null;
  const notices: string[] = [GUARDRAIL_NOTICE];
  if (useCapsule) notices.push(groundFromCapsule(capsule!).requiredDisclaimer);
  if (useLongitudinal) notices.push(longitudinal!.disclaimer);
  return { capsuleLine, longitudinalLine, guardrailNotice: notices.join(" ") };
}

/**
 * Monta a linha aterrada na MEDIÇÃO real, a partir de um capsule selado.
 * Respeita as permissões do capsule: se não pode alegar exposição (n<k, etc.),
 * retorna a headline honesta de dados insuficientes. Nunca nomeia desfecho nem
 * dimensão suprimida — isso já está garantido por construção no capsule.
 */
function buildCapsuleLine(capsule: MeasurementContextCapsule): string {
  const g = groundFromCapsule(capsule);
  if (!capsule.permissions.canClaimExposure) return g.headline;
  const top = g.claims
    .slice(0, 3)
    .map((c) => c.label)
    .join(", ");
  const driversText = top ? ` Dimensões em foco: ${top}.` : "";
  return `${g.headline}${driversText}`;
}

/**
 * Monta um turno do copiloto. Sem geração livre: cabeçalho por POV, frase
 * ancorada na métrica real, corpo montado dos chunks recuperados (com citações),
 * próximo passo e — quando aplicável — recusa honesta.
 *
 * `capsule` (opcional): MeasurementContextCapsule selado. Quando presente e a
 * pergunta é sobre risco psicossocial/NR-1, enriquece a resposta com a leitura
 * de exposição REAL e impõe o disclaimer obrigatório do capsule.
 *
 * `longitudinal` (opcional): LongitudinalReading cross-ciclo. Quando presente e a
 * pergunta é sobre evolução/progresso, enriquece com a prova de antes/depois e o
 * disclaimer de não-causalidade.
 *
 * Nenhum dos dois bypassa guardrails nem o gating de audiência — a proteção roda
 * sempre antes; numa recusa, ambos saem null.
 */
export function answerCopilot(
  kb: CopilotKnowledgeBase,
  facts: GroundingFacts,
  query: CopilotQuery,
  capsule?: MeasurementContextCapsule,
  longitudinal?: LongitudinalReading,
): CopilotTurn {
  const voice = POV_VOICE[query.pov];

  // 1) Guardrail tem prioridade: recusa por desenho.
  const violation = detectGuardrailViolation(query.question);
  if (violation) {
    return {
      pov: query.pov,
      headline: "Isso eu não faço — e explico por quê",
      groundedLine: null,
      body: `${violation} Posso, em vez disso, falar sobre o ${kb.indexFull} de forma agregada: o que significa o resultado, onde focar e como agir com segurança.`,
      sources: [],
      nextStep: 'Reformule em termos coletivos (ex.: "onde a equipe precisa de apoio?").',
      confidence: "alta",
      refusal: violation,
      guardrailNotice: GUARDRAIL_NOTICE,
      capsuleLine: null, // recusa por guardrail nunca expõe medição
      longitudinalLine: null,
    };
  }

  const canSeeCollective = query.canSeeCollective !== false;
  const wantsNumbers =
    /\b(score|índice|indice|nota|quanto|resultado|n[íi]vel|momentum|tend[êe]ncia|evolu)\b/i.test(
      query.question,
    );

  // 2) Gating por audiência: participante não vê a leitura coletiva (coerente com
  // a home por audiência). Não é recusa — é proteção honesta, com oferta do que pode.
  if (!canSeeCollective && wantsNumbers) {
    const privacy = kb.chunks.find((c) => c.id === "privacidade");
    return {
      pov: query.pov,
      headline: "A leitura coletiva fica com a gestão",
      groundedLine: null,
      body:
        `Os números do ${kb.indexLabel} são publicados de forma agregada para a gestão. Com você, falo do que o índice mede, como participar e como sua voz é protegida.` +
        (privacy ? ` ${privacy.body}` : ""),
      sources: privacy ? [{ label: privacy.source, chunkId: privacy.id }] : [],
      nextStep: "Pergunte, por exemplo, o que o índice mede ou como sua privacidade é garantida.",
      confidence: "alta",
      refusal: null,
      guardrailNotice: GUARDRAIL_NOTICE,
      capsuleLine: null, // participante não vê leitura coletiva — nem a de medição
      longitudinalLine: null,
    };
  }

  // Elegibilidade do grounding de MEDIÇÃO (capsule/longitudinal). A medição é fonte
  // de primeira classe: pode responder mesmo quando o KB não cobre a pergunta.
  const useCapsule = !!capsule && canSeeCollective && wantsExposureRead(query.question);
  const useLongitudinal =
    !!longitudinal && canSeeCollective && wantsEvolutionRead(query.question);

  // 3) Recuperação no KB.
  const hits = retrieveChunks(kb, query.question, 3);

  // 3b) Sem chunk: se há medição elegível, responde DELA (o dado é a fonte). Só
  // recusa de fato quando não há KB nem medição — aí não inventa.
  if (hits.length === 0) {
    if (useCapsule || useLongitudinal) {
      const m = composeMeasurementGrounding(capsule, useCapsule, longitudinal, useLongitudinal);
      return {
        pov: query.pov,
        headline: "Leitura a partir da medição",
        groundedLine: null,
        body: `${voice.lead} a resposta vem direto da medição agregada e protegida do período — sem opinião, só o que os dados mostram.`,
        sources: [],
        nextStep: nextStepFor(query.pov, facts, null),
        confidence: "media",
        refusal: null,
        guardrailNotice: m.guardrailNotice,
        capsuleLine: m.capsuleLine,
        longitudinalLine: m.longitudinalLine,
      };
    }
    return {
      pov: query.pov,
      headline: "Não encontrei isso na minha base",
      groundedLine: null,
      body: `Não vou inventar uma resposta. Sobre o ${kb.indexFull}, posso falar de: ${kb.coveredTopics.join(", ")}.`,
      sources: [],
      nextStep: "Tente perguntar sobre um desses temas — respondo com a fonte citada.",
      confidence: "baixa",
      refusal: "fora_do_escopo",
      guardrailNotice: GUARDRAIL_NOTICE,
      capsuleLine: null,
      longitudinalLine: null,
    };
  }

  // 4) Montagem aterrada a partir dos chunks recuperados + grounding de medição.
  const top = hits[0]!.chunk;
  const body = `${voice.lead} ` + hits.map((h) => h.chunk.body).join(" ");
  const sources = hits.map((h) => ({ label: h.chunk.source, chunkId: h.chunk.id }));
  const confidence: CopilotConfidence = hits[0]!.score >= 2 ? "alta" : "media";

  const m = composeMeasurementGrounding(capsule, useCapsule, longitudinal, useLongitudinal);
  const { capsuleLine, longitudinalLine, guardrailNotice } = m;

  return {
    pov: query.pov,
    headline: voice.headline(kb),
    groundedLine:
      canSeeCollective && (wantsNumbers || query.pov === "tecnico")
        ? groundedLineFor(query.pov, facts)
        : null,
    body,
    sources,
    nextStep: nextStepFor(query.pov, facts, top),
    confidence,
    refusal: null,
    guardrailNotice,
    capsuleLine,
    longitudinalLine,
  };
}
