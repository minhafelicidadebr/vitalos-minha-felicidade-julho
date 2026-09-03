#!/usr/bin/env bun
// Modelo executável dos predicados da Migration B PRODUTIVA.
//
// Por que este arquivo existe (FIBT-72H-D2A): a especificação
// `docs/fibt-prod/MIGRATION_B_PRODUCTION_SPEC.md` §M afirma "44 fixtures, 44
// corretas, 0 divergências" — mas as fixtures viviam APENAS como tabela em
// Markdown. Nada no repositório conseguia reexecutá-las: uma afirmação de
// prova sem prova reproduzível. Este módulo reconstrói os predicados como
// código puro, e o arquivo de teste ao lado reexecuta as fixtures documentadas
// mais os cenários exigidos pela D2A.
//
// O QUE ESTE MODELO É: uma reprodução em TypeScript da LÓGICA de classificação
// e comparação descrita na especificação. Prova que a lógica decide certo.
//
// O QUE ELE NÃO É: execução de SQL. Nenhum banco é acessado, nenhum plano do
// PostgreSQL é exercitado, nenhum erro de sintaxe SQL é detectado aqui. A prova
// de execução continua sendo a de PostgreSQL 17 não produtivo (§K da spec),
// ainda não autorizada.
//
// Nada aqui aplica migration, abre conexão ou lê credencial.

// ─── §D — contrato de retorno de aggregate_cohort_responses ───────────────

export interface ReturnColumn {
  name: string;
  type: string;
}

/** Contrato canônico, fonte normativa 20260730155000. Ordem é normativa. */
export const CANONICAL_AGGREGATE_CONTRACT: readonly ReturnColumn[] = [
  { name: "visible", type: "boolean" },
  { name: "response_count", type: "integer" },
  { name: "response_count_label", type: "text" },
  { name: "k_min", type: "integer" },
  { name: "item_means", type: "jsonb" },
  { name: "factor_scores", type: "jsonb" },
  { name: "domain_means", type: "jsonb" },
  { name: "suppression_reason", type: "text" },
] as const;

export type ContractVerdict = "MATCH" | "MISMATCH" | "NO_OUT_COLUMNS";

/**
 * Igualdade estrita por nome, tipo E ordem — nunca `LIKE` sobre a concatenação
 * de `proargnames`, que deixava passar ordem trocada, tipo trocado e nome que
 * apenas contivesse o esperado como substring (`response_count_label_v2`).
 *
 * `null`/vazio (função sem OUT/TABLE) reprova: fail-closed, nunca passa por
 * omissão.
 */
export function checkReturnContract(
  observed: readonly ReturnColumn[] | null | undefined,
): ContractVerdict {
  if (!observed || observed.length === 0) return "NO_OUT_COLUMNS";
  if (observed.length !== CANONICAL_AGGREGATE_CONTRACT.length) return "MISMATCH";
  for (let i = 0; i < CANONICAL_AGGREGATE_CONTRACT.length; i++) {
    const expected = CANONICAL_AGGREGATE_CONTRACT[i]!;
    const got = observed[i]!;
    if (got.name !== expected.name || got.type !== expected.type) return "MISMATCH";
  }
  return "MATCH";
}

/** O predicado ANTIGO, preservado só para provar que ele era permissivo demais. */
export function legacyLikeCheck(observed: readonly ReturnColumn[]): boolean {
  const joined = observed.map((c) => c.name).join(",");
  return CANONICAL_AGGREGATE_CONTRACT.every((c) => joined.includes(c.name));
}

// ─── §I — dependências catalogais resolvidas por classid ──────────────────

export type Classid =
  | "pg_rewrite"
  | "pg_constraint"
  | "pg_attrdef"
  | "pg_proc"
  | "pg_trigger"
  | "pg_policy"
  | "pg_class";

const KNOWN_CLASSIDS: readonly string[] = [
  "pg_rewrite", "pg_constraint", "pg_attrdef", "pg_proc", "pg_trigger", "pg_policy", "pg_class",
];

export interface DependencyRow {
  classid: string;
  objid: number;
  objsubid?: number;
  refclassid: string;
  refobjid: number;
  refobjsubid: number;
  deptype: string;
  /** Identidade do objeto dependente, resolvida no catálogo do próprio classid. */
  identity?: {
    name?: string;
    contype?: string;
    localTable?: string;
    localColumn?: string;
    referencedTable?: string;
    referencedColumn?: string;
  };
}

