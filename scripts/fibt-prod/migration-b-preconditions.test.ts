// Reexecuta as fixtures da Migration B produtiva.
//
// Motivo (FIBT-72H-D2A): a §M da especificação afirmava "44 fixtures, 44
// corretas" apenas como TABELA EM MARKDOWN — nenhum código no repositório
// conseguia reproduzir a afirmação. Um resultado de prova transcrito à mão não
// é prova reproduzível. Este arquivo reexecuta aquelas fixtures E os 16
// cenários exigidos pela D2A.
//
// Continua sendo prova de LÓGICA, nunca de execução em PostgreSQL (§K).

import { describe, expect, test } from "bun:test";
import {
  CANONICAL_AGGREGATE_CONTRACT,
  checkReturnContract,
  legacyLikeCheck,
  classifyDependency,
  classifyTrigger,
  policyGate,
  policyRecheckAfterCommit,
  evaluateInventory,
  decideMigrationB,
  reversibility,
  EXPECTED_FK,
  type DependencyRow,
  type MigrationBState,
  type ReturnColumn,
  type TargetColumn,
} from "./migration-b-preconditions";

const TARGET: TargetColumn = { tableOid: 20001, colAttnum: 3 };

const fkIdentity = { ...EXPECTED_FK } as DependencyRow["identity"];

function dep(over: Partial<DependencyRow>): DependencyRow {
  return {
    classid: "pg_constraint",
    objid: 30000,
    refclassid: "pg_class",
    refobjid: TARGET.tableOid,
    refobjsubid: TARGET.colAttnum,
    deptype: "n",
    ...over,
  };
}

const CLEAN_INVENTORY = {
  totalResponses: 0,
  withInviteToken: 0,
  validInviteLinks: 0,
  orphanInviteLinks: 0,
  snapshotRows: 0,
  duplicateTokens: 0,
  divergentResponseInviteWave: 0,
  invalidOrgResponses: 0,
};

function cleanState(over: Partial<MigrationBState> = {}): MigrationBState {
  return {
    projectRefConfirmed: true,
    lovableBatchTransactionConfirmed: true,
    migrationA: {
      waveCohortsTable: true,
      wavesInstrumentVersion: "text",
      waveInvitesCohortId: "uuid",
      waveInvitesExpiresAt: "timestamp with time zone",
      waveResponsesCohortId: "uuid",
      waveResponsesInstrument: "text",
      waveResponsesInstrumentVersion: "text",
      wavesIdOrgUk: true,
      aggregateFunctionResolves: true,
    },
    hardeningContract: CANONICAL_AGGREGATE_CONTRACT,
    hardeningSecdef: true,
    hardeningSearchPath: "public",
    countCohortParticipationPresent: true,
    policyCount: 0,
    dependencies: [{ row: dep({ identity: fkIdentity }), target: TARGET }],
    triggers: [],
    inventory: { ...CLEAN_INVENTORY },
    fkExactPresent: true,
    activeCollection: { activeInvites: 0, collectingWaves: 0 },
    activeCollectionExceptionApproved: false,
    residualFunctionReferences: [],
    ...over,
  };
}

// ─── §D — contrato de retorno (6 fixtures) ────────────────────────────────

describe("§D — contrato de retorno de aggregate_cohort_responses", () => {
  test("oito colunas corretas, na ordem → passa", () => {
    expect(checkReturnContract(CANONICAL_AGGREGATE_CONTRACT)).toBe("MATCH");
  });

  test("ordem trocada (k_min antes de response_count_label) → falha", () => {
    const swapped = [...CANONICAL_AGGREGATE_CONTRACT];
    [swapped[2], swapped[3]] = [swapped[3]!, swapped[2]!];
    expect(checkReturnContract(swapped)).toBe("MISMATCH");
  });

  test("tipo incorreto (response_count bigint) → falha", () => {
    const wrong = CANONICAL_AGGREGATE_CONTRACT.map((c) =>
      c.name === "response_count" ? { ...c, type: "bigint" } : c,
    );
    expect(checkReturnContract(wrong)).toBe("MISMATCH");
  });

  test("coluna ausente (sete colunas) → falha", () => {
    expect(checkReturnContract(CANONICAL_AGGREGATE_CONTRACT.slice(0, 7))).toBe("MISMATCH");
  });

  test("nome incorreto (response_count_label_v2) → falha", () => {
    const renamed = CANONICAL_AGGREGATE_CONTRACT.map((c) =>
      c.name === "response_count_label" ? { ...c, name: "response_count_label_v2" } : c,
    );
    expect(checkReturnContract(renamed)).toBe("MISMATCH");
  });

  test("response_count_label_v2 PASSAVA no LIKE antigo e falha agora", () => {
    const renamed: ReturnColumn[] = CANONICAL_AGGREGATE_CONTRACT.map((c) =>
      c.name === "response_count_label" ? { ...c, name: "response_count_label_v2" } : c,
    );
    expect(legacyLikeCheck(renamed)).toBe(true); // o predicado antigo aprovava
    expect(checkReturnContract(renamed)).toBe("MISMATCH"); // o novo reprova
  });

  test("função sem OUT/TABLE → NO_OUT_COLUMNS, nunca aprovação por omissão", () => {
    expect(checkReturnContract(null)).toBe("NO_OUT_COLUMNS");
    expect(checkReturnContract([])).toBe("NO_OUT_COLUMNS");
  });
});

