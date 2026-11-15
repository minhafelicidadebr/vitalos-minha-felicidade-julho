import { describe, expect, test } from "bun:test";
import { getFibtManifest } from "@/domain/instruments/fibt/fibt-instrument";
import {
  loadFibtManagerControlCenterAsAdmin,
  type FibtManagerPublishedSnapshotRow,
  type FibtManagerSegmentParticipation,
  type FibtManagerStore,
} from "./fibt-manager-control-center.server";

const manifest = getFibtManifest();
const VERSION = manifest.instrument_version;
const NOW = new Date("2026-09-15T15:00:00.000Z");

const publishedMeans = (value = 3): Record<string, number> =>
  Object.fromEntries(manifest.items.map((item) => [item.id, value]));

function segment(
  cohortId: string | null,
  count: number,
  versions: (string | null)[] = [VERSION],
): FibtManagerSegmentParticipation {
  return { cohortId, count, instrumentVersions: versions };
}

function published(
  cohortId: string | null,
  publishedResponseCount: number | null,
  itemMeans: Record<string, number> | null = publishedMeans(),
): FibtManagerPublishedSnapshotRow {
  return {
    cohortId,
    publishedResponseCount,
    itemMeans,
    publishedAt: publishedResponseCount === null ? null : "2026-09-15T12:00:00.000Z",
  };
}