export interface TargetColumn {
  tableOid: number;
  colAttnum: number;
}

export type DependencyVerdict =
  | "EXPECTED_DEPENDENCY"
  | "UNEXPECTED_DEPENDENCY"
  | "UNKNOWN_CLASSID"
  | "IGNORED_OTHER_COLUMN"
  | "IGNORED_OTHER_REFCLASS";

/** A ÚNICA dependência esperada, conferida por identidade completa. */
export const EXPECTED_FK = {
  name: "wave_responses_invite_token_fkey",
  contype: "f",
  localTable: "wave_responses",
  localColumn: "invite_token",
  referencedTable: "wave_invites",
  referencedColumn: "token",
} as const;

/**
 * Resolve uma linha de `pg_depend` contra a coluna alvo.
 *
 * O defeito corrigido: `objid` só é interpretável JUNTO com `classid` — OIDs
 * são únicos dentro de cada catálogo, nunca globalmente. Sem o filtro, um OID
 * de `pg_rewrite` colide com um de `pg_class` e inventa dependente (falso
 * positivo), enquanto views reais passam despercebidas (falso negativo).
 */
export function classifyDependency(row: DependencyRow, target: TargetColumn): DependencyVerdict {
  if (row.refclassid !== "pg_class") return "IGNORED_OTHER_REFCLASS";
  if (row.refobjid !== target.tableOid) return "IGNORED_OTHER_REFCLASS";
  if (row.refobjsubid !== target.colAttnum) return "IGNORED_OTHER_COLUMN";
  if (!KNOWN_CLASSIDS.includes(row.classid)) return "UNKNOWN_CLASSID";

  if (row.classid === "pg_constraint") {
    const id = row.identity;
    const exact =
      id?.name === EXPECTED_FK.name &&
      id?.contype === EXPECTED_FK.contype &&
      id?.localTable === EXPECTED_FK.localTable &&
      id?.localColumn === EXPECTED_FK.localColumn &&
      id?.referencedTable === EXPECTED_FK.referencedTable &&
      id?.referencedColumn === EXPECTED_FK.referencedColumn;
    return exact ? "EXPECTED_DEPENDENCY" : "UNEXPECTED_DEPENDENCY";
  }

  // pg_policy nunca tem exceção por nome: o baseline autorizado é zero policies.
  return "UNEXPECTED_DEPENDENCY";
}

// ─── §F — gate numérico de policies ───────────────────────────────────────

export const EXPECTED_WAVE_RESPONSES_POLICY_COUNT = 0;

/** Quem decide é o NÚMERO. `string_agg` de zero linhas devolve NULL — o NULL
 *  compõe a mensagem de erro, nunca a decisão. */
export function policyGate(count: number, _metadata?: string | null): "PASS" | "FAIL" {
  return count === EXPECTED_WAVE_RESPONSES_POLICY_COUNT ? "PASS" : "FAIL";
}

/** Releitura externa, DEPOIS do COMMIT: detecta drift, não desfaz nada. */
export function policyRecheckAfterCommit(count: number): "GO" | "NO_GO_OPERACIONAL" {
  return count === 0 ? "GO" : "NO_GO_OPERACIONAL";
}

// ─── §I — triggers: evidência, não presença ───────────────────────────────

export interface TriggerEvidence {
  name: string;
  isInternal: boolean;
  /** pg_depend com classid=pg_trigger referenciando o attnum da coluna (fonte primária). */
  dependsOnColumn: boolean;
  /** pg_get_triggerdef contém referência real à coluna (defesa suplementar). */
  triggerDefReferencesColumn: boolean;
  /** pg_get_functiondef da função chamada referencia a coluna (ex.: NEW.invite_token). */
  functionDefReferencesColumn: boolean;
}

export type TriggerVerdict = "BLOCKS" | "DOES_NOT_BLOCK" | "INTERNAL_CLASSIFIED";

/** Nome de PARÂMETRO nunca conta como referência à coluna — quem chama este
 *  modelo já resolveu isso com `\minvite_token\M`, que não casa `p_invite_token`. */
