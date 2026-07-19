import { describe, expect, test } from "bun:test";
import {
  buildActionTimeline,
  canTransition,
  foldActionStatus,
  recordActionEvent,
  summarizeActionLog,
  type ActionLogEvent,
} from "./action-log-engine";

const DAY = "2026-08-10";

function statusChange(id: string, actionKey: string, toStatus: ActionLogEvent["toStatus"], occurredOn = DAY): ActionLogEvent {
  return { id, actionKey, kind: "status_change", actorRole: "RH_ADMIN", occurredOn, toStatus };
}

/** Leva uma ação até "concluida" pelo caminho válido. */
function concludedEvents(actionKey: string): ActionLogEvent[] {
  const r1 = recordActionEvent([], statusChange(`${actionKey}-1`, actionKey, "em_execucao", "2026-08-01"));
  const r2 = recordActionEvent(r1.events, statusChange(`${actionKey}-2`, actionKey, "concluida", "2026-08-20"));
  return r2.events;
}

describe("máquina de status — transições válidas, nunca opinião", () => {
  test("caminho feliz: planejada → em_execucao → concluida → em_vigilancia", () => {
    expect(canTransition("planejada", "em_execucao")).toBe(true);
    expect(canTransition("em_execucao", "concluida")).toBe(true);
    expect(canTransition("concluida", "em_vigilancia")).toBe(true);
  });

  test("conclusão direta sem execução NÃO existe (atividade não se declara, se percorre)", () => {
    expect(canTransition("planejada", "concluida")).toBe(false);
    const result = recordActionEvent([], statusChange("e1", "a1", "concluida"));
    expect(result.reason).toBe("invalid_transition");
    expect(result.events).toHaveLength(0);
  });

  test("medida em vigilância que caiu em desuso VOLTA a em_execucao — nunca some", () => {
    expect(canTransition("em_vigilancia", "em_execucao")).toBe(true);
    expect(canTransition("em_vigilancia", "concluida")).toBe(false);
  });

  test("interrompida só retoma conscientemente (→ planejada)", () => {
    expect(canTransition("interrompida", "planejada")).toBe(true);
    expect(canTransition("interrompida", "em_execucao")).toBe(false);
  });

  test("status é FOLD dos eventos: sem eventos = planejada; após transições = último válido", () => {
    expect(foldActionStatus([], "a1")).toBe("planejada");
    const events = concludedEvents("a1");
    expect(foldActionStatus(events, "a1")).toBe("concluida");
    expect(foldActionStatus(events, "outra-acao")).toBe("planejada"); // isolamento por ação
  });
});

describe("registro de eventos — ledger INSERT-only", () => {
  test("evento válido é registrado e o resultado devolve o novo status", () => {
    const result = recordActionEvent([], statusChange("e1", "a1", "em_execucao"));
    expect(result.reason).toBe("recorded");
    expect(result.status).toBe("em_execucao");
  });

  test("id repetido → duplicate (replay não reescreve história)", () => {
    const r1 = recordActionEvent([], statusChange("e1", "a1", "em_execucao"));
    const r2 = recordActionEvent(r1.events, statusChange("e1", "a1", "em_execucao"));
    expect(r2.reason).toBe("duplicate");
    expect(r2.events).toHaveLength(1);
  });

  test("evento sem id/actionKey/actorRole → invalid_request", () => {
    expect(recordActionEvent([], statusChange(" ", "a1", "em_execucao")).reason).toBe("invalid_request");
    expect(recordActionEvent([], { id: "e1", actionKey: "a1", kind: "checkin", actorRole: "", occurredOn: DAY }).reason).toBe("invalid_request");
  });

  test("maintenance_check exige o veredito booleano — atestação de fachada não entra", () => {
    const semVeredito: ActionLogEvent = { id: "m1", actionKey: "a1", kind: "maintenance_check", actorRole: "LIDER_EQUIPE", occurredOn: DAY };
    expect(recordActionEvent([], semVeredito).reason).toBe("invalid_request");
  });

  test("o fold nunca muta a lista de entrada", () => {
    const events = concludedEvents("a1");
    const before = events.length;
    recordActionEvent(events, statusChange("e9", "a1", "em_vigilancia"));
    expect(events).toHaveLength(before);
  });
});

