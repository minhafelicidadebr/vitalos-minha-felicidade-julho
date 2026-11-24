// Base de conhecimento do copiloto setorial (a "RAG" determinística da Fase 1).
//
// Honestidade Fable 5: o KB é MONTADO da fonte de verdade real — o pack ativo e
// seu framework (lentes, pilares, pergunta-guia, base científica, disclaimer) —
// mais um pequeno mapa do ecossistema (módulos medir/agir/provar). Nada é
// inventado: cada chunk carrega sua fonte (citação). O engine só pode responder
// com o que está aqui + métricas computadas. (Fase 2: este KB vira o corpus do
// vetor-store; o LLM o recebe como contexto — RAG-then-generate.)

import type { CopilotKnowledgeBase, KnowledgeChunk } from "@/engine/ai/copilot-engine";
import { IVO_METHOD_ANCHOR, IVO_METHOD_NOTES, IVO_METHOD_VERSION } from "@/domain/ivo/method-presentation";

// Tipos frouxos: o pack/index vêm de JSON (cast contido), espelhando os outros mocks.
interface LensLike {
  id: string;
  name: string;
  guidingQuestion?: string;
  scientificBasis?: string[];
  pillars?: { name: string }[];
}
interface IndexLike {
  name?: string;
  mandatoryDisclaimer?: string;
  lenses?: LensLike[];
  privacy?: { kAnonymityMin?: number };
}
interface PackLike {
  packId?: string;
  ai?: { name?: string; fullName?: string };
  labels?: { index?: string; indexFull?: string; ai?: string };
}

export interface CopilotPersona {
  /** Marca da IA (vem do pack): FlorescerIA, CidadanIA, etc. */
  aiName: string;
  /** Nome humano sugerido para a persona. */
  suggestedName: string;
  tagline: string;
}

export interface CopilotAvatarSpec {
  gradientFrom: string;
  gradientTo: string;
  /** Glifo lucide usado no avatar. */
  glyph: "sparkles" | "landmark" | "building" | "heart-pulse" | "graduation-cap";
  initials: string;
}

export interface PovSpec {
  id: "tecnico" | "criativo" | "empatico" | "inovador";
  label: string;
  description: string;
  icon: "ruler" | "palette" | "heart-handshake" | "lightbulb";
}

export const COPILOT_POV_SPECS: readonly PovSpec[] = [
  {
    id: "tecnico",
    label: "Técnico",
    description: "Dados, método e leitura precisa do índice.",
    icon: "ruler",
  },
  {
    id: "criativo",
    label: "Criativo",
    description: "Possibilidades e novos ângulos para os mesmos dados.",
    icon: "palette",
  },
  {
    id: "empatico",
    label: "Empático",
    description: "As pessoas antes dos números; escuta e cuidado.",
    icon: "heart-handshake",
  },
  {
    id: "inovador",
    label: "Inovador",
    description: "Transforma o achado em experimento mensurável.",
    icon: "lightbulb",
  },
];

// Persona + avatar por pack. Nomes sugeridos ecoam cada marca, com sonoridade BR.
const PERSONA_BY_PACK: Record<string, { suggestedName: string; tagline: string }> = {
  enterprise: { suggestedName: "Flora", tagline: "Copilota da vitalidade organizacional" },
  school: { suggestedName: "Aila", tagline: "Copilota do florescimento escolar" },
  government: { suggestedName: "Cida", tagline: "Copilota da vitalidade no serviço público" },
  condominium: { suggestedName: "Vivi", tagline: "Copilota da boa convivência" },
  health: { suggestedName: "Cora", tagline: "Copilota de quem cuida" },
};

const GLYPH_BY_PACK: Record<string, CopilotAvatarSpec["glyph"]> = {
  enterprise: "sparkles",
  school: "graduation-cap",
  government: "landmark",
  condominium: "building",
  health: "heart-pulse",
};

const FALLBACK_BRANDING = { primary: "#0B3D2E", accent: "#C9A227" };

export function buildCopilotPersona(pack: PackLike): CopilotPersona {
  const aiName = pack.ai?.name ?? pack.labels?.ai ?? "FlorescerIA";
  const p = PERSONA_BY_PACK[pack.packId ?? "enterprise"] ?? PERSONA_BY_PACK.enterprise!;
  return { aiName, suggestedName: p.suggestedName, tagline: p.tagline };
}