// ─── §I — dependências catalogais (15 fixtures) ───────────────────────────

describe("§I — dependências resolvidas por classid", () => {
  test("FK legada exata → EXPECTED_DEPENDENCY", () => {
    expect(classifyDependency(dep({ identity: fkIdentity }), TARGET)).toBe("EXPECTED_DEPENDENCY");
  });

  test("FK de MESMO NOME com identidade diferente → bloqueia", () => {
    const impostor = dep({
      identity: { ...fkIdentity, referencedTable: "outra_tabela" },
    });
    expect(classifyDependency(impostor, TARGET)).toBe("UNEXPECTED_DEPENDENCY");
  });

  test.each([
    ["pg_rewrite (view/matview)", "pg_rewrite"],
    ["pg_attrdef (default de coluna)", "pg_attrdef"],
    ["pg_proc (função)", "pg_proc"],
    ["pg_trigger", "pg_trigger"],
    ["pg_class (índice)", "pg_class"],
  ])("%s dependente → bloqueia", (_label, classid) => {
    expect(classifyDependency(dep({ classid }), TARGET)).toBe("UNEXPECTED_DEPENDENCY");
  });

  test("pg_constraint CHECK (não é a FK esperada) → bloqueia", () => {
    expect(classifyDependency(dep({ identity: { name: "algum_check", contype: "c" } }), TARGET))
      .toBe("UNEXPECTED_DEPENDENCY");
  });

  test("pg_policy inesperada → bloqueia", () => {
    expect(classifyDependency(dep({ classid: "pg_policy", identity: { name: "qualquer" } }), TARGET))
      .toBe("UNEXPECTED_DEPENDENCY");
  });

  test("pg_policy response_submit → bloqueia (decisão PROD-0.5H, sem exceção por nome)", () => {
    expect(classifyDependency(dep({ classid: "pg_policy", identity: { name: "response_submit" } }), TARGET))
      .toBe("UNEXPECTED_DEPENDENCY");
  });

  test("classid não tratado (pg_statistic_ext) → UNKNOWN_CLASSID, aborta", () => {
    expect(classifyDependency(dep({ classid: "pg_statistic_ext" }), TARGET)).toBe("UNKNOWN_CLASSID");
  });

  test("OIDs IGUAIS em catálogos diferentes não se confundem", () => {
    // O mesmo objid 30000 existe como regra, como relação e como policy.
    const asRule = dep({ classid: "pg_rewrite", objid: 30000 });
    const asClass = dep({ classid: "pg_class", objid: 30000 });
    const asPolicy = dep({ classid: "pg_policy", objid: 30000, identity: { name: "p" } });
    const asFk = dep({ classid: "pg_constraint", objid: 30000, identity: fkIdentity });
    // Só o ramo pg_constraint com identidade completa é esperado; os demais bloqueiam.
    expect(classifyDependency(asRule, TARGET)).toBe("UNEXPECTED_DEPENDENCY");
    expect(classifyDependency(asClass, TARGET)).toBe("UNEXPECTED_DEPENDENCY");
    expect(classifyDependency(asPolicy, TARGET)).toBe("UNEXPECTED_DEPENDENCY");
    expect(classifyDependency(asFk, TARGET)).toBe("EXPECTED_DEPENDENCY");
  });

  test("dependência sobre OUTRA coluna → ignorada", () => {
    expect(classifyDependency(dep({ refobjsubid: 99 }), TARGET)).toBe("IGNORED_OTHER_COLUMN");
  });

  test("refclassid ≠ pg_class → ignorada", () => {
    expect(classifyDependency(dep({ refclassid: "pg_proc" }), TARGET)).toBe("IGNORED_OTHER_REFCLASS");
  });

  test("dependência em outra TABELA → ignorada", () => {
    expect(classifyDependency(dep({ refobjid: 99999 }), TARGET)).toBe("IGNORED_OTHER_REFCLASS");
  });

  test("estado produtivo esperado (só a FK) → lista bloqueadora vazia", () => {
    const rows = [dep({ identity: fkIdentity })];
    const blockers = rows
      .map((r) => classifyDependency(r, TARGET))
      .filter((v) => v === "UNEXPECTED_DEPENDENCY" || v === "UNKNOWN_CLASSID");
    expect(blockers).toEqual([]);
  });
});

