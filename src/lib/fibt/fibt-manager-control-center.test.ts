import { describe, expect, test } from "bun:test";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import { suppressDifferentialInference } from "@/engine/survey/sector-link-engine";
import {
  buildFactorComparison,
  buildProtectedCohortReading,
  buildWaveReadingUnavailable,
  isProtectedState,
  PROTECTED_COUNT_LABEL,
  type ManagerAnalytics,
  type PublishedCohortSnapshot,
} from "./fibt-manager-control-center";

const manifest = getFibtManifest();
const VERSION = manifest.instrument_version;

/** Médias por item, como o snapshot publicado as guarda. */
const publishedMeans = (value = 3): Record<string, number> =>
  Object.fromEntries(manifest.items.map((item) => [item.id, value]));

const snapshot = (over: Partial<PublishedCohortSnapshot> = {}): PublishedCohortSnapshot => ({
  publishedResponseCount: 6,
  itemMeans: publishedMeans(),
  publishedAt: "2026-09-15T12:00:00.000Z",
  ...over,
});

const reading = (over: Partial<Parameters<typeof buildProtectedCohortReading>[0]> = {}) =>
  buildProtectedCohortReading({
    liveCount: 6,
    partitionCounts: [6],
    published: snapshot(),
    waveInstrumentVersion: VERSION,
    waveSealed: false,
    ...over,
  });

describe("leitura protegida — a fonte é o snapshot PUBLICADO, nunca o cálculo ao vivo", () => {
  test("o módulo não expõe mais nenhum construtor a partir de respostas cruas", async () => {
    const mod = await import("./fibt-manager-control-center");
    // `buildManagerAnalytics` era o caminho alternativo que recalculava média e
    // escore ao vivo. A ausência dele é a prova de que o bypass não existe.
    expect("buildManagerAnalytics" in mod).toBe(false);
    expect(Object.keys(mod).some((name) => /raw|answers|responses/i.test(name))).toBe(false);
  });

  test("snapshot publicado e completo produz os três fatores canônicos", () => {
    const r = reading();
    expect(r.state).toBe("available");
    if (r.state !== "available") return;
    expect(r.result.factors).toHaveLength(3);
    expect(r.result.factors.map((f) => f.mean)).toEqual([3, 3, 3]);
    expect(r.result.escoreBruto).toBe(9);
    // A contagem exposta é a PUBLICADA, nunca a viva.
    expect(r.n).toBe(6);
    expect(r.countLabel).toBe("6");
  });

  test("contagem viva maior que a publicada não vaza: sai a publicada", () => {
    const r = reading({ liveCount: 9, partitionCounts: [9] });
    expect(r.state).toBe("available");
    if (r.state !== "available") return;
    // 9 é a contagem viva; 6 é a publicada. É a publicada que sai — é isso que
    // impede o delta pequeno de virar a resposta de uma pessoa.
    expect(r.n).toBe(6);
    expect(r.countLabel).toBe("6");
    expect(r.countLabel).not.toBe("9");
  });

  test("sem snapshot publicado, coorte com participações suficientes fica aguardando lote", () => {
    const r = reading({ liveCount: 12, partitionCounts: [12], published: null });
    expect(r.state).toBe("awaiting_batched_release");
    if (r.state !== "awaiting_batched_release") return;
    // O defeito D2 da 10.2: dizer "menos de 5" para uma coorte de 12.
    expect(r.message).not.toContain("menos de");
    expect(r.countLabel).toBe(PROTECTED_COUNT_LABEL);
    expect(r.message).toContain("lote protegido");
  });

  test("linha de BASELINE (marca d'água sem publicação) também é aguardando lote", () => {
    const r = reading({
      liveCount: 12,
      partitionCounts: [12],
      published: snapshot({ publishedResponseCount: null, itemMeans: null, publishedAt: null }),
    });
    expect(r.state).toBe("awaiting_batched_release");
  });

  test("abaixo do limiar: faixa, nunca número, e mensagem sem a contagem", () => {
    const r = reading({ liveCount: 3, partitionCounts: [3], published: null });
    expect(r.state).toBe("insufficient_participants");
    if (r.state !== "insufficient_participants") return;
    expect(r.countLabel).toBe("<5");
    expect(r.message).not.toMatch(/\b3\b/);
    expect(JSON.stringify(r)).not.toContain('"n"');
  });

  test("zero participações é 'sem dados', distinto de supressão", () => {
    const r = reading({ liveCount: 0, partitionCounts: [], published: null });
    expect(r.state).toBe("no_data");
    expect(r.countLabel).toBe("0");
  });
});

