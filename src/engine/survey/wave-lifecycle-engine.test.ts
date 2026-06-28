import { describe, expect, test } from "bun:test";
import {
  createWaveRecord,
  canTransition,
  availableActions,
  applyTransition,
  resolveEffectiveStatus,
  sealWave,
  isPublishable,
  type WaveLifecycleRecord,
  type SealInput,
  type TransitionContext,
} from "./wave-lifecycle-engine";
import type { CapsuleDimensionInput } from "../ai/measurement-capsule-engine";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const CTX: TransitionContext = { actorRole: "RH", at: "2026-01-22T10:00:00.000Z" };

const DIMS: CapsuleDimensionInput[] = [
  { dimensionId: "demands_quant", label: "Demandas quantitativas", loadScore: 72, n: 403, visible: true, riskLevel: "alto", isOutcome: false },
  { dimensionId: "work_pace",     label: "Ritmo de trabalho",      loadScore: 68, n: 403, visible: true, riskLevel: "alto", isOutcome: false },
];

function sealInput(participantCount: number, kAnonymityMin = 5): SealInput {
  return {
    capsule: {
      capsuleId: "cap-seal-test",
      packId: "enterprise",
      waveId: "onda-copsoq",
      cohortId: "cohort-1",
      closedOn: "2026-01-22",
      instrument: "COPSOQ II · NR-1",
      instrumentShort: "COPSOQ",
      domain: "B",
      participantCount,
      kAnonymityMin,
      dimensions: DIMS,
    },
  };
}

/** Avança um record por uma sequência de transições não-selantes (helper). */
function advance(record: WaveLifecycleRecord, actions: Array<"publish" | "open" | "archive" | "cancel">) {
  let r = record;
  for (const a of actions) {
    const result = applyTransition(r, a, CTX);
    if (!result.ok) throw new Error(`setup falhou em ${a}: ${result.rejection.message}`);
    r = result.record;
  }
  return r;
}

// ─── createWaveRecord ──────────────────────────────────────────────────────────

describe("createWaveRecord", () => {
  test("começa em draft, sem eventos, sem capsule", () => {
    const r = createWaveRecord("onda-1");
    expect(r.status).toBe("draft");
    expect(r.events).toHaveLength(0);
    expect(r.capsule).toBeNull();
    expect(r.sealOutcome).toBeNull();
  });
});

// ─── Matriz de transições ──────────────────────────────────────────────────────

describe("canTransition — matriz de transições legais", () => {
  test("draft permite publish e cancel", () => {
    expect(canTransition("draft", "publish")).toBe(true);
    expect(canTransition("draft", "cancel")).toBe(true);
    expect(canTransition("draft", "open")).toBe(false);
    expect(canTransition("draft", "seal")).toBe(false);
  });

  test("scheduled permite open e cancel", () => {
    expect(canTransition("scheduled", "open")).toBe(true);
    expect(canTransition("scheduled", "cancel")).toBe(true);
    expect(canTransition("scheduled", "seal")).toBe(false);
  });

  test("collecting permite apenas seal", () => {
    expect(canTransition("collecting", "seal")).toBe(true);
    expect(canTransition("collecting", "cancel")).toBe(false);
    expect(canTransition("collecting", "open")).toBe(false);
  });

  test("sealed permite apenas archive", () => {
    expect(canTransition("sealed", "archive")).toBe(true);
    expect(canTransition("sealed", "seal")).toBe(false);
  });

  test("archived e cancelled são terminais (nenhuma ação)", () => {
    expect(availableActions("archived")).toHaveLength(0);
    expect(availableActions("cancelled")).toHaveLength(0);
  });
});

describe("availableActions", () => {
  test("draft expõe publish e cancel", () => {
    expect(availableActions("draft").sort()).toEqual(["cancel", "publish"]);
  });
  test("collecting expõe apenas seal", () => {
    expect(availableActions("collecting")).toEqual(["seal"]);
  });
});

// ─── applyTransition — fluxo feliz e imutabilidade ────────────────────────────