export function classifyTrigger(t: TriggerEvidence): TriggerVerdict {
  if (t.isInternal) return "INTERNAL_CLASSIFIED";
  if (t.dependsOnColumn || t.triggerDefReferencesColumn || t.functionDefReferencesColumn) {
    return "BLOCKS";
  }
  return "DOES_NOT_BLOCK";
}

// ─── §B — as oito contagens, invariantes e os dois gates ──────────────────

export const EXPECTED_TOTAL_RESPONSES = 0;
export const EXPECTED_WITH_INVITE_TOKEN = 0;

export interface InventoryCounts {
  totalResponses: number;
  withInviteToken: number;
  validInviteLinks: number;
  orphanInviteLinks: number;
  snapshotRows: number;
  duplicateTokens: number;
  divergentResponseInviteWave: number;
  invalidOrgResponses: number;
}

export type InventoryFailure =
  | "INVARIANT_SUM_MISMATCH"
  | "INVARIANT_SNAPSHOT_MISMATCH"
  | "INVARIANT_TOTAL_EXCEEDED"
  | "ORPHAN_LINKS_PRESENT"
  | "DUPLICATE_TOKENS_PRESENT"
  | "DIVERGENT_RESPONSE_INVITE_WAVE"
  | "INVALID_ORG_RESPONSES"
  | "GATE_TOTAL_RESPONSES_DRIFT"
  | "GATE_WITH_INVITE_TOKEN_DRIFT";

/** Ordem normativa: invariantes de coerência ANTES dos gates de baseline —
 *  contagem incoerente indica leitura inconsistente, e isso precisa de um
 *  diagnóstico próprio, não de "drift". */
export function evaluateInventory(c: InventoryCounts): InventoryFailure[] {
  const f: InventoryFailure[] = [];
  if (c.validInviteLinks + c.orphanInviteLinks !== c.withInviteToken) f.push("INVARIANT_SUM_MISMATCH");
  if (c.snapshotRows !== c.withInviteToken) f.push("INVARIANT_SNAPSHOT_MISMATCH");
  if (c.withInviteToken > c.totalResponses) f.push("INVARIANT_TOTAL_EXCEEDED");
  if (c.orphanInviteLinks !== 0) f.push("ORPHAN_LINKS_PRESENT");
  if (c.duplicateTokens !== 0) f.push("DUPLICATE_TOKENS_PRESENT");
  if (c.divergentResponseInviteWave !== 0) f.push("DIVERGENT_RESPONSE_INVITE_WAVE");
  if (c.invalidOrgResponses !== 0) f.push("INVALID_ORG_RESPONSES");
  if (c.totalResponses !== EXPECTED_TOTAL_RESPONSES) f.push("GATE_TOTAL_RESPONSES_DRIFT");
  if (c.withInviteToken !== EXPECTED_WITH_INVITE_TOKEN) f.push("GATE_WITH_INVITE_TOKEN_DRIFT");
  return f;
}

// ─── §C — os nove componentes da Migration A ──────────────────────────────

export interface MigrationAComponents {
  waveCohortsTable: boolean;
  wavesInstrumentVersion: "text" | "missing" | string;
  waveInvitesCohortId: "uuid" | "missing" | string;
  waveInvitesExpiresAt: "timestamp with time zone" | "missing" | string;
  waveResponsesCohortId: "uuid" | "missing" | string;
  waveResponsesInstrument: "text" | "missing" | string;
  waveResponsesInstrumentVersion: "text" | "missing" | string;
  wavesIdOrgUk: boolean;
  aggregateFunctionResolves: boolean;
}

export function missingMigrationAComponents(a: MigrationAComponents): string[] {
  const out: string[] = [];
  if (!a.waveCohortsTable) out.push("wave_cohorts");
  if (a.wavesInstrumentVersion !== "text") out.push("waves.instrument_version");
  if (a.waveInvitesCohortId !== "uuid") out.push("wave_invites.cohort_id");
  if (a.waveInvitesExpiresAt !== "timestamp with time zone") out.push("wave_invites.expires_at");
  if (a.waveResponsesCohortId !== "uuid") out.push("wave_responses.cohort_id");
  if (a.waveResponsesInstrument !== "text") out.push("wave_responses.instrument");
  if (a.waveResponsesInstrumentVersion !== "text") out.push("wave_responses.instrument_version");
  if (!a.wavesIdOrgUk) out.push("waves_id_org_uk");
  if (!a.aggregateFunctionResolves) out.push("aggregate_cohort_responses(uuid,uuid)");
  return out;
}

