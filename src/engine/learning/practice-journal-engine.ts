// Diário de Prática Viva — engine PURO (I7, Academia Viva 2.0). O registro de
// prática aplicada ("apliquei X com minha equipe") como cidadão de primeira classe.
//
// TESE (§ I7 do PLANO_ACADEMIA_VIVA_2.0.md): o registro é PRIVADO por default —
// conteúdo reflexivo nunca exposto sem consentimento explícito POR REGISTRO — e tem
// três saídas: (1) elegibilidade do Diploma Vivo (I2: `appliedPracticeCountByDriver`
// é exatamente o sinal `appliedPracticeCount` do diploma-engine), (2) agregado k≥5
// para a Vitrine de Evidências, (3) o passo Evidenciar do Loop Vivo (I3, futuro).
//
// Ciência: Craik & Lockhart 1972 (elaboração — escrever consolida); Gollwitzer 1999
// (o registro fecha a intenção de implementação "quando X, farei Y"); efeito de
// teste aplicado (recuperar o que praticou consolida a prática).
//
// PRIVACIDADE POR CONSTRUÇÃO: o agregado coletivo NUNCA lê o texto — só conta
// registros, e só os CONSENTIDOS entram na contagem coletiva. O fold individual
// (para o Diploma) conta todos os registros da própria pessoa — dado dela.
//
// Engine ≠ Domínio: tipos habilitados, rótulos e limites chegam por parâmetro.

export type PracticeEvidenceKind = "texto" | "foto" | "checklist" | "reflexao";

export const PRACTICE_EVIDENCE_KINDS: readonly PracticeEvidenceKind[] = [
  "texto",
  "foto",
  "checklist",
  "reflexao",
];

export interface PracticeEntry {
  id: string;
  /** Dona do registro — o diário é pessoal. */
  authorId: string;
  driverId: string;
  kind: PracticeEvidenceKind;
  /** Descrição curta da prática. Nunca sai do aparelho/da conta sem consentimento. */
  summary: string;
  /** Consentimento POR REGISTRO de entrar em contagens coletivas (default: false). */
  shareConsent: boolean;
  occurredOn: string; // ISO date
}

export interface PracticeJournalPolicy {
  /** Tipos de evidência habilitados pelo pack. */
  enabledKinds: readonly PracticeEvidenceKind[];
  /** Tamanho máximo do resumo (proteção contra despejo de dado sensível longo). */
  summaryMaxChars: number;
  /** k-anonimato mínimo do agregado coletivo. */
  kAnonymityMin: number;
}

export const DEFAULT_JOURNAL_POLICY: PracticeJournalPolicy = {
  enabledKinds: PRACTICE_EVIDENCE_KINDS,
  summaryMaxChars: 280,
  kAnonymityMin: 5,
};

// ─── Registro ────────────────────────────────────────────────────────────────

export type PracticeRecordReason =
  | "recorded"
  | "duplicate"
  | "invalid_request"
  | "kind_not_enabled"
  | "summary_too_long";

export interface PracticeRecordResult {
  entries: PracticeEntry[];
  entry: PracticeEntry | null;
  reason: PracticeRecordReason;
}

export function recordPractice(
  existing: readonly PracticeEntry[],
  input: {
    id: string;
    authorId: string;
    driverId: string;
    kind: PracticeEvidenceKind;
    summary: string;
    shareConsent?: boolean;
    occurredOn: string;
  },
  policy: PracticeJournalPolicy = DEFAULT_JOURNAL_POLICY,
): PracticeRecordResult {
  const finish = (
    reason: PracticeRecordReason,
    entries: PracticeEntry[] = [...existing],
    entry: PracticeEntry | null = null,
  ): PracticeRecordResult => ({ entries, entry, reason });

  if (!input.id.trim() || !input.authorId.trim() || !input.driverId.trim() || !input.summary.trim()) {
    return finish("invalid_request");
  }
  if (existing.some((e) => e.id === input.id)) return finish("duplicate");
  if (!policy.enabledKinds.includes(input.kind)) return finish("kind_not_enabled");
  if (input.summary.length > policy.summaryMaxChars) return finish("summary_too_long");

  const entry: PracticeEntry = {
    id: input.id,
    authorId: input.authorId,
    driverId: input.driverId,
    kind: input.kind,
    summary: input.summary.trim(),
    // Privado por default — o consentimento é opt-in explícito por registro.
    shareConsent: input.shareConsent === true,
    occurredOn: input.occurredOn,
  };
  return finish("recorded", [...existing, entry], entry);
}

// ─── Saída 1: o sinal do Diploma Vivo (fold individual) ──────────────────────

/** Conta os registros da PRÓPRIA pessoa por driver — é o `appliedPracticeCount` do I2. */
export function appliedPracticeCountByDriver(
  entries: readonly PracticeEntry[],
  authorId: string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.authorId !== authorId) continue;
    counts[entry.driverId] = (counts[entry.driverId] ?? 0) + 1;
  }
  return counts;
}

// ─── Saída 2: agregado coletivo k≥5 (nunca lê texto; só consentidos) ─────────

export interface PracticeAggregate {
  driverId: string;
  /** Contagem SÓ de registros com shareConsent=true. */
  sharedCount: number;
  uniquePractitioners: number;
  /** False sob k-anon: a UI mostra microcopy de proteção, nunca o número. */
  visible: boolean;
}

export function buildPracticeAggregates(
  entries: readonly PracticeEntry[],
  policy: PracticeJournalPolicy = DEFAULT_JOURNAL_POLICY,
): PracticeAggregate[] {
  const byDriver = new Map<string, PracticeEntry[]>();
  for (const entry of entries) {
    if (!entry.shareConsent) continue; // sem consentimento, o registro NUNCA entra no coletivo
    const list = byDriver.get(entry.driverId) ?? [];
    list.push(entry);
    byDriver.set(entry.driverId, list);
  }

  return [...byDriver.entries()]
    .map(([driverId, shared]) => {
      const uniquePractitioners = new Set(shared.map((e) => e.authorId)).size;
      return {
        driverId,
        sharedCount: shared.length,
        uniquePractitioners,
        visible: uniquePractitioners >= policy.kAnonymityMin,
      };
    })
    .sort((a, b) => a.driverId.localeCompare(b.driverId));
}
