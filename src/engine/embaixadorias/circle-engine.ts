// Círculos Vivos — engine PURO (I5, Academia Viva 2.0). Dá função mecânica às
// 15 Embaixadorias (hoje só um toggle de "entrar/sair" no cliente, sem
// persistência nem ritual real) — rodas de 5-8 pessoas facilitadas por um
// EMBAIXADOR, com roteiros determinísticos por driver.
//
// PRIVACIDADE POR SCHEMA (não por política): repare que `CircleSession` não
// tem NENHUM campo de conteúdo — nem resumo, nem lista de participantes, só
// metadados (facilitador, driver, data, contagem de presença). O que é dito
// na roda não tem onde ser guardado; é impossibilidade estrutural, igual ao
// Diário de Prática (I7) protege o texto do que não foi consentido a
// compartilhar. O micro-compromisso de fechamento de CADA pessoa vai para o
// PRÓPRIO Diário dela (I7), nunca para o registro do círculo.
//
// Ciência: Edmondson 1999 (segurança psicológica se constrói em grupo pequeno
// com estrutura); Craik & Lockhart 1972 (elaboração reflexiva falada).
//
// Roteiros SEM LLM: prompts estruturados, versionados e citáveis — nunca
// gerados na hora (P2-04 do cânone).
//
// Engine ≠ Domínio: catálogo de roteiros, rótulos e limites de presença
// chegam por parâmetro (pack + mock).

export interface CircleScript {
  driverId: string;
  title: string;
  openingPrompt: string;
  discussionPrompts: readonly string[];
  /** O prompt do fechamento ritual — vira a semente do micro-compromisso no Diário (I7). */
  closingPrompt: string;
  citation: string;
}

export function getCircleScript(
  catalog: readonly CircleScript[],
  driverId: string,
): CircleScript | undefined {
  return catalog.find((s) => s.driverId === driverId);
}

export interface CircleSessionPolicy {
  minPresence: number;
  maxPresence: number;
}

export const DEFAULT_CIRCLE_POLICY: CircleSessionPolicy = { minPresence: 5, maxPresence: 8 };

/**
 * Metadados de uma roda — DE PROPÓSITO sem campo de conteúdo ou lista de
 * participantes. `presenceCount` é só um número; ninguém pode ser identificado
 * a partir deste registro.
 */
export interface CircleSession {
  id: string;
  embassyId: string;
  facilitatorId: string;
  driverId: string;
  occurredOn: string;
  presenceCount: number;
}

export type CircleSessionRejectReason =
  | "invalid_request"
  | "duplicate"
  | "presence_out_of_range"
  | "no_script_for_driver";

export interface OpenCircleResult {
  sessions: CircleSession[];
  session: CircleSession | null;
  reason: "recorded" | CircleSessionRejectReason;
}

export function openCircleSession(
  existing: readonly CircleSession[],
  request: {
    id: string;
    embassyId: string;
    facilitatorId: string;
    driverId: string;
    occurredOn: string;
    presenceCount: number;
  },
  scriptCatalog: readonly CircleScript[],
  policy: CircleSessionPolicy = DEFAULT_CIRCLE_POLICY,
): OpenCircleResult {
  const finish = (
    reason: OpenCircleResult["reason"],
    sessions: CircleSession[] = [...existing],
    session: CircleSession | null = null,
  ): OpenCircleResult => ({ sessions, session, reason });

  if (
    !request.id.trim() ||
    !request.embassyId.trim() ||
    !request.facilitatorId.trim() ||
    !request.driverId.trim() ||
    !request.occurredOn.trim()
  ) {
    return finish("invalid_request");
  }
  if (existing.some((s) => s.id === request.id)) return finish("duplicate");
  if (request.presenceCount < policy.minPresence || request.presenceCount > policy.maxPresence) {
    return finish("presence_out_of_range");
  }
  if (!getCircleScript(scriptCatalog, request.driverId)) return finish("no_script_for_driver");

  const session: CircleSession = { ...request };
  return finish("recorded", [...existing, session], session);
}

/** Sessões de uma embaixadoria — só metadados, nunca conteúdo ou identidade de participante. */
export function sessionsByEmbassy(
  sessions: readonly CircleSession[],
  embassyId: string,
): CircleSession[] {
  return sessions.filter((s) => s.embassyId === embassyId);
}