describe("supressão complementar — mesma regra canônica do engine e do SQL", () => {
  test("partição [10,8,4]: o setor visível é retido, não publicado", () => {
    const r = reading({ liveCount: 10, partitionCounts: [10, 8, 4], published: snapshot({ publishedResponseCount: 10 }) });
    expect(r.state).toBe("complementary_suppression");
    if (r.state !== "complementary_suppression") return;
    expect(r.countLabel).toBe(PROTECTED_COUNT_LABEL);
    expect(r.message).toContain("subtração");
    // Nem contagem, nem média, nem escore atravessam.
    const serialized = JSON.stringify(r);
    expect(serialized).not.toContain("10");
    expect(serialized).not.toContain("escoreBruto");
  });

  test("partição [10,8,4,3] (dois ocultos) publica normalmente", () => {
    const r = reading({ liveCount: 10, partitionCounts: [10, 8, 4, 3], published: snapshot({ publishedResponseCount: 10 }) });
    expect(r.state).toBe("available");
  });

  test("partição sem oculto nenhum publica normalmente", () => {
    const r = reading({ liveCount: 10, partitionCounts: [10, 8, 7], published: snapshot({ publishedResponseCount: 10 }) });
    expect(r.state).toBe("available");
  });

  test("a decisão é literalmente a do engine canônico — nenhuma regra nova foi escrita", () => {
    const partitions: number[][] = [
      [10, 4],
      [10, 8, 4],
      [10, 8, 4, 3],
      [5, 4],
      [100, 4],
      [100, 100, 4],
      [10, 8, 7],
      [3],
    ];
    for (const partition of partitions) {
      const engineSays = suppressDifferentialInference(
        partition.map((count) => ({ count })),
        5,
      );
      const r = buildProtectedCohortReading({
        liveCount: partition[0]!,
        partitionCounts: partition,
        published: snapshot({ publishedResponseCount: partition[0]! }),
        waveInstrumentVersion: VERSION,
        waveSealed: false,
      });
      const uiSuppressed = r.state === "complementary_suppression";
      // Só compara quando o próprio segmento é visível: abaixo do limiar o
      // limiar vem primeiro, exatamente como no SQL.
      if (partition[0]! >= 5) expect(uiSuppressed).toBe(engineSays);
    }
  });
});

describe("cobertura por item — MISSING_AS_ZERO permanece false", () => {
  test("snapshot publicado sem os 32 itens não vira escore nem zero", () => {
    const partial = publishedMeans();
    delete partial[manifest.items[31]!.id];
    const r = reading({ published: snapshot({ itemMeans: partial }) });
    expect(r.state).toBe("awaiting_item_coverage");
    if (r.state !== "awaiting_item_coverage") return;
    expect(r.message).toContain("32 itens");
    expect(r.message).toContain("zero");
    expect(JSON.stringify(r)).not.toContain("escoreBruto");
  });

  test("valor fora da escala 0–4 é falha metodológica, não espera de privacidade", () => {
    const invalid = { ...publishedMeans(), [manifest.items[0]!.id]: 9 };
    const r = reading({ published: snapshot({ itemMeans: invalid }) });
    expect(r.state).toBe("methodology_error");
  });
});

