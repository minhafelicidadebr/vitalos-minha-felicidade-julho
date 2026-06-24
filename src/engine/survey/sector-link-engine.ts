// Sector-Link Engine — puro, setor-agnóstico. Gerencia o ciclo de vida de tokens
// opacos de pesquisa por setor: criação, resolução, supressão diferencial e snapshots
// de participação. Compõe campaign-engine.ts (nunca o substitui).
//
// Lei de ferro: nunca importa de domain/. Token, hash e labels chegam como parâmetro.
// Domínio B exclusivo — links de pesquisa COPSOQ/risco psicossocial. Domínio A (PERMA,
// VIA-T, FIB-T) usa o fluxo autenticado de /responder.
//
// Privacidade por construção:
//   • Token bruto nunca persiste — somente hash SHA-256.
//   • sector_id nunca retorna ao cliente — somente sectorLabel em texto amigável.
//   • completed_at arredondado para dia (nunca timestamp preciso).
//   • suppressDifferentialInference previne inferência por subtração entre grupos.

export type SectorLinkStatus = "active" | "expired" | "revoked" | "rotated";
export type SectorLinkAccessMode =
  | "shared_sector"    // Modo A: link compartilhado por setor — padrão
  | "credential_mode"; // Modo B: credencial anônima de elegibilidade — Fase 3

/**
 * Representação interna de um link (armazenada no servidor).
 * O token raw nunca aparece aqui — apenas o hash.
 */
export interface SectorLink {
  id: string;
  tokenHash: string;            // SHA-256(token) — nunca o token bruto
  status: SectorLinkStatus;
  accessMode: SectorLinkAccessMode;
  expiresAt: string;            // ISO — comparado como string; deve ser UTC
  revokedAt?: string;           // ISO
  rotatedFromId?: string;       // Auditoria de rotação
  meteAnchor?: string;          // "T3-2026" — temporada M.E.T.E.
  targetPopulation?: number;    // Estimativa do setor (opcional)
}

/** Resultado da verificação de validade de um link. */
export interface SectorLinkResolution {
  valid: boolean;
  reason?: "expired" | "revoked" | "rotated" | "not_found";
  link?: SectorLink;
}

/**
 * O que o servidor retorna ao cliente após resolver um token com sucesso.
 * Nunca contém: organization_id, sector_id numérico, token, hash ou outros
 * identificadores internos. É o contrato de segurança entre server e client.
 */
export interface SectorAccessGrant {
  sectorLabel: string;          // "Operações" — texto legível, jamais UUID
  campaignTitle: string;
  instrumentShort: string;      // "COPSOQ"
  opensAt: string;              // ISO date
  closesAt: string;             // ISO date
  meteAnchor?: string;          // "T3-2026"
  accessMode: SectorLinkAccessMode;
  waveId: string;               // necessário para captura de resposta
  surveyId: string;             // necessário para captura de resposta
}

/** Snapshot de participação de um setor (sempre agregado, nunca individual). */
export interface SectorParticipationSnapshot {
  linkId: string;
  opensCount: number;
  startsCount: number;
  completionsCount: number;
  targetPopulation: number;
  participationPct: number;     // 0–100, arredondado
  kAnonymityMin: number;
  meetsKAnonymity: boolean;     // completions >= kMin
  suppressedDifferential: boolean; // true → não exibir taxa (inferência por subtração)
}

// ─── Funções de ciclo de vida ────────────────────────────────────────────────

/**
 * Verifica se um link é válido agora. `nowIso` é injetado para pureza/determinismo.
 * A comparação de string ISO é correta para datas UTC no formato "YYYY-MM-DDTHH:MM:SSZ".
 */
export function resolveSectorLink(
  link: SectorLink | null | undefined,
  nowIso: string,
): SectorLinkResolution {
  if (!link) return { valid: false, reason: "not_found" };
  if (link.status === "revoked") return { valid: false, reason: "revoked" };
  if (link.status === "rotated") return { valid: false, reason: "rotated" };
  if (link.status === "expired") return { valid: false, reason: "expired" };
  if (link.expiresAt <= nowIso) return { valid: false, reason: "expired" };
  return { valid: true, link };
}

