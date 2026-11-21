import { describe, expect, test } from "bun:test";
import { effectiveLevel, operationalCta, resolveGuideEntry, statusLabel, type GuideServerContext, type GuideTask } from "./guide-entry";

const q2Task = (id: string, extra: Partial<GuideTask> = {}): GuideTask => ({
  lens: "Q2", id, title: `Ação ${id}`, status: "planejada", dueOn: "2026-12-15", capability: "q2.execucao_lideranca", recipient: "RH", ...extra,
});
const ctx = (over: Partial<GuideServerContext> = {}): GuideServerContext => ({
  perspective: "lideranca", roleLabel: "Liderança", availableLenses: ["Q2"], activeStage: "Q2", tasks: [], grantedCapabilities: [], environment: "local", ...over,
});

describe("Guia · resolvedor de 'Meu percurso' (V2.1 §3)", () => {
  test("AC-04: Q2 e Q4 habilitados (Q4 só como fixture) + uma ação pendente da liderança no Q2 → tarefa do Q2", () => {
    const entry = resolveGuideEntry(ctx({ availableLenses: ["Q2", "Q4"], activeStage: "Q4", tasks: [q2Task("a1")] }));
    expect(entry).toEqual({ kind: "task", task: q2Task("a1") });
  });

  test("AC-05: sem tarefa e com ciclo ativo disponível → etapa", () => {
    expect(resolveGuideEntry(ctx({ tasks: [] }))).toEqual({ kind: "stage", lens: "Q2" });
  });

  test("AC-05: duas ações sem prioridade → mapa com as duas opções", () => {
    const entry = resolveGuideEntry(ctx({ tasks: [q2Task("a1"), q2Task("a2", { status: "em_execucao" })] }));
    expect(entry.kind).toBe("map");
    if (entry.kind === "map") {
      expect(entry.reason).toBe("several_tasks");
      expect(entry.options.filter((o) => o.kind === "task").map((o) => o.taskId)).toEqual(["a1", "a2"]);
    }
  });

  test("prioridade reconhecida desempata; ação concluída não é tarefa", () => {
    expect(resolveGuideEntry(ctx({ tasks: [q2Task("a1"), q2Task("a2", { prioritized: true })] }))).toMatchObject({ kind: "task", task: { id: "a2" } });
    expect(resolveGuideEntry(ctx({ tasks: [q2Task("a1", { status: "concluida" })] }))).toEqual({ kind: "stage", lens: "Q2" });
  });

  test("AC-05: contexto ausente → mapa; etapa ativa indisponível ao perfil → mapa", () => {
    expect(resolveGuideEntry(null)).toEqual({ kind: "map", reason: "no_context", options: [] });
    expect(resolveGuideEntry(ctx({ activeStage: "Q1", availableLenses: ["Q2"] }))).toMatchObject({ kind: "map", reason: "no_stage" });
  });
});

describe("Guia · regra de CTA operacional (AC-06)", () => {
  test("nível efetivo: 'ambiente' só no ambiente verificado", () => {
    expect(effectiveLevel("q2.execucao_lideranca", "local")).toBe("ambiente");
    expect(effectiveLevel("q2.execucao_lideranca", "production")).toBe("local");
    expect(statusLabel(effectiveLevel("q2.leitura_plano", "production"))).toBe("Em preparação");
    expect(statusLabel(effectiveLevel("q1.coleta", "local"))).toBe("Em preparação");
  });

  test("CTA exige ambiente verificado E capacidade concedida pelo servidor", () => {
    const granted = ctx({ grantedCapabilities: ["q2.execucao_lideranca"] });
    expect(operationalCta("q2.execucao_lideranca", granted)).toEqual({ label: "Registrar o que aconteceu", href: "/ivo-integral/acoes" });
    expect(operationalCta("q2.execucao_lideranca", ctx())).toBeNull();
    expect(operationalCta("q2.execucao_lideranca", { ...granted, environment: "production" })).toBeNull();
    expect(operationalCta("q2.execucao_lideranca", null)).toBeNull();
  });

  test("capacidade sem rota (Q3, Q4, Q5, coleta Q1) nunca vira CTA", () => {
    for (const id of ["q3.vitalidade_001", "q4.percurso_individual", "q5.relatorio", "q1.coleta"])
      expect(operationalCta(id, ctx({ grantedCapabilities: [id] }))).toBeNull();
  });

  test("devolutiva coletiva aponta para /ivo-integral/q2, nunca /devolutiva", () => {
    expect(operationalCta("q2.devolutiva_coletiva", ctx({ grantedCapabilities: ["q2.devolutiva_coletiva"] }))?.href).toBe("/ivo-integral/q2");
  });
});