describe("applyTransition — ciclo de vida", () => {
  test("draft → publish → scheduled, registrando evento", () => {
    const r0 = createWaveRecord("onda-1");
    const result = applyTransition(r0, "publish", CTX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.status).toBe("scheduled");
    expect(result.record.events).toHaveLength(1);
    expect(result.record.events[0]).toMatchObject({
      action: "publish",
      fromStatus: "draft",
      toStatus: "scheduled",
      actorRole: "RH",
    });
  });

  test("não muta o record original (imutabilidade)", () => {
    const r0 = createWaveRecord("onda-1");
    applyTransition(r0, "publish", CTX);
    expect(r0.status).toBe("draft");
    expect(r0.events).toHaveLength(0);
  });

  test("sequência completa draft → scheduled → collecting acumula eventos", () => {
    const r = advance(createWaveRecord("onda-1"), ["publish", "open"]);
    expect(r.status).toBe("collecting");
    expect(r.events.map((e) => e.action)).toEqual(["publish", "open"]);
  });

  test("transição ilegal é rejeitada com mensagem explicativa", () => {
    const r0 = createWaveRecord("onda-1");
    const result = applyTransition(r0, "open", CTX); // draft não abre direto
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejection.reason).toBe("illegal_transition");
    expect(result.rejection.message).toContain("publish");
  });

  test("preserva reason no evento quando fornecido", () => {
    const r0 = createWaveRecord("onda-1");
    const result = applyTransition(r0, "cancel", { ...CTX, reason: "instrumento trocado" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.events[0]!.reason).toBe("instrumento trocado");
  });

  test("cancel a partir de scheduled vai para cancelled", () => {
    const r = advance(createWaveRecord("onda-1"), ["publish", "cancel"]);
    expect(r.status).toBe("cancelled");
  });
});

// ─── resolveEffectiveStatus — operacional × calendário ────────────────────────

describe("resolveEffectiveStatus — reconciliação com o calendário", () => {
  test("scheduled + calendário aberta → shouldOpen", () => {
    const eff = resolveEffectiveStatus({ status: "scheduled" }, "aberta");
    expect(eff.shouldOpen).toBe(true);
    expect(eff.awaitingSeal).toBe(false);
  });

  test("scheduled + calendário agendada → não deve abrir ainda", () => {
    const eff = resolveEffectiveStatus({ status: "scheduled" }, "agendada");
    expect(eff.shouldOpen).toBe(false);
  });

  test("collecting + calendário fechada → awaitingSeal (janela expirou)", () => {
    const eff = resolveEffectiveStatus({ status: "collecting" }, "fechada");
    expect(eff.awaitingSeal).toBe(true);
  });

  test("collecting + calendário aberta → coletando normalmente", () => {
    const eff = resolveEffectiveStatus({ status: "collecting" }, "aberta");
    expect(eff.awaitingSeal).toBe(false);
  });

  test("sealed vence o calendário (não reabre porque a data não fechou)", () => {
    const eff = resolveEffectiveStatus({ status: "sealed" }, "aberta");
    expect(eff.status).toBe("sealed");
    expect(eff.shouldOpen).toBe(false);
    expect(eff.awaitingSeal).toBe(false);
  });

  test("cancelled e archived vencem o calendário", () => {
    expect(resolveEffectiveStatus({ status: "cancelled" }, "aberta").status).toBe("cancelled");
    expect(resolveEffectiveStatus({ status: "archived" }, "encerrando").status).toBe("archived");
  });
});

// ─── sealWave — o selamento honesto ───────────────────────────────────────────