/**
 * Constrói o estado inicial de um novo link (sem persistência — puro).
 * `createdAt` é injetado para determinismo.
 */
export function buildSectorLink(params: {
  id: string;
  tokenHash: string;
  expiresInDays: number;
  createdAt: string;
  accessMode?: SectorLinkAccessMode;
  meteAnchor?: string;
  targetPopulation?: number;
}): SectorLink {
  const expiresAt = new Date(
    new Date(params.createdAt).getTime() + params.expiresInDays * 86_400_000,
  ).toISOString();
  return {
    id: params.id,
    tokenHash: params.tokenHash,
    status: "active",
    accessMode: params.accessMode ?? "shared_sector",
    expiresAt,
    meteAnchor: params.meteAnchor,
    targetPopulation: params.targetPopulation,
  };
}

// ─── Supressão diferencial ────────────────────────────────────────────────────

/**
 * Detecta se um grupo oculto (n < kMin) pode ser inferido por subtração a
 * partir dos grupos visíveis e do total. Retorna true quando é necessário
 * suprimir a exibição de taxas para prevenir reidentificação.
 *
 * Regra: se há EXATAMENTE UM grupo oculto e TODOS os demais são visíveis,
 * o gestor pode calcular o oculto = total − soma(visíveis) → suprimir.
 */
export function suppressDifferentialInference(
  segments: ReadonlyArray<{ count: number }>,
  kMin: number,
): boolean {
  if (segments.length < 2) return false;
  const hiddenCount = segments.filter((s) => s.count < kMin).length;
  const visibleCount = segments.filter((s) => s.count >= kMin).length;
  return hiddenCount === 1 && visibleCount === segments.length - 1;
}

// ─── Snapshot de participação ─────────────────────────────────────────────────

/**
 * Calcula o snapshot de participação de um setor com k-anonimato e supressão
 * diferencial. `siblingGroups` são os outros setores da mesma campanha (para
 * detectar inferência por subtração).
 */
export function buildParticipationSnapshot(
  params: {
    linkId: string;
    completions: number;
    opens: number;
    starts: number;
    targetPopulation: number;
    kAnonymityMin?: number;
  },
  siblingGroupCounts: ReadonlyArray<number> = [],
): SectorParticipationSnapshot {
  const k = params.kAnonymityMin ?? 5;
  const meetsK = params.completions >= k;
  const allGroups = [
    { count: params.completions },
    ...siblingGroupCounts.map((c) => ({ count: c })),
  ];
  const suppressed = suppressDifferentialInference(allGroups, k);

  return {
    linkId: params.linkId,
    opensCount: params.opens,
    startsCount: params.starts,
    completionsCount: params.completions,
    targetPopulation: params.targetPopulation,
    participationPct:
      params.targetPopulation > 0
        ? Math.round((params.completions / params.targetPopulation) * 100)
        : 0,
    kAnonymityMin: k,
    meetsKAnonymity: meetsK,
    suppressedDifferential: suppressed,
  };
}

// ─── Guard de visualização ────────────────────────────────────────────────────

/**
 * Determina se um snapshot pode ser exibido ao gestor (k-anon + sem supressão
 * diferencial). A UI deve mostrar "dados insuficientes" quando retorna false.
 */
export function isSnapshotVisibleToManager(snapshot: SectorParticipationSnapshot): boolean {
  return snapshot.meetsKAnonymity && !snapshot.suppressedDifferential;
}

// ─── Utilitário de expiração ──────────────────────────────────────────────────

/** Indica quantos dias restam até a expiração (negativo = expirado). */
export function daysUntilExpiration(link: SectorLink, nowIso: string): number {
  const ms = new Date(link.expiresAt).getTime() - new Date(nowIso).getTime();
  return Math.ceil(ms / 86_400_000);
}