export function buildCopilotAvatar(
  pack: PackLike,
  branding?: {
    primary?: string;
    accent?: string;
  },
): CopilotAvatarSpec {
  const persona = buildCopilotPersona(pack);
  return {
    gradientFrom: branding?.primary ?? FALLBACK_BRANDING.primary,
    gradientTo: branding?.accent ?? FALLBACK_BRANDING.accent,
    glyph: GLYPH_BY_PACK[pack.packId ?? "enterprise"] ?? "sparkles",
    initials: persona.suggestedName.slice(0, 2).toUpperCase(),
  };
}

// Ciência dos 12 drivers do Work-Wellbeing Playbook 2.0 — universal a todos os setores
// (a evidência não muda com o pack; só o vocabulário do índice muda). Permite ao copiloto
// responder "como melhorar X?" com ciência aterrada e CITADA (gate G1: sem fonte, sem
// alegação). Reescrito na voz VitalOS, sem marca de terceiros. Tópicos em palavra única e
// sem acento para casar com a tokenização do engine (retrieveChunks normaliza ambos).
const WWP_DRIVER_CHUNKS: readonly KnowledgeChunk[] = [
  {
    id: "driver_seguranca_psicologica",
    topics: [
      "seguranca",
      "psicologica",
      "psicologico",
      "errar",
      "erro",
      "discordar",
      "medo",
      "voz",
      "vulnerabilidade",
    ],
    title: "Driver: Segurança Psicológica",
    body: "Segurança psicológica é a crença compartilhada de que é seguro assumir riscos interpessoais — perguntar, discordar, admitir erro — sem medo de humilhação. É propriedade do time, não traço individual, e combina alto cuidado com alto padrão. Para fortalecê-la: liderança admite os próprios erros, convida o dissenso e responde com curiosidade, não punição.",
    source: "Edmondson (1999), Administrative Science Quarterly; Edmondson (2018), The Fearless Organization",
  },
  {
    id: "driver_reconhecimento",
    topics: ["reconhecimento", "reconhecer", "elogio", "feedback", "valorizar", "gratidao", "apreco"],
    title: "Driver: Reconhecimento",
    body: "Reconhecimento específico — nomear o comportamento concreto — supera o elogio genérico: torna o feedback acionável e crível, reforçando a repetição. Frequente e sincero, é um dos preditores mais fortes de engajamento. Comece pelo que já é bom, com exemplos reais, e distribua o reconhecimento para além dos de sempre.",
    source: "Gallup (2022), State of the Global Workplace",
  },
  {
    id: "driver_energia",
    topics: [
      "energia",
      "recuperacao",
      "descanso",
      "pausa",
      "pausas",
      "fadiga",
      "exaustao",
      "burnout",
      "desligar",
      "vigor",
      "cansaco",
    ],
    title: "Driver: Energia & Recuperação",
    body: "Recuperação é parte da performance, não o oposto dela. Microppausas reais (sem tela de trabalho) interrompem a fadiga atencional antes do esgotamento; o 'desligar psicológico' fora do expediente é o preditor mais forte de recuperação — mais do que o tempo de folga em si. Proteja pausas e o direito a desconectar.",
    source: "Sonnentag (2003), JAP; Sonnentag & Fritz (2015), Journal of Organizational Behavior",
  },
  {
    id: "driver_proposito",
    topics: ["proposito", "significado", "sentido", "missao", "motivacao", "importa", "vocacao"],
    title: "Driver: Propósito & Significado",
    body: "Significado é a percepção de que o trabalho importa e conecta a algo maior — coexiste com tarefas difíceis e sustenta o engajamento quando a motivação oscila. Conectar tarefas ao impacto concreto em pessoas reais (linha de visão para quem é servido) aumenta o significado percebido.",
    source: "Steger et al. (2012), Journal of Career Assessment",
  },
  {
    id: "driver_autonomia",
    topics: [
      "autonomia",
      "controle",
      "latitude",
      "demanda",
      "decisao",
      "decidir",
      "flexibilidade",
      "microgestao",
      "liberdade",
    ],
    title: "Driver: Autonomia & Controle",
    body: "No modelo demanda-controle, o que torna a alta demanda menos nociva é a latitude de decisão — autonomia sobre como e quando fazer. Alta demanda com baixo controle gera tensão (strain); com alto controle pode ser ativadora e saudável. Ampliar autonomia sobre o método, e não só sobre a meta, reduz o desgaste.",
    source: "Karasek (1979), Administrative Science Quarterly",
  },
  {
    id: "driver_pertencimento",
    topics: [
      "pertencimento",
      "pertencer",
      "inclusao",
      "incluir",
      "conexao",
      "vinculo",
      "isolamento",
      "acolhimento",
      "aceitacao",
    ],
    title: "Driver: Pertencimento",
    body: "A necessidade de pertencer é fundamental; quando ameaçada, consome recursos atencionais e prejudica foco e cooperação. Sinais consistentes de inclusão liberam essa carga e melhoram criatividade e desempenho cognitivo. Rituais de acolhimento e convites explícitos à participação ajudam a quem está à margem.",
    source: "Baumeister & Leary (1995), Psychological Bulletin",
  },
  {
    id: "driver_crescimento",
    topics: [
      "crescimento",
      "maestria",
      "aprender",
      "aprendizado",
      "mentalidade",
      "mindset",
      "desenvolvimento",
      "habilidade",
      "evoluir",
    ],
    title: "Driver: Crescimento & Maestria",
    body: "A mentalidade de crescimento — a crença de que habilidades se desenvolvem com esforço e estratégia — favorece buscar feedback, persistir após falhas e ver o erro como informação, não veredito sobre a pessoa. Culturas que tratam o erro como aprendizado, com feedback frequente e desafios calibrados, aceleram o desenvolvimento.",
    source: "Dweck (2006), Mindset",
  },
  {
    id: "driver_clareza",
    topics: [
      "clareza",
      "previsibilidade",
      "papel",
      "ambiguidade",
      "expectativa",
      "mudanca",
      "comunicacao",
      "responsabilidade",
    ],
    title: "Driver: Clareza & Previsibilidade",
    body: "Ambiguidade de papel é fator de risco independente: quando responsabilidades são difusas, surge retrabalho, tensão e conflito de demandas. Clareza — saber o que se espera e o que não se espera — é preditor de bem-estar tão forte quanto a carga. Comunicar mudanças antes que aconteçam e definir prioridades explícitas reduz a insegurança cotidiana.",
    source: "Kahn et al. (1964), Organizational Stress; ISO 45003:2021",
  },
  {
    id: "driver_lideranca",
    topics: [
      "lideranca",
      "lider",
      "gestor",
      "gestao",
      "chefia",
      "chefe",
      "supervisao",
      "suporte",
      "preventiva",
    ],
    title: "Driver: Liderança Preventiva",
    body: "A chefia organiza, apoia e protege — não só cobra. Baixa qualidade de liderança amplifica todos os demais riscos psicossociais: é o multiplicador mais potente. Treinar gestores em escuta ativa, clareza de expectativas e apoio cotidiano é a alavanca com maior retorno sobre o risco coletivo. Liderança preventiva age ANTES do adoecimento.",
    source: "Hammer et al. (2011), JOOP; ISO 45003:2021",
  },
  {
    id: "driver_inclusao",
    topics: [
      "inclusao",
      "protecao",
      "dignidade",
      "violencia",
      "assedio",
      "discriminacao",
      "diversidade",
      "respeito",
      "ofensivo",
    ],
    title: "Driver: Inclusão & Proteção",
    body: "Sem dignidade e ambiente livre de violência, qualquer programa de bem-estar é incoerente. Comportamentos ofensivos e exclusão exigem resposta organizacional imediata e canal seguro — nunca 'workshop de resiliência' como substituto de mudança estrutural. A proteção vem antes da promoção: primeiro a organização garante a segurança, depois cultiva o florescimento.",
    source: "OIT (2019), Convenção 190 sobre Violência e Assédio; CID-11 QD85",
  },
  {
    id: "driver_realizacao",
    topics: [
      "realizacao",
      "coletiva",
      "meta",
      "objetivo",
      "celebracao",
      "conquista",
      "factivel",
      "equipe",
      "resultado",
    ],
    title: "Driver: Realização Coletiva",
    body: "Realização coletiva combina clareza do que é factível, contribuição visível de cada um e celebração compartilhada. Metas percebidas como inalcançáveis ou injustas corroem o engajamento; metas factíveis e reconhecidas coletivamente o sustentam. O efeito é maior quando as pessoas veem o impacto concreto do esforço conjunto.",
    source: "Locke & Latham (2002), American Psychologist; Grant (2008), AMJ",
  },
  {
    id: "driver_futuro",
    topics: [
      "futuro",
      "seguranca",
      "emprego",
      "estabilidade",
      "inseguranca",
      "reestruturacao",
      "precarizacao",
      "continuidade",
      "carreira",
    ],
    title: "Driver: Segurança de Futuro",
    body: "Insegurança laboral é fator de risco independente: cresce em reestruturações e precariza a saúde mesmo quando o emprego não é perdido de fato. A incerteza crônica consome recursos psicológicos que fariam falta para o trabalho em si. Comunicação antecipada, transições planejadas e apoio ativo à recolocação reduzem o dano.",
    source: "Sverke et al. (2002), JOHP; De Witte (2005), European Journal of Work",
  },
];

