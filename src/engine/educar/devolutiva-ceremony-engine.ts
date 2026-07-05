// Cerimônia da Devolutiva (Arco da Prova, I-T2) — puro. Transforma a devolutiva de
// uma tela lida sozinho num RITO facilitado: a comunidade vota entre as intervenções
// candidatas, e o voto — não a planilha — decide a pauta que semeia o Plano Vivo.
//
// Ciência/norma: Nielsen 2013 / Nielsen & Noblet — participação do trabalhador no
// desenho da intervenção prediz efetividade; WHO 2022; ISO 45003 (consulta).
//
// PRIVACIDADE POR SCHEMA (mesmo idioma do I5 da Academia): o voto nunca carrega
// identidade — é uma contagem que sobe por driver, ponto (ver migration
// devolutiva_sessions: não existe coluna de voter_id). A pauta só é PUBLICADA
// (ranking visível) quando a presença atinge o quórum k-anônimo (≥5); abaixo disso
// mostrar a contagem arriscaria reidentificar quem votou em quê. Isso é decidido
// AQUI, no engine puro — nunca na UI, nunca no banco isoladamente.
//
// Engine puro: sem React, sem I/O, sem domain/. Composição por cima do que já existe
// (devolutiva-engine.ts fornece os blocos narrativos; priority-engine.ts fornece os
// drivers candidatos) — nada aqui reimplementa ranking de impacto.

export const CEREMONY_QUORUM = 5;

export interface CeremonyDriverCandidate {
  driverId: string;
  label: string;
  /** Ordem original da fila de prioridades — usada só como desempate do voto. */
  rank: number;
}

export type CeremonyStatus = "open" | "closed";

export interface CeremonyState {
  status: CeremonyStatus;
  attendanceCount: number;
  /** driverId → contagem de votos. Nunca carrega identidade de quem votou. */
  votesByDriver: Record<string, number>;
}

export function meetsQuorum(attendanceCount: number, quorum: number = CEREMONY_QUORUM): boolean {
  return attendanceCount >= quorum;
}

/** Registra um voto — ignorado silenciosamente se a cerimônia já fechou. */
export function castVote(state: CeremonyState, driverId: string): CeremonyState {
  if (state.status !== "open" || !driverId.trim()) return state;
  return {
    ...state,
    votesByDriver: {
      ...state.votesByDriver,
      [driverId]: (state.votesByDriver[driverId] ?? 0) + 1,
    },
  };
}

/** Atualiza a contagem de presentes — só enquanto a cerimônia está aberta. */
export function markAttendance(state: CeremonyState, count: number): CeremonyState {
  if (state.status !== "open" || !Number.isFinite(count) || count < 0) return state;
  return { ...state, attendanceCount: Math.floor(count) };
}

export function closeCeremony(state: CeremonyState): CeremonyState {
  if (state.status !== "open") return state;
  return { ...state, status: "closed" };
}

export interface CoCreationPauta {
  /** true só quando a presença atingiu o quórum k-anônimo. */
  published: boolean;
  attendanceCount: number;
  totalVotes: number;
  /** Vazio quando não publicado — nunca expõe um ranking de amostra pequena. */
  rankedDriverIds: string[];
}

/**
 * A pauta de co-criação: TODOS os candidatos ranqueados por voto (desc), desempatado
 * pela ordem original da fila de prioridades — nunca omite quem recebeu zero votos,
 * porque "não foi escolhido" também é informação da pauta.
 */
export function buildCoCreationPauta(
  state: CeremonyState,
  candidates: readonly CeremonyDriverCandidate[],
  quorum: number = CEREMONY_QUORUM,
): CoCreationPauta {
  const totalVotes = Object.values(state.votesByDriver).reduce((sum, n) => sum + n, 0);
  const published = meetsQuorum(state.attendanceCount, quorum);

  if (!published) {
    return { published: false, attendanceCount: state.attendanceCount, totalVotes, rankedDriverIds: [] };
  }

  const rankByOriginal = new Map(candidates.map((c) => [c.driverId, c.rank] as const));
  const rankedDriverIds = candidates
    .map((c) => c.driverId)
    .sort((a, b) => {
      const votesA = state.votesByDriver[a] ?? 0;
      const votesB = state.votesByDriver[b] ?? 0;
      if (votesB !== votesA) return votesB - votesA;
      return (rankByOriginal.get(a) ?? 0) - (rankByOriginal.get(b) ?? 0);
    });

  return { published: true, attendanceCount: state.attendanceCount, totalVotes, rankedDriverIds };
}

export interface CeremonyAgendaBlock {
  kicker: string;
  title: string;
  body: string;
}

/**
 * Anexa o bloco de votação à narrativa de quatro tempos já existente
 * (devolutiva-engine.ts) — o rito reusa a devolutiva, não a substitui.
 */
export function buildCeremonyAgenda(
  narrativeBlocks: ReadonlyArray<{ kicker: string; title: string; body: string }>,
  candidates: readonly CeremonyDriverCandidate[],
): CeremonyAgendaBlock[] {
  const votingBlock: CeremonyAgendaBlock =
    candidates.length > 0
      ? {
          kicker: "Votamos",
          title: "A comunidade escolhe a prioridade",
          body: `${candidates.length} intervenções estão na mesa — cada presente vota em uma. A pauta de co-criação nasce do voto, não da planilha.`,
        }
      : {
          kicker: "Votamos",
          title: "Nenhuma intervenção candidata nesta cerimônia",
          body: "Sem candidatos disponíveis, a pauta desta rodada fica vazia — a votação retoma na próxima onda.",
        };
  return [...narrativeBlocks, votingBlock];
}
