// Governança (R8) e educação (R7) no servidor. Sessões e autoridade FICTÍCIAS e
// identificadas; verificam o software, não o método.
import { describe, expect, test } from "bun:test";
import type { MembershipResult } from "@/lib/auth/authorize.server";
import { encodeContentRef, getFactorContentById, getFactorContentCatalog, parseContentRef, validateFactorContent } from "@/domain/ivo/factor-content";
import rawContent from "@/domain/ivo/factor-content.json";
import { ivoGovernanceSchemas } from "@/lib/api/ivo-governance.functions";
import { loadGovernanceForSession, prepareGovernanceDecisionForSession, type GovernanceDeps } from "./ivo-governance.server";
import { loadEducationForSession } from "./ivo-education.server";
import { recordFibtActionEvidence, type FibtActionLedgerStore } from "./fibt-action-loop.server";

const SESSIONS: Record<string, MembershipResult> = {
  "token-rh-admin": { ok: true, membership: { userId: "user-rh-admin", orgId: "org-alfa", role: "RH_ADMIN" } },
  "token-autoridade": { ok: true, membership: { userId: "user-autoridade-sintetica", orgId: "org-alfa", role: "RH_ADMIN" } },
};
function deps(authorityIds: string[], extra: Partial<GovernanceDeps> = {}): GovernanceDeps {
  return {
    boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
    identity: () => ({ requestedMode: "cloud", state: "cloud", realAuthentication: true, serverEnforced: true, reason: "cloud_ready" }),
    requireAdmin: async (t) => SESSIONS[t] ?? { ok: false, reason: "invalid_session" },
    authority: () => ({ configuredUserIds: authorityIds }),
    gate: () => ({ decisionId: "D9", state: "proposta", source: "registro_canonico" }),
    now: () => new Date("2026-10-06T15:00:00.000Z"),
    test: () => true,
    ...extra,
  };
}

describe("R8 · consulta de governança", () => {
  test("qualquer administrador autenticado consulta; sem sessão não lê", async () => {
    expect(await loadGovernanceForSession({ accessToken: undefined }, deps([]))).toMatchObject({ ok: false, category: "unauthenticated" });
    const r = await loadGovernanceForSession({ accessToken: "token-rh-admin" }, deps([]));
    if (!r.ok) throw new Error("consulta falhou");
    expect(r.entries).toHaveLength(16);
    expect(r.counts).toMatchObject({ proposta: 16, aprovado_para_piloto: 0, validado_para_uso_definido: 0 });
    expect(r.efficacyGate).toMatchObject({ decisionId: "D9", state: "proposta", conclusiveAllowed: false });
  });

  test("sem autoridade configurada a aprovação fica indisponível, com motivo explícito", async () => {
    const r = await loadGovernanceForSession({ accessToken: "token-rh-admin" }, deps([]));
    if (!r.ok) throw new Error("consulta falhou");
    expect(r.authority).toMatchObject({ configured: false, canApprove: false });
    expect(r.authority.reason).toContain("Nenhuma autoridade metodológica");
    const prep = await prepareGovernanceDecisionForSession({ accessToken: "token-rh-admin", entryId: "D9", toState: "em_revisao", owner: "A", reviewer: "B" }, deps([]));
    expect(prep).toMatchObject({ ok: true, accepted: false, reason: "authority_unavailable" });
  });

  test("RH_ADMIN de organização não aprova mesmo com autoridade configurada para outra pessoa", async () => {
    const r = await loadGovernanceForSession({ accessToken: "token-rh-admin" }, deps(["user-autoridade-sintetica"]));
    if (!r.ok) throw new Error("consulta falhou");
    expect(r.authority).toMatchObject({ configured: true, canApprove: false });
    const prep = await prepareGovernanceDecisionForSession({ accessToken: "token-rh-admin", entryId: "D9", toState: "em_revisao", owner: "A", reviewer: "B" }, deps(["user-autoridade-sintetica"]));
    expect(prep).toMatchObject({ accepted: false, reason: "authority_unavailable" });
  });

  test("autoridade fictícia prepara revisão → piloto; o registro resultante NÃO é gravado e vem marcado como teste", async () => {
    const d = deps(["user-autoridade-sintetica"]);
    const review = await prepareGovernanceDecisionForSession({ accessToken: "token-autoridade", entryId: "D9", toState: "em_revisao", owner: "Papel responsável sintético", reviewer: "Papel revisor sintético" }, d);
    expect(review).toMatchObject({ ok: true, accepted: true });
    if (!review.ok || !review.accepted) throw new Error("revisão não preparada");
    expect(review.entry).toMatchObject({ id: "D9", state: "em_revisao", version: "0.2.0" });
    expect(review.note).toContain("Nada foi gravado");
    // o registro canônico segue intacto
    const after = await loadGovernanceForSession({ accessToken: "token-autoridade" }, d);
    if (!after.ok) throw new Error("consulta falhou");
    expect(after.counts.em_revisao).toBe(0);
    // pular revisão é inválido; critérios incompletos também
    const skip = await prepareGovernanceDecisionForSession({ accessToken: "token-autoridade", entryId: "D9", toState: "aprovado_para_piloto", owner: "A", reviewer: "B", evidence: ["ata"], criteriaMet: [] }, d);
    expect(skip).toMatchObject({ accepted: false, reason: "decision_invalid" });
    expect(await prepareGovernanceDecisionForSession({ accessToken: "token-autoridade", entryId: "D99", toState: "em_revisao" }, d)).toMatchObject({ accepted: false, reason: "entry_not_found" });
  });

  test("schema estrito recusa orgId e estados desconhecidos", () => {
    const ok = { accessToken: "token-de-teste-123", entryId: "D9", toState: "em_revisao" };
    expect(ivoGovernanceSchemas.prepare.safeParse(ok).success).toBe(true);
    expect(ivoGovernanceSchemas.prepare.safeParse({ ...ok, orgId: "x" }).success).toBe(false);
    expect(ivoGovernanceSchemas.prepare.safeParse({ ...ok, toState: "aprovada" }).success).toBe(false);
    expect(ivoGovernanceSchemas.prepare.safeParse({ ...ok, entryId: "../etc" }).success).toBe(false);
  });
});

