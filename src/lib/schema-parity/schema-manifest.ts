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
  // wave_invites.email — trava opcional do convite a um endereço. Escapou do
  // manifesto até 2026-07-13 (drift aplicado fora de banda no projeto original;
  // quebrou a criação de onda na cópia nova). Versionada em 20260713210000.
  { table: "wave_invites", column: "email", usedBy: "db-adapter.ts createWaveWithAdmin" },

  // sector_links — link setorial compartilhado (modalidade shared_sector).
  { table: "sector_links", column: "token_hash", usedBy: "sector-link.server.ts loadCloudLink" },
  { table: "sector_links", column: "sector_label", usedBy: "sector-link.server.ts loadCloudLink" },
  { table: "sector_links", column: "access_mode", usedBy: "sector-link.server.ts loadCloudLink" },
  { table: "sector_links", column: "status", usedBy: "sector-link.server.ts loadCloudLink" },
  { table: "sector_links", column: "expires_at", usedBy: "sector-link.server.ts loadCloudLink" },
  { table: "sector_links", column: "org_id", usedBy: "sector-link-admin.server.ts createSectorLinkAsAdmin" },
  { table: "sector_links", column: "wave_id", usedBy: "sector-link-admin.server.ts createSectorLinkAsAdmin" },

  // practice_entries — Diário de Prática real (Academia Viva 2.0 I7).
  { table: "practice_entries", column: "user_id", usedBy: "practice-journal-adapter.ts" },
  { table: "practice_entries", column: "org_id", usedBy: "practice-journal-adapter.ts savePracticeEntry" },
  { table: "practice_entries", column: "driver_id", usedBy: "practice-journal-adapter.ts" },
  { table: "practice_entries", column: "kind", usedBy: "practice-journal-adapter.ts" },
  { table: "practice_entries", column: "summary", usedBy: "practice-journal-adapter.ts" },
  { table: "practice_entries", column: "share_consent", usedBy: "practice-journal-adapter.ts" },
  { table: "practice_entries", column: "occurred_on", usedBy: "practice-journal-adapter.ts" },

  // seed_events — Sementes Vivas reais (Academia Viva 2.0 I1).
  { table: "seed_events", column: "user_id", usedBy: "seed-wallet-adapter.ts" },
  { table: "seed_events", column: "org_id", usedBy: "seed-wallet-adapter.ts / seed-pools.server.ts" },
  { table: "seed_events", column: "kind", usedBy: "seed-wallet-adapter.ts / seed-pools.server.ts" },
  { table: "seed_events", column: "amount", usedBy: "seed-wallet-adapter.ts / seed-pools.server.ts" },
  { table: "seed_events", column: "source_kind", usedBy: "seed-wallet-adapter.ts" },
  { table: "seed_events", column: "item_id", usedBy: "seed-wallet-adapter.ts" },
  { table: "seed_events", column: "recipient_id", usedBy: "seed-wallet-adapter.ts" },
  { table: "seed_events", column: "pool_id", usedBy: "seed-wallet-adapter.ts / seed-pools.server.ts" },
  { table: "seed_events", column: "occurred_on", usedBy: "seed-wallet-adapter.ts" },

  // pair_directory_entries — diretório consentido de colegas (Academia Viva 2.0 I6 real).
  { table: "pair_directory_entries", column: "user_id", usedBy: "pair-directory-adapter.ts" },
  { table: "pair_directory_entries", column: "org_id", usedBy: "pair-directory-adapter.ts upsertOwnDirectoryEntry" },
  { table: "pair_directory_entries", column: "display_name", usedBy: "pair-directory-adapter.ts" },
  { table: "pair_directory_entries", column: "focus_driver_id", usedBy: "pair-directory-adapter.ts" },
  { table: "pair_directory_entries", column: "shared_strength_ids", usedBy: "pair-directory-adapter.ts" },
  { table: "pair_directory_entries", column: "visible", usedBy: "pair-directory-adapter.ts leaveDirectory" },
  { table: "pair_directory_entries", column: "updated_at", usedBy: "pair-directory-adapter.ts" },

  // pair_invites / pair_records — formação bilateral da Dupla de Prática (I6).
  { table: "pair_invites", column: "from_user", usedBy: "pair-invite-adapter.ts" },
  { table: "pair_invites", column: "to_user", usedBy: "pair-invite-adapter.ts" },
  { table: "pair_invites", column: "focus_driver_id", usedBy: "pair-invite-adapter.ts" },
  { table: "pair_invites", column: "status", usedBy: "pair-invite-adapter.ts" },
  { table: "pair_records", column: "member_a", usedBy: "pair-invite-adapter.ts loadMyActivePair" },
  { table: "pair_records", column: "member_b", usedBy: "pair-invite-adapter.ts loadMyActivePair" },
  { table: "pair_records", column: "focus_driver_id", usedBy: "pair-invite-adapter.ts loadMyActivePair" },
  { table: "pair_records", column: "formed_on", usedBy: "pair-invite-adapter.ts loadMyActivePair" },
  { table: "pair_records", column: "active", usedBy: "pair-invite-adapter.ts loadMyActivePair" },

  // circle_sessions — Círculos Vivos reais (I5, privacidade por schema).
  { table: "circle_sessions", column: "org_id", usedBy: "circle-sessions-adapter.ts" },
  { table: "circle_sessions", column: "facilitator_id", usedBy: "circle-sessions-adapter.ts" },
  { table: "circle_sessions", column: "embassy_id", usedBy: "circle-sessions-adapter.ts" },
  { table: "circle_sessions", column: "driver_id", usedBy: "circle-sessions-adapter.ts" },
  { table: "circle_sessions", column: "occurred_on", usedBy: "circle-sessions-adapter.ts" },
  { table: "circle_sessions", column: "presence_count", usedBy: "circle-sessions-adapter.ts" },

  // ops_events — telemetria operacional mínima (P1-04).
  { table: "ops_events", column: "event", usedBy: "ops-events.server.ts emitOpsEvent" },
  { table: "ops_events", column: "org_id", usedBy: "ops-events.server.ts emitOpsEvent" },
  { table: "ops_events", column: "wave_id", usedBy: "ops-events.server.ts emitOpsEvent" },
  { table: "ops_events", column: "reason", usedBy: "ops-events.server.ts emitOpsEvent" },
  { table: "ops_events", column: "context", usedBy: "ops-events.server.ts emitOpsEvent" },
  { table: "ops_events", column: "occurred_at", usedBy: "ops-events.server.ts listOpsEventsForOrg" },

  // leads — captura real de leads comerciais (P1-05, S7 Porta de Entrada).
  { table: "leads", column: "name", usedBy: "lead-capture.server.ts submitLead/listLeads" },
  { table: "leads", column: "company", usedBy: "lead-capture.server.ts submitLead/listLeads" },
  { table: "leads", column: "role", usedBy: "lead-capture.server.ts submitLead/listLeads" },
  { table: "leads", column: "email", usedBy: "lead-capture.server.ts submitLead/listLeads" },
  { table: "leads", column: "whatsapp", usedBy: "lead-capture.server.ts submitLead/listLeads" },
  { table: "leads", column: "interest", usedBy: "lead-capture.server.ts submitLead/listLeads" },
  { table: "leads", column: "source_page", usedBy: "lead-capture.server.ts submitLead/listLeads" },
  { table: "leads", column: "utm_source", usedBy: "lead-capture.server.ts submitLead/listLeads" },
  { table: "leads", column: "utm_medium", usedBy: "lead-capture.server.ts submitLead" },
  { table: "leads", column: "utm_campaign", usedBy: "lead-capture.server.ts submitLead/listLeads" },
  { table: "leads", column: "utm_term", usedBy: "lead-capture.server.ts submitLead" },
  { table: "leads", column: "utm_content", usedBy: "lead-capture.server.ts submitLead" },
  { table: "leads", column: "consent", usedBy: "lead-capture.server.ts submitLead" },
  { table: "leads", column: "consent_version", usedBy: "lead-capture.server.ts submitLead" },
  { table: "leads", column: "created_at", usedBy: "lead-capture.server.ts listLeads" },

  // member_invites — convite de uma segunda+ pessoa numa org já existente
  // (Onda "Convite de Pessoa"). Distinto de org_invites: aqui org_id e role
  // são explícitos desde a criação, não decorrência do próprio convite.
  { table: "member_invites", column: "org_id", usedBy: "member-invite.server.ts createMemberInvite/listMemberInvites" },
  { table: "member_invites", column: "email", usedBy: "member-invite.server.ts createMemberInvite/resolveMemberInvite" },
  { table: "member_invites", column: "role", usedBy: "member-invite.server.ts createMemberInvite/resolveMemberInvite" },
  { table: "member_invites", column: "created_by", usedBy: "member-invite.server.ts createMemberInvite" },
  { table: "member_invites", column: "used_at", usedBy: "member-invite.server.ts resolveMemberInvite/listMemberInvites" },
  { table: "member_invites", column: "expires_at", usedBy: "member-invite.server.ts resolveMemberInvite/listMemberInvites" },
  { table: "member_invites", column: "created_at", usedBy: "member-invite.server.ts listMemberInvites" },
  { table: "organizations", column: "pack_id", usedBy: "member-invite.server.ts createMemberInvite/resolveMemberInvite" },
  { table: "organizations", column: "plan", usedBy: "member-invite.server.ts createMemberInvite" },
  { table: "profiles", column: "org_id", usedBy: "member-invite.server.ts createMemberInvite (contagem de seats)" },

  // Customer Health v1 (E4) — contagens org-level; colunas filtradas/lidas.
  { table: "action_items", column: "owner_user_id", usedBy: "customer-health.server.ts listAccountHealth" },
  { table: "action_items", column: "due_on", usedBy: "customer-health.server.ts listAccountHealth" },
  { table: "organizations", column: "pack_id", usedBy: "customer-health.server.ts listAccountHealth" },
  { table: "organizations", column: "plan", usedBy: "customer-health.server.ts listAccountHealth" },
];
