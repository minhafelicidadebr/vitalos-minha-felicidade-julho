import { describe, expect, test } from "bun:test";
import {
  computeWave,
  buildIndividualView,
  WAVE_K_ANON_MIN,
  type MeasurementWaveInput,
} from "./campaign-engine";

function base(over: Partial<MeasurementWaveInput> = {}): MeasurementWaveInput {
  return {
    id: "w1",
    instrumentLabel: "PERMA+V → IVO",
    instrumentShort: "PERMA+V / IVO",
    season: "Florescimento",
    opensOn: "2026-06-08",
    closesOn: "2026-06-22",
    today: "2026-06-16",
    invitedTotal: 480,
    respondedTotal: 311,
    segments: [
      { segmentId: "a", label: "A", invited: 120, responded: 92 },
      { segmentId: "b", label: "B", invited: 40, responded: 31 },
      { segmentId: "dir", label: "Diretoria", invited: 8, responded: 3 }, // < k
    ],
    ...over,
  };
}

// ─── Máquina de estados ───────────────────────────────────────────────────────

describe("campaign — estado da onda", () => {
  test("antes de abrir → agendada", () => {
    expect(computeWave(base({ today: "2026-06-01" })).state).toBe("agendada");
  });
  test("dentro da janela, longe do fim → aberta", () => {
    expect(computeWave(base({ today: "2026-06-12" })).state).toBe("aberta");
  });
  test("a ≤3 dias do fim → encerrando", () => {
    expect(computeWave(base({ today: "2026-06-20" })).state).toBe("encerrando");
  });
  test("depois de fechar → fechada, 0 dias", () => {
    const w = computeWave(base({ today: "2026-06-25" }));
    expect(w.state).toBe("fechada");
    expect(w.daysRemaining).toBe(0);
  });
});

// ─── Dupla-visão · livro-razão do líder (a trava de privacidade) ──────────────

describe("campaign — livro-razão do líder (agregado, sem identidade)", () => {
  test("recorte com n<k fica oculto ao líder, mas as respostas contam no total", () => {
    const w = computeWave(base());
    const dir = w.ledger.segments.find((s) => s.segmentId === "dir")!;
    expect(dir.visibleToLeader).toBe(false);
    expect(w.ledger.hiddenSegmentCount).toBe(1);
    // honesto: as 3 respostas da diretoria ENTRAM no total agregado
    expect(w.ledger.respondedTotal).toBe(311);
  });

  test("o tipo da visão do líder não carrega identidade — só contagens", () => {
    const w = computeWave(base());
    for (const s of w.ledger.segments) {
      expect(Object.keys(s)).not.toContain("respondents");
      expect(Object.keys(s)).not.toContain("names");
      expect(typeof s.responded).toBe("number");
    }
  });

  test("prontidão-para-publicar exige n≥k no total", () => {
    expect(computeWave(base()).ledger.readyToPublishOverall).toBe(true);
    expect(computeWave(base({ respondedTotal: 4 })).ledger.readyToPublishOverall).toBe(false);
  });

  test("taxa de participação é responded/invited", () => {
    expect(computeWave(base({ invitedTotal: 100, respondedTotal: 60 })).participationPct).toBe(60);
  });
});

// ─── Ritmo e lembrete ─────────────────────────────────────────────────────────

describe("campaign — ritmo e lembrete", () => {
  test("atrás do ritmo numa onda aberta → sugere lembrete", () => {
    const w = computeWave(base({ today: "2026-06-12", respondedTotal: 60 })); // ~9% vs meta
    expect(w.onTrack).toBe(false);
    expect(w.reminder.shouldRemind).toBe(true);
  });
  test("onda fechada nunca lembra", () => {
    expect(computeWave(base({ today: "2026-06-25" })).reminder.shouldRemind).toBe(false);
  });
});

// ─── Visão do INDIVÍDUO (só o próprio status) ─────────────────────────────────

describe("campaign — visão do indivíduo", () => {
  test("pendente numa onda aberta → pode responder", () => {
    const v = buildIndividualView(base(), "pendente");
    expect(v.canRespond).toBe(true);
    expect(v.privacyAssurance).toContain("nem seu gestor");
  });
  test("respondeu → agradece e não pode responder de novo", () => {
    const v = buildIndividualView(base(), "respondeu");
    expect(v.canRespond).toBe(false);
    expect(v.cta).toContain("Obrigado");
  });
  test("k-anon mínimo é 5 (contrato)", () => {
    expect(WAVE_K_ANON_MIN).toBe(5);
  });
});
