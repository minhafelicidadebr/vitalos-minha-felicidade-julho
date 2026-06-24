// Mock de links de setor — fonte canônica de tokens demo para o fluxo público.
// Em produção: tokens são gerados na UI do admin, hash armazenado no Supabase,
// setor resolvido pelo servidor via RPC. Aqui: mapa determinístico demo→registro.
//
// INVARIANTE: nenhum token revela sector_id ou organization_id.
// A rota /respond/s/:token recebe somente sectorLabel (texto) do servidor.

import { buildSectorLink, type SectorLink } from "@/engine/survey/sector-link-engine";

// ─── Tipo de registro interno (nunca exposto ao cliente como está) ─────────────

export interface SectorLinkRecord {
  link: SectorLink;
  sectorLabel: string;          // texto amigável — o único identificador de setor no client
  campaignTitle: string;
  instrumentShort: string;      // casa com SurveyDefinition.instrumentShort
  opensAt: string;
  closesAt: string;
  packId: string;               // para lookup server-side da SurveyDefinition
  waveId: string;               // para CaptureReceipt
  surveyId: string;             // para CaptureReceipt
}

// ─── Tokens demo (opacos, sem informação interna embutida) ─────────────────────

// Estes tokens imitam o que nanoid(32) ou crypto.getRandomValues geraria.
// Escolhidos sem padrão legível para não sugerir uso de tokens reais legíveis.

const CREATED_AT = "2026-06-23T00:00:00.000Z";

const DEMO_LINKS: Record<string, SectorLinkRecord> = {
  // ── Ativo: Operações · COPSOQ T3-2026 ──────────────────────────────────────
  "vL9k3mPqR7wXnAy2sZcBdEfGhJtUiOp": {
    link: buildSectorLink({
      id: "sl-ops-t3-2026-001",
      tokenHash: "mock-hash-ops-2026",  // em produção: SHA-256 do token bruto
      expiresInDays: 99,
      createdAt: CREATED_AT,
      meteAnchor: "T3-2026",
      targetPopulation: 140,
    }),
    sectorLabel: "Operações",
    campaignTitle: "Avaliação de Riscos Psicossociais T3-2026",
    instrumentShort: "COPSOQ",
    opensAt: "2026-07-01",
    closesAt: "2026-09-30",
    packId: "enterprise",
    waveId: "onda-2026-t1-copsoq",
    surveyId: "copsoq-demo",
  },

  // ── Ativo: Administrativo · COPSOQ T3-2026 ─────────────────────────────────
  "mK4jRnQzPxWcLaBy7dFhSgVoIeYuNtXk": {
    link: buildSectorLink({
      id: "sl-adm-t3-2026-002",
      tokenHash: "mock-hash-adm-2026",
      expiresInDays: 99,
      createdAt: CREATED_AT,
      meteAnchor: "T3-2026",
      targetPopulation: 85,
    }),
    sectorLabel: "Administrativo",
    campaignTitle: "Avaliação de Riscos Psicossociais T3-2026",
    instrumentShort: "COPSOQ",
    opensAt: "2026-07-01",
    closesAt: "2026-09-30",
    packId: "enterprise",
    waveId: "onda-2026-t1-copsoq",
    surveyId: "copsoq-demo",
  },

  // ── Ativo: Engenharia · COPSOQ T3-2026 ─────────────────────────────────────
  "pT5nKvRyBwQsLjMx8eZdUaChGfYiNbWo": {
    link: buildSectorLink({
      id: "sl-eng-t3-2026-003",
      tokenHash: "mock-hash-eng-2026",
      expiresInDays: 99,
      createdAt: CREATED_AT,
      meteAnchor: "T3-2026",
      targetPopulation: 120,
    }),
    sectorLabel: "Engenharia",
    campaignTitle: "Avaliação de Riscos Psicossociais T3-2026",
    instrumentShort: "COPSOQ",
    opensAt: "2026-07-01",
    closesAt: "2026-09-30",
    packId: "enterprise",
    waveId: "onda-2026-t1-copsoq",
    surveyId: "copsoq-demo",
  },

  // ── Expirado (jan 2026) — para demonstrar o estado de erro ─────────────────
  "xQ2wPmRk9vLnBsZt3aYdFhJcUoGiEbKq": {
    link: {
      ...buildSectorLink({
        id: "sl-expired-demo",
        tokenHash: "mock-hash-expired",
        expiresInDays: 1,
        createdAt: "2026-01-08T00:00:00.000Z",
      }),
      status: "expired",
    },
    sectorLabel: "Comercial",
    campaignTitle: "Avaliação de Riscos Psicossociais T1-2026",
    instrumentShort: "COPSOQ",
    opensAt: "2026-01-08",
    closesAt: "2026-01-22",
    packId: "enterprise",
    waveId: "onda-2026-t1-copsoq",
    surveyId: "copsoq-demo",
  },

  // ── Revogado — para demonstrar o estado de erro ────────────────────────────
  "yR3vLnMw8kQpBcAd1sZtEhGiJuXfOeCr": {
    link: {
      ...buildSectorLink({
        id: "sl-revoked-demo",
        tokenHash: "mock-hash-revoked",
        expiresInDays: 90,
        createdAt: CREATED_AT,
      }),
      status: "revoked",
      revokedAt: "2026-06-25T14:30:00.000Z",
    },
    sectorLabel: "Turno noite (Sul)",
    campaignTitle: "Avaliação de Riscos Psicossociais T3-2026",
    instrumentShort: "COPSOQ",
    opensAt: "2026-07-01",
    closesAt: "2026-09-30",
    packId: "enterprise",
    waveId: "onda-2026-t1-copsoq",
    surveyId: "copsoq-demo",
  },
};

/** Localiza o registro pelo token bruto. O servidor usa este lookup + resolveSectorLink. */
export function getSectorLinkRecord(token: string): SectorLinkRecord | null {
  return DEMO_LINKS[token] ?? null;
}

/** Todos os tokens registrados (para QA/auditoria interna). */
export function getAllSectorLinkTokens(): string[] {
  return Object.keys(DEMO_LINKS);
}

/** Dados de participação por token (demo — valores fixos). */
export const DEMO_PARTICIPATION: Record<string, { opens: number; starts: number; completions: number }> = {
  "vL9k3mPqR7wXnAy2sZcBdEfGhJtUiOp": { opens: 42, starts: 35, completions: 28 },
  "mK4jRnQzPxWcLaBy7dFhSgVoIeYuNtXk": { opens: 31, starts: 25, completions: 19 },
  "pT5nKvRyBwQsLjMx8eZdUaChGfYiNbWo": { opens: 58, starts: 51, completions: 47 },
};