describe("R7 · catálogo curatorial fator → conteúdo", () => {
  test("nenhum conteúdo aprovado; conteúdo de teste identificado e sem afirmação científica", () => {
    const all = getFactorContentCatalog();
    expect(all.filter((c) => c.status === "APROVADO")).toHaveLength(0);
    for (const c of all) {
      expect(c.status).toBe("TESTE");
      expect(c.title.startsWith("[TESTE]")).toBe(true);
      expect(c.evidenceCodes).toEqual([]);
      expect(c.safeClaimIds).toEqual([]);
    }
  });

  test("fail-closed: fator inexistente, formato desconhecido, aprovado sem evidência, teste com evidência", () => {
    const clone = () => JSON.parse(JSON.stringify(rawContent)) as Parameters<typeof validateFactorContent>[0];
    const badFactor = clone();
    badFactor.entries[0]!.factor_id = "fator_inexistente";
    expect(() => validateFactorContent(badFactor)).toThrow(/não existe no manifesto/);
    const badFormat = clone();
    badFormat.entries[0]!.format = "video_viral";
    expect(() => validateFactorContent(badFormat)).toThrow(/padrão de aprendizagem/);
    const approvedNoEvidence = clone();
    Object.assign(approvedNoEvidence.entries[0]!, { status: "APROVADO", owner: "Papel", approved_at: "2026-10-05" });
    expect(() => validateFactorContent(approvedNoEvidence)).toThrow(/evidência e safe_claim/);
    const testWithEvidence = clone();
    testWithEvidence.entries[0]!.evidence_codes = ["JOB-035"];
    expect(() => validateFactorContent(testWithEvidence)).toThrow(/não cita evidência/);
    const approvedUnknownCode = clone();
    Object.assign(approvedUnknownCode.entries[0]!, { status: "APROVADO", owner: "Papel", approved_at: "2026-10-05", evidence_codes: ["XYZ-999"], safe_claim_ids: ["CA-X"], title: "Qualquer" });
    expect(() => validateFactorContent(approvedUnknownCode)).toThrow(/não existe no registro de evidências/);
  });

  test("conteúdo de teste só aparece com a visibilidade de teste; curadoria pendente é declarada", async () => {
    const base: Parameters<typeof loadEducationForSession>[1] = {
      boundary: () => ({ hmlDeclared: false, attested: false, code: "HML_NOT_ENABLED" }),
      identity: () => ({ requestedMode: "cloud", state: "cloud", realAuthentication: true, serverEnforced: true, reason: "cloud_ready" }),
      moduleAccess: async () => ({ ok: true }),
      requireAdmin: async (t) => SESSIONS[t] ?? { ok: false, reason: "invalid_session" },
      capability: () => ({ enabled: true, source: "local_fixture" }),
    };
    const hidden = await loadEducationForSession({ accessToken: "token-rh-admin" }, { ...base, testContent: false });
    if (!hidden.ok) throw new Error("falhou");
    expect(hidden.byFactor).toEqual({});
    expect(hidden.catalog).toMatchObject({ curationStatus: "pendente", curationDecision: "D10", approvedCount: 0, testVisible: false });
    const shown = await loadEducationForSession({ accessToken: "token-rh-admin" }, { ...base, testContent: true });
    if (!shown.ok) throw new Error("falhou");
    expect(shown.byFactor.bem_estar?.[0]).toMatchObject({ contentId: "TESTE-bem_estar-001", status: "TESTE" });
    expect(await loadEducationForSession({ accessToken: undefined }, base)).toMatchObject({ ok: false, category: "unauthenticated" });
  });

  test("referência estruturada ida e volta no texto da aprendizagem", () => {
    const c = getFactorContentById("TESTE-bem_estar-001")!;
    const ref = encodeContentRef(c, "Aprendemos uma pauta curta");
    expect(parseContentRef(ref)).toEqual({ contentId: "TESTE-bem_estar-001", version: "0.0.1-teste", text: "Aprendemos uma pauta curta" });
    expect(parseContentRef("texto sem vínculo")).toBeNull();
  });
});