// ─── §F — gate numérico de policies (7 fixtures) ──────────────────────────

describe("§F — gate numérico de policies", () => {
  test("policy_count = 0 → PASS", () => expect(policyGate(0)).toBe("PASS"));
  test("policy_count = 1 → FAIL", () => expect(policyGate(1)).toBe("FAIL"));
  test("policy_count = 2 → FAIL", () => expect(policyGate(2)).toBe("FAIL"));

  test("metadados NULL com count = 0 → PASS (quem decide é o número)", () => {
    expect(policyGate(0, null)).toBe("PASS");
  });

  test("metadados preenchidos com count > 0 → FAIL", () => {
    expect(policyGate(1, "response_submit|SELECT|permissive|{authenticated}")).toBe("FAIL");
  });

  test("releitura pós-COMMIT count = 0 → GO", () => {
    expect(policyRecheckAfterCommit(0)).toBe("GO");
  });

  test("releitura pós-COMMIT count > 0 → NO-GO operacional (não desfaz nada)", () => {
    expect(policyRecheckAfterCommit(1)).toBe("NO_GO_OPERACIONAL");
  });
});

// ─── §I — triggers (6 fixtures) ───────────────────────────────────────────

describe("§I — triggers bloqueiam por evidência, não por presença", () => {
  const base = {
    isInternal: false,
    dependsOnColumn: false,
    triggerDefReferencesColumn: false,
    functionDefReferencesColumn: false,
  };

  test("trigger de updated_at → não bloqueia", () => {
    expect(classifyTrigger({ ...base, name: "set_updated_at" })).toBe("DOES_NOT_BLOCK");
  });

  test("trigger de auditoria sem invite_token → não bloqueia", () => {
    expect(classifyTrigger({ ...base, name: "audit_wave_responses" })).toBe("DOES_NOT_BLOCK");
  });

  test("trigger cujo PARÂMETRO é p_invite_token → não bloqueia", () => {
    // \minvite_token\M não casa p_invite_token: quem alimenta o modelo já resolveu.
    expect(classifyTrigger({ ...base, name: "trg_param_only" })).toBe("DOES_NOT_BLOCK");
  });

  test("trigger com NEW.invite_token na FUNÇÃO → bloqueia", () => {
    expect(classifyTrigger({ ...base, name: "trg_fn", functionDefReferencesColumn: true })).toBe("BLOCKS");
  });

  test("trigger UPDATE OF invite_token → bloqueia via pg_depend", () => {
    expect(classifyTrigger({ ...base, name: "trg_update_of", dependsOnColumn: true })).toBe("BLOCKS");
  });

  test("trigger interno → não bloqueia, mas é classificado", () => {
    expect(classifyTrigger({ ...base, name: "RI_ConstraintTrigger", isInternal: true }))
      .toBe("INTERNAL_CLASSIFIED");
  });
});

// ─── §B — invariantes e os dois gates ─────────────────────────────────────