/**
 * Monta o KB do copiloto a partir do pack + framework (fonte de verdade) e do
 * mapa do ecossistema. Cada chunk é citável. Engine ≠ Domínio: o engine recebe
 * isto pronto, sem conhecer setores.
 */
export function buildCopilotKnowledge(
  pack: PackLike,
  index: IndexLike | null,
): CopilotKnowledgeBase {
  const indexLabel = pack.labels?.index ?? "IVO";
  const indexFull = pack.labels?.indexFull ?? index?.name ?? "Índice de Vitalidade";
  const kMin = index?.privacy?.kAnonymityMin ?? 5;
  const chunks: KnowledgeChunk[] = [];

  // 1) O que é o índice (do nome + disclaimer reais).
  chunks.push({
    id: "indice",
    topics: ["indice", "score", "significa", "resultado", "vitalidade", indexLabel.toLowerCase()],
    title: `O que é o ${indexLabel}`,
    body: pack.packId === "enterprise" ? IVO_METHOD_NOTES.coverage : `O ${indexFull} (${indexLabel}) é um índice agregado de 0 a 1000 que lê a vitalidade em quatro lentes. ${
      index?.mandatoryDisclaimer ?? "É experimental e orienta ação; não é instrumento clínico."
    }`,
    source: `Framework ${indexLabel}`,
  });

  if (pack.packId === "enterprise") {
    chunks.push(
      { id: "ivo_method_trajectory", topics: ["trajetoria", "projecao", "previsao", "cenario", "hipotese"],
        title: "Como ler a Trajetória", body: IVO_METHOD_NOTES.trajectory,
        source: `VitalOS · Ficha técnica v${IVO_METHOD_VERSION} · /trajetoria#${IVO_METHOD_ANCHOR}` },
      { id: "ivo_method_pnl", topics: ["pnl", "economia", "equilibrio", "custo", "roi"],
        title: "Como ler o P&L", body: IVO_METHOD_NOTES.pnl,
        source: `VitalOS · Ficha técnica v${IVO_METHOD_VERSION} · /pnl#${IVO_METHOD_ANCHOR}` },
    );
  }

  // 2) Uma citação por lente (pergunta-guia + base científica reais).
  for (const lens of index?.lenses ?? []) {
    const shortName = lens.name.split(" — ")[0] ?? lens.name;
    const pillarWords = (lens.pillars ?? []).flatMap((p) =>
      p.name
        .toLowerCase()
        .split(/[^a-zà-ú]+/)
        .filter((w) => w.length > 3),
    );
    chunks.push({
      id: `lente_${lens.id}`,
      topics: [lens.id, ...shortName.toLowerCase().split(/\s+/), ...pillarWords].slice(0, 12),
      title: `Lente ${shortName}`,
      body: `${shortName}: ${lens.guidingQuestion ?? "como esta dimensão sustenta a vitalidade."}${
        lens.scientificBasis?.length ? ` Base científica: ${lens.scientificBasis.join(", ")}.` : ""
      }`,
      source: `Framework ${indexLabel} · lente ${shortName}`,
    });
  }

  // 3) Privacidade e k-anonimato.
  chunks.push({
    id: "privacidade",
    topics: ["privacidade", "anonimato", "dados", "individual", "protege", "seguro", "confianca"],
    title: "Privacidade por desenho",
    body: `Só são publicados agregados com pelo menos ${kMin} respostas (k≥${kMin}). Respostas individuais nunca ficam no cliente e a identidade de quem respondeu é invisível.`,
    source: "Doutrina de privacidade do VitalOS",
  });

  // 4) Como agir (ciclo M.E.T.E.).
  chunks.push({
    id: "agir",
    topics: ["agir", "acao", "melhorar", "proximo", "passo", "plano", "experimento", "mete"],
    title: "Como transformar leitura em ação",
    body: "Medir é só o começo: o ciclo da Matriz IFT (Mensurar → Educar → Transformar → Evoluir) leva o resultado a um plano de ação e a experimentos no Culture Lab; efeito só é afirmado quando o critério de avaliação do experimento é atendido.",
    source: "Cronograma da Matriz IFT · Culture Lab",
  });

  // 5) Método e honestidade (anti-overclaim).
  chunks.push({
    id: "metodo",
    topics: ["metodo", "ciencia", "funciona", "confiavel", "estimativa", "honesto", "valido"],
    title: "Método e honestidade",
    body: "O valor está na tendência agregada e na comparação no tempo, não em previsão mágica. Estimativas mostram a fórmula e a fonte; o que é exploratório é rotulado como tal.",
    source: "Metodologia VitalOS",
  });

  // 6) Limites (o que a IA não faz).
  chunks.push({
    id: "limites",
    topics: ["limites", "nao", "faz", "evita", "guardrail", "etica", "escopo"],
    title: "O que eu não faço",
    body: "Não acesso dados individuais, não faço ranking de pessoas, não alimento avaliação de desempenho, promoção ou punição, e não substituo profissional habilitado.",
    source: "Guardrails do pack",
  });

  // 7) Pulses (escuta contínua).
  chunks.push({
    id: "pulse",
    topics: ["pulse", "pulso", "escuta", "frequente", "rapida", "continua", "microsurvey"],
    title: "Pulses de 60 segundos",
    body: "Entre os ciclos completos, pulses curtos (60s) escutam os pilares de menor score primeiro, sem fadiga de pesquisa. Participação é voluntária.",
    source: "Módulo Medir · Pulses",
  });

  // 8) Domínio B (risco psicossocial) — separação sagrada.
  chunks.push({
    id: "dominio_b",
    topics: ["risco", "psicossocial", "nr1", "nr-1", "seguranca", "copsoq", "saude", "ocupacional"],
    title: "Riscos psicossociais (Domínio B)",
    body: "A camada de risco psicossocial (NR-1 educativo / COPSOQ) é tratada SEPARADA da vitalidade (Domínio A) — telas, dados e fluxos não se misturam. É educativa e não substitui PGR nem profissional habilitado.",
    source: "Domínio B · separação A/B",
  });

  // 9) Provar (evidência, evolução, selo).
  chunks.push({
    id: "provar",
    topics: [
      "provar",
      "evidencia",
      "selo",
      "evolucao",
      "impacto",
      "certificacao",
      "resultado",
      "esg",
    ],
    title: "Da leitura à prova",
    body: "O ciclo se fecha com evidência: curva de evolução ciclo a ciclo, experimentos avaliados pelo critério do Culture Lab e o Selo de Vitalidade — computado do que foi feito, nunca comprado.",
    source: "Módulo Provar · Evolução, Experimentos e Selo",
  });

  // 10) Ciência dos 12 drivers de bem-estar (universal — Educar com fonte citada).
  chunks.push(...WWP_DRIVER_CHUNKS);

  return {
    packId: pack.packId ?? "enterprise",
    indexLabel,
    indexFull,
    coveredTopics: [
      `o que é o ${indexLabel}`,
      "as quatro lentes",
      "privacidade e anonimato",
      "como agir (Matriz IFT) e pulses",
      "riscos psicossociais (Domínio B)",
      "evidência, evolução e selo",
      "método, honestidade e limites da IA",
      "os 12 drivers de bem-estar (segurança psicológica, reconhecimento, energia, propósito, autonomia, pertencimento, crescimento, clareza, liderança preventiva, inclusão, realização coletiva e segurança de futuro)",
    ],
    chunks,
  };
}

/**
 * Perguntas iniciais sugeridas. Para participantes (sem leitura coletiva),
 * evita-se sugerir perguntas sobre o número do índice — coerente com o gating.
 */
export function suggestedQuestions(kb: CopilotKnowledgeBase, canSeeCollective: boolean): string[] {
  const base = [
    `O que é o ${kb.indexLabel} e o que ele mede?`,
    "Como vocês protegem o anonimato dos dados?",
    "Como transformar a leitura em ação?",
    "O que você não faz?",
  ];
  if (canSeeCollective) {
    base.splice(1, 0, `Como está o resultado do ${kb.indexLabel} e para onde aponta?`);
  }
  return base;
}
