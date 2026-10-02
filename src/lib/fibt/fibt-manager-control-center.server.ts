import { FIBT_K_MIN } from "@/engine/fibt/fibt-engine";
import { listOpsEventsForOrg, type OpsEventRow } from "@/lib/telemetry/ops-events.server";
import {
  classifySectorLink,
  protectSectorParticipation,
  type SectorLinkState,
} from "@/lib/survey/sector-operations";
import { FIBT_PILOT_DISABLED_REASON, isFibtPilotEnabled } from "./fibt-pilot-flag";
import {
  buildFactorComparison,
  buildProtectedCohortReading,
  buildTechnicalUnavailable,
  buildWaveReadingUnavailable,
  type ManagerAnalytics,
  type ManagerFactorComparison,
  type PublishedCohortSnapshot,
} from "./fibt-manager-control-center";
import type { AdvanceCohortPublication } from "./fibt-cohort-publication.server";

const MANAGER_TELEMETRY_EVENTS = new Set([
  "response_submit_attempted",
  "response_submit_accepted",
  "response_submit_rejected",
  "sector_response_accepted",
  "sector_response_rejected",
  "sector_link_created",
  "sector_link_revoked",
  "wave_closed",
]);

export interface FibtManagerWaveRow {
  id: string;
  orgId: string;
  organizationName: string;
  label: string;
  instrument: string;
  instrumentVersion: string | null;
  status: string;
  /** `withheld_for_privacy` quando o fechamento nao pôde republicar. */
  sealOutcome: string | null;
  createdAt: string;
  closesAt: string | null;
}

export interface FibtManagerCohortRow {
  id: string;
  orgId: string;
  waveId: string;
  key: string;
  label: string;
}