describe("identidade metodológica tem precedência", () => {
  test("versão da onda diferente do manifesto bloqueia qualquer leitura", () => {
    const r = reading({ waveInstrumentVersion: "0.9.0" });
    expect(r.state).toBe("methodology_error");
  });

  test("versão ausente na onda bloqueia", () => {
    const r = reading({ waveInstrumentVersion: null });
    expect(r.state).toBe("methodology_error");
  });

  test("respostas de versões diferentes no mesmo recorte bloqueiam", () => {
    const r = reading({ segmentInstrumentVersions: [VERSION, "0.9.0"] });
    expect(r.state).toBe("methodology_error");
    if (r.state !== "methodology_error") return;
    expect(r.message).toContain("versão diferente");
  });
});

describe("fechamento de onda", () => {
  test("onda selada sem publicação nenhuma é retenção no fechamento, não espera", () => {
    const r = reading({ liveCount: 12, partitionCounts: [12], published: null, waveSealed: true });
    expect(r.state).toBe("withheld_on_close");
    if (r.state !== "withheld_on_close") return;
    expect(r.message).toContain("Fechar a coleta");
    expect(r.countLabel).toBe(PROTECTED_COUNT_LABEL);
  });

  test("onda selada com publicação anterior mantém a leitura e marca a retenção final", () => {
    const r = reading({
      liveCount: 9,
      partitionCounts: [9],
      published: snapshot({ publishedResponseCount: 6 }),
      waveSealed: true,
    });
    expect(r.state).toBe("available");
    if (r.state !== "available") return;
    expect(r.n).toBe(6);
    expect(r.finalUpdateWithheld).toBe(true);
  });

  test("onda selada exatamente no total publicado não marca retenção", () => {
    const r = reading({
      liveCount: 6,
      partitionCounts: [6],
      published: snapshot({ publishedResponseCount: 6 }),
      waveSealed: true,
    });
    expect(r.state).toBe("available");
    if (r.state !== "available") return;
    expect(r.finalUpdateWithheld).toBe(false);
  });
});

describe("leitura no nível da onda", () => {
  test("é indisponibilidade explícita, nunca um número aproximado", () => {
    const r = buildWaveReadingUnavailable();
    expect(r.state).toBe("wave_reading_unavailable");
    if (r.state !== "wave_reading_unavailable") return;
    expect(r.message).toContain("por setor");
    expect(r.message).toContain("decisão metodológica");
    expect(JSON.stringify(r)).not.toContain("escoreBruto");
  });
});

describe("comparação entre setores", () => {
  const available = reading() as Extract<ManagerAnalytics, { state: "available" }>;

  test("somente setores com leitura publicada entram", () => {
    const comparison = buildFactorComparison([
      { id: "a", label: "Setor A", analytics: available },
      {
        id: "b",
        label: "Setor B",
        analytics: reading({ liveCount: 12, partitionCounts: [12], published: null }),
      },
      {
        id: "c",
        label: "Setor C",
        analytics: reading({ liveCount: 3, partitionCounts: [3], published: null }),
      },
    ]);
    expect(comparison).toHaveLength(1);
    expect(comparison[0]?.cohortLabel).toBe("Setor A");
  });

  test("com supressão complementar ativa a comparação fica vazia", () => {
    const suppressed = reading({ liveCount: 10, partitionCounts: [10, 8, 4] });
    const other = reading({ liveCount: 8, partitionCounts: [10, 8, 4] });
    expect(buildFactorComparison([
      { id: "a", label: "A", analytics: suppressed },
      { id: "b", label: "B", analytics: other },
    ])).toEqual([]);
  });
});

describe("classificação de estados protegidos", () => {
  test("privacidade não é falha", () => {
    expect(isProtectedState("insufficient_participants")).toBe(true);
    expect(isProtectedState("awaiting_batched_release")).toBe(true);
    expect(isProtectedState("complementary_suppression")).toBe(true);
    expect(isProtectedState("awaiting_item_coverage")).toBe(true);
    expect(isProtectedState("withheld_on_close")).toBe(true);
    expect(isProtectedState("available")).toBe(false);
    expect(isProtectedState("no_data")).toBe(false);
    expect(isProtectedState("methodology_error")).toBe(false);
    expect(isProtectedState("technical_error")).toBe(false);
  });
});