describe("leituras derivadas — timeline, conclusão e o Vigia (I-E4)", () => {
  test("timeline vem ordenada por data, só da ação pedida", () => {
    let events = concludedEvents("a1");
    events = recordActionEvent(events, { id: "n1", actionKey: "a2", kind: "note", actorRole: "RH_ADMIN", occurredOn: "2026-08-05", note: "outra ação" }).events;
    const timeline = buildActionTimeline(events, "a1");
    expect(timeline.map((e) => e.occurredOn)).toEqual(["2026-08-01", "2026-08-20"]);
    expect(timeline.every((e) => e.actionKey === "a1")).toBe(true);
  });

  test("concluída E em vigilância contam como concluídas (vigilância é pós-conclusão)", () => {
    let events = concludedEvents("a1");
    events = recordActionEvent(events, statusChange("v1", "a1", "em_vigilancia", "2026-09-01")).events;
    const summary = summarizeActionLog(events, ["a1", "a2"]);
    expect(summary.concludedCount).toBe(1);
    expect(summary.pctConcluded).toBe(50);
  });

  test("evidências são contadas por ação — referência, nunca conteúdo", () => {
    let events = concludedEvents("a1");
    events = recordActionEvent(events, { id: "ev1", actionKey: "a1", kind: "evidence_recorded", actorRole: "LIDER_EQUIPE", occurredOn: DAY, evidenceKind: "checklist", evidenceRef: "evr-001" }).events;
    events = recordActionEvent(events, { id: "ev2", actionKey: "a1", kind: "evidence_recorded", actorRole: "LIDER_EQUIPE", occurredOn: DAY, evidenceKind: "foto", evidenceRef: "evr-002" }).events;
    const summary = summarizeActionLog(events, ["a1"]);
    expect(summary.evidenceCountByAction["a1"]).toBe(2);
  });

  test("VIGIA: o último maintenance_check vence — medida em desuso perde o crédito", () => {
    let events = concludedEvents("a1");
    events = recordActionEvent(events, { id: "m1", actionKey: "a1", kind: "maintenance_check", actorRole: "LIDER_EQUIPE", occurredOn: "2026-09-01", maintained: true }).events;
    events = recordActionEvent(events, { id: "m2", actionKey: "a1", kind: "maintenance_check", actorRole: "LIDER_EQUIPE", occurredOn: "2026-10-01", maintained: false }).events;
    const summary = summarizeActionLog(events, ["a1"]);
    expect(summary.maintenanceByAction["a1"]).toBe(false);
  });

  test("VIGIA: ação sem check NÃO aparece no mapa — manutenção não atestada nunca é presumida", () => {
    const events = concludedEvents("a1");
    const summary = summarizeActionLog(events, ["a1"]);
    expect("a1" in summary.maintenanceByAction).toBe(false);
  });

  test("plano sem ações → 0% concluído, sem divisão por zero", () => {
    const summary = summarizeActionLog([], []);
    expect(summary.pctConcluded).toBe(0);
  });
});

describe("evidence_recorded — rastro do copiloto (claim_ids como referência)", () => {
  test("evidenceClaimIds sobrevive intacto ao registro no ledger", () => {
    const result = recordActionEvent([], {
      id: "flor-1",
      actionKey: "a1",
      kind: "evidence_recorded",
      actorRole: "LIDER_EQUIPE",
      occurredOn: DAY,
      evidenceKind: "florencia_orientation",
      evidenceRef: "suggest-observation-v1",
      evidenceClaimIds: ["CLAIM-LDR007-VOICE-002"],
    });
    expect(result.reason).toBe("recorded");
    expect(result.events[0]?.evidenceClaimIds).toEqual(["CLAIM-LDR007-VOICE-002"]);
  });

  test("orientações contam como evidência da ação no summarize (mesma régua das demais)", () => {
    let events = recordActionEvent([], {
      id: "flor-2",
      actionKey: "a1",
      kind: "evidence_recorded",
      actorRole: "LIDER_EQUIPE",
      occurredOn: DAY,
      evidenceKind: "florencia_orientation",
      evidenceRef: "organize-evidence-v1",
      evidenceClaimIds: ["CLAIM-EDMONDSON1999-VOICE-003"],
      note: "requer revisão humana antes de uso real",
    }).events;
    const summary = summarizeActionLog(events, ["a1"]);
    expect(summary.evidenceCountByAction["a1"]).toBe(1);
    // A nota operacional preservada — o rastro carrega o aviso, não a aprovação.
    expect(events[0]?.note).toBe("requer revisão humana antes de uso real");
  });
});