export interface FibtManagerLinkRow {
  id: string;
  orgId: string;
  waveId: string;
  sectorKey: string;
  status: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

/**
 * Participação de UM segmento da onda — contagem e versões presentes, nunca
 * conteúdo de resposta.
 *
 * `cohortId` NULL representa o bucket "sem coorte", que é um segmento legítimo
 * da partição e precisa entrar na regra de supressão complementar.
 */
export interface FibtManagerSegmentParticipation {
  cohortId: string | null;
  count: number;
  /** Versões de instrumento distintas presentes no segmento. */
  instrumentVersions: readonly (string | null)[];
}

/** Snapshot PUBLICADO de um segmento, como vive em `cohort_capsules`. */
export interface FibtManagerPublishedSnapshotRow extends PublishedCohortSnapshot {
  cohortId: string | null;
}

/**
 * Identidade exata de uma campanha de homologação. Fornecida pela fronteira
 * de deployment HML (`fibt-manager-access.server.ts`), nunca conhecida pelo
 * leitor de produto: este módulo não sabe qual cliente ou lote existe.
 */
export interface FibtCampaignIdentity {
  organizationName: string;
  waveLabel: string;
  instrument: string;
  instrumentVersion: string;
}

export interface FibtManagerStore {
  findWave(orgId: string, waveId: string): Promise<FibtManagerWaveRow | null>;
  findCanonicalHmlWave(identity: FibtCampaignIdentity): Promise<FibtManagerWaveRow | null>;
  listCohorts(orgId: string, waveId: string): Promise<FibtManagerCohortRow[]>;
  listLinks(orgId: string, waveId: string): Promise<FibtManagerLinkRow[]>;
  /**
   * Substitui o antigo `listResponses`, que trazia `answers` CRUAS e alimentava
   * o recálculo ao vivo (macro-onda 10.2-B, defeito D1). Aqui só saem
   * contagens por segmento e versões de instrumento.
   */
  listSegmentParticipation(waveId: string): Promise<FibtManagerSegmentParticipation[]>;
  /** Leitura do estado PUBLICADO — a única fonte de valor observável. */
  listPublishedSnapshots(waveId: string): Promise<FibtManagerPublishedSnapshotRow[]>;
  listEvents(orgId: string): Promise<OpsEventRow[]>;
}

export interface FibtManagerLinkSummary {
  id: string;
  state: SectorLinkState;
  expiresAt: string;
  createdAt: string;
}

export interface FibtManagerSectorSummary {
  id: string;
  key: string;
  label: string;
  operationalState: "collecting" | "no_active_link" | "closed" | "error";
  participationState: ManagerAnalytics["state"];
  /**
   * Derivado do ESTADO, nunca da contagem viva: número somente quando há
   * leitura publicada; faixa `<k` abaixo do limiar; rótulo não numérico em
   * qualquer estado protegido. Isso impede que o painel devolva por rótulo o
   * que a RPC retém.
   */
  participationLabel: string;
  /** Existe leitura PUBLICADA para este setor. */
  readingPublished: boolean;
  analytics: ManagerAnalytics;
  links: FibtManagerLinkSummary[];
}

export interface FibtManagerSnapshot {
  campaign: {
    waveId: string;
    organizationName: string;
    label: string;
    instrument: "FIB_T";
    instrumentVersion: string;
    status: string;
    /** `withheld_for_privacy` quando o fechamento reteve a atualização final. */
    sealOutcome: string | null;
    createdAt: string;
    closesAt: string | null;
    environment: "hml_staging" | "application";
    hmlAttested: boolean;
  };
  participation: {
    /** Participação total da onda, protegida por faixa abaixo do limiar. */
    countLabel: string;
    /** Setores com leitura PUBLICADA (não "elegíveis"). */
    publishedCohorts: number;
    totalCohorts: number;
  };
  waveAnalytics: ManagerAnalytics;
  sectors: FibtManagerSectorSummary[];
  factorComparison: ManagerFactorComparison[];
  readiness: {
    state: "ready" | "attention" | "blocked";
    operational: boolean;
    blockers: string[];
    nextAction: string;
  };
  telemetry: OpsEventRow[];
  privacy: {
    kMin: number;
    individualResponsesExposed: false;
    rawTokensExposed: false;
  };
}

export type FibtManagerLoadOutcome =
  | { ok: true; snapshot: FibtManagerSnapshot }
  | { ok: false; category: "feature_gate" | "validation" | "backend"; error: string };

export interface FibtManagerServiceDeps {
  store?: FibtManagerStore;
  now?: () => Date;
  pilotEnabled?: () => boolean;
  /**
   * Publicador canônico (a própria RPC, com a identidade do chamador). Injetado
   * para que os testes exercitem o caminho real sem rede — e ausente quando não
   * há identidade organizacional (deployment HML).
   */
  advancePublication?: AdvanceCohortPublication;
}

function createSupabaseStore(): FibtManagerStore {
  async function adminClient() {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Generated types lag the latest staging-only foreign keys.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabaseAdmin as any;
  }

  const WAVE_COLUMNS =
    "id,org_id,label,instrument,instrument_version,status,seal_outcome,created_at,closes_at";

  const mapWave = (row: Record<string, unknown>, organizationName: string): FibtManagerWaveRow => ({
    id: String(row.id),
    orgId: String(row.org_id),
    organizationName,
    label: String(row.label ?? "Onda FIB-T"),
    instrument: String(row.instrument),
    instrumentVersion: (row.instrument_version as string | null) ?? null,
    status: String(row.status),
    sealOutcome: (row.seal_outcome as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
    closesAt: (row.closes_at as string | null) ?? null,
  });

  return {
    async findWave(orgId, waveId) {
      const admin = await adminClient();
      const { data: wave, error } = await admin
        .from("waves")
        .select(WAVE_COLUMNS)
        .eq("id", waveId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (error || !wave) return null;

      const { data: organization } = await admin
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .maybeSingle();
      return mapWave(wave as Record<string, unknown>, String(organization?.name ?? "Organização"));
    },

    async findCanonicalHmlWave(identity) {
      const admin = await adminClient();
      const { data: organizations, error: orgError } = await admin
        .from("organizations")
        .select("id,name")
        .eq("name", identity.organizationName)
        .limit(2);
      if (orgError || organizations?.length !== 1) return null;

      const organization = organizations[0] as { id: string; name: string };
      const { data: waves, error: waveError } = await admin
        .from("waves")
        .select(WAVE_COLUMNS)
        .eq("org_id", organization.id)
        .eq("label", identity.waveLabel)
        .eq("instrument", identity.instrument)
        .eq("instrument_version", identity.instrumentVersion)
        .limit(2);
      if (waveError || waves?.length !== 1) return null;
      return mapWave(waves[0] as Record<string, unknown>, organization.name);
    },

    async listCohorts(orgId, waveId) {
      const admin = await adminClient();
      const { data, error } = await admin
        .from("wave_cohorts")
        .select("id,org_id,wave_id,key,label")
        .eq("org_id", orgId)
        .eq("wave_id", waveId)
        .order("key");
      if (error) throw new Error("FIBT_MANAGER_COHORT_READ_FAILED");
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        orgId: String(row.org_id),
        waveId: String(row.wave_id),
        key: String(row.key),
        label: String(row.label),
      }));
    },

    async listLinks(orgId, waveId) {
      const admin = await adminClient();
      const { data, error } = await admin
        .from("sector_links")
        .select("id,org_id,wave_id,sector_label,status,expires_at,revoked_at,created_at")
        .eq("org_id", orgId)
        .eq("wave_id", waveId)
        .order("created_at", { ascending: false });
      if (error) throw new Error("FIBT_MANAGER_LINK_READ_FAILED");
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        orgId: String(row.org_id),
        waveId: String(row.wave_id),
        sectorKey: String(row.sector_label),
        status: String(row.status),
        expiresAt: String(row.expires_at),
        revokedAt: (row.revoked_at as string | null) ?? null,
        createdAt: String(row.created_at),
      }));
    },

    /**
     * `answers` NÃO é selecionada. Esta é a diferença que fecha o bypass: o
     * painel não tem mais como recalcular nada ao vivo, porque o conteúdo das
     * respostas não sai do banco por este caminho.
     */
    async listSegmentParticipation(waveId) {
      const admin = await adminClient();
      const { data, error } = await admin
        .from("wave_responses")
        .select("cohort_id,instrument_version")
        .eq("wave_id", waveId);
      if (error) throw new Error("FIBT_MANAGER_AGGREGATE_READ_FAILED");

      const buckets = new Map<string, { cohortId: string | null; count: number; versions: Set<string | null> }>();
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const cohortId = (row.cohort_id as string | null) ?? null;
        const key = cohortId ?? "\u0000sem-coorte";
        const bucket = buckets.get(key) ?? { cohortId, count: 0, versions: new Set() };
        bucket.count += 1;
        bucket.versions.add((row.instrument_version as string | null) ?? null);
        buckets.set(key, bucket);
      }

      return [...buckets.values()].map((bucket) => ({
        cohortId: bucket.cohortId,
        count: bucket.count,
        instrumentVersions: [...bucket.versions],
      }));
    },

    async listPublishedSnapshots(waveId) {
      const admin = await adminClient();
      const { data, error } = await admin
        .from("cohort_capsules")
        .select("cohort_id,published_response_count,item_means,published_at")
        .eq("wave_id", waveId);
      // Tabela ausente = migrations da Task 10.1 não aplicadas neste ambiente.
      // Fail-closed: nenhuma leitura publicada, nunca cálculo ao vivo.
      if (error) return [];
      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        cohortId: (row.cohort_id as string | null) ?? null,
        publishedResponseCount: (row.published_response_count as number | null) ?? null,
        itemMeans: (row.item_means as Record<string, number> | null) ?? null,
        publishedAt: (row.published_at as string | null) ?? null,
      }));
    },

    listEvents: (orgId) => listOpsEventsForOrg(orgId, 30),
  };
}