describe("sealWave — selamento com k-anon honesto", () => {
  function collectingRecord() {
    return advance(createWaveRecord("onda-1"), ["publish", "open"]);
  }

  test("n ≥ kMin → sealed_publishable, capsule produzido", () => {
    const r = collectingRecord();
    const result = sealWave(r, sealInput(403), CTX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe("sealed_publishable");
    expect(result.record.status).toBe("sealed");
    expect(result.record.capsule).not.toBeNull();
    expect(result.record.capsule!.instrumentShort).toBe("COPSOQ");
    expect(result.record.sealOutcome).toBe("sealed_publishable");
  });

  test("0 < n < kMin → insufficient_k_anon, capsule null (encerra mas não publica)", () => {
    const r = collectingRecord();
    const result = sealWave(r, sealInput(3), CTX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe("insufficient_k_anon");
    expect(result.record.status).toBe("sealed"); // encerrou de qualquer forma
    expect(result.record.capsule).toBeNull(); // mas sem leitura divulgável
  });

  test("n = 0 → no_responses, capsule null", () => {
    const r = collectingRecord();
    const result = sealWave(r, sealInput(0), CTX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe("no_responses");
    expect(result.record.capsule).toBeNull();
  });

  test("selar registra o evento de auditoria", () => {
    const r = collectingRecord();
    const result = sealWave(r, sealInput(403), { ...CTX, reason: "meta atingida" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sealEvent = result.record.events.at(-1)!;
    expect(sealEvent.action).toBe("seal");
    expect(sealEvent.toStatus).toBe("sealed");
    expect(sealEvent.reason).toBe("meta atingida");
  });

  test("selar fora de collecting é rejeitado", () => {
    const draft = createWaveRecord("onda-1");
    const result = sealWave(draft, sealInput(403), CTX);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejection.message).toContain("collecting");
  });

  test("não muta o record original ao selar", () => {
    const r = collectingRecord();
    sealWave(r, sealInput(403), CTX);
    expect(r.status).toBe("collecting");
    expect(r.capsule).toBeNull();
  });
});

// ─── isPublishable ────────────────────────────────────────────────────────────

describe("isPublishable", () => {
  test("true para onda selada com capsule publicável", () => {
    const r = advance(createWaveRecord("onda-1"), ["publish", "open"]);
    const sealed = sealWave(r, sealInput(403), CTX);
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;
    expect(isPublishable(sealed.record)).toBe(true);
  });

  test("false para onda selada sem k-anon suficiente", () => {
    const r = advance(createWaveRecord("onda-1"), ["publish", "open"]);
    const sealed = sealWave(r, sealInput(3), CTX);
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;
    expect(isPublishable(sealed.record)).toBe(false);
  });

  test("false para draft, scheduled, collecting (ainda não selou)", () => {
    expect(isPublishable(createWaveRecord("onda-1"))).toBe(false);
    const collecting = advance(createWaveRecord("onda-1"), ["publish", "open"]);
    expect(isPublishable(collecting)).toBe(false);
  });

  test("false para onda cancelada", () => {
    const cancelled = advance(createWaveRecord("onda-1"), ["cancel"]);
    expect(isPublishable(cancelled)).toBe(false);
  });
});

// ─── Ciclo de vida completo: integração ───────────────────────────────────────

describe("ciclo de vida completo — draft → archived", () => {
  test("percorre o arco inteiro e mantém a trilha de auditoria", () => {
    let r = createWaveRecord("onda-completa");

    const pub = applyTransition(r, "publish", CTX);
    expect(pub.ok).toBe(true);
    r = (pub as { ok: true; record: WaveLifecycleRecord }).record;

    const open = applyTransition(r, "open", { ...CTX, at: "2026-01-08T09:00:00.000Z" });
    expect(open.ok).toBe(true);
    r = (open as { ok: true; record: WaveLifecycleRecord }).record;

    const sealed = sealWave(r, sealInput(403), { ...CTX, at: "2026-01-22T18:00:00.000Z" });
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;
    r = sealed.record;

    const archived = applyTransition(r, "archive", { ...CTX, at: "2026-02-01T12:00:00.000Z" });
    expect(archived.ok).toBe(true);
    r = (archived as { ok: true; record: WaveLifecycleRecord }).record;

    expect(r.status).toBe("archived");
    expect(r.events.map((e) => e.action)).toEqual(["publish", "open", "seal", "archive"]);
    expect(r.capsule).not.toBeNull(); // capsule persiste após arquivamento
    expect(isPublishable(r)).toBe(true); // arquivada mas ainda consultável
  });
});
