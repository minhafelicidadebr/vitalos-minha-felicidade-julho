// Manifesto de dependências de schema — a fonte ÚNICA e declarada do que o
// código exige do banco além do óbvio.
//
// Por que declarado (e não inferido de AST): extrair colunas de `.insert({…})`,
// `.update({…})` e `.select("a, b")` de forma abrangente é frágil e produz falsa
// confiança. Uma lista curada é honesta: cada linha é uma promessa verificável
// "o código X depende da coluna Y", e adicionar uma dependência nova custa uma
// linha aqui — se a migration não a criar, o teste de paridade falha.
//
// RPCs NÃO entram aqui: são derivadas automaticamente das chamadas `.rpc()`
// (findRpcUsages), que são triviais de detectar por regex e não sofrem de falso
// negativo. Aqui ficam só as COLUNAS críticas que o app grava/lê.

import type { ColumnDependency } from "./parity-core";

/**
 * Dependências de coluna que o código de servidor assume existir.
 * Ordenadas por tabela. `usedBy` aponta para o call site real (auditável).
 */
export const COLUMN_DEPENDENCIES: ColumnDependency[] = [
  // organizations — cadastro completo da empresa (onboarding setorial).
  { table: "organizations", column: "cnpj", usedBy: "onboarding.server.ts createOrgAndAdmin" },
  { table: "organizations", column: "team_size_band", usedBy: "onboarding.server.ts createOrgAndAdmin" },
  { table: "organizations", column: "phone", usedBy: "onboarding.server.ts createOrgAndAdmin" },
  { table: "organizations", column: "address", usedBy: "onboarding.server.ts createOrgAndAdmin" },
  { table: "organizations", column: "segment", usedBy: "onboarding.server.ts createOrgAndAdmin" },

  // org_invites — plano comercial decidido pelo admin da plataforma no convite.
  { table: "org_invites", column: "plan", usedBy: "org-invite.server.ts createOrgInvite/resolveOrgInvite" },

  // wave_invites — marca de disparo de e-mail do convite de onda.
  { table: "wave_invites", column: "emailed_at", usedBy: "wave-admin.server.ts createWaveAsAdmin" },

  // sector_links — link setorial compartilhado (modalidade shared_sector).
  { table: "sector_links", column: "token_hash", usedBy: "sector-link.server.ts loadCloudLink" },
  { table: "sector_links", column: "sector_label", usedBy: "sector-link.server.ts loadCloudLink" },
  { table: "sector_links", column: "access_mode", usedBy: "sector-link.server.ts loadCloudLink" },
  { table: "sector_links", column: "status", usedBy: "sector-link.server.ts loadCloudLink" },
  { table: "sector_links", column: "expires_at", usedBy: "sector-link.server.ts loadCloudLink" },
  { table: "sector_links", column: "org_id", usedBy: "sector-link-admin.server.ts createSectorLinkAsAdmin" },
  { table: "sector_links", column: "wave_id", usedBy: "sector-link-admin.server.ts createSectorLinkAsAdmin" },

  // ops_events — telemetria operacional mínima (P1-04).
  { table: "ops_events", column: "event", usedBy: "ops-events.server.ts emitOpsEvent" },
  { table: "ops_events", column: "org_id", usedBy: "ops-events.server.ts emitOpsEvent" },
  { table: "ops_events", column: "wave_id", usedBy: "ops-events.server.ts emitOpsEvent" },
  { table: "ops_events", column: "reason", usedBy: "ops-events.server.ts emitOpsEvent" },
  { table: "ops_events", column: "context", usedBy: "ops-events.server.ts emitOpsEvent" },
  { table: "ops_events", column: "occurred_at", usedBy: "ops-events.server.ts listOpsEventsForOrg" },
];