function fakeStore(overrides: Partial<FibtManagerStore> = {}): FibtManagerStore {
  return {
    findWave: async (orgId, waveId) =>
      orgId === "org-a" && waveId === "wave-a"
        ? {
          id: "wave-a",
          orgId: "org-a",
          organizationName: "ISG Sintetica",
          label: "Piloto controlado",
          instrument: "FIB_T",
          instrumentVersion: VERSION,
          status: "collecting",
          sealOutcome: null,
          createdAt: "2026-09-01T00:00:00.000Z",
          closesAt: null,
        }
        : null,
    findCanonicalHmlWave: async () => null,
    listCohorts: async () => [
      { id: "cohort-a", orgId: "org-a", waveId: "wave-a", key: "A", label: "Setor A" },
    ],
    listLinks: async () => [
      {
        id: "link-a",
        orgId: "org-a",
        waveId: "wave-a",
        sectorKey: "A",
        status: "active",
        expiresAt: "2026-09-30T00:00:00.000Z",
        revokedAt: null,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    listSegmentParticipation: async () => [],
    listPublishedSnapshots: async () => [],
    listEvents: async () => [],
    ...overrides,
  };
}

const deps = (store: FibtManagerStore, extra: Record<string, unknown> = {}) => ({
  store,
  now: () => NOW,
  pilotEnabled: () => true,
  moduleAccess: async () => ({ ok: true as const }),
  ...extra,
});

const twoSectors = [
  { id: "cohort-a", orgId: "org-a", waveId: "wave-a", key: "A", label: "Setor A" },
  { id: "cohort-b", orgId: "org-a", waveId: "wave-a", key: "B", label: "Setor B" },
];

const linksFor = (keys: string[]) =>
  keys.map((key, index) => ({
    id: `link-${key}`,
    orgId: "org-a",
    waveId: "wave-a",
    sectorKey: key,
    status: "active",
    expiresAt: "2026-09-30T00:00:00.000Z",
    revokedAt: null,
    createdAt: `2026-09-0${index + 1}T00:00:00.000Z`,
  }));

// ═══════════════════════════════════════════════════════════════════════════
// A prova central: o caminho real do painel não lê nem devolve conteúdo de
// resposta, e todo valor observável vem do snapshot publicado.
// ═══════════════════════════════════════════════════════════════════════════

describe("fronteira de leitura do painel FIB-T", () => {
  test("o contrato do store não tem mais como devolver respostas cruas", () => {
    const store = fakeStore();
    expect("listResponses" in store).toBe(false);
    expect(Object.keys(store).sort()).toEqual([
      "findCanonicalHmlWave",
      "findWave",
      "listCohorts",
      "listEvents",
      "listLinks",
      "listPublishedSnapshots",
      "listSegmentParticipation",
    ]);
  });

  test("nega onda de outro tenant antes de qualquer leitura de participação", async () => {
    let participationReads = 0;
    let publishedReads = 0;
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-b",
      "wave-a",
      {},
      deps(
        fakeStore({
          listSegmentParticipation: async () => {
            participationReads += 1;
            return [];
          },
          listPublishedSnapshots: async () => {
            publishedReads += 1;
            return [];
          },
        }),
      ),
    );
    expect(result).toMatchObject({ ok: false, category: "validation" });
    expect(participationReads).toBe(0);
    expect(publishedReads).toBe(0);
  });

  test("confere o contrato exato de coortes HML antes de ler participação", async () => {
    let participationReads = 0;
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      { expectedCohortKeys: ["A", "B"], environment: "hml_staging", hmlAttested: true },
      deps(
        fakeStore({
          listSegmentParticipation: async () => {
            participationReads += 1;
            return [];
          },
        }),
      ),
    );
    expect(result).toMatchObject({ ok: false, category: "validation" });
    expect(participationReads).toBe(0);
  });

  test("o gate de piloto falha antes de tocar o banco", async () => {
    let reads = 0;
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      {},
      {
        store: fakeStore({
          findWave: async () => {
            reads += 1;
            return null;
          },
        }),
        pilotEnabled: () => false,
      },
    );
    expect(result).toMatchObject({ ok: false, category: "feature_gate" });
    expect(reads).toBe(0);
  });

  test("payload nunca carrega resposta, token ou contagem viva de recorte protegido", async () => {
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      {},
      deps(
        fakeStore({
          listSegmentParticipation: async () => [segment("cohort-a", 4)],
          listPublishedSnapshots: async () => [],
        }),
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    expect(serialized).not.toContain('"answers"');
    expect(serialized).not.toContain("token_hash");
    expect(serialized).not.toContain('"n":4');
    expect(result.snapshot.sectors[0]).toMatchObject({
      participationState: "insufficient_participants",
      participationLabel: "<5",
      readingPublished: false,
    });
    expect(result.snapshot.privacy).toEqual({
      kMin: 5,
      individualResponsesExposed: false,
      rawTokensExposed: false,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cenários exigidos: +1..+4 e depois +5, relógios diferentes, combinação de
// totais, cobertura por item, fechamento, isolamento.
// ═══════════════════════════════════════════════════════════════════════════

describe("publicação em lote no caminho real do painel", () => {
  async function loadWith(
    segments: FibtManagerSegmentParticipation[],
    snapshots: FibtManagerPublishedSnapshotRow[],
    cohorts = twoSectors,
    waveOver: Record<string, unknown> = {},
  ) {
    const base = await fakeStore().findWave("org-a", "wave-a");
    return loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      {},
      deps(
        fakeStore({
          findWave: async () => ({ ...base!, ...waveOver }),
          listCohorts: async () => cohorts,
          listLinks: async () => linksFor(cohorts.map((c) => c.key)),
          listSegmentParticipation: async () => segments,
          listPublishedSnapshots: async () => snapshots,
        }),
      ),
    );
  }

  test("de +1 a +4 novas participações a leitura observável não se move", async () => {
    const observed: string[] = [];
    for (let extra = 0; extra <= 4; extra += 1) {
      const result = await loadWith(
        [segment("cohort-a", 6 + extra), segment("cohort-b", 6)],
        [published("cohort-a", 6), published("cohort-b", 6)],
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const sector = result.snapshot.sectors.find((s) => s.key === "A")!;
      expect(sector.analytics.state).toBe("available");
      observed.push(JSON.stringify(sector.analytics));
    }
    // Cinco cargas do painel, cinco payloads idênticos: nenhuma diferença
    // aritmética entre leituras sucessivas, logo nada a subtrair.
    expect(new Set(observed).size).toBe(1);
  });

  test("com +5 novas o snapshot publicado avança e a leitura muda de uma vez", async () => {
    const antes = await loadWith(
      [segment("cohort-a", 6), segment("cohort-b", 6)],
      [published("cohort-a", 6), published("cohort-b", 6)],
    );
    const depois = await loadWith(
      [segment("cohort-a", 11), segment("cohort-b", 6)],
      [published("cohort-a", 11, publishedMeans(4)), published("cohort-b", 6)],
    );
    expect(antes.ok && depois.ok).toBe(true);
    if (!antes.ok || !depois.ok) return;
    const a = antes.snapshot.sectors.find((s) => s.key === "A")!.analytics;
    const b = depois.snapshot.sectors.find((s) => s.key === "A")!.analytics;
    expect(a.state).toBe("available");
    expect(b.state).toBe("available");
    if (a.state !== "available" || b.state !== "available") return;
    expect(b.n - a.n).toBe(5);
    expect(b.result.escoreBruto).not.toBe(a.result.escoreBruto);
  });

  test("relógios de publicação diferentes convivem: um setor publicado, outro aguardando", async () => {
    const result = await loadWith(
      [segment("cohort-a", 8), segment("cohort-b", 7)],
      [published("cohort-a", 8), published("cohort-b", null, null)],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const states = Object.fromEntries(
      result.snapshot.sectors.map((s) => [s.key, s.analytics.state]),
    );
    expect(states).toEqual({ A: "available", B: "awaiting_batched_release" });
    expect(result.snapshot.participation.publishedCohorts).toBe(1);
    expect(result.snapshot.factorComparison).toHaveLength(1);
  });

  test("combinar total da onda com setores publicados não isola recorte protegido", async () => {
    // Partição [10, 8, 4]: a regra complementar retém TUDO que é visível.
    const result = await loadWith(
      [segment("cohort-a", 10), segment("cohort-b", 8), segment("cohort-c", 4)],
      [published("cohort-a", 10), published("cohort-b", 8)],
      [
        ...twoSectors,
        { id: "cohort-c", orgId: "org-a", waveId: "wave-a", key: "C", label: "Setor C" },
      ],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const states = Object.fromEntries(
      result.snapshot.sectors.map((s) => [s.key, s.analytics.state]),
    );
    expect(states).toEqual({
      A: "complementary_suppression",
      B: "complementary_suppression",
      C: "insufficient_participants",
    });
    // O total continua visível (metadado operacional), mas nenhum setor
    // visível entrega contagem: 22 − ? − ? não resolve nada.
    expect(result.snapshot.participation.countLabel).toBe("22");
    expect(result.snapshot.sectors.map((s) => s.participationLabel)).toEqual([
      "protegida",
      "protegida",
      "<5",
    ]);
    expect(result.snapshot.factorComparison).toEqual([]);
    expect(result.snapshot.participation.publishedCohorts).toBe(0);
  });

  test("total da onda abaixo do limiar sai como faixa, não como número", async () => {
    const result = await loadWith(
      [segment("cohort-a", 2), segment("cohort-b", 1)],
      [],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.participation.countLabel).toBe("<5");
  });

  test("cobertura parcial por item não vira escore nem zero", async () => {
    const partial = publishedMeans();
    delete partial[manifest.items[31]!.id];
    const result = await loadWith(
      [segment("cohort-a", 9), segment("cohort-b", 9)],
      [published("cohort-a", 9, partial), published("cohort-b", 9)],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sector = result.snapshot.sectors.find((s) => s.key === "A")!;
    expect(sector.analytics.state).toBe("awaiting_item_coverage");
    expect(JSON.stringify(sector.analytics)).not.toContain("escoreBruto");
  });

  test("leitura no nível da onda é indisponibilidade explícita, não um número composto", async () => {
    const result = await loadWith(
      [segment("cohort-a", 8), segment("cohort-b", 8)],
      [published("cohort-a", 8), published("cohort-b", 8)],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.waveAnalytics.state).toBe("wave_reading_unavailable");
    expect(JSON.stringify(result.snapshot.waveAnalytics)).not.toContain("escoreBruto");
  });

  test("fechamento não publica à força: retém e diz que reteve", async () => {
    const result = await loadWith(
      [segment("cohort-a", 9), segment("cohort-b", 9)],
      [published("cohort-a", 6), published("cohort-b", null, null)],
      twoSectors,
      { status: "sealed", sealOutcome: "withheld_for_privacy" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = result.snapshot.sectors.find((s) => s.key === "A")!.analytics;
    const b = result.snapshot.sectors.find((s) => s.key === "B")!.analytics;
    expect(a.state).toBe("available");
    if (a.state === "available") {
      expect(a.n).toBe(6);
      expect(a.finalUpdateWithheld).toBe(true);
    }
    // Setor sem publicação nenhuma no fechamento: retido, nunca "aguardando".
    expect(b.state).toBe("withheld_on_close");
    expect(result.snapshot.campaign.sealOutcome).toBe("withheld_for_privacy");
    expect(result.snapshot.readiness.nextAction).toContain("fechada");
  });

  test("versão divergente no recorte bloqueia e entra como bloqueio operacional", async () => {
    const result = await loadWith(
      [segment("cohort-a", 9, [VERSION, "0.9.0"]), segment("cohort-b", 9)],
      [published("cohort-a", 9), published("cohort-b", 9)],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = result.snapshot.sectors.find((s) => s.key === "A")!.analytics;
    expect(a.state).toBe("methodology_error");
    expect(result.snapshot.readiness.state).toBe("blocked");
    expect(result.snapshot.readiness.blockers.join(" ")).toContain("metodológica");
  });

  test("resposta fora de coorte autorizada bloqueia a leitura da onda", async () => {
    const result = await loadWith(
      [segment("cohort-a", 9), segment(null, 3)],
      [published("cohort-a", 9)],
      [twoSectors[0]!],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.waveAnalytics.state).toBe("technical_error");
    expect(result.snapshot.readiness.state).toBe("blocked");
    expect(result.snapshot.readiness.blockers.join(" ")).toContain("sem vínculo");
  });

  test("bucket sem coorte entra na partição e endurece a regra complementar", async () => {
    // Segmentos [8, 8] + bucket sem coorte com 3 ⇒ um oculto, dois visíveis.
    const result = await loadWith(
      [segment("cohort-a", 8), segment("cohort-b", 8), segment(null, 3)],
      [published("cohort-a", 8), published("cohort-b", 8)],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const sector of result.snapshot.sectors) {
      expect(sector.analytics.state).toBe("complementary_suppression");
    }
  });

  test("nenhum setor cadastrado é bloqueio, não leitura vazia disfarçada", async () => {
    const result = await loadWith([], [], []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.readiness.state).toBe("blocked");
    expect(result.snapshot.readiness.blockers.join(" ")).toContain("Nenhum setor");
    expect(result.snapshot.participation.countLabel).toBe("0");
  });

  test("próxima ação não promete resultado imediato quando há espera por lote", async () => {
    const result = await loadWith(
      [segment("cohort-a", 8), segment("cohort-b", 8)],
      [published("cohort-a", null, null), published("cohort-b", null, null)],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.readiness.nextAction).toContain("lote protegido");
    expect(result.snapshot.readiness.nextAction).not.toContain("publicáveis");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Publicação: o painel usa o mecanismo canônico, e só quando há identidade.
// ═══════════════════════════════════════════════════════════════════════════

describe("avanço da publicação protegida", () => {
  test("com identidade administrativa, chama a RPC canônica uma vez por coorte", async () => {
    const calls: Array<{ waveId: string; cohortIds: readonly string[]; token: string }> = [];
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      { publisherAccessToken: "token-do-admin" },
      deps(
        fakeStore({
          listCohorts: async () => twoSectors,
          listLinks: async () => linksFor(["A", "B"]),
          listSegmentParticipation: async () => [segment("cohort-a", 8), segment("cohort-b", 8)],
          listPublishedSnapshots: async () => [published("cohort-a", 8), published("cohort-b", 8)],
        }),
        {
          advancePublication: async (
            waveId: string,
            cohortIds: readonly string[],
            token: string,
          ) => {
            calls.push({ waveId, cohortIds, token });
            return { attempted: cohortIds.length, advanced: cohortIds.length, failed: 0 };
          },
        },
      ),
    );
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      waveId: "wave-a",
      cohortIds: ["cohort-a", "cohort-b"],
      token: "token-do-admin",
    });
  });

  test("sem identidade (deployment HML) o painel é somente-leitura: nada é publicado", async () => {
    let called = 0;
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      { environment: "hml_staging", hmlAttested: true },
      deps(
        fakeStore({
          listSegmentParticipation: async () => [segment("cohort-a", 8)],
          listPublishedSnapshots: async () => [],
        }),
        {
          advancePublication: async () => {
            called += 1;
            return { attempted: 0, advanced: 0, failed: 0 };
          },
        },
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(called).toBe(0);
    // Fail-closed: sem publicação, o painel mostra espera, nunca cálculo ao vivo.
    expect(result.snapshot.sectors[0]?.analytics.state).toBe("awaiting_batched_release");
  });

  test("falha do publicador não derruba a leitura nem libera valor ao vivo", async () => {
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      { publisherAccessToken: "token-do-admin" },
      deps(
        fakeStore({
          listSegmentParticipation: async () => [segment("cohort-a", 40)],
          listPublishedSnapshots: async () => [],
        }),
        {
          advancePublication: async () => {
            throw new Error("rede fora");
          },
        },
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const analytics = result.snapshot.sectors[0]!.analytics;
    expect(analytics.state).toBe("awaiting_batched_release");
    expect(JSON.stringify(analytics)).not.toContain("40");
  });
});

describe("operação de links e telemetria (preservado)", () => {
  test("detecta mais de um link ativo para o mesmo setor", async () => {
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      {},
      deps(
        fakeStore({
          listLinks: async () => [
            ...linksFor(["A"]),
            {
              id: "link-a2",
              orgId: "org-a",
              waveId: "wave-a",
              sectorKey: "A",
              status: "active",
              expiresAt: "2026-10-01T00:00:00.000Z",
              revokedAt: null,
              createdAt: "2026-09-02T00:00:00.000Z",
            },
          ],
        }),
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.sectors[0]?.operationalState).toBe("error");
    expect(result.snapshot.readiness.state).toBe("blocked");
  });

  test("telemetria fica escopada na onda e sem motivo livre", async () => {
    const result = await loadFibtManagerControlCenterAsAdmin(
      "org-a",
      "wave-a",
      {},
      deps(
        fakeStore({
          listEvents: async () => [
            {
              event: "authorization_denied",
              waveId: null,
              reason: "detalhe-nao-relacionado",
              occurredAt: "2026-09-15T14:00:00.000Z",
            },
            {
              event: "sector_link_created",
              waveId: "wave-a",
              reason: "detalhe-livre",
              occurredAt: "2026-09-15T13:00:00.000Z",
            },
            {
              event: "sector_link_created",
              waveId: "wave-outra",
              reason: "outra-onda",
              occurredAt: "2026-09-15T12:00:00.000Z",
            },
          ],
        }),
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.telemetry).toEqual([
      {
        event: "sector_link_created",
        waveId: "wave-a",
        reason: null,
        occurredAt: "2026-09-15T13:00:00.000Z",
      },
    ]);
  });
});