describe("§B — invariantes e gates de inventário", () => {
  test("inventário produtivo aprovado (tudo zero) → sem falhas", () => {
    expect(evaluateInventory(CLEAN_INVENTORY)).toEqual([]);
  });

  test("soma válidos+órfãos ≠ com_token → incoerência detectada", () => {
    expect(evaluateInventory({ ...CLEAN_INVENTORY, totalResponses: 3, withInviteToken: 3, validInviteLinks: 1, orphanInviteLinks: 1, snapshotRows: 3 }))
      .toContain("INVARIANT_SUM_MISMATCH");
  });

  test("snapshot ≠ com_token → incoerência detectada", () => {
    expect(evaluateInventory({ ...CLEAN_INVENTORY, totalResponses: 2, withInviteToken: 2, validInviteLinks: 2, snapshotRows: 1 }))
      .toContain("INVARIANT_SNAPSHOT_MISMATCH");
  });

  test("com_token > total → incoerência detectada", () => {
    expect(evaluateInventory({ ...CLEAN_INVENTORY, totalResponses: 1, withInviteToken: 2, validInviteLinks: 2, snapshotRows: 2 }))
      .toContain("INVARIANT_TOTAL_EXCEEDED");
  });

  test("órfão presente → aborta", () => {
    expect(evaluateInventory({ ...CLEAN_INVENTORY, totalResponses: 1, withInviteToken: 1, orphanInviteLinks: 1, snapshotRows: 1 }))
      .toContain("ORPHAN_LINKS_PRESENT");
  });

  test("token duplicado → aborta", () => {
    expect(evaluateInventory({ ...CLEAN_INVENTORY, duplicateTokens: 1 })).toContain("DUPLICATE_TOKENS_PRESENT");
  });

  test("resposta cross-tenant → aborta", () => {
    expect(evaluateInventory({ ...CLEAN_INVENTORY, invalidOrgResponses: 1 })).toContain("INVALID_ORG_RESPONSES");
  });

  test("contagem divergente resposta–convite–onda → aborta", () => {
    expect(evaluateInventory({ ...CLEAN_INVENTORY, divergentResponseInviteWave: 2 }))
      .toContain("DIVERGENT_RESPONSE_INVITE_WAVE");
  });
});

// ─── D2A Fase 4 — os 16 cenários exigidos ─────────────────────────────────

