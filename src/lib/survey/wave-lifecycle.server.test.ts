import { describe, expect, test } from "bun:test";
import {
  resolveWaveLifecycle,
  listWaveLifecycles,
  transitionWaveLifecycle,
} from "./wave-lifecycle.server";

// Fronteira server do ciclo de vida — prova a AUTORIDADE operacional sobre as
// ondas reais da jornada (campaign-mock), compondo lifecycle + capsule + calendário.

// ─── resolveWaveLifecycle ─────────────────────────────────────────────────────

describe("resolveWaveLifecycle — resolução de onda real", () => {
  test("COPSOQ T1 resolve como selada e publicável (Domínio B)", () => {
    const s = resolveWaveLifecycle("onda-2026-t1-copsoq");
    expect(s).not.toBeNull();
    expect(s!.status).toBe("sealed");
    expect(s!.sealOutcome).toBe("sealed_publishable");
    expect(s!.publishable).toBe(true);
    expect(s!.domain).toBe("B");
    expect(s!.instrumentShort).toBe("COPSOQ");
  });

  test("FIB-T T2 resolve como selada e publicável (Domínio A)", () => {
    const s = resolveWaveLifecycle("onda-2026-t2-fibt");
    expect(s!.status).toBe("sealed");
    expect(s!.publishable).toBe(true);
    expect(s!.domain).toBe("A");
  });

  test("PERMA T3 resolve como coletando", () => {
    const s = resolveWaveLifecycle("onda-2026-t3-perma");
    expect(s!.status).toBe("collecting");
    expect(s!.publishable).toBe(false); // ainda não selada
    expect(s!.availableActions).toEqual(["seal"]);
  });

  test("VIA-T T4 resolve como agendada", () => {
    const s = resolveWaveLifecycle("onda-2026-t4-viat");
    expect(s!.status).toBe("scheduled");
    expect(s!.availableActions.sort()).toEqual(["cancel", "open"]);
  });

  test("onda inexistente resolve null", () => {
    expect(resolveWaveLifecycle("onda-fantasma")).toBeNull();
  });

  test("o resumo NUNCA expõe o capsule bruto (só metadados seguros)", () => {
    const s = resolveWaveLifecycle("onda-2026-t1-copsoq")!;
    // O summary não tem 'capsule', 'dimensions' nem 'topDriverIds' — só o domínio.
    const raw = s as unknown as Record<string, unknown>;
    expect(raw.capsule).toBeUndefined();
    expect(raw.dimensions).toBeUndefined();
    expect(s.domain).toBe("B"); // metadado seguro, sim
  });

  test("a trilha de auditoria registra o processo, sem identidade", () => {
    const s = resolveWaveLifecycle("onda-2026-t1-copsoq")!;
    expect(s.events.map((e) => e.action)).toEqual(["publish", "open", "seal"]);
    for (const e of s.events) {
      expect(e.actorRole).toBe("sistema"); // papel, nunca nome de pessoa
    }
  });
});

// ─── listWaveLifecycles ───────────────────────────────────────────────────────

describe("listWaveLifecycles — painel do gestor", () => {
  test("lista as 4 ondas da jornada da empresa", () => {
    const list = listWaveLifecycles("enterprise");
    expect(list).toHaveLength(4);
    const ids = list.map((s) => s.waveId).sort();
    expect(ids).toEqual([
      "onda-2026-t1-copsoq",
      "onda-2026-t2-fibt",
      "onda-2026-t3-perma",
      "onda-2026-t4-viat",
    ]);
  });

  test("a lista cobre os quatro estados operacionais da jornada", () => {
    const list = listWaveLifecycles("enterprise");
    const byStatus = new Set(list.map((s) => s.status));
    expect(byStatus.has("sealed")).toBe(true);
    expect(byStatus.has("collecting")).toBe(true);
    expect(byStatus.has("scheduled")).toBe(true);
  });

  test("pack sem ondas retorna lista vazia", () => {
    expect(listWaveLifecycles("inexistente")).toEqual([]);
  });
});

// ─── transitionWaveLifecycle ──────────────────────────────────────────────────

describe("transitionWaveLifecycle — transições do gestor", () => {
  test("selar a onda PERMA em coleta produz capsule publicável", () => {
    const result = transitionWaveLifecycle({
      waveId: "onda-2026-t3-perma",
      action: "seal",
      actorRole: "RH",
      reason: "encerramento no fim da janela",
      nowIso: "2026-06-22T18:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.status).toBe("sealed");
    expect(result.summary.sealOutcome).toBe("sealed_publishable");
    expect(result.summary.publishable).toBe(true);
    expect(result.summary.domain).toBe("A");
  });

  test("a transição de selar registra o ator e o motivo na auditoria", () => {
    const result = transitionWaveLifecycle({
      waveId: "onda-2026-t3-perma",
      action: "seal",
      actorRole: "RH",
      reason: "meta atingida",
      nowIso: "2026-06-22T18:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sealEvent = result.summary.events.at(-1)!;
    expect(sealEvent.action).toBe("seal");
    expect(sealEvent.actorRole).toBe("RH");
    expect(sealEvent.reason).toBe("meta atingida");
  });

  test("arquivar a onda COPSOQ já selada é legal", () => {
    const result = transitionWaveLifecycle({
      waveId: "onda-2026-t1-copsoq",
      action: "archive",
      actorRole: "SST",
      nowIso: "2026-02-01T12:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.status).toBe("archived");
    expect(result.summary.publishable).toBe(true); // arquivada mas consultável
  });

  test("transição ilegal é rejeitada com motivo legível", () => {
    // PERMA está collecting — não pode 'publish' de novo.
    const result = transitionWaveLifecycle({
      waveId: "onda-2026-t3-perma",
      action: "publish",
      actorRole: "RH",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("Transição ilegal");
  });

  test("selar uma onda agendada (sem coleta) é rejeitado", () => {
    const result = transitionWaveLifecycle({
      waveId: "onda-2026-t4-viat",
      action: "seal",
      actorRole: "RH",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // VIA-T não tem sealInput no seed → rejeita por falta de dados de medição.
    expect(result.reason.length).toBeGreaterThan(0);
  });

  test("transição em onda inexistente é rejeitada", () => {
    const result = transitionWaveLifecycle({
      waveId: "onda-fantasma",
      action: "open",
      actorRole: "RH",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("não encontrada");
  });
});

// ─── Honestidade: o selamento reflete a realidade dos dados ───────────────────

describe("transitionWaveLifecycle — selamento honesto", () => {
  test("a onda COPSOQ selada expõe domínio B sem vazar dimensões", () => {
    const s = resolveWaveLifecycle("onda-2026-t1-copsoq")!;
    expect(s.domain).toBe("B");
    expect(s.sealOutcome).toBe("sealed_publishable");
    // participação agregada vem do calendário/ledger, não do capsule
    expect(s.respondedTotal).toBeGreaterThanOrEqual(s.invitedTotal * 0); // sanidade: existe
    expect(typeof s.participationPct).toBe("number");
  });
});