// ─── Decisão consolidada ──────────────────────────────────────────────────

export interface MigrationBState {
  projectRefConfirmed: boolean;
  lovableBatchTransactionConfirmed: boolean;
  migrationA: MigrationAComponents;
  hardeningContract: readonly ReturnColumn[] | null;
  hardeningSecdef: boolean;
  hardeningSearchPath: string | null;
  countCohortParticipationPresent: boolean;
  policyCount: number;
  dependencies: { row: DependencyRow; target: TargetColumn }[];
  triggers: TriggerEvidence[];
  inventory: InventoryCounts;
  fkExactPresent: boolean;
  activeCollection: { activeInvites: number; collectingWaves: number };
  activeCollectionExceptionApproved: boolean;
  residualFunctionReferences: string[];
}

export type MigrationBDecision =
  | { decision: "ABORT_BEFORE_DDL"; reasons: string[] }
  | { decision: "PROCEED_TO_DDL" };

/** Todas as recusas acontecem ANTES do primeiro DDL — é o que torna os
 *  cenários 1..14 plenamente reversíveis por ROLLBACK. */
export function decideMigrationB(s: MigrationBState): MigrationBDecision {
  const reasons: string[] = [];

  if (!s.projectRefConfirmed) reasons.push("PROJECT_REF_NOT_CONFIRMED");
  if (!s.lovableBatchTransactionConfirmed) reasons.push("LOVABLE_BATCH_TRANSACTION_NOT_CONFIRMED");

  const missingA = missingMigrationAComponents(s.migrationA);
  if (missingA.length > 0) reasons.push(`MIGRATION_A_INCOMPLETE:${missingA.join("|")}`);

  const contract = checkReturnContract(s.hardeningContract);
  if (contract !== "MATCH") reasons.push(`HARDENING_CONTRACT_${contract}`);
  if (!s.hardeningSecdef) reasons.push("HARDENING_NOT_SECURITY_DEFINER");
  if (s.hardeningSearchPath !== "public") reasons.push("HARDENING_SEARCH_PATH_INVALID");
  if (!s.countCohortParticipationPresent) reasons.push("COUNT_COHORT_PARTICIPATION_MISSING");

  if (policyGate(s.policyCount) === "FAIL") reasons.push(`POLICY_GATE_FAIL:${s.policyCount}`);

  for (const d of s.dependencies) {
    const v = classifyDependency(d.row, d.target);
    if (v === "UNEXPECTED_DEPENDENCY" || v === "UNKNOWN_CLASSID") {
      reasons.push(`DEPENDENCY_${v}:${d.row.classid}`);
    }
  }
  for (const t of s.triggers) {
    if (classifyTrigger(t) === "BLOCKS") reasons.push(`TRIGGER_BLOCKS:${t.name}`);
  }

  if (!s.fkExactPresent) reasons.push("EXPECTED_FK_NOT_FOUND");
  reasons.push(...evaluateInventory(s.inventory));

  const collecting = s.activeCollection.activeInvites > 0 || s.activeCollection.collectingWaves > 0;
  if (collecting && !s.activeCollectionExceptionApproved) reasons.push("ACTIVE_COLLECTION_PRESENT");

  if (s.residualFunctionReferences.length > 0) {
    reasons.push(`RESIDUAL_COLUMN_REFERENCE:${s.residualFunctionReferences.join("|")}`);
  }

  return reasons.length > 0 ? { decision: "ABORT_BEFORE_DDL", reasons } : { decision: "PROCEED_TO_DDL" };
}

/** Ponto de não retorno: só existe DEPOIS do DROP COLUMN. */
export function reversibility(stage: "before_ddl" | "after_drop_constraint" | "after_drop_column" | "after_commit"):
  "FULL_BY_ROLLBACK" | "FULL_BY_ROLLBACK_DDL_UNDONE" | "SCHEMA_ONLY_REQUIRES_SNAPSHOT" {
  if (stage === "before_ddl") return "FULL_BY_ROLLBACK";
  if (stage === "after_drop_constraint" || stage === "after_drop_column") return "FULL_BY_ROLLBACK_DDL_UNDONE";
  return "SCHEMA_ONLY_REQUIRES_SNAPSHOT";
}