describe("R7 · aprendizagem vinculada a conteúdo no ledger", () => {
  function ledger(sourceFactorId: string | null) {
    const recorded: Array<{ contentRef: string; evidenceKind: string }> = [];
    const store = {
      findItem: async () => ({ id: "item-1", orgId: "org-alfa", planId: "p", sourceLensId: "fibt", sourceFactorId, status: "em_execucao" as const, planStatus: "active" }),
      recordEvidence: async (input: { contentRef: string; evidenceKind: string }) => {
        recorded.push(input);
        return { accepted: true, reason: null, evidenceId: "ev-1" };
      },
    } as unknown as FibtActionLedgerStore;
    return { store, recorded };
  }
  const base = (store: FibtActionLedgerStore, testContent: boolean) => ({
    boundary: () => ({ hmlDeclared: false as const, attested: false as const, code: "HML_NOT_ENABLED" as const }),
    identity: () => ({ requestedMode: "cloud" as const, state: "cloud" as const, realAuthentication: true, serverEnforced: true, reason: "cloud_ready" as const }),
    moduleAccess: async () => ({ ok: true as const }),
    requireAdmin: async (t: string) => SESSIONS[t] ?? ({ ok: false, reason: "invalid_session" } as const),
    capability: () => ({ enabled: true as const, source: "local_fixture" as const }),
    now: () => new Date("2026-10-06T15:00:00.000Z"),
    ledger: store,
    testContent,
  });
  const input = { accessToken: "token-rh-admin", itemId: "item-1", scope: "aprendizagem" as const, content: "Pauta curta ajudou", occurredOn: "2026-10-05", contentId: "TESTE-bem_estar-001" };

  test("vínculo grava referência estruturada; o texto do ledger continua sendo o único armazenamento", async () => {
    const { store, recorded } = ledger("bem_estar");
    expect(await recordFibtActionEvidence(input, base(store, true))).toMatchObject({ accepted: true });
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ evidenceKind: "aprendizagem", contentRef: "[conteudo:TESTE-bem_estar-001@0.0.1-teste] Pauta curta ajudou" });
  });

  test("recusa conteúdo de outro fator, conteúdo de teste fora do runtime de teste e vínculo em execução", async () => {
    const other = ledger("satisfacao_empresa");
    expect(await recordFibtActionEvidence(input, base(other.store, true))).toMatchObject({ accepted: false, reason: "content_not_available" });
    const hiddenTest = ledger("bem_estar");
    expect(await recordFibtActionEvidence(input, base(hiddenTest.store, false))).toMatchObject({ accepted: false, reason: "content_not_available" });
    const exec = ledger("bem_estar");
    expect(await recordFibtActionEvidence({ ...input, scope: "execucao" }, base(exec.store, true))).toMatchObject({ accepted: false, reason: "content_link_only_for_learning" });
    expect(other.recorded.length + hiddenTest.recorded.length + exec.recorded.length).toBe(0);
  });
  test("recusa versão antiga e referência educativa forjada sem gravar", async () => {
    for (const altered of [
      { ...input, contentVersion: "antiga" },
      { ...input, contentId: undefined, contentVersion: "0.0.1-teste" },
      { ...input, contentId: undefined, content: "[conteudo:FALSO@1] Texto forjado" },
    ]) {
      const s = ledger("bem_estar");
      expect(await recordFibtActionEvidence(altered, base(s.store, true))).toMatchObject({ accepted: false, reason: "content_not_available" });
      expect(s.recorded).toHaveLength(0);
    }
  });
});