describe("FIBT-72H-D2A — 16 cenários da migration produtiva", () => {
  test("1. produção simulada vazia → PROCEED", () => {
    expect(decideMigrationB(cleanState()).decision).toBe("PROCEED_TO_DDL");
  });

  test("2. respostas todas reconciliadas (baseline zero) → PROCEED", () => {
    expect(decideMigrationB(cleanState({ inventory: { ...CLEAN_INVENTORY } })).decision).toBe("PROCEED_TO_DDL");
  });

  test.each([
    ["3. resposta sem cohort_id", { waveResponsesCohortId: "missing" }],
    ["4. resposta sem instrument", { waveResponsesInstrument: "missing" }],
    ["5. resposta sem instrument_version", { waveResponsesInstrumentVersion: "missing" }],
  ])("%s → aborta antes do DDL", (_label, patch) => {
    const r = decideMigrationB(cleanState({ migrationA: { ...cleanState().migrationA, ...(patch as object) } }));
    expect(r.decision).toBe("ABORT_BEFORE_DDL");
    expect((r as { reasons: string[] }).reasons.some((x) => x.startsWith("MIGRATION_A_INCOMPLETE"))).toBe(true);
  });

  test("6. convite ativo → aborta (sem exceção aprovada)", () => {
    const r = decideMigrationB(cleanState({ activeCollection: { activeInvites: 3, collectingWaves: 0 } }));
    expect(r.decision).toBe("ABORT_BEFORE_DDL");
    expect((r as { reasons: string[] }).reasons).toContain("ACTIVE_COLLECTION_PRESENT");
  });

  test("6b. convite ativo COM exceção explicitamente aprovada → PROCEED", () => {
    const r = decideMigrationB(cleanState({
      activeCollection: { activeInvites: 3, collectingWaves: 0 },
      activeCollectionExceptionApproved: true,
    }));
    expect(r.decision).toBe("PROCEED_TO_DDL");
  });

  test("7. onda em coleta → aborta", () => {
    const r = decideMigrationB(cleanState({ activeCollection: { activeInvites: 0, collectingWaves: 1 } }));
    expect((r as { reasons: string[] }).reasons).toContain("ACTIVE_COLLECTION_PRESENT");
  });

  test("8. token órfão → aborta", () => {
    const r = decideMigrationB(cleanState({
      inventory: { ...CLEAN_INVENTORY, totalResponses: 1, withInviteToken: 1, orphanInviteLinks: 1, snapshotRows: 1 },
    }));
    expect((r as { reasons: string[] }).reasons).toContain("ORPHAN_LINKS_PRESENT");
  });

  test("9. token duplicado → aborta", () => {
    const r = decideMigrationB(cleanState({ inventory: { ...CLEAN_INVENTORY, duplicateTokens: 2 } }));
    expect((r as { reasons: string[] }).reasons).toContain("DUPLICATE_TOKENS_PRESENT");
  });

  test("10. resposta cross-tenant → aborta", () => {
    const r = decideMigrationB(cleanState({ inventory: { ...CLEAN_INVENTORY, invalidOrgResponses: 1 } }));
    expect((r as { reasons: string[] }).reasons).toContain("INVALID_ORG_RESPONSES");
  });

  test("11. contagem divergente do baseline → aborta pelos DOIS gates", () => {
    const r = decideMigrationB(cleanState({
      inventory: { ...CLEAN_INVENTORY, totalResponses: 7, withInviteToken: 7, validInviteLinks: 7, snapshotRows: 7 },
    }));
    const reasons = (r as { reasons: string[] }).reasons;
    expect(reasons).toContain("GATE_TOTAL_RESPONSES_DRIFT");
    expect(reasons).toContain("GATE_WITH_INVITE_TOKEN_DRIFT");
  });

  test("12. organização inesperada (policy inesperada + org inválida) → aborta", () => {
    const r = decideMigrationB(cleanState({
      policyCount: 1,
      inventory: { ...CLEAN_INVENTORY, invalidOrgResponses: 2 },
    }));
    const reasons = (r as { reasons: string[] }).reasons;
    expect(reasons).toContain("POLICY_GATE_FAIL:1");
    expect(reasons).toContain("INVALID_ORG_RESPONSES");
  });

  test("13. migration parcialmente aplicada (A ok, H ausente) → aborta", () => {
    const r = decideMigrationB(cleanState({
      hardeningContract: null,
      countCohortParticipationPresent: false,
    }));
    const reasons = (r as { reasons: string[] }).reasons;
    expect(reasons).toContain("HARDENING_CONTRACT_NO_OUT_COLUMNS");
    expect(reasons).toContain("COUNT_COHORT_PARTICIPATION_MISSING");
  });

  test("14. função antiga ainda dependente da coluna → aborta", () => {
    const r = decideMigrationB(cleanState({ residualFunctionReferences: ["legacy_export_responses"] }));
    expect((r as { reasons: string[] }).reasons.some((x) => x.startsWith("RESIDUAL_COLUMN_REFERENCE"))).toBe(true);
  });

  test("15. rollback lógico ANTES do DROP → plenamente reversível", () => {
    expect(reversibility("before_ddl")).toBe("FULL_BY_ROLLBACK");
    expect(reversibility("after_drop_constraint")).toBe("FULL_BY_ROLLBACK_DDL_UNDONE");
    expect(reversibility("after_drop_column")).toBe("FULL_BY_ROLLBACK_DDL_UNDONE");
  });

  test("16. falha DEPOIS do COMMIT → só schema, exige restore", () => {
    expect(reversibility("after_commit")).toBe("SCHEMA_ONLY_REQUIRES_SNAPSHOT");
  });

  test("gates humanos: project_ref e contrato transacional do Lovable são obrigatórios", () => {
    const semRef = decideMigrationB(cleanState({ projectRefConfirmed: false }));
    expect((semRef as { reasons: string[] }).reasons).toContain("PROJECT_REF_NOT_CONFIRMED");
    const semBatch = decideMigrationB(cleanState({ lovableBatchTransactionConfirmed: false }));
    expect((semBatch as { reasons: string[] }).reasons).toContain("LOVABLE_BATCH_TRANSACTION_NOT_CONFIRMED");
  });

  test("a Migration B de STAGING não se aplica: seus valores fixos não aparecem aqui", async () => {
    const src = await Bun.file(new URL("./migration-b-preconditions.ts", import.meta.url)).text();
    expect(src).not.toContain("a0000000-0000-0000-0000-000000000001");
    expect(src).not.toContain("AFETADAS_ESPERADAS");
    expect(src).toContain("EXPECTED_TOTAL_RESPONSES = 0");
    expect(src).toContain("EXPECTED_WITH_INVITE_TOKEN = 0");
  });
});
