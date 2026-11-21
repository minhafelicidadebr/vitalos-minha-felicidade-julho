import { describe, expect, test } from "bun:test";
import {
  applyPreparation,
  controlCatalog,
  cycleSchema,
  noticeVersion,
  prepCommandSchema,
  preparationNextStep,
  prepSaveSchema,
  type PrepCommand,
  type PrepState,
} from "./q1-preparation";
const id = "00000000-0000-4000-8000-000000000001";
const declared: PrepCommand = {
  kind: "declare",
  choice: { kind: "catalog", key: "breaks" },
  scope: "Expedição, noite",
};
const verification: PrepCommand = {
  kind: "verify",
  controlId: id,
  source: "dialogue",
  evidence: "Conversa coletiva do turno",
  finding: { coverage: "partial", gap: "A escala deixa o início da noite descoberto." },
};
const plan: PrepCommand = {
  kind: "plan",
  controlId: id,
  action: "Ajustar a escala de cobertura",
  owner: "Supervisão de turno",
  due: "2027-03-01",
  indicator: "Conferência coletiva semanal da escala",
};
const apply = (s: PrepState, command: PrepCommand, eventId = id) =>
  applyPreparation(s, { id: eventId, command });
function ok(s: ReturnType<typeof apply>): PrepState {
  if ("ok" in s) throw new Error(s.reason);
  return s;
}
describe("preparação Q1", () => {
  test("o próximo passo acompanha a pendência do ciclo até a memória", () => {
    let state: PrepState = { controls: [] };
    expect(preparationNextStep(state).target).toBe("q1-notice");
    state = ok(
      apply(state, {
        kind: "notice",
        template: noticeVersion,
        contact: "RH",
        returnChannel: "Mural coletivo",
      }),
    );
    expect(preparationNextStep(state).target).toBe("q1-controls");
    state = ok(apply(state, declared));
    expect(preparationNextStep(state).label).toContain("Conferir");
    state = ok(apply(state, verification));
    expect(preparationNextStep(state).label).toContain("Planejar");
    state = ok(apply(state, plan));
    expect(preparationNextStep(state).label).toContain("Acompanhar");
    state = ok(
      apply(state, {
        kind: "review",
        controlId: id,
        evidence: "Conferência coletiva da escala",
        result: { outcome: "observed" },
      }),
    );
    expect(preparationNextStep(state).target).toBe("q1-memory");
  });
  test("25 controles em seis famílias têm chaves distintas", () => {
    const keys = controlCatalog.flatMap((g) => g.items.map(([key]) => key));
    expect(new Set(keys).size).toBe(25);
    expect(controlCatalog.length).toBe(6);
  });
  test("aceita apenas ciclo canônico e datas possíveis", () => {
    for (const v of ["2027-t1", "T1-2027", "1999-T1", "2027-T5", ""])
      expect(cycleSchema.safeParse(v).success).toBe(false);
    expect(cycleSchema.safeParse("2027-T1").success).toBe(true);
    expect(prepCommandSchema.safeParse({ ...plan, due: "2027-02-30" }).success).toBe(false);
  });
  test("rejeita campos de resultado, identidade e escopo injetados no contrato", () => {
    for (const v of [
      { ...declared, score: 0 },
      { ...declared, choice: { kind: "catalog", key: "inexistente" } },
      { kind: "notice", template: "outro", contact: "RH", returnChannel: "Mural" },
    ])
      expect(prepCommandSchema.safeParse(v).success).toBe(false);
    const request = {
      cycle: "2027-T1",
      expectedScope: id,
      base: 0,
      requestId: id,
      command: declared,
    };
    expect(prepSaveSchema.safeParse(request).success).toBe(true);
    expect(prepSaveSchema.safeParse({ ...request, orgId: id }).success).toBe(false);
    expect(
      prepCommandSchema.safeParse({ ...verification, finding: { coverage: "partial" } }).success,
    ).toBe(false);
  });
  test("deduplica controle no mesmo recorte e permite o mesmo controle em outro turno e controles próprios", () => {
    const s = ok(apply({ controls: [] }, declared));
    expect(apply(s, { ...declared, scope: "  EXPEDIÇÃO, NOITE " })).toEqual({
      ok: false,
      reason: "duplicate",
    });
    expect(
      ok(apply(s, { ...declared, scope: "Turno da manhã" }, crypto.randomUUID())).controls,
    ).toHaveLength(2);
    expect(
      ok(
        apply(
          s,
          {
            kind: "declare",
            choice: { kind: "custom", label: "Revezamento de plantão" },
            scope: "Oficina",
          },
          crypto.randomUUID(),
        ),
      ).controls[1].label,
    ).toBe("Revezamento de plantão");
  });
  test("só uma lacuna conferida admite medida e execução não gera eficácia", () => {
    const s = ok(apply({ controls: [] }, declared));
    expect(apply(s, plan)).toEqual({ ok: false, reason: "invalid" });
    const covered = ok(apply(s, { ...verification, finding: { coverage: "covered" } }));
    expect(apply(covered, plan)).toEqual({ ok: false, reason: "invalid" });
    const verified = ok(apply(covered, verification));
    const planned = ok(apply(verified, plan));
    expect(apply(planned, plan)).toEqual({ ok: false, reason: "invalid" });
    expect(apply(planned, verification)).toEqual({ ok: false, reason: "invalid" });
    const review = {
      kind: "review",
      controlId: id,
      evidence: "Escala conferida com a equipe",
      result: { outcome: "observed" },
    } as const;
    expect(apply(s, review)).toEqual({ ok: false, reason: "invalid" });
    const revisit = ok(
      apply(planned, { ...review, result: { outcome: "revisit", nextDate: "2027-03-05" } }),
    );
    const end = ok(apply(revisit, review));
    expect(end.controls[0].reviews?.map((r) => r.result.outcome)).toEqual(["revisit", "observed"]);
    const reopened = ok(
      apply(end, { ...review, result: { outcome: "revisit", nextDate: "2027-03-19" } }),
    );
    expect(reopened.controls[0].reviews).toHaveLength(3);
    expect(apply(end, review)).toEqual({ ok: false, reason: "invalid" });
    expect(s.controls[0].verification).toBeUndefined();
    expect(end).not.toHaveProperty("score");
    expect(end).not.toHaveProperty("efficacy");
    expect(apply(s, { ...verification, controlId: crypto.randomUUID() })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
  test("o comunicado pode ser revisado antes de qualquer controle", () => {
    const cmd = {
      kind: "notice",
      template: noticeVersion,
      contact: "Plantão do RH",
      returnChannel: "Mural",
    } as const;
    expect(ok(apply({ controls: [] }, cmd)).notice).toEqual(cmd);
  });
});