function managerStore(deps: FibtManagerServiceDeps): FibtManagerStore {
  return deps.store ?? createSupabaseStore();
}

export async function resolveCanonicalHmlManagerWave(
  identity: FibtCampaignIdentity,
  deps: FibtManagerServiceDeps = {},
): Promise<FibtManagerWaveRow | null> {
  return managerStore(deps).findCanonicalHmlWave(identity);
}

export async function managerLinkBelongsToExpectedCohort(
  orgId: string,
  waveId: string,
  linkId: string,
  expectedCohortKeys: readonly string[],
  deps: FibtManagerServiceDeps = {},
): Promise<boolean> {
  try {
    const links = await managerStore(deps).listLinks(orgId, waveId);
    const matches = links.filter(
      (link) =>
        link.id === linkId &&
        link.orgId === orgId &&
        link.waveId === waveId &&
        expectedCohortKeys.includes(link.sectorKey),
    );
    return matches.length === 1;
  } catch {
    return false;
  }
}

function exactKeySet(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && expected.every((key) => actual.includes(key));
}

export async function loadFibtManagerControlCenterAsAdmin(
  orgId: string,
  waveId: string,
  options: {
    environment?: "hml_staging" | "application";
    hmlAttested?: boolean;
    expectedCohortKeys?: readonly string[];
    /**
     * Access token de uma sessão administrativa JÁ validada pelo chamador, cuja
     * organização é a mesma da onda: é a identidade organizacional que a RPC
     * canônica exige para AVANÇAR a publicação. Ausente quando não há sessão
     * Supabase (ou quando a que existe não pertence à organização da onda),
     * caso em que o painel fica somente-leitura sobre o já publicado.
     */
    publisherAccessToken?: string;
  } = {},
  deps: FibtManagerServiceDeps = {},
): Promise<FibtManagerLoadOutcome> {
  if (!(deps.pilotEnabled ?? isFibtPilotEnabled)()) {
    return { ok: false, category: "feature_gate", error: FIBT_PILOT_DISABLED_REASON };
  }

  const store = managerStore(deps);
  const wave = await store.findWave(orgId, waveId);
  if (!wave || wave.instrument !== "FIB_T") {
    return {
      ok: false,
      category: "validation",
      error: "Onda FIB-T não encontrada nesta organização.",
    };
  }

  try {
    const [cohorts, links, events] = await Promise.all([
      store.listCohorts(orgId, waveId),
      store.listLinks(orgId, waveId),
      store.listEvents(orgId),
    ]);

    if (
      cohorts.some((cohort) => cohort.orgId !== orgId || cohort.waveId !== waveId) ||
      links.some((link) => link.orgId !== orgId || link.waveId !== waveId)
    ) {
      return {
        ok: false,
        category: "validation",
        error: "A fronteira de organização ou onda divergiu. A leitura foi bloqueada.",
      };
    }

    if (
      options.expectedCohortKeys &&
      !exactKeySet(
        cohorts.map((cohort) => cohort.key),
        options.expectedCohortKeys,
      )
    ) {
      return {
        ok: false,
        category: "validation",
        error: "As coortes da campanha sintética não correspondem ao contrato HML.",
      };
    }

    // ── Avanço da publicação, pelo mecanismo canônico ──────────────────────
    // Só acontece quando existe identidade organizacional real da própria
    // organização da onda. O retorno é descartado: quem interpreta o estado é o
    // leitor do snapshot publicado, num único lugar. Falha aqui nunca derruba a
    // leitura — o painel apenas mostra o estado protegido.
    if (options.publisherAccessToken && deps.advancePublication && cohorts.length > 0) {
      try {
        await deps.advancePublication(
          waveId,
          cohorts.map((cohort) => cohort.id),
          options.publisherAccessToken,
        );
      } catch {
        // Intencionalmente silencioso: fail-closed já é o comportamento do leitor.
      }
    }

    // Nenhuma resposta individual é lida daqui para frente: só contagens por
    // segmento e o snapshot já publicado.
    const [participation, publishedRows] = await Promise.all([
      store.listSegmentParticipation(waveId),
      store.listPublishedSnapshots(waveId),
    ]);

    const cohortIds = new Set(cohorts.map((cohort) => cohort.id));
    const scopeDrift = participation.some(
      (segment) => !segment.cohortId || !cohortIds.has(segment.cohortId),
    );

    // Partição COMPLETA da onda, do jeito que o SQL a enumera: um segmento por
    // `cohort_id` distinto COM ao menos uma resposta (inclui o bucket sem
    // coorte). Segmento vazio não existe para a regra diferencial.
    const partitionCounts = participation
      .filter((segment) => segment.count > 0)
      .map((segment) => segment.count);
    const liveTotal = partitionCounts.reduce((sum, count) => sum + count, 0);

    const bySegment = new Map(participation.map((segment) => [segment.cohortId ?? "", segment]));
    const publishedBySegment = new Map(
      publishedRows.map((row) => [row.cohortId ?? "", row as PublishedCohortSnapshot]),
    );
    const waveSealed = wave.status !== "collecting";
    const now = (deps.now ?? (() => new Date()))();

    const sectors = cohorts.map((cohort): FibtManagerSectorSummary => {
      const segment = bySegment.get(cohort.id);
      const analytics = buildProtectedCohortReading({
        liveCount: segment?.count ?? 0,
        partitionCounts,
        published: publishedBySegment.get(cohort.id) ?? null,
        waveInstrumentVersion: wave.instrumentVersion,
        segmentInstrumentVersions: segment?.instrumentVersions ?? [],
        waveSealed,
      });
      const cohortLinks = links
        .filter((link) => link.sectorKey === cohort.key)
        .map((link) => ({
          id: link.id,
          state: classifySectorLink(link, now),
          expiresAt: link.expiresAt,
          createdAt: link.createdAt,
        }));
      const activeLinks = cohortLinks.filter((link) => link.state === "active").length;

      return {
        id: cohort.id,
        key: cohort.key,
        label: cohort.label,
        operationalState:
          activeLinks > 1
            ? "error"
            : wave.status !== "collecting"
              ? "closed"
              : activeLinks === 1
                ? "collecting"
                : "no_active_link",
        participationState: analytics.state,
        participationLabel: analytics.countLabel,
        readingPublished: analytics.state === "available",
        analytics,
        links: cohortLinks,
      };
    });

    const unboundLinks = links.filter(
      (link) => !cohorts.some((cohort) => cohort.key === link.sectorKey),
    );
    const blockers: string[] = [];
    if (cohorts.length === 0) blockers.push("Nenhum setor foi cadastrado para esta onda.");
    if (scopeDrift) blockers.push("Há respostas sem vínculo a uma coorte autorizada.");
    if (unboundLinks.length > 0) blockers.push("Ha link sem setor correspondente.");
    if (sectors.some((sector) => sector.operationalState === "error")) {
      blockers.push("Foi detectado mais de um link ativo para o mesmo setor.");
    }
    if (
      sectors.some(
        (sector) =>
          sector.analytics.state === "methodology_error" ||
          sector.analytics.state === "technical_error",
      )
    ) {
      blockers.push("Um ou mais agregados falharam na validação metodológica.");
    }

    const waveAnalytics = scopeDrift
      ? buildTechnicalUnavailable("A leitura agregada foi bloqueada por divergência de coorte.")
      : buildWaveReadingUnavailable();
    const publishedCohorts = sectors.filter((sector) => sector.readingPublished).length;
    const missingLinks = sectors.filter((sector) => sector.operationalState === "no_active_link");
    const operational =
      wave.status === "collecting" &&
      cohorts.length > 0 &&
      blockers.length === 0 &&
      missingLinks.length === 0;
    const readinessState = blockers.length > 0 ? "blocked" : operational ? "ready" : "attention";

    const anyAwaitingBatch = sectors.some(
      (sector) => sector.analytics.state === "awaiting_batched_release",
    );

    let nextAction = "Revisar as leituras já publicadas por setor.";
    if (blockers.length > 0)
      nextAction = "Resolver o primeiro bloqueio operacional antes de prosseguir.";
    else if (wave.status !== "collecting")
      nextAction = "A onda está fechada; revisar as leituras publicadas até o fechamento.";
    else if (missingLinks.length > 0) nextAction = `Emitir um link para ${missingLinks[0]!.label}.`;
    else if (anyAwaitingBatch)
      nextAction =
        "Seguir com a coleta: a leitura é liberada em lote protegido, não a cada resposta.";
    else if (publishedCohorts === 0) {
      nextAction = "Manter a coleta controlada e acompanhar o limiar de privacidade.";
    }

    // Participação total da onda: metadado operacional, protegido por faixa
    // abaixo do limiar. Não permite derivar segmento porque as contagens dos
    // segmentos protegidos não saem (ver `participationLabel`).
    const totalParticipationLabel =
      liveTotal === 0 ? "0" : protectSectorParticipation(liveTotal).countLabel;

    return {
      ok: true,
      snapshot: {
        campaign: {
          waveId: wave.id,
          organizationName: wave.organizationName,
          label: wave.label,
          instrument: "FIB_T",
          instrumentVersion: wave.instrumentVersion ?? "não confirmada",
          status: wave.status,
          sealOutcome: wave.sealOutcome,
          createdAt: wave.createdAt,
          closesAt: wave.closesAt,
          environment: options.environment ?? "application",
          hmlAttested: options.hmlAttested ?? false,
        },
        participation: {
          countLabel: totalParticipationLabel,
          publishedCohorts,
          totalCohorts: sectors.length,
        },
        waveAnalytics,
        sectors,
        factorComparison: buildFactorComparison(sectors),
        readiness: {
          state: readinessState,
          operational,
          blockers,
          nextAction,
        },
        telemetry: events
          .filter((event) => event.waveId === waveId && MANAGER_TELEMETRY_EVENTS.has(event.event))
          .slice(0, 12)
          .map((event) => ({ ...event, reason: null })),
        privacy: {
          kMin: FIBT_K_MIN,
          individualResponsesExposed: false,
          rawTokensExposed: false,
        },
      },
    };
  } catch {
    return {
      ok: false,
      category: "backend",
      error: "Não foi possível carregar o centro de controle. Tente novamente.",
    };
  }
}
